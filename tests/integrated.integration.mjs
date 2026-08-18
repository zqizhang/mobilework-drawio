import assert from "node:assert/strict"
import { promises as fs } from "node:fs"
import { createServer } from "node:http"
import os from "node:os"
import path from "node:path"
import { Script } from "node:vm"

const runtimeModule = process.env.DRAWIO_TEST_SOURCE === "1"
  ? "../runtime/drawio-runtime.ts"
  : "../generated/drawio-expert/.opencode/plugins/drawio-runtime.js"
const { DrawioExpertPlugin } = await import(runtimeModule)

function createSseFrameReader(reader, timeoutMs = 2000) {
  const decoder = new TextDecoder()
  let text = ""
  return async function readSseFrame() {
    while (!text.includes("\n\n")) {
      let timer
      const result = await Promise.race([
        reader.read(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("timed out waiting for SSE frame")), timeoutMs)
        }),
      ]).finally(() => clearTimeout(timer))
      if (result.done) throw new Error("SSE stream ended before a complete frame")
      text += decoder.decode(result.value, { stream: true })
    }
    const boundary = text.indexOf("\n\n") + 2
    const frame = text.slice(0, boundary)
    text = text.slice(boundary)
    return frame
  }
}

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

const XML = '<mxfile host="test"><diagram id="p1" name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="node" value="MobileWork" vertex="1" parent="1"><mxGeometry x="20" y="20" width="120" height="60" as="geometry"/></mxCell><mxCell id="neighbor" value="Neighbor" vertex="1" parent="1"><mxGeometry x="300" y="20" width="120" height="60" as="geometry"/></mxCell></root></mxGraphModel></diagram><diagram id="p2" name="Page-2"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="remote" value="Remote" vertex="1" parent="1"><mxGeometry x="40" y="40" width="120" height="60" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>'
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
const approvalRequests = []
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
  async ask(input) { approvalRequests.push(input) },
}

try {
  const plugin = await DrawioExpertPlugin({ directory: workspace })
  assert.equal(process.env.DRAWIO_WEB_URL, "http://127.0.0.1:18080")
  assert.equal(process.env.DRAWIO_UNRELATED_VALUE, undefined)
  assert.equal(typeof plugin.tool.drawio_export.execute, "function")
  assert.equal(typeof plugin.tool.drawio_validate.execute, "function")
  assert.equal(typeof plugin.tool.drawio_health_check.execute, "function")
  assert.equal(typeof plugin.tool.drawio_finalize.execute, "function")
  assert.equal(typeof plugin.tool.drawio_authorize_annotation_change.execute, "function")
  assert.equal(typeof plugin.tool.drawio_authorize_preview.execute, "function")
  const systemOutput = { system: [] }
  await plugin["experimental.chat.system.transform"]({}, systemOutput)
  assert.match(systemOutput.system.join("\n"), /人工编辑不是只读内容/)
  assert.match(systemOutput.system.join("\n"), /最新 XML 作为修改基线/)
  assert.match(systemOutput.system.join("\n"), /禁止先改后问/)
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
  assert.match(editorPage, /只修改选区/)
  assert.match(editorPage, /允许调整关联连线/)
  assert.match(editorPage, /允许调整周边布局/)
  assert.match(editorPage, /允许修改整个图表/)
  assert.match(editorPage, /所有页面、节点、连线和布局/)
  assert.match(editorPage, /Agent 修改预览/)
  assert.match(editorPage, /preview_active/)
  assert.match(editorPage, /const cancelUrl = new URL\(CONFIG\.previewUrl\)/)
  assert.doesNotMatch(editorPage, /CONFIG\.previewUrl \+ "\/"/)

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

  const annotationsUrl = new URL(finalize.openUrl)
  annotationsUrl.pathname = "/api/annotations"
  const editorHtml = await fetch(finalize.openUrl).then((response) => response.text())
  assert.match(editorHtml, /value="pending">待处理/)
  assert.match(editorHtml, /value="ignored">已忽略/)
  assert.match(editorHtml, /data-status="ignored">忽略/)
  assert.match(editorHtml, /const statusUrl = new URL\(CONFIG\.annotationsUrl\)/)
  assert.match(editorHtml, /statusUrl\.pathname = statusUrl\.pathname\.endsWith/)
  assert.doesNotMatch(editorHtml, /fetch\(CONFIG\.annotationsUrl \+ "\/"/)
  const editorScripts = [...editorHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  assert.ok(editorScripts.length > 0)
  for (const [, script] of editorScripts) new Script(script)
  const liveInspect = JSON.parse(await plugin.tool.drawio_inspect.execute({
    file: "architecture.drawio",
  }, context))
  const pageId = liveInspect.pages[0].id
  const pageName = liveInspect.pages[0].name
  const submitted = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "把该节点改名为 Draw.io 并标记处理完成",
      scope: "selection_only",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Agent" }],
    }),
  }).then((response) => response.json())
  assert.equal(submitted.ok, true)
  assert.equal(submitted.annotation.status, "open")
  assert.equal(submitted.annotation.cells.length, 1)
  assert.equal(submitted.annotation.scope, "selection_only")
  assert.equal(submitted.annotation.scopeLabel, "只修改选区")
  assert.ok(submitted.annotation.region)
  assert.ok(submitted.annotation.region.width > 0)

  const listResult = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, context))
  assert.equal(listResult.count, 1)
  assert.equal(listResult.annotations[0].id, submitted.annotation.id)

  const detail = JSON.parse(await plugin.tool.drawio_get_annotation.execute({
    id: submitted.annotation.id,
  }, context))
  assert.equal(detail.annotation.id, submitted.annotation.id)
  assert.equal(Array.isArray(detail.cellSnapshots), true)
  assert.equal(detail.cellSnapshots[0].id, "node")
  assert.equal(detail.cellSnapshots[0].missing, undefined)

  const beforePatch = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const dryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    operations: [{ type: "update-node", id: "node", label: "Draw.io" }],
    dry_run: true,
    base_revision: beforePatch.revision,
  }, context))
  assert.equal(dryRun.dryRun, true)
  assert.equal(dryRun.preview.status, "pending")
  assert.equal(dryRun.preview.baseRevision, beforePatch.revision)
  assert.equal(dryRun.preview.summary.changed, 1)
  const previewUrl = new URL(finalize.openUrl)
  previewUrl.pathname = "/api/preview"
  const visiblePreview = await fetch(previewUrl).then((response) => response.json())
  assert.equal(visiblePreview.preview.id, dryRun.preview.id)
  assert.match(visiblePreview.preview.xml, /__ai_preview_layer_/)
  assert.match(visiblePreview.preview.xml, /#f59e0b/)
  assert.doesNotMatch(await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"), /__ai_preview_/)
  const previewSaveBlocked = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: beforePatch.xml,
      baseRevision: beforePatch.revision,
      source: "editor",
      clientId: "preview-write-test",
    }),
  })
  assert.equal(previewSaveBlocked.status, 409)
  assert.equal((await previewSaveBlocked.json()).error, "preview_active")
  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      operations: [{ type: "update-node", id: "node", label: "Draw.io" }],
      dry_run: false,
      base_revision: beforePatch.revision,
    }, context),
    /pre-approved approval_token|has not been approved|formal writes require/,
  )
  await assert.rejects(
    plugin.tool.drawio_authorize_annotation_change.execute({
      id: submitted.annotation.id,
      plan: "尝试扩大到关联连线",
      proposed_changed_ids: ["node"],
      requested_scope: "selection_and_edges",
    }, context),
    /requires an explicit reason/,
  )
  const authorization = JSON.parse(await plugin.tool.drawio_authorize_annotation_change.execute({
    id: submitted.annotation.id,
    plan: "仅把选中节点 node 改名为 Draw.io",
    proposed_changed_ids: ["node"],
    requested_scope: "selection_only",
  }, context))
  assert.equal(authorization.ok, true)
  assert.equal(authorization.baseRevision, beforePatch.revision)
  assert.equal(authorization.requestedScope, "selection_only")
  assert.equal(authorization.previewId, dryRun.preview.id)
  assert.equal(approvalRequests.length, 1)
  assert.equal(approvalRequests[0].permission, "drawio_authorize_annotation_change")
  assert.deepEqual(approvalRequests[0].metadata.proposedChangedIds, ["node"])
  assert.equal(approvalRequests[0].metadata.plan, "仅把选中节点 node 改名为 Draw.io")
  assert.equal(approvalRequests[0].metadata.previewId, dryRun.preview.id)
  assert.match(approvalRequests[0].patterns[0], /annotation:.*:revision-/)
  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      operations: [{ type: "update-node", id: "neighbor", label: "Out of scope" }],
      dry_run: false,
      base_revision: beforePatch.revision,
      annotation_id: submitted.annotation.id,
      approval_token: authorization.approvalToken,
    }, context),
    /not disclosed|scope violation/,
  )
  const patchResult = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    operations: [{ type: "update-node", id: "node", label: "Draw.io" }],
    dry_run: false,
    base_revision: beforePatch.revision,
    annotation_id: submitted.annotation.id,
    approval_token: authorization.approvalToken,
  }, context))
  assert.equal(patchResult.diff.summary.changed, 1)
  assert.doesNotMatch(await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"), /__ai_preview_/)
  assert.equal((await fetch(previewUrl).then((response) => response.json())).preview, null)
  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      operations: [{ type: "update-node", id: "node", label: "Draw.io Again" }],
      dry_run: false,
      base_revision: patchResult.revision,
      annotation_id: submitted.annotation.id,
      approval_token: authorization.approvalToken,
    }, context),
    /already been used|revision/,
  )

  const resolved = JSON.parse(await plugin.tool.drawio_resolve_annotation.execute({
    id: submitted.annotation.id,
    summary: "已将节点改名为 Draw.io",
    changed_ids: ["node"],
  }, context))
  assert.equal(resolved.ok, true)
  assert.equal(resolved.annotation.status, "resolved")
  assert.equal(resolved.annotation.result.changedIds.join(","), "node")

  const storedAnnotations = await fs.readFile(path.join(workspace, "architecture.annotations.json"), "utf8")
  assert.match(storedAnnotations, /architecture\/|architecture\.drawio|"file":\s*"architecture.drawio"/)
  assert.match(storedAnnotations, /已将节点改名为 Draw\.io/)
  assert.match(storedAnnotations, /"schemaVersion":\s*3/)
  assert.doesNotMatch(storedAnnotations, /"sessionId"/)
  assert.doesNotMatch(storedAnnotations, /approvalToken|"authorization"|base64url/)

  const openAfterResolve = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, context))
  assert.equal(openAfterResolve.count, 0)

  const previewEventsUrl = new URL(openResult.openUrl)
  previewEventsUrl.pathname = "/api/events"
  const previewEventsResponse = await fetch(previewEventsUrl)
  assert.equal(previewEventsResponse.status, 200)
  const previewEventsReader = previewEventsResponse.body.getReader()
  const nextPreviewEvent = createSseFrameReader(previewEventsReader)
  assert.match(await nextPreviewEvent(), /^: connected/)

  const generalPreviewDryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    operations: [{ type: "update-node", id: "neighbor", label: "Neighbor Preview" }],
    dry_run: true,
    base_revision: patchResult.revision,
  }, context))
  const createdPreviewEvent = await nextPreviewEvent()
  assert.match(createdPreviewEvent, /^event: preview\ndata: /)
  assert.match(createdPreviewEvent, /"kind":"created"/)
  const previewApprovalRequests = []
  const previewContext = {
    ...context,
    async ask(input) { previewApprovalRequests.push(input) },
  }
  const generalPreviewAuthorization = JSON.parse(await plugin.tool.drawio_authorize_preview.execute({
    file: "architecture.drawio",
    preview_id: generalPreviewDryRun.preview.id,
    plan: "将 Neighbor 节点改名为 Neighbor Preview",
  }, previewContext))
  assert.equal(previewApprovalRequests.length, 1)
  assert.equal(previewApprovalRequests[0].permission, "drawio_authorize_preview")
  assert.equal(generalPreviewAuthorization.applied, true)
  assert.equal(generalPreviewAuthorization.preview.status, "applied")
  assert.equal(generalPreviewAuthorization.revision, patchResult.revision + 1)
  const authorizedPreviewEvent = await nextPreviewEvent()
  assert.match(authorizedPreviewEvent, /"kind":"authorized"/)
  const appliedPreviewEvent = await nextPreviewEvent()
  assert.match(appliedPreviewEvent, /"kind":"applied"/)
  assert.match(await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"), /Neighbor Preview/)
  assert.equal((await fetch(previewUrl).then((response) => response.json())).preview, null)

  const cancelPreviewDryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    operations: [{ type: "update-node", id: "neighbor", label: "Cancelled Candidate" }],
    dry_run: true,
    base_revision: generalPreviewAuthorization.revision,
  }, context))
  const revisionEvent = await nextPreviewEvent()
  assert.match(revisionEvent, /^event: diagram\ndata: /)
  const secondCreatedPreviewEvent = await nextPreviewEvent()
  assert.match(secondCreatedPreviewEvent, /"kind":"created"/)
  const cancelPreviewUrl = new URL(previewUrl)
  cancelPreviewUrl.pathname = `/api/preview/${encodeURIComponent(cancelPreviewDryRun.preview.id)}`
  const cancelledPreview = await fetch(cancelPreviewUrl, { method: "DELETE" }).then((response) => response.json())
  assert.equal(cancelledPreview.preview.status, "cancelled")
  const cancelledPreviewEvent = await nextPreviewEvent()
  assert.match(cancelledPreviewEvent, /"kind":"cancelled"/)
  await previewEventsReader.cancel()
  assert.doesNotMatch(await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"), /Cancelled Candidate/)

  const ignoredAnn = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "这条批注将被手动忽略",
      scope: "selection_only",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Draw.io" }],
    }),
  }).then((response) => response.json())
  await plugin.tool.drawio_get_annotation.execute({ id: ignoredAnn.annotation.id }, context)
  const ignoredBase = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const ignoredAuthorization = JSON.parse(await plugin.tool.drawio_authorize_annotation_change.execute({
    id: ignoredAnn.annotation.id,
    plan: "准备修改后由用户决定忽略",
    proposed_changed_ids: ["node"],
    requested_scope: "selection_only",
  }, context))
  const ignoredResult = await fetch(new URL(
    `/api/annotations/${encodeURIComponent(ignoredAnn.annotation.id)}${annotationsUrl.search}`,
    annotationsUrl,
  ), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "ignored", reason: "当前不需要处理" }),
  }).then((response) => response.json())
  assert.equal(ignoredResult.annotation.status, "ignored")
  assert.equal(ignoredResult.annotation.ignoredReason, "当前不需要处理")
  assert.ok(ignoredResult.annotation.ignoredAt)
  await assert.rejects(
    plugin.tool.drawio_authorize_annotation_change.execute({
      id: ignoredAnn.annotation.id,
      plan: "忽略后不应再授权",
      proposed_changed_ids: ["node"],
      requested_scope: "selection_only",
    }, context),
    /must be reopened before authorization/,
  )
  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      operations: [{ type: "update-node", id: "node", label: "Should Not Apply" }],
      dry_run: false,
      base_revision: ignoredBase.revision,
      annotation_id: ignoredAnn.annotation.id,
      approval_token: ignoredAuthorization.approvalToken,
    }, context),
    /no longer active|reopen the annotation/,
  )
  const ignoredListUrl = new URL(annotationsUrl)
  ignoredListUrl.searchParams.set("status", "ignored")
  const ignoredList = await fetch(ignoredListUrl).then((response) => response.json())
  assert.equal(ignoredList.count, 1)
  assert.equal(ignoredList.annotations[0].id, ignoredAnn.annotation.id)
  assert.equal(ignoredList.counts.ignored, 1)
  const reopenedResult = await fetch(new URL(
    `/api/annotations/${encodeURIComponent(ignoredAnn.annotation.id)}${annotationsUrl.search}`,
    annotationsUrl,
  ), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "open" }),
  }).then((response) => response.json())
  assert.equal(reopenedResult.annotation.status, "open")
  assert.equal(reopenedResult.annotation.ignoredAt, null)
  await fetch(new URL(
    `/api/annotations/${encodeURIComponent(ignoredAnn.annotation.id)}${annotationsUrl.search}`,
    annotationsUrl,
  ), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "ignored", reason: "保持忽略" }),
  })

  const invalidStatusUrl = new URL(annotationsUrl)
  invalidStatusUrl.searchParams.set("status", "unknown")
  assert.equal((await fetch(invalidStatusUrl)).status, 400)

  const globalAnn = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "把第二页的 Remote 节点改名为 Global Remote",
      scope: "diagram_wide",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Draw.io" }],
    }),
  }).then((response) => response.json())
  assert.equal(globalAnn.annotation.scope, "diagram_wide")
  assert.equal(globalAnn.annotation.scopeLabel, "允许修改整个图表")

  // Simulate a fresh conversation/process cache: annotations must reload from
  // the diagram sidecar even though its legacy creator session differs.
  const v3BeforeMigration = JSON.parse(await fs.readFile(
    path.join(workspace, "architecture.annotations.json"),
    "utf8",
  ))
  await fs.writeFile(
    path.join(workspace, "architecture.annotations.json"),
    JSON.stringify(v3BeforeMigration.annotations.map((task) => ({
      ...task,
      status: task.id === globalAnn.annotation.id ? "stale" : task.status,
      sessionId: "legacy-foreign-session",
    })), null, 2),
    "utf8",
  )
  globalThis.__drawioIntegratedBridge.annotationsByDiagram.clear()
  const secondApprovalRequests = []
  const secondContext = {
    ...context,
    sessionID: "integrated-session-2",
    messageID: "integrated-message-2",
    async ask(input) { secondApprovalRequests.push(input) },
  }
  const secondOpen = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "architecture.drawio",
  }, secondContext))
  assert.equal(secondOpen.ok, true)
  const secondList = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, secondContext))
  assert.equal(secondList.count, 1)
  assert.equal(secondList.annotations[0].id, globalAnn.annotation.id)

  await plugin.tool.drawio_get_annotation.execute({
    file: "architecture.drawio",
    id: globalAnn.annotation.id,
  }, secondContext)
  const secondState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, secondContext))
  const globalDryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    page: "p2",
    operations: [{ type: "update-node", id: "remote", label: "Global Remote" }],
    dry_run: true,
    base_revision: secondState.revision,
  }, secondContext))
  assert.equal(globalDryRun.preview.status, "pending")
  const globalAuthorization = JSON.parse(await plugin.tool.drawio_authorize_annotation_change.execute({
    file: "architecture.drawio",
    id: globalAnn.annotation.id,
    plan: "修改第二页的 remote 节点",
    proposed_changed_ids: ["p2:remote"],
    requested_scope: "diagram_wide",
  }, secondContext))
  assert.equal(secondApprovalRequests.length, 1)
  assert.equal(secondApprovalRequests[0].metadata.file, "architecture.drawio")
  assert.equal(globalAuthorization.previewId, globalDryRun.preview.id)
  assert.deepEqual(globalAuthorization.allowedExistingIds.includes("p2:remote"), true)

  await plugin.tool.drawio_get_annotation.execute({
    file: "architecture.drawio",
    id: globalAnn.annotation.id,
  }, context)
  const firstState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      page: "p2",
      operations: [{ type: "update-node", id: "remote", label: "Cross-session token" }],
      dry_run: false,
      base_revision: firstState.revision,
      annotation_id: globalAnn.annotation.id,
      approval_token: globalAuthorization.approvalToken,
    }, context),
    /has not been approved|different diagram session/,
  )

  const globalPatch = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    page: "p2",
    operations: [{ type: "update-node", id: "remote", label: "Global Remote" }],
    dry_run: false,
    base_revision: secondState.revision,
    annotation_id: globalAnn.annotation.id,
    approval_token: globalAuthorization.approvalToken,
  }, secondContext))
  assert.deepEqual(globalPatch.changedIds, ["remote"])
  await plugin.tool.drawio_resolve_annotation.execute({
    file: "architecture.drawio",
    id: globalAnn.annotation.id,
    summary: "已修改第二页节点",
    changed_ids: ["p2:remote"],
  }, secondContext)
  const migratedStore = await fs.readFile(path.join(workspace, "architecture.annotations.json"), "utf8")
  assert.match(migratedStore, /"schemaVersion":\s*3/)
  assert.doesNotMatch(migratedStore, /legacy-foreign-session|"sessionId"/)

  const polishAnn = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "重新整理第一页的整体布局",
      scope: "diagram_wide",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Draw.io" }],
    }),
  }).then((response) => response.json())
  await plugin.tool.drawio_get_annotation.execute({ id: polishAnn.annotation.id }, context)
  const beforePolish = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const polishDryRun = JSON.parse(await plugin.tool.drawio_polish.execute({
    file: "architecture.drawio",
    page: "p1",
    direction: "top-to-bottom",
    threshold: 0,
    dry_run: true,
    base_revision: beforePolish.revision,
  }, context))
  assert.ok(polishDryRun.changedIds.length > 0)
  const polishAuthorization = JSON.parse(await plugin.tool.drawio_authorize_annotation_change.execute({
    id: polishAnn.annotation.id,
    plan: "重新布局第一页中的全部节点和连线",
    proposed_changed_ids: polishDryRun.changedIds.map((id) => `p1:${id}`),
    requested_scope: "diagram_wide",
  }, context))
  const polished = JSON.parse(await plugin.tool.drawio_polish.execute({
    file: "architecture.drawio",
    page: "p1",
    direction: "top-to-bottom",
    threshold: 0,
    dry_run: false,
    base_revision: beforePolish.revision,
    annotation_id: polishAnn.annotation.id,
    approval_token: polishAuthorization.approvalToken,
  }, context))
  assert.equal(polished.accepted, true)
  await plugin.tool.drawio_resolve_annotation.execute({
    id: polishAnn.annotation.id,
    summary: "已重新整理第一页布局",
    changed_ids: polishDryRun.changedIds.map((id) => `p1:${id}`),
  }, context)

  const beforeStalePreview = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const stalePreviewDryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    operations: [{ type: "update-node", id: "neighbor", label: "Stale Preview" }],
    dry_run: true,
    base_revision: beforeStalePreview.revision,
  }, context))
  await fs.writeFile(
    path.join(workspace, "architecture.drawio"),
    beforeStalePreview.xml.replace("Global Remote", "Global Remote External"),
    "utf8",
  )
  const afterExternalPreviewChange = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  assert.ok(afterExternalPreviewChange.revision > beforeStalePreview.revision)
  const stalePreviewResult = await fetch(previewUrl).then((response) => response.json())
  assert.equal(stalePreviewResult.preview.id, stalePreviewDryRun.preview.id)
  assert.equal(stalePreviewResult.preview.status, "stale")
  assert.match(stalePreviewResult.preview.statusReason, /revision|更新/)
  assert.doesNotMatch(await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"), /__ai_preview_/)

  const staleAnn = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "检查陈旧标记",
      scope: "surrounding_layout",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Draw.io" }],
    }),
  }).then((response) => response.json())
  const staleRevision = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context)).revision
  const externalChange = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: JSON.parse(await plugin.tool.drawio_get_state.execute({}, context)).xml.replace("Draw.io", "Draw.io Updated"),
      baseRevision: staleRevision,
      source: "editor",
      clientId: "stale-test",
    }),
  })
  assert.equal(externalChange.status, 200)
  const staleDetail = JSON.parse(await plugin.tool.drawio_get_annotation.execute({
    id: staleAnn.annotation.id,
  }, context))
  assert.equal(staleDetail.annotation.stale, true)
  assert.equal(staleDetail.annotation.status, "stale")
  assert.match(staleDetail.annotation.staleReason, /changed/)

  const staleListUrl = new URL(annotationsUrl)
  staleListUrl.searchParams.set("status", "stale")
  const staleList = await fetch(staleListUrl).then((response) => response.json())
  assert.ok(staleList.annotations.some((task) => task.id === staleAnn.annotation.id))
  const pendingList = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "pending",
  }, context))
  assert.ok(pendingList.annotations.some((task) => task.id === staleAnn.annotation.id))
  assert.ok(pendingList.counts.stale >= 1)
  const ignoredAgentList = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "ignored",
  }, context))
  assert.ok(ignoredAgentList.annotations.some((task) => task.id === ignoredAnn.annotation.id))

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
    annotationLifecycle: true,
    annotationRegionComputation: true,
    annotationPersistence: true,
    annotationDiagramBinding: true,
    annotationStalenessDetection: true,
    annotationScopeEnforcement: true,
    annotationDiagramWideScope: true,
    annotationSessionBoundApproval: true,
    annotationDiagramWidePolish: true,
    annotationPreWriteApproval: true,
    annotationStatusFiltering: true,
    annotationIgnoreAndReopen: true,
    annotationBrowserStatusUrl: true,
    annotationTerminalAuthorizationRevocation: true,
    patchPreviewCanvas: true,
    patchPreviewReadOnlyGuard: true,
    patchPreviewExactCandidateApproval: true,
    patchPreviewCancelWithoutWrite: true,
    patchPreviewRevisionInvalidation: true,
    patchPreviewBrowserActions: true,
    integratedEventStream: true,
    patchPreviewOneClickApply: true,
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
