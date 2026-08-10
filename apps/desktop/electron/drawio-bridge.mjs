import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BODY_BYTES = 25 * 1024 * 1024;
const EXPORT_TIMEOUT_MS = 45_000;
const DEFAULT_EDITOR_URL = "http://127.0.0.1:18080/";
const EXPORT_FORMATS = {
  svg: { fileName: "diagram.svg", label: "SVG" },
  xmlsvg: { fileName: "diagram.editable.svg", label: "Editable SVG" },
  png: { fileName: "diagram.png", label: "PNG" },
  xmlpng: { fileName: "diagram.editable.png", label: "Editable PNG" },
  pdf: { fileName: "diagram.pdf", label: "PDF" },
  jpeg: { fileName: "diagram.jpg", label: "JPEG" },
  html2: { fileName: "diagram.html", label: "HTML" },
};
const EMPTY_DRAWIO_XML = [
  '<mxfile host="OpenWork">',
  '  <diagram id="openwork" name="Page-1">',
  '    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">',
  "      <root>",
  '        <mxCell id="0" />',
  '        <mxCell id="1" parent="0" />',
  "      </root>",
  "    </mxGraphModel>",
  "  </diagram>",
  "</mxfile>",
].join("");

function jsonResponse(response, status, payload) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function validEditorUrl(value) {
  const url = new URL(value || DEFAULT_EDITOR_URL);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Draw.io editor URL must use HTTP or HTTPS.");
  }
  return url;
}

function bridgePage(editorUrl) {
  const config = JSON.stringify({
    editorUrl: editorUrl.toString(),
    editorOrigin: editorUrl.origin,
  }).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Draw.io — OpenWork</title>
    <style>
      html, body, iframe { width: 100%; height: 100%; margin: 0; border: 0; overflow: hidden; }
      body { background: #f8fafc; font: 13px system-ui, sans-serif; }
      #export-bar { position: fixed; z-index: 3; right: 12px; top: 10px; display: flex; gap: 5px;
        padding: 5px; border: 1px solid rgba(148,163,184,.45); border-radius: 10px;
        background: rgba(255,255,255,.94); box-shadow: 0 5px 18px rgba(15,23,42,.15); }
      #export-bar strong { align-self: center; padding: 0 4px; color: #475569; font-size: 12px; }
      #export-bar button { border: 0; border-radius: 7px; padding: 6px 8px; cursor: pointer;
        background: #f1f5f9; color: #0f172a; font: inherit; }
      #export-bar button:hover { background: #e2e8f0; }
      #export-bar button:disabled { cursor: wait; opacity: .55; }
      #status { position: fixed; z-index: 4; left: 12px; bottom: 10px; max-width: calc(100% - 24px);
        padding: 6px 9px; border-radius: 8px; background: rgba(15,23,42,.88); color: white;
        opacity: 0; pointer-events: none; transition: opacity .15s; }
      #status.visible { opacity: 1; }
    </style>
  </head>
  <body>
    <iframe id="editor" title="Draw.io editor"></iframe>
    <div id="export-bar" aria-label="Export diagram">
      <strong>Export</strong>
      <button type="button" data-format="svg">SVG</button>
      <button type="button" data-format="xmlsvg">Editable SVG</button>
      <button type="button" data-format="png">PNG</button>
      <button type="button" data-format="xmlpng">Editable PNG</button>
      <button type="button" data-format="pdf">PDF</button>
      <button type="button" data-format="jpeg">JPEG</button>
      <button type="button" data-format="html2">HTML</button>
    </div>
    <div id="status" role="status"></div>
    <script>
      (() => {
        const config = ${config};
        const params = new URLSearchParams(location.search);
        const sessionId = params.get("sessionId");
        const clientId = crypto.randomUUID();
        const editor = document.getElementById("editor");
        const status = document.getElementById("status");
        let current = null;
        let saveChain = Promise.resolve();
        let externalTimer = null;
        let editorReady = false;
        let pendingExport = null;

        function showStatus(message, duration = 2400) {
          status.textContent = message;
          status.classList.add("visible");
          clearTimeout(showStatus.timer);
          showStatus.timer = setTimeout(() => status.classList.remove("visible"), duration);
        }

        function editorMessage(payload) {
          editor.contentWindow?.postMessage(JSON.stringify(payload), config.editorOrigin);
        }

        async function readLatest() {
          const response = await fetch("/api/diagram?sessionId=" + encodeURIComponent(sessionId), { cache: "no-store" });
          if (!response.ok) throw new Error("Unable to read the diagram state.");
          return response.json();
        }

        async function writeState(xml, baseRevision) {
          const response = await fetch("/api/diagram?sessionId=" + encodeURIComponent(sessionId), {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ xml, baseRevision, source: "editor", clientId }),
          });
          const result = await response.json();
          if (response.status === 409) return writeState(xml, result.current.revision);
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
          editorMessage({ action: "load", xml: latest.xml, autosave: 1, diffSync: true, title: "OpenWork Draw.io" });
          showStatus("Agent update loaded · revision " + latest.revision);
        }

        function dispatchExport() {
          if (!editorReady || !pendingExport) return;
          const active = pendingExport;
          editorMessage({
            action: "export",
            format: active.format === "jpeg" || active.format === "pdf" ? "png" : active.format,
            currentPage: true,
            allPages: false,
            message: { requestId: active.requestId },
          });
        }

        function requestExport(format, button = null, requestId = null) {
          if (pendingExport) {
            showStatus("Another export is already running.", 3000);
            return;
          }
          pendingExport = { format, button, requestId };
          if (button) button.disabled = true;
          showStatus((editorReady ? "Exporting " : "Waiting for Draw.io to export ") + format + "…", 10_000);
          dispatchExport();
        }

        async function saveExport(message) {
          const active = pendingExport;
          if (!active) return;
          pendingExport = null;
          try {
            if (typeof message.data !== "string") throw new Error("Draw.io returned no export data.");
            const response = await fetch("/api/editor-export?sessionId=" + encodeURIComponent(sessionId), {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                format: active.format,
                data: message.data,
                requestId: active.requestId,
              }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Unable to save the exported file.");
            showStatus("Exported " + result.outputPath + " (" + result.bytes + " bytes)", 6000);
          } catch (error) {
            showStatus(error.message || "Export failed.", 6000);
          } finally {
            if (active.button) active.button.disabled = false;
          }
        }

        if (!sessionId) {
          showStatus("No OpenWork session selected.", 60_000);
          return;
        }

        document.getElementById("export-bar").addEventListener("click", (event) => {
          const button = event.target instanceof HTMLButtonElement ? event.target : null;
          const format = button?.dataset.format;
          if (format) requestExport(format, button);
        });

        const drawioUrl = new URL(config.editorUrl);
        Object.entries({
          embed: "1", proto: "json", configure: "1", spin: "1", libraries: "1",
          saveAndExit: "0", noExitBtn: "1", suppressNewWindows: "1", offline: "1",
        }).forEach(([key, value]) => drawioUrl.searchParams.set(key, value));
        editor.src = drawioUrl.toString();

        window.addEventListener("message", async (event) => {
          if (event.origin !== config.editorOrigin || event.source !== editor.contentWindow) return;
          let message;
          try { message = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
          if (!message || typeof message !== "object") return;
          if (message.event === "configure") {
            editorMessage({ action: "configure", config: { autosaveDelay: 250, preserveViewState: true, useInternalClipboard: true } });
          } else if (message.event === "init") {
            try {
              editorReady = true;
              current = await readLatest();
              editorMessage({ action: "load", xml: current.xml, autosave: 1, diffSync: true, title: "OpenWork Draw.io" });
              if (pendingExport) setTimeout(dispatchExport, 250);
            } catch (error) { showStatus(error.message, 5000); }
          } else if (message.event === "export" && pendingExport) {
            void saveExport(message);
          } else if (message.event === "autosave" || message.event === "save") {
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
        events.addEventListener("editor-command", (event) => {
          const command = JSON.parse(event.data);
          if (command.action === "export" && command.requestId && command.format) {
            requestExport(command.format, null, command.requestId);
          }
        });
        events.onerror = () => showStatus("Reconnecting to the OpenWork diagram bridge…");
      })();
    </script>
  </body>
</html>`;
}

function validateSessionId(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 512 ? value : null;
}

function validateXml(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_BODY_BYTES) return null;
  const trimmed = value.trim();
  return /^<(mxfile|mxGraphModel)(\s|>)/.test(trimmed) ? trimmed : null;
}

function exportFormat(value) {
  return typeof value === "string" && Object.hasOwn(EXPORT_FORMATS, value) ? value : null;
}

function decodeDataUri(value) {
  if (typeof value !== "string") throw new Error("Export data must be a data URI.");
  const match = value.match(/^data:([^;,]+)?((?:;[^,]*)*),(.*)$/s);
  if (!match) throw new Error("Draw.io returned an invalid data URI.");
  return match[2].split(";").includes("base64")
    ? Buffer.from(match[3], "base64")
    : Buffer.from(decodeURIComponent(match[3]), "utf8");
}

function isJpeg(content) {
  return content.length >= 4
    && content[0] === 0xff
    && content[1] === 0xd8
    && content[content.length - 2] === 0xff
    && content[content.length - 1] === 0xd9;
}

function isPng(content) {
  return content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

function jpegDimensions(content) {
  for (let offset = 2; offset + 8 < content.length;) {
    if (content[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = content[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = content.readUInt16BE(offset + 2);
    if (length < 2 || offset + length + 2 > content.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: content.readUInt16BE(offset + 5), width: content.readUInt16BE(offset + 7) };
    }
    offset += length + 2;
  }
  throw new Error("Draw.io returned JPEG content without dimensions.");
}

function jpegToPdf(jpeg) {
  const { width, height } = jpegDimensions(jpeg);
  const drawing = Buffer.from(`q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`, "ascii");
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "ascii"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "ascii"),
    Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`, "ascii"),
    Buffer.concat([Buffer.from(`<< /Length ${drawing.length} >>\nstream\n`, "ascii"), drawing, Buffer.from("endstream", "ascii")]),
    Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, "ascii"),
      jpeg,
      Buffer.from("\nendstream", "ascii"),
    ]),
  ];
  const parts = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  const offsets = [0];
  let size = parts[0].length;
  for (let index = 0; index < objects.length; index += 1) {
    const object = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`, "ascii"),
      objects[index],
      Buffer.from("\nendobj\n", "ascii"),
    ]);
    offsets.push(size);
    parts.push(object);
    size += object.length;
  }
  const xrefOffset = size;
  const xref = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f "];
  for (const offset of offsets.slice(1)) xref.push(`${String(offset).padStart(10, "0")} 00000 n `);
  parts.push(Buffer.from(`${xref.join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`, "ascii"));
  return Buffer.concat(parts);
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
  return { sessionId, revision: 0, xml: EMPTY_DRAWIO_XML, updatedAt: null, updatedBy: null, clientId: null };
}

export function createDrawioBridge({
  storageDir,
  host = "127.0.0.1",
  port = 0,
  editorUrl = process.env.OPENWORK_DRAWIO_WEB_URL || DEFAULT_EDITOR_URL,
  convertPngToJpeg = null,
}) {
  if (!storageDir) throw new Error("Draw.io bridge storageDir is required.");
  const drawioEditorUrl = validEditorUrl(editorUrl);
  const queues = new Map();
  const eventClients = new Map();
  const pendingExports = new Map();
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
      if (!xml) return { invalid: true, error: "Expected valid draw.io XML rooted at mxfile or mxGraphModel." };
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
      broadcast(sessionId, "diagram", {
        revision: next.revision, updatedAt: next.updatedAt, updatedBy: next.updatedBy, clientId: next.clientId,
      });
      return { document: next };
    });
    queues.set(sessionId, operation);
    void operation.finally(() => { if (queues.get(sessionId) === operation) queues.delete(sessionId); });
    return operation;
  }

  function broadcast(sessionId, event, payload) {
    const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const response of eventClients.get(sessionId) ?? []) response.write(frame);
  }

  async function saveExport(sessionId, format, data, fileName) {
    let content = decodeDataUri(data);
    if (content.length === 0 || content.length > MAX_BODY_BYTES) throw new Error("Draw.io returned an invalid export size.");
    if ((format === "jpeg" || format === "pdf") && isPng(content)) {
      if (typeof convertPngToJpeg !== "function") throw new Error("PNG-to-JPEG conversion is unavailable.");
      content = await convertPngToJpeg(content);
    }
    if (format === "pdf" && isJpeg(content)) content = jpegToPdf(content);
    if ((format === "svg" || format === "xmlsvg") && !content.subarray(0, 4096).toString("utf8").includes("<svg")) {
      throw new Error("Draw.io did not return SVG content.");
    }
    if ((format === "png" || format === "xmlpng") && !isPng(content)) {
      throw new Error("Draw.io did not return PNG content.");
    }
    if (format === "pdf" && content.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("Draw.io did not return PDF content.");
    }
    if (format === "jpeg" && !isJpeg(content)) {
      throw new Error("Draw.io did not return JPEG content.");
    }
    const safeName = path.basename(fileName || EXPORT_FORMATS[format].fileName);
    const outputDir = path.join(storageDir, "exports", createHash("sha256").update(sessionId).digest("hex"));
    const outputPath = path.join(outputDir, safeName);
    const temporary = `${outputPath}.${randomUUID()}.tmp`;
    await mkdir(outputDir, { recursive: true });
    await writeFile(temporary, content);
    await rename(temporary, outputPath);
    return { outputPath, bytes: content.length };
  }

  function requestEditorExport(sessionId, format, fileName) {
    const clients = eventClients.get(sessionId);
    if (!clients?.size) throw new Error("Open the Draw.io side panel before exporting from the agent.");
    const requestId = `export_${randomUUID()}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingExports.delete(requestId);
        reject(new Error("Draw.io export timed out."));
      }, EXPORT_TIMEOUT_MS);
      pendingExports.set(requestId, { sessionId, format, fileName, resolve, reject, timer });
      setTimeout(() => {
        if (pendingExports.has(requestId)) broadcast(sessionId, "editor-command", { action: "export", requestId, format });
      }, 500);
    });
  }

  async function handleRequest(request, response) {
    const requestUrl = new URL(request.url ?? "/", `http://${host}`);
    if (request.method === "GET" && requestUrl.pathname === "/") {
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-security-policy": `default-src 'self'; frame-src ${drawioEditorUrl.origin}; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`,
        "content-type": "text/html; charset=utf-8",
      });
      response.end(bridgePage(drawioEditorUrl));
      return;
    }
    if (request.method === "GET" && requestUrl.pathname === "/health") {
      jsonResponse(response, 200, { ok: true, service: "openwork-drawio-bridge", editorUrl: drawioEditorUrl.toString() });
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
      try { input = await requestJson(request); } catch (error) {
        jsonResponse(response, 400, { ok: false, error: error.message });
        return;
      }
      const result = await updateDocument(sessionId, input);
      if (result.conflict) jsonResponse(response, 409, { ok: false, error: "revision_conflict", current: result.current });
      else if (result.invalid) jsonResponse(response, 400, { ok: false, error: result.error });
      else jsonResponse(response, 200, result.document);
      return;
    }
    if (request.method === "GET" && requestUrl.pathname === "/api/events") {
      response.writeHead(200, {
        "cache-control": "no-cache", connection: "keep-alive", "content-type": "text/event-stream; charset=utf-8",
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
    if (request.method === "POST" && requestUrl.pathname === "/api/editor-export") {
      try {
        const input = await requestJson(request);
        const format = exportFormat(input.format);
        if (!format) throw new Error("Unsupported Draw.io export format.");
        const pending = typeof input.requestId === "string" ? pendingExports.get(input.requestId) : null;
        if (input.requestId && (!pending || pending.sessionId !== sessionId || pending.format !== format)) {
          throw new Error("Unknown Draw.io export request.");
        }
        const result = await saveExport(sessionId, format, input.data, pending?.fileName);
        if (pending) {
          clearTimeout(pending.timer);
          pendingExports.delete(input.requestId);
          pending.resolve(result);
        }
        jsonResponse(response, 200, { ok: true, format, label: EXPORT_FORMATS[format].label, ...result });
      } catch (error) {
        jsonResponse(response, 400, { ok: false, error: error.message });
      }
      return;
    }
    if (request.method === "POST" && requestUrl.pathname === "/api/export") {
      try {
        const input = await requestJson(request);
        const format = exportFormat(input.format);
        if (!format) throw new Error("Unsupported Draw.io export format.");
        const result = await requestEditorExport(sessionId, format, input.fileName);
        jsonResponse(response, 200, { ok: true, format, label: EXPORT_FORMATS[format].label, ...result });
      } catch (error) {
        jsonResponse(response, 400, { ok: false, error: error.message });
      }
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
      state = { baseUrl, editorUrl: `${baseUrl}/`, drawioUrl: drawioEditorUrl.toString(), port: address.port };
      return state;
    },
    getState() { return state; },
    async stop() {
      if (!server) return;
      for (const clients of eventClients.values()) for (const response of clients) response.end();
      eventClients.clear();
      for (const pending of pendingExports.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("Draw.io bridge stopped."));
      }
      pendingExports.clear();
      await new Promise((resolve) => server.close(resolve));
      server = null;
      state = null;
    },
  };
}

export { DEFAULT_EDITOR_URL, EMPTY_DRAWIO_XML, EXPORT_FORMATS };
