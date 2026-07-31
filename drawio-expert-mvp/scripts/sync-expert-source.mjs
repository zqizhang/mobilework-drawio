import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, "..")
const manifestPath = path.join(projectDirectory, "expert.json")
const pluginPath = path.join(projectDirectory, "drawio-expert.ts")

const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
const localPlugins = manifest.runtime_extensions?.plugins?.local
if (!Array.isArray(localPlugins)) {
  throw new Error("expert.json does not contain runtime_extensions.plugins.local")
}

const plugin = localPlugins.find((entry) => entry.path === "drawio-expert.ts")
if (!plugin) {
  throw new Error("expert.json does not declare drawio-expert.ts")
}

plugin.content = await readFile(pluginPath, "utf8")
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
console.log(`Synchronized ${path.relative(projectDirectory, pluginPath)} into expert.json`)
