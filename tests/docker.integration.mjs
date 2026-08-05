import assert from "node:assert/strict"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { DrawioExpertPlugin } from "../generated/drawio-expert/.opencode/plugins/drawio-runtime.js"

process.env.DRAWIO_EXPORT_URL ||= "http://127.0.0.1:18765/ImageExport4/export"
process.env.DRAWIO_WEB_URL ||= "http://127.0.0.1:18080"
process.env.DRAWIO_BRIDGE_HOST = "127.0.0.1"
process.env.DRAWIO_BRIDGE_PORT = "0"

const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "drawio-docker-integration-"))
const context = {
  sessionID: "docker-integration-session",
  messageID: "docker-integration-message",
  agent: "drawio-expert",
  directory: workspace,
  worktree: "/",
  abort: new AbortController().signal,
  metadata() {},
  async ask() {},
}

try {
  const plugin = await DrawioExpertPlugin({ directory: workspace })
  const health = JSON.parse(await plugin.tool.drawio_health_check.execute({ deep: true }, context))
  assert.equal(health.success, true)
  assert.equal(health.checks.deep_test.success, true)

  await plugin.tool.drawio_create.execute({
    file: "docker-export.drawio",
    title: "Docker Export Integration",
    nodes: [
      { id: "client", label: "MobileWork", kind: "application" },
      { id: "export", label: "Docker Export Server", kind: "service" },
    ],
    edges: [{ id: "request", source: "client", target: "export", label: "HTTP" }],
    direction: "left-to-right",
    compressed: false,
    overwrite: false,
  }, context)

  const finalized = JSON.parse(await plugin.tool.drawio_finalize.execute({
    file: "docker-export.drawio",
    threshold: 0,
    scale: 1,
    border: 8,
  }, context))
  assert.equal(finalized.ok, true)
  assert.equal(finalized.png.content_type.startsWith("image/png"), true)
  assert.equal(finalized.png.file_size_bytes > 100, true)
  assert.match(finalized.openUrl, /\/editor\?/)
  const png = await fs.readFile(path.join(workspace, "docker-export.png"))
  assert.equal(
    png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    true,
  )
  assert.equal(png[25], 2, "default PNG export should be opaque truecolor, not transparent RGBA")

  console.log(JSON.stringify({
    ok: true,
    implementation: "typescript-plugin",
    dockerExport: true,
    automaticPng: true,
    openUrl: true,
    pngBytes: finalized.png.file_size_bytes,
  }, null, 2))
} finally {
  const bridge = globalThis.__drawioIntegratedBridge
  if (bridge?.server) {
    for (const clients of bridge.eventClients.values()) {
      for (const response of clients) response.end()
    }
    await new Promise((resolve) => bridge.server.close(resolve))
  }
  await fs.rm(workspace, { recursive: true, force: true })
}
