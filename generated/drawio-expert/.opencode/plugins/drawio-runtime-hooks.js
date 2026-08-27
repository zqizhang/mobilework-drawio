const coreUrl = new URL(import.meta.url)
coreUrl.pathname = coreUrl.pathname.replace(
  /\/plugins\/[^/]+$/,
  "/skills/drawio-session-editing/scripts/drawio-runtime-core.mjs",
)
const {
  applyDrawioSystemGuidance,
  enforceDrawioWriteGuard,
  initializeDrawioWorkspace,
} = await import(coreUrl.href)

/**
 * Standard OpenCode workspace plugin entrypoint.
 *
 * Tool definitions intentionally live in `.opencode/tools`; this plugin owns
 * only runtime initialization and hooks that cannot be expressed by a custom
 * tool file.
 */
export const DrawioRuntimeHooks = async (input) => {
  await initializeDrawioWorkspace(input.directory)

  return {
    "experimental.chat.system.transform": async (_input, output) => {
      applyDrawioSystemGuidance(output)
    },
    "tool.execute.before": async (hookInput, output) => {
      enforceDrawioWriteGuard(hookInput, output)
    },
  }
}
