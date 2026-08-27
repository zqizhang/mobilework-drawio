import { readFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { tool } from "@opencode-ai/plugin"

const projectDirectory = path.resolve(import.meta.dirname, "..")
const toolsManifest = JSON.parse(await readFile(
  path.join(projectDirectory, "runtime", "drawio-tools.json"),
  "utf8",
))

async function loadSourceExtension(directory) {
  const core = await import(pathToFileURL(
    path.join(projectDirectory, "runtime", "drawio-runtime.ts"),
  ).href)
  await core.initializeDrawioWorkspace(directory)
  return {
    "experimental.chat.system.transform": async (_input, output) => {
      core.applyDrawioSystemGuidance(output)
    },
    "tool.execute.before": async (input, output) => {
      core.enforceDrawioWriteGuard(input, output)
    },
    tool: Object.fromEntries(toolsManifest.tools.map(({ name }) => [
      name,
      core.createDrawioTool(name, tool),
    ])),
  }
}

async function loadGeneratedExtension(directory) {
  const packageDirectory = path.join(projectDirectory, "generated", "drawio-expert")
  const pluginModule = await import(pathToFileURL(path.join(
    packageDirectory,
    ".opencode",
    "plugins",
    "drawio-runtime-hooks.js",
  )).href)
  const hooks = await pluginModule.DrawioRuntimeHooks({ directory })
  const toolEntries = await Promise.all(toolsManifest.tools.map(async ({ name }) => {
    const module = await import(pathToFileURL(path.join(
      packageDirectory,
      ".opencode",
      "tools",
      `${name}.js`,
    )).href)
    return [name, module.default]
  }))
  return { ...hooks, tool: Object.fromEntries(toolEntries) }
}

export async function DrawioExpertPlugin({ directory }) {
  return process.env.DRAWIO_TEST_SOURCE === "1"
    ? loadSourceExtension(directory)
    : loadGeneratedExtension(directory)
}
