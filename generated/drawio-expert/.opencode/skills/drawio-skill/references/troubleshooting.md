# Troubleshooting

## Export Server

| Symptom | Action |
|---|---|
| Server unreachable or timeout | Run `drawio_health_check(deep=false)`, verify `DRAWIO_EXPORT_URL`, then inspect network reachability. |
| HTTP error | Validate the source with `drawio_validate`, inspect the server message, and simplify malformed XML before retrying. |
| Empty or wrong file type | Run `drawio_health_check(deep=true)`; the client rejects invalid PNG/JPEG/PDF magic bytes. |
| Output already exists | Choose another path or explicitly set `overwrite=true`. |
| Path rejected | Keep input and output under the selected MobileWork workspace and set `DRAWIO_WORKSPACE_ROOT` only when the runtime needs an explicit root. |
| Need SVG / editable SVG / HTML | These formats do not use the HTTP Export Server. Call `drawio_export`; on `editor_required`, immediately open the returned `openUrl` in MobileWork's built-in browser and retry so the editor renders the artifact through the Bridge. |

## Diagram quality

| Symptom | Action |
|---|---|
| XML validation fails | Repair root structure, duplicate IDs, missing parents, and dangling source/target references. |
| Shapes overlap | Run `drawio_quality`, preview `drawio_polish` with `dry_run=true`, then accept only a passing and reasonable diff. |
| Edges cross nodes | Add waypoints, increase spacing, or use `edgeports.py`; do not claim the HTTP exporter performs routing. |
| Iteration exceeds five rounds | Call `drawio_open`; when opening is required, call MobileWork's `openwork_browser_open_url` with `url=openUrl` and `provider="builtin"`, then use the revision read-merge-retry protocol. |

## Browser session

| Symptom | Action |
|---|---|
| No active session | Call `drawio_open` for the file before `drawio_get_state`. |
| `revision_conflict` | Read the current revision and XML, merge only the intended Agent change into it, then retry with that exact revision. |
| Manual edits appear missing | Stop writing, call `drawio_get_state(since_revision=...)`, and inspect the stable-ID change set. |
| Browser cannot load | Check `DRAWIO_WEB_URL`; the local bridge must remain loopback-only and the returned token must be current. |
