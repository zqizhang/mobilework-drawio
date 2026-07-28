import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BODY_BYTES = 10 * 1024 * 1024;
const EMPTY_DRAWIO_XML = [
  '<mxfile host="OpenWork">',
  '  <diagram id="openwork" name="Page-1">',
  '    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">',
  '      <root>',
  '        <mxCell id="0" />',
  '        <mxCell id="1" parent="0" />',
  '      </root>',
  '    </mxGraphModel>',
  '  </diagram>',
  '</mxfile>',
].join("");

function jsonResponse(response, status, payload) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function bridgePage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Draw.io — OpenWork</title>
    <style>
      html, body, iframe { width: 100%; height: 100%; margin: 0; border: 0; overflow: hidden; }
      body { background: #f8fafc; font: 13px system-ui, sans-serif; }
      #status { position: fixed; z-index: 2; left: 12px; bottom: 10px; max-width: calc(100% - 24px);
        padding: 6px 9px; border-radius: 8px; background: rgba(15, 23, 42, .88); color: white;
        opacity: 0; pointer-events: none; transition: opacity .15s; }
      #status.visible { opacity: 1; }
    </style>
  </head>
  <body>
    <iframe id="editor" title="Draw.io editor"></iframe>
    <div id="status" role="status"></div>
    <script>
      (() => {
        const params = new URLSearchParams(location.search);
        const sessionId = params.get("sessionId");
        const clientId = crypto.randomUUID();
        const editorOrigin = "https://embed.diagrams.net";
        const editor = document.getElementById("editor");
        const status = document.getElementById("status");
        let current = null;
        let saveChain = Promise.resolve();
        let externalTimer = null;

        function showStatus(message, duration = 2400) {
          status.textContent = message;
          status.classList.add("visible");
          clearTimeout(showStatus.timer);
          showStatus.timer = setTimeout(() => status.classList.remove("visible"), duration);
        }

        function editorMessage(payload) {
          editor.contentWindow?.postMessage(JSON.stringify(payload), editorOrigin);
        }

        async function readLatest() {
          // loopback-fetch: the bridge page and diagram API share the managed 127.0.0.1 origin.
          const response = await fetch("/api/diagram?sessionId=" + encodeURIComponent(sessionId), {
            cache: "no-store",
          });
          if (!response.ok) throw new Error("Unable to read the diagram state.");
          return response.json();
        }

        async function writeState(xml, baseRevision) {
          // loopback-fetch: manual edits persist to the managed 127.0.0.1 bridge only.
          const response = await fetch("/api/diagram?sessionId=" + encodeURIComponent(sessionId), {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ xml, baseRevision, source: "editor", clientId }),
          });
          const result = await response.json();
          if (response.status === 409) {
            // A manual edit always wins a simultaneous race with an agent update.
            return writeState(xml, result.current.revision);
          }
          if (!response.ok) throw new Error(result.error || "Unable to save the diagram.");
          return result;
        }

        function queueSave(xml) {
          saveChain = saveChain.then(async () => {
            if (typeof xml !== "string" || xml === current?.xml) return;
            current = await writeState(xml, current?.revision ?? 0);
            showStatus("Saved revision " + current.revision, 1000);
          }).catch((error) => showStatus(error.message, 5000));
        }

        async function applyExternalRevision(revision) {
          await saveChain;
          if (revision <= (current?.revision ?? 0)) return;
          const latest = await readLatest();
          if (latest.revision <= (current?.revision ?? 0)) return;
          current = latest;
          editorMessage({
            action: "load",
            xml: latest.xml,
            autosave: 1,
            diffSync: true,
            title: "OpenWork Draw.io",
          });
          showStatus("Agent update loaded · revision " + latest.revision);
        }

        if (!sessionId) {
          showStatus("No OpenWork session selected.", 60_000);
          return;
        }

        editor.src = editorOrigin
          + "/?embed=1&proto=json&configure=1&spin=1&libraries=1"
          + "&saveAndExit=0&noExitBtn=1&suppressNewWindows=1";

        window.addEventListener("message", async (event) => {
          if (event.origin !== editorOrigin || event.source !== editor.contentWindow) return;
          let message;
          try {
            message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          } catch {
            return;
          }

          if (message.event === "configure") {
            editorMessage({
              action: "configure",
              config: { autosaveDelay: 250, preserveViewState: true, useInternalClipboard: true },
            });
            return;
          }
          if (message.event === "init") {
            try {
              current = await readLatest();
              editorMessage({
                action: "load",
                xml: current.xml,
                autosave: 1,
                diffSync: true,
                title: "OpenWork Draw.io",
              });
            } catch (error) {
              showStatus(error.message, 5000);
            }
            return;
          }
          if (message.event === "autosave" || message.event === "save") {
            queueSave(message.xml);
          }
        });

        const events = new EventSource("/api/events?sessionId=" + encodeURIComponent(sessionId));
        events.addEventListener("diagram", (event) => {
          const update = JSON.parse(event.data);
          if (update.clientId === clientId || update.revision <= (current?.revision ?? 0)) return;
          clearTimeout(externalTimer);
          externalTimer = setTimeout(() => {
            void applyExternalRevision(update.revision).catch((error) => showStatus(error.message, 5000));
          }, 400);
        });
        events.onerror = () => showStatus("Reconnecting to the OpenWork diagram bridge…");
      })();
    </script>
  </body>
</html>`;
}

function validateSessionId(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 512
    ? value
    : null;
}

function validateXml(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_BODY_BYTES) return null;
  const trimmed = value.trim();
  return /^<(mxfile|mxGraphModel)(\s|>)/.test(trimmed) ? trimmed : null;
}

async function requestJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function documentFileName(sessionId) {
  return `${createHash("sha256").update(sessionId).digest("hex")}.json`;
}

function emptyDocument(sessionId) {
  return {
    sessionId,
    revision: 0,
    xml: EMPTY_DRAWIO_XML,
    updatedAt: null,
    updatedBy: null,
    clientId: null,
  };
}

/**
 * @param {{ storageDir: string; host?: string; port?: number }} options
 */
export function createDrawioBridge({
  storageDir,
  host = "127.0.0.1",
  port = 0,
}) {
  if (!storageDir) throw new Error("Draw.io bridge storageDir is required.");

  const queues = new Map();
  const eventClients = new Map();
  let server = null;
  let state = null;

  async function readDocument(sessionId) {
    const file = path.join(storageDir, documentFileName(sessionId));
    try {
      const stored = JSON.parse(await readFile(file, "utf8"));
      return stored.sessionId === sessionId ? stored : emptyDocument(sessionId);
    } catch (error) {
      if (error?.code === "ENOENT") return emptyDocument(sessionId);
      throw error;
    }
  }

  async function updateDocument(sessionId, input) {
    const previous = queues.get(sessionId) ?? Promise.resolve();
    const operation = previous.catch(() => undefined).then(async () => {
      const current = await readDocument(sessionId);
      if (!Number.isInteger(input.baseRevision) || input.baseRevision !== current.revision) {
        return { conflict: true, current };
      }
      const xml = validateXml(input.xml);
      if (!xml) {
        return { invalid: true, error: "Expected valid draw.io XML rooted at mxfile or mxGraphModel." };
      }
      const next = {
        sessionId,
        revision: current.revision + 1,
        xml,
        updatedAt: new Date().toISOString(),
        updatedBy: input.source === "editor" ? "editor" : "agent",
        clientId: typeof input.clientId === "string" ? input.clientId : null,
      };
      await mkdir(storageDir, { recursive: true });
      const file = path.join(storageDir, documentFileName(sessionId));
      const temporary = `${file}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(next), "utf8");
      await rename(temporary, file);
      broadcast(sessionId, next);
      return { document: next };
    });
    queues.set(sessionId, operation);
    void operation.then(
      () => {
        if (queues.get(sessionId) === operation) queues.delete(sessionId);
      },
      () => {
        if (queues.get(sessionId) === operation) queues.delete(sessionId);
      },
    );
    return operation;
  }

  function broadcast(sessionId, document) {
    const payload = `event: diagram\ndata: ${JSON.stringify({
      revision: document.revision,
      updatedAt: document.updatedAt,
      updatedBy: document.updatedBy,
      clientId: document.clientId,
    })}\n\n`;
    for (const response of eventClients.get(sessionId) ?? []) {
      response.write(payload);
    }
  }

  async function handleRequest(request, response) {
    const requestUrl = new URL(request.url ?? "/", `http://${host}`);
    if (request.method === "GET" && requestUrl.pathname === "/") {
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-security-policy": "default-src 'self'; frame-src https://embed.diagrams.net; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
        "content-type": "text/html; charset=utf-8",
      });
      response.end(bridgePage());
      return;
    }
    if (request.method === "GET" && requestUrl.pathname === "/health") {
      jsonResponse(response, 200, { ok: true, service: "openwork-drawio-bridge" });
      return;
    }

    const sessionId = validateSessionId(requestUrl.searchParams.get("sessionId"));
    if (!sessionId) {
      jsonResponse(response, 400, { ok: false, error: "A valid sessionId is required." });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/diagram") {
      jsonResponse(response, 200, await readDocument(sessionId));
      return;
    }
    if (request.method === "PUT" && requestUrl.pathname === "/api/diagram") {
      let input;
      try {
        input = await requestJson(request);
      } catch (error) {
        jsonResponse(response, 400, { ok: false, error: error.message });
        return;
      }
      const result = await updateDocument(sessionId, input);
      if (result.conflict) {
        jsonResponse(response, 409, { ok: false, error: "revision_conflict", current: result.current });
        return;
      }
      if (result.invalid) {
        jsonResponse(response, 400, { ok: false, error: result.error });
        return;
      }
      jsonResponse(response, 200, result.document);
      return;
    }
    if (request.method === "GET" && requestUrl.pathname === "/api/events") {
      response.writeHead(200, {
        "cache-control": "no-cache",
        connection: "keep-alive",
        "content-type": "text/event-stream; charset=utf-8",
      });
      response.write(": connected\n\n");
      const clients = eventClients.get(sessionId) ?? new Set();
      clients.add(response);
      eventClients.set(sessionId, clients);
      request.on("close", () => {
        clients.delete(response);
        if (clients.size === 0) eventClients.delete(sessionId);
      });
      return;
    }
    jsonResponse(response, 404, { ok: false, error: "Not found." });
  }

  return {
    async start() {
      if (state) return state;
      server = createServer((request, response) => {
        void handleRequest(request, response).catch((error) => {
          if (!response.headersSent) jsonResponse(response, 500, { ok: false, error: error.message });
          else response.end();
        });
      });
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, resolve);
      });
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Draw.io bridge did not bind a TCP port.");
      const baseUrl = `http://${host}:${address.port}`;
      state = { baseUrl, editorUrl: `${baseUrl}/`, port: address.port };
      return state;
    },
    getState() {
      return state;
    },
    async stop() {
      if (!server) return;
      for (const clients of eventClients.values()) {
        for (const response of clients) response.end();
      }
      eventClients.clear();
      await new Promise((resolve) => server.close(resolve));
      server = null;
      state = null;
    },
  };
}

export { EMPTY_DRAWIO_XML };
