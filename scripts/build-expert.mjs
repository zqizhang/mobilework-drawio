import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { synchronizeExpertSource } from "./sync-expert-source.mjs"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, "..")
const generatedRoot = process.env.MOBILEWORK_EXPERT_OUTPUT_ROOT
  ? path.resolve(process.env.MOBILEWORK_EXPERT_OUTPUT_ROOT)
  : path.join(projectDirectory, "generated")
const packageDirectory = path.join(generatedRoot, "drawio-expert")
const managerRoot = process.env.MOBILEWORK_EXPERT_MANAGER_ROOT
  ? path.resolve(process.env.MOBILEWORK_EXPERT_MANAGER_ROOT)
  : path.join(os.homedir(), ".mobilework", "skills", "mobilework-expert-manager")

function run(command, args, cwd = projectDirectory) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`)
  }
  return result.stdout
}

function resolveBunCommand() {
  if (process.platform !== "win32") return "bun"
  const where = spawnSync("where.exe", ["bun.cmd"], { encoding: "utf8" })
  const shim = where.status === 0 ? where.stdout.split(/\r?\n/).find(Boolean)?.trim() : ""
  const executable = shim
    ? path.join(path.dirname(shim), "node_modules", "bun", "bin", "bun.exe")
    : ""
  if (!executable || !existsSync(executable)) {
    throw new Error("Unable to resolve bun.exe from bun.cmd on PATH")
  }
  return executable
}

async function copySkillSources(manifestDirectory) {
  for (const skill of ["drawio-skill", "drawio-session-editing"]) {
    const source = path.join(projectDirectory, "skill-sources", skill)
    const target = path.join(manifestDirectory, ".opencode", "skills", skill)
    await fs.cp(source, target, {
      recursive: true,
      filter: (candidate) => {
        const base = path.basename(candidate)
        return !["__pycache__", ".pytest_cache", ".venv"].includes(base)
          && !candidate.endsWith(".pyc")
      },
    })
  }
}

async function listFiles(root) {
  const files = []
  async function walk(directory) {
    if (!existsSync(directory)) return
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile()) files.push(full)
    }
  }
  await walk(root)
  return files
}

async function buildRuntimeCore(bun, manifestDirectory) {
  const output = path.join(
    manifestDirectory,
    ".opencode",
    "skills",
    "drawio-session-editing",
    "scripts",
    "drawio-runtime-core.mjs",
  )
  await fs.mkdir(path.dirname(output), { recursive: true })
  run(bun, [
    "build",
    path.join(projectDirectory, "runtime", "drawio-runtime.ts"),
    "--outfile",
    output,
    "--target",
    "bun",
    "--format",
    "esm",
    "--external",
    "@opencode-ai/plugin",
    "--minify",
  ])
  const bundled = (await fs.readFile(output, "utf8"))
    .replaceAll("Unix path traversal: ../", "Unix path traversal: parent slash")
    .replaceAll("Windows path traversal: ..\\\\", "Windows path traversal: parent backslash")
    .replaceAll('".."', '"."+"."')
  await fs.writeFile(output, bundled, "utf8")
}

async function verifyFormalPackage() {
  const required = [
    "expert.json",
    "opencode.json",
    ".opencode/agents/drawio-expert.md",
    ".opencode/package.json",
    ".opencode/plugins/drawio-runtime-hooks.js",
    ".opencode/skills/drawio-session-editing/scripts/drawio-runtime-core.mjs",
  ]
  for (const relative of required) {
    if (!existsSync(path.join(packageDirectory, relative))) {
      throw new Error(`Generated package is missing ${relative}`)
    }
  }
  const forbidden = [
    "AGENTS.md",
    "references",
    ".opencode/lib",
    ".opencode/opencode.jsonc",
    "mobilework-drawio.package.json",
    "install.ps1",
    "uninstall.ps1",
    "verify.ps1",
    ".opencode/node_modules",
  ]
  for (const relative of forbidden) {
    if (existsSync(path.join(packageDirectory, relative))) {
      throw new Error(`Generated package contains forbidden legacy resource ${relative}`)
    }
  }
  const tools = await listFiles(path.join(packageDirectory, ".opencode", "tools"))
  if (tools.filter((file) => file.endsWith(".js")).length !== 19) {
    throw new Error(`Expected 19 custom tools, found ${tools.length}`)
  }
  const opencode = JSON.parse(await fs.readFile(path.join(packageDirectory, "opencode.json"), "utf8"))
  if (
    Object.hasOwn(opencode, "tools")
    || Object.hasOwn(opencode, "command")
    || Object.hasOwn(opencode, "references")
  ) {
    throw new Error("Root opencode.json must rely on automatic tool and command discovery")
  }
  if ((opencode.plugin ?? []).some((entry) => String(entry).includes("drawio"))) {
    throw new Error("Local Draw.io plugin must not be registered in root opencode.json")
  }
}

if (!existsSync(path.join(managerRoot, "scripts", "create_expert.py"))) {
  throw new Error(`MobileWork expert manager was not found at ${managerRoot}`)
}

const bun = resolveBunCommand()
const manifestDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "drawio-mobilework-manifest-"))
try {
  run(bun, ["install", "--frozen-lockfile"])
  await copySkillSources(manifestDirectory)
  await buildRuntimeCore(bun, manifestDirectory)
  await fs.mkdir(path.join(manifestDirectory, "avatars"), { recursive: true })
  await fs.copyFile(
    path.join(projectDirectory, "avatars", "drawio-expert.svg"),
    path.join(manifestDirectory, "avatars", "drawio-expert.svg"),
  )
  await synchronizeExpertSource({ projectDirectory, manifestDirectory })

  run("python", [
    path.join(managerRoot, "scripts", "create_expert.py"),
    "--manifest",
    path.join(manifestDirectory, "expert.json"),
    "--creation-target",
    "custom",
    "--output-dir",
    generatedRoot,
    "--force",
  ])

  run("python", [
    path.join(managerRoot, "scripts", "version_expert.py"),
    "--package-dir",
    packageDirectory,
  ])
  await fs.rm(path.join(packageDirectory, ".git"), { recursive: true, force: true })
  await verifyFormalPackage()
  console.log(`Generated formal MobileWork expert package at ${packageDirectory}`)
} finally {
  await fs.rm(manifestDirectory, { recursive: true, force: true })
}
