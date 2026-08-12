import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const testPath = path.resolve("tests/integrated.integration.mjs")
const sourceUrl = pathToFileURL(path.resolve("runtime/drawio-runtime.ts")).href
const code = fs.readFileSync(testPath, "utf8").replace(
  "../generated/drawio-expert/.opencode/plugins/drawio-runtime.js",
  sourceUrl,
)

await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`)
