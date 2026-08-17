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
be `pending` (default, `open` + `stale`), `open`, `stale`, `resolved`, `ignored`
or `all`. Stored workflow status is `open`, `resolved` or `ignored`; `stale` is
an effective status derived from the latest diagram and the annotation's base
cell hashes. The sidecar uses schema version 3; persisted schema-v2 `stale`
entries migrate to `open` and are re-evaluated when loaded.

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

`PATCH` accepts `status` of `resolved`, `ignored` or `open` (reopen). Resolving
records `summary`, `changedIds`, `revision` and `updatedAt` in `result`; ignoring
records `ignoredAt` and `ignoredReason`. Neither action modifies the diagram —
diagram changes go through the revision protocol above. Resolving or ignoring
also clears active annotation state and unused approval tokens. The wrapper UI
can resolve, ignore and reopen; the Agent resolves through
`drawio_resolve_annotation`.
