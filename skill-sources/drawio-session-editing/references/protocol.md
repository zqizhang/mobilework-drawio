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
GET /api/annotations?sessionId=...&status=open
```

Returns `{ ok, file, count, annotations: [...] }`. `status` may be
`open` (all unfinished tasks, including stale ones), `resolved`, `stale`
(unfinished tasks whose selected cells changed) or `all`. Annotation payloads
keep lifecycle `status` as `open`/`resolved` and expose `freshness` as
`fresh`/`stale`; stale open tasks also set `requiresConfirmation=true` and must
be confirmed by the user before execution.

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
`drawio_authorize_annotation_change`. That custom tool is configured with
OpenCode permission `ask`, so the host shows an approval popup before execution.
Approval creates a one-time token bound to the diagram, current session,
annotation, current revision, requested scope and complete proposed stable-ID
list. Formal `drawio_patch`, `drawio_update_state`, or diagram-wide
`drawio_polish` calls must pass both `annotation_id` and `approval_token`.
The runtime rejects missing, expired, reused, undeclared or out-of-scope changes.
Scope escalation requires a non-empty reason and a new approval popup.

```http
GET /api/annotations/{id}?sessionId=...
PATCH /api/annotations/{id}?sessionId=...
Content-Type: application/json

{ "status": "resolved", "summary": "改名并新增连线", "changedIds": ["node", "edge-2"] }
```

`PATCH` accepts `status` of `resolved`, `open` (reopen) or legacy `stale`.
Regardless of stored legacy state, API payloads expose stale unfinished tasks as
`status=open, freshness=stale`. Resolving
records `summary`, `changedIds`, `revision` and `updatedAt` in `result` without
modifying the diagram — diagram changes go through the revision protocol above.
Both Agent tools (`drawio_resolve_annotation`) and the wrapper UI can resolve.

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
