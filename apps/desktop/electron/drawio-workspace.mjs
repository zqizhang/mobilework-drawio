import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  appendFile,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MANIFEST_NAME = "drawio-workspace.json";
const SCHEMA_VERSION = 1;

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function slash(value) {
  return value.split(path.sep).join("/");
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function atomicWrite(file, content) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  return mkdir(path.dirname(file), { recursive: true })
    .then(() => writeFile(temporary, content))
    .then(() => rename(temporary, file));
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

function normalizeManifest(value) {
  if (!value || value.schemaVersion !== SCHEMA_VERSION || typeof value.workspaceId !== "string") return null;
  if (!Array.isArray(value.diagrams) || value.diagrams.length === 0) return null;
  return value;
}

function cellMap(xml) {
  const cells = new Map();
  const pattern = /<mxCell\b[^>]*\bid="([^"]+)"[^>]*(?:\/>|>[\s\S]*?<\/mxCell>)/g;
  for (const match of xml.matchAll(pattern)) cells.set(match[1], match[0]);
  return cells;
}

function xmlDiff(fromXml, toXml) {
  const from = cellMap(fromXml);
  const to = cellMap(toXml);
  const added = [...to.keys()].filter((id) => !from.has(id));
  const removed = [...from.keys()].filter((id) => !to.has(id));
  const changed = [...to.keys()].filter((id) => from.has(id) && from.get(id) !== to.get(id));
  return { added, removed, changed, fromCellCount: from.size, toCellCount: to.size };
}

export function createDrawioWorkspaceStore({ storageDir, emptyXml, gitExecutable = "git" }) {
  const sessionBindings = new Map();
  const queues = new Map();

  async function createManifest(workspaceRoot, manifestPath) {
    const entries = await readdir(workspaceRoot, { withFileTypes: true });
    const discovered = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".drawio"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
    const diagramFiles = discovered.length > 0 ? discovered : [".openwork/drawio/diagram.drawio"];
    const diagrams = diagramFiles.map((file, index) => ({
      id: `diagram_${hash(file).slice(0, 16)}`,
      title: path.basename(file, path.extname(file)) || `Diagram ${index + 1}`,
      file: slash(file),
      revision: 0,
      updatedAt: null,
      updatedBy: null,
    }));
    const manifest = {
      schemaVersion: SCHEMA_VERSION,
      workspaceId: `workspace_${randomUUID()}`,
      activeDiagramId: diagrams[0].id,
      diagrams,
    };
    for (const diagram of diagrams) {
      const file = path.resolve(workspaceRoot, diagram.file);
      try {
        await stat(file);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
        await atomicWrite(file, emptyXml);
      }
    }
    await atomicWrite(manifestPath, JSON.stringify(manifest, null, 2));
    return manifest;
  }

  async function workspaceScope(workspacePath, requestedDiagramId = null) {
    if (typeof workspacePath !== "string" || !path.isAbsolute(workspacePath)) {
      throw new Error("A valid absolute workspace path is required.");
    }
    const workspaceRoot = await realpath(workspacePath);
    const manifestDir = path.join(workspaceRoot, ".openwork");
    const manifestPath = path.join(manifestDir, MANIFEST_NAME);
    let manifest = normalizeManifest(await readJson(manifestPath));
    if (!manifest) manifest = await createManifest(workspaceRoot, manifestPath);
    const diagramId = requestedDiagramId || manifest.activeDiagramId || manifest.diagrams[0].id;
    const diagram = manifest.diagrams.find((candidate) => candidate.id === diagramId);
    if (!diagram) throw new Error(`Unknown Draw.io diagram: ${diagramId}`);
    const diagramPath = path.resolve(workspaceRoot, diagram.file);
    if (!inside(workspaceRoot, diagramPath)) throw new Error("The Draw.io diagram path escapes the workspace.");
    const dataDir = path.join(manifestDir, "drawio");
    return {
      mode: "workspace",
      key: `${manifest.workspaceId}:${diagram.id}`,
      workspaceId: manifest.workspaceId,
      workspaceRoot,
      manifestPath,
      manifest,
      diagramId: diagram.id,
      diagram,
      diagramPath,
      dataDir,
      historyFile: path.join(dataDir, `${diagram.id}.history.ndjson`),
      snapshotsDir: path.join(dataDir, "history", diagram.id),
      exportsDir: path.join(dataDir, "exports", diagram.id),
    };
  }

  function legacyScope(sessionId) {
    const file = path.join(storageDir, `${hash(sessionId)}.json`);
    return {
      mode: "session",
      key: `session:${sessionId}`,
      workspaceId: null,
      workspaceRoot: null,
      diagramId: null,
      diagramPath: file,
      exportsDir: path.join(storageDir, "exports", hash(sessionId)),
      sessionId,
    };
  }

  async function resolve({ sessionId, workspacePath = null, diagramId = null }) {
    if (workspacePath) {
      const scope = await workspaceScope(workspacePath, diagramId);
      sessionBindings.set(sessionId, {
        workspacePath: scope.workspaceRoot,
        diagramId: scope.diagramId,
      });
      return scope;
    }
    const binding = sessionBindings.get(sessionId);
    return binding ? workspaceScope(binding.workspacePath, diagramId || binding.diagramId) : legacyScope(sessionId);
  }

  async function read(scope) {
    if (scope.mode === "session") {
      const stored = await readJson(scope.diagramPath);
      return stored?.sessionId === scope.sessionId
        ? stored
        : { sessionId: scope.sessionId, revision: 0, xml: emptyXml, updatedAt: null, updatedBy: null, actorId: null };
    }
    const manifest = normalizeManifest(await readJson(scope.manifestPath));
    if (!manifest) throw new Error("The Draw.io workspace manifest is invalid.");
    const diagram = manifest.diagrams.find((candidate) => candidate.id === scope.diagramId);
    if (!diagram) throw new Error("The active Draw.io diagram is missing from the workspace manifest.");
    let xml;
    try {
      xml = await readFile(scope.diagramPath, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      xml = emptyXml;
    }
    return {
      workspaceId: manifest.workspaceId,
      workspacePath: scope.workspaceRoot,
      diagramId: diagram.id,
      diagramPath: scope.diagramPath,
      revision: diagram.revision ?? 0,
      xml,
      updatedAt: diagram.updatedAt ?? null,
      updatedBy: diagram.updatedBy ?? null,
      actorId: diagram.actorId ?? null,
    };
  }

  async function recordWorkspaceUpdate(scope, input, current) {
    const revision = current.revision + 1;
    const timestamp = new Date().toISOString();
    const manifest = normalizeManifest(await readJson(scope.manifestPath));
    if (!manifest) throw new Error("The Draw.io workspace manifest is invalid.");
    const diagram = manifest.diagrams.find((candidate) => candidate.id === scope.diagramId);
    if (!diagram) throw new Error("The active Draw.io diagram is missing from the workspace manifest.");
    Object.assign(diagram, {
      revision,
      updatedAt: timestamp,
      updatedBy: input.source === "editor" ? "editor" : "agent",
      actorId: input.actorId ?? null,
    });
    manifest.activeDiagramId = diagram.id;
    const snapshotPath = path.join(scope.snapshotsDir, `${String(revision).padStart(8, "0")}.drawio`);
    const history = {
      revision,
      parentRevision: current.revision,
      timestamp,
      source: input.source === "editor" ? "editor" : "agent",
      actorId: input.actorId ?? null,
      sessionId: input.sessionId ?? null,
      summary: input.summary ?? null,
      xmlHash: hash(input.xml),
      snapshot: slash(path.relative(scope.workspaceRoot, snapshotPath)),
    };
    await atomicWrite(scope.diagramPath, input.xml);
    await atomicWrite(snapshotPath, input.xml);
    await atomicWrite(scope.manifestPath, JSON.stringify(manifest, null, 2));
    await mkdir(path.dirname(scope.historyFile), { recursive: true });
    await appendFile(scope.historyFile, `${JSON.stringify(history)}\n`, "utf8");
    return { ...current, ...history, xml: input.xml, updatedAt: timestamp, updatedBy: diagram.updatedBy };
  }

  async function update(scope, input) {
    const previous = queues.get(scope.key) ?? Promise.resolve();
    const operation = previous.catch(() => undefined).then(async () => {
      const current = await read(scope);
      if (!Number.isInteger(input.baseRevision) || input.baseRevision !== current.revision) {
        return { conflict: true, current };
      }
      if (scope.mode === "workspace") return { document: await recordWorkspaceUpdate(scope, input, current) };
      const next = {
        sessionId: scope.sessionId,
        revision: current.revision + 1,
        xml: input.xml,
        updatedAt: new Date().toISOString(),
        updatedBy: input.source === "editor" ? "editor" : "agent",
        actorId: input.actorId ?? null,
      };
      await atomicWrite(scope.diagramPath, JSON.stringify(next));
      return { document: next };
    });
    queues.set(scope.key, operation);
    void operation.finally(() => { if (queues.get(scope.key) === operation) queues.delete(scope.key); });
    return operation;
  }

  async function history(scope) {
    if (scope.mode !== "workspace") return [];
    try {
      return (await readFile(scope.historyFile, "utf8"))
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .sort((left, right) => right.revision - left.revision);
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }
  }

  async function xmlAt(scope, revision) {
    const current = await read(scope);
    if (revision === current.revision) return current.xml;
    if (scope.mode !== "workspace" || !Number.isInteger(revision) || revision < 1) {
      throw new Error(`Unknown Draw.io revision: ${revision}`);
    }
    return readFile(path.join(scope.snapshotsDir, `${String(revision).padStart(8, "0")}.drawio`), "utf8");
  }

  async function diff(scope, fromRevision, toRevision) {
    const [fromXml, toXml] = await Promise.all([xmlAt(scope, fromRevision), xmlAt(scope, toRevision)]);
    return { fromRevision, toRevision, ...xmlDiff(fromXml, toXml) };
  }

  async function restore(scope, revision, input) {
    const current = await read(scope);
    const xml = await xmlAt(scope, revision);
    return update(scope, {
      ...input,
      xml,
      baseRevision: current.revision,
      summary: input.summary ?? `Restore revision ${revision}`,
    });
  }

  async function checkpoint(scope, message) {
    if (scope.mode !== "workspace") throw new Error("Git checkpoints require a Draw.io workspace.");
    const relativeDiagram = path.relative(scope.workspaceRoot, scope.diagramPath);
    const relativeManifest = path.relative(scope.workspaceRoot, scope.manifestPath);
    const relativeHistory = path.relative(scope.workspaceRoot, scope.historyFile);
    try {
      await execFileAsync(gitExecutable, ["-C", scope.workspaceRoot, "rev-parse", "--is-inside-work-tree"], { windowsHide: true });
    } catch {
      await execFileAsync(gitExecutable, ["-C", scope.workspaceRoot, "init"], { windowsHide: true });
    }
    await execFileAsync(gitExecutable, [
      "-C", scope.workspaceRoot, "add", "--", relativeDiagram, relativeManifest, relativeHistory,
    ], { windowsHide: true });
    await execFileAsync(gitExecutable, [
      "-C", scope.workspaceRoot,
      "-c", "user.name=OpenWork Draw.io",
      "-c", "user.email=drawio@openwork.local",
      "commit", "--only", "--allow-empty", "-m", message,
      "--", relativeDiagram, relativeManifest, relativeHistory,
    ], { windowsHide: true });
    const { stdout } = await execFileAsync(gitExecutable, ["-C", scope.workspaceRoot, "rev-parse", "HEAD"], { windowsHide: true });
    return { commit: stdout.trim(), message };
  }

  return { resolve, read, update, history, diff, restore, checkpoint };
}
