# Draw.io workspaces

OpenWork binds the Draw.io side panel and agent tools to the selected local workspace. The first access discovers root-level `.drawio` files and creates `.openwork/drawio-workspace.json`. If no diagram exists, OpenWork creates `.openwork/drawio/diagram.drawio`.

```text
workspace/
├─ .openwork/
│  ├─ drawio-workspace.json
│  └─ drawio/
│     ├─ diagram.drawio
│     ├─ <diagram-id>.history.ndjson
│     ├─ history/<diagram-id>/<revision>.drawio
│     └─ exports/<diagram-id>/
└─ existing-diagram.drawio
```

All sessions opened in the same workspace resolve the same `workspaceId + diagramId`. Updates use optimistic concurrency and record revision, source, session, agent, summary, timestamp, XML hash, and snapshot. Agent tools expose history, cell-level revision differences, restoration, and explicit Git checkpoints.

## Docker Draw.io

The managed editor defaults to `http://127.0.0.1:18080/`. OpenWork checks the editor on startup, starts or creates the `openwork-drawio` container when Docker is available, and periodically recovers an unhealthy container. When Docker Desktop is missing on Windows, opening the Draw.io panel offers an explicit installation prompt before running `winget`.

Environment overrides:

- `OPENWORK_DRAWIO_WEB_URL`: use an external or differently hosted Draw.io Web editor.
- `OPENWORK_DRAWIO_DOCKER_MANAGED=0`: disable container management.
- `OPENWORK_DRAWIO_DOCKER_CONTAINER`: override the container name.
- `OPENWORK_DRAWIO_DOCKER_IMAGE`: override the image (default `jgraph/drawio:latest`).
- `OPENWORK_DOCKER_EXECUTABLE`: override the Docker CLI path.
- `OPENWORK_GIT_EXECUTABLE`: override the Git executable used for checkpoints.
