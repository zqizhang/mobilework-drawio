import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, "..")
const manifestPath = path.join(projectDirectory, "expert.json")
const outputRoot = path.join(projectDirectory, "generated")
const packageDirectory = path.join(outputRoot, "drawio-expert")
const managerScripts = path.join(
  os.homedir(),
  ".agents",
  "skills",
  "mobilework-expert-manager",
  "scripts",
)
const createExpertScript = path.join(managerScripts, "create_expert.py")
const validateExpertScript = path.join(managerScripts, "validate_expert.py")
const bunCommand = process.platform === "win32"
  ? (existsSync(path.join(os.homedir(), ".bun", "bin", "bun.exe"))
    ? path.join(os.homedir(), ".bun", "bin", "bun.exe")
    : "bun")
  : "bun"

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

async function copyDirectory(source, target, filter = () => true) {
  await fs.rm(target, { recursive: true, force: true })
  await fs.cp(source, target, { recursive: true, filter })
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

async function syncPackageFromManifestFallback() {
  if (!existsSync(packageDirectory)) {
    throw new Error(
      `mobilework-expert-manager is not installed and ${packageDirectory} does not exist`,
    )
  }
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"))
  await fs.copyFile(manifestPath, path.join(packageDirectory, "expert.json"))

  const localPlugins = manifest.runtime_extensions?.plugins?.local
  const runtimePlugin = Array.isArray(localPlugins)
    ? localPlugins.find((entry) => entry.path === "drawio-runtime.js")
    : null
  if (!runtimePlugin?.content) {
    throw new Error("expert.json does not contain bundled drawio-runtime.js content")
  }
  const pluginDirectory = path.join(packageDirectory, ".opencode", "plugins")
  await fs.mkdir(pluginDirectory, { recursive: true })
  await fs.writeFile(path.join(pluginDirectory, "drawio-runtime.js"), runtimePlugin.content, "utf8")

  const commandDirectory = path.join(packageDirectory, ".opencode", "commands")
  await fs.rm(commandDirectory, { recursive: true, force: true })
  await fs.mkdir(commandDirectory, { recursive: true })
  for (const command of manifest.runtime_extensions?.commands || []) {
    await fs.writeFile(
      path.join(commandDirectory, `${command.name}.md`),
      [
        "---",
        `description: ${command.description}`,
        `agent: ${command.agent}`,
        "---",
        "",
        command.template,
        "",
      ].join("\n"),
      "utf8",
    )
  }
  console.warn(
    `mobilework-expert-manager not found; refreshed existing package shell at ${packageDirectory}`,
  )
}

run(bunCommand, ["install", "--frozen-lockfile"])
run("node", [path.join(scriptDirectory, "sync-expert-source.mjs")])
if (existsSync(createExpertScript)) {
  run("python", [
    createExpertScript,
    "--manifest",
    manifestPath,
    "--output-dir",
    outputRoot,
    "--force",
  ])
} else {
  await syncPackageFromManifestFallback()
}

for (const skill of ["drawio-skill", "drawio-session-editing"]) {
  await copyDirectory(
    path.join(projectDirectory, "skill-sources", skill),
    path.join(packageDirectory, ".opencode", "skills", skill),
    source => !["__pycache__", ".pytest_cache", ".venv"].includes(path.basename(source))
      && !source.endsWith(".pyc"),
  )
}

await fs.copyFile(
  path.join(projectDirectory, ".env.example"),
  path.join(packageDirectory, ".env.example"),
)

for (const skill of ["drawio-skill", "drawio-session-editing"]) {
  await verifySkill(path.join(packageDirectory, ".opencode", "skills", skill))
}
await verifyMarkdownLinks(path.join(packageDirectory, ".opencode", "skills"))
await verifyNoDesktopFallback(path.join(packageDirectory, ".opencode", "skills", "drawio-skill"))
await verifyNoCaches(packageDirectory)

if (existsSync(validateExpertScript)) {
  run("python", [validateExpertScript, packageDirectory])
} else {
  console.warn("mobilework-expert-manager validate_expert.py not found; skipped package shell validation")
}
console.log(`Built and validated ${packageDirectory}`)
