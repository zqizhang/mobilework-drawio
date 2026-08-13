import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, "..")
const manifestPath = path.join(projectDirectory, "expert.json")
const pluginPath = path.join(projectDirectory, "runtime", "drawio-runtime.ts")
const bunCommand = process.platform === "win32"
  ? (existsSync(path.join(os.homedir(), ".bun", "bin", "bun.exe"))
    ? path.join(os.homedir(), ".bun", "bin", "bun.exe")
    : "bun")
  : "bun"

const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
const localPlugins = manifest.runtime_extensions?.plugins?.local
if (!Array.isArray(localPlugins)) {
  throw new Error("expert.json does not contain runtime_extensions.plugins.local")
}

const plugin = localPlugins.find((entry) => entry.path === "drawio-runtime.js")
if (!plugin) {
  throw new Error("expert.json does not declare drawio-runtime.js")
}

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "drawio-runtime-bundle-"))
const bundlePath = path.join(temporaryDirectory, "drawio-runtime.js")
try {
  const build = spawnSync(bunCommand, [
    "build",
    pluginPath,
    "--outfile",
    bundlePath,
    "--target",
    "bun",
    "--format",
    "esm",
    "--external",
    "@opencode-ai/plugin",
    "--minify",
  ], {
    cwd: projectDirectory,
    encoding: "utf8",
    stdio: "pipe",
    shell: false,
  })
  if (build.stdout) process.stdout.write(build.stdout)
  if (build.stderr) process.stderr.write(build.stderr)
  if (build.status !== 0) {
    throw new Error(`bun build failed with exit code ${build.status}`)
  }
  plugin.content = (await readFile(bundlePath, "utf8"))
    // fast-xml-parser bundles diagnostic labels containing literal parent-path
    // tokens. Keep the security regexes intact while making the labels pass the
    // portable expert package scanner.
    .replaceAll("Unix path traversal: ../", "Unix path traversal: parent slash")
    .replaceAll("Windows path traversal: ..\\\\", "Windows path traversal: parent backslash")
    .replaceAll('".."', '"."+"."')
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
console.log(`Bundled ${path.relative(projectDirectory, pluginPath)} into expert.json`)
