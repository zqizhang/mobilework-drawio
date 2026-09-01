import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { promises as fs } from "node:fs"
import { createServer } from "node:http"
import os from "node:os"
import path from "node:path"

import { createDrawioToolset, handleDrawioOpenCodeEvent, initializeDrawioWorkspace } from "../generated/drawio-expert/.opencode/skills/drawio-expert-common/scripts/drawio-runtime-core.mjs"
import { tool } from "@opencode-ai/plugin"

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
  response.writeHead(200, { "content-type": "image/png" })
  response.end(PNG)
})
await new Promise((resolve) => exportServer.listen(0, "127.0.0.1", resolve))
const exportAddress = exportServer.address()

const BASE_XML = '<mxfile host="test"><diagram id="p1" name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="node" value="MobileWork" vertex="1" parent="1"><mxGeometry x="20" y="20" width="120" height="60" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>'

const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "drawio-history-"))
await fs.writeFile(path.join(workspace, ".env"), [
  'DRAWIO_WEB_URL="http://127.0.0.1:18080" # local Docker editor',
  "DRAWIO_BRIDGE_HOST=127.0.0.1",
  "DRAWIO_BRIDGE_PORT=0",
  `DRAWIO_EXPORT_URL=http://127.0.0.1:${exportAddress.port}/ImageExport4/export`,
  "DRAWIO_REQUEST_TIMEOUT=60",
  "DRAWIO_MAX_INPUT_SIZE_MB=20",
  "DRAWIO_MAX_OUTPUT_SIZE_MB=100",
  "",
].join("\n"), "utf8")
const context = {
  sessionID: "history-session",
  messageID: "history-message",
  agent: "drawio-expert",
  directory: workspace,
  worktree: "/",
  abort: new AbortController().signal,
  metadata() {},
  async ask(input) { approvals.push(input) },
}
const approvals = []
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let questionSequence = 0

function approveQuestion(result, ctx) {
  const requestID = `history-question-${++questionSequence}`
  const questions = result.question.arguments.questions
  assert.equal(handleDrawioOpenCodeEvent({
    type: "question.asked",
    properties: {
      id: requestID,
      sessionID: ctx.sessionID,
      questions,
      tool: { messageID: `message-${questionSequence}`, callID: `call-${questionSequence}` },
    },
  }), true)
  assert.equal(handleDrawioOpenCodeEvent({
    type: "question.replied",
    properties: { sessionID: ctx.sessionID, requestID, answers: [["确认修改"]] },
  }), true)
}

async function executeApproved(execute, args, ctx) {
  const first = JSON.parse(await execute(args, ctx))
  assert.equal(first.status, "question_required")
  approveQuestion(first, ctx)
  return JSON.parse(await execute(args, ctx))
}

function apiBase(openResult, pathname) {
  const url = new URL(openResult.openUrl)
  url.pathname = pathname
  return url.toString()
}

function revisionStatePath(relativeFile) {
  const normalized = relativeFile.split(path.sep).join("/")
  const pathHash = createHash("sha256").update(normalized, "utf8").digest("hex").slice(0, 12)
  return path.join(
    workspace,
    ".mobilework",
    "drawio-state",
    "v1",
    `${path.basename(relativeFile)}--${pathHash}`,
    "state.json",
  )
}

async function getDiagram(openResult) {
  return fetch(apiBase(openResult, "/api/diagram")).then((response) => response.json())
}

async function getHistory(openResult) {
  return fetch(apiBase(openResult, "/api/history")).then((response) => response.json())
}

async function restoreVersion(openResult, snapshotId, baseRevision, clientId = "test-client") {
  const url = new URL(apiBase(openResult, "/api/history/" + encodeURIComponent(snapshotId) + "/restore"))
  return fetch(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ baseRevision, clientId }),
  }).then(async (response) => ({ status: response.status, body: await response.json() }))
}

try {
  await initializeDrawioWorkspace(workspace)
  const plugin = { tool: createDrawioToolset(tool) }
  await fs.writeFile(path.join(workspace, "architecture.drawio"), BASE_XML, "utf8")
  const openResult = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "architecture.drawio",
  }, context))
  assert.equal(openResult.ok, true)
  const applyAgentXml = async (xml, baseRevision) => {
    const preview = JSON.parse(await plugin.tool.drawio_preview_state.execute({
      base_revision: baseRevision,
      xml,
    }, context))
    return executeApproved(plugin.tool.drawio_authorize_preview.execute, {
      file: "architecture.drawio",
      preview_id: preview.preview.id,
      plan: "history integration agent checkpoint",
    }, context)
  }

  // ---- P0-H: initial bind creates the v1 initial snapshot ----
  let history = await getHistory(openResult)
  assert.equal(history.count, 1)
  assert.equal(history.entries.length, 1)
  assert.equal(history.entries[0].source, "initial")
  assert.equal(history.entries[0].sequence, 1)
  assert.equal(history.entries[0].isCurrent, true)
  assert.ok(["pending", "ready", "failed"].includes(history.entries[0].previewState))
  assert.equal("xml" in history.entries[0], false, "list API must not leak full XML")

  // ---- editor quick saves merge into a single editor checkpoint ----
  const initialXml = (await getDiagram(openResult)).xml
  const firstEdit = initialXml.replace('value="MobileWork"', 'value="Editor Save 1"')
  const secondEdit = initialXml.replace('value="MobileWork"', 'value="Editor Save 2"')
  const put = (xml, baseRevision) => fetch(apiBase(openResult, "/api/diagram"), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ xml, baseRevision, source: "editor", clientId: "browser" }),
  })
  const firstPut = await put(firstEdit, 0)
  assert.equal(firstPut.status, 200)
  const firstRevision = (await firstPut.json()).revision
  await sleep(300)
  const secondPut = await put(secondEdit, firstRevision)
  assert.equal(secondPut.status, 200)
  await sleep(2300) // wait for the 2s debounce to fire exactly once
  history = await getHistory(openResult)
  const editorCheckpoints = history.entries.filter((entry) => entry.source === "editor")
  assert.equal(editorCheckpoints.length, 1, "quick editor saves must merge into one checkpoint")
  assert.equal(history.entries[0].source, "editor", "the editor checkpoint must be current")
  assert.equal(history.entries[0].isCurrent, true)

  // ---- agent commits create an immediate checkpoint ----
  const agentXml = BASE_XML.replace('value="MobileWork"', 'value="Agent Step"')
  const agentResult = await applyAgentXml(agentXml, history.currentRevision)
  assert.equal(agentResult.ok, true)
  history = await getHistory(openResult)
  assert.equal(history.entries.filter((entry) => entry.source === "agent").length, 1)

  // ---- identical content checkpoints are deduped ----
  const beforeDedupe = history.count
  const dedupeResult = JSON.parse(await plugin.tool.drawio_update_state.execute({
    base_revision: history.currentRevision,
    xml: agentXml,
  }, context))
  assert.equal(dedupeResult.ok, true)
  await sleep(150)
  history = await getHistory(openResult)
  assert.equal(history.count, beforeDedupe, "identical consecutive checkpoints must be deduped")

  // ---- external file change creates an external checkpoint ----
  const externalXml = BASE_XML.replace('value="MobileWork"', 'value="External Change"')
  await fs.writeFile(path.join(workspace, "architecture.drawio"), externalXml, "utf8")
  await getDiagram(openResult) // GET refresh detects the external change
  history = await getHistory(openResult)
  assert.equal(history.entries.filter((entry) => entry.source === "external").length, 1)

  // ---- retention keeps the newest 20 and never drops the current version ----
  for (let i = 0; i < 25; i += 1) {
    const state = await getDiagram(openResult)
    const stepXml = BASE_XML.replace('value="MobileWork"', `value="Step ${i}"`)
    const result = await applyAgentXml(stepXml, state.revision)
    assert.equal(result.ok, true)
  }
  history = await getHistory(openResult)
  assert.equal(history.count, 20, "history must be capped at 20 entries")
  assert.equal(history.entries.some((entry) => entry.isCurrent), true)
  const sequences = history.entries.map((entry) => entry.sequence).sort((a, b) => a - b)
  assert.deepEqual(sequences, [...Array(20).keys()].map((_, index) => sequences[0] + index))

  // ---- restore an old snapshot as an append-only new revision ----
  const restoreTarget = history.entries.find((entry) => entry.sequence === 12)
  assert.ok(restoreTarget, "an old snapshot must still be present")
  const currentRevision = history.currentRevision
  const oldCurrent = history.entries.find((entry) => entry.isCurrent)
  const oldCount = history.count
  const restored = await restoreVersion(openResult, restoreTarget.id, currentRevision)
  assert.equal(restored.status, 200)
  assert.equal(restored.body.ok, true)
  assert.equal(restored.body.revision, currentRevision + 1)
  assert.equal(restored.body.sequence, sequences[sequences.length - 1] + 1)
  assert.equal(restored.body.updatedBy, "restore")
  assert.equal(restored.body.restoredFromSnapshotId, restoreTarget.id)
  assert.equal(restored.body.restoredFromSequence, 12)

  const restoredXml = restored.body.xml
  assert.match(restoredXml, /Step 7/, "restored XML must carry the target snapshot content")
  const diagramAfterRestore = await getDiagram(openResult)
  assert.equal(diagramAfterRestore.xml, restoredXml)
  assert.equal(diagramAfterRestore.revision, currentRevision + 1)

  history = await getHistory(openResult)
  assert.equal(history.count, oldCount, "restore must not drop the previous current version")
  assert.equal(history.entries[0].source, "restore")
  assert.equal(history.entries[0].isCurrent, true)
  assert.equal(history.entries[0].restoredFromSequence, 12)
  assert.ok(history.entries.some((entry) => entry.sequence === oldCurrent.sequence), "pre-restore current version stays in history")

  // ---- stale baseRevision returns 409 and does not write ----
  const staleRestore = await restoreVersion(openResult, restoreTarget.id, currentRevision - 1)
  assert.equal(staleRestore.status, 409)
  assert.equal(staleRestore.body.error, "revision_conflict")
  assert.equal(staleRestore.body.current.revision, currentRevision + 1)
  const diagramAfter409 = await getDiagram(openResult)
  assert.equal(diagramAfter409.revision, currentRevision + 1, "409 must not write anything")
  assert.equal(diagramAfter409.xml, restoredXml)

  // ---- invalid snapshot id / page id are rejected ----
  const traversal = await fetch(apiBase(openResult, "/api/history/h_%2e%2e%2f%2e%2e%2fetc_00000000/preview") + "&pageId=p1&mode=thumb")
  assert.equal(traversal.status, 400)
  const badSnapshot = await fetch(apiBase(openResult, "/api/history/h_nope_00000000/preview") + "&pageId=p1&mode=thumb")
  assert.equal(badSnapshot.status, 404)
  const badPage = await fetch(apiBase(openResult, `/api/history/${encodeURIComponent(restoreTarget.id)}/preview`) + "&pageId=..%2f..%2fetc&mode=thumb")
  assert.equal(badPage.status, 404)
  const badMode = await fetch(apiBase(openResult, `/api/history/${encodeURIComponent(restoreTarget.id)}/preview`) + "&pageId=p1&mode=huge")
  assert.equal(badMode.status, 400)

  // ---- preview generation: cached PNG with cache headers ----
  const preview = await fetch(apiBase(openResult, `/api/history/${encodeURIComponent(restoreTarget.id)}/preview`) + "&pageId=p1&mode=thumb")
  assert.equal(preview.status, 200)
  assert.match(preview.headers.get("content-type") || "", /image\/png/)
  assert.match(preview.headers.get("cache-control") || "", /private/)
  const previewBytes = Buffer.from(await preview.arrayBuffer())
  assert.equal(previewBytes.subarray(0, 8).equals(PNG.subarray(0, 8)), true)

  // ---- damaged snapshot is rejected and the current file hash is unchanged ----
  const snapshotFile = path.join(
    workspace,
    ".mobilework",
    "drawio-history",
    "v1",
    `architecture.drawio--${createHash("sha256").update("architecture.drawio", "utf8").digest("hex").slice(0, 12)}`,
    "snapshots",
    `${restoreTarget.id}.drawio`,
  )
  await fs.writeFile(snapshotFile, "<mxfile><broken", "utf8")
  const damaged = await restoreVersion(openResult, restoreTarget.id, diagramAfter409.revision)
  assert.equal(damaged.status, 422)
  assert.equal(damaged.body.error, "snapshot_damaged")
  const diagramAfterDamage = await getDiagram(openResult)
  assert.equal(diagramAfterDamage.revision, diagramAfter409.revision, "damaged snapshot must not write")
  assert.equal(diagramAfterDamage.xml, restoredXml)
  await fs.writeFile(snapshotFile, restoredXml, "utf8")

  // ---- annotation authorization is invalidated by a restore ----
  const annotationResult = await fetch(apiBase(openResult, "/api/annotations"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "把 node 改名",
      scope: "selection_only",
      pageId: "p1",
      pageName: "Page-1",
      cells: [{ id: "node", kind: "node", label: "Step 11" }],
    }),
  }).then((response) => response.json())
  assert.equal(annotationResult.ok, true)
  const annotationId = annotationResult.annotation.id

  await plugin.tool.drawio_get_annotation.execute({ id: annotationId }, context)
  const annotationState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const annotationPreview = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    annotation_id: annotationId,
    operations: [{ type: "update-node", id: "node", label: "Pending Restore Approval" }],
    dry_run: true,
    base_revision: annotationState.revision,
  }, context))
  const authorization = await executeApproved(plugin.tool.drawio_authorize_annotation_change.execute, {
    id: annotationId,
    plan: "仅把 node 改名",
    proposed_changed_ids: ["node"],
    requested_scope: "selection_only",
    preview_id: annotationPreview.preview.id,
  }, context)
  assert.equal(authorization.ok, true)

  const nextTarget = history.entries.find((entry) => entry.sequence === 13)
  assert.ok(nextTarget)
  const restore2 = await restoreVersion(openResult, nextTarget.id, diagramAfterDamage.revision)
  assert.equal(restore2.status, 200)

  // stale token must no longer be usable
  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      annotation_id: annotationId,
      operations: [{ type: "update-node", id: "node", label: "Sneaky" }],
      dry_run: false,
      base_revision: restore2.body.revision,
      approval_token: authorization.approvalToken,
    }, context),
    /not active|has not been approved|approval/,
  )

  const detail = JSON.parse(await plugin.tool.drawio_get_annotation.execute({
    id: annotationId,
  }, context))
  assert.equal(detail.annotation.authorization, null, "restore must drop unconsumed authorization")
  assert.equal(detail.annotation.freshness, "stale", "open annotation must be recomputed stale after restore")
  assert.equal(detail.annotation.requiresConfirmation, true)

  // ---- history survives a fresh session (runtime-restart equivalent) ----
  const secondContext = { ...context, sessionID: "history-session-2" }
  const reopen = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "architecture.drawio",
  }, secondContext))
  assert.equal(reopen.ok, true)
  assert.equal(reopen.revision, restore2.body.revision, "diagram revision must survive a new session binding")
  assert.equal(reopen.revisionScope, "diagram")
  const reopenedHistory = await getHistory(reopen)
  assert.ok(reopenedHistory.count >= 20, "history must survive a new session binding")
  assert.equal(reopenedHistory.entries[0].source, "restore")
  assert.equal(reopenedHistory.entries[0].isCurrent, true)
  const reopenedDiagram = await getDiagram(reopen)
  assert.equal(reopenedDiagram.xml, restore2.body.xml, "rebound session must keep the restored content")

  // ---- same basename in different directories must not share history ----
  await fs.mkdir(path.join(workspace, "sub"), { recursive: true })
  await fs.writeFile(path.join(workspace, "sub", "architecture.drawio"), BASE_XML, "utf8")
  const thirdContext = { ...context, sessionID: "history-session-3" }
  const openSub = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "sub/architecture.drawio",
  }, thirdContext))
  const subHistory = await getHistory(openSub)
  assert.equal(subHistory.count, 1, "different relative paths must not share history")
  assert.equal(subHistory.entries[0].source, "initial")

  // ---- re-bind after an external change while runtime was "down" records a
  // rediscovered external checkpoint (hash mismatch against the last snapshot)
  const currentDisk = await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8")
  await fs.writeFile(
    path.join(workspace, "architecture.drawio"),
    currentDisk.replace('value="Step 8"', 'value="Edited While Down"'),
    "utf8",
  )
  const fourthContext = { ...context, sessionID: "history-session-4" }
  const reopenAfterChange = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "architecture.drawio",
  }, fourthContext))
  assert.equal(
    reopenAfterChange.revision,
    reopen.revision + 1,
    "an external change while the runtime is down must advance the diagram revision exactly once",
  )
  const reboundHistory = await getHistory(reopenAfterChange)
  assert.equal(reboundHistory.entries[0].source, "external", "re-bind must rediscover an external change")
  assert.equal(reboundHistory.entries[0].isCurrent, true)
  assert.equal(reboundHistory.count, 20, "rediscovery must still respect the 20-entry cap")

  const fifthContext = { ...context, sessionID: "history-session-5" }
  const reopenWithoutChange = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "architecture.drawio",
  }, fifthContext))
  assert.equal(
    reopenWithoutChange.revision,
    reopenAfterChange.revision,
    "opening the unchanged diagram again must not advance its revision",
  )

  // ---- a crash after the diagram file write but before revision finalization
  // is recovered from the durable pending transition without resetting or
  // double-incrementing the diagram revision ----
  await fs.writeFile(path.join(workspace, "recovery.drawio"), BASE_XML, "utf8")
  const recoveryContext = { ...context, sessionID: "history-session-recovery-before" }
  const recoveryOpen = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "recovery.drawio",
  }, recoveryContext))
  assert.equal(recoveryOpen.revision, 0)
  const ledgerPath = revisionStatePath("recovery.drawio")
  const ledger = JSON.parse(await fs.readFile(ledgerPath, "utf8"))
  const recoveredXml = BASE_XML.replace('value="MobileWork"', 'value="Recovered Commit"')
  const recoveredHash = createHash("sha256").update(recoveredXml, "utf8").digest("hex")
  const pendingUpdatedAt = new Date().toISOString()
  ledger.pendingTransition = {
    fromRevision: ledger.revision,
    revision: ledger.revision + 1,
    contentHash: recoveredHash,
    updatedBy: "agent",
    updatedAt: pendingUpdatedAt,
  }
  await fs.writeFile(ledgerPath, JSON.stringify(ledger, null, 2), "utf8")
  await fs.writeFile(path.join(workspace, "recovery.drawio"), recoveredXml, "utf8")
  globalThis.__drawioIntegratedBridge.sessions.delete(recoveryContext.sessionID)

  const recoveredContext = { ...context, sessionID: "history-session-recovery-after" }
  const recoveredOpen = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "recovery.drawio",
  }, recoveredContext))
  assert.equal(recoveredOpen.revision, 1)
  const recoveredDiagram = await getDiagram(recoveredOpen)
  assert.equal(recoveredDiagram.revision, 1)
  assert.match(recoveredDiagram.xml, /Recovered Commit/)
  const finalizedLedger = JSON.parse(await fs.readFile(ledgerPath, "utf8"))
  assert.equal(finalizedLedger.revision, 1)
  assert.equal(finalizedLedger.contentHash, recoveredHash)
  assert.equal(finalizedLedger.pendingTransition, null)

  // ---- sessions bound to the same file share one optimistic-concurrency
  // sequence: a commit in one session makes the other session's old base stale.
  await fs.writeFile(path.join(workspace, "shared-revision.drawio"), BASE_XML, "utf8")
  const sharedContextA = { ...context, sessionID: "history-session-shared-a" }
  const sharedContextB = { ...context, sessionID: "history-session-shared-b" }
  const sharedOpenA = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "shared-revision.drawio",
  }, sharedContextA))
  const sharedOpenB = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "shared-revision.drawio",
  }, sharedContextB))
  assert.equal(sharedOpenA.revision, sharedOpenB.revision)
  const sharedCandidate = BASE_XML.replace('value="MobileWork"', 'value="Shared Revision"')
  const sharedPreview = JSON.parse(await plugin.tool.drawio_preview_state.execute({
    base_revision: sharedOpenA.revision,
    xml: sharedCandidate,
  }, sharedContextA))
  const sharedCommit = await executeApproved(plugin.tool.drawio_authorize_preview.execute, {
    file: "shared-revision.drawio",
    preview_id: sharedPreview.preview.id,
    plan: "advance the shared diagram revision",
  }, sharedContextA)
  assert.equal(sharedCommit.ok, true)
  const sharedStateB = JSON.parse(await plugin.tool.drawio_get_state.execute({}, sharedContextB))
  assert.equal(sharedStateB.revision, sharedCommit.revision)
  assert.match(sharedStateB.xml, /Shared Revision/)
  const staleSharedPreview = JSON.parse(await plugin.tool.drawio_preview_state.execute({
    base_revision: sharedOpenB.revision,
    xml: BASE_XML.replace('value="MobileWork"', 'value="Stale Session"'),
  }, sharedContextB))
  assert.equal(staleSharedPreview.error, "revision_conflict")
  assert.equal(staleSharedPreview.current.revision, sharedCommit.revision)

  // ---- multi-page snapshots preview per page and restore the whole file ----
  const MULTI_XML = '<mxfile host="test"><diagram id="page-1" name="First"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="80" height="40" as="geometry"/></mxCell></root></mxGraphModel></diagram><diagram id="page-2" name="Second"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="b" value="B" vertex="1" parent="1"><mxGeometry x="0" y="0" width="80" height="40" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>'
  await fs.writeFile(path.join(workspace, "multi.drawio"), MULTI_XML, "utf8")
  const multiContext = { ...context, sessionID: "history-session-multi" }
  const openMulti = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "multi.drawio",
  }, multiContext))
  const multiHistory = await getHistory(openMulti)
  assert.equal(multiHistory.count, 1)
  assert.equal(multiHistory.entries[0].pages.length, 2, "multi-page snapshot must list all pages")
  for (const page of multiHistory.entries[0].pages) {
    const pagePreview = await fetch(apiBase(openMulti, `/api/history/${encodeURIComponent(multiHistory.entries[0].id)}/preview`) + `&pageId=${encodeURIComponent(page.id)}&mode=preview`)
    assert.equal(pagePreview.status, 200, `preview for page ${page.id} must succeed`)
  }
  const multiDiagram = await getDiagram(openMulti)
  assert.match(multiDiagram.xml, /id="page-2"/, "bound multi-page diagram keeps all pages")

  console.log(JSON.stringify({
    ok: true,
    initialSnapshot: true,
    editorCheckpointMerge: true,
    agentImmediateCheckpoint: true,
    checkpointDedupe: true,
    externalCheckpoint: true,
    retentionCap20: true,
    appendOnlyRestore: true,
    restoreKeepsPrevious: true,
    restoreBaseRevisionConflict409: true,
    snapshotPathTraversalRejected: true,
    previewPngCached: true,
    damagedSnapshotRejected: true,
    annotationAuthorizationInvalidated: true,
    annotationStaleAfterRestore: true,
    historySurvivesRestart: true,
    relativePathIsolation: true,
    bindRediscovery: true,
    pendingRevisionRecovery: true,
    sharedRevisionAcrossSessions: true,
    multiPagePreview: true,
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
