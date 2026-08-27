import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

const projectDirectory = path.resolve(import.meta.dirname, "..")
const packageDirectory = path.join(projectDirectory, "generated", "drawio-expert")
const opencodeDirectory = path.join(packageDirectory, ".opencode")
const managerRoot = process.env.MOBILEWORK_EXPERT_MANAGER_ROOT
  ? path.resolve(process.env.MOBILEWORK_EXPERT_MANAGER_ROOT)
  : path.join(os.homedir(), ".mobilework", "skills", "mobilework-expert-manager")
const manifest = JSON.parse(await fs.readFile(path.join(packageDirectory, "expert.json"), "utf8"))
const opencode = JSON.parse(await fs.readFile(path.join(packageDirectory, "opencode.json"), "utf8"))
const toolsDescriptor = JSON.parse(await fs.readFile(
  path.join(projectDirectory, "runtime", "drawio-tools.json"),
  "utf8",
))

assert.equal(manifest.agent.mode, "all")
assert.equal(manifest.agent.autonomy, "guided")
assert.equal(manifest.agent.steps, 80)
assert.equal(manifest.agent.max_turns, undefined)
assert.deepEqual(manifest.agent.skills, ["drawio-skill", "drawio-session-editing"])
assert.deepEqual(manifest.agent.references, [])
assert.equal(manifest.skills.length, 2)
assert.ok(manifest.package_resources.length > 2)
assert.equal(manifest.runtime_extensions.custom_tools.length, 19)
assert.equal(manifest.agent.custom_tools.length, 19)
assert.equal(manifest.runtime_extensions.plugins.local.length, 1)
assert.equal(manifest.agent.permission.drawio_authorize_preview, "ask")
assert.equal(manifest.agent.permission.drawio_authorize_annotation_change, "ask")
assert.equal(Object.hasOwn(opencode, "tools"), false)
assert.equal(Object.hasOwn(opencode, "command"), false)
assert.equal(Object.hasOwn(opencode, "references"), false)
assert.equal((opencode.plugin ?? []).some((entry) => String(entry).includes("drawio")), false)

const turnPreflightWorkflow = manifest.agent.workflow.find((step) =>
  step.includes("每一轮对话开始") && step.includes("不依赖本轮是否重新加载Skill")
)
assert.match(turnPreflightWorkflow ?? "", /drawio_list_annotations/)
assert.match(turnPreflightWorkflow ?? "", /drawio_get_state/)

const agentSource = await fs.readFile(
  path.join(opencodeDirectory, "agents", "drawio-expert.md"),
  "utf8",
)
assert.match(agentSource, /每一轮对话开始/)
assert.match(agentSource, /不依赖本轮是否重新加载Skill/)
assert.match(agentSource, /最终回复前再次列出pending注释/)

const commandDirectory = path.join(opencodeDirectory, "commands")
for (const commandName of [
  "drawio-create.md",
  "drawio-inspect.md",
  "drawio-patch.md",
  "drawio-polish.md",
  "drawio-export.md",
  "drawio-open.md",
]) {
  const commandSource = await fs.readFile(path.join(commandDirectory, commandName), "utf8")
  assert.match(commandSource, /drawio_list_annotations/, commandName)
  assert.match(commandSource, /drawio_get_state/, commandName)
}

for (const forbidden of [
  "AGENTS.md",
  "references",
  ".opencode/lib",
  ".opencode/opencode.jsonc",
  "mobilework-drawio.package.json",
  "install.ps1",
  "uninstall.ps1",
  "verify.ps1",
  ".opencode/node_modules",
]) {
  await assert.rejects(fs.stat(path.join(packageDirectory, forbidden)), undefined, forbidden)
}

const pluginPath = path.join(
  opencodeDirectory,
  "plugins",
  "drawio-runtime-hooks.js",
)
const pluginSource = await fs.readFile(pluginPath, "utf8")
assert.doesNotMatch(pluginSource, /\btool\s*:/)
assert.doesNotMatch(pluginSource, /createDrawioTool/)
assert.match(pluginSource, /drawio-session-editing\/scripts\/drawio-runtime-core\.mjs/)
const pluginModule = await import(pathToFileURL(pluginPath).href)
const hooks = await pluginModule.DrawioRuntimeHooks({ directory: projectDirectory })
assert.equal(typeof hooks["experimental.chat.system.transform"], "function")
assert.equal(typeof hooks["tool.execute.before"], "function")
assert.equal(hooks.tool, undefined)

const expectedToolNames = toolsDescriptor.tools.map(({ name }) => name).sort()
const toolDirectory = path.join(opencodeDirectory, "tools")
const generatedToolNames = (await fs.readdir(toolDirectory))
  .filter((name) => name.endsWith(".js"))
  .map((name) => name.slice(0, -3))
  .sort()
assert.deepEqual(generatedToolNames, expectedToolNames)
for (const name of expectedToolNames) {
  const adapterPath = path.join(toolDirectory, `${name}.js`)
  const adapterSource = await fs.readFile(adapterPath, "utf8")
  assert.match(adapterSource, /@opencode-ai\/plugin/)
  assert.match(adapterSource, /drawio-session-editing\/scripts\/drawio-runtime-core\.mjs/)
  const adapter = await import(pathToFileURL(adapterPath).href)
  assert.equal(typeof adapter.default.execute, "function")
}

const packageFiles = []
async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) await walk(full)
    else packageFiles.push(full)
  }
}
await walk(packageDirectory)
assert.equal(packageFiles.some((file) => file.includes(`${path.sep}node_modules${path.sep}`)), false)
assert.equal(packageFiles.some((file) => file.endsWith(".pyc")), false)
for (const file of packageFiles.filter((entry) => /\.(?:md|js|mjs|json)$/i.test(entry))) {
  const content = await fs.readFile(file, "utf8")
  assert.doesNotMatch(content, /\bbrowser\.open_url\b/, path.relative(packageDirectory, file))
}

const temporaryWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), "drawio-manager-install-"))
try {
  const installScript = path.join(managerRoot, "scripts", "install_expert.py")
  const install = spawnSync("python", [
    installScript,
    "--package-dir",
    packageDirectory,
    "--workspace-dir",
    temporaryWorkspace,
    "--format",
    "json",
  ], { encoding: "utf8" })
  assert.equal(install.status, 0, install.stderr || install.stdout)
  const installedTool = path.join(
    temporaryWorkspace,
    ".opencode",
    "tools",
    "drawio_open.js",
  )
  assert.equal((await fs.stat(installedTool)).isFile(), true)
  assert.equal((await fs.stat(path.join(
    temporaryWorkspace,
    ".opencode",
    "plugins",
    "drawio-runtime-hooks.js",
  ))).isFile(), true)

  const uninstall = spawnSync("python", [
    installScript,
    "--uninstall",
    "drawio-expert",
    "--workspace-dir",
    temporaryWorkspace,
    "--format",
    "json",
  ], { encoding: "utf8" })
  assert.equal(uninstall.status, 0, uninstall.stderr || uninstall.stdout)
  await assert.rejects(fs.stat(installedTool))
} finally {
  await fs.rm(temporaryWorkspace, { recursive: true, force: true })
}

console.log(JSON.stringify({
  ok: true,
  tools: expectedToolNames.length,
  hookOnlyPlugin: true,
  turnPreflightContract: true,
  managerInstallRoundTrip: true,
}, null, 2))
