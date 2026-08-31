import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { promises as fs } from "node:fs"
import { createServer } from "node:net"
import os from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, "..")
const packageDirectory = path.join(projectDirectory, "generated", "drawio-expert")
const generatedToolsDirectory = path.join(packageDirectory, ".opencode", "tools")
const generatedSkillsDirectory = path.join(packageDirectory, ".opencode", "skills")
const corePath = path.join(
  generatedSkillsDirectory,
  "drawio-expert-common",
  "scripts",
  "drawio-runtime-core.mjs",
)

function sha256(content) {
  return createHash("sha256").update(content).digest("hex")
}

async function reservePort() {
  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  assert(address && typeof address === "object")
  await new Promise((resolve) => server.close(resolve))
  return address.port
}

function resolveOpenCodeBinary() {
  if (process.env.OPENCODE_BIN?.trim()) {
    return process.env.OPENCODE_BIN.trim()
  }
  if (process.platform !== "win32") return "opencode"

  const located = spawnSync("where.exe", ["opencode.cmd"], { encoding: "utf8" })
  const commandPath = located.stdout
    ?.split(/\r?\n/u)
    .map((item) => item.trim())
    .find(Boolean)
  if (commandPath) {
    const executable = path.join(
      path.dirname(commandPath),
      "node_modules",
      "opencode-ai",
      "bin",
      "opencode.exe",
    )
    if (existsSync(executable)) return executable
  }
  throw new Error("OpenCode executable not found; set OPENCODE_BIN to run the discovery probe")
}

async function waitForToolIds(child, port, logs) {
  const url = `http://127.0.0.1:${port}/experimental/tool/ids`
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`OpenCode exited before tool discovery completed:\n${logs.join("")}`)
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) })
      if (response.ok) return await response.json()
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`timed out waiting for OpenCode tool discovery:\n${logs.join("")}`)
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return
  child.kill()
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ])
  if (child.exitCode === null) child.kill("SIGKILL")
}

const toolManifest = JSON.parse(
  await fs.readFile(path.join(projectDirectory, "runtime", "drawio-tools.json"), "utf8"),
)
const sourceManifest = JSON.parse(
  await fs.readFile(path.join(projectDirectory, "expert.json"), "utf8"),
)
const generatedManifest = JSON.parse(
  await fs.readFile(path.join(packageDirectory, "expert.json"), "utf8"),
)
const expectedNames = toolManifest.tools.map((item) => item.name)
const expectedPaths = toolManifest.tools.map((item) => item.path)
const adapterFiles = (await fs.readdir(generatedToolsDirectory))
  .filter((name) => name.endsWith(".js"))
  .sort()

assert.equal(expectedNames.length, 19)
assert.equal(new Set(expectedNames).size, expectedNames.length)
assert.equal(new Set(expectedPaths).size, expectedPaths.length)
assert.deepEqual(
  sourceManifest.runtime_extensions.custom_tools.map((item) => item.path),
  expectedPaths,
)
assert.deepEqual(sourceManifest.agent.custom_tools, expectedPaths)
assert.deepEqual(
  generatedManifest.runtime_extensions.custom_tools.map((item) => item.path),
  expectedPaths,
)
assert.deepEqual(adapterFiles, [...expectedPaths].sort())

const coreResources = sourceManifest.package_resources.filter(
  (item) => item.path.endsWith("/drawio-runtime-core.mjs"),
)
assert.equal(coreResources.length, 1)
assert.equal(coreResources[0].sha256, sha256(await fs.readFile(corePath)))
assert.doesNotMatch(await fs.readFile(corePath, "utf8"), /from\s*["']@opencode-ai/u)
assert.doesNotMatch(
  sourceManifest.runtime_extensions.plugins.local[0].content,
  /createDrawioToolset|drawio_validate/u,
)

const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "drawio-custom-tools-"))
const workspace = path.join(temporaryRoot, "workspace")
const globalConfig = path.join(temporaryRoot, "opencode-config")
await fs.mkdir(workspace, { recursive: true })
await fs.mkdir(globalConfig, { recursive: true })

let bridgeServer
let openCodeProcess
const logs = []
const originalSkillsDirectory = process.env.MOBILEWORK_SKILLS_DIR
const originalBridgeHost = process.env.DRAWIO_BRIDGE_HOST
const originalBridgePort = process.env.DRAWIO_BRIDGE_PORT

try {
  process.env.MOBILEWORK_SKILLS_DIR = generatedSkillsDirectory
  process.env.DRAWIO_BRIDGE_HOST = "127.0.0.1"
  process.env.DRAWIO_BRIDGE_PORT = "0"

  const hooksUrl = pathToFileURL(path.join(
    packageDirectory,
    ".opencode",
    "plugins",
    "drawio-hooks.js",
  )).href
  const { DrawioHooksPlugin } = await import(hooksUrl)
  const hooks = await DrawioHooksPlugin({ directory: workspace })
  assert.equal(typeof hooks.event, "function")
  await hooks.event({ event: { type: "unrelated.event", properties: {} } })
  const generatedAgentPrompt = await fs.readFile(
    path.join(packageDirectory, ".opencode", "agents", "drawio-expert.md"),
    "utf8",
  )
  const drawioSystem = { system: [generatedAgentPrompt] }
  await hooks["experimental.chat.system.transform"]({}, drawioSystem)
  assert.match(drawioSystem.system.join("\n"), /人工编辑不是只读内容/u)
  const generalSystem = { system: ["You are a general coding agent."] }
  await hooks["experimental.chat.system.transform"]({}, generalSystem)
  assert.deepEqual(generalSystem.system, ["You are a general coding agent."])
  const auxiliarySystem = { system: ["Generate a short title for this session."] }
  await hooks["experimental.chat.system.transform"]({}, auxiliarySystem)
  assert.deepEqual(auxiliarySystem.system, ["Generate a short title for this session."])

  const loadAdapter = async (name) => {
    const url = pathToFileURL(path.join(generatedToolsDirectory, `${name}.js`)).href
    return (await import(url)).default
  }
  const [createTool, openTool, getStateTool] = await Promise.all([
    loadAdapter("drawio_create"),
    loadAdapter("drawio_open"),
    loadAdapter("drawio_get_state"),
  ])
  const context = {
    sessionID: "custom-tools-shared-state",
    messageID: "custom-tools-message",
    agent: "drawio-expert",
    directory: workspace,
    worktree: workspace,
    abort: new AbortController().signal,
    metadata() {},
    async ask() {},
  }
  const created = JSON.parse(await createTool.execute({
    file: "adapter-probe.drawio",
    title: "Custom tool adapter probe",
    nodes: [
      { id: "source", label: "Source" },
      { id: "target", label: "Target" },
    ],
    edges: [{ id: "source-target", source: "source", target: "target", label: "calls" }],
  }, context))
  const opened = JSON.parse(await openTool.execute({ file: "adapter-probe.drawio" }, context))
  const state = JSON.parse(await getStateTool.execute({}, context))

  assert.equal(created.valid, true)
  assert.equal(opened.ok, true)
  assert.equal(state.file, opened.file)
  assert.equal(state.revision, opened.revision)
  assert.equal(
    globalThis.__drawioIntegratedBridge.sessions.get(context.sessionID).revision,
    opened.revision,
  )
  bridgeServer = globalThis.__drawioIntegratedBridge.server
  await new Promise((resolve) => bridgeServer.close(resolve))
  bridgeServer = null

  // Match MobileWork's personal-expert publication model: adapters are copied
  // into OPENCODE_CONFIG_DIR/tools while the shared core stays in the managed
  // Skill pool named by MOBILEWORK_SKILLS_DIR.
  await fs.cp(generatedToolsDirectory, path.join(globalConfig, "tools"), { recursive: true })
  const port = await reservePort()
  openCodeProcess = spawn(resolveOpenCodeBinary(), [
    "serve",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ], {
    cwd: workspace,
    env: {
      ...process.env,
      OPENCODE_CONFIG_DIR: globalConfig,
      MOBILEWORK_SKILLS_DIR: generatedSkillsDirectory,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  })
  openCodeProcess.stdout.on("data", (chunk) => logs.push(chunk.toString()))
  openCodeProcess.stderr.on("data", (chunk) => logs.push(chunk.toString()))

  const discovered = await waitForToolIds(openCodeProcess, port, logs)
  const discoveredDrawioTools = discovered.filter((name) => name.startsWith("drawio_")).sort()
  assert.deepEqual(discoveredDrawioTools, [...expectedNames].sort())

  console.log(JSON.stringify({
    ok: true,
    customToolCount: expectedNames.length,
    adapterSharedState: true,
    revision: state.revision,
    mobileworkGlobalDiscovery: true,
  }, null, 2))
} finally {
  if (bridgeServer) await new Promise((resolve) => bridgeServer.close(resolve))
  await stopProcess(openCodeProcess)
  if (originalSkillsDirectory === undefined) delete process.env.MOBILEWORK_SKILLS_DIR
  else process.env.MOBILEWORK_SKILLS_DIR = originalSkillsDirectory
  if (originalBridgeHost === undefined) delete process.env.DRAWIO_BRIDGE_HOST
  else process.env.DRAWIO_BRIDGE_HOST = originalBridgeHost
  if (originalBridgePort === undefined) delete process.env.DRAWIO_BRIDGE_PORT
  else process.env.DRAWIO_BRIDGE_PORT = originalBridgePort
  await fs.rm(temporaryRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
}
