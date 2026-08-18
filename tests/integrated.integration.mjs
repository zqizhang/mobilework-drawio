import assert from "node:assert/strict"
import { promises as fs } from "node:fs"
import { createServer } from "node:http"
import os from "node:os"
import path from "node:path"
import { Script } from "node:vm"

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
  const systemOutput = { system: [] }
  await plugin["experimental.chat.system.transform"]({}, systemOutput)
  assert.match(systemOutput.system.join("\n"), /人工编辑不是只读内容/)
  assert.match(systemOutput.system.join("\n"), /最新 XML 作为修改基线/)
  assert.match(systemOutput.system.join("\n"), /freshness=stale/)
  assert.match(systemOutput.system.join("\n"), /requiresConfirmation=false/)
  assert.match(systemOutput.system.join("\n"), /shouldOpenBrowser=true/)
  assert.match(systemOutput.system.join("\n"), /不能只提示用户稍后继续/)
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
  assert.match(editorPage, /id="history-btn"/, "editor page must include the history entry")
  assert.match(editorPage, /版本历史/, "editor page must include the history modal")
  assert.match(editorPage, /将图表恢复为 v/, "editor page must include the restore confirmation text")
  assert.match(editorPage, /恢复会创建新版本，当前版本不会被删除/, "editor page must explain append-only restore")
  assert.match(editorPage, /重新加载最新版本/, "editor page must offer an explicit reload action on conflict")
  assert.doesNotMatch(
    editorPage,
    /return writeState\(xml, result\.current\.revision\)/,
    "browser must not blind-retry an old XML with a new revision on 409",
  )
  assert.match(editorPage, /id="conflict-overwrite"/)
  assert.match(editorPage, /id="conflict-modal"/)
  assert.match(editorPage, /id="conflict-details"/)
  assert.match(editorPage, /\.conflict-version\.user/)
  assert.match(editorPage, /\.conflict-version\.agent/)
  assert.match(editorPage, /保留我的版本并覆盖/)
  assert.match(editorPage, /已自动合并不重叠修改并保存/)
  assert.match(editorPage, /当前画布未被强制刷新/)
  assert.doesNotMatch(editorPage, /Agent 更新已加载/)

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

  const mergeLocalXml = agentUpdatedState.xml.replace(/Agent [AB]/, "Local Merge")
  const mergeRemoteXml = agentUpdatedState.xml.replace("Neighbor", "Remote Neighbor")
  const mergeRemoteSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: mergeRemoteXml,
      baseRevision: agentUpdatedState.revision,
      source: "editor",
      clientId: "remote-browser",
    }),
  })
  assert.equal(mergeRemoteSave.status, 200)
  const mergeRemoteResult = await mergeRemoteSave.json()
  const automaticMergeSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: mergeLocalXml,
      baseRevision: agentUpdatedState.revision,
      source: "editor",
      clientId: "local-browser",
    }),
  })
  assert.equal(automaticMergeSave.status, 200)
  const automaticMerge = await automaticMergeSave.json()
  assert.equal(automaticMerge.autoMerge.status, "merged")
  assert.equal(automaticMerge.revision, mergeRemoteResult.revision + 1)
  assert.equal(automaticMerge.autoMerge.localChangedKeys.includes("p1:node"), true)
  assert.equal(automaticMerge.autoMerge.remoteChangedKeys.includes("p1:neighbor"), true)
  assert.match(automaticMerge.xml, /Local Merge/)
  assert.match(automaticMerge.xml, /Remote Neighbor/)

  const fieldRemoteXml = automaticMerge.xml.replace('x="20" y="20"', 'x="35" y="20"')
  const fieldLocalXml = automaticMerge.xml.replace("Local Merge", "Field Local")
  const fieldRemoteSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: fieldRemoteXml,
      baseRevision: automaticMerge.revision,
      source: "editor",
      clientId: "remote-browser",
    }),
  })
  assert.equal(fieldRemoteSave.status, 200)
  const fieldRemoteResult = await fieldRemoteSave.json()
  const fieldMergeSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: fieldLocalXml,
      baseRevision: automaticMerge.revision,
      source: "editor",
      clientId: "local-browser",
    }),
  })
  assert.equal(fieldMergeSave.status, 200)
  const fieldMerge = await fieldMergeSave.json()
  assert.equal(fieldMerge.autoMerge.status, "merged")
  assert.equal(fieldMerge.revision, fieldRemoteResult.revision + 1)
  assert.match(fieldMerge.xml, /Field Local/)
  assert.match(fieldMerge.xml, /x="35" y="20"/)

  const overlapRemoteXml = fieldMerge.xml
    .replace("Field Local", "Remote Overlap")
    .replace("Remote Neighbor", "AI NonConflict")
  const overlapLocalXml = fieldMerge.xml
    .replace("Field Local", "Local Overlap")
    .replace('value="Remote"', 'value="User NonConflict"')
  const overlapRemoteSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: overlapRemoteXml,
      baseRevision: fieldMerge.revision,
      source: "editor",
      clientId: "remote-browser",
    }),
  })
  assert.equal(overlapRemoteSave.status, 200)
  const overlapSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: overlapLocalXml,
      baseRevision: fieldMerge.revision,
      source: "editor",
      clientId: "local-browser",
    }),
  })
  assert.equal(overlapSave.status, 409)
  const overlapConflict = await overlapSave.json()
  assert.equal(overlapConflict.merge.status, "conflict")
  assert.equal(overlapConflict.merge.conflicts.includes("p1:node"), true)
  assert.equal(overlapConflict.merge.details[0].key, "p1:node")
  assert.equal(overlapConflict.merge.details[0].user.label, "Local Overlap")
  assert.equal(overlapConflict.merge.details[0].agent.label, "Remote Overlap")
  assert.equal(overlapConflict.merge.details[0].changedFields.includes("@_value"), true)
  assert.equal(overlapConflict.merge.details[0].fields[0].path, "@_value")
  assert.match(overlapConflict.merge.userResolutionXml, /Local Overlap/)
  assert.match(overlapConflict.merge.userResolutionXml, /AI NonConflict/)
  assert.match(overlapConflict.merge.userResolutionXml, /User NonConflict/)
  assert.match(overlapConflict.merge.agentResolutionXml, /Remote Overlap/)
  assert.match(overlapConflict.merge.agentResolutionXml, /AI NonConflict/)
  assert.match(overlapConflict.merge.agentResolutionXml, /User NonConflict/)
  assert.match(overlapConflict.current.xml, /Remote Overlap/)
  assert.doesNotMatch(overlapConflict.current.xml, /Local Overlap/)

  const eventsUrl = new URL(openResult.openUrl)
  eventsUrl.pathname = "/api/events"
  const eventsResponse = await fetch(eventsUrl)
  assert.equal(eventsResponse.status, 200)

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
  assert.equal(finalize.editorConnected, true)
  assert.equal(finalize.shouldOpenBrowser, false)
  assert.match(finalize.browserAction, /Do not call browser\.open_url/)
  await eventsResponse.body.cancel()

  const health = JSON.parse(await plugin.tool.drawio_health_check.execute({ deep: true }, context))
  assert.equal(health.success, true)
  assert.equal(health.checks.deep_test.success, true)

  const annotationsUrl = new URL(finalize.openUrl)
  annotationsUrl.pathname = "/api/annotations"
  const editorHtml = await fetch(finalize.openUrl).then((response) => response.text())
  assert.match(editorHtml, /value="pending">待处理/)
  assert.match(editorHtml, /value="fresh">未完成/)
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
  assert.equal(submitted.ok, true, JSON.stringify(submitted))
  assert.equal(submitted.annotation.status, "open")
  assert.equal(submitted.annotation.freshness, "fresh")
  assert.equal(submitted.annotation.requiresConfirmation, false)
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
  assert.equal(listResult.counts.pending, 1)
  assert.equal(listResult.counts.open, 1)
  assert.equal(listResult.counts.fresh, 1)
  const freshOnly = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "fresh",
  }, context))
  assert.equal(freshOnly.count, 1)
  assert.equal(freshOnly.annotations[0].effectiveStatus, "open")

  // Simulate an explicit user task that advances the revision without touching
  // the annotated cell. Explicit work runs before activating an annotation's
  // guarded write flow; the annotation must remain fresh and executable.
  const beforeExplicitTask = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const explicitTask = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    operations: [{ type: "add-node", id: "explicit-task-node", label: "Explicit Task" }],
    dry_run: false,
    base_revision: beforeExplicitTask.revision,
  }, context))
  assert.equal(explicitTask.diff.summary.added, 1)

  const freshAfterExplicitTask = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, context))
  assert.equal(freshAfterExplicitTask.count, 1)
  assert.equal(freshAfterExplicitTask.annotations[0].id, submitted.annotation.id)
  assert.equal(freshAfterExplicitTask.annotations[0].status, "open")
  assert.equal(freshAfterExplicitTask.annotations[0].freshness, "fresh")
  assert.equal(freshAfterExplicitTask.annotations[0].requiresConfirmation, false)
  assert.ok(
    freshAfterExplicitTask.annotations[0].currentRevision
      > freshAfterExplicitTask.annotations[0].baseRevision,
  )

  const detail = JSON.parse(await plugin.tool.drawio_get_annotation.execute({
    id: submitted.annotation.id,
  }, context))
  assert.equal(detail.annotation.id, submitted.annotation.id)
  assert.equal(Array.isArray(detail.cellSnapshots), true)
  assert.equal(detail.cellSnapshots[0].id, "node")
  assert.equal(detail.cellSnapshots[0].missing, undefined)

  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      page: "wrong-page",
      annotation_id: submitted.annotation.id,
      operations: [{ type: "update-node", id: "node", label: "Wrong Page" }],
      dry_run: true,
    }, context),
    /is bound to page/,
  )

  const beforePatch = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const dryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    operations: [{ type: "update-node", id: "node", label: "Draw.io" }],
    dry_run: true,
    base_revision: beforePatch.revision,
  }, context))
  assert.equal(dryRun.dryRun, true)
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
  assert.equal(approvalRequests.length, 1)
  assert.equal(approvalRequests[0].permission, "drawio_authorize_annotation_change")
  assert.deepEqual(approvalRequests[0].metadata.proposedChangedIds, ["node"])
  assert.equal(approvalRequests[0].metadata.plan, "仅把选中节点 node 改名为 Draw.io")
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

  // Reopen a resolved annotation via the UI-toggle server path (PATCH status=open):
  // the state must revert, result/resolvedAt must clear, and no stale approval survives.
  const reopenUrl = new URL(annotationsUrl.toString())
  reopenUrl.pathname += "/" + encodeURIComponent(submitted.annotation.id)
  const reopened = await fetch(reopenUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "open" }),
  }).then((response) => response.json())
  assert.equal(reopened.ok, true)
  assert.equal(reopened.annotation.status, "open")
  assert.equal(reopened.annotation.result, null)
  assert.equal(reopened.annotation.resolvedAt, null)

  const reopenedDetail = JSON.parse(await plugin.tool.drawio_get_annotation.execute({
    file: "architecture.drawio",
    id: submitted.annotation.id,
  }, context))
  assert.equal(reopenedDetail.annotation.status, "open")
  assert.equal(reopenedDetail.annotation.resolvedAt, null, "reopen must clear the resolved timestamp")
  assert.equal(reopenedDetail.annotation.authorization, null, "reopen must not carry over a stale approval")

  const reopenedList = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, context))
  assert.equal(reopenedList.count, 1, "reopened annotation must reappear in open tasks")

  const reResolved = await fetch(reopenUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "resolved", summary: "已由用户标记为已解决" }),
  }).then((response) => response.json())
  assert.equal(reResolved.ok, true)
  assert.equal(reResolved.annotation.status, "resolved")
  assert.equal(reResolved.annotation.resolvedAt, reResolved.annotation.result.updatedAt)

  // Ignoring is a terminal, user-controlled state. It removes the task from
  // pending work, invalidates approvals across sessions, and can only continue
  // after an explicit reopen.
  const ignoredAnn = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "这条注释将被手动忽略",
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
  const ignoredStatusUrl = new URL(annotationsUrl)
  ignoredStatusUrl.pathname = `${annotationsUrl.pathname}/${encodeURIComponent(ignoredAnn.annotation.id)}`
  const ignoredResult = await fetch(ignoredStatusUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "ignored", reason: "当前不需要处理" }),
  }).then((response) => response.json())
  assert.equal(ignoredResult.annotation.status, "ignored")
  assert.equal(ignoredResult.annotation.effectiveStatus, "ignored")
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
    plugin.tool.drawio_resolve_annotation.execute({
      id: ignoredAnn.annotation.id,
      summary: "忽略后不能由 Agent 直接完成",
    }, context),
    /must be reopened before it can be resolved/,
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
    /must be reopened before processing|not active|invalidated|re-read the annotation/,
  )
  const ignoredListUrl = new URL(annotationsUrl)
  ignoredListUrl.searchParams.set("status", "ignored")
  const ignoredList = await fetch(ignoredListUrl).then((response) => response.json())
  assert.equal(ignoredList.count, 1)
  assert.equal(ignoredList.annotations[0].id, ignoredAnn.annotation.id)
  assert.equal(ignoredList.counts.ignored, 1)
  const pendingAfterIgnore = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "pending",
  }, context))
  assert.equal(pendingAfterIgnore.count, 0)
  assert.equal((await fetch(ignoredStatusUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "resolved", summary: "不能跨终态转换" }),
  })).status, 409)

  const reopenedIgnored = await fetch(ignoredStatusUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "open" }),
  }).then((response) => response.json())
  assert.equal(reopenedIgnored.annotation.status, "open")
  assert.equal(reopenedIgnored.annotation.ignoredAt, null)
  assert.equal(reopenedIgnored.annotation.ignoredReason, null)
  assert.equal(reopenedIgnored.annotation.authorization, null)
  assert.equal((await fetch(ignoredStatusUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "unknown" }),
  })).status, 400)
  const reignored = await fetch(ignoredStatusUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "ignored", reason: "保持忽略" }),
  }).then((response) => response.json())
  assert.equal(reignored.annotation.status, "ignored")

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
  const v2BeforeMigration = JSON.parse(await fs.readFile(
    path.join(workspace, "architecture.annotations.json"),
    "utf8",
  ))
  await fs.writeFile(
    path.join(workspace, "architecture.annotations.json"),
    JSON.stringify({
      schemaVersion: 2,
      file: "architecture.drawio",
      annotations: v2BeforeMigration.annotations.map((task) => ({
        ...task,
        status: task.id === globalAnn.annotation.id ? "stale" : task.status,
        sessionId: "legacy-foreign-session",
      })),
    }, null, 2),
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
  assert.equal(secondList.annotations[0].status, "open")

  await plugin.tool.drawio_get_annotation.execute({
    file: "architecture.drawio",
    id: globalAnn.annotation.id,
  }, secondContext)
  const secondState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, secondContext))
  const globalAuthorization = JSON.parse(await plugin.tool.drawio_authorize_annotation_change.execute({
    file: "architecture.drawio",
    id: globalAnn.annotation.id,
    plan: "修改第二页的 remote 节点",
    proposed_changed_ids: ["p2:remote"],
    requested_scope: "diagram_wide",
  }, secondContext))
  assert.equal(secondApprovalRequests.length, 1)
  assert.equal(secondApprovalRequests[0].metadata.file, "architecture.drawio")
  assert.equal(globalAuthorization.allowedExistingIds.includes("p2:remote"), true)

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
  assert.equal(staleDetail.annotation.status, "open")
  assert.equal(staleDetail.annotation.effectiveStatus, "stale")
  assert.equal(staleDetail.annotation.freshness, "stale")
  assert.equal(staleDetail.annotation.requiresConfirmation, true)
  assert.equal(staleDetail.annotation.stale, true)
  assert.match(staleDetail.annotation.staleReason, /changed/)

  const openWithStale = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, context))
  assert.equal(openWithStale.count, 1)
  assert.equal(openWithStale.annotations[0].id, staleAnn.annotation.id)
  assert.equal(openWithStale.annotations[0].requiresConfirmation, true)
  assert.equal(openWithStale.counts.open, 1)
  assert.equal(openWithStale.counts.stale, 1)
  assert.equal(openWithStale.counts.fresh, 0)

  const staleOnly = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "stale",
  }, context))
  assert.equal(staleOnly.count, 1)
  assert.equal(staleOnly.annotations[0].id, staleAnn.annotation.id)

  // Simulate user confirmation: re-read the latest revision, apply the stale
  // task on its bound page through the same pre-write approval guard, then
  // resolve it only after the write succeeds.
  const confirmedState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const confirmedDryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    annotation_id: staleAnn.annotation.id,
    operations: [{ type: "update-node", id: "node", label: "Draw.io Confirmed" }],
    dry_run: true,
    base_revision: confirmedState.revision,
  }, context))
  assert.equal(confirmedDryRun.dryRun, true)
  const staleAuthorization = JSON.parse(await plugin.tool.drawio_authorize_annotation_change.execute({
    id: staleAnn.annotation.id,
    plan: "用户确认后把选中节点 node 改名为 Draw.io Confirmed",
    proposed_changed_ids: ["node"],
    requested_scope: "selection_only",
  }, context))
  const confirmedPatch = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    annotation_id: staleAnn.annotation.id,
    operations: [{ type: "update-node", id: "node", label: "Draw.io Confirmed" }],
    dry_run: false,
    base_revision: confirmedState.revision,
    approval_token: staleAuthorization.approvalToken,
  }, context))
  assert.equal(confirmedPatch.diff.summary.changed, 1)

  const staleResolved = JSON.parse(await plugin.tool.drawio_resolve_annotation.execute({
    id: staleAnn.annotation.id,
    summary: "用户确认后基于最新版本完成修改",
    changed_ids: ["node"],
  }, context))
  assert.equal(staleResolved.ok, true)
  assert.equal(staleResolved.annotation.status, "resolved")
  assert.equal(staleResolved.annotation.requiresConfirmation, false)

  const finalOpenAnnotations = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, context))
  assert.equal(finalOpenAnnotations.count, 0)
  const finalStaleAnnotations = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "stale",
  }, context))
  assert.equal(finalStaleAnnotations.count, 0)
  const finalResolvedAnnotations = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "resolved",
  }, context))
  assert.equal(finalResolvedAnnotations.count, 4)
  assert.deepEqual(
    new Set(finalResolvedAnnotations.annotations.map((annotation) => annotation.id)),
    new Set([
      submitted.annotation.id,
      globalAnn.annotation.id,
      polishAnn.annotation.id,
      staleAnn.annotation.id,
    ]),
  )
  const finalIgnoredAnnotations = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "ignored",
  }, context))
  assert.equal(finalIgnoredAnnotations.count, 1)
  assert.equal(finalIgnoredAnnotations.annotations[0].id, ignoredAnn.annotation.id)

  const annotationFinalize = JSON.parse(await plugin.tool.drawio_finalize.execute({
    file: "architecture.drawio",
    threshold: 0,
    scale: 1,
    border: 0,
  }, context))
  assert.equal(annotationFinalize.ok, true)
  assert.equal(annotationFinalize.png.output_path, "architecture.png")
  assert.match(annotationFinalize.openUrl, /\/editor\?/)
  assert.deepEqual(annotationFinalize.pendingAnnotations, [])

  // The finalize gate must hard-block while a fresh (requiresConfirmation=false)
  // annotation is still open: it cannot silently finalize unfinished work.
  const blockingAnn = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "必须先行处理的门禁注释",
      scope: "selection_only",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Draw.io Confirmed" }],
    }),
  }).then((response) => response.json())
  assert.equal(blockingAnn.ok, true)
  await assert.rejects(
    () => plugin.tool.drawio_finalize.execute({
      file: "architecture.drawio",
      threshold: 0,
      scale: 1,
      border: 0,
    }, context),
    /refusing to finalize: 1 unfinished fresh annotation/,
  )

  // Handle and resolve the fresh annotation, then finalize succeeds with no pending work.
  await plugin.tool.drawio_get_annotation.execute({ id: blockingAnn.annotation.id }, context)
  const blockingState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const blockingPatchDryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    annotation_id: blockingAnn.annotation.id,
    operations: [{ type: "update-node", id: "node", label: "Draw.io Gated" }],
    dry_run: true,
    base_revision: blockingState.revision,
  }, context))
  assert.equal(blockingPatchDryRun.dryRun, true)
  const blockingApproval = JSON.parse(await plugin.tool.drawio_authorize_annotation_change.execute({
    id: blockingAnn.annotation.id,
    plan: "用户确认后把选中节点门禁注释对应的改名执行完成",
    proposed_changed_ids: ["node"],
    requested_scope: "selection_only",
  }, context))
  const blockingPatch = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    annotation_id: blockingAnn.annotation.id,
    operations: [{ type: "update-node", id: "node", label: "Draw.io Gated" }],
    dry_run: false,
    base_revision: blockingState.revision,
    approval_token: blockingApproval.approvalToken,
  }, context))
  assert.equal(blockingPatch.diff.summary.changed, 1)
  const blockingResolved = JSON.parse(await plugin.tool.drawio_resolve_annotation.execute({
    id: blockingAnn.annotation.id,
    summary: "门禁注释已处理",
    changed_ids: ["node"],
  }, context))
  assert.equal(blockingResolved.annotation.status, "resolved")
  const gateFinalize = JSON.parse(await plugin.tool.drawio_finalize.execute({
    file: "architecture.drawio",
    threshold: 0,
    scale: 1,
    border: 0,
  }, context))
  assert.equal(gateFinalize.ok, true)
  assert.equal(gateFinalize.pendingAnnotations.length, 0)

  // A stale (requiresConfirmation=true) annotation does not block finalize, but is
  // reported through pendingAnnotations so the agent asks the user before ending.
  const staleGateAnn = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "等待用户确认的过时注释",
      scope: "selection_only",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Draw.io Gated" }],
    }),
  }).then((response) => response.json())
  assert.equal(staleGateAnn.ok, true)
  const staleGateState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const staleGateExternal = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: JSON.parse(await plugin.tool.drawio_get_state.execute({}, context)).xml.replace("Draw.io Gated", "Draw.io Gated Manual"),
      baseRevision: staleGateState.revision,
      source: "editor",
      clientId: "stale-gate-test",
    }),
  })
  assert.equal(staleGateExternal.status, 200)
  const staleGateFinalize = JSON.parse(await plugin.tool.drawio_finalize.execute({
    file: "architecture.drawio",
    threshold: 0,
    scale: 1,
    border: 0,
  }, context))
  assert.equal(staleGateFinalize.ok, true)
  assert.equal(staleGateFinalize.pendingAnnotations.length, 1)
  assert.equal(staleGateFinalize.pendingAnnotations[0].id, staleGateAnn.annotation.id)
  assert.equal(staleGateFinalize.pendingAnnotations[0].requiresConfirmation, true)
  assert.equal(staleGateFinalize.pendingAnnotations[0].freshness, "stale")

  await fs.writeFile(path.join(workspace, "other.drawio"), XML, "utf8")
  const originalEventsUrl = new URL(annotationFinalize.openUrl)
  originalEventsUrl.pathname = "/api/events"
  const originalEventsResponse = await fetch(originalEventsUrl)
  assert.equal(originalEventsResponse.status, 200)
  const otherOpen = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "other.drawio",
  }, context))
  assert.equal(otherOpen.editorConnected, false)
  assert.equal(otherOpen.shouldOpenBrowser, true)

  // An editor URL is permanently bound to its diagram. After the same
  // OpenCode session switches files, the old page must not read or write the
  // newly active file through its stale token.
  const staleApiUrl = new URL(annotationFinalize.openUrl)
  staleApiUrl.pathname = "/api/diagram"
  const staleRead = await fetch(staleApiUrl)
  assert.equal(staleRead.status, 401)
  const staleWrite = await fetch(staleApiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: XML.replace("MobileWork", "Must Not Write"),
      baseRevision: 0,
      source: "editor",
    }),
  })
  assert.equal(staleWrite.status, 401)
  const otherApiUrl = new URL(otherOpen.openUrl)
  otherApiUrl.pathname = "/api/diagram"
  const otherState = await fetch(otherApiUrl).then((response) => response.json())
  assert.match(otherState.xml, /MobileWork/)
  assert.doesNotMatch(otherState.xml, /Must Not Write/)

  const reopenedOriginal = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "architecture.drawio",
  }, context))
  const resurrectedRead = await fetch(staleApiUrl)
  assert.equal(resurrectedRead.status, 401)
  const resurrectedWrite = await fetch(staleApiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: XML.replace("MobileWork", "Resurrected Token Write"),
      baseRevision: 0,
      source: "editor",
    }),
  })
  assert.equal(resurrectedWrite.status, 401)
  const reopenedApiUrl = new URL(reopenedOriginal.openUrl)
  reopenedApiUrl.pathname = "/api/diagram"
  const reopenedRead = await fetch(reopenedApiUrl)
  assert.equal(reopenedRead.status, 200)
  await originalEventsResponse.body.cancel()

  console.log(JSON.stringify({
    ok: true,
    openUrl: true,
    revisionConflict: true,
    manualChanges: true,
    manualChangesRemainEditable: true,
    serializedRevisionWrites: true,
    automaticNonOverlappingMerge: true,
    sameCellNonOverlappingFieldMerge: true,
    mixedConflictPreservesNonConflictingChanges: true,
    overlappingConflictRequiresChoice: true,
    connectedEditorIsFileScoped: true,
    staleEditorTokenRejected: true,
    staleEditorTokenCannotResurrect: true,
    autoMergeDoesNotForceReload: true,
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
    annotationFreshAutoClosure: true,
    annotationStaleConfirmationClosure: true,
    annotationPageBinding: true,
    annotationFinalizationGate: true,
    annotationScopeEnforcement: true,
    annotationDiagramWideScope: true,
    annotationSessionBoundApproval: true,
    annotationDiagramWidePolish: true,
    annotationPreWriteApproval: true,
  }, null, 2))
} finally {
  const bridge = globalThis.__drawioIntegratedBridge
  if (bridge?.server) {
    for (const clients of bridge.eventClients.values()) {
      for (const client of clients) client.response.end()
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
