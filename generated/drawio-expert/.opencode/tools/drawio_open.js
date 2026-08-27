import { tool } from "@opencode-ai/plugin"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

function resolveRuntimePath() {
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
  // 适配器位于 <package>/.opencode/tools/，共享核心位于
  // <package>/.opencode/skills/ 下。
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

const runtimeUrl = pathToFileURL(resolveRuntimePath()).href
const { createDrawioTool } = await import(runtimeUrl)

export default createDrawioTool("drawio_open", tool)
