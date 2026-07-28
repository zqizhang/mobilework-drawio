import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
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
    assert.deepEqual(health, { ok: true, service: "openwork-drawio-bridge" });
    assert.match(page, /embed\.diagrams\.net/);
    assert.match(page, /event === "autosave"/);
  } finally {
    await bridge.stop();
    await rm(root, { recursive: true, force: true });
  }
});
