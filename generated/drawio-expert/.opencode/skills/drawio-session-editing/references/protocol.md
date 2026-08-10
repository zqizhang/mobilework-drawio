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
  cells (stable ids), the user's instruction and one of three scope policies to
  the annotation endpoints below.
- The bridge binds only to loopback and requires the short-lived token returned
  by `drawio_open`.

## Annotations (review comments)

A new annotation is a single independent task tied to the bound session/file. It
records the selected stable cell ids, the page, the union bounding box (region,
computed by the bridge from the latest XML), the instruction, scope policy and
revision at submit time. Tasks persist to `<basename>.annotations.json` next to
the diagram. Scope is `selection_only`, `selection_and_edges` or
`surrounding_layout`.

```http
GET /api/annotations?sessionId=...&status=open
```

Returns `{ ok, sessionId, file, count, annotations: [...] }`. `status` may be
`open` (default), `resolved`, `stale` or `all`.

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
Approval creates a one-time token bound to the annotation, current revision,
requested scope and complete proposed stable-ID list. Formal `drawio_patch` or
`drawio_update_state` calls must pass both `annotation_id` and `approval_token`.
The runtime rejects missing, expired, reused, undeclared or out-of-scope changes.
Scope escalation requires a non-empty reason and a new approval popup.

```http
GET /api/annotations/{id}?sessionId=...
PATCH /api/annotations/{id}?sessionId=...
Content-Type: application/json

{ "status": "resolved", "summary": "改名并新增连线", "changedIds": ["node", "edge-2"] }
```

`PATCH` accepts `status` of `resolved`, `open` (reopen) or `stale`. Resolving
records `summary`, `changedIds`, `revision` and `updatedAt` in `result` without
modifying the diagram — diagram changes go through the revision protocol above.
Both Agent tools (`drawio_resolve_annotation`) and the wrapper UI can resolve.
