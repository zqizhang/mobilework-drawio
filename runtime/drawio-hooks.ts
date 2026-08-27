import type { Plugin } from "@opencode-ai/plugin"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

function resolveRuntimePath(): string {
  const managedSkills = process.env.MOBILEWORK_SKILLS_DIR?.trim()

  if (managedSkills) {
    return path.join(
      managedSkills,
      "drawio-expert-common",
      "scripts",
      "drawio-runtime-core.mjs",
    )
  }

  // 兼容直接把专家包作为普通OpenCode项目运行：
  // 插件位于 <package>/.opencode/plugins/，共享核心位于
  // <package>/.opencode/skills/drawio-expert-common/scripts/。
  const opencodeRoot = path.dirname(
    path.dirname(fileURLToPath(import.meta.url)),
  )

  return path.join(
    opencodeRoot,
    "skills",
    "drawio-expert-common",
    "scripts",
    "drawio-runtime-core.mjs",
  )
}

async function loadRuntimeCore() {
  const runtimeUrl = pathToFileURL(resolveRuntimePath()).href
  return await import(runtimeUrl)
}

export const DrawioHooksPlugin: Plugin = async (input) => {
  const core = await loadRuntimeCore()

  await core.initializeDrawioWorkspace(input.directory)

  return {
    "experimental.chat.system.transform": async (_input, output) => {
      core.applyDrawioSystemGuidance(output)
    },
    "tool.execute.before": async (input, output) => {
      core.enforceDrawioWriteGuard(input, output)
    },
  }
}
