import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { DrawioExpertPlugin } from "./load-drawio-extension.mjs"

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
    title: "Docker 中文导出集成",
    nodes: [
      { id: "client", label: "MobileWork", kind: "application" },
      { id: "export", label: "Docker Export Server", kind: "service" },
    ],
    edges: [{ id: "request", source: "client", target: "export", label: "HTTP" }],
    direction: "left-to-right",
    compressed: false,
    overwrite: false,
  }, context)
  const createdXml = await fs.readFile(path.join(workspace, "docker-export.drawio"), "utf8")
  assert.match(createdXml, /<diagram id="[\x20-\x7e]+" name="Docker 中文导出集成">/)

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

  const unicodePageXml = createdXml.replace(/<diagram id="[^"]+"/, '<diagram id="中文页面"')
  await fs.writeFile(path.join(workspace, "docker-export-unicode.drawio"), unicodePageXml, "utf8")
  const unicodeFinalized = JSON.parse(await plugin.tool.drawio_finalize.execute({
    file: "docker-export-unicode.drawio",
    threshold: 0,
    scale: 1,
    border: 8,
  }, context))
  assert.equal(unicodeFinalized.ok, true)
  assert.equal(
    await fs.readFile(path.join(workspace, "docker-export-unicode.drawio"), "utf8"),
    unicodePageXml,
    "export compatibility mapping must not rewrite the source diagram",
  )
  const unicodePng = await fs.readFile(path.join(workspace, "docker-export-unicode.png"))
  assert.equal(unicodePng.subarray(0, 8).equals(png.subarray(0, 8)), true)

  const multiPageXml = `<mxfile host="test">
    <diagram id="overview" name="Overview"><mxGraphModel><root>
      <mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="overview-node" value="第一页" style="fillColor=#dae8fc;" vertex="1" parent="1"><mxGeometry x="20" y="20" width="160" height="60" as="geometry"/></mxCell>
    </root></mxGraphModel></diagram>
    <diagram id="details" name="Details"><mxGraphModel><root>
      <mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="details-node" value="第二页" style="fillColor=#d5e8d4;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="260" height="100" as="geometry"/></mxCell>
    </root></mxGraphModel></diagram>
  </mxfile>`
  await fs.writeFile(path.join(workspace, "docker-multi-page.drawio"), multiPageXml, "utf8")
  for (const format of ["png", "jpeg", "xmlpng"]) {
    const outputExtension = format === "xmlpng" ? "editable.png" : format
    const exported = JSON.parse(await plugin.tool.drawio_export.execute({
      input_path: "docker-multi-page.drawio",
      output_path: `docker-multi-page.${outputExtension}`,
      format,
      all_pages: true,
      scale: 1,
      border: 8,
      background: "#ffffff",
      embed_xml: false,
      overwrite: false,
    }, context))
    assert.equal(exported.success, true)
    assert.equal(exported.page_count, 2)
    assert.equal(exported.outputs.length, 2)
    assert.deepEqual(exported.outputs.map((output) => output.page_id), ["overview", "details"])
    const pageFiles = await Promise.all(
      exported.outputs.map((output) => fs.readFile(path.join(workspace, output.output_path))),
    )
    assert.equal(pageFiles.every((content) => content.length > 100), true)
    assert.notEqual(
      createHash("sha256").update(pageFiles[0]).digest("hex"),
      createHash("sha256").update(pageFiles[1]).digest("hex"),
      `${format} all_pages outputs must contain different pages`,
    )
  }

  console.log(JSON.stringify({
    ok: true,
    implementation: "typescript-plugin",
    dockerExport: true,
    automaticPng: true,
    openUrl: true,
    pngBytes: finalized.png.file_size_bytes,
    unicodePageIdExport: true,
    multiPageRasterExport: true,
  }, null, 2))
} finally {
  const bridge = globalThis.__drawioIntegratedBridge
  if (bridge?.server) {
    for (const clients of bridge.eventClients.values()) {
      for (const client of clients) client.response.end()
    }
    await new Promise((resolve) => bridge.server.close(resolve))
  }
  await fs.rm(workspace, { recursive: true, force: true })
}
