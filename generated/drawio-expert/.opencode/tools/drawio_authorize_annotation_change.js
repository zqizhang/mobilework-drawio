import { tool } from "@opencode-ai/plugin"

const coreUrl = new URL(import.meta.url)
coreUrl.pathname = coreUrl.pathname.replace(
  /\/tools\/[^/]+$/,
  "/skills/drawio-session-editing/scripts/drawio-runtime-core.mjs",
)
const { createDrawioTool } = await import(coreUrl.href)

export default createDrawioTool("drawio_authorize_annotation_change", tool)
