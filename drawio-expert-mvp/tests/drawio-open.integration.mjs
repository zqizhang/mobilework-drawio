import assert from "node:assert/strict"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { DrawioExpertPlugin } from "../drawio-expert.ts"

process.env.DRAWIO_BRIDGE_HOST = "127.0.0.1"
process.env.DRAWIO_BRIDGE_PORT = "18879"

const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "drawio-open-test-"))
const context = {
  sessionID: "test-session",
  messageID: "test-message",
  agent: "drawio-expert",
  directory: workspace,
  worktree: workspace,
  abort: new AbortController().signal,
  metadata() {},
  async ask() {},
}

try {
  const plugin = await DrawioExpertPlugin({})
  assert.deepEqual(
    Object.keys(plugin.tool).filter((name) => name === "drawio_open"),
    ["drawio_open"],
  )

  const createResult = JSON.parse(await plugin.tool.drawio_create.execute({
    file: "architecture.drawio",
    title: "Bridge test",
    nodes: [
      { id: "client", label: "OpenWork", kind: "application" },
      { id: "drawio", label: "Draw.io", kind: "external" },
    ],
    edges: [{ id: "edge-1", source: "client", target: "drawio", label: "embed" }],
    direction: "left-to-right",
    compressed: false,
    overwrite: false,
  }, context))
  assert.equal(createResult.valid, true)

  const openResult = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "architecture.drawio",
    drawio_url: "http://127.0.0.1:8080",
    bridge_url: "http://127.0.0.1:18879",
    overwrite: false,
  }, context))
  assert.equal(openResult.type, "drawio-artifact")
  assert.equal(openResult.saveMode, "direct-workspace")
  assert.deepEqual(openResult.files, ["architecture.drawio.openwork.html"])
  assert.equal(JSON.stringify(openResult).includes("token="), false)

  const artifactPath = path.join(workspace, openResult.artifact)
  const artifactHtml = await fs.readFile(artifactPath, "utf8")
  assert.match(artifactHtml, /drawio-expert-artifact:v1/)
  const configMatch = artifactHtml.match(/const CONFIG = (.+);/)
  assert.ok(configMatch)
  const config = JSON.parse(configMatch[1])

  const getResponse = await fetch(config.apiUrl)
  assert.equal(getResponse.status, 200)
  const originalXml = await getResponse.text()
  assert.match(originalXml, /OpenWork/)

  const updatedXml = originalXml.replace("OpenWork", "OpenWork Web")
  const firstPut = await fetch(config.apiUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/xml" },
    body: updatedXml,
  })
  assert.equal(firstPut.status, 200)
  const firstPutResult = await firstPut.json()
  assert.equal(firstPutResult.ok, true)
  assert.ok(firstPutResult.backup)
  assert.match(await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"), /OpenWork Web/)

  const backupsAfterFirstSave = (await fs.readdir(workspace))
    .filter((name) => name.startsWith("architecture.drawio.") && name.endsWith(".bak"))
  assert.equal(backupsAfterFirstSave.length, 1)

  const invalidPut = await fetch(config.apiUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/xml" },
    body: "<not-drawio/>",
  })
  assert.equal(invalidPut.status, 422)
  assert.match(await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"), /OpenWork Web/)

  const secondUpdatedXml = updatedXml.replace("OpenWork Web", "OpenWork Intranet")
  const secondPut = await fetch(config.apiUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/xml" },
    body: secondUpdatedXml,
  })
  assert.equal(secondPut.status, 200)
  const backupsAfterSecondSave = (await fs.readdir(workspace))
    .filter((name) => name.startsWith("architecture.drawio.") && name.endsWith(".bak"))
  assert.equal(backupsAfterSecondSave.length, 1)

  const invalidUrl = new URL(config.apiUrl)
  invalidUrl.searchParams.set("token", "invalid")
  assert.equal((await fetch(invalidUrl)).status, 401)

  await assert.rejects(
    () => plugin.tool.drawio_open.execute({
      file: "../outside.drawio",
      drawio_url: "http://127.0.0.1:8080",
      bridge_url: "http://127.0.0.1:18879",
      overwrite: false,
    }, context),
    /inside the current workspace/,
  )

  console.log(JSON.stringify({
    ok: true,
    artifact: openResult.artifact,
    directSave: true,
    persistentBackups: backupsAfterSecondSave.length,
    invalidXmlRejected: true,
    invalidTokenRejected: true,
    pathTraversalRejected: true,
  }, null, 2))
} finally {
  const bridge = globalThis.__drawioExpertBridge
  if (bridge?.server) {
    await new Promise((resolve) => bridge.server.close(resolve))
  }
  bridge?.grants.clear()
  await fs.rm(workspace, { recursive: true, force: true })
}
