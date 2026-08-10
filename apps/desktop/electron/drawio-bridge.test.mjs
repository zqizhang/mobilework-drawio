import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createDrawioBridge } from "./drawio-bridge.mjs";

const XML_ONE = '<mxfile><diagram name="Page-1"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram></mxfile>';
const XML_TWO = '<mxfile><diagram name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';

test("bridge persists revisions and rejects stale agent writes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "openwork-drawio-"));
  const bridge = createDrawioBridge({ storageDir: root });
  try {
    const state = await bridge.start();
    const url = `${state.baseUrl}/api/diagram?sessionId=session-a`;
    const initial = await fetch(url).then((response) => response.json());
    assert.equal(initial.revision, 0);

    const first = await fetch(url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ xml: XML_ONE, baseRevision: 0, source: "editor" }),
    });
    assert.equal(first.status, 200);
    assert.equal((await first.json()).revision, 1);

    const stale = await fetch(url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ xml: XML_TWO, baseRevision: 0, source: "agent" }),
    });
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).current.xml, XML_ONE);

    const latest = await fetch(url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ xml: XML_TWO, baseRevision: 1, source: "agent" }),
    });
    assert.equal(latest.status, 200);
    assert.equal((await latest.json()).revision, 2);
  } finally {
    await bridge.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test("bridge page and health endpoint are served from the managed port", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "openwork-drawio-"));
  const bridge = createDrawioBridge({ storageDir: root });
  try {
    const state = await bridge.start();
    const health = await fetch(`${state.baseUrl}/health`).then((response) => response.json());
    const page = await fetch(`${state.baseUrl}/?sessionId=session-b`).then((response) => response.text());
    assert.deepEqual(health, {
      ok: true,
      service: "openwork-drawio-bridge",
      editorUrl: "http://127.0.0.1:18080/",
    });
    assert.match(page, /127\.0\.0\.1:18080/);
    assert.match(page, /event === "autosave"/);
    assert.match(page, /Editable SVG/);
  } finally {
    await bridge.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test("agent export command is completed by the connected side-panel editor", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "openwork-drawio-"));
  const bridge = createDrawioBridge({ storageDir: root });
  try {
    const state = await bridge.start();
    const sessionId = "session-export";
    const events = await fetch(`${state.baseUrl}/api/events?sessionId=${sessionId}`);
    const reader = events.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const exportResponsePromise = fetch(`${state.baseUrl}/api/export?sessionId=${sessionId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ format: "xmlsvg", fileName: "agent.editable.svg" }),
    });

    let command;
    while (!command) {
      const chunk = await reader.read();
      assert.equal(chunk.done, false);
      buffer += decoder.decode(chunk.value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop();
      for (const frame of frames) {
        if (!frame.startsWith("event: editor-command")) continue;
        const data = frame.split("\n").find((line) => line.startsWith("data: "));
        command = JSON.parse(data.slice(6));
      }
    }

    assert.equal(command.format, "xmlsvg");
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" content="embedded-drawio-xml"></svg>';
    const editorResponse = await fetch(`${state.baseUrl}/api/editor-export?sessionId=${sessionId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        format: "xmlsvg",
        requestId: command.requestId,
        data: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
      }),
    });
    assert.equal(editorResponse.status, 200);

    const exported = await exportResponsePromise.then((response) => response.json());
    assert.equal(exported.ok, true);
    assert.equal(exported.format, "xmlsvg");
    assert.equal(await readFile(exported.outputPath, "utf8"), svg);
    await reader.cancel();
  } finally {
    await bridge.stop();
    await rm(root, { recursive: true, force: true });
  }
});
