import { spawnSync } from "node:child_process"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, "..")
const manifestPath = path.join(projectDirectory, "expert.json")
const outputRoot = path.join(projectDirectory, "generated")
const packageDirectory = path.join(outputRoot, "drawio-expert")
const managerScripts = path.resolve(
  projectDirectory,
  "..",
  "mobilework-expert-manager",
  "scripts",
)

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

run(process.platform === "win32" ? "bun.cmd" : "bun", ["install", "--frozen-lockfile"])
run("node", [path.join(scriptDirectory, "sync-expert-source.mjs")])
run("python", [
  path.join(managerScripts, "create_expert.py"),
  "--manifest",
  manifestPath,
  "--output-dir",
  outputRoot,
  "--force",
])

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

run("python", [path.join(managerScripts, "validate_expert.py"), packageDirectory])
console.log(`Built and validated ${packageDirectory}`)
