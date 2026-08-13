import assert from "node:assert/strict"
import { promises as fs } from "node:fs"
import { createServer } from "node:http"
import os from "node:os"
import path from "node:path"

import { DrawioExpertPlugin } from "../generated/drawio-expert/.opencode/plugins/drawio-runtime.js"

const DRAWIO_ENVIRONMENT_KEYS = [
  "DRAWIO_WEB_URL",
  "DRAWIO_BRIDGE_HOST",
  "DRAWIO_BRIDGE_PORT",
  "DRAWIO_EXPORT_URL",
  "DRAWIO_REQUEST_TIMEOUT",
  "DRAWIO_MAX_INPUT_SIZE_MB",
  "DRAWIO_MAX_OUTPUT_SIZE_MB",
]
const originalEnvironment = Object.fromEntries(
  DRAWIO_ENVIRONMENT_KEYS.map((name) => [name, process.env[name]]),
)
for (const name of DRAWIO_ENVIRONMENT_KEYS) delete process.env[name]

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(128, 1),
])
const exportServer = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/ImageExport4/export") {
    response.writeHead(404).end()
    return
  }
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString("utf8")
  const form = new URLSearchParams(body)
  assert.equal(form.get("format"), "png")
  assert.equal(typeof form.get("xml"), "string")
  assert.equal(form.get("bg"), "#ffffff")
  response.writeHead(200, { "content-type": "image/png" })
  response.end(PNG)
})
await new Promise((resolve) => exportServer.listen(0, "127.0.0.1", resolve))
const exportAddress = exportServer.address()

const XML = '<mxfile host="test"><diagram id="p1" name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="node" value="MobileWork" vertex="1" parent="1"><mxGeometry x="20" y="20" width="120" height="60" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>'
const NESTED_XML = `<mxfile host="test"><diagram id="nested" name="Nested containers"><mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="user" value="User" vertex="1" parent="1"><mxGeometry x="390" y="60" width="160" height="60" as="geometry"/></mxCell>
  <mxCell id="app" value="Application" vertex="1" parent="1"><mxGeometry x="390" y="200" width="160" height="60" as="geometry"/></mxCell>
  <mxCell id="agentRt" value="Agent runtime" style="swimlane;startSize=30;" vertex="1" parent="1"><mxGeometry x="40" y="360" width="1000" height="300" as="geometry"/></mxCell>
  <mxCell id="orch" value="Orchestrator" vertex="1" parent="agentRt"><mxGeometry x="340" y="70" width="220" height="80" as="geometry"/></mxCell>
  <mxCell id="eval" value="Evaluator" vertex="1" parent="agentRt"><mxGeometry x="340" y="200" width="220" height="80" as="geometry"/></mxCell>
  <mxCell id="tools" value="Tools" style="swimlane;startSize=30;" vertex="1" parent="1"><mxGeometry x="40" y="720" width="1000" height="250" as="geometry"/></mxCell>
  <mxCell id="search" value="Search" vertex="1" parent="tools"><mxGeometry x="310" y="70" width="200" height="60" as="geometry"/></mxCell>
  <mxCell id="e1" value="request" style="edgeStyle=orthogonalEdgeStyle;jumpStyle=arc;" edge="1" parent="1" source="user" target="app"><mxGeometry relative="1" as="geometry"/></mxCell>
  <mxCell id="e8" value="tool call" style="edgeStyle=orthogonalEdgeStyle;jumpStyle=arc;exitX=1;exitY=0.5;entryX=1;entryY=0.5;" edge="1" parent="1" source="orch" target="search"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="700" y="470"/><mxPoint x="700" y="820"/></Array></mxGeometry></mxCell>
</root></mxGraphModel></diagram></mxfile>`
const NESTED_CROSSING_XML = NESTED_XML.replace(
  '<mxCell id="e1"',
  '<mxCell id="blocker" value="Blocker" vertex="1" parent="1"><mxGeometry x="430" y="140" width="80" height="40" as="geometry"/></mxCell><mxCell id="e1"',
)
const LABEL_OVERLAP_XML = `<mxfile host="test"><diagram id="labels" name="Label overlap"><mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="app" value="Application" vertex="1" parent="1"><mxGeometry x="470" y="160" width="160" height="60" as="geometry"/></mxCell>
  <mxCell id="agentRt" value="Agent runtime" style="swimlane;startSize=30;" vertex="1" parent="1"><mxGeometry x="40" y="300" width="940" height="280" as="geometry"/></mxCell>
  <mxCell id="orch" value="Orchestrator" vertex="1" parent="agentRt"><mxGeometry x="360" y="60" width="220" height="80" as="geometry"/></mxCell>
  <mxCell id="e2" value="任务输入" style="edgeStyle=orthogonalEdgeStyle;jumpStyle=arc;exitX=0.5;exitY=1;entryX=0.5;entryY=0;" edge="1" parent="1" source="app" target="orch"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="550" y="340"/><mxPoint x="510" y="340"/></Array></mxGeometry></mxCell>
</root></mxGraphModel></diagram></mxfile>`
const LABEL_CLEAR_XML = LABEL_OVERLAP_XML.replace(
  '<mxGeometry relative="1" as="geometry"><Array',
  '<mxGeometry relative="1" as="geometry"><mxPoint x="0" y="-50" as="offset"/><Array',
)

const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "drawio-integrated-"))
await fs.writeFile(path.join(workspace, ".env"), [
  'DRAWIO_WEB_URL="http://127.0.0.1:18080" # local Docker editor',
  "DRAWIO_BRIDGE_HOST=127.0.0.1",
  "DRAWIO_BRIDGE_PORT=0",
  `DRAWIO_EXPORT_URL=http://127.0.0.1:${exportAddress.port}/ImageExport4/export`,
  "DRAWIO_REQUEST_TIMEOUT=60",
  "DRAWIO_MAX_INPUT_SIZE_MB=20",
  "DRAWIO_MAX_OUTPUT_SIZE_MB=100",
  "DRAWIO_UNRELATED_VALUE=must-not-load",
  "",
].join("\n"), "utf8")
const context = {
  sessionID: "integrated-session",
  messageID: "integrated-message",
  agent: "drawio-expert",
  directory: workspace,
  // OpenCode represents a non-Git directory as the global project whose
  // worktree is "/". File tools must still stay inside the session directory.
  worktree: "/",
  abort: new AbortController().signal,
  metadata() {},
  async ask() {},
}

try {
  const plugin = await DrawioExpertPlugin({ directory: workspace })
  assert.equal(process.env.DRAWIO_WEB_URL, "http://127.0.0.1:18080")
  assert.equal(process.env.DRAWIO_UNRELATED_VALUE, undefined)
  assert.equal(typeof plugin.tool.drawio_export.execute, "function")
  assert.equal(typeof plugin.tool.drawio_validate.execute, "function")
  assert.equal(typeof plugin.tool.drawio_health_check.execute, "function")
  assert.equal(typeof plugin.tool.drawio_finalize.execute, "function")
  assert.equal(typeof plugin.tool.drawio_pages.execute, "function")
  const systemOutput = { system: [] }
  await plugin["experimental.chat.system.transform"]({}, systemOutput)
  assert.match(systemOutput.system.join("\n"), /人工编辑不是只读内容/)
  assert.match(systemOutput.system.join("\n"), /最新 XML 作为修改基线/)
  const createResult = JSON.parse(await plugin.tool.drawio_create.execute({
    file: "architecture.drawio",
    title: "Integrated test",
    nodes: [{ id: "node", label: "MobileWork", kind: "application" }],
    edges: [],
    direction: "left-to-right",
    compressed: false,
    overwrite: false,
  }, context))
  assert.equal(createResult.valid, true)
  assert.equal(createResult.created, "architecture.drawio")
  assert.equal((await fs.stat(path.join(workspace, "architecture.drawio"))).isFile(), true)

  const validateResult = JSON.parse(await plugin.tool.drawio_validate.execute({
    input_path: "architecture.drawio",
  }, context))
  assert.equal(validateResult.success, true)
  assert.equal(validateResult.page_count, 1)

  const multiCreateResult = JSON.parse(await plugin.tool.drawio_create.execute({
    file: "multi-page.drawio",
    pages: [
      {
        id: "overview",
        title: "Overview",
        nodes: [{ id: "app", label: "Application", kind: "application" }],
        edges: [],
      },
      {
        id: "details",
        title: "Details",
        nodes: [
          { id: "api", label: "API", kind: "service" },
          { id: "db", label: "Database", kind: "database" },
        ],
        edges: [{ id: "api-db", source: "api", target: "db", label: "reads" }],
        direction: "top-to-bottom",
      },
    ],
    direction: "left-to-right",
    compressed: false,
    overwrite: false,
  }, context))
  assert.equal(multiCreateResult.valid, true)
  assert.equal(multiCreateResult.page_count, 2)
  assert.deepEqual(multiCreateResult.pages.map((page) => page.id), ["overview", "details"])

  const pagesList = JSON.parse(await plugin.tool.drawio_pages.execute({
    file: "multi-page.drawio",
    action: "list",
  }, context))
  assert.equal(pagesList.page_count, 2)
  assert.deepEqual(pagesList.pages.map((page) => page.name), ["Overview", "Details"])

  const pageAdd = JSON.parse(await plugin.tool.drawio_pages.execute({
    file: "multi-page.drawio",
    action: "add",
    page_id: "operations",
    title: "Operations",
    nodes: [{ id: "queue", label: "Queue", kind: "service" }],
    edges: [],
    direction: "left-to-right",
    compressed: false,
  }, context))
  assert.equal(pageAdd.valid, true)
  assert.equal(pageAdd.page_count, 3)

  const pageRename = JSON.parse(await plugin.tool.drawio_pages.execute({
    file: "multi-page.drawio",
    action: "rename",
    page: "operations",
    title: "Runbook",
  }, context))
  assert.equal(pageRename.valid, true)
  assert.equal(pageRename.pages.at(-1).name, "Runbook")

  const pageRemove = JSON.parse(await plugin.tool.drawio_pages.execute({
    file: "multi-page.drawio",
    action: "remove",
    page: "Runbook",
  }, context))
  assert.equal(pageRemove.valid, true)
  assert.equal(pageRemove.page_count, 2)

  const inspectResult = JSON.parse(await plugin.tool.drawio_inspect.execute({
    file: "architecture.drawio",
  }, context))
  assert.equal(inspectResult.valid, true)
  assert.equal(inspectResult.file, "architecture.drawio")

  const qualityResult = JSON.parse(await plugin.tool.drawio_quality.execute({
    file: "architecture.drawio",
    threshold: 0,
  }, context))
  assert.equal(qualityResult.pass, true)
  assert.equal(qualityResult.file, "architecture.drawio")

  await fs.writeFile(path.join(workspace, "nested.drawio"), NESTED_XML, "utf8")
  const nestedQuality = JSON.parse(await plugin.tool.drawio_quality.execute({
    file: "nested.drawio",
    threshold: 90,
  }, context))
  assert.equal(nestedQuality.pass, true)
  assert.equal(nestedQuality.score, 100)
  assert.equal(nestedQuality.metrics.edgeNodeIntersections, 0)

  await fs.writeFile(path.join(workspace, "nested-crossing.drawio"), NESTED_CROSSING_XML, "utf8")
  const nestedCrossingQuality = JSON.parse(await plugin.tool.drawio_quality.execute({
    file: "nested-crossing.drawio",
    threshold: 90,
  }, context))
  assert.equal(nestedCrossingQuality.metrics.edgeNodeIntersections, 1)
  assert.equal(
    nestedCrossingQuality.issues.some((issue) =>
      issue.code === "edge-through-node" && issue.cells.join(",") === "e1,blocker"),
    true,
  )

  await fs.writeFile(path.join(workspace, "label-overlap.drawio"), LABEL_OVERLAP_XML, "utf8")
  const labelOverlapQuality = JSON.parse(await plugin.tool.drawio_quality.execute({
    file: "label-overlap.drawio",
    threshold: 90,
  }, context))
  assert.equal(labelOverlapQuality.pass, false)
  assert.equal(labelOverlapQuality.metrics.labelOverlaps, 1)
  assert.equal(
    labelOverlapQuality.issues.some((issue) =>
      issue.code === "label-overlap" && issue.cells.join(",") === "e2,agentRt"),
    true,
  )

  await fs.writeFile(path.join(workspace, "label-clear.drawio"), LABEL_CLEAR_XML, "utf8")
  const labelClearQuality = JSON.parse(await plugin.tool.drawio_quality.execute({
    file: "label-clear.drawio",
    threshold: 90,
  }, context))
  assert.equal(labelClearQuality.pass, true)
  assert.equal(labelClearQuality.metrics.labelOverlaps, 0)

  const openResult = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "architecture.drawio",
  }, context))
  assert.equal(openResult.ok, true)
  assert.match(openResult.openUrl, /\/editor\?/) 
  const editorPage = await fetch(openResult.openUrl).then((response) => response.text())
  assert.match(editorPage, /127\.0\.0\.1:18080/)
  assert.match(editorPage, /baseRevision/)

  const apiUrl = new URL(openResult.openUrl)
  apiUrl.pathname = "/api/diagram"
  const initial = await fetch(apiUrl).then((response) => response.json())
  assert.equal(initial.revision, 0)

  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      operations: [{ type: "update-node", id: "node", label: "Unsafe" }],
      dry_run: false,
    }, context),
    /base_revision is required/,
  )
  await assert.rejects(
    plugin["tool.execute.before"](
      { tool: "write", sessionID: context.sessionID, callID: "write-call" },
      { args: { filePath: "architecture.drawio", content: XML } },
    ),
    /bound to an active browser session/,
  )

  const manualXml = XML.replace("MobileWork", "MobileWork Manual")
  const manualSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ xml: manualXml, baseRevision: 0, source: "editor", clientId: "browser" }),
  })
  assert.equal(manualSave.status, 200)
  assert.equal((await manualSave.json()).revision, 1)

  const state = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  assert.equal(state.revision, 1)
  assert.match(state.xml, /MobileWork Manual/)

  const stale = JSON.parse(await plugin.tool.drawio_update_state.execute({
    base_revision: 0,
    xml: manualXml.replace("MobileWork Manual", "Agent Stale"),
  }, context))
  assert.equal(stale.error, "revision_conflict")
  assert.equal(stale.current.revision, 1)
  assert.equal(stale.manualChanges.available, true)

  const concurrent = await Promise.all([
    plugin.tool.drawio_update_state.execute({
      base_revision: 1,
      xml: manualXml.replace("MobileWork Manual", "Agent A"),
    }, context).then(JSON.parse),
    plugin.tool.drawio_update_state.execute({
      base_revision: 1,
      xml: manualXml.replace("MobileWork Manual", "Agent B"),
    }, context).then(JSON.parse),
  ])
  assert.equal(concurrent.filter((result) => result.ok).length, 1)
  assert.equal(concurrent.filter((result) => result.error === "revision_conflict").length, 1)
  assert.equal(concurrent.find((result) => result.ok).revision, 2)
  const agentUpdatedState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  assert.match(agentUpdatedState.xml, /Agent [AB]/)
  assert.doesNotMatch(agentUpdatedState.xml, /MobileWork Manual/)

  const finalize = JSON.parse(await plugin.tool.drawio_finalize.execute({
    file: "architecture.drawio",
    threshold: 0,
    scale: 1,
    border: 0,
  }, context))
  assert.equal(finalize.ok, true)
  assert.equal(finalize.png.output_path, "architecture.png")
  assert.equal((await fs.readFile(path.join(workspace, "architecture.png"))).subarray(0, 8).equals(PNG.subarray(0, 8)), true)
  assert.match(finalize.openUrl, /\/editor\?/)

  const health = JSON.parse(await plugin.tool.drawio_health_check.execute({ deep: true }, context))
  assert.equal(health.success, true)
  assert.equal(health.checks.deep_test.success, true)

  console.log(JSON.stringify({
    ok: true,
    openUrl: true,
    revisionConflict: true,
    manualChanges: true,
    manualChangesRemainEditable: true,
    serializedRevisionWrites: true,
    nestedContainerQuality: true,
    genuineIntersectionDetection: true,
    edgeLabelCollisionDetection: true,
    automaticPng: true,
    browserOpenUrl: true,
    exportOwnedByTypeScript: true,
  }, null, 2))
} finally {
  const bridge = globalThis.__drawioIntegratedBridge
  if (bridge?.server) {
    for (const clients of bridge.eventClients.values()) {
      for (const response of clients) response.end()
    }
    await new Promise((resolve) => bridge.server.close(resolve))
  }
  await new Promise((resolve) => exportServer.close(resolve))
  await fs.rm(workspace, { recursive: true, force: true })
  for (const name of DRAWIO_ENVIRONMENT_KEYS) {
    if (originalEnvironment[name] === undefined) delete process.env[name]
    else process.env[name] = originalEnvironment[name]
  }
}
