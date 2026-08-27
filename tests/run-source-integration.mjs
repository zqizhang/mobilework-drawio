import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const testPath = path.resolve(scriptDirectory, "integrated.integration.mjs")

// Run the integrated suite against the TypeScript source instead of the
// generated runtime core. Bun is required because it imports the .ts entry
// directly; the generated-package run remains `bun tests/integrated.integration.mjs`.
const result = spawnSync(process.execPath, [testPath], {
  cwd: path.resolve(scriptDirectory, ".."),
  env: { ...process.env, DRAWIO_TEST_SOURCE: "1" },
  encoding: "utf8",
  stdio: "inherit",
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}
process.exit(result.status ?? 1)
