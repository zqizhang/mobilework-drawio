import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { promises as fs } from "node:fs"
import { createServer } from "node:http"
import os from "node:os"
import path from "node:path"
import vm from "node:vm"

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
  response.writeHead(200, { "content-type": "image/png" })
  response.end(PNG)
})
await new Promise((resolve) => exportServer.listen(0, "127.0.0.1", resolve))
const exportAddress = exportServer.address()

const BASE_XML = '<mxfile host="test"><diagram id="p1" name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="node" value="MobileWork" vertex="1" parent="1"><mxGeometry x="20" y="20" width="120" height="60" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>'

const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "drawio-history-fixes-"))
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
  sessionID: "fixes-session",
  messageID: "fixes-message",
  agent: "drawio-expert",
  directory: workspace,
  worktree: "/",
  abort: new AbortController().signal,
  metadata() {},
  async ask() {},
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function apiBase(openResult, pathname) {
  const url = new URL(openResult.openUrl)
  url.pathname = pathname
  return url.toString()
}

async function getDiagram(openResult) {
  return fetch(apiBase(openResult, "/api/diagram")).then((response) => response.json())
}

async function getHistory(openResult) {
  return fetch(apiBase(openResult, "/api/history")).then((response) => response.json())
}

async function restoreVersion(openResult, snapshotId, baseRevision) {
  const url = new URL(apiBase(openResult, "/api/history/" + encodeURIComponent(snapshotId) + "/restore"))
  return fetch(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ baseRevision, clientId: "test-client" }),
  }).then(async (response) => ({ status: response.status, body: await response.json() }))
}

async function makeSession(plugin, sessionId, file, xml) {
  await fs.writeFile(path.join(workspace, file), xml, "utf8")
  const ctx = { ...context, sessionID: sessionId }
  const open = JSON.parse(await plugin.tool.drawio_open.execute({ file }, ctx))
  assert.equal(open.ok, true)
  return { ctx, open }
}

async function agentCommit(plugin, ctx, openResult, file, label) {
  const diagram = await getDiagram(openResult)
  const xml = BASE_XML.replace('value="MobileWork"', `value="${label}"`)
  const result = JSON.parse(await plugin.tool.drawio_update_state.execute({
    base_revision: diagram.revision,
    xml,
  }, ctx))
  assert.equal(result.ok, true)
  return result
}

function historyDirectory(file) {
  return path.join(
    workspace,
    ".mobilework",
    "drawio-history",
    "v1",
    `${file}--${createHash("sha256").update(file, "utf8").digest("hex").slice(0, 12)}`,
  )
}

try {
  const plugin = await DrawioExpertPlugin({ directory: workspace })

  // =====================================================================
  // FIX-P0-1: browser save decision logic (extracted pure function tests)
  // =====================================================================
  {
    const session = await makeSession(plugin, "fix-p01", "p01.drawio", BASE_XML)
    const editorPage = await fetch(session.open.openUrl).then((response) => response.text())
    assert.match(
      editorPage,
      /message\.event === "load"[\s\S]*?confirmRestoreTargetLoaded\(message\.xml\)/,
      'the real Draw.io event:"load" acknowledgement must confirm the restore target',
    )
    const marker = editorPage.match(
      /\/\* === TESTABLE HISTORY SAVE DECISION START === \*\/([\s\S]*?)\/\* === TESTABLE HISTORY SAVE DECISION END === \*\//,
    )
    assert.ok(marker, "editor page must expose the testable save decision block")
    const sandbox = {}
    vm.runInNewContext(marker[1], sandbox)
    const decide = sandbox.decideHistoryAutosave
    const TARGET = "<mxfile><diagram><mxGraphModel/></diagram></mxfile>"
    const LATE_A = "<mxfile><diagram>old-A</diagram></mxfile>"
    const LATE_B = "<mxfile><diagram>old-B</diagram></mxfile>"

    assert.equal(
      decide("loading-restored-xml", LATE_A, TARGET),
      "drop",
      "a late pre-restore autosave must never be queued while the target loads",
    )
    assert.equal(
      decide("loading-restored-xml", LATE_B, TARGET),
      "drop",
      "a different pre-restore autosave must also be dropped",
    )
    assert.equal(
      decide("loading-restored-xml", TARGET, TARGET),
      "confirm",
      "only the restore target counts as load confirmation",
    )
    assert.equal(
      decide("loading-restored-xml", TARGET, null),
      "drop",
      "no target means nothing is confirmed",
    )
    assert.equal(
      decide("restoring", TARGET, TARGET),
      "drop",
      "saves are blocked while restoring",
    )
    assert.equal(
      decide("conflict", TARGET, TARGET),
      "drop",
      "saves are blocked in the conflict state",
    )
    assert.equal(
      decide("editing", TARGET, TARGET),
      "queue",
      "normal saves resume once the target was confirmed",
    )
    // Whitespace differences are tolerated; only content equality confirms.
    assert.equal(
      decide("loading-restored-xml", "  " + TARGET.replace(">", ">  ") + "\n", TARGET),
      "confirm",
    )
  }

  // =====================================================================
  // FIX-P0-2: partial success when the restore snapshot cannot be recorded
  // =====================================================================
  {
    const session = await makeSession(plugin, "fix-p02-xml", "p02.drawio", BASE_XML)
    await agentCommit(plugin, session.ctx, session.open, "p02.drawio", "Step 1")
    await agentCommit(plugin, session.ctx, session.open, "p02.drawio", "Step 2")
    const history = await getHistory(session.open)
    const initial = history.entries.find((entry) => entry.sequence === 1)
    const currentRevision = history.currentRevision

    globalThis.__drawioHistoryFaults = { snapshotXml: true }
    const partial = await restoreVersion(session.open, initial.id, currentRevision)
    delete globalThis.__drawioHistoryFaults
    assert.equal(partial.status, 200, "restore must not collapse into a plain 500")
    assert.equal(partial.body.ok, true)
    assert.equal(partial.body.partial, true, "must surface explicit partial success")
    assert.equal(partial.body.revision, currentRevision + 1)
    assert.equal(partial.body.updatedBy, "restore")
    assert.match(partial.body.xml, /MobileWork/, "partial success must carry the real restored XML")

    const diagramAfterPartial = await getDiagram(session.open)
    assert.equal(diagramAfterPartial.revision, currentRevision + 1, "file was restored despite history failure")
    assert.match(diagramAfterPartial.xml, /MobileWork/)

    // Next bind re-records the missing current checkpoint via hash mismatch.
    const rebind = await makeSession(plugin, "fix-p02-rebind", "p02.drawio", await fs.readFile(path.join(workspace, "p02.drawio"), "utf8"))
    const rebound = await getHistory(rebind.open)
    assert.equal(rebound.entries[0].source, "external", "re-bind must rediscover the current version after partial success")
    assert.equal(rebound.entries[0].isCurrent, true)
  }

  // =====================================================================
  // FIX-P0-2: manifest write failure also yields partial success
  // =====================================================================
  {
    const session = await makeSession(plugin, "fix-p02-manifest", "p02m.drawio", BASE_XML)
    await agentCommit(plugin, session.ctx, session.open, "p02m.drawio", "Step 1")
    await agentCommit(plugin, session.ctx, session.open, "p02m.drawio", "Step 2")
    const history = await getHistory(session.open)
    const initial = history.entries.find((entry) => entry.sequence === 1)

    globalThis.__drawioHistoryFaults = { manifest: true }
    const partial = await restoreVersion(session.open, initial.id, history.currentRevision)
    delete globalThis.__drawioHistoryFaults
    assert.equal(partial.status, 200)
    assert.equal(partial.body.partial, true, "manifest failure during restore snapshot must be partial, not 500")
    assert.equal(partial.body.revision, history.currentRevision + 1)
    assert.match(partial.body.xml, /MobileWork/)
  }

  // =====================================================================
  // FIX-P0-2: pre-restore checkpoint failure aborts before any write
  // =====================================================================
  {
    const session = await makeSession(plugin, "fix-p02-checkpoint", "p02c.drawio", BASE_XML)
    await agentCommit(plugin, session.ctx, session.open, "p02c.drawio", "Step 1")
    const history = await getHistory(session.open)
    const initial = history.entries.find((entry) => entry.sequence === 1)
    const before = await getDiagram(session.open)

    globalThis.__drawioHistoryFaults = { preRestoreCheckpoint: true }
    const failed = await restoreVersion(session.open, initial.id, history.currentRevision)
    delete globalThis.__drawioHistoryFaults
    assert.equal(failed.status, 500)
    assert.equal(failed.body.error, "current_checkpoint_failed")
    const after = await getDiagram(session.open)
    assert.equal(after.revision, before.revision, "target XML must not be written when the pre-restore checkpoint fails")
    assert.equal(after.xml, before.xml)
  }

  // =====================================================================
  // FIX-P0-3: retention cleanup only happens after the new manifest commits
  // =====================================================================
  {
    const session = await makeSession(plugin, "fix-p03", "p03.drawio", BASE_XML)
    for (let i = 1; i <= 19; i += 1) {
      await agentCommit(plugin, session.ctx, session.open, "p03.drawio", `Step ${i}`)
    }
    let history = await getHistory(session.open)
    assert.equal(history.count, 20, "history must be full at 20 entries")

    const manifestBefore = JSON.parse(
      await fs.readFile(path.join(historyDirectory("p03.drawio"), "manifest.json"), "utf8"),
    )
    assert.equal(manifestBefore.entries.length, 20)
    const filesBefore = manifestBefore.entries.map((entry) => path.join(historyDirectory("p03.drawio"), "snapshots", `${entry.id}.drawio`))
    for (const file of filesBefore) assert.equal((await fs.stat(file)).isFile(), true)

    globalThis.__drawioHistoryFaults = { manifest: true }
    const failedCommit = await agentCommit(plugin, session.ctx, session.open, "p03.drawio", "Step 20")
    delete globalThis.__drawioHistoryFaults
    assert.equal(failedCommit.ok, true, "a normal save must not fail because history recording failed")

    const manifestAfter = JSON.parse(
      await fs.readFile(path.join(historyDirectory("p03.drawio"), "manifest.json"), "utf8"),
    )
    assert.equal(manifestAfter.entries.length, 20, "manifest must not have committed an eviction")
    for (const file of filesBefore) {
      assert.equal((await fs.stat(file)).isFile(), true, "no old snapshot file may be deleted before manifest commit")
    }

    // Without the fault, the next commit succeeds and retention evicts normally.
    await agentCommit(plugin, session.ctx, session.open, "p03.drawio", "Step 21")
    history = await getHistory(session.open)
    assert.equal(history.count, 20)
  }

  // =====================================================================
  // FIX-P1-1: contentHash validation rejects a tampered-but-valid snapshot
  // =====================================================================
  {
    const session = await makeSession(plugin, "fix-p11", "p11.drawio", BASE_XML)
    await agentCommit(plugin, session.ctx, session.open, "p11.drawio", "Step 1")
    const history = await getHistory(session.open)
    const initial = history.entries.find((entry) => entry.sequence === 1)
    const snapshotFile = path.join(historyDirectory("p11.drawio"), "snapshots", `${initial.id}.drawio`)
    const before = await getDiagram(session.open)

    // Replace the snapshot with a structurally valid but different document.
    await fs.writeFile(
      snapshotFile,
      BASE_XML.replace('value="MobileWork"', 'value="Tampered"').replace('id="p1"', 'id="p9"'),
      "utf8",
    )

    const tamperedRestore = await restoreVersion(session.open, initial.id, history.currentRevision)
    assert.equal(tamperedRestore.status, 422, "tampered snapshot must be rejected as damaged")
    assert.equal(tamperedRestore.body.error, "snapshot_damaged")
    const after = await getDiagram(session.open)
    assert.equal(after.revision, before.revision, "current file must stay unchanged")
    assert.equal(after.xml, before.xml)

    const preview = await fetch(apiBase(session.open, `/api/history/${encodeURIComponent(initial.id)}/preview`) + "&pageId=p1&mode=thumb")
    assert.equal(preview.status, 503, "preview for a hash-mismatched snapshot must not be served")
    const previewBody = await preview.json()
    assert.equal(previewBody.error, "preview_unavailable")
  }

  // =====================================================================
  // Restoring the current snapshot is a no-op (UI disables it, server rejects)
  // =====================================================================
  {
    const session = await makeSession(plugin, "fix-current", "cur.drawio", BASE_XML)
    await agentCommit(plugin, session.ctx, session.open, "cur.drawio", "Step 1")
    const history = await getHistory(session.open)
    const current = history.entries.find((entry) => entry.isCurrent)
    assert.ok(current)
    const before = await getDiagram(session.open)
    const res = await restoreVersion(session.open, current.id, history.currentRevision)
    assert.equal(res.status, 400)
    assert.equal(res.body.error, "current_snapshot")
    const after = await getDiagram(session.open)
    assert.equal(after.revision, before.revision, "restoring the current snapshot must not create a revision")
  }

  // =====================================================================
  // Export Server unavailable: preview is unavailable, but restore still succeeds
  // =====================================================================
  {
    const failingServer = createServer(async (request, response) => {
      for await (const chunk of request) { void chunk }
      response.writeHead(500, { "content-type": "text/plain" })
      response.end("export unavailable")
    })
    await new Promise((resolve) => failingServer.listen(0, "127.0.0.1", resolve))
    const failingPort = failingServer.address().port
    const originalExportUrl = process.env.DRAWIO_EXPORT_URL
    process.env.DRAWIO_EXPORT_URL = `http://127.0.0.1:${failingPort}/ImageExport4/export`
    try {
      const session = await makeSession(plugin, "fix-export-down", "exp.drawio", BASE_XML)
      await agentCommit(plugin, session.ctx, session.open, "exp.drawio", "Step 1")
      const history = await getHistory(session.open)
      const initial = history.entries.find((entry) => entry.sequence === 1)
      const preview = await fetch(apiBase(session.open, `/api/history/${encodeURIComponent(initial.id)}/preview`) + "&pageId=p1&mode=thumb")
      assert.equal(preview.status, 503, "preview must report unavailability when the Export Server is unavailable")
      const restored = await restoreVersion(session.open, initial.id, history.currentRevision)
      assert.equal(restored.status, 200, "restore must succeed even when previews are unavailable")
      assert.equal(restored.body.ok, true)
      assert.equal(restored.body.revision, history.currentRevision + 1)
    } finally {
      if (originalExportUrl === undefined) delete process.env.DRAWIO_EXPORT_URL
      else process.env.DRAWIO_EXPORT_URL = originalExportUrl
      await new Promise((resolve) => failingServer.close(resolve))
    }
  }

  // =====================================================================
  // Annotation approvals are session-local and never persisted. Restore must
  // invalidate them in memory without touching the annotation sidecar.
  // =====================================================================
  {
    const session = await makeSession(plugin, "fix-ann-sidecar", "ann.drawio", BASE_XML)
    await agentCommit(plugin, session.ctx, session.open, "ann.drawio", "Step 1")
    const history = await getHistory(session.open)
    const initial = history.entries.find((entry) => entry.sequence === 1)

    const annotationResult = await fetch(apiBase(session.open, "/api/annotations"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instruction: "改名",
        scope: "selection_only",
        pageId: "p1",
        pageName: "Page-1",
        cells: [{ id: "node", kind: "node", label: "Step 1" }],
      }),
    }).then((response) => response.json())
    assert.equal(annotationResult.ok, true)
    const annotationId = annotationResult.annotation.id
    const authorization = JSON.parse(await plugin.tool.drawio_authorize_annotation_change.execute({
      id: annotationId,
      plan: "仅改名 node",
      proposed_changed_ids: ["node"],
      requested_scope: "selection_only",
    }, session.ctx))
    assert.equal(authorization.ok, true)

    globalThis.__drawioHistoryFaults = { annotationsFile: true }
    const restored = await restoreVersion(session.open, initial.id, history.currentRevision)
    delete globalThis.__drawioHistoryFaults
    assert.equal(restored.status, 200, "session-local approval invalidation must not touch the sidecar")
    assert.equal(restored.body.ok, true)
    assert.equal(restored.body.partial, undefined)
    assert.equal(restored.body.revision, history.currentRevision + 1)
    assert.equal(restored.body.annotationInvalidationWarning, null)

    const detail = JSON.parse(await plugin.tool.drawio_get_annotation.execute({
      id: annotationId,
    }, session.ctx))
    assert.equal(detail.annotation.authorization, null, "in-memory authorization must still be invalidated")
  }

  // =====================================================================
  // A history-record failure must not mark an old snapshot as "current":
  // the list reconciles the true current content, so the previous version
  // stays restorable instead of being blocked as current_snapshot.
  // =====================================================================
  {
    const session = await makeSession(plugin, "fix-current-hash", "curhash.drawio", BASE_XML)
    // Agent writes B; its history snapshot write fails (swallowed warning).
    globalThis.__drawioHistoryFaults = { manifest: true }
    const commit = await agentCommit(plugin, session.ctx, session.open, "curhash.drawio", "New B")
    delete globalThis.__drawioHistoryFaults
    assert.equal(commit.ok, true, "the save itself must succeed even if history recording fails")

    const diagram = await getDiagram(session.open)
    assert.match(diagram.xml, /New B/)

    const history = await getHistory(session.open)
    assert.equal(history.ok, true)
    const current = history.entries.find((entry) => entry.isCurrent)
    assert.ok(current, "the true current version must be marked current")
    assert.equal(current.sequence, history.entries[0].sequence, "the reconciled current must be the newest entry")
    const currentRestore = await restoreVersion(session.open, current.id, history.currentRevision)
    assert.equal(currentRestore.status, 400, "restoring the true current content stays rejected")
    assert.equal(currentRestore.body.error, "current_snapshot")

    const initial = history.entries.find((entry) => entry.sequence === 1)
    assert.notEqual(initial.id, current.id)
    const oldRestore = await restoreVersion(session.open, initial.id, history.currentRevision)
    assert.equal(oldRestore.status, 200, "an older version must remain restorable after a history-record failure")
  }

  // =====================================================================
  // A corrupted history manifest must not block opening the diagram; it is
  // quarantined, history is re-initialized, and a diagnostic is surfaced.
  // =====================================================================
  {
    await fs.writeFile(path.join(workspace, "corrupt.drawio"), BASE_XML, "utf8")
    const dir = historyDirectory("corrupt.drawio")
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, "manifest.json"), "{ not valid json !!", "utf8")
    const ctx = { ...context, sessionID: "fix-corrupt" }
    const open = JSON.parse(await plugin.tool.drawio_open.execute({ file: "corrupt.drawio" }, ctx))
    assert.equal(open.ok, true, "drawio_open must succeed even with a corrupt history manifest")

    const history = await getHistory(open)
    assert.equal(history.ok, true)
    assert.ok(history.historyWarning, "corrupt manifest must surface a diagnostic warning")
    assert.equal(history.count >= 1, true, "history must be re-initialized with a fresh checkpoint")

    const quarantined = (await fs.readdir(dir)).find((name) => name.startsWith("manifest.json.corrupt-"))
    assert.ok(quarantined, "corrupt manifest must be quarantined, not deleted silently")
    const diagram = await getDiagram(open)
    assert.equal(diagram.revision, 0, "the diagram itself is unaffected and readable")
  }

  console.log(JSON.stringify({
    ok: true,
    strictRestoreLoadConfirmation: true,
    lateAutosaveDropped: true,
    restorePartialSuccess: true,
    restorePartialManifestFailure: true,
    preRestoreCheckpointAbort: true,
    retentionManifestAtomicity: true,
    contentHashTamperRejected: true,
    currentSnapshotRestoreRejected: true,
    exportDownPreviewUnavailableRestoreOk: true,
    annotationSidecarFailureNot500: true,
    historyFailureKeepsOldRestorable: true,
    corruptManifestDoesNotBlockOpen: true,
  }, null, 2))
} finally {
  delete globalThis.__drawioHistoryFaults
  delete globalThis.__lastOpened
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
