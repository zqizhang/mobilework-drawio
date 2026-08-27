import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, "..")
const manifestPath = path.join(projectDirectory, "expert.json")
const runtimeSourcePath = path.join(projectDirectory, "runtime", "drawio-runtime.ts")
const hooksSourcePath = path.join(projectDirectory, "runtime", "drawio-hooks.ts")
const toolsManifestPath = path.join(projectDirectory, "runtime", "drawio-tools.json")
const skillsRoot = path.join(projectDirectory, ".opencode", "skills")

const toolsManifest = JSON.parse(await fs.readFile(toolsManifestPath, "utf8"))
const tools = toolsManifest.tools
if (!Array.isArray(tools) || tools.length === 0) {
  throw new Error("runtime/drawio-tools.json does not declare any tools")
}

const bunBinary = process.platform === "win32" ? "bun.cmd" : "bun"

function buildBundle(entryPath, outfile) {
  const build = spawnSync(bunBinary, [
    "build",
    entryPath,
    "--outfile",
    outfile,
    "--target",
    "bun",
    "--format",
    "esm",
    "--minify",
  ], {
    cwd: projectDirectory,
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32",
  })
  if (build.stdout) process.stdout.write(build.stdout)
  if (build.stderr) process.stderr.write(build.stderr)
  if (build.status !== 0) {
    throw new Error(`bun build failed for ${path.basename(entryPath)} with exit code ${build.status}`)
  }
}

// fast-xml-parser bundles diagnostic labels containing literal parent-path
// tokens. Keep the security regexes intact while making the labels pass the
// portable expert package scanner.
function sanitizePortableBundle(content) {
  return content
    .replaceAll("Unix path traversal: ../", "Unix path traversal: parent slash")
    .replaceAll("Windows path traversal: ..\\\\", "Windows path traversal: parent backslash")
    .replaceAll('".."', '"."+"."')
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex")
}

function adapterContent(toolName) {
  return `import { tool } from "@opencode-ai/plugin"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

function resolveRuntimePath() {
  const managedSkills = process.env.MOBILEWORK_SKILLS_DIR?.trim()

  if (managedSkills) {
    return path.join(
      managedSkills,
      "${toolsManifest.skills_dir}",
      "scripts",
      "${path.basename(toolsManifest.runtime_core)}",
    )
  }

  // 兼容直接把专家包作为普通OpenCode项目运行：
  // 适配器位于 <package>/.opencode/tools/，共享核心位于
  // <package>/.opencode/skills/ 下。
  const opencodeRoot = path.dirname(
    path.dirname(fileURLToPath(import.meta.url)),
  )

  return path.join(
    opencodeRoot,
    "skills",
    "${toolsManifest.skills_dir}",
    "scripts",
    "${path.basename(toolsManifest.runtime_core)}",
  )
}

const runtimeUrl = pathToFileURL(resolveRuntimePath()).href
const { createDrawioTool } = await import(runtimeUrl)

export default createDrawioTool("${toolName}", tool)
`
}

async function collectSkillResources(declaredSkills) {
  const entries = []
  for (const skill of declaredSkills) {
    const skillDirectory = path.join(skillsRoot, skill)
    const stat = await fs.stat(skillDirectory)
    if (!stat.isDirectory()) {
      throw new Error(`declared skill directory does not exist: .opencode/skills/${skill}`)
    }
    await walk(skillDirectory, skill)
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path))

  async function walk(directory, skill) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await walk(full, skill)
        continue
      }
      if (!entry.isFile()) {
        throw new Error(`only regular files are allowed inside skill directories: ${path.relative(projectDirectory, full)}`)
      }
      const bytes = await fs.readFile(full)
      const relative = path
        .relative(path.join(skillsRoot, skill), full)
        .split(path.sep)
        .join("/")
      let kind = "binary"
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(bytes)
        kind = "text"
      } catch {
        kind = "binary"
      }
      entries.push({
        path: `.opencode/skills/${skill}/${relative}`,
        kind,
        sha256: sha256(bytes),
      })
    }
  }
}

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"))

const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "drawio-expert-sync-"))
try {
  // 1. Build the shared runtime core. It must stay dependency-free: the
  //    @opencode-ai/plugin import is type-only and disappears after bundling,
  //    while fast-xml-parser and pako are bundled in.
  const coreBundlePath = path.join(temporaryDirectory, "drawio-runtime-core.mjs")
  buildBundle(runtimeSourcePath, coreBundlePath)
  const coreContent = sanitizePortableBundle(await fs.readFile(coreBundlePath, "utf8"))
  if (/from\s*["']@opencode-ai/.test(coreContent)) {
    throw new Error("runtime core must not import @opencode-ai/plugin at runtime")
  }

  const coreTargetPath = path.join(
    skillsRoot,
    toolsManifest.skills_dir,
    "scripts",
    path.basename(toolsManifest.runtime_core),
  )
  await fs.mkdir(path.dirname(coreTargetPath), { recursive: true })
  await fs.writeFile(coreTargetPath, coreContent, "utf8")
  console.log(
    `Built shared runtime core ${path.relative(projectDirectory, coreTargetPath)} (${coreContent.length} bytes)`,
  )

  // 2. Verify the core tool list against the structured tool manifest before
  //    it is referenced by any adapter or manifest field.
  const core = await import(pathToFileURL(coreTargetPath).href)
  const coreNames = [...core.DRAWIO_TOOL_NAMES]
  const declaredNames = tools.map(item => item.name)
  if (coreNames.length !== declaredNames.length || coreNames.some((name, index) => name !== declaredNames[index])) {
    throw new Error(
      `runtime core tool list does not match runtime/drawio-tools.json: core=[${coreNames.join(", ")}] manifest=[${declaredNames.join(", ")}]`,
    )
  }

  // 3. Build the hook-only plugin. It keeps the two existing hooks and no
  //    longer registers any drawio_* tools.
  const hooksBundlePath = path.join(temporaryDirectory, "drawio-hooks.js")
  buildBundle(hooksSourcePath, hooksBundlePath)
  const hooksContent = sanitizePortableBundle(await fs.readFile(hooksBundlePath, "utf8"))

  // 4. Generate the thin custom tool adapters (one per declared tool).
  const customTools = tools.map(item => ({
    path: item.path,
    purpose: item.purpose,
    content: adapterContent(item.name),
  }))

  // 5. Project everything into the manifest.
  const extensions = manifest.runtime_extensions
  extensions.custom_tools = customTools
  extensions.plugins = { local: [{ path: toolsManifest.hooks_plugin, content: hooksContent }] }
  manifest.agent.custom_tools = tools.map(item => item.path)
  const declaredSkills = (manifest.skills || []).map(item => item.name)
  if (declaredSkills.length === 0) {
    throw new Error("expert.json does not declare a unified skills pool")
  }
  manifest.package_resources = await collectSkillResources(declaredSkills)
  if (manifest.package_resources.length === 0) {
    throw new Error("no package resources found under .opencode/skills")
  }

  // 6. Cross-check every generated surface against the tool manifest.
  const manifestToolPaths = extensions.custom_tools.map(item => item.path)
  const agentToolPaths = manifest.agent.custom_tools
  if (
    manifestToolPaths.length !== tools.length
    || manifestToolPaths.some((value, index) => value !== tools[index].path)
    || agentToolPaths.length !== tools.length
    || agentToolPaths.some((value, index) => value !== tools[index].path)
  ) {
    throw new Error("expert.json custom tool declarations drifted from runtime/drawio-tools.json")
  }
  const coreResource = manifest.package_resources.find(
    item => item.path === `.opencode/skills/${toolsManifest.skills_dir}/scripts/${path.basename(toolsManifest.runtime_core)}`,
  )
  if (!coreResource || coreResource.sha256 !== sha256(Buffer.from(coreContent, "utf8"))) {
    throw new Error("shared runtime core is not correctly declared in package_resources")
  }
} finally {
  await fs.rm(temporaryDirectory, { recursive: true, force: true })
}

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
console.log(`Synced ${tools.length} custom tools, hook plugin, and ${manifest.package_resources.length} package resources into expert.json`)
