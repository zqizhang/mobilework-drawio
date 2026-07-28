export const DRAWIO_EDITOR_URL_STORAGE_KEY = "openwork:drawio:editor-url";
export const DEFAULT_DRAWIO_EDITOR_URL = "http://localhost:3000/";

type DrawioStorage = Pick<Storage, "getItem" | "setItem">;

type DrawioBrowser = {
  createTab?: (url?: string) => Promise<{ tabId: string }>;
  selectTab?: (tabId: string) => Promise<string>;
};

type DrawioPanelTab = {
  id: string;
};

export type OpenDrawioPanelResult =
  | { action: "created"; tabId: string }
  | { action: "focused"; tabId: string }
  | { action: "unavailable" };

function validHttpUrl(value: string | null | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function readStorage(storage: DrawioStorage | null, key: string) {
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: DrawioStorage | null, key: string, value: string) {
  if (!storage) return;

  try {
    storage.setItem(key, value);
  } catch {
    // The editor remains usable when persistence is unavailable.
  }
}

export function resolveDrawioEditorUrl(
  storage: DrawioStorage | null,
  viteEditorUrl?: string,
  managedBridgeUrl?: string,
) {
  return (
    validHttpUrl(managedBridgeUrl) ??
    validHttpUrl(readStorage(storage, DRAWIO_EDITOR_URL_STORAGE_KEY)) ??
    validHttpUrl(viteEditorUrl) ??
    DEFAULT_DRAWIO_EDITOR_URL
  );
}

export function drawioEditorUrlForSession(editorUrl: string, sessionId: string) {
  const url = new URL(editorUrl);
  url.searchParams.set("sessionId", sessionId);
  return url.toString();
}

export function drawioTabStorageKey(sessionId: string) {
  return `openwork:drawio:tab:v1:${encodeURIComponent(sessionId)}`;
}

export function readDrawioTabId(storage: DrawioStorage | null, sessionId: string) {
  return readStorage(storage, drawioTabStorageKey(sessionId));
}

export async function openOrFocusDrawioTab(options: {
  sessionId: string;
  tabs: readonly DrawioPanelTab[];
  editorUrl: string;
  browser: DrawioBrowser | null;
  storage: DrawioStorage | null;
  openPanel: () => void;
}): Promise<OpenDrawioPanelResult> {
  const { browser, editorUrl, openPanel, sessionId, storage, tabs } = options;
  if (!browser) return { action: "unavailable" };

  const tabStorageKey = drawioTabStorageKey(sessionId);
  const persistedTabId = readDrawioTabId(storage, sessionId);
  const persistedTabIsOpen = persistedTabId
    ? tabs.some((tab) => tab.id === persistedTabId)
    : false;

  if (persistedTabId && persistedTabIsOpen && browser.selectTab) {
    openPanel();
    try {
      await browser.selectTab(persistedTabId);
      return { action: "focused", tabId: persistedTabId };
    } catch {
      // The native tab may have closed between the renderer snapshot and IPC.
      // Fall through and replace the stale session entry.
    }
  }

  if (!browser.createTab) return { action: "unavailable" };

  openPanel();
  const { tabId } = await browser.createTab(editorUrl);
  writeStorage(storage, tabStorageKey, tabId);
  return { action: "created", tabId };
}
