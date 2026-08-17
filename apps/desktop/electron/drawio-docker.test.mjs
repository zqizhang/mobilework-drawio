import assert from "node:assert/strict";
import test from "node:test";

import { createDrawioDockerManager } from "./drawio-docker.mjs";

test("external Draw.io URLs are not managed by Docker", async () => {
  const manager = createDrawioDockerManager({ editorUrl: "https://embed.diagrams.net/" });
  assert.equal((await manager.ensure()).status, "external");
});

test("managed Docker reports when explicit installation is required", async () => {
  const calls = [];
  const manager = createDrawioDockerManager({
    platform: "win32",
    env: {},
    run: async (command, args) => {
      calls.push([command, ...args]);
      throw new Error("missing");
    },
    fetcher: async () => new Response(null, { status: 503 }),
  });
  const state = await manager.ensure({ install: false });
  assert.equal(state.status, "docker_required");
  assert.equal(calls.some((call) => call[0] === "winget"), false);
});

test("managed Docker starts an existing stopped Draw.io container", async () => {
  const calls = [];
  let editorReady = false;
  const manager = createDrawioDockerManager({
    platform: "linux",
    env: {},
    run: async (command, args) => {
      calls.push([command, ...args]);
      if (args[0] === "version") return { stdout: "27.0", stderr: "" };
      if (args[0] === "inspect") return { stdout: "false", stderr: "" };
      if (args[0] === "start") {
        editorReady = true;
        return { stdout: "openwork-drawio", stderr: "" };
      }
      throw new Error(`Unexpected command: ${args.join(" ")}`);
    },
    fetcher: async () => new Response(null, { status: editorReady ? 200 : 503 }),
    pollDelay: async () => {},
  });
  assert.equal((await manager.ensure()).status, "ready");
  assert.equal(calls.some((call) => call.includes("start")), true);
});

test("explicit Windows setup invokes winget before creating the container", async () => {
  const calls = [];
  let installed = false;
  let editorReady = false;
  const manager = createDrawioDockerManager({
    platform: "win32",
    env: {},
    run: async (command, args) => {
      calls.push([command, ...args]);
      if (command === "winget") {
        installed = true;
        return { stdout: "installed", stderr: "" };
      }
      if (args[0] === "version") {
        if (!installed) throw new Error("missing");
        return { stdout: "27.0", stderr: "" };
      }
      if (args[0] === "inspect") throw new Error("container missing");
      if (args[0] === "run") {
        editorReady = true;
        return { stdout: "container", stderr: "" };
      }
      throw new Error(`Unexpected command: ${args.join(" ")}`);
    },
    fetcher: async () => new Response(null, { status: editorReady ? 200 : 503 }),
    pollDelay: async () => {},
  });
  assert.equal((await manager.ensure({ install: true })).status, "ready");
  assert.equal(calls.some((call) => call[0] === "winget"), true);
  assert.equal(calls.some((call) => call.includes("--restart") && call.includes("unless-stopped")), true);
});
