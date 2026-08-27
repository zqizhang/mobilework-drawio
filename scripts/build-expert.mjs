import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, "..")
const manifestPath = path.join(projectDirectory, "expert.json")
const outputRoot = path.join(projectDirectory, "generated")
const packageDirectory = path.join(outputRoot, "drawio-expert")

function run(command, args, cwd = projectDirectory) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    shell: command.toLowerCase().endsWith(".cmd"),
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`)
  }
}

// The manager must come from the current MobileWork source tree. The legacy
// ~/.agents installation is intentionally not used.
function resolveManagerScripts() {
  const candidates = []
  const fromEnv = process.env.MOBILEWORK_SOURCE_DIR?.trim()
  if (fromEnv) candidates.push(path.resolve(fromEnv))
  const sibling = path.resolve(projectDirectory, "..", "mobilework-project")
  candidates.push(sibling)

  for (const sourceDir of candidates) {
    const managerScripts = path.join(
      sourceDir,
      "apps",
      "desktop",
      "resources",
      "presets",
      "skills",
      "mobilework-expert-manager",
      "scripts",
    )
    if (existsSync(path.join(managerScripts, "create_expert.py"))) {
      return managerScripts
    }
  }
  throw new Error(
    "mobilework-expert-manager scripts not found; set MOBILEWORK_SOURCE_DIR or place "
    + "mobilework-project next to this repository",
  )
}

async function readFiles(root, predicate) {
  const result = []
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (predicate(full)) result.push(full)
    }
  }
  await walk(root)
  return result
}

async function verifySkill(skillDirectory) {
  const skillFile = path.join(skillDirectory, "SKILL.md")
  const content = await fs.readFile(skillFile, "utf8")
  const name = content.match(/^---\s*\r?\n[\s\S]*?^name:\s*([^\r\n]+)$/m)?.[1]?.trim()
  if (name !== path.basename(skillDirectory)) {
    throw new Error(`${skillFile}: frontmatter name ${JSON.stringify(name)} does not match directory`)
  }
  if (!/[\u3400-\u9fff]/u.test(content)) {
    throw new Error(`${skillFile}: integrated SKILL.md must be written in Chinese`)
  }
}

async function verifyMarkdownLinks(root) {
  const markdownFiles = await readFiles(root, file => file.endsWith(".md"))
  const missing = []
  for (const file of markdownFiles) {
    const content = await fs.readFile(file, "utf8")
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const raw = match[1].trim().replace(/^<|>$/g, "")
      if (!raw || raw.startsWith("#") || /^[a-z]+:/i.test(raw) || raw.includes("<")) continue
      const relative = decodeURIComponent(raw.split("#", 1)[0])
      if (!relative) continue
      try {
        await fs.access(path.resolve(path.dirname(file), relative))
      } catch {
        missing.push(`${path.relative(root, file)} -> ${raw}`)
      }
    }
  }
  if (missing.length) throw new Error(`Missing Markdown links:\n${missing.join("\n")}`)
}

async function verifyNoDesktopFallback(root) {
  const files = await readFiles(root, file => /\.(md|py)$/i.test(file))
  const forbidden = [
    [/drawio(?:\.exe)?\s+-x/i, "Draw.io Desktop export command"],
    [/repair_png\.py/i, "obsolete Desktop PNG repair helper"],
    [/encode_drawio_url\.py/i, "obsolete browser URL helper"],
  ]
  const failures = []
  for (const file of files) {
    const content = await fs.readFile(file, "utf8")
    for (const [pattern, label] of forbidden) {
      if (pattern.test(content)) failures.push(`${path.relative(root, file)}: ${label}`)
    }
  }
  if (failures.length) throw new Error(`Unsupported fallback remains:\n${failures.join("\n")}`)
}

async function verifyNoCaches(root) {
  const forbidden = new Set(["node_modules", "__pycache__", ".pytest_cache", ".venv", ".git"])
  const failures = []
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (forbidden.has(entry.name) || entry.name.endsWith(".pyc")) {
        failures.push(path.relative(root, path.join(directory, entry.name)))
      } else if (entry.isDirectory()) {
        await walk(path.join(directory, entry.name))
      }
    }
  }
  await walk(root)
  if (failures.length) throw new Error(`Generated package contains caches:\n${failures.join("\n")}`)
}

async function verifyGeneratedRuntime() {
  const manifest = JSON.parse(await fs.readFile(path.join(packageDirectory, "expert.json"), "utf8"))
  const tools = JSON.parse(await fs.readFile(path.join(projectDirectory, "runtime", "drawio-tools.json"), "utf8")).tools
  const toolsDirectory = path.join(packageDirectory, ".opencode", "tools")

  const declared = manifest.runtime_extensions.custom_tools.map(item => item.path)
  const expected = tools.map(item => item.path)
  if (declared.length !== expected.length || declared.some((value, index) => value !== expected[index])) {
    throw new Error("generated expert.json custom tools drifted from runtime/drawio-tools.json")
  }
  for (const item of manifest.runtime_extensions.custom_tools) {
    const target = path.join(toolsDirectory, ...item.path.split("/"))
    const content = await fs.readFile(target, "utf8")
    if (content !== item.content) {
      throw new Error(`generated adapter does not match manifest content: ${item.path}`)
    }
    if (!content.includes(`createDrawioTool("${path.basename(item.path, ".js")}", tool)`)) {
      throw new Error(`generated adapter does not reference its tool name: ${item.path}`)
    }
  }
  const adapters = (await fs.readdir(toolsDirectory)).filter(name => name.endsWith(".js"))
  if (adapters.length !== tools.length) {
    throw new Error(`expected ${tools.length} adapters in .opencode/tools, found ${adapters.length}`)
  }

  const hooksPlugin = manifest.runtime_extensions.plugins.local[0]
  const hooksTarget = path.join(packageDirectory, ".opencode", "plugins", hooksPlugin.path)
  if ((await fs.readFile(hooksTarget, "utf8")) !== hooksPlugin.content) {
    throw new Error("generated hook plugin does not match manifest content")
  }
  if (/drawio_validate|createDrawioToolset/.test(hooksPlugin.content)) {
    throw new Error("hook plugin must not register drawio_* tools")
  }

  const coreName = path.basename(
    JSON.parse(await fs.readFile(path.join(projectDirectory, "runtime", "drawio-tools.json"), "utf8")).runtime_core,
  )
  const coreTarget = path.join(
    packageDirectory,
    ".opencode",
    "skills",
    "drawio-expert-common",
    "scripts",
    coreName,
  )
  const cores = await readFiles(packageDirectory, file => path.basename(file) === coreName)
  if (cores.length !== 1 || cores[0] !== coreTarget) {
    throw new Error(
      `the shared runtime core must exist exactly once at ${path.relative(packageDirectory, coreTarget)}; found: ${cores.map(file => path.relative(packageDirectory, file)).join(", ") || "none"}`,
    )
  }
  const coreContent = await fs.readFile(coreTarget, "utf8")
  if (/from\s*["']@opencode-ai/.test(coreContent)) {
    throw new Error("shared runtime core must not contain runtime @opencode-ai imports")
  }
}

const managerScripts = resolveManagerScripts()

run(process.platform === "win32" ? "bun.cmd" : "bun", ["install", "--frozen-lockfile"])
run("node", [path.join(scriptDirectory, "sync-expert-source.mjs")])
run("python", [
  path.join(managerScripts, "create_expert.py"),
  "--manifest",
  manifestPath,
  "--creation-target",
  "custom",
  "--output-dir",
  outputRoot,
  "--force",
])

for (const skill of await fs.readdir(path.join(packageDirectory, ".opencode", "skills"), { withFileTypes: true })) {
  if (skill.isDirectory()) await verifySkill(path.join(packageDirectory, ".opencode", "skills", skill.name))
}
await verifyMarkdownLinks(path.join(packageDirectory, ".opencode", "skills"))
await verifyNoDesktopFallback(path.join(packageDirectory, ".opencode", "skills", "drawio-skill"))
await verifyNoCaches(path.join(packageDirectory, ".opencode"))
await verifyGeneratedRuntime()

run("python", [path.join(managerScripts, "validate_expert.py"), packageDirectory])
console.log(`Built and validated ${packageDirectory}`)
