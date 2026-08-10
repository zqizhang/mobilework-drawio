import { describe, expect, test } from "bun:test";

import {
  DEFAULT_DRAWIO_EDITOR_URL,
  DRAWIO_EDITOR_URL_STORAGE_KEY,
  drawioEditorUrlForSession,
  drawioTabStorageKey,
  openOrFocusDrawioTab,
  resolveDrawioEditorUrl,
} from "../src/react-app/domains/session/panel/drawio-panel";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("Draw.io editor URL resolution", () => {
  test("prefers a valid local override over the Vite value", () => {
    const storage = memoryStorage({
      [DRAWIO_EDITOR_URL_STORAGE_KEY]: "https://drawio.internal/editor",
    });

    expect(resolveDrawioEditorUrl(storage, "https://drawio.example.test"))
      .toBe("https://drawio.internal/editor");
  });

  test("falls back through invalid or unsupported values", () => {
    const invalidOverride = memoryStorage({
      [DRAWIO_EDITOR_URL_STORAGE_KEY]: "javascript:alert(1)",
    });

    expect(resolveDrawioEditorUrl(invalidOverride, "http://127.0.0.1:4567"))
      .toBe("http://127.0.0.1:4567/");
    expect(resolveDrawioEditorUrl(invalidOverride, "file:///tmp/drawio.html"))
      .toBe(DEFAULT_DRAWIO_EDITOR_URL);
  });

  test("prefers the managed bridge and scopes it to the OpenWork session", () => {
    const storage = memoryStorage({
      [DRAWIO_EDITOR_URL_STORAGE_KEY]: "https://drawio.internal/editor",
    });
    const bridge = resolveDrawioEditorUrl(
      storage,
      "https://drawio.example.test",
      "http://127.0.0.1:43123/",
    );

    expect(drawioEditorUrlForSession(bridge, "session/a", "C:\\Workspaces\\orders"))
      .toBe("http://127.0.0.1:43123/?sessionId=session%2Fa&workspacePath=C%3A%5CWorkspaces%5Corders");
  });
});

describe("Draw.io browser tab lifecycle", () => {
  test("focuses the session's persisted tab instead of creating another", async () => {
    const sessionId = "session/a";
    const storage = memoryStorage({
      [drawioTabStorageKey(sessionId)]: "drawio-tab",
    });
    const calls: string[] = [];

    const result = await openOrFocusDrawioTab({
      sessionId,
      tabs: [{ id: "other-tab" }, { id: "drawio-tab" }],
      editorUrl: DEFAULT_DRAWIO_EDITOR_URL,
      storage,
      openPanel: () => calls.push("open-panel"),
      browser: {
        createTab: async () => {
          calls.push("create-tab");
          return { tabId: "unexpected" };
        },
        selectTab: async (tabId) => {
          calls.push(`select:${tabId}`);
          return tabId;
        },
      },
    });

    expect(result).toEqual({ action: "focused", tabId: "drawio-tab" });
    expect(calls).toEqual(["open-panel", "select:drawio-tab"]);
  });

  test("creates and persists a replacement when the session tab is gone", async () => {
    const sessionId = "session-b";
    const storage = memoryStorage({
      [drawioTabStorageKey(sessionId)]: "closed-tab",
    });
    const calls: string[] = [];

    const result = await openOrFocusDrawioTab({
      sessionId,
      tabs: [{ id: "another-session-tab" }],
      editorUrl: "http://localhost:3000/",
      storage,
      openPanel: () => calls.push("open-panel"),
      browser: {
        createTab: async (url) => {
          calls.push(`create:${url}`);
          return { tabId: "replacement-tab" };
        },
      },
    });

    expect(result).toEqual({ action: "created", tabId: "replacement-tab" });
    expect(storage.getItem(drawioTabStorageKey(sessionId))).toBe("replacement-tab");
    expect(calls).toEqual(["open-panel", "create:http://localhost:3000/"]);
  });

  test("replaces a tab that closes while it is being focused", async () => {
    const sessionId = "session-race";
    const storage = memoryStorage({
      [drawioTabStorageKey(sessionId)]: "stale-tab",
    });

    const result = await openOrFocusDrawioTab({
      sessionId,
      tabs: [{ id: "stale-tab" }],
      editorUrl: DEFAULT_DRAWIO_EDITOR_URL,
      storage,
      openPanel: () => undefined,
      browser: {
        selectTab: async () => {
          throw new Error("tab closed");
        },
        createTab: async () => ({ tabId: "fresh-tab" }),
      },
    });

    expect(result).toEqual({ action: "created", tabId: "fresh-tab" });
    expect(storage.getItem(drawioTabStorageKey(sessionId))).toBe("fresh-tab");
  });
});
