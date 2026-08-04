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
- `GET /editor?sessionId=...&token=...` serves the embedded Draw.io wrapper.
- The wrapper uses the official Draw.io JSON embed protocol.
- The bridge binds only to loopback and requires the short-lived token returned
  by `drawio_open`.
