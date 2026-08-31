# Bridge protocol

The expert runtime starts an HTTP server on a random loopback port when
`drawio_open` binds the current MobileWork session to a workspace file.

## Document

```json
{
  "sessionId": "ses_123",
  "revision": 4,
  "xml": "<mxfile>...</mxfile>",
  "updatedAt": "2026-07-29T00:00:00.000Z",
  "updatedBy": "editor",
  "clientId": null
}
```

## Read

```http
GET /api/diagram?sessionId=ses_123
```

A newly bound file starts at revision `0` with that file's current XML.

## Update

```http
PUT /api/diagram?sessionId=ses_123
Content-Type: application/json

{
  "baseRevision": 4,
  "xml": "<mxfile>...</mxfile>",
  "source": "agent"
}
```

A successful update increments the revision. A stale `baseRevision` returns
HTTP `409` with `error: revision_conflict` and the current document. Treat this
as a required read-merge-retry operation, not as a transient network retry.

For browser-originated updates (`source: editor`), the bridge first attempts a
conservative three-way merge using the base revision, local XML and current
server XML. Stable cell fields changed on only one side are merged automatically and
the successful response includes `autoMerge.status: merged`. Overlapping cell
changes, page/container changes, an unavailable base revision or an invalid
merged graph still return `409`; `merge.conflicts` identifies overlapping
`pageId:cellId` keys when available. The editor keeps its local canvas and asks
the user to choose the conflicting fields from their version or the Agent version.
Both resolution candidates already contain every non-conflicting change from
both sides, so choosing one side never replaces the whole document with stale XML.
Agent-originated updates never auto-retry or auto-merge a stale full XML.
An editor receiving an Agent/external revision event keeps its current canvas
instead of force-loading the remote XML, so an in-progress manual edit cannot
be silently discarded before Draw.io emits its next autosave.

## Events and editor

- `GET /api/events?sessionId=...` is a server-sent event stream.
  - `event: diagram` — revision updates (see Update).
  - `event: annotation` — annotation task lifecycle (`created`/`updated`), with the full annotation payload.
- `GET /editor?sessionId=...&token=...` serves the embedded Draw.io wrapper.
- The wrapper uses the official Draw.io JSON embed protocol. The wrapper adds an
  "添加注释" button that requests `{action:'export', format:'json', selection:true,
  currentPage:true, allPages:false}` from the editor, then posts the selected
  cells (stable ids), the user's instruction and one of four scope policies to
  the annotation endpoints below.
- The bridge binds only to loopback and requires the short-lived token returned
  by `drawio_open`.

## Annotations (review comments)

A new annotation is a single independent task tied to the diagram file and
accessed through the currently bound browser session. It
records the selected stable cell ids, the page, the union bounding box (region,
computed by the bridge from the latest XML), the instruction, scope policy and
diagram/cell hashes at submit time. Tasks persist to a versioned
`<basename>.annotations.json` next to the diagram and are keyed by the diagram,
not the conversation session. Scope is `selection_only`, `selection_and_edges`,
`surrounding_layout` or `diagram_wide`; the last scope covers all pages in the
current file and uses `pageId:cellId` allowlist entries.

```http
GET /api/annotations?sessionId=...&status=pending
```

Returns `{ ok, file, status, count, counts, annotations: [...] }`. `status` may
be `pending` (default), `open` (a backwards-compatible alias for pending),
`fresh`, `stale`, `resolved`, `ignored` or `all`. Stored workflow status is
`open`, `resolved` or `ignored`; `stale` is an effective status derived from the
latest diagram and the annotation's base cell hashes. Annotation payloads keep
lifecycle `status`, expose `effectiveStatus` and `freshness`, and set
`requiresConfirmation=true` for stale open tasks. The sidecar uses schema
version 3; persisted schema-v2 `stale` entries migrate to `open` and are
re-evaluated when loaded.

```http
POST /api/annotations?sessionId=...
Content-Type: application/json

{
  "instruction": "把该节点改名为 Redis 缓存层",
  "scope": "selection_only",
  "pageId": "p1",
  "pageName": "Page-1",
  "cells": [{ "id": "node", "kind": "node", "label": "MobileWork" }]
}
```

Returns `201` with `{ ok, annotation }`. The `region` and `baseRevision` are
filled in by the bridge.

Before an Agent write, it must perform a dry-run and call
`drawio_authorize_annotation_change`. Its first call returns an exact OpenCode
`question` request bound to the preview hash. The Agent must submit that request
unchanged through the built-in `question` tool. Because a custom tool cannot read
the built-in question result directly, the Agent must retry authorization with
`approval_review_id=<returned reviewId>` and
`approval_answer=<exact question answer>`. Only the explicit `确认修改` answer
creates a one-time token bound to the diagram, current session,
annotation, current revision, requested scope and complete proposed stable-ID
list. Formal `drawio_patch`, `drawio_update_state`, or diagram-wide
`drawio_polish` calls must pass both `annotation_id` and `approval_token`.
Each preview owns exactly one review. A retry with reworded plan text reuses the
original review instead of opening another question. `question_pending` never
contains another question request: it means the question is still open or the
Agent has not yet forwarded its answer. Plugin question events remain an optional
compatibility and audit path, not a requirement for authorization. This handoff
trusts the Agent to forward the returned answer faithfully; candidate safety still
comes from binding the review to session, diagram, revision, preview and hash. An
unconsumed annotation authorization returns the same token on an idempotent retry.
The runtime rejects missing, expired, reused, undeclared or out-of-scope changes.
Cancel, close, custom feedback, stale answers, or replayed answers never produce
a token. Scope escalation requires a non-empty reason and a new question review.

```http
GET /api/annotations/{id}?sessionId=...
PATCH /api/annotations/{id}?sessionId=...
Content-Type: application/json

{ "status": "resolved", "summary": "改名并新增连线", "changedIds": ["node", "edge-2"] }
```

`PATCH` accepts `status` of `resolved`, `ignored` or `open` (reopen); `stale` is
not writable. Resolving records `summary`, `changedIds`, `revision` and
`updatedAt` in `result`; ignoring records `ignoredAt` and `ignoredReason`.
Neither action modifies the diagram — diagram changes go through the revision
protocol above. Resolving or ignoring also clears active annotation state and
unused approval tokens across every session bound to the diagram. The wrapper
UI can resolve, ignore and reopen; the Agent resolves through
`drawio_resolve_annotation`.

## Version history

User-visible history is separate from the per-revision session window. A
`snapshot sequence` only advances when a meaningful checkpoint is formed; a
`session revision` advances on every successful write. Every snapshot gets a
stable `snapshot id` and restore must use that id (never an array index).

Checkpoints are stored under `<workspace>/.mobilework/drawio-history/v1/`
(durable across runtime restarts) and are created for: the first bind (`initial`),
quiet editor saves merged over a 2s debounce (`editor`), every successful Agent
commit (`agent`), external file changes (`external`) and append-only restores
(`restore`). Identical consecutive normal checkpoints are deduplicated; restore
always records a new entry. At most 20 snapshots are kept per file, newest wins.

```http
GET /api/history?sessionId=...
```

Returns `{ ok, file, currentRevision, currentSnapshotId, count, entries }`.
Entries are ordered newest-first and contain `id`, `sequence`, `createdAt`,
`source`, `isCurrent`, `restoredFromSequence`, `pages` and `previewState`.
The list response never includes the full XML.

```http
GET /api/history/{snapshotId}/preview?sessionId=...&pageId=p1&mode=thumb
GET /api/history/{snapshotId}/preview?sessionId=...&pageId=p1&mode=preview
```

Returns `image/png` (cached with `Cache-Control: private`). `mode` is
`thumb | preview`; `pageId` must belong to the snapshot. A snapshot is
immutable, so previews are generated from its stored XML without touching the
user's live editor.

```http
POST /api/history/{snapshotId}/restore?sessionId=...
Content-Type: application/json

{
  "baseRevision": 18,
  "clientId": "browser-uuid"
}
```

Restore is **append-only**: it verifies `baseRevision` inside the same per-file
write queue, persists the current checkpoint, then writes the target snapshot
XML as a new revision (`updatedBy: "restore"`) and records a new `restore`
checkpoint with `restoredFromSnapshotId`. The pre-restore current version and
the restored-from version both remain in history, so a restore can itself be
undone. A stale `baseRevision` returns `409 revision_conflict`; the client must
show the latest state and never auto-retry with a new revision.

Restoring never rewinds annotations, exported PNG/PDF files or chat records.
After a restore, all unconsumed annotation approvals are invalidated and the
active annotation is cleared: an Agent must re-read `drawio_get_annotation` and
the latest state, dry-run again, and request a fresh approval before writing.

SSE `event: history` carries `snapshot-created`, `preview-ready`,
`preview-failed` and `snapshot-evicted`; restore still broadcasts the existing
`event: diagram` so every live editor refreshes its revision.
