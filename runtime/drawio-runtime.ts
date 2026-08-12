import { promises as fs } from "node:fs"
import { createHash, randomBytes } from "node:crypto"
import { createServer, type IncomingMessage, type Server } from "node:http"
import { createConnection } from "node:net"
import path from "node:path"
import { type Plugin, tool } from "@opencode-ai/plugin"
import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser"
import pako from "pako"

type Direction = "left-to-right" | "top-to-bottom"

type DiagramNode = {
  id: string
  label: string
  kind?: "default" | "application" | "service" | "database" | "external" | "decision"
}

type DiagramEdge = {
  id?: string
  source: string
  target: string
  label?: string
}

type ParsedCell = {
  id: string
  parent?: string
  source?: string
  target?: string
  label?: string
  style?: string
  vertex: boolean
  edge: boolean
  geometry?: {
    x?: number
    y?: number
    width?: number
    height?: number
    relative?: boolean
    offset?: { x: number; y: number }
    points?: Array<{ x: number; y: number }>
  }
}

type ParsedPage = {
  id: string
  name: string
  compressed: boolean
  cells: ParsedCell[]
}

type EditablePage = {
  id: string
  name: string
  compressed: boolean
  diagram: Record<string, unknown> | null
  model: Record<string, unknown>
}

type EditableDocument = {
  document: Record<string, unknown>
  directModel: boolean
  pages: EditablePage[]
}

type PatchOperation = {
  type: "add-node" | "update-node" | "remove-node" | "add-edge" | "update-edge" | "remove-edge"
  id: string
  label?: string
  kind?: DiagramNode["kind"]
  source?: string
  target?: string
  x?: number
  y?: number
  width?: number
  height?: number
  cascade?: boolean
}

type QualityIssue = {
  code:
    | "invalid-structure"
    | "node-overlap"
    | "edge-through-node"
    | "edge-crossing"
    | "label-overlap"
    | "empty-label"
    | "missing-line-jump"
  severity: "error" | "warning" | "info"
  page: string
  cells: string[]
  message: string
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: false,
})

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  format: false,
  suppressEmptyNode: true,
})

const ALLOWED_EXTENSIONS = [".drawio", ".xml"]
const COMPARABLE_EXTENSIONS = [...ALLOWED_EXTENSIONS, ".bak"]
const ARTIFACT_EXTENSIONS = [".html"]
const MAX_FILE_BYTES = 20 * 1024 * 1024
const DEFAULT_MAX_OUTPUT_BYTES = 100 * 1024 * 1024
const DEFAULT_EXPORT_URL = "http://127.0.0.1:18765/ImageExport4/export"
const DEFAULT_EXPORT_BACKGROUND = "#ffffff"
const BRIDGE_TOKEN_TTL_MS = 12 * 60 * 60 * 1000
const SESSION_HISTORY_LIMIT = 20
// User-visible persistent history settings. The in-memory `session.history`
// window above is a short-lived per-revision conflict window; this store is a
// separate durable checkpoint repository that survives runtime restarts.
const HISTORY_MAX_ENTRIES = 20
const HISTORY_EDITOR_DEBOUNCE_MS = 2000
const HISTORY_PREVIEW_CONCURRENCY = 2
const HISTORY_THUMB_SCALE = 0.25
const HISTORY_PREVIEW_MAX_BYTES = 8 * 1024 * 1024
const HISTORY_SCHEMA_VERSION = 1
const HISTORY_SNAPSHOT_ID_RE = /^h_[A-Za-z0-9_-]+_[A-Fa-f0-9]{8,}$/
const ARTIFACT_MARKER = "drawio-expert-artifact:v1"
const SAFE_ID = /^[A-Za-z0-9_.:-]+$/
const DRAWIO_ENVIRONMENT_KEYS = [
  "DRAWIO_WEB_URL",
  "DRAWIO_BRIDGE_HOST",
  "DRAWIO_BRIDGE_PORT",
  "DRAWIO_EXPORT_URL",
  "DRAWIO_REQUEST_TIMEOUT",
  "DRAWIO_MAX_INPUT_SIZE_MB",
  "DRAWIO_MAX_OUTPUT_SIZE_MB",
] as const
const EDGE_BASE_STYLE =
  "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;jumpStyle=arc;jumpSize=10;endArrow=block;endFill=1;"

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function attribute(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value)
}

function numberAttribute(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function slug(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
  return normalized || "diagram"
}

type WorkspaceContext = {
  directory: string
  worktree?: string
}

function resolveWorkspaceRoot(context: WorkspaceContext): string {
  const directory = context.directory.trim()
  if (!directory) throw new Error("OpenCode did not provide a workspace directory")
  return path.resolve(directory)
}

async function loadWorkspaceEnvironment(directory: string): Promise<void> {
  const environmentPath = path.join(resolveWorkspaceRoot({ directory }), ".env")
  let content: string
  try {
    content = await fs.readFile(environmentPath, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return
    throw new Error(`cannot read workspace .env at ${environmentPath}: ${(error as Error).message}`)
  }

  const parsed: Record<string, string> = {}
  for (const line of content.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue
    const [, name, rawValue] = match
    const trimmed = rawValue.trim()
    const quote = trimmed[0]
    const closingQuote = quote === '"' || quote === "'" || quote === "`"
      ? trimmed.lastIndexOf(quote)
      : -1
    let value = closingQuote > 0
      ? trimmed.slice(1, closingQuote)
      : trimmed.replace(/\s+#.*$/, "").trim()
    if (quote === '"' && closingQuote > 0) {
      value = value
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
    }
    parsed[name] = value
  }

  for (const name of DRAWIO_ENVIRONMENT_KEYS) {
    if (!process.env[name]?.trim() && parsed[name] !== undefined) {
      process.env[name] = parsed[name]
    }
  }
}

function workspaceRelative(context: WorkspaceContext, target: string): string {
  return path.relative(resolveWorkspaceRoot(context), target)
}

function resolveWorkspaceFile(
  context: WorkspaceContext,
  requestedPath: string,
  allowedExtensions: string[],
): string {
  if (!requestedPath.trim()) throw new Error("file must be a non-empty path")
  if (path.isAbsolute(requestedPath)) {
    throw new Error("absolute paths are not allowed; use a workspace-relative path")
  }

  const workspace = resolveWorkspaceRoot(context)
  const target = path.resolve(workspace, requestedPath)
  const relative = path.relative(workspace, target)
  const parentToken = String.fromCharCode(46).repeat(2)

  if (
    !relative
    || relative === parentToken
    || relative.startsWith(parentToken + path.sep)
    || path.isAbsolute(relative)
  ) {
    throw new Error("file must resolve to a file inside the current workspace")
  }

  const lower = target.toLowerCase()
  if (!allowedExtensions.some((extension) => lower.endsWith(extension))) {
    throw new Error(`unsupported file extension; expected ${allowedExtensions.join(" or ")}`)
  }

  return target
}

function resolveWorkspacePath(
  context: { directory: string; worktree?: string },
  requestedPath: string,
): string {
  return resolveWorkspaceFile(context, requestedPath, ALLOWED_EXTENSIONS)
}

async function readDiagramFile(target: string): Promise<string> {
  const stat = await fs.stat(target)
  if (!stat.isFile()) throw new Error("target is not a regular file")
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(`file is larger than the ${MAX_FILE_BYTES / 1024 / 1024} MB MVP limit`)
  }
  return fs.readFile(target, "utf8")
}

function decodeDiagramPayload(payload: string): string {
  const compressed = Buffer.from(payload.trim(), "base64")
  const percentEncoded = new TextDecoder().decode(pako.inflateRaw(compressed))
  return decodeURIComponent(percentEncoded)
}

function encodeDiagramPayload(xml: string): string {
  const percentEncoded = encodeURIComponent(xml)
  const compressed = pako.deflateRaw(new TextEncoder().encode(percentEncoded))
  return Buffer.from(compressed).toString("base64")
}

function geometryFromCell(cell: Record<string, unknown>): ParsedCell["geometry"] {
  const raw = cell.mxGeometry
  if (!raw || typeof raw !== "object") return undefined
  const geometry = raw as Record<string, unknown>
  const pointArrays = asArray(
    geometry.Array as Record<string, unknown> | Record<string, unknown>[] | undefined,
  )
  const points = pointArrays
    .filter((array) => attribute(array["@_as"]) === "points")
    .flatMap((array) =>
      asArray(
        array.mxPoint as Record<string, unknown> | Record<string, unknown>[] | undefined,
      ),
    )
    .map((point) => ({
      x: numberAttribute(point["@_x"]),
      y: numberAttribute(point["@_y"]),
    }))
    .filter(
      (point): point is { x: number; y: number } =>
        point.x !== undefined && point.y !== undefined,
    )
  const offsetPoint = asArray(
    geometry.mxPoint as Record<string, unknown> | Record<string, unknown>[] | undefined,
  ).find((point) => attribute(point["@_as"]) === "offset")
  const offsetX = offsetPoint ? numberAttribute(offsetPoint["@_x"]) : undefined
  const offsetY = offsetPoint ? numberAttribute(offsetPoint["@_y"]) : undefined
  return {
    x: numberAttribute(geometry["@_x"]),
    y: numberAttribute(geometry["@_y"]),
    width: numberAttribute(geometry["@_width"]),
    height: numberAttribute(geometry["@_height"]),
    relative: attribute(geometry["@_relative"]) === "1",
    offset: offsetX !== undefined || offsetY !== undefined
      ? { x: offsetX || 0, y: offsetY || 0 }
      : undefined,
    points,
  }
}

function parseGraphModel(modelXml: string): ParsedCell[] {
  const validation = XMLValidator.validate(modelXml)
  if (validation !== true) {
    throw new Error(`invalid mxGraphModel XML: ${JSON.stringify(validation)}`)
  }

  const document = parser.parse(modelXml) as Record<string, unknown>
  const graph = document.mxGraphModel as Record<string, unknown> | undefined
  const root = graph?.root as Record<string, unknown> | undefined
  if (!root) throw new Error("diagram page does not contain mxGraphModel/root")

  return asArray(root.mxCell as Record<string, unknown> | Record<string, unknown>[] | undefined)
    .map((cell) => ({
      id: attribute(cell["@_id"]) || "",
      parent: attribute(cell["@_parent"]),
      source: attribute(cell["@_source"]),
      target: attribute(cell["@_target"]),
      label: attribute(cell["@_value"]),
      style: attribute(cell["@_style"]),
      vertex: attribute(cell["@_vertex"]) === "1",
      edge: attribute(cell["@_edge"]) === "1",
      geometry: geometryFromCell(cell),
    }))
}

function parseDrawio(xml: string): ParsedPage[] {
  const validation = XMLValidator.validate(xml)
  if (validation !== true) {
    throw new Error(`invalid draw.io XML: ${JSON.stringify(validation)}`)
  }

  const document = parser.parse(xml) as Record<string, unknown>
  if (document.mxGraphModel) {
    return [{
      id: "page-1",
      name: "Page-1",
      compressed: false,
      cells: parseGraphModel(xml),
    }]
  }

  const mxfile = document.mxfile as Record<string, unknown> | undefined
  if (!mxfile) throw new Error("root element must be mxfile or mxGraphModel")

  const diagrams = asArray(
    mxfile.diagram as Record<string, unknown> | Record<string, unknown>[] | undefined,
  )
  if (diagrams.length === 0) throw new Error("mxfile contains no diagram pages")

  return diagrams.map((diagram, index) => {
    const pageId = attribute(diagram["@_id"]) || `page-${index + 1}`
    const pageName = attribute(diagram["@_name"]) || `Page-${index + 1}`
    const embeddedModel = diagram.mxGraphModel

    if (embeddedModel && typeof embeddedModel === "object") {
      const modelXml = builder.build({ mxGraphModel: embeddedModel })
      return {
        id: pageId,
        name: pageName,
        compressed: false,
        cells: parseGraphModel(modelXml),
      }
    }

    const payload = attribute(diagram["#text"])
    if (!payload?.trim()) throw new Error(`page ${pageName} has no diagram data`)
    return {
      id: pageId,
      name: pageName,
      compressed: true,
      cells: parseGraphModel(decodeDiagramPayload(payload)),
    }
  })
}

function parseEditableDrawio(xml: string): EditableDocument {
  const validation = XMLValidator.validate(xml)
  if (validation !== true) {
    throw new Error(`invalid draw.io XML: ${JSON.stringify(validation)}`)
  }

  const document = parser.parse(xml) as Record<string, unknown>
  if (document.mxGraphModel && typeof document.mxGraphModel === "object") {
    return {
      document,
      directModel: true,
      pages: [{
        id: "page-1",
        name: "Page-1",
        compressed: false,
        diagram: null,
        model: document.mxGraphModel as Record<string, unknown>,
      }],
    }
  }

  const mxfile = document.mxfile as Record<string, unknown> | undefined
  if (!mxfile) throw new Error("root element must be mxfile or mxGraphModel")
  const diagrams = asArray(
    mxfile.diagram as Record<string, unknown> | Record<string, unknown>[] | undefined,
  )
  if (diagrams.length === 0) throw new Error("mxfile contains no diagram pages")

  const pages = diagrams.map((diagram, index): EditablePage => {
    const page = {
      id: attribute(diagram["@_id"]) || `page-${index + 1}`,
      name: attribute(diagram["@_name"]) || `Page-${index + 1}`,
      compressed: false,
      diagram,
      model: {} as Record<string, unknown>,
    }

    if (diagram.mxGraphModel && typeof diagram.mxGraphModel === "object") {
      page.model = diagram.mxGraphModel as Record<string, unknown>
      return page
    }

    const payload = attribute(diagram["#text"])
    if (!payload?.trim()) throw new Error(`page ${page.name} has no diagram data`)
    const modelDocument = parser.parse(decodeDiagramPayload(payload)) as Record<string, unknown>
    if (!modelDocument.mxGraphModel || typeof modelDocument.mxGraphModel !== "object") {
      throw new Error(`page ${page.name} has no mxGraphModel`)
    }
    page.compressed = true
    page.model = modelDocument.mxGraphModel as Record<string, unknown>
    return page
  })

  return { document, directModel: false, pages }
}

function serializeEditableDrawio(editable: EditableDocument): string {
  if (editable.directModel) {
    editable.document.mxGraphModel = editable.pages[0].model
    return `${builder.build(editable.document)}\n`
  }

  for (const page of editable.pages) {
    const diagram = page.diagram!
    if (page.compressed) {
      delete diagram.mxGraphModel
      diagram["#text"] = encodeDiagramPayload(builder.build({ mxGraphModel: page.model }))
    } else {
      delete diagram["#text"]
      diagram.mxGraphModel = page.model
    }
  }
  return `${builder.build(editable.document)}\n`
}

function editableCells(page: EditablePage): Record<string, unknown>[] {
  const root = page.model.root as Record<string, unknown> | undefined
  if (!root) throw new Error(`page ${page.name} has no mxGraphModel/root`)
  const cells = asArray(
    root.mxCell as Record<string, unknown> | Record<string, unknown>[] | undefined,
  )
  root.mxCell = cells
  return cells
}

function selectEditablePage(editable: EditableDocument, pageSelector?: string): EditablePage {
  if (!pageSelector?.trim()) return editable.pages[0]
  const page = editable.pages.find(
    (candidate) => candidate.id === pageSelector || candidate.name === pageSelector,
  )
  if (!page) throw new Error(`diagram page not found: ${pageSelector}`)
  return page
}

function rawCellId(cell: Record<string, unknown>): string {
  return attribute(cell["@_id"]) || ""
}

function rawCellIsVertex(cell: Record<string, unknown>): boolean {
  return attribute(cell["@_vertex"]) === "1"
}

function rawCellIsEdge(cell: Record<string, unknown>): boolean {
  return attribute(cell["@_edge"]) === "1"
}

function rawGeometry(cell: Record<string, unknown>): Record<string, unknown> {
  if (!cell.mxGeometry || typeof cell.mxGeometry !== "object") {
    cell.mxGeometry = { "@_as": "geometry" }
  }
  return cell.mxGeometry as Record<string, unknown>
}

function nextPatchPosition(cells: Record<string, unknown>[]): { x: number; y: number } {
  const vertices = cells.filter(rawCellIsVertex)
  if (vertices.length === 0) return { x: 80, y: 80 }
  let maxBottom = 80
  for (const cell of vertices) {
    const geometry = rawGeometry(cell)
    const y = numberAttribute(geometry["@_y"]) || 0
    const height = numberAttribute(geometry["@_height"]) || 70
    maxBottom = Math.max(maxBottom, y + height)
  }
  return { x: 80, y: maxBottom + 60 }
}

function applyPatchOperations(page: EditablePage, operations: PatchOperation[]): string[] {
  const cells = editableCells(page)
  const changed: string[] = []
  const findCell = (id: string) => cells.find((cell) => rawCellId(cell) === id)

  for (const operation of operations) {
    if (!SAFE_ID.test(operation.id) || operation.id === "0" || operation.id === "1") {
      throw new Error(`invalid or reserved operation id: ${operation.id}`)
    }

    const existing = findCell(operation.id)
    if (operation.type === "add-node") {
      if (existing) throw new Error(`cell already exists: ${operation.id}`)
      if (!operation.label?.trim()) throw new Error(`add-node ${operation.id} requires label`)
      const fallback = nextPatchPosition(cells)
      cells.push({
        "@_id": operation.id,
        "@_value": operation.label,
        "@_style": nodeStyle(operation.kind),
        "@_vertex": "1",
        "@_parent": "1",
        mxGeometry: {
          "@_x": operation.x ?? fallback.x,
          "@_y": operation.y ?? fallback.y,
          "@_width": operation.width ?? (operation.kind === "decision" ? 140 : 160),
          "@_height": operation.height ?? (operation.kind === "decision" ? 100 : 70),
          "@_as": "geometry",
        },
      })
      changed.push(operation.id)
      continue
    }

    if (operation.type === "add-edge") {
      if (existing) throw new Error(`cell already exists: ${operation.id}`)
      if (!operation.source || !findCell(operation.source) || !rawCellIsVertex(findCell(operation.source)!)) {
        throw new Error(`add-edge ${operation.id} has unknown vertex source: ${operation.source || "(empty)"}`)
      }
      if (!operation.target || !findCell(operation.target) || !rawCellIsVertex(findCell(operation.target)!)) {
        throw new Error(`add-edge ${operation.id} has unknown vertex target: ${operation.target || "(empty)"}`)
      }
      cells.push({
        "@_id": operation.id,
        "@_value": operation.label || "",
        "@_style": EDGE_BASE_STYLE,
        "@_edge": "1",
        "@_parent": "1",
        "@_source": operation.source,
        "@_target": operation.target,
        mxGeometry: { "@_relative": "1", "@_as": "geometry" },
      })
      changed.push(operation.id)
      continue
    }

    if (!existing) throw new Error(`cell not found: ${operation.id}`)

    if (operation.type === "update-node") {
      if (!rawCellIsVertex(existing)) throw new Error(`${operation.id} is not a node`)
      if (operation.label !== undefined) existing["@_value"] = operation.label
      if (operation.kind !== undefined) existing["@_style"] = nodeStyle(operation.kind)
      const geometry = rawGeometry(existing)
      if (operation.x !== undefined) geometry["@_x"] = operation.x
      if (operation.y !== undefined) geometry["@_y"] = operation.y
      if (operation.width !== undefined) geometry["@_width"] = operation.width
      if (operation.height !== undefined) geometry["@_height"] = operation.height
      changed.push(operation.id)
      continue
    }

    if (operation.type === "update-edge") {
      if (!rawCellIsEdge(existing)) throw new Error(`${operation.id} is not an edge`)
      if (operation.source !== undefined) {
        const source = findCell(operation.source)
        if (!source || !rawCellIsVertex(source)) {
          throw new Error(`update-edge ${operation.id} has unknown vertex source: ${operation.source}`)
        }
        existing["@_source"] = operation.source
      }
      if (operation.target !== undefined) {
        const target = findCell(operation.target)
        if (!target || !rawCellIsVertex(target)) {
          throw new Error(`update-edge ${operation.id} has unknown vertex target: ${operation.target}`)
        }
        existing["@_target"] = operation.target
      }
      if (operation.label !== undefined) existing["@_value"] = operation.label
      changed.push(operation.id)
      continue
    }

    if (operation.type === "remove-edge") {
      if (!rawCellIsEdge(existing)) throw new Error(`${operation.id} is not an edge`)
      cells.splice(cells.indexOf(existing), 1)
      changed.push(operation.id)
      continue
    }

    if (operation.type === "remove-node") {
      if (!rawCellIsVertex(existing)) throw new Error(`${operation.id} is not a node`)
      const connected = cells.filter(
        (cell) =>
          rawCellIsEdge(cell)
          && (attribute(cell["@_source"]) === operation.id || attribute(cell["@_target"]) === operation.id),
      )
      if (connected.length > 0 && !operation.cascade) {
        throw new Error(
          `remove-node ${operation.id} has ${connected.length} connected edge(s); set cascade=true`,
        )
      }
      for (const edge of connected) {
        changed.push(rawCellId(edge))
        cells.splice(cells.indexOf(edge), 1)
      }
      cells.splice(cells.indexOf(existing), 1)
      changed.push(operation.id)
    }
  }

  return [...new Set(changed)]
}

function snapshotPages(pages: ParsedPage[]) {
  const result = new Map<string, ParsedCell>()
  for (const page of pages) {
    for (const cell of page.cells) {
      if (cell.vertex || cell.edge) result.set(`${page.id}:${cell.id}`, cell)
    }
  }
  return result
}

function comparableCell(cell: ParsedCell) {
  return {
    label: cell.label || "",
    parent: cell.parent || "",
    source: cell.source || "",
    target: cell.target || "",
    style: cell.style || "",
    geometry: cell.geometry || {},
  }
}

function diffParsedPages(beforePages: ParsedPage[], afterPages: ParsedPage[]) {
  const before = snapshotPages(beforePages)
  const after = snapshotPages(afterPages)
  const added: Array<{ key: string; cell: ParsedCell }> = []
  const removed: Array<{ key: string; cell: ParsedCell }> = []
  const changed: Array<{
    key: string
    before: ReturnType<typeof comparableCell>
    after: ReturnType<typeof comparableCell>
  }> = []

  for (const [key, cell] of after) {
    if (!before.has(key)) {
      added.push({ key, cell })
      continue
    }
    const beforeCell = comparableCell(before.get(key)!)
    const afterCell = comparableCell(cell)
    if (JSON.stringify(beforeCell) !== JSON.stringify(afterCell)) {
      changed.push({ key, before: beforeCell, after: afterCell })
    }
  }
  for (const [key, cell] of before) {
    if (!after.has(key)) removed.push({ key, cell })
  }

  return {
    added,
    removed,
    changed,
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      unchanged: [...after.keys()].filter(
        (key) => before.has(key)
          && JSON.stringify(comparableCell(before.get(key)!))
            === JSON.stringify(comparableCell(after.get(key)!)),
      ).length,
    },
  }
}

function validateSemanticGraph(nodes: DiagramNode[], edges: DiagramEdge[]): void {
  if (nodes.length === 0) throw new Error("nodes must contain at least one node")

  const nodeIds = new Set<string>()
  for (const node of nodes) {
    if (!SAFE_ID.test(node.id) || node.id === "0" || node.id === "1") {
      throw new Error(`invalid or reserved node id: ${node.id}`)
    }
    if (!node.label.trim()) throw new Error(`node ${node.id} has an empty label`)
    if (nodeIds.has(node.id)) throw new Error(`duplicate node id: ${node.id}`)
    nodeIds.add(node.id)
  }

  const edgeIds = new Set<string>()
  for (const [index, edge] of edges.entries()) {
    const id = edge.id || `edge-${index + 1}`
    if (!SAFE_ID.test(id) || id === "0" || id === "1") {
      throw new Error(`invalid or reserved edge id: ${id}`)
    }
    if (edgeIds.has(id) || nodeIds.has(id)) throw new Error(`duplicate cell id: ${id}`)
    if (!nodeIds.has(edge.source)) throw new Error(`edge ${id} has unknown source: ${edge.source}`)
    if (!nodeIds.has(edge.target)) throw new Error(`edge ${id} has unknown target: ${edge.target}`)
    edgeIds.add(id)
  }
}

function calculateRanks(nodes: DiagramNode[], edges: DiagramEdge[]): Map<string, number> {
  const incoming = new Map(nodes.map((node) => [node.id, 0]))
  const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]))
  const ranks = new Map(nodes.map((node) => [node.id, 0]))

  for (const edge of edges) {
    incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1)
    outgoing.get(edge.source)?.push(edge.target)
  }

  const queue = nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id)
  const visited = new Set<string>()

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)

    for (const target of outgoing.get(current) || []) {
      ranks.set(target, Math.max(ranks.get(target) || 0, (ranks.get(current) || 0) + 1))
      incoming.set(target, (incoming.get(target) || 1) - 1)
      if (incoming.get(target) === 0) queue.push(target)
    }
  }

  // Cycles cannot be topologically ranked; keep their current deterministic rank.
  return ranks
}

function nodeStyle(kind: DiagramNode["kind"]): string {
  const base = "rounded=1;whiteSpace=wrap;html=1;arcSize=12;strokeWidth=1.5;"
  const styles: Record<NonNullable<DiagramNode["kind"]>, string> = {
    default: "fillColor=#dae8fc;strokeColor=#6c8ebf;",
    application: "fillColor=#d5e8d4;strokeColor=#82b366;",
    service: "fillColor=#dae8fc;strokeColor=#6c8ebf;",
    database: "shape=cylinder3;boundedLbl=1;backgroundOutline=1;fillColor=#fff2cc;strokeColor=#d6b656;",
    external: "dashed=1;fillColor=#f5f5f5;strokeColor=#666666;",
    decision: "rhombus;fillColor=#ffe6cc;strokeColor=#d79b00;",
  }
  return base + styles[kind || "default"]
}

function buildGraphModel(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  direction: Direction,
): string {
  const ranks = calculateRanks(nodes, edges)
  const byRank = new Map<number, DiagramNode[]>()
  const maxFanOut = Math.max(
    1,
    ...nodes.map((node) => edges.filter((edge) => edge.source === node.id).length),
  )
  const rankStep = Math.max(240, 200 + maxFanOut * 20)
  const crossStep = 140
  const positions = new Map<string, {
    x: number
    y: number
    width: number
    height: number
  }>()

  for (const node of nodes) {
    const rank = ranks.get(node.id) || 0
    const row = byRank.get(rank) || []
    row.push(node)
    byRank.set(rank, row)
  }

  for (const node of nodes) {
    const rank = ranks.get(node.id) || 0
    const offset = (byRank.get(rank) || []).findIndex((candidate) => candidate.id === node.id)
    const width = node.kind === "decision" ? 140 : 160
    const height = node.kind === "decision" ? 100 : 70
    positions.set(node.id, {
      x: direction === "left-to-right" ? 80 + rank * rankStep : 80 + offset * rankStep,
      y: direction === "left-to-right" ? 80 + offset * crossStep : 80 + rank * crossStep,
      width,
      height,
    })
  }

  const nodeCells = nodes.map((node) => {
    const position = positions.get(node.id)!
    return `      <mxCell id="${xmlEscape(node.id)}" value="${xmlEscape(node.label)}" style="${xmlEscape(nodeStyle(node.kind))}" vertex="1" parent="1">
        <mxGeometry x="${position.x}" y="${position.y}" width="${position.width}" height="${position.height}" as="geometry"/>
      </mxCell>`
  })

  const edgeCells = edges.map((edge, index) => {
    const id = edge.id || `edge-${index + 1}`
    const source = positions.get(edge.source)!
    const target = positions.get(edge.target)!
    const siblingEdges = edges.filter((candidate) => candidate.source === edge.source)
    const siblingIndex = siblingEdges.indexOf(edge)
    const laneOffset = (siblingIndex - (siblingEdges.length - 1) / 2) * 18

    let style = EDGE_BASE_STYLE
    let points: string

    if (direction === "left-to-right") {
      const sourceRight = source.x + source.width
      const targetLeft = target.x
      const corridor = targetLeft > sourceRight
        ? (sourceRight + targetLeft) / 2 + laneOffset
        : Math.max(sourceRight, target.x + target.width) + 80 + siblingIndex * 18
      const sourceY = source.y + source.height / 2
      const targetY = target.y + target.height / 2
      style += "exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      points = `          <mxPoint x="${corridor}" y="${sourceY}"/>
          <mxPoint x="${corridor}" y="${targetY}"/>`
    } else {
      const sourceBottom = source.y + source.height
      const targetTop = target.y
      const corridor = targetTop > sourceBottom
        ? (sourceBottom + targetTop) / 2 + laneOffset
        : Math.max(sourceBottom, target.y + target.height) + 80 + siblingIndex * 18
      const sourceX = source.x + source.width / 2
      const targetX = target.x + target.width / 2
      style += "exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      points = `          <mxPoint x="${sourceX}" y="${corridor}"/>
          <mxPoint x="${targetX}" y="${corridor}"/>`
    }

    return `      <mxCell id="${xmlEscape(id)}" value="${xmlEscape(edge.label || "")}" style="${style}" edge="1" parent="1" source="${xmlEscape(edge.source)}" target="${xmlEscape(edge.target)}">
        <mxGeometry relative="1" as="geometry">
          <Array as="points">
${points}
          </Array>
        </mxGeometry>
      </mxCell>`
  })

  return `<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
${[...nodeCells, ...edgeCells].join("\n")}
  </root>
</mxGraphModel>`
}

function buildDrawioDocument(
  title: string,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  direction: Direction,
  compressed: boolean,
): string {
  const graphModel = buildGraphModel(nodes, edges, direction)
  const pageId = `page-${slug(title)}`
  const diagramContent = compressed ? encodeDiagramPayload(graphModel) : graphModel
  const now = new Date().toISOString()
  return `<mxfile host="OpenWork" modified="${now}" agent="drawio-expert" version="26.0.0">
  <diagram id="${xmlEscape(pageId)}" name="${xmlEscape(title)}">${diagramContent}</diagram>
</mxfile>
`
}

function validationReport(pages: ParsedPage[]) {
  const errors: string[] = []
  const warnings: string[] = []

  for (const page of pages) {
    const ids = new Set<string>()
    for (const cell of page.cells) {
      if (!cell.id) {
        errors.push(`${page.name}: cell without id`)
        continue
      }
      if (ids.has(cell.id)) errors.push(`${page.name}: duplicate cell id ${cell.id}`)
      ids.add(cell.id)
    }

    for (const cell of page.cells) {
      if (cell.parent && !ids.has(cell.parent)) {
        errors.push(`${page.name}: ${cell.id} references missing parent ${cell.parent}`)
      }
      if (cell.edge) {
        if (!cell.source || !ids.has(cell.source)) {
          errors.push(`${page.name}: edge ${cell.id} has missing source ${cell.source || "(empty)"}`)
        }
        if (!cell.target || !ids.has(cell.target)) {
          errors.push(`${page.name}: edge ${cell.id} has missing target ${cell.target || "(empty)"}`)
        }
      }
      if (cell.vertex) {
        if (!cell.geometry) {
          errors.push(`${page.name}: vertex ${cell.id} has no geometry`)
        } else if (
          (cell.geometry.width !== undefined && cell.geometry.width <= 0)
          || (cell.geometry.height !== undefined && cell.geometry.height <= 0)
        ) {
          errors.push(`${page.name}: vertex ${cell.id} has non-positive dimensions`)
        }
        if (!cell.label?.trim()) warnings.push(`${page.name}: vertex ${cell.id} has an empty label`)
      }
    }

    const vertices = page.cells.filter(
      (cell) =>
        cell.vertex
        && cell.geometry?.x !== undefined
        && cell.geometry?.y !== undefined
        && cell.geometry?.width !== undefined
        && cell.geometry?.height !== undefined,
    )
    for (let leftIndex = 0; leftIndex < vertices.length; leftIndex += 1) {
      const left = vertices[leftIndex]
      for (let rightIndex = leftIndex + 1; rightIndex < vertices.length; rightIndex += 1) {
        const right = vertices[rightIndex]
        if (left.parent !== right.parent) continue
        const leftGeometry = left.geometry!
        const rightGeometry = right.geometry!
        const overlaps =
          leftGeometry.x! < rightGeometry.x! + rightGeometry.width!
          && leftGeometry.x! + leftGeometry.width! > rightGeometry.x!
          && leftGeometry.y! < rightGeometry.y! + rightGeometry.height!
          && leftGeometry.y! + leftGeometry.height! > rightGeometry.y!
        if (overlaps) {
          warnings.push(`${page.name}: nodes ${left.id} and ${right.id} overlap`)
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      pages: pages.length,
      nodes: pages.reduce((sum, page) => sum + page.cells.filter((cell) => cell.vertex).length, 0),
      edges: pages.reduce((sum, page) => sum + page.cells.filter((cell) => cell.edge).length, 0),
    },
  }
}

type Point = { x: number; y: number }
type Rectangle = { x: number; y: number; width: number; height: number }

type GeometryContext = {
  cellsById: Map<string, ParsedCell>
  absoluteGeometry: Map<string, Rectangle | null>
}

function createGeometryContext(cells: ParsedCell[]): GeometryContext {
  return {
    cellsById: new Map(cells.map((cell) => [cell.id, cell])),
    absoluteGeometry: new Map(),
  }
}

function absoluteCellGeometry(
  cell: ParsedCell,
  context: GeometryContext,
  visiting = new Set<string>(),
): Rectangle | null {
  if (context.absoluteGeometry.has(cell.id)) {
    return context.absoluteGeometry.get(cell.id) || null
  }
  const geometry = cell.geometry
  if (!geometry) {
    context.absoluteGeometry.set(cell.id, null)
    return null
  }
  if (visiting.has(cell.id)) return null
  visiting.add(cell.id)

  const parent = cell.parent ? context.cellsById.get(cell.parent) : undefined
  const parentGeometry = parent
    ? absoluteCellGeometry(parent, context, visiting)
    : null
  const localX = geometry.x || 0
  const localY = geometry.y || 0
  let x = localX
  let y = localY
  if (parentGeometry) {
    if (geometry.relative) {
      x = parentGeometry.x + localX * parentGeometry.width + (geometry.offset?.x || 0)
      y = parentGeometry.y + localY * parentGeometry.height + (geometry.offset?.y || 0)
    } else {
      x = parentGeometry.x + localX
      y = parentGeometry.y + localY
    }
  }

  const result = {
    x,
    y,
    width: geometry.width || 0,
    height: geometry.height || 0,
  }
  visiting.delete(cell.id)
  context.absoluteGeometry.set(cell.id, result)
  return result
}

function vertexRectangle(cell: ParsedCell, context: GeometryContext): Rectangle | null {
  const geometry = cell.geometry
  if (
    geometry?.x === undefined
    || geometry.y === undefined
    || geometry.width === undefined
    || geometry.height === undefined
  ) {
    return null
  }
  const absolute = absoluteCellGeometry(cell, context)
  if (!absolute) return null
  return { ...absolute, width: geometry.width, height: geometry.height }
}

function rectangleCenter(rectangle: Rectangle): Point {
  return {
    x: rectangle.x + rectangle.width / 2,
    y: rectangle.y + rectangle.height / 2,
  }
}

function rectanglesOverlap(left: Rectangle, right: Rectangle): boolean {
  return (
    left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y
  )
}

function styleValue(style: string | undefined, key: string): string | undefined {
  return style
    ?.split(";")
    .map((entry) => entry.split("=", 2))
    .find(([candidate]) => candidate === key)?.[1]
}

function numericStyleValue(style: string | undefined, key: string): number | undefined {
  const raw = styleValue(style, key)
  if (raw === undefined) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

function visibleLabelLines(label: string): string[] {
  const visible = label
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/&#x0*a;|&#0*10;/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#0*160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .trim()
  return visible ? visible.split(/\r?\n/) : []
}

function estimatedTextRectangle(
  label: string,
  center: Point,
  fontSize: number,
): Rectangle | null {
  const lines = visibleLabelLines(label)
  if (lines.length === 0) return null
  const lineWidth = (line: string) => Array.from(line).reduce((width, character) => {
    if (/\s/u.test(character)) return width + fontSize * 0.35
    if (/[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/u.test(character)) {
      return width + fontSize
    }
    if (/[A-Z0-9]/u.test(character)) return width + fontSize * 0.65
    if (/[a-z]/u.test(character)) return width + fontSize * 0.55
    return width + fontSize * 0.45
  }, 0)
  const width = Math.max(8, ...lines.map(lineWidth)) + 8
  const height = Math.max(fontSize * 1.25, lines.length * fontSize * 1.25) + 4
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
  }
}

function pointAlongPolyline(
  polyline: Point[],
  fraction: number,
): { point: Point; tangent: Point } | null {
  const segments = polyline.slice(0, -1).map((start, index) => {
    const end = polyline[index + 1]
    return { start, end, length: Math.hypot(end.x - start.x, end.y - start.y) }
  }).filter((segment) => segment.length > 1e-9)
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0)
  if (totalLength <= 1e-9) return null
  let remaining = Math.min(1, Math.max(0, fraction)) * totalLength
  for (const segment of segments) {
    if (remaining <= segment.length) {
      const ratio = remaining / segment.length
      return {
        point: {
          x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
          y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
        },
        tangent: {
          x: (segment.end.x - segment.start.x) / segment.length,
          y: (segment.end.y - segment.start.y) / segment.length,
        },
      }
    }
    remaining -= segment.length
  }
  const last = segments[segments.length - 1]
  return {
    point: { ...last.end },
    tangent: {
      x: (last.end.x - last.start.x) / last.length,
      y: (last.end.y - last.start.y) / last.length,
    },
  }
}

function edgeLabelRectangle(edge: ParsedCell, polyline: Point[]): Rectangle | null {
  if (!edge.label?.trim()) return null
  const relativePosition = Math.min(1, Math.max(-1, edge.geometry?.x || 0))
  const placement = pointAlongPolyline(polyline, (relativePosition + 1) / 2)
  if (!placement) return null
  const orthogonalOffset = edge.geometry?.y || 0
  const center = {
    x:
      placement.point.x
      - placement.tangent.y * orthogonalOffset
      + (edge.geometry?.offset?.x || 0),
    y:
      placement.point.y
      + placement.tangent.x * orthogonalOffset
      + (edge.geometry?.offset?.y || 0),
  }
  return estimatedTextRectangle(
    edge.label,
    center,
    numericStyleValue(edge.style, "fontSize") || 12,
  )
}

function vertexLabelObstacle(
  vertex: ParsedCell,
  context: GeometryContext,
): Rectangle | null {
  if (!vertex.label?.trim()) return null
  const rectangle = vertexRectangle(vertex, context)
  if (!rectangle) return null
  if (!vertex.style?.split(";").includes("swimlane")) return rectangle
  const startSize = Math.max(0, numericStyleValue(vertex.style, "startSize") || 23)
  if (styleValue(vertex.style, "horizontal") === "0") {
    return { ...rectangle, width: Math.min(rectangle.width, startSize) }
  }
  return { ...rectangle, height: Math.min(rectangle.height, startSize) }
}

function edgePolyline(
  edge: ParsedCell,
  vertices: Map<string, ParsedCell>,
  geometryContext: GeometryContext,
): Point[] | null {
  const source = edge.source ? vertices.get(edge.source) : undefined
  const target = edge.target ? vertices.get(edge.target) : undefined
  const sourceRectangle = source ? vertexRectangle(source, geometryContext) : null
  const targetRectangle = target ? vertexRectangle(target, geometryContext) : null
  if (!sourceRectangle || !targetRectangle) return null

  const sourceCenter = rectangleCenter(sourceRectangle)
  const targetCenter = rectangleCenter(targetRectangle)
  const anchor = (
    rectangle: Rectangle,
    toward: Point,
    xKey: "exitX" | "entryX",
    yKey: "exitY" | "entryY",
  ): Point => {
    const configuredX = numericStyleValue(edge.style, xKey)
    const configuredY = numericStyleValue(edge.style, yKey)
    if (configuredX !== undefined || configuredY !== undefined) {
      return {
        x: rectangle.x + (configuredX ?? 0.5) * rectangle.width,
        y: rectangle.y + (configuredY ?? 0.5) * rectangle.height,
      }
    }
    const center = rectangleCenter(rectangle)
    const dx = toward.x - center.x
    const dy = toward.y - center.y
    if (Math.abs(dx) >= Math.abs(dy)) {
      return { x: dx >= 0 ? rectangle.x + rectangle.width : rectangle.x, y: center.y }
    }
    return { x: center.x, y: dy >= 0 ? rectangle.y + rectangle.height : rectangle.y }
  }
  const start = anchor(sourceRectangle, targetCenter, "exitX", "exitY")
  const end = anchor(targetRectangle, sourceCenter, "entryX", "entryY")
  const parent = edge.parent ? geometryContext.cellsById.get(edge.parent) : undefined
  const parentGeometry = parent ? absoluteCellGeometry(parent, geometryContext) : null
  const waypoints = (edge.geometry?.points || []).map((point) => ({
    x: point.x + (parentGeometry?.x || 0),
    y: point.y + (parentGeometry?.y || 0),
  }))
  if (waypoints.length > 0) return [start, ...waypoints, end]
  if (edge.style?.includes("edgeStyle=none")) return [start, end]

  if (Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)) {
    const middleX = (start.x + end.x) / 2
    return [start, { x: middleX, y: start.y }, { x: middleX, y: end.y }, end]
  }
  const middleY = (start.y + end.y) / 2
  return [start, { x: start.x, y: middleY }, { x: end.x, y: middleY }, end]
}

function ancestorIds(cellId: string | undefined, context: GeometryContext): Set<string> {
  const ancestors = new Set<string>()
  let current = cellId ? context.cellsById.get(cellId) : undefined
  while (current?.parent && !ancestors.has(current.parent)) {
    ancestors.add(current.parent)
    current = context.cellsById.get(current.parent)
  }
  return ancestors
}

function properSegmentIntersection(
  leftStart: Point,
  leftEnd: Point,
  rightStart: Point,
  rightEnd: Point,
): boolean {
  const denominator =
    (leftEnd.x - leftStart.x) * (rightEnd.y - rightStart.y)
    - (leftEnd.y - leftStart.y) * (rightEnd.x - rightStart.x)
  if (Math.abs(denominator) < 1e-9) return false
  const leftPosition =
    ((rightStart.x - leftStart.x) * (rightEnd.y - rightStart.y)
      - (rightStart.y - leftStart.y) * (rightEnd.x - rightStart.x))
    / denominator
  const rightPosition =
    ((rightStart.x - leftStart.x) * (leftEnd.y - leftStart.y)
      - (rightStart.y - leftStart.y) * (leftEnd.x - leftStart.x))
    / denominator
  const epsilon = 1e-6
  return (
    leftPosition > epsilon
    && leftPosition < 1 - epsilon
    && rightPosition > epsilon
    && rightPosition < 1 - epsilon
  )
}

function segmentIntersectsRectangleInterior(
  start: Point,
  end: Point,
  rectangle: Rectangle,
): boolean {
  const epsilon = 1e-4
  const left = rectangle.x + epsilon
  const right = rectangle.x + rectangle.width - epsilon
  const top = rectangle.y + epsilon
  const bottom = rectangle.y + rectangle.height - epsilon
  if (left >= right || top >= bottom) return false

  const dx = end.x - start.x
  const dy = end.y - start.y
  const p = [-dx, dx, -dy, dy]
  const q = [start.x - left, right - start.x, start.y - top, bottom - start.y]
  let minimum = 0
  let maximum = 1
  for (let index = 0; index < p.length; index += 1) {
    if (Math.abs(p[index]) < 1e-9) {
      if (q[index] < 0) return false
      continue
    }
    const ratio = q[index] / p[index]
    if (p[index] < 0) minimum = Math.max(minimum, ratio)
    else maximum = Math.min(maximum, ratio)
    if (minimum > maximum) return false
  }
  return maximum - minimum > epsilon
}

function qualityReport(pages: ParsedPage[], threshold = 90) {
  const validation = validationReport(pages)
  const issues: QualityIssue[] = validation.errors.map((message) => ({
    code: "invalid-structure",
    severity: "error",
    page: message.split(":")[0] || "(unknown)",
    cells: [],
    message,
  }))
  const metrics = {
    overlaps: 0,
    edgeNodeIntersections: 0,
    edgeCrossings: 0,
    labelOverlaps: 0,
    emptyLabels: 0,
    missingLineJumps: 0,
  }

  for (const page of pages) {
    const vertices = page.cells.filter((cell) => cell.vertex)
    const edges = page.cells.filter((cell) => cell.edge)
    const verticesById = new Map(vertices.map((cell) => [cell.id, cell]))
    const geometryContext = createGeometryContext(page.cells)
    const containerIds = new Set(
      page.cells.map((cell) => cell.parent).filter((id): id is string => Boolean(id)),
    )

    for (let leftIndex = 0; leftIndex < vertices.length; leftIndex += 1) {
      const left = vertices[leftIndex]
      const leftRectangle = vertexRectangle(left, geometryContext)
      if (!left.label?.trim() && !containerIds.has(left.id)) {
        metrics.emptyLabels += 1
        issues.push({
          code: "empty-label",
          severity: "warning",
          page: page.name,
          cells: [left.id],
          message: `${page.name}: node ${left.id} has an empty label`,
        })
      }
      if (!leftRectangle) continue
      for (let rightIndex = leftIndex + 1; rightIndex < vertices.length; rightIndex += 1) {
        const right = vertices[rightIndex]
        if (left.parent !== right.parent) continue
        const rightRectangle = vertexRectangle(right, geometryContext)
        if (!rightRectangle || !rectanglesOverlap(leftRectangle, rightRectangle)) continue
        metrics.overlaps += 1
        issues.push({
          code: "node-overlap",
          severity: "error",
          page: page.name,
          cells: [left.id, right.id],
          message: `${page.name}: nodes ${left.id} and ${right.id} overlap`,
        })
      }
    }

    const polylines = new Map<string, Point[]>()
    const edgeLabelRectangles = new Map<string, Rectangle>()
    for (const edge of edges) {
      const polyline = edgePolyline(edge, verticesById, geometryContext)
      if (polyline) {
        polylines.set(edge.id, polyline)
        const labelRectangle = edgeLabelRectangle(edge, polyline)
        if (labelRectangle) edgeLabelRectangles.set(edge.id, labelRectangle)
      }
      if (!edge.style?.includes("jumpStyle=arc")) {
        metrics.missingLineJumps += 1
        issues.push({
          code: "missing-line-jump",
          severity: "info",
          page: page.name,
          cells: [edge.id],
          message: `${page.name}: edge ${edge.id} does not enable arc line jumps`,
        })
      }
      if (!polyline) continue
      const endpointAncestors = new Set([
        ...ancestorIds(edge.source, geometryContext),
        ...ancestorIds(edge.target, geometryContext),
      ])
      for (const vertex of vertices) {
        if (vertex.id === edge.source || vertex.id === edge.target) continue
        if (endpointAncestors.has(vertex.id)) continue
        const rectangle = vertexRectangle(vertex, geometryContext)
        if (!rectangle) continue
        const intersects = polyline.slice(0, -1).some((point, index) =>
          segmentIntersectsRectangleInterior(point, polyline[index + 1], rectangle),
        )
        if (!intersects) continue
        metrics.edgeNodeIntersections += 1
        issues.push({
          code: "edge-through-node",
          severity: "error",
          page: page.name,
          cells: [edge.id, vertex.id],
          message: `${page.name}: edge ${edge.id} passes through node ${vertex.id}`,
        })
      }
    }

    for (const edge of edges) {
      const labelRectangle = edgeLabelRectangles.get(edge.id)
      if (!labelRectangle) continue
      for (const vertex of vertices) {
        const obstacle = vertexLabelObstacle(vertex, geometryContext)
        if (!obstacle || !rectanglesOverlap(labelRectangle, obstacle)) continue
        metrics.labelOverlaps += 1
        issues.push({
          code: "label-overlap",
          severity: "error",
          page: page.name,
          cells: [edge.id, vertex.id],
          message: `${page.name}: label of edge ${edge.id} overlaps node or container title ${vertex.id}`,
        })
      }
    }

    const labeledEdges = edges.filter((edge) => edgeLabelRectangles.has(edge.id))
    for (let leftIndex = 0; leftIndex < labeledEdges.length; leftIndex += 1) {
      const left = labeledEdges[leftIndex]
      const leftRectangle = edgeLabelRectangles.get(left.id)!
      for (let rightIndex = leftIndex + 1; rightIndex < labeledEdges.length; rightIndex += 1) {
        const right = labeledEdges[rightIndex]
        const rightRectangle = edgeLabelRectangles.get(right.id)!
        if (!rectanglesOverlap(leftRectangle, rightRectangle)) continue
        metrics.labelOverlaps += 1
        issues.push({
          code: "label-overlap",
          severity: "error",
          page: page.name,
          cells: [left.id, right.id],
          message: `${page.name}: labels of edges ${left.id} and ${right.id} overlap`,
        })
      }
    }

    for (let leftIndex = 0; leftIndex < edges.length; leftIndex += 1) {
      const left = edges[leftIndex]
      const leftPolyline = polylines.get(left.id)
      if (!leftPolyline) continue
      for (let rightIndex = leftIndex + 1; rightIndex < edges.length; rightIndex += 1) {
        const right = edges[rightIndex]
        if (
          left.source === right.source
          || left.source === right.target
          || left.target === right.source
          || left.target === right.target
        ) {
          continue
        }
        const rightPolyline = polylines.get(right.id)
        if (!rightPolyline) continue
        const crossing = leftPolyline.slice(0, -1).some((leftPoint, leftSegment) =>
          rightPolyline.slice(0, -1).some((rightPoint, rightSegment) =>
            properSegmentIntersection(
              leftPoint,
              leftPolyline[leftSegment + 1],
              rightPoint,
              rightPolyline[rightSegment + 1],
            ),
          ),
        )
        if (!crossing) continue
        metrics.edgeCrossings += 1
        issues.push({
          code: "edge-crossing",
          severity: "warning",
          page: page.name,
          cells: [left.id, right.id],
          message: `${page.name}: edges ${left.id} and ${right.id} cross`,
        })
      }
    }
  }

  const score = Math.max(
    0,
    100
      - validation.errors.length * 40
      - metrics.overlaps * 12
      - metrics.edgeNodeIntersections * 8
      - metrics.edgeCrossings * 4
      - metrics.labelOverlaps * 6
      - metrics.emptyLabels * 2
      - metrics.missingLineJumps,
  )
  return {
    pass:
      validation.valid
      && metrics.overlaps === 0
      && metrics.edgeNodeIntersections === 0
      && metrics.labelOverlaps === 0
      && score >= threshold,
    score,
    threshold,
    metrics,
    issues,
    validation,
  }
}

function styleWith(
  style: string,
  properties: Record<string, string>,
): string {
  const values = new Map<string, string>()
  const order: string[] = []
  for (const token of style.split(";").filter(Boolean)) {
    const separator = token.indexOf("=")
    const key = separator === -1 ? token : token.slice(0, separator)
    if (!values.has(key)) order.push(key)
    values.set(key, separator === -1 ? "" : token.slice(separator + 1))
  }
  for (const [key, value] of Object.entries(properties)) {
    if (!values.has(key)) order.push(key)
    values.set(key, value)
  }
  return `${order.map((key) => {
    const value = values.get(key) || ""
    return value ? `${key}=${value}` : key
  }).join(";")};`
}

function autoLayoutPage(page: EditablePage, direction: Direction): string[] {
  const cells = editableCells(page)
  const allVertices = cells.filter(rawCellIsVertex)
  const topLevelVertices = allVertices.filter(
    (cell) => attribute(cell["@_parent"]) === "1",
  )
  const vertices = topLevelVertices.length > 0 ? topLevelVertices : allVertices
  const vertexIds = new Set(vertices.map(rawCellId))
  const edges = cells.filter(
    (cell) =>
      rawCellIsEdge(cell)
      && vertexIds.has(attribute(cell["@_source"]) || "")
      && vertexIds.has(attribute(cell["@_target"]) || ""),
  )
  if (vertices.length === 0) return []

  const graphNodes: DiagramNode[] = vertices.map((cell) => ({
    id: rawCellId(cell),
    label: attribute(cell["@_value"]) || rawCellId(cell),
  }))
  const graphEdges: DiagramEdge[] = edges.map((cell) => ({
    id: rawCellId(cell),
    source: attribute(cell["@_source"]) || "",
    target: attribute(cell["@_target"]) || "",
  }))
  const ranks = calculateRanks(graphNodes, graphEdges)
  const byRank = new Map<number, Record<string, unknown>[]>()
  for (const vertex of vertices) {
    const rank = ranks.get(rawCellId(vertex)) || 0
    const ranked = byRank.get(rank) || []
    ranked.push(vertex)
    byRank.set(rank, ranked)
  }
  for (const ranked of byRank.values()) {
    ranked.sort((left, right) => {
      const leftGeometry = rawGeometry(left)
      const rightGeometry = rawGeometry(right)
      const leftPosition = numberAttribute(
        leftGeometry[direction === "left-to-right" ? "@_y" : "@_x"],
      ) || 0
      const rightPosition = numberAttribute(
        rightGeometry[direction === "left-to-right" ? "@_y" : "@_x"],
      ) || 0
      return leftPosition - rightPosition || rawCellId(left).localeCompare(rawCellId(right))
    })
  }

  const maximumWidth = Math.max(
    ...vertices.map((cell) => numberAttribute(rawGeometry(cell)["@_width"]) || 160),
  )
  const maximumHeight = Math.max(
    ...vertices.map((cell) => numberAttribute(rawGeometry(cell)["@_height"]) || 70),
  )
  const rankStep = maximumWidth + 140
  const crossStep = maximumHeight + 90
  const positions = new Map<string, Rectangle>()
  const changed = new Set<string>()

  for (const [rank, ranked] of [...byRank.entries()].sort((left, right) => left[0] - right[0])) {
    ranked.forEach((vertex, index) => {
      const geometry = rawGeometry(vertex)
      const width = numberAttribute(geometry["@_width"]) || 160
      const height = numberAttribute(geometry["@_height"]) || 70
      const position = {
        x: direction === "left-to-right" ? 80 + rank * rankStep : 80 + index * crossStep,
        y: direction === "left-to-right" ? 80 + index * crossStep : 80 + rank * rankStep,
        width,
        height,
      }
      geometry["@_x"] = position.x
      geometry["@_y"] = position.y
      geometry["@_width"] = width
      geometry["@_height"] = height
      positions.set(rawCellId(vertex), position)
      changed.add(rawCellId(vertex))
    })
  }

  for (const [edgeIndex, edge] of edges.entries()) {
    const sourceId = attribute(edge["@_source"])!
    const targetId = attribute(edge["@_target"])!
    const source = positions.get(sourceId)!
    const target = positions.get(targetId)!
    const siblings = edges.filter((candidate) => attribute(candidate["@_source"]) === sourceId)
    const siblingIndex = siblings.indexOf(edge)
    const laneOffset = (siblingIndex - (siblings.length - 1) / 2) * 18
    const geometry = rawGeometry(edge)
    geometry["@_relative"] = "1"
    geometry["@_as"] = "geometry"

    let points: Point[]
    let anchors: Record<string, string>
    if (direction === "left-to-right") {
      const sourceRight = source.x + source.width
      const targetLeft = target.x
      const corridor = targetLeft > sourceRight
        ? (sourceRight + targetLeft) / 2 + laneOffset
        : Math.max(sourceRight, target.x + target.width) + 80 + edgeIndex * 18
      points = [
        { x: corridor, y: source.y + source.height / 2 },
        { x: corridor, y: target.y + target.height / 2 },
      ]
      anchors = {
        exitX: "1", exitY: "0.5", exitDx: "0", exitDy: "0",
        entryX: "0", entryY: "0.5", entryDx: "0", entryDy: "0",
      }
    } else {
      const sourceBottom = source.y + source.height
      const targetTop = target.y
      const corridor = targetTop > sourceBottom
        ? (sourceBottom + targetTop) / 2 + laneOffset
        : Math.max(sourceBottom, target.y + target.height) + 80 + edgeIndex * 18
      points = [
        { x: source.x + source.width / 2, y: corridor },
        { x: target.x + target.width / 2, y: corridor },
      ]
      anchors = {
        exitX: "0.5", exitY: "1", exitDx: "0", exitDy: "0",
        entryX: "0.5", entryY: "0", entryDx: "0", entryDy: "0",
      }
    }
    geometry.Array = {
      "@_as": "points",
      mxPoint: points.map((point) => ({ "@_x": point.x, "@_y": point.y })),
    }
    edge["@_style"] = styleWith(attribute(edge["@_style"]) || EDGE_BASE_STYLE, {
      edgeStyle: "orthogonalEdgeStyle",
      rounded: "1",
      orthogonalLoop: "1",
      jettySize: "auto",
      html: "1",
      jumpStyle: "arc",
      jumpSize: "10",
      endArrow: "block",
      endFill: "1",
      ...anchors,
    })
    changed.add(rawCellId(edge))
  }
  return [...changed]
}

async function atomicWrite(target: string, content: string, overwrite: boolean) {
  await fs.mkdir(path.dirname(target), { recursive: true })

  let exists = false
  try {
    exists = (await fs.stat(target)).isFile()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }

  if (exists && !overwrite) {
    throw new Error("target already exists; set overwrite=true to replace it with a recoverable backup")
  }

  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(temporary, content, "utf8")

  if (!exists) {
    await fs.rename(temporary, target)
    return { backup: null }
  }

  const backup = `${target}.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`
  await fs.rename(target, backup)
  try {
    await fs.rename(temporary, target)
  } catch (error) {
    await fs.rename(backup, target)
    throw error
  }
  return { backup }
}

type ExportFormat = "png" | "jpeg" | "pdf"

type ExportOptions = {
  pageId?: string
  allPages?: boolean
  scale?: number
  border?: number
  background?: string
  embedXml?: boolean
}

function positiveEnvironmentNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number`)
  }
  return parsed
}

function exportSettings() {
  const rawUrl = process.env.DRAWIO_EXPORT_URL?.trim() || DEFAULT_EXPORT_URL
  const url = new URL(rawUrl)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("DRAWIO_EXPORT_URL must use http or https")
  }
  return {
    url,
    timeoutMs: positiveEnvironmentNumber("DRAWIO_REQUEST_TIMEOUT", 60) * 1000,
    maxOutputBytes:
      positiveEnvironmentNumber("DRAWIO_MAX_OUTPUT_SIZE_MB", DEFAULT_MAX_OUTPUT_BYTES / 1024 / 1024)
      * 1024 * 1024,
  }
}

function outputExtension(format: ExportFormat): string {
  return format === "jpeg" ? ".jpeg" : `.${format}`
}

function resolveExportOutput(
  context: WorkspaceContext,
  input: string,
  output: string | undefined,
  format: ExportFormat,
): string {
  const workspace = resolveWorkspaceRoot(context)
  const requested = output?.trim()
    || workspaceRelative(context, input).replace(/\.(?:drawio|xml)$/i, outputExtension(format))
  const target = resolveWorkspaceFile(context, requested, [outputExtension(format)])
  const relative = path.relative(workspace, target)
  if (!relative || path.isAbsolute(relative)) {
    throw new Error("output file must resolve inside the current workspace")
  }
  return target
}

function validateExportBytes(content: Buffer, format: ExportFormat, contentType: string) {
  if (content.length === 0) throw new Error("export server returned an empty response")
  const expectedContentTypes: Record<ExportFormat, string[]> = {
    png: ["image/png", "application/octet-stream"],
    jpeg: ["image/jpeg", "application/octet-stream"],
    pdf: ["application/pdf", "application/octet-stream"],
  }
  if (!expectedContentTypes[format].some((expected) => contentType.includes(expected))) {
    throw new Error(`export server returned unexpected Content-Type: ${contentType || "(missing)"}`)
  }
  const valid = format === "png"
    ? content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    : format === "jpeg"
      ? content.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
      : content.subarray(0, 5).toString("ascii") === "%PDF-"
  if (!valid) throw new Error(`export server response is not a valid ${format.toUpperCase()} file`)
}

async function requestDrawioExport(
  xml: string,
  format: ExportFormat,
  options: ExportOptions = {},
): Promise<{ content: Buffer; contentType: string; exportUrl: string }> {
  const settings = exportSettings()
  const form = new URLSearchParams({ format, xml })
  if (options.pageId && !options.allPages) form.set("pageId", options.pageId)
  if (options.allPages) form.set("allPages", "1")
  if (options.scale !== undefined && options.scale !== 1) form.set("scale", String(options.scale))
  if (options.border !== undefined && options.border !== 0) form.set("border", String(options.border))
  form.set("bg", options.background?.trim() || DEFAULT_EXPORT_BACKGROUND)
  if (options.embedXml) form.set("embedXml", "1")

  let response: Response
  try {
    response = await fetch(settings.url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: form,
      redirect: "follow",
      signal: AbortSignal.timeout(settings.timeoutMs),
    })
  } catch (error) {
    throw new Error(`cannot reach Draw.io Export Server at ${settings.url}: ${(error as Error).message}`)
  }
  if (!response.ok) {
    const detail = (await response.text()).trim().slice(0, 500)
    throw new Error(
      `Draw.io Export Server returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
    )
  }
  const content = Buffer.from(await response.arrayBuffer())
  if (content.length > settings.maxOutputBytes) {
    throw new Error(`export result exceeds ${Math.floor(settings.maxOutputBytes / 1024 / 1024)} MB`)
  }
  const contentType = response.headers.get("content-type")?.toLowerCase() || ""
  validateExportBytes(content, format, contentType)
  return { content, contentType, exportUrl: settings.url.toString() }
}

async function atomicWriteBinary(target: string, content: Buffer, overwrite: boolean) {
  await fs.mkdir(path.dirname(target), { recursive: true })
  let exists = false
  try {
    exists = (await fs.stat(target)).isFile()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  if (exists && !overwrite) {
    throw new Error("output already exists; set overwrite=true to replace it")
  }
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(temporary, content)
  if (exists) await fs.rm(target)
  await fs.rename(temporary, target)
}

async function exportDiagramToFile(options: {
  context: WorkspaceContext
  inputTarget: string
  xml: string
  format: ExportFormat
  outputPath?: string
  pageId?: string
  allPages?: boolean
  scale?: number
  border?: number
  background?: string
  embedXml?: boolean
  overwrite: boolean
}) {
  const target = resolveExportOutput(
    options.context,
    options.inputTarget,
    options.outputPath,
    options.format,
  )
  const result = await requestDrawioExport(options.xml, options.format, {
    pageId: options.pageId,
    allPages: options.allPages,
    scale: options.scale,
    border: options.border,
    background: options.background,
    embedXml: options.embedXml,
  })
  await atomicWriteBinary(target, result.content, options.overwrite)
  return {
    outputTarget: target,
    bytes: result.content.length,
    contentType: result.contentType,
    exportUrl: result.exportUrl,
  }
}

async function checkExportConnectivity(): Promise<{ reachable: boolean; error?: string }> {
  const settings = exportSettings()
  const port = Number(settings.url.port || (settings.url.protocol === "https:" ? 443 : 80))
  return new Promise((resolve) => {
    const socket = createConnection({ host: settings.url.hostname, port })
    const timeout = setTimeout(() => {
      socket.destroy()
      resolve({ reachable: false, error: "connection timed out" })
    }, Math.min(settings.timeoutMs, 5000))
    socket.once("connect", () => {
      clearTimeout(timeout)
      socket.end()
      resolve({ reachable: true })
    })
    socket.once("error", (error) => {
      clearTimeout(timeout)
      resolve({ reachable: false, error: error.message })
    })
  })
}

type BridgeGrant = {
  file: string
  workspace: string
  expiresAt: number
  persistentBackup?: string | null
}

type BridgeState = {
  server: Server | null
  startPromise: Promise<{ host: string; port: number }> | null
  grants: Map<string, BridgeGrant>
}

const bridgeGlobal = globalThis as typeof globalThis & {
  __drawioExpertBridge?: BridgeState
}

function getBridgeState(): BridgeState {
  if (!bridgeGlobal.__drawioExpertBridge) {
    bridgeGlobal.__drawioExpertBridge = {
      server: null,
      startPromise: null,
      grants: new Map(),
    }
  }
  return bridgeGlobal.__drawioExpertBridge
}

function bridgeCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  }
}

function sendBridgeJson(
  response: import("node:http").ServerResponse,
  status: number,
  value: Record<string, unknown>,
) {
  response.writeHead(status, {
    ...bridgeCorsHeaders(),
    "Content-Type": "application/json; charset=utf-8",
  })
  response.end(JSON.stringify(value))
}

async function readBridgeBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_FILE_BYTES) {
      throw new Error(`request body exceeds ${MAX_FILE_BYTES / 1024 / 1024} MB`)
    }
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString("utf8")
}

async function replaceDiagramWithoutBackup(target: string, content: string) {
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
  const rollback = `${target}.${process.pid}.${Date.now()}.rollback`
  await fs.writeFile(temporary, content, "utf8")
  await fs.rename(target, rollback)
  try {
    await fs.rename(temporary, target)
    await fs.rm(rollback, { force: true })
  } catch (error) {
    await fs.rm(target, { force: true })
    await fs.rename(rollback, target)
    throw error
  }
}

async function handleBridgeRequest(
  request: IncomingMessage,
  response: import("node:http").ServerResponse,
) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, bridgeCorsHeaders())
    response.end()
    return
  }

  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`)
  if (request.method === "GET" && requestUrl.pathname === "/health") {
    sendBridgeJson(response, 200, { ok: true, service: "drawio-expert-bridge" })
    return
  }
  if (requestUrl.pathname !== "/api/diagram") {
    sendBridgeJson(response, 404, { ok: false, error: "not found" })
    return
  }

  const state = getBridgeState()
  const now = Date.now()
  for (const [authToken, grant] of state.grants) {
    if (grant.expiresAt <= now) state.grants.delete(authToken)
  }
  const authToken = requestUrl.searchParams.get("token") || ""
  const grant = state.grants.get(authToken)
  if (!grant || grant.expiresAt <= now) {
    sendBridgeJson(response, 401, { ok: false, error: "invalid or expired artifact token" })
    return
  }

  try {
    if (request.method === "GET") {
      const xml = await readDiagramFile(grant.file)
      response.writeHead(200, {
        ...bridgeCorsHeaders(),
        "Content-Type": "application/xml; charset=utf-8",
      })
      response.end(xml)
      return
    }

    if (request.method === "PUT") {
      const xml = await readBridgeBody(request)
      let pages: ParsedPage[]
      try {
        pages = parseDrawio(xml)
      } catch (error) {
        sendBridgeJson(response, 422, {
          ok: false,
          error: (error as Error).message,
        })
        return
      }
      const report = validationReport(pages)
      if (!report.valid) {
        sendBridgeJson(response, 422, {
          ok: false,
          error: "Draw.io returned an invalid document",
          validation: report,
        })
        return
      }

      if (grant.persistentBackup === undefined) {
        const write = await atomicWrite(grant.file, xml, true)
        grant.persistentBackup = write.backup
      } else {
        await replaceDiagramWithoutBackup(grant.file, xml)
      }
      grant.expiresAt = Date.now() + BRIDGE_TOKEN_TTL_MS
      sendBridgeJson(response, 200, {
        ok: true,
        file: path.relative(grant.workspace, grant.file),
        backup: grant.persistentBackup
          ? path.relative(grant.workspace, grant.persistentBackup)
          : null,
        validation: report,
      })
      return
    }

    sendBridgeJson(response, 405, { ok: false, error: "method not allowed" })
  } catch (error) {
    sendBridgeJson(response, 500, {
      ok: false,
      error: (error as Error).message,
    })
  }
}

function bridgeSettings() {
  const host = process.env.DRAWIO_BRIDGE_HOST?.trim() || "127.0.0.1"
  const rawPort = process.env.DRAWIO_BRIDGE_PORT?.trim() || "8799"
  const port = Number(rawPort)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`invalid DRAWIO_BRIDGE_PORT: ${rawPort}`)
  }
  return { host, port }
}

async function ensureBridgeStarted(): Promise<{ host: string; port: number }> {
  const state = getBridgeState()
  if (state.startPromise) return state.startPromise
  const { host, port } = bridgeSettings()
  state.startPromise = new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      void handleBridgeRequest(request, response)
    })
    const onError = (error: Error) => {
      state.server = null
      state.startPromise = null
      reject(error)
    }
    server.once("error", onError)
    server.listen(port, host, () => {
      server.off("error", onError)
      state.server = server
      resolve({ host, port })
    })
  })
  return state.startPromise
}

function normalizeWebUrl(value: string, label: string): URL {
  let result: URL
  try {
    result = new URL(value)
  } catch {
    throw new Error(`${label} must be an absolute http:// or https:// URL`)
  }
  if (!["http:", "https:"].includes(result.protocol) || result.username || result.password) {
    throw new Error(`${label} must be an http:// or https:// URL without credentials`)
  }
  result.hash = ""
  return result
}

function drawioEditorUrl(baseValue: string): URL {
  const result = normalizeWebUrl(baseValue, "drawio_url")
  result.searchParams.set("embed", "1")
  result.searchParams.set("proto", "json")
  result.searchParams.set("spin", "1")
  result.searchParams.set("libraries", "1")
  result.searchParams.set("saveAndExit", "0")
  result.searchParams.set("noSaveBtn", "0")
  result.searchParams.set("offline", "1")
  if (result.protocol === "http:") result.searchParams.set("https", "0")
  return result
}

function safeScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    const code = character.charCodeAt(0).toString(16).padStart(4, "0")
    return `\\u${code}`
  })
}

function buildDrawioArtifactHtml(options: {
  title: string
  sourceFile: string
  drawioUrl: URL
  bridgeUrl: URL
  authToken: string
  initialXml: string
}): string {
  const apiUrl = new URL("/api/diagram", options.bridgeUrl)
  apiUrl.searchParams.set("token", options.authToken)
  const config = safeScriptJson({
    title: options.title,
    sourceFile: options.sourceFile,
    drawioUrl: options.drawioUrl.toString(),
    drawioOrigin: options.drawioUrl.origin,
    apiUrl: apiUrl.toString(),
    initialXmlBase64: Buffer.from(options.initialXml, "utf8").toString("base64"),
  })

  return `<!-- ${ARTIFACT_MARKER} -->
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${xmlEscape(options.title)}</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #f7f8fa; }
    body { display: grid; grid-template-rows: 42px minmax(0, 1fr); }
    header { display: flex; align-items: center; gap: 10px; padding: 0 12px; color: #1f2937;
      background: #fff; border-bottom: 1px solid #d8dee9; font-size: 12px; }
    strong { font-size: 13px; }
    #file { color: #596579; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #status { margin-left: auto; color: #4b5563; white-space: nowrap; }
    #status[data-kind="ok"] { color: #137333; }
    #status[data-kind="error"] { color: #b42318; }
    button { border: 1px solid #c8d0dc; border-radius: 6px; background: #fff; color: #273142;
      padding: 5px 9px; cursor: pointer; }
    button:hover { background: #f1f5f9; }
    iframe { width: 100%; height: 100%; border: 0; background: #fff; }
    @media (prefers-color-scheme: dark) {
      html, body { background: #111827; }
      header { background: #18202d; color: #f3f4f6; border-color: #344054; }
      #file, #status { color: #c7d0dd; }
      button { background: #202938; color: #f3f4f6; border-color: #475467; }
    }
  </style>
</head>
<body data-drawio-expert-artifact="1">
  <header>
    <strong>Draw.io</strong>
    <span id="file"></span>
    <button id="reload" type="button">重新加载</button>
    <span id="status">正在连接…</span>
  </header>
  <iframe id="editor" title="${xmlEscape(options.title)}"></iframe>
  <script>
    const CONFIG = ${config};
    const editor = document.getElementById("editor");
    const statusNode = document.getElementById("status");
    document.getElementById("file").textContent = CONFIG.sourceFile;
    editor.src = CONFIG.drawioUrl;
    let latestXml = "";
    let saveChain = Promise.resolve();

    function setStatus(message, kind = "") {
      statusNode.textContent = message;
      statusNode.dataset.kind = kind;
    }

    function decodeInitialXml() {
      const binary = atob(CONFIG.initialXmlBase64);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }

    async function fetchWorkspaceXml() {
      const response = await fetch(CONFIG.apiUrl, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error("读取失败（HTTP " + response.status + "）");
      return response.text();
    }

    async function loadWorkspaceXml() {
      try {
        latestXml = await fetchWorkspaceXml();
        setStatus("已读取工作区文件", "ok");
      } catch (error) {
        latestXml = decodeInitialXml();
        setStatus("桥接不可用，已加载只读快照", "error");
      }
      editor.contentWindow.postMessage(JSON.stringify({
        action: "load",
        xml: latestXml,
        autosave: 1,
        saveAndExit: 0,
        noSaveBtn: 0,
        title: CONFIG.title
      }), CONFIG.drawioOrigin);
    }

    function persist(xml) {
      latestXml = xml;
      setStatus("正在保存…");
      saveChain = saveChain.catch(() => {}).then(async () => {
        const response = await fetch(CONFIG.apiUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/xml; charset=utf-8" },
          body: latestXml
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) {
          throw new Error(result.error || ("保存失败（HTTP " + response.status + "）"));
        }
        setStatus("已保存到工作区", "ok");
      }).catch(error => {
        setStatus(error.message || "保存失败", "error");
      });
      return saveChain;
    }

    window.addEventListener("message", event => {
      if (event.origin !== CONFIG.drawioOrigin || event.source !== editor.contentWindow) return;
      let message = event.data;
      if (typeof message === "string") {
        try { message = JSON.parse(message); } catch { return; }
      }
      if (!message || typeof message !== "object") return;
      if (message.event === "init") {
        void loadWorkspaceXml();
      } else if ((message.event === "autosave" || message.event === "save")
          && typeof message.xml === "string") {
        void persist(message.xml);
      }
    });

    document.getElementById("reload").addEventListener("click", () => {
      setStatus("正在重新加载…");
      void loadWorkspaceXml();
    });
  </script>
</body>
</html>
`
}

type IntegratedSessionHistory = {
  revision: number
  xml: string
  updatedBy: "editor" | "agent" | "external" | "initial" | "restore"
  updatedAt: string
}

type IntegratedSession = {
  sessionId: string
  workspace: string
  file: string
  editorUrl?: string
  revision: number
  xml: string
  fileHash: string
  updatedBy: "editor" | "agent" | "external" | "initial" | "restore"
  updatedAt: string
  history: IntegratedSessionHistory[]
  backupFile: string | null
  activeAnnotationId: string | null
  historyWarning: string | null
}

type HistorySource = "initial" | "editor" | "agent" | "external" | "restore"

type HistoryPageMeta = { id: string; name: string }

type HistorySnapshotMeta = {
  id: string
  sequence: number
  createdAt: string
  source: HistorySource
  sessionId: string | null
  sessionRevision: number
  contentHash: string
  parentSnapshotId: string | null
  restoredFromSnapshotId: string | null
  pages: HistoryPageMeta[]
  previewState: "pending" | "ready" | "failed" | "unavailable"
}

type HistoryManifest = {
  schemaVersion: 1
  file: { relativePath: string; pathKey: string }
  nextSequence: number
  entries: HistorySnapshotMeta[]
}

type HistoryPendingEditor = {
  timer: NodeJS.Timeout
  sessionId: string
  revision: number
  hash: string
}

type IntegratedToken = {
  sessionId: string
  expiresAt: number
}

type AnnotationRegion = {
  x: number
  y: number
  width: number
  height: number
}

type AnnotationCell = {
  id: string
  kind: "node" | "edge"
  label: string
  source?: string
  target?: string
}

type AnnotationResult = {
  summary: string
  changedIds: string[]
  revision: number
  updatedAt: string
} | null

type AnnotationScope = "selection_only" | "selection_and_edges" | "surrounding_layout"

type AnnotationAuthorization = {
  token: string
  scope: AnnotationScope
  plan: string
  proposedChangedIds: string[]
  escalationReason: string | null
  baseRevision: number
  approvedAt: string
  consumedAt: string | null
} | null

type AnnotationTask = {
  id: string
  sessionId: string
  file: string
  pageId: string
  pageName: string
  cells: AnnotationCell[]
  region: AnnotationRegion | null
  instruction: string
  scope: AnnotationScope
  authorization: AnnotationAuthorization
  status: "open" | "resolved" | "stale"
  baseRevision: number
  result: AnnotationResult
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

type AnnotationEffectiveState = {
  status: "open" | "resolved"
  freshness: "fresh" | "stale"
  requiresConfirmation: boolean
  staleReason?: string
}

type IntegratedBridgeState = {
  server: Server | null
  startPromise: Promise<{ host: string; port: number }> | null
  host: string
  port: number
  sessions: Map<string, IntegratedSession>
  tokens: Map<string, IntegratedToken>
  eventClients: Map<string, Set<import("node:http").ServerResponse>>
  writeQueues: Map<string, Promise<unknown>>
  annotations: Map<string, Map<string, AnnotationTask>>
  historyWriteQueues: Map<string, Promise<unknown>>
  historyDebounce: Map<string, HistoryPendingEditor>
  previewInFlight: Map<string, Promise<Buffer>>
  previewActive: number
  previewWaiters: Array<() => void>
}

const integratedBridgeGlobal = globalThis as typeof globalThis & {
  __drawioIntegratedBridge?: IntegratedBridgeState
}

function getIntegratedBridgeState(): IntegratedBridgeState {
  if (!integratedBridgeGlobal.__drawioIntegratedBridge) {
    integratedBridgeGlobal.__drawioIntegratedBridge = {
      server: null,
      startPromise: null,
      host: "127.0.0.1",
      port: 0,
      sessions: new Map(),
      tokens: new Map(),
      eventClients: new Map(),
      writeQueues: new Map(),
      annotations: new Map(),
      historyWriteQueues: new Map(),
      historyDebounce: new Map(),
      previewInFlight: new Map(),
      previewActive: 0,
      previewWaiters: [],
    }
  }
  integratedBridgeGlobal.__drawioIntegratedBridge.writeQueues ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.annotations ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.historyWriteQueues ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.historyDebounce ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.previewInFlight ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.previewActive ||= 0
  integratedBridgeGlobal.__drawioIntegratedBridge.previewWaiters ||= []
  return integratedBridgeGlobal.__drawioIntegratedBridge
}

function integratedHash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

function integratedRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function integratedSource(value: unknown): "editor" | "agent" {
  return value === "editor" ? "editor" : "agent"
}

function annotationScope(value: unknown): AnnotationScope {
  if (value === "selection_and_edges" || value === "surrounding_layout") return value
  return "selection_only"
}

function annotationScopeLabel(scope: AnnotationScope): string {
  if (scope === "selection_and_edges") return "允许调整关联连线"
  if (scope === "surrounding_layout") return "允许调整周边布局"
  return "只修改选区"
}

function annotationScopeRank(scope: AnnotationScope): number {
  if (scope === "selection_and_edges") return 1
  if (scope === "surrounding_layout") return 2
  return 0
}

function integratedHistoryPush(session: IntegratedSession) {
  session.history.push({
    revision: session.revision,
    xml: session.xml,
    updatedBy: session.updatedBy,
    updatedAt: session.updatedAt,
  })
  if (session.history.length > SESSION_HISTORY_LIMIT) {
    session.history.splice(0, session.history.length - SESSION_HISTORY_LIMIT)
  }
}

function integratedManualChanges(session: IntegratedSession, baseRevision: number) {
  const base = session.history.find((entry) => entry.revision === baseRevision)
  if (!base) {
    return {
      available: false,
      reason: "base revision is no longer in the in-memory history",
    }
  }

  try {
    return {
      available: true,
      fromRevision: baseRevision,
      toRevision: session.revision,
      diff: diffParsedPages(parseDrawio(base.xml), parseDrawio(session.xml)),
    }
  } catch (error) {
    return {
      available: false,
      reason: `unable to calculate revision diff: ${(error as Error).message}`,
    }
  }
}

async function refreshIntegratedSession(session: IntegratedSession) {
  const diskXml = await readDiagramFile(session.file)
  const diskHash = integratedHash(diskXml)
  if (diskHash === session.fileHash) return session

  const pages = parseDrawio(diskXml)
  const report = validationReport(pages)
  if (!report.valid) {
    throw new Error(`workspace file changed to invalid Draw.io XML: ${JSON.stringify(report.errors)}`)
  }

  integratedHistoryPush(session)
  session.revision += 1
  session.xml = diskXml
  session.fileHash = diskHash
  session.updatedBy = "external"
  session.updatedAt = new Date().toISOString()
  broadcastIntegratedRevision(session)
  await createHistorySnapshot(session, { source: "external", xml: diskXml, sessionRevision: session.revision })
  return session
}

function integratedSessionFor(
  context: { sessionID?: string; directory: string; worktree?: string },
  target: string,
): IntegratedSession | null {
  const sessionId = context.sessionID?.trim()
  if (!sessionId) return null
  const session = getIntegratedBridgeState().sessions.get(sessionId)
  if (!session || path.resolve(session.file) !== path.resolve(target)) return null
  return session
}

async function integratedCommit(
  session: IntegratedSession,
  xml: string,
  baseRevision: number,
  source: "editor" | "agent",
  clientId: string | null = null,
) {
  const state = getIntegratedBridgeState()
  const queueKey = path.resolve(session.file).toLowerCase()
  const previous = state.writeQueues.get(queueKey) || Promise.resolve()
  const operation = previous.catch(() => undefined).then(async () => {
    // LP semantics: refresh and compare inside the serialized critical section.
    // No writer can pass the same revision check concurrently.
    await refreshIntegratedSession(session)
    if (baseRevision !== session.revision) {
      return {
        conflict: true as const,
        current: session,
        manualChanges: integratedManualChanges(session, baseRevision),
      }
    }

    const pages = parseDrawio(xml)
    const report = validationReport(pages)
    if (!report.valid) {
      return { invalid: true as const, report }
    }

    integratedHistoryPush(session)
    if (!session.backupFile) {
      const write = await atomicWrite(session.file, xml, true)
      session.backupFile = write.backup
    } else {
      await replaceDiagramWithoutBackup(session.file, xml)
    }

    session.revision += 1
    session.xml = xml
    session.fileHash = integratedHash(xml)
    session.updatedBy = source
    session.updatedAt = new Date().toISOString()
    broadcastIntegratedRevision(session, clientId)
    if (source === "agent") {
      // A history-record failure must never roll back or fail the actual save.
      // Only the pre-restore checkpoint in the restore transaction is mandatory.
      try {
        await createHistorySnapshot(session, { source: "agent", xml, sessionRevision: session.revision })
      } catch (error) {
        console.warn(`history snapshot record failed for ${session.file}: ${(error as Error).message}`)
      }
    } else {
      scheduleEditorHistoryCheckpoint(session)
    }
    return {
      conflict: false as const,
      document: session,
      validation: report,
    }
  })
  state.writeQueues.set(queueKey, operation)
  void operation.catch(() => undefined).finally(() => {
    if (state.writeQueues.get(queueKey) === operation) state.writeQueues.delete(queueKey)
  })
  return operation
}

function integratedTokenSession(request: IncomingMessage): {
  sessionKey: string
  session: IntegratedSession
} | null {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`)
  const sessionKey = requestUrl.searchParams.get("token") || ""
  const tokenState = getIntegratedBridgeState().tokens.get(sessionKey)
  if (!tokenState || tokenState.expiresAt <= Date.now()) {
    getIntegratedBridgeState().tokens.delete(sessionKey)
    return null
  }
  const session = getIntegratedBridgeState().sessions.get(tokenState.sessionId)
  if (!session) return null
  tokenState.expiresAt = Date.now() + BRIDGE_TOKEN_TTL_MS
  return { sessionKey, session }
}

function integratedJsonResponse(
  response: import("node:http").ServerResponse,
  status: number,
  payload: Record<string, unknown>,
) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  })
  response.end(JSON.stringify(payload))
}

async function integratedRequestJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await readBridgeBody(request)
  const parsed: unknown = JSON.parse(body)
  if (!integratedRecord(parsed)) throw new Error("request body must be a JSON object")
  return parsed
}

function integratedDocumentPayload(session: IntegratedSession) {
  return {
    sessionId: session.sessionId,
    file: path.relative(session.workspace, session.file).split(path.sep).join("/"),
    revision: session.revision,
    xml: session.xml,
    updatedBy: session.updatedBy,
    updatedAt: session.updatedAt,
    backup: session.backupFile
      ? path.relative(session.workspace, session.backupFile).split(path.sep).join("/")
      : null,
  }
}

function broadcastIntegratedRevision(session: IntegratedSession, clientId: string | null = null) {
  const payload = `event: diagram\\ndata: ${JSON.stringify({
    revision: session.revision,
    updatedBy: session.updatedBy,
    updatedAt: session.updatedAt,
    clientId,
  })}\\n\\n`
  for (const response of getIntegratedBridgeState().eventClients.get(session.sessionId) || []) {
    response.write(payload)
  }
}

// ---------------------------------------------------------------------------
// Persistent user-visible diagram history
// ---------------------------------------------------------------------------
// Storage layout (runtime data, never part of the generated Expert package):
//   <workspace>/.mobilework/drawio-history/v1/<basename>--<pathHash12>/
//     manifest.json
//     snapshots/<snapshotId>.drawio
//     previews/<snapshotId>/<pageKey>-thumb.png
//     previews/<snapshotId>/<pageKey>-preview.png
// Every manifest and snapshot write is atomic (temp file + rename).

function historyRoot(workspace: string): string {
  return path.join(workspace, ".mobilework", "drawio-history", "v1")
}

function historyPathHash(relativePath: string): string {
  return createHash("sha256").update(relativePath.replace(/\\/g, "/"), "utf8").digest("hex").slice(0, 12)
}

function historyFileKey(session: IntegratedSession): string {
  const relative = path.relative(session.workspace, session.file).split(path.sep).join("/")
  return `${path.basename(session.file)}--${historyPathHash(relative)}`
}

function assertHistoryContained(root: string, target: string): string {
  const resolved = path.resolve(target)
  const rootResolved = path.resolve(root)
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + path.sep)) {
    throw new Error("history path escapes the history directory")
  }
  return resolved
}

function historyDirectoryFor(session: IntegratedSession): string {
  return assertHistoryContained(
    historyRoot(session.workspace),
    path.join(historyRoot(session.workspace), historyFileKey(session)),
  )
}

function historyManifestPath(session: IntegratedSession): string {
  return path.join(historyDirectoryFor(session), "manifest.json")
}

function snapshotFileFor(session: IntegratedSession, snapshotId: string): string {
  if (!HISTORY_SNAPSHOT_ID_RE.test(snapshotId)) throw new Error("invalid snapshot id")
  return assertHistoryContained(
    historyDirectoryFor(session),
    path.join(historyDirectoryFor(session), "snapshots", `${snapshotId}.drawio`),
  )
}

function historyPageKey(pageId: string): string {
  const sanitized = String(pageId).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 120)
  if (!sanitized) throw new Error("invalid page id")
  return sanitized
}

function previewFileFor(
  session: IntegratedSession,
  snapshotId: string,
  pageId: string,
  mode: "thumb" | "preview",
): string {
  if (!HISTORY_SNAPSHOT_ID_RE.test(snapshotId)) throw new Error("invalid snapshot id")
  const pageKey = historyPageKey(pageId)
  const name = mode === "preview" ? `${pageKey}-preview.png` : `${pageKey}-thumb.png`
  return assertHistoryContained(
    historyDirectoryFor(session),
    path.join(historyDirectoryFor(session), "previews", snapshotId, name),
  )
}

function isHistorySnapshotMeta(value: unknown): value is HistorySnapshotMeta {
  if (!integratedRecord(value)) return false
  if (typeof value.id !== "string" || !HISTORY_SNAPSHOT_ID_RE.test(value.id)) return false
  if (!Number.isInteger(value.sequence)) return false
  if (typeof value.createdAt !== "string") return false
  if (!["initial", "editor", "agent", "external", "restore"].includes(value.source)) return false
  if (value.sessionId !== null && typeof value.sessionId !== "string") return false
  if (!Number.isInteger(value.sessionRevision)) return false
  if (typeof value.contentHash !== "string") return false
  if (value.parentSnapshotId !== null && typeof value.parentSnapshotId !== "string") return false
  if (value.restoredFromSnapshotId !== null && typeof value.restoredFromSnapshotId !== "string") return false
  if (!Array.isArray(value.pages)) return false
  for (const page of value.pages) {
    if (!integratedRecord(page) || typeof page.id !== "string" || typeof page.name !== "string") return false
  }
  if (!["pending", "ready", "failed", "unavailable"].includes(value.previewState)) return false
  return true
}

function isHistoryManifest(value: unknown): value is HistoryManifest {
  if (!integratedRecord(value)) return false
  if (value.schemaVersion !== HISTORY_SCHEMA_VERSION) return false
  if (!integratedRecord(value.file)) return false
  if (typeof value.file.relativePath !== "string" || typeof value.file.pathKey !== "string") return false
  if (!Number.isInteger(value.nextSequence) || (value.nextSequence as number) < 1) return false
  if (!Array.isArray(value.entries)) return false
  for (const entry of value.entries) {
    if (!isHistorySnapshotMeta(entry)) return false
  }
  return true
}

async function readHistoryManifest(session: IntegratedSession): Promise<HistoryManifest | null> {
  const file = historyManifestPath(session)
  let raw: string
  try {
    raw = await fs.readFile(file, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(
      `history manifest for ${historyFileKey(session)} is corrupted: ${(error as Error).message}`,
    )
  }
  if (!isHistoryManifest(parsed)) {
    throw new Error(`history manifest for ${historyFileKey(session)} failed schema validation`)
  }
  return parsed
}

async function writeHistoryManifestAtomic(session: IntegratedSession, manifest: HistoryManifest): Promise<void> {
  if (testFaultInjected("manifest")) throw new Error("injected history manifest write failure")
  const target = historyManifestPath(session)
  await fs.mkdir(path.dirname(target), { recursive: true })
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(temporary, JSON.stringify(manifest, null, 2), "utf8")
  await fs.rename(temporary, target)
}

// Test-only fault injection. Used by the integration tests to prove the
// partial-success and retention-atomicity guarantees; never enabled in normal
// operation. Set via globalThis.__drawioHistoryFaults = { snapshotXml: true, ... }.
function testFaultInjected(kind: "snapshotXml" | "manifest" | "preRestoreCheckpoint" | "annotationsFile"): boolean {
  const faults = (globalThis as typeof globalThis & {
    __drawioHistoryFaults?: Record<string, boolean>
  }).__drawioHistoryFaults
  return faults?.[kind] === true
}

function historySnapshotId(): string {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
  return `h_${timestamp}_${randomBytes(4).toString("hex")}`
}

function historySourceForUpdatedBy(updatedBy: IntegratedSession["updatedBy"]): HistorySource {
  if (
    updatedBy === "editor" || updatedBy === "agent"
    || updatedBy === "external" || updatedBy === "initial" || updatedBy === "restore"
  ) return updatedBy
  return "initial"
}

function broadcastHistory(
  session: IntegratedSession,
  kind: string,
  payload: Record<string, unknown>,
): void {
  const data = `event: history\\ndata: ${JSON.stringify({ kind, ...payload })}\\n\\n`
  for (const response of getIntegratedBridgeState().eventClients.get(session.sessionId) || []) {
    response.write(data)
  }
}

function historyQueueKey(session: IntegratedSession): string {
  return path.resolve(historyDirectoryFor(session)).toLowerCase()
}

function enqueueHistoryTask<T>(key: string, task: () => Promise<T>): Promise<T> {
  const state = getIntegratedBridgeState()
  const previous = state.historyWriteQueues.get(key) || Promise.resolve()
  const operation = previous.catch(() => undefined).then(task)
  state.historyWriteQueues.set(key, operation)
  // Swallow the rejection on the cleanup chain so a failed task never surfaces
  // as an unhandled rejection; the original `operation` is still returned to
  // the awaiting caller.
  void operation.catch(() => undefined).finally(() => {
    if (state.historyWriteQueues.get(key) === operation) state.historyWriteQueues.delete(key)
  })
  return operation
}

async function cleanupEvictedHistoryFiles(session: IntegratedSession, snapshotIds: string[]): Promise<void> {
  try {
    for (const id of snapshotIds) {
      await fs.rm(snapshotFileFor(session, id), { force: true })
      const previewDir = assertHistoryContained(
        historyDirectoryFor(session),
        path.join(historyDirectoryFor(session), "previews", id),
      )
      await fs.rm(previewDir, { recursive: true, force: true })
    }
  } catch (error) {
    // Retention cleanup is best-effort; a failed cleanup never rolls back a
    // committed snapshot. Orphan files are retried on the next write.
    console.warn(`history cleanup failed for ${historyFileKey(session)}: ${(error as Error).message}`)
  }
}

function retainHistoryEntries(manifest: HistoryManifest): string[] {
  const evicted: string[] = []
  while (manifest.entries.length > HISTORY_MAX_ENTRIES) {
    const oldest = manifest.entries.shift()
    if (oldest) evicted.push(oldest.id)
  }
  // Deliberately does not touch disk: files are only removed after the new
  // manifest has been durably committed (see createHistorySnapshot).
  return evicted
}

async function createHistorySnapshot(
  session: IntegratedSession,
  options: {
    source: HistorySource
    xml: string
    sessionRevision?: number
    sessionId?: string | null
    restoredFromSnapshotId?: string | null
    force?: boolean
  },
): Promise<{ created: boolean; snapshot: HistorySnapshotMeta | null }> {
  return enqueueHistoryTask(historyQueueKey(session), async () => {
    const manifest = (await readHistoryManifest(session)) || {
      schemaVersion: HISTORY_SCHEMA_VERSION,
      file: {
        relativePath: path.relative(session.workspace, session.file).split(path.sep).join("/"),
        pathKey: historyFileKey(session),
      },
      nextSequence: 1,
      entries: [],
    }
    const contentHash = integratedHash(options.xml)
    const pages = parseDrawio(options.xml).map((page) => ({ id: page.id, name: page.name }))
    const latest = manifest.entries[manifest.entries.length - 1] || null
    if (!options.force && latest && latest.contentHash === contentHash) {
      return { created: false, snapshot: latest }
    }
    const id = historySnapshotId()
    const snapshot: HistorySnapshotMeta = {
      id,
      sequence: manifest.nextSequence,
      createdAt: new Date().toISOString(),
      source: options.source,
      sessionId: options.sessionId ?? session.sessionId,
      sessionRevision: options.sessionRevision ?? session.revision,
      contentHash,
      parentSnapshotId: latest ? latest.id : null,
      restoredFromSnapshotId: options.restoredFromSnapshotId ?? null,
      pages,
      previewState: "pending",
    }
    const snapshotFile = snapshotFileFor(session, id)
    if (testFaultInjected("snapshotXml")) throw new Error("injected snapshot xml write failure")
    await fs.mkdir(path.dirname(snapshotFile), { recursive: true })
    const temporary = `${snapshotFile}.${process.pid}.${Date.now()}.tmp`
    await fs.writeFile(temporary, options.xml, "utf8")
    await fs.rename(temporary, snapshotFile)
    manifest.entries.push(snapshot)
    manifest.nextSequence += 1
    // Retention only computes which entries to evict; the disk files for the
    // evicted snapshots are deleted only after the new manifest is committed.
    const evicted = retainHistoryEntries(manifest)
    await writeHistoryManifestAtomic(session, manifest)
    if (evicted.length > 0) {
      void cleanupEvictedHistoryFiles(session, evicted)
    }
    if (pages.length > 0) {
      void enqueueHistoryPreview(session, snapshot.id, pages[0].id, "thumb")
    }
    for (const evictedId of evicted) {
      broadcastHistory(session, "snapshot-evicted", { snapshotId: evictedId })
    }
    broadcastHistory(session, "snapshot-created", {
      snapshotId: snapshot.id,
      sequence: snapshot.sequence,
      source: snapshot.source,
    })
    return { created: true, snapshot }
  })
}

async function setSnapshotPreviewState(
  session: IntegratedSession,
  snapshotId: string,
  previewState: HistorySnapshotMeta["previewState"],
): Promise<void> {
  await enqueueHistoryTask(historyQueueKey(session), async () => {
    const manifest = await readHistoryManifest(session)
    if (!manifest) return
    const entry = manifest.entries.find((candidate) => candidate.id === snapshotId)
    if (!entry) return
    entry.previewState = previewState
    await writeHistoryManifestAtomic(session, manifest)
  })
}

async function readSnapshotXml(session: IntegratedSession, snapshotId: string, expectedHash?: string): Promise<string> {
  const raw = await fs.readFile(snapshotFileFor(session, snapshotId), "utf8")
  if (Buffer.byteLength(raw, "utf8") > MAX_FILE_BYTES) {
    throw new Error("snapshot exceeds the size limit")
  }
  if (expectedHash && integratedHash(raw) !== expectedHash) {
    throw new Error("snapshot content hash mismatch")
  }
  return raw
}

async function acquirePreviewSlot(): Promise<void> {
  const state = getIntegratedBridgeState()
  while (state.previewActive >= HISTORY_PREVIEW_CONCURRENCY) {
    await new Promise<void>((resolve) => state.previewWaiters.push(resolve))
  }
  state.previewActive += 1
}

function releasePreviewSlot(): void {
  const state = getIntegratedBridgeState()
  state.previewActive -= 1
  const next = state.previewWaiters.shift()
  if (next) next()
}

async function generateHistoryPreview(
  session: IntegratedSession,
  snapshotId: string,
  pageId: string,
  mode: "thumb" | "preview",
): Promise<Buffer> {
  const state = getIntegratedBridgeState()
  const key = `${snapshotId}|${historyPageKey(pageId)}|${mode}`
  const inFlight = state.previewInFlight.get(key)
  if (inFlight) return inFlight
  const task = (async () => {
    await acquirePreviewSlot()
    try {
      const manifest = await readHistoryManifest(session)
      const entry = manifest?.entries.find((candidate) => candidate.id === snapshotId)
      if (!entry) throw new Error("snapshot not found in preview")
      const xml = await readSnapshotXml(session, snapshotId, entry.contentHash)
      const page = parseDrawio(xml).find((candidate) => candidate.id === pageId)
      if (!page) throw new Error("page not found in snapshot")
      const exported = await requestDrawioExport(xml, "png", {
        pageId,
        scale: mode === "thumb" ? HISTORY_THUMB_SCALE : 1,
        background: "#ffffff",
      })
      if (exported.content.length > HISTORY_PREVIEW_MAX_BYTES) {
        throw new Error("preview exceeds the size limit")
      }
      const target = previewFileFor(session, snapshotId, pageId, mode)
      await fs.mkdir(path.dirname(target), { recursive: true })
      const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
      await fs.writeFile(temporary, exported.content)
      await fs.rename(temporary, target)
      if (mode === "thumb") await setSnapshotPreviewState(session, snapshotId, "ready")
      broadcastHistory(session, "preview-ready", { snapshotId, pageId, mode })
      return exported.content
    } catch (error) {
      if (mode === "thumb") await setSnapshotPreviewState(session, snapshotId, "failed")
      broadcastHistory(session, "preview-failed", {
        snapshotId,
        pageId,
        mode,
        error: (error as Error).message,
      })
      throw error
    } finally {
      releasePreviewSlot()
      state.previewInFlight.delete(key)
    }
  })()
  state.previewInFlight.set(key, task)
  return task
}

function enqueueHistoryPreview(
  session: IntegratedSession,
  snapshotId: string,
  pageId: string,
  mode: "thumb" | "preview",
): void {
  void generateHistoryPreview(session, snapshotId, pageId, mode).catch(() => undefined)
}

// Editor checkpoint debounce: consecutive quick user saves merge into a single
// "editor" checkpoint that is created after a quiet 2s window.
function scheduleEditorHistoryCheckpoint(session: IntegratedSession): void {
  const state = getIntegratedBridgeState()
  const key = historyFileKey(session)
  const pending = state.historyDebounce.get(key)
  if (pending) clearTimeout(pending.timer)
  const timer = setTimeout(() => {
    void flushEditorHistoryCheckpointNow(session.sessionId, key)
      .catch(error => console.warn(`editor history checkpoint failed for ${session.file}: ${(error as Error).message}`))
  }, HISTORY_EDITOR_DEBOUNCE_MS)
  if (typeof timer.unref === "function") timer.unref()
  state.historyDebounce.set(key, {
    timer,
    sessionId: session.sessionId,
    revision: session.revision,
    hash: session.fileHash,
  })
}

async function flushEditorHistoryCheckpointNow(
  sessionId: string,
  key: string,
): Promise<void> {
  const state = getIntegratedBridgeState()
  const pending = state.historyDebounce.get(key)
  if (pending) {
    clearTimeout(pending.timer)
    state.historyDebounce.delete(key)
  }
  if (!pending) return
  const session = state.sessions.get(sessionId)
  if (!session) return
  // The checkpoint is skipped when a newer commit (agent/external/restore) has
  // already superseded the pending editor state.
  if (session.revision !== pending.revision || session.fileHash !== pending.hash) return
  await createHistorySnapshot(session, {
    source: "editor",
    xml: session.xml,
    sessionRevision: pending.revision,
  })
}

async function flushEditorHistoryCheckpoint(session: IntegratedSession): Promise<void> {
  await flushEditorHistoryCheckpointNow(session.sessionId, historyFileKey(session))
}

// On first bind, record an initial snapshot. On re-bind after a runtime
// restart, record a rediscovered "external" checkpoint when the on-disk
// content differs from the last durable snapshot.
async function quarantineCorruptHistory(session: IntegratedSession): Promise<void> {
  try {
    const target = historyManifestPath(session)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    await fs.rename(target, `${target}.corrupt-${timestamp}`)
    console.warn(
      `quarantined corrupt history manifest for ${historyFileKey(session)} to ${path.basename(target)}.corrupt-${timestamp}`,
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(
        `unable to quarantine corrupt history manifest for ${historyFileKey(session)}: ${(error as Error).message}`,
      )
    }
  }
}

async function reconcileCurrentCheckpoint(session: IntegratedSession): Promise<void> {
  const manifest = await readHistoryManifest(session)
  const latest = manifest && manifest.entries.length > 0
    ? manifest.entries[manifest.entries.length - 1]
    : null
  if (!latest) {
    await createHistorySnapshot(session, {
      source: historySourceForUpdatedBy(session.updatedBy),
      xml: session.xml,
      sessionRevision: session.revision,
    })
    return
  }
  if (latest.contentHash !== session.fileHash) {
    await createHistorySnapshot(session, {
      source: historySourceForUpdatedBy(session.updatedBy),
      xml: session.xml,
      sessionRevision: session.revision,
    })
  }
}

async function bindHistoryCheckpoint(session: IntegratedSession): Promise<void> {
  // History is an auxiliary capability: a corrupted manifest or an unwritable
  // history directory must never prevent a valid .drawio file from opening,
  // reading or continuing to be edited. On corruption we quarantine the bad
  // manifest so history can be re-initialized, and surface a diagnostic.
  let manifest: HistoryManifest | null = null
  try {
    manifest = await readHistoryManifest(session)
  } catch (error) {
    session.historyWarning = `history re-initialized: previous manifest was corrupted (${(error as Error).message})`
    console.warn(`${session.historyWarning} for ${historyFileKey(session)}`)
    await quarantineCorruptHistory(session)
    return
  }
  const latest = manifest && manifest.entries.length > 0
    ? manifest.entries[manifest.entries.length - 1]
    : null
  try {
    if (!latest) {
      await createHistorySnapshot(session, {
        source: "initial",
        xml: session.xml,
        sessionRevision: session.revision,
      })
    } else if (latest.contentHash !== session.fileHash) {
      // A fresh session cannot know who changed the file while the runtime was
      // stopped or history lagged, so a rediscovered version is recorded as
      // "external" (the checkpoint-type convention for re-discovered content).
      await createHistorySnapshot(session, {
        source: "external",
        xml: session.xml,
        sessionRevision: session.revision,
      })
    }
  } catch (error) {
    session.historyWarning = `history disabled: ${(error as Error).message}`
    console.warn(`${session.historyWarning} for ${historyFileKey(session)}`)
  }
}

// Restore transaction: verify revision, persist the current checkpoint, then
// write the target snapshot as a brand new revision inside the file write queue.
async function restoreHistorySnapshot(
  session: IntegratedSession,
  snapshotId: string,
  baseRevision: number,
  clientId: string | null,
): Promise<
  | { ok: true; document: IntegratedSession; snapshot: HistorySnapshotMeta; restoredFromSequence: number; annotationInvalidationWarning: string | null }
  | { conflict: true; current: IntegratedSession }
  | { invalid: true; error: string }
  | { checkpointFailed: true; error: string }
  | { partFailed: true; document: IntegratedSession; message: string }
> {
  const state = getIntegratedBridgeState()
  const queueKey = path.resolve(session.file).toLowerCase()
  const previous = state.writeQueues.get(queueKey) || Promise.resolve()
  const operation = previous.catch(() => undefined).then(async () => {
    await refreshIntegratedSession(session)
    if (baseRevision !== session.revision) {
      return { conflict: true as const, current: session }
    }
    const manifest = await readHistoryManifest(session)
    if (!manifest) return { invalid: true as const, error: "snapshot_not_found" }
    const target = manifest.entries.find((entry) => entry.id === snapshotId)
    if (!target) return { invalid: true as const, error: "snapshot_not_found" }

    // 1. Persist the pre-restore current version. Failing this aborts restore
    //    before any target XML is written; file, revision and annotations stay
    //    untouched.
    if (testFaultInjected("preRestoreCheckpoint")) {
      return {
        checkpointFailed: true as const,
        error: "injected pre-restore checkpoint failure",
      }
    }
    try {
      await flushEditorHistoryCheckpoint(session)
      await createHistorySnapshot(session, {
        source: historySourceForUpdatedBy(session.updatedBy),
        xml: session.xml,
        sessionRevision: session.revision,
      })
    } catch (error) {
      return {
        checkpointFailed: true as const,
        error: `pre-restore checkpoint failed: ${(error as Error).message}`,
      }
    }

    // 2. Read and validate the target snapshot XML. The stored contentHash must
    //    match the on-disk bytes; a valid-but-tampered snapshot is still rejected.
    //    Damage is detected before the no-op decision, so a damaged snapshot is
    //    always reported as damaged even when it describes the current content.
    let snapshotXml: string
    try {
      snapshotXml = await readSnapshotXml(session, target.id, target.contentHash)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { invalid: true as const, error: "snapshot_not_found" }
      }
      return {
        invalid: true as const,
        error: `snapshot_damaged: ${(error as Error).message}`,
      }
    }
    let report: ReturnType<typeof validationReport>
    try {
      report = validationReport(parseDrawio(snapshotXml))
    } catch (error) {
      return {
        invalid: true as const,
        error: `snapshot_damaged: ${(error as Error).message}`,
      }
    }
    if (!report.valid) {
      return {
        invalid: true as const,
        error: `snapshot_damaged: ${JSON.stringify(report.errors)}`,
      }
    }
    // Restoring the current content would only create a meaningless revision;
    // the UI disables it and the server rejects it as well. "Current" is decided
    // by content hash against the live diagram, NOT by the last manifest entry:
    // after a history-record failure the manifest tail may still be an older
    // version while the file is already the new one.
    if (target.contentHash === session.fileHash) {
      return { invalid: true as const, error: "current_snapshot" }
    }

    // 3. Write the restored XML as a new current revision.
    await replaceDiagramWithoutBackup(session.file, snapshotXml)
    integratedHistoryPush(session)
    session.revision += 1
    session.xml = snapshotXml
    session.fileHash = integratedHash(snapshotXml)
    session.updatedBy = "restore"
    session.updatedAt = new Date().toISOString()

    // 4. Invalidate unconsumed annotation authorizations and the active task.
    //    The in-memory invalidation happens first; a sidecar file write failure
    //    must not turn a successful restore into a plain 500. The revision bump
    //    already makes any stale approval token unusable regardless.
    let annotationInvalidationWarning: string | null = null
    try {
      await invalidateAnnotationAuthorizations(session)
    } catch (error) {
      annotationInvalidationWarning =
        `diagram restored, but annotation invalidation could not be persisted: ${(error as Error).message}`
      console.warn(annotationInvalidationWarning)
    }
    try {
      broadcastIntegratedRevision(session, clientId)
    } catch (error) {
      console.warn(`diagram revision broadcast failed: ${(error as Error).message}`)
    }

    // 5. Record the append-only restore snapshot (never deduped). Any failure
    //    here must surface as an explicit partial success: the diagram HAS been
    //    restored, but history recording failed. Never collapse that into a
    //    plain 500 that leaves the client believing nothing changed.
    const restoredFromSequence = target.sequence
    let created: { created: boolean; snapshot: HistorySnapshotMeta | null }
    try {
      created = await createHistorySnapshot(session, {
        source: "restore",
        xml: snapshotXml,
        sessionRevision: session.revision,
        restoredFromSnapshotId: target.id,
        force: true,
      })
    } catch (error) {
      return {
        partFailed: true as const,
        document: session,
        message: annotationInvalidationWarning
          ? `${annotationInvalidationWarning} restore snapshot also failed: ${(error as Error).message}`
          : `diagram restored, but the restore snapshot could not be recorded: ${(error as Error).message}`,
      }
    }
    if (!created.created || !created.snapshot) {
      return {
        partFailed: true as const,
        document: session,
        message: annotationInvalidationWarning
          ? annotationInvalidationWarning
          : "diagram restored, but the restore snapshot could not be recorded",
      }
    }
    return {
      ok: true as const,
      document: session,
      snapshot: created.snapshot,
      restoredFromSequence,
      annotationInvalidationWarning,
    }
  })
  state.writeQueues.set(queueKey, operation)
  void operation.catch(() => undefined).finally(() => {
    if (state.writeQueues.get(queueKey) === operation) state.writeQueues.delete(queueKey)
  })
  return operation
}

async function invalidateAnnotationAuthorizations(session: IntegratedSession): Promise<void> {
  const map = getSessionAnnotations(session.sessionId)
  const now = new Date().toISOString()
  let changed = false
  for (const task of map.values()) {
    if (task.status === "resolved") continue
    if (task.authorization) {
      task.authorization = null
      task.updatedAt = now
      changed = true
    }
  }
  if (session.activeAnnotationId) {
    session.activeAnnotationId = null
    changed = true
  }
  if (changed) await persistStoredAnnotations(session)
}

function annotationStorePath(session: IntegratedSession): string {
  const base = session.file.replace(/\.(drawio|xml)$/i, "")
  return `${base}.annotations.json`
}

function getSessionAnnotations(sessionId: string): Map<string, AnnotationTask> {
  const state = getIntegratedBridgeState()
  let map = state.annotations.get(sessionId)
  if (!map) {
    map = new Map()
    state.annotations.set(sessionId, map)
  }
  return map
}

async function loadStoredAnnotations(session: IntegratedSession): Promise<void> {
  if (session.workspace === undefined) return
  const map = getSessionAnnotations(session.sessionId)
  if (map.size > 0) return
  let store: string
  try {
    store = await fs.readFile(annotationStorePath(session), "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    return
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(store)
  } catch {
    return
  }
  if (!Array.isArray(parsed)) return
  for (const entry of parsed) {
    if (!integratedRecord(entry) || typeof entry.id !== "string" || typeof entry.sessionId !== "string") continue
    if (entry.sessionId !== session.sessionId) continue
    const task = normalizeAnnotationTask(entry, session)
    if (task) map.set(task.id, task)
  }
}

async function persistStoredAnnotations(session: IntegratedSession): Promise<void> {
  if (testFaultInjected("annotationsFile")) throw new Error("injected annotation sidecar write failure")
  const map = getSessionAnnotations(session.sessionId)
  const store = [...map.values()].map((task) => ({
    id: task.id,
    sessionId: task.sessionId,
    file: task.file,
    pageId: task.pageId,
    pageName: task.pageName,
    cells: task.cells,
    region: task.region,
    instruction: task.instruction,
    scope: task.scope,
    status: task.status,
    baseRevision: task.baseRevision,
    result: task.result,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    resolvedAt: task.resolvedAt,
  }))
  const target = annotationStorePath(session)
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(temporary, JSON.stringify(store, null, 2), "utf8")
  await fs.rename(temporary, target)
}

function normalizeAnnotationTask(value: Record<string, unknown>, session: IntegratedSession): AnnotationTask | null {
  const cells: AnnotationCell[] = Array.isArray(value.cells)
    ? value.cells
      .filter((cell): cell is Record<string, unknown> => integratedRecord(cell) && typeof cell.id === "string")
      .map((cell) => ({
        id: String(cell.id),
        kind: cell.kind === "edge" ? "edge" : "node",
        label: typeof cell.label === "string" ? cell.label : "",
        source: typeof cell.source === "string" ? cell.source : undefined,
        target: typeof cell.target === "string" ? cell.target : undefined,
      }))
    : []
  const region = integratedRecord(value.region) && typeof value.region.x === "number"
    ? {
      x: Number(value.region.x),
      y: Number(value.region.y),
      width: Number(value.region.width),
      height: Number(value.region.height),
    }
    : null
  const status = value.status === "resolved" || value.status === "stale" ? value.status : "open"
  return {
    id: String(value.id),
    sessionId: session.sessionId,
    file: path.relative(session.workspace, session.file).split(path.sep).join("/"),
    pageId: typeof value.pageId === "string" ? String(value.pageId) : "",
    pageName: typeof value.pageName === "string" ? String(value.pageName) : "",
    cells,
    region,
    instruction: typeof value.instruction === "string" ? String(value.instruction) : "",
    scope: annotationScope(value.scope),
    // Approval tokens are deliberately process-local. Ignore tokens persisted
    // by older packages so every restarted session requires fresh approval.
    authorization: null,
    status,
    baseRevision: Number.isInteger(value.baseRevision) ? Number(value.baseRevision) : 0,
    result: integratedRecord(value.result) && typeof value.result.summary === "string"
      ? {
        summary: String(value.result.summary),
        changedIds: Array.isArray(value.result.changedIds)
          ? value.result.changedIds.map((id) => String(id))
          : [],
        revision: Number.isInteger(value.result.revision) ? Number(value.result.revision) : 0,
        updatedAt: typeof value.result.updatedAt === "string" ? String(value.result.updatedAt) : "",
      }
      : null,
    createdAt: typeof value.createdAt === "string" ? String(value.createdAt) : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? String(value.updatedAt) : new Date().toISOString(),
    resolvedAt: typeof value.resolvedAt === "string" ? String(value.resolvedAt) : null,
  }
}

function annotationRegion(pages: ParsedPage[], pageId: string, cellIds: string[]): AnnotationRegion | null {
  const page = pages.find((candidate) => candidate.id === pageId || !pageId)
  if (!page) return null
  const context = createGeometryContext(page.cells)
  const verticesById = context.cellsById
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let found = false
  for (const id of cellIds) {
    const cell = verticesById.get(id)
    if (!cell) continue
    let rectangle: Rectangle | null = null
    if (cell.vertex) {
      rectangle = vertexRectangle(cell, context)
    } else if (cell.edge) {
      const polyline = edgePolyline(cell, verticesById, context)
      if (polyline && polyline.length > 0) {
        let eMinX = Number.POSITIVE_INFINITY
        let eMinY = Number.POSITIVE_INFINITY
        let eMaxX = Number.NEGATIVE_INFINITY
        let eMaxY = Number.NEGATIVE_INFINITY
        for (const point of polyline) {
          eMinX = Math.min(eMinX, point.x)
          eMinY = Math.min(eMinY, point.y)
          eMaxX = Math.max(eMaxX, point.x)
          eMaxY = Math.max(eMaxY, point.y)
        }
        rectangle = { x: eMinX, y: eMinY, width: eMaxX - eMinX, height: eMaxY - eMinY }
      }
    }
    if (!rectangle) continue
    found = true
    minX = Math.min(minX, rectangle.x)
    minY = Math.min(minY, rectangle.y)
    maxX = Math.max(maxX, rectangle.x + rectangle.width)
    maxY = Math.max(maxY, rectangle.y + rectangle.height)
  }
  if (!found) return null
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

type AnnotationScopeContext = {
  page: ParsedPage
  selectedIds: Set<string>
  selectedNodeIds: Set<string>
  allowedIds: Set<string>
  allowedVertexIds: Set<string>
  expandedRegion: AnnotationRegion | null
}

function annotationRectanglesTouch(left: AnnotationRegion, right: Rectangle): boolean {
  return left.x <= right.x + right.width
    && left.x + left.width >= right.x
    && left.y <= right.y + right.height
    && left.y + left.height >= right.y
}

function annotationScopeContext(
  session: IntegratedSession,
  task: AnnotationTask,
  scope: AnnotationScope,
): AnnotationScopeContext {
  const pages = parseDrawio(session.xml)
  const page = pages.find((candidate) => candidate.id === task.pageId) || pages[0]
  if (!page) throw new Error(`annotation page not found: ${task.pageId || "(first page)"}`)
  const cellsById = new Map(page.cells.map((cell) => [cell.id, cell]))
  const selectedIds = new Set(task.cells.map((cell) => cell.id))
  const selectedNodeIds = new Set(
    task.cells
      .filter((cell) => cellsById.get(cell.id)?.vertex)
      .map((cell) => cell.id),
  )
  const allowedIds = new Set(selectedIds)
  const allowedVertexIds = new Set(selectedNodeIds)
  let expandedRegion: AnnotationRegion | null = null

  if (scope === "selection_and_edges") {
    for (const cell of page.cells) {
      if (cell.edge && (
        (cell.source && selectedNodeIds.has(cell.source))
        || (cell.target && selectedNodeIds.has(cell.target))
      )) allowedIds.add(cell.id)
    }
  }

  if (scope === "surrounding_layout") {
    const geometry = createGeometryContext(page.cells)
    if (task.region) {
      const padding = Math.max(160, Math.min(320, Math.max(task.region.width, task.region.height)))
      expandedRegion = {
        x: task.region.x - padding,
        y: task.region.y - padding,
        width: task.region.width + padding * 2,
        height: task.region.height + padding * 2,
      }
      for (const cell of page.cells) {
        if (!cell.vertex) continue
        const rectangle = vertexRectangle(cell, geometry)
        if (rectangle && annotationRectanglesTouch(expandedRegion, rectangle)) {
          allowedVertexIds.add(cell.id)
        }
      }
    }

    for (const selected of task.cells) {
      const cell = cellsById.get(selected.id)
      if (!cell?.edge) continue
      if (cell.source) allowedVertexIds.add(cell.source)
      if (cell.target) allowedVertexIds.add(cell.target)
    }

    const adjacencySeeds = new Set(allowedVertexIds)
    for (const cell of page.cells) {
      if (!cell.edge || !cell.source || !cell.target) continue
      if (adjacencySeeds.has(cell.source) || adjacencySeeds.has(cell.target)) {
        allowedVertexIds.add(cell.source)
        allowedVertexIds.add(cell.target)
      }
    }
    for (const id of allowedVertexIds) allowedIds.add(id)
    for (const cell of page.cells) {
      if (!cell.edge) continue
      if (selectedIds.has(cell.id) || (
        cell.source && cell.target
        && allowedVertexIds.has(cell.source)
        && allowedVertexIds.has(cell.target)
      )) allowedIds.add(cell.id)
    }
  }

  return { page, selectedIds, selectedNodeIds, allowedIds, allowedVertexIds, expandedRegion }
}

function activeAnnotationTask(session: IntegratedSession): AnnotationTask | null {
  const id = session.activeAnnotationId
  if (!id) return null
  const task = getSessionAnnotations(session.sessionId).get(id)
  if (!task || task.status === "resolved") {
    session.activeAnnotationId = null
    return null
  }
  return task
}

function requireAnnotationAuthorization(
  session: IntegratedSession,
  annotationId: string | undefined,
  approvalToken: string | undefined,
): { task: AnnotationTask; authorization: NonNullable<AnnotationAuthorization>; scope: AnnotationScopeContext } | null {
  const active = activeAnnotationTask(session)
  if (!active) {
    // After a restore the active annotation is explicitly cleared and any
    // unconsumed authorization is dropped. Passing a stale annotation id must
    // never silently fall back to an unapproved write.
    if (annotationId) {
      throw new Error(
        `annotation ${annotationId} is not active; restore or resolution invalidated its approval. Re-read the annotation and latest state with drawio_get_annotation, then request approval again before writing`,
      )
    }
    return null
  }
  if (!annotationId || annotationId !== active.id) {
    throw new Error(
      `annotation ${active.id} is active; formal writes require its annotation_id and a pre-approved approval_token`,
    )
  }
  const authorization = active.authorization
  if (!authorization || !approvalToken || authorization.token !== approvalToken) {
    throw new Error(
      "annotation change has not been approved; call drawio_authorize_annotation_change and wait for the OpenCode approval popup before writing",
    )
  }
  if (authorization.consumedAt) {
    throw new Error("annotation approval token has already been used; request approval again before another write")
  }
  if (authorization.baseRevision !== session.revision) {
    throw new Error(
      `annotation approval was granted for revision ${authorization.baseRevision}, but current revision is ${session.revision}; re-read, re-plan and request approval again`,
    )
  }
  return {
    task: active,
    authorization,
    scope: annotationScopeContext(session, active, authorization.scope),
  }
}

function validateAnnotationPatchScope(
  guard: NonNullable<ReturnType<typeof requireAnnotationAuthorization>>,
  operations: PatchOperation[],
  changedIds: string[],
): void {
  const { task, authorization, scope } = guard
  const planned = new Set(authorization.proposedChangedIds)
  const addedNodeIds = new Set(
    operations.filter((operation) => operation.type === "add-node").map((operation) => operation.id),
  )

  for (const operation of operations) {
    if (!planned.has(operation.id)) {
      throw new Error(`annotation scope violation: ${operation.id} was not disclosed in the approved change plan`)
    }
    if (scope.allowedIds.has(operation.id)) continue

    if (authorization.scope === "selection_and_edges" && operation.type === "add-edge") {
      if (
        (operation.source && scope.selectedNodeIds.has(operation.source))
        || (operation.target && scope.selectedNodeIds.has(operation.target))
      ) continue
    }

    if (authorization.scope === "surrounding_layout" && operation.type === "add-node") {
      if (!scope.expandedRegion || operation.x === undefined || operation.y === undefined) {
        throw new Error(
          `annotation scope violation: new node ${operation.id} needs explicit x/y inside the approved surrounding region`,
        )
      }
      const rectangle = {
        x: operation.x,
        y: operation.y,
        width: operation.width || 160,
        height: operation.height || 70,
      }
      if (annotationRectanglesTouch(scope.expandedRegion, rectangle)) continue
    }

    if (authorization.scope === "surrounding_layout" && operation.type === "add-edge") {
      const sourceAllowed = !!operation.source
        && (scope.allowedVertexIds.has(operation.source) || addedNodeIds.has(operation.source))
      const targetAllowed = !!operation.target
        && (scope.allowedVertexIds.has(operation.target) || addedNodeIds.has(operation.target))
      if (sourceAllowed && targetAllowed) continue
    }

    throw new Error(
      `annotation scope violation: ${operation.id} is outside "${annotationScopeLabel(authorization.scope)}" for ${task.id}; explain the need and request a wider approval before changing it`,
    )
  }

  for (const id of changedIds) {
    if (!planned.has(id)) {
      throw new Error(`annotation scope violation: actual change ${id} was not disclosed in the approved plan`)
    }
    const isPlannedNew = addedNodeIds.has(id)
      || operations.some((operation) => operation.type === "add-edge" && operation.id === id)
    if (!scope.allowedIds.has(id) && !isPlannedNew) {
      throw new Error(`annotation scope violation: actual change ${id} is outside the approved boundary`)
    }
  }
}

function validateAnnotationXmlScope(
  guard: NonNullable<ReturnType<typeof requireAnnotationAuthorization>>,
  before: ParsedPage[],
  after: ParsedPage[],
): string[] {
  const diff = diffParsedPages(before, after)
  const pagePrefix = `${guard.task.pageId}:`
  const changedIds = [...diff.added, ...diff.removed, ...diff.changed]
    .map((entry) => entry.key.startsWith(pagePrefix)
      ? entry.key.slice(pagePrefix.length)
      : entry.key)
  const planned = new Set(guard.authorization.proposedChangedIds)
  for (const id of changedIds) {
    if (!planned.has(id)) {
      throw new Error(`annotation scope violation: actual change ${id} was not disclosed in the approved plan`)
    }
    if (!guard.scope.allowedIds.has(id)) {
      throw new Error(
        `annotation scope violation: full-XML update changes ${id} outside "${annotationScopeLabel(guard.authorization.scope)}"; use scoped drawio_patch or request wider approval`,
      )
    }
  }
  return [...new Set(changedIds)]
}

async function consumeAnnotationAuthorization(
  session: IntegratedSession,
  guard: NonNullable<ReturnType<typeof requireAnnotationAuthorization>>,
): Promise<void> {
  guard.authorization.consumedAt = new Date().toISOString()
  guard.task.updatedAt = guard.authorization.consumedAt
  await persistStoredAnnotations(session)
  broadcastAnnotation(session, guard.task, "updated")
}

function annotationStaleState(
  session: IntegratedSession,
  task: AnnotationTask,
): { stale: boolean; reason?: string } {
  if (task.status === "resolved") return { stale: false }
  if (task.baseRevision >= session.revision) return { stale: false }
  if (task.cells.length === 0) return { stale: false }
  const base = session.history.find((entry) => entry.revision === task.baseRevision)
  if (!base) {
    // base revision no longer in memory; verify cells still resolve on latest XML instead
  }
  try {
    const beforePages = base ? parseDrawio(base.xml) : []
    const afterPages = parseDrawio(session.xml)
    const pageIdMatch = (page: ParsedPage) => page.id === task.pageId
    const beforePage = beforePages.find(pageIdMatch)
    const afterPage = afterPages.find(pageIdMatch)
    if (!afterPage) {
      return { stale: true, reason: `page "${task.pageName || task.pageId}" no longer exists in the latest revision` }
    }
    const beforeCells = beforePage ? new Map(beforePage.cells.map((cell) => [cell.id, cell])) : new Map()
    const afterCells = new Map(afterPage.cells.map((cell) => [cell.id, cell]))
    for (const selected of task.cells) {
      const before = beforeCells.get(selected.id)
      const after = afterCells.get(selected.id)
      if (!after) {
        return { stale: true, reason: `selected cell "${selected.id}" was deleted since the annotation was created` }
      }
      if (before && JSON.stringify(comparableCell(before)) !== JSON.stringify(comparableCell(after))) {
        return { stale: true, reason: `selected cell "${selected.id}" changed since the annotation was created` }
      }
    }
  } catch {
    // geometry diff unavailable; fall back to revision-only staleness below
  }
  return { stale: false }
}

function annotationEffectiveState(
  session: IntegratedSession,
  task: AnnotationTask,
): AnnotationEffectiveState {
  const lifecycleStatus = task.status === "resolved" ? "resolved" : "open"
  const computed = annotationStaleState(session, task)
  const stale = lifecycleStatus === "open" && (task.status === "stale" || computed.stale)
  return {
    status: lifecycleStatus,
    freshness: stale ? "stale" : "fresh",
    requiresConfirmation: stale,
    staleReason: stale ? computed.reason : undefined,
  }
}

function annotationMatchesStatus(
  state: AnnotationEffectiveState,
  statusFilter: string | null,
): boolean {
  if (!statusFilter || statusFilter === "all") return true
  if (statusFilter === "open") return state.status === "open"
  if (statusFilter === "resolved") return state.status === "resolved"
  if (statusFilter === "stale") return state.status === "open" && state.freshness === "stale"
  return false
}

function annotationPayload(
  session: IntegratedSession,
  task: AnnotationTask,
  state: AnnotationEffectiveState = annotationEffectiveState(session, task),
) {
  return {
    id: task.id,
    sessionId: task.sessionId,
    file: task.file,
    page: { id: task.pageId, name: task.pageName },
    cells: task.cells,
    region: task.region,
    instruction: task.instruction,
    scope: task.scope,
    scopeLabel: annotationScopeLabel(task.scope),
    authorization: task.authorization
      ? {
        scope: task.authorization.scope,
        scopeLabel: annotationScopeLabel(task.authorization.scope),
        plan: task.authorization.plan,
        proposedChangedIds: task.authorization.proposedChangedIds,
        escalationReason: task.authorization.escalationReason,
        baseRevision: task.authorization.baseRevision,
        approvedAt: task.authorization.approvedAt,
        consumedAt: task.authorization.consumedAt,
      }
      : null,
    status: state.status,
    freshness: state.freshness,
    requiresConfirmation: state.requiresConfirmation,
    stale: state.freshness === "stale",
    staleReason: state.staleReason || null,
    baseRevision: task.baseRevision,
    currentRevision: session.revision,
    result: task.result,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    resolvedAt: task.resolvedAt,
  }
}

function broadcastAnnotation(session: IntegratedSession, task: AnnotationTask, kind: string): void {
  const payload = `event: annotation\\ndata: ${JSON.stringify({ kind, annotation: annotationPayload(session, task) })}\\n\\n`
  for (const response of getIntegratedBridgeState().eventClients.get(session.sessionId) || []) {
    response.write(payload)
  }
}

function buildIntegratedEditorPage(options: {
  session: IntegratedSession
  editorUrl: URL
  bridgeUrl: URL
  token: string
}): string {
  const apiUrl = new URL("/api/diagram", options.bridgeUrl)
  apiUrl.searchParams.set("sessionId", options.session.sessionId)
  apiUrl.searchParams.set("token", options.token)
const eventsUrl = new URL("/api/events", options.bridgeUrl)
  eventsUrl.searchParams.set("sessionId", options.session.sessionId)
  eventsUrl.searchParams.set("token", options.token)
  const annotationsUrl = new URL("/api/annotations", options.bridgeUrl)
  annotationsUrl.searchParams.set("sessionId", options.session.sessionId)
  annotationsUrl.searchParams.set("token", options.token)
  const historyUrl = new URL("/api/history", options.bridgeUrl)
  historyUrl.searchParams.set("sessionId", options.session.sessionId)
  historyUrl.searchParams.set("token", options.token)
  const config = safeScriptJson({
    file: path.relative(options.session.workspace, options.session.file).split(path.sep).join("/"),
    drawioUrl: options.editorUrl.toString(),
    drawioOrigin: options.editorUrl.origin,
    apiUrl: apiUrl.toString(),
    eventsUrl: eventsUrl.toString(),
    annotationsUrl: annotationsUrl.toString(),
    historyUrl: historyUrl.toString(),
  })

return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Draw.io - ${xmlEscape(path.basename(options.session.file))}</title>
  <style>
    html, body, iframe { width: 100%; height: 100%; margin: 0; border: 0; overflow: hidden; }
    body { background: #f8fafc; font: 13px system-ui, sans-serif; }
    #status { position: fixed; z-index: 4; left: 12px; bottom: 10px; padding: 6px 9px;
      border-radius: 8px; background: rgba(15, 23, 42, .88); color: white; opacity: 0;
      pointer-events: none; transition: opacity .15s; }
    #status.visible { opacity: 1; }
    #fab-group { position: fixed; z-index: 3; right: 14px; bottom: 14px; display: flex;
      align-items: center; gap: 8px; }
    #history-btn, #ann-btn { display: flex; align-items: center; gap: 6px; padding: 8px 12px;
      border: 1px solid #c8d0dc; border-radius: 999px; background: #fff; color: #1f2937;
      cursor: pointer; box-shadow: 0 2px 8px rgba(15,23,42,.12); }
    #history-btn:hover, #ann-btn:hover { background: #f1f5f9; }
    #history-btn:disabled, #ann-btn:disabled { opacity: .5; cursor: not-allowed; }
    #ann-btn .dot { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
      background: #2563eb; color: #fff; font-size: 11px; font-weight: 600;
      display: inline-flex; align-items: center; justify-content: center; }
    #ann-btn .dot.zero { background: #cbd5e1; color: #475569; }
    #conflict-banner { position: fixed; z-index: 9; top: 12px; left: 50%; transform: translateX(-50%);
      display: none; align-items: center; gap: 10px; max-width: 92vw; padding: 10px 14px;
      border: 1px solid #f59e0b; border-radius: 10px; background: #fffbeb; color: #92400e;
      box-shadow: 0 4px 16px rgba(15,23,42,.16); }
    #conflict-banner.visible { display: flex; }
    #conflict-banner button { border: 1px solid #d97706; border-radius: 6px; background: #fff;
      color: #92400e; padding: 4px 10px; cursor: pointer; }
    #history-modal { position: fixed; z-index: 7; inset: 0; display: none; align-items: center;
      justify-content: center; background: rgba(15, 23, 42, .5); }
    #history-modal.open { display: flex; }
    #history-modal .modal { width: min(920px, 96vw); height: min(78vh, 92vh); display: flex;
      flex-direction: column; background: #fff; border-radius: 14px; box-shadow: 0 16px 48px rgba(15,23,42,.28);
      overflow: hidden; }
    #history-modal header { display: flex; align-items: center; gap: 8px; padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0; }
    #history-modal header strong { font-size: 15px; }
    #history-modal header .spacer { flex: 1; }
    #history-modal header button { border: 1px solid #c8d0dc; border-radius: 6px; background: #fff;
      padding: 4px 10px; cursor: pointer; }
    .h-body { flex: 1; display: flex; min-height: 0; }
    .h-list-pane { width: 300px; min-width: 240px; border-right: 1px solid #e2e8f0; overflow-y: auto;
      padding: 10px 12px; }
    .h-preview-pane { flex: 1; display: flex; flex-direction: column; min-width: 0; padding: 14px; }
    .h-card { display: flex; gap: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px;
      margin-bottom: 10px; background: #fafbfc; cursor: pointer; }
    .h-card.selected { border-color: #2563eb; background: #eff6ff; }
    .h-card.current { opacity: .92; }
    .h-card .h-thumb { width: 96px; height: 72px; flex-shrink: 0; border: 1px solid #e2e8f0;
      border-radius: 6px; background: #fff; display: flex; align-items: center; justify-content: center;
      overflow: hidden; }
    .h-card .h-thumb img { width: 100%; height: 100%; object-fit: contain; }
    .h-thumb .ph { font-size: 10px; color: #94a3b8; text-align: center; padding: 2px; }
    .h-card .h-meta { min-width: 0; }
    .h-card .h-ver { font-weight: 700; font-size: 13px; }
    .h-card .h-badges { display: flex; flex-wrap: wrap; gap: 4px; margin: 3px 0; }
    .h-badge { font-size: 10px; padding: 1px 6px; border-radius: 999px; font-weight: 600; }
    .h-badge.cur { background: #2563eb; color: #fff; }
    .h-badge.initial { background: #e2e8f0; color: #475569; }
    .h-badge.editor { background: #dbeafe; color: #1d4ed8; }
    .h-badge.agent { background: #f3e8ff; color: #7e22ce; }
    .h-badge.external { background: #fef3c7; color: #b45309; }
    .h-badge.restore { background: #dcfce7; color: #15803d; }
    .h-card .h-time, .h-card .h-pages { font-size: 11px; color: #64748b; }
    .h-card .h-restored { font-size: 11px; color: #15803d; }
    .h-preview-pane .h-preview-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .h-preview-pane .h-preview-head select { padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 6px;
      background: #fff; }
    .h-preview-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff;
      display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 0; }
    .h-preview-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .h-preview-box .ph { color: #94a3b8; font-size: 13px; text-align: center; padding: 16px; }
    .h-preview-box .ph button { margin-top: 8px; border: 1px solid #c8d0dc; border-radius: 6px;
      background: #fff; padding: 4px 10px; cursor: pointer; }
    .h-foot { padding: 12px 16px; border-top: 1px solid #e2e8f0; display: flex; align-items: center;
      gap: 10px; }
    .h-foot .note { flex: 1; font-size: 11px; color: #64748b; }
    .h-foot button { border: 1px solid #c8d0dc; border-radius: 8px; background: #fff; padding: 7px 14px;
      cursor: pointer; }
    .h-foot .primary { border-color: #2563eb; background: #2563eb; color: #fff; }
    .h-foot .primary:disabled { opacity: .5; cursor: not-allowed; }
    .h-list-skeleton { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 10px;
      background: #f8fafc; }
    .h-list-skeleton .ln { height: 10px; border-radius: 5px; background: #e2e8f0; margin-bottom: 8px; }
    #history-confirm { position: fixed; z-index: 8; inset: 0; display: none; align-items: center;
      justify-content: center; background: rgba(15, 23, 42, .45); }
    #history-confirm.open { display: flex; }
    #history-confirm .box { width: min(420px, 92vw); background: #fff; border-radius: 12px; padding: 18px;
      box-shadow: 0 16px 48px rgba(15,23,42,.3); }
    #history-confirm .box p { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #1f2937; }
    #history-confirm .box small { color: #64748b; }
    #history-confirm .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
    #history-confirm .actions button { border: 1px solid #c8d0dc; border-radius: 8px; background: #fff;
      padding: 7px 14px; cursor: pointer; }
    #history-confirm .actions .primary { border-color: #2563eb; background: #2563eb; color: #fff; }
    #restore-overlay { position: fixed; z-index: 10; inset: 0; display: none; align-items: center;
      justify-content: center; background: rgba(15, 23, 42, .35); color: #fff; }
    #restore-overlay.visible { display: flex; }
    #restore-overlay .box { background: #1e293b; border-radius: 12px; padding: 20px 26px; text-align: center; }
    #restore-overlay .spin { width: 28px; height: 28px; margin: 0 auto 10px; border: 3px solid #475569;
      border-top-color: #2563eb; border-radius: 50%; animation: h-spin .8s linear infinite; }
    @keyframes h-spin { to { transform: rotate(360deg); } }
    .h-msg { padding: 8px 12px; border-radius: 8px; font-size: 12px; }
    .h-msg.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .h-msg.error button { margin-left: 8px; border: 1px solid #b91c1c; border-radius: 6px; background: #fff;
      color: #b91c1c; padding: 2px 8px; cursor: pointer; }
    @media (max-width: 700px) {
      .h-body { flex-direction: column; }
      .h-list-pane { width: auto; min-width: 0; border-right: 0; border-bottom: 1px solid #e2e8f0;
        max-height: 42%; }
    }
    #ann-drawer { position: fixed; z-index: 5; top: 0; right: 0; height: 100%; width: 360px;
      max-width: 90vw; transform: translateX(100%); transition: transform .2s ease;
      background: #fff; border-left: 1px solid #e2e8f0; box-shadow: -4px 0 16px rgba(15,23,42,.08);
      display: flex; flex-direction: column; }
    #ann-drawer.open { transform: translateX(0); }
    #ann-drawer header { display: flex; align-items: center; gap: 8px; padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0; }
    #ann-drawer header strong { font-size: 14px; }
    #ann-drawer header .spacer { flex: 1; }
    #ann-drawer header button { border: 1px solid #c8d0dc; border-radius: 6px; background: #fff;
      padding: 4px 8px; cursor: pointer; }
    #ann-drawer .new-btn { border-color: #2563eb; background: #2563eb; color: #fff; }
    #ann-list { flex: 1; overflow-y: auto; padding: 10px 14px; }
    #ann-list .item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;
      margin-bottom: 10px; background: #fafbfc; }
    #ann-list .item.resolved { opacity: .65; background: #f1f5f9; }
    #ann-list .item .meta { display: flex; align-items: center; gap: 6px; font-size: 11px;
      color: #64748b; margin-bottom: 6px; }
    #ann-list .item .badge { padding: 1px 7px; border-radius: 999px; font-weight: 600; }
    #ann-list .item .badge.open { background: #dbeafe; color: #1d4ed8; }
    #ann-list .item .badge.stale { background: #fef3c7; color: #b45309; }
    #ann-list .item .badge.resolved { background: #dcfce7; color: #15803d; }
    #ann-list .item .instruction { color: #1f2937; white-space: pre-wrap; word-break: break-word; }
    #ann-list .item .cells { font-size: 11px; color: #64748b; margin-top: 6px; }
    #ann-list .item form { display: flex; gap: 6px; margin-top: 8px; }
    #ann-list .item form input { flex: 1; }
    #ann-none { color: #94a3b8; text-align: center; padding: 24px 8px; }
    #ann-form { display: none; flex: 1; flex-direction: column; }
    #ann-form.visible { display: flex; }
    #ann-form .field { padding: 10px 14px; }
    #ann-form .selection { font-size: 12px; color: #475569; background: #f1f5f9;
      border-radius: 6px; padding: 8px 10px; margin: 0 14px; }
    #ann-form textarea { width: 100%; min-height: 96px; resize: vertical; font: inherit;
      padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; }
    #ann-form fieldset { margin: 0 14px 10px; padding: 8px 10px; border: 1px solid #cbd5e1;
      border-radius: 6px; display: grid; gap: 7px; }
    #ann-form fieldset legend { padding: 0 5px; font-size: 12px; color: #475569; }
    #ann-form fieldset label { display: flex; align-items: flex-start; gap: 7px; cursor: pointer; }
    #ann-form fieldset small { display: block; color: #64748b; margin-top: 2px; }
    #ann-form .actions { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 14px;
      border-top: 1px solid #e2e8f0; }
    #ann-form .actions button { border: 1px solid #c8d0dc; border-radius: 6px; background: #fff;
      padding: 6px 12px; cursor: pointer; }
    #ann-form .actions .primary { border-color: #2563eb; background: #2563eb; color: #fff; }
    #ann-form .actions .primary:disabled { opacity: .5; cursor: not-allowed; }
    @media (prefers-color-scheme: dark) {
      body { background: #0f172a; }
      #history-btn, #ann-btn, #ann-drawer { background: #1e293b; color: #e2e8f0; border-color: #334155; }
      #history-btn:hover, #ann-btn:hover, #ann-drawer header button { background: #243049; }
      #ann-list .item { background: #243049; border-color: #334155; }
      #ann-list .item .instruction { color: #e2e8f0; }
      #ann-list .item .meta, #ann-list .item .cells { color: #94a3b8; }
      #ann-form textarea { background: #0f172a; color: #e2e8f0; border-color: #334155; }
      #ann-form .selection { background: #243049; color: #cbd5e1; }
      #ann-form fieldset { border-color: #334155; }
      #ann-form fieldset legend, #ann-form fieldset small { color: #94a3b8; }
      #ann-none { color: #475569; }
      #history-modal .modal { background: #1e293b; }
      #history-modal header, .h-list-pane, .h-foot { border-color: #334155; }
      #history-modal header button, .h-foot button, #history-confirm .actions button {
        background: #243049; color: #e2e8f0; border-color: #475569; }
      .h-card { background: #243049; border-color: #334155; }
      .h-card.selected { border-color: #3b82f6; background: #1e3a5f; }
      .h-card .h-thumb { border-color: #334155; background: #0f172a; }
      .h-card .h-time, .h-card .h-pages { color: #94a3b8; }
      .h-thumb .ph, .h-preview-box .ph { color: #64748b; }
      .h-preview-pane .h-preview-head select { background: #0f172a; color: #e2e8f0; border-color: #334155; }
      .h-preview-box { background: #0f172a; border-color: #334155; }
      .h-preview-box .ph button { background: #243049; color: #e2e8f0; border-color: #475569; }
      .h-foot .note { color: #94a3b8; }
      .h-badge.initial { background: #334155; color: #cbd5e1; }
      #history-confirm .box { background: #1e293b; }
      #history-confirm .box p { color: #e2e8f0; }
      #history-confirm .box small { color: #94a3b8; }
      .h-list-skeleton { background: #243049; border-color: #334155; }
      .h-list-skeleton .ln { background: #334155; }
      #conflict-banner { background: #451a03; border-color: #b45309; color: #fde68a; }
      #conflict-banner button { background: #451a03; color: #fde68a; border-color: #d97706; }
    }
  </style>
</head>
<body>
  <iframe id="editor" title="Draw.io editor"></iframe>
  <div id="status" role="status"></div>
  <div id="conflict-banner" role="alert">
    <span id="conflict-message">图表刚发生变化，当前画布暂未保存，请确认最新版本。</span>
    <button type="button" id="conflict-retry" style="display:none">重试加载</button>
    <button type="button" id="conflict-reload">重新加载最新版本</button>
  </div>
  <div id="fab-group">
    <button id="history-btn" type="button" title="查看历史版本">
      <span aria-hidden="true">🕘</span><span>历史</span>
    </button>
    <button id="ann-btn" type="button" title="注释与修改任务">
      <span>注释</span><span class="dot zero" id="ann-count">0</span>
    </button>
  </div>
  <div id="ann-drawer" aria-hidden="true">
    <header>
      <strong>注释任务</strong>
      <span class="spacer"></span>
      <button type="button" class="new-btn" id="ann-new">＋ 添加注释</button>
      <button type="button" id="ann-close">关闭</button>
    </header>
    <div id="ann-list"></div>
    <div id="ann-form">
      <div class="field">
        <div class="selection" id="ann-selection">正在获取选中内容…</div>
      </div>
      <div class="field">
        <textarea id="ann-instruction" placeholder="修改说明：描述这里要怎么改（例如：把该节点改名为 Redis 缓存层，并增加一条从应用到此的连线）"></textarea>
      </div>
      <fieldset>
        <legend>允许 Agent 修改的范围</legend>
        <label><input type="radio" name="ann-scope" value="selection_only" checked>
          <span>只修改选区<small>仅允许修改已选中的节点或连线。</small></span></label>
        <label><input type="radio" name="ann-scope" value="selection_and_edges">
          <span>允许调整关联连线<small>可同时调整与选中节点直接相连的连线。</small></span></label>
        <label><input type="radio" name="ann-scope" value="surrounding_layout">
          <span>允许调整周边布局<small>可调整选区附近及一跳关联的节点和连线。</small></span></label>
      </fieldset>
      <div style="margin:0 14px 10px;font-size:11px;color:#64748b">提交注释不会立即改图。Agent会先展示具体修改计划，OpenCode弹出确认后才执行。</div>
      <div class="actions">
        <button type="button" id="ann-cancel">取消</button>
        <button type="button" class="primary" id="ann-submit" disabled>提交注释</button>
      </div>
    </div>
  </div>
  <div id="history-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-label="版本历史">
    <div class="modal">
      <header>
        <strong>版本历史</strong>
        <span class="spacer"></span>
        <button type="button" id="hist-refresh">刷新</button>
        <button type="button" id="hist-close">关闭</button>
      </header>
      <div class="h-body">
        <div class="h-list-pane" id="hist-list" tabindex="0"></div>
        <div class="h-preview-pane">
          <div class="h-preview-head">
            <label for="hist-page">页面：</label>
            <select id="hist-page" disabled></select>
          </div>
          <div class="h-preview-box" id="hist-preview">
            <div class="ph">选择左侧版本查看预览</div>
          </div>
        </div>
      </div>
      <div class="h-foot">
        <div class="note" id="hist-note">恢复会创建新版本，当前版本不会被删除。</div>
        <button type="button" id="hist-cancel">取消</button>
        <button type="button" class="primary" id="hist-restore" disabled>恢复此版本</button>
      </div>
    </div>
  </div>
  <div id="history-confirm" aria-hidden="true" role="dialog" aria-modal="true" aria-label="确认恢复">
    <div class="box">
      <p id="hist-confirm-text">将图表恢复为 v8 的内容？</p>
      <small>当前版本不会被删除，恢复操作会创建一个新的版本。</small>
      <div class="actions">
        <button type="button" id="hist-confirm-cancel">取消</button>
        <button type="button" class="primary" id="hist-confirm-ok">确认恢复</button>
      </div>
    </div>
  </div>
  <div id="restore-overlay" aria-hidden="true">
    <div class="box">
      <div class="spin"></div>
      <div>正在恢复历史版本…</div>
    </div>
  </div>
  <script>
    (() => {
      const CONFIG = ${config};
      const editor = document.getElementById("editor");
      const status = document.getElementById("status");
      const clientId = crypto.randomUUID();
      let current = null;
      let saveChain = Promise.resolve();
      let externalTimer = null;
      let pendingSelection = null;
      let awaitingSelection = false;
      let editorMode = "editing"; // editing | restoring | loading-restored-xml | conflict
      let historyOpen = false;
      let selectedSnapshot = null;
      let confirmSnapshot = null;
      let restoreTargetXml = null;
      let preRestoreXml = null;
      let pendingRestore = null; // { xml } kept so a load timeout can retry the same target
      let restoreLoadTimer = null;

      const historyBtn = document.getElementById("history-btn");
      const annBtn = document.getElementById("ann-btn");
      const annCount = document.getElementById("ann-count");
      const annDrawer = document.getElementById("ann-drawer");
      const annList = document.getElementById("ann-list");
      const annForm = document.getElementById("ann-form");
      const annSelection = document.getElementById("ann-selection");
      const annInstruction = document.getElementById("ann-instruction");
      const annSubmit = document.getElementById("ann-submit");
      const conflictBanner = document.getElementById("conflict-banner");
      const histModal = document.getElementById("history-modal");
      const histList = document.getElementById("hist-list");
      const histPreview = document.getElementById("hist-preview");
      const histPage = document.getElementById("hist-page");
      const histRestore = document.getElementById("hist-restore");
      const histNote = document.getElementById("hist-note");
      const histConfirm = document.getElementById("history-confirm");
      const restoreOverlay = document.getElementById("restore-overlay");

      function selectedAnnotationScope() {
        return document.querySelector('input[name="ann-scope"]:checked')?.value || "selection_only";
      }

      function showStatus(message, duration = 2400) {
        status.textContent = message;
        status.classList.add("visible");
        clearTimeout(showStatus.timer);
        showStatus.timer = setTimeout(() => status.classList.remove("visible"), duration);
      }

      function sendEditor(payload) {
        editor.contentWindow?.postMessage(JSON.stringify(payload), CONFIG.drawioOrigin);
      }

      async function readLatest() {
        const response = await fetch(CONFIG.apiUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("读取图表失败（HTTP " + response.status + "）");
        return response.json();
      }

      async function writeState(xml, baseRevision) {
        const response = await fetch(CONFIG.apiUrl, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ xml, baseRevision, source: "editor", clientId }),
        });
        const result = await response.json();
        if (response.status === 409) {
          // Never blind-retry the same old XML with the server's new revision:
          // that could overwrite content another writer just produced. Surface
          // the conflict and let the user choose to reload the latest version.
          const error = new Error(result.error || "图表刚发生变化，请检查最新版本后重新确认");
          error.status = 409;
          error.current = result.current;
          throw error;
        }
        if (!response.ok) throw new Error(result.error || "保存图表失败");
        return result;
      }

      function queueSave(xml) {
        saveChain = saveChain.then(async () => {
          if (editorMode === "restoring" || editorMode === "loading-restored-xml") return;
          if (typeof xml !== "string" || xml === current?.xml) return;
          current = await writeState(xml, current?.revision ?? 0);
          showStatus("已保存 revision " + current.revision, 1000);
        }).catch(error => {
          if (error && error.status === 409) {
            enterConflict(error.current);
          } else {
            showStatus(error.message || "保存失败", 5000);
          }
        });
      }

      function showConflictBanner(message, showRetry) {
        document.getElementById("conflict-message").textContent = message;
        document.getElementById("conflict-retry").style.display = showRetry ? "" : "none";
        conflictBanner.classList.add("visible");
      }

      function enterConflict(latest, message, showRetry) {
        editorMode = "conflict";
        showConflictBanner(message || "图表刚发生变化，当前画布暂未保存，请确认最新版本。", !!showRetry);
        void refreshAnnotations();
        if (latest) showStatus("保存冲突：图表刚发生变化，已保留你的本地画布（revision " + (current?.revision ?? 0) + "，最新 revision " + latest.revision + "）", 6000);
      }

      async function reloadLatest() {
        await saveChain;
        try {
          const latest = await readLatest();
          current = latest;
          editorMode = "editing";
          clearTimeout(restoreLoadTimer);
          restoreTargetXml = null;
          preRestoreXml = null;
          pendingRestore = null;
          conflictBanner.classList.remove("visible");
          sendEditor({ action: "load", xml: latest.xml, autosave: 1, diffSync: true, title: CONFIG.file });
          showStatus("已加载最新版本 revision " + latest.revision, 2000);
          void refreshAnnotations();
        } catch (error) {
          showStatus(error.message || "读取最新版本失败", 5000);
        }
      }

      function retryRestoreLoad() {
        if (!pendingRestore) { void reloadLatest(); return; }
        conflictBanner.classList.remove("visible");
        editorMode = "loading-restored-xml";
        restoreTargetXml = pendingRestore.xml;
        sendEditor({ action: "load", xml: pendingRestore.xml, autosave: 1, diffSync: true, title: CONFIG.file });
        clearTimeout(restoreLoadTimer);
        restoreLoadTimer = setTimeout(() => {
          if (editorMode !== "loading-restored-xml") return;
          editorMode = "conflict";
          restoreTargetXml = null;
          showConflictBanner("恢复内容加载超时，请确认最新版本；可重试加载或重新加载服务端当前版本。", true);
        }, 15000);
      }

      async function applyExternalRevision(revision) {
        await saveChain;
        // The user's queued save may have returned 409 and flipped us into
        // "conflict" while we waited. Loading the external revision then would
        // overwrite their still-pending local canvas, so bail out here.
        if (editorMode !== "editing") return;
        if (revision <= (current?.revision ?? 0)) return;
        const latest = await readLatest();
        if (editorMode !== "editing") return;
        if (latest.revision <= (current?.revision ?? 0)) return;
        current = latest;
        sendEditor({ action: "load", xml: latest.xml, autosave: 1, diffSync: true, title: CONFIG.file });
        showStatus("Agent 更新已加载 · revision " + latest.revision);
        void refreshAnnotations();
      }

      /* === TESTABLE HISTORY SAVE DECISION START === */
      function normalizeHistoryXml(value) {
        return String(value).replace(/>\\s+</g, "><").trim();
      }
      function historyXmlEquals(a, b) {
        return normalizeHistoryXml(a) === normalizeHistoryXml(b);
      }
      // Decide what to do with an incoming autosave/save message:
      //   "queue"   -> safe to enqueue a normal save
      //   "confirm" -> the editor confirmed it loaded the restore target
      //   "drop"    -> ignore (late pre-restore autosave or unreconciled copy)
      // While loading the restored XML, ONLY a message equal to the restore
      // target counts as confirmation. Nothing else may enter the save queue,
      // so a late autosave from the old canvas can never overwrite the restore.
      function decideHistoryAutosave(mode, xml, restoreTargetXml) {
        if (mode === "restoring" || mode === "conflict") return "drop";
        if (mode === "loading-restored-xml") {
          if (restoreTargetXml && historyXmlEquals(xml, restoreTargetXml)) return "confirm";
          return "drop";
        }
        return "queue";
      }
      /* === TESTABLE HISTORY SAVE DECISION END === */

      function confirmRestoreTargetLoaded(xml) {
        if (editorMode !== "loading-restored-xml"
          || !restoreTargetXml
          || !historyXmlEquals(xml, restoreTargetXml)) return false;
        editorMode = "editing";
        clearTimeout(restoreLoadTimer);
        restoreLoadTimer = null;
        restoreTargetXml = null;
        preRestoreXml = null;
        pendingRestore = null;
        conflictBanner.classList.remove("visible");
        return true;
      }

      function historySourceLabel(source) {
        return ({ initial: "初始版本", editor: "用户编辑", agent: "Agent 修改", external: "外部修改", restore: "历史恢复" }[source] || source);
      }

      function relativeTime(iso) {
        const elapsed = Date.now() - new Date(iso).getTime();
        if (elapsed < 60000) return "刚刚";
        if (elapsed < 3600000) return Math.floor(elapsed / 60000) + " 分钟前";
        if (elapsed < 86400000) return Math.floor(elapsed / 3600000) + " 小时前";
        return Math.floor(elapsed / 86400000) + " 天前";
      }

      function previewUrl(snapshotId, pageId, mode) {
        const url = new URL(CONFIG.historyUrl);
        url.pathname = "/api/history/" + encodeURIComponent(snapshotId) + "/preview";
        url.searchParams.set("pageId", pageId);
        url.searchParams.set("mode", mode);
        return url.toString();
      }

      function wrapThumb(snapshotId, pageId) {
        const img = document.createElement("img");
        img.dataset.snapshot = snapshotId;
        img.dataset.page = pageId;
        img.dataset.src = previewUrl(snapshotId, pageId, "thumb");
        img.alt = "缩略图";
        return img;
      }

      async function openHistory() {
        if (editorMode === "restoring" || editorMode === "loading-restored-xml") return;
        closeDrawer();
        historyOpen = true;
        histModal.classList.add("open");
        histModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        document.getElementById("hist-close").focus();
        // Let the last debounced autosave land before asking the server to flush.
        await saveChain;
        await new Promise(resolve => setTimeout(resolve, 300));
        await saveChain;
        await refreshHistoryList();
      }

      function closeHistory() {
        if (!historyOpen && !histModal.classList.contains("open")) {
          histModal.classList.remove("open");
          histModal.setAttribute("aria-hidden", "true");
          return;
        }
        historyOpen = false;
        selectedSnapshot = null;
        confirmSnapshot = null;
        histConfirm.classList.remove("open");
        histConfirm.setAttribute("aria-hidden", "true");
        histModal.classList.remove("open");
        histModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        // Only a normal editing state is restored when the modal closes. A
        // conflict (e.g. a restore load timeout) must survive, otherwise a
        // late pre-restore autosave could be re-admitted to the save queue.
        if (editorMode === "editing" || editorMode === "opening-history") {
          editorMode = "editing";
        }
        if (editorMode !== "conflict") {
          conflictBanner.classList.remove("visible");
        }
        historyBtn.focus();
      }

      function showHistoryError(message, withReload) {
        histNote.innerHTML = "";
        const box = document.createElement("span");
        box.className = "h-msg error";
        box.textContent = message;
        if (withReload) {
          const reload = document.createElement("button");
          reload.type = "button";
          reload.textContent = "重新加载最新版本";
          reload.addEventListener("click", () => void reloadLatestFromHistory());
          box.appendChild(reload);
        }
        histNote.appendChild(box);
      }

      function clearHistoryError() {
        histNote.textContent = "恢复会创建新版本，当前版本不会被删除。";
      }

      async function refreshHistoryList() {
        clearHistoryError();
        histList.innerHTML = Array(3).fill(
          '<div class="h-list-skeleton"><div class="ln" style="width:80%"></div><div class="ln" style="width:60%"></div><div class="ln" style="width:40%"></div></div>'
        ).join("");
        histRestore.disabled = true;
        try {
          const response = await fetch(CONFIG.historyUrl, { cache: "no-store" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "读取历史失败");
          renderHistoryList(result.entries || []);
          if (result.historyWarning) {
            const warning = document.createElement("div");
            warning.className = "h-msg error";
            warning.textContent = result.historyWarning;
            warning.style.marginBottom = "10px";
            histList.prepend(warning);
          }
        } catch (error) {
          histList.innerHTML = '<div class="h-card" style="cursor:default"><div class="h-meta"><div style="color:#94a3b8">历史加载失败</div><div style="font-size:11px;color:#64748b">' + escapeHtml(error.message || "") + '</div></div></div>';
        }
      }

      function escapeHtml(value) {
        return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
      }

      function renderHistoryList(entries) {
        if (entries.length === 0) {
          histList.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:24px 8px">还没有历史版本。保存图表后这里会出现可恢复的版本。</div>';
          return;
        }
        histList.innerHTML = entries.map((entry) => {
          const currentBadge = entry.isCurrent ? '<span class="h-badge cur">当前版本</span>' : "";
          const badges = '<span class="h-badge ' + entry.source + '">' + escapeHtml(historySourceLabel(entry.source)) + '</span>';
          const pages = entry.pages && entry.pages.length > 1 ? '<span class="h-pages">· ' + entry.pages.length + ' 页</span>' : "";
          const restored = entry.restoredFromSequence ? '<div class="h-restored">恢复自 v' + entry.restoredFromSequence + '</div>' : "";
          const time = '<span class="h-time" title="' + escapeHtml(entry.createdAt) + '">' + relativeTime(entry.createdAt) + '</span>';
          const firstPageId = escapeHtml(entry.pages?.[0]?.id || "");
          const thumb = entry.previewState === "failed" || entry.previewState === "unavailable"
            ? '<div class="ph" data-snapshot="' + entry.id + '" data-page="' + firstPageId + '">预览不可用，<br>可重试</div>'
            : '<img data-src="' + previewUrl(entry.id, entry.pages?.[0]?.id || "", "thumb") + '" data-snapshot="' + entry.id + '" data-page="' + firstPageId + '" alt="v' + entry.sequence + ' 缩略图">';
          return '<div class="h-card' + (entry.isCurrent ? " current" : "") + '" data-id="' + entry.id + '" data-sequence="' + entry.sequence + '">'
            + '<div class="h-thumb">' + thumb + '</div>'
            + '<div class="h-meta"><div class="h-ver">v' + entry.sequence + '</div>'
            + '<div class="h-badges">' + currentBadge + badges + '</div>'
            + '<div>' + time + pages + '</div>' + restored + '</div></div>';
        }).join("");

        // lazy-load visible thumbnails; failed thumbnails offer click-to-retry
        // with the original snapshot id and page id (never a silent p1 fallback)
        const wireThumb = (img) => {
          if (img.dataset.loaded) return;
          const snapshot = img.dataset.snapshot;
          const page = img.dataset.page;
          img.addEventListener("error", () => {
            const ph = document.createElement("div");
            ph.className = "ph";
            ph.dataset.snapshot = snapshot;
            ph.dataset.page = page;
            ph.textContent = "预览不可用，可重试";
            ph.title = "点击重试";
            ph.addEventListener("click", (event) => {
              event.stopPropagation();
              const replacement = wrapThumb(snapshot, page);
              img.replaceWith(replacement);
              wireThumb(replacement);
            });
            img.replaceWith(ph);
          });
          img.src = img.dataset.src;
          img.dataset.loaded = "1";
        };
        histList.querySelectorAll(".h-thumb img").forEach(wireThumb);
        histList.querySelectorAll(".h-thumb .ph").forEach((ph) => {
          ph.title = "点击重试";
          ph.addEventListener("click", (event) => {
            event.stopPropagation();
            const snapshot = ph.dataset.snapshot || "";
            const page = ph.dataset.page || "";
            if (!snapshot) return;
            const replacement = wrapThumb(snapshot, page);
            ph.replaceWith(replacement);
            wireThumb(replacement);
          });
        });

        // re-select previously selected card
        if (selectedSnapshot) {
          const card = histList.querySelector('[data-id="' + selectedSnapshot.id + '"]');
          if (card) card.classList.add("selected");
          updateRestoreButton();
        }
      }

      function selectHistoryCard(entry) {
        selectedSnapshot = entry;
        histList.querySelectorAll(".h-card").forEach((card) => {
          card.classList.toggle("selected", card.getAttribute("data-id") === entry.id);
        });
        const pages = entry.pages || [];
        histPage.innerHTML = "";
        histPage.disabled = pages.length === 0;
        pages.forEach((page) => {
          const option = document.createElement("option");
          option.value = page.id;
          option.textContent = page.name || page.id;
          histPage.appendChild(option);
        });
        updateRestoreButton();
        if (pages.length > 0) void loadPagePreview(entry.id, pages[0].id);
      }

      function updateRestoreButton() {
        histRestore.disabled = !(selectedSnapshot && !selectedSnapshot.isCurrent);
      }

      function loadPagePreview(snapshotId, pageId) {
        histPreview.innerHTML = '<div class="ph">预览生成中…</div>';
        const img = new Image();
        const url = previewUrl(snapshotId, pageId, "preview");
        img.addEventListener("load", () => {
          histPreview.innerHTML = "";
          img.style.maxWidth = "100%";
          img.style.maxHeight = "100%";
          histPreview.appendChild(img);
        });
        img.addEventListener("error", () => {
          const box = document.createElement("div");
          box.className = "ph";
          box.textContent = "预览不可用，可重试";
          const retry = document.createElement("button");
          retry.type = "button";
          retry.textContent = "重试";
          retry.addEventListener("click", () => void loadPagePreview(snapshotId, pageId));
          box.appendChild(document.createElement("br"));
          box.appendChild(retry);
          histPreview.innerHTML = "";
          histPreview.appendChild(box);
        });
        img.src = url;
      }

      function showConfirmRestore() {
        if (!selectedSnapshot || selectedSnapshot.isCurrent) return;
        confirmSnapshot = selectedSnapshot;
        histConfirm.querySelector("p").textContent = "将图表恢复为 v" + selectedSnapshot.sequence + " 的内容？";
        histConfirm.classList.add("open");
        histConfirm.setAttribute("aria-hidden", "false");
        document.getElementById("hist-confirm-cancel").focus();
      }

      function cancelConfirmRestore() {
        confirmSnapshot = null;
        histConfirm.classList.remove("open");
        histConfirm.setAttribute("aria-hidden", "true");
        if (histModal.classList.contains("open")) histRestore.focus();
      }

      async function confirmRestore() {
        if (!confirmSnapshot) return;
        await saveChain;
        editorMode = "restoring";
        restoreOverlay.classList.add("visible");
        restoreOverlay.setAttribute("aria-hidden", "false");
        histRestore.disabled = true;
        histConfirm.classList.remove("open");
        histConfirm.setAttribute("aria-hidden", "true");
        const snapshot = confirmSnapshot;
        confirmSnapshot = null;
        try {
          const url = new URL(CONFIG.historyUrl);
          url.pathname = "/api/history/" + encodeURIComponent(snapshot.id) + "/restore";
          const response = await fetch(url.toString(), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ baseRevision: current?.revision ?? 0, clientId }),
          });
          const result = await response.json();
          if (response.status === 409) {
            editorMode = "editing";
            showHistoryError("图表刚发生变化，请加载最新版本后重新确认。", true);
            void refreshHistoryList();
            return;
          }
          if (!response.ok) {
            editorMode = "editing";
            if (response.status === 404) {
              showHistoryError("该版本已不可用，历史列表已刷新。", false);
              void refreshHistoryList();
            } else if (result.error === "current_checkpoint_failed") {
              showHistoryError("无法安全保存当前版本，因此未执行恢复。", false);
            } else {
              showHistoryError(result.detail || "该版本无法恢复，当前画布保持不变。", false);
            }
            return;
          }
          // Success: the returned XML is the only allowed load target.
          preRestoreXml = current?.xml || null;
          restoreTargetXml = result.xml;
          pendingRestore = { xml: result.xml };
          current = {
            revision: result.revision,
            xml: result.xml,
            updatedBy: result.updatedBy,
            updatedAt: result.updatedAt,
          };
          editorMode = "loading-restored-xml";
          sendEditor({ action: "load", xml: result.xml, autosave: 1, diffSync: true, title: CONFIG.file });
          clearTimeout(restoreLoadTimer);
          // The load confirmation is authoritative; the timer only guards
          // against a stuck editor. On timeout we enter an explicit conflict
          // state that keeps blocking old autosaves, never silent editing.
          restoreLoadTimer = setTimeout(() => {
            if (editorMode !== "loading-restored-xml") return;
            editorMode = "conflict";
            restoreTargetXml = null;
            showConflictBanner("恢复内容加载超时，请确认最新版本；可重试加载或重新加载服务端当前版本。", true);
          }, 15000);
          closeHistory();
          showStatus(result.partial
            ? "图表已恢复，但历史记录异常：" + result.message
            : "已恢复为 v" + result.restoredFromSequence + " 的内容，已创建新版本 v" + result.sequence, 5000);
          void refreshAnnotations();
        } catch (error) {
          editorMode = "editing";
          showHistoryError("网络或服务暂时失败：" + (error.message || "未知错误") + "，请重试。", false);
        } finally {
          restoreOverlay.classList.remove("visible");
          restoreOverlay.setAttribute("aria-hidden", "true");
        }
      }

      async function reloadLatestFromHistory() {
        await saveChain;
        try {
          const latest = await readLatest();
          current = latest;
          editorMode = "editing";
          sendEditor({ action: "load", xml: latest.xml, autosave: 1, diffSync: true, title: CONFIG.file });
          showStatus("已加载最新版本 revision " + latest.revision, 2000);
          await refreshHistoryList();
        } catch (error) {
          showHistoryError("读取最新版本失败：" + (error.message || "未知错误"), true);
        }
      }

      function openDrawer() {
        if (editorMode === "restoring" || editorMode === "loading-restored-xml") return;
        closeHistory();
        annDrawer.classList.add("open");
        annDrawer.setAttribute("aria-hidden", "false");
        void refreshAnnotations();
      }

      function closeDrawer() {
        annDrawer.classList.remove("open");
        annDrawer.setAttribute("aria-hidden", "true");
        cancelAnnotationForm();
      }

      function startAnnotation() {
        awaitingSelection = true;
        pendingSelection = null;
        annForm.classList.add("visible");
        annList.style.display = "none";
        annSelection.textContent = "正在获取选中内容…";
        annInstruction.value = "";
        const defaultScope = document.querySelector('input[name="ann-scope"][value="selection_only"]');
        if (defaultScope) defaultScope.checked = true;
        annSubmit.disabled = true;
        annInstruction.focus();
        sendEditor({ action: "export", format: "json", selection: true, currentPage: true, allPages: false });
      }

      function cancelAnnotationForm() {
        awaitingSelection = false;
        pendingSelection = null;
        annForm.classList.remove("visible");
        annList.style.display = "";
      }

      function applySelectionExport(data) {
        if (!awaitingSelection) return;
        awaitingSelection = false;
        const page = data && data.pages && data.pages[0] ? data.pages[0] : null;
        const cells = page && Array.isArray(page.cells)
          ? page.cells.filter((cell) => cell.type === "node" || cell.type === "edge")
          : [];
        if (!page || cells.length === 0) {
          pendingSelection = null;
          annSelection.textContent = "未选中任何图元。请在画布上框选一个或多个节点或连线后再添加注释。";
          annSubmit.disabled = true;
          return;
        }
        pendingSelection = {
          pageId: page.id || "",
          pageName: page.name || "",
          cells: cells.map((cell) => ({
            id: cell.id,
            kind: cell.type === "edge" ? "edge" : "node",
            label: cell.label || "",
            source: cell.source,
            target: cell.target,
          })),
        };
        const labels = pendingSelection.cells
          .map((cell) => cell.label || cell.id)
          .slice(0, 5)
          .join("、");
        const extra = pendingSelection.cells.length > 5 ? " 等" : "";
        annSelection.textContent = "已选中 " + pendingSelection.cells.length + " 个图元：" + labels + extra;
        annSubmit.disabled = false;
      }

      async function submitAnnotation() {
        if (!pendingSelection) return;
        const instruction = annInstruction.value.trim();
        if (!instruction) { annInstruction.focus(); return; }
        annSubmit.disabled = true;
        try {
          const response = await fetch(CONFIG.annotationsUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ instruction, scope: selectedAnnotationScope(), pageId: pendingSelection.pageId, pageName: pendingSelection.pageName, cells: pendingSelection.cells }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "提交注释失败");
          showStatus("注释已提交", 1800);
          cancelAnnotationForm();
          await refreshAnnotations();
        } catch (error) {
          showStatus(error.message || "提交注释失败", 5000);
          annSubmit.disabled = false;
        }
      }

      async function resolveAnnotation(id, button) {
        if (button) button.disabled = true;
        try {
          const url = new URL(CONFIG.annotationsUrl);
          url.pathname += "/" + encodeURIComponent(id);

          const response = await fetch(url.toString(), {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: "resolved", summary: "已由用户标记为已解决" }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "标记已解决失败");
          await refreshAnnotations();
        } catch (error) {
          showStatus(error.message || "标记已解决失败", 5000);
          if (button) button.disabled = false;
        }
      }

      async function refreshAnnotations() {
        try {
          const url = new URL(CONFIG.annotationsUrl);
          url.searchParams.set("status", "all");
          const response = await fetch(url.toString(), { cache: "no-store" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "读取注释失败");
          renderAnnotations(result.annotations || []);
        } catch (error) {
          showStatus(error.message || "读取注释失败", 5000);
        }
      }

      function renderAnnotations(annotations) {
        const open = annotations.filter((task) => task.status !== "resolved");
        annCount.textContent = String(open.length);
        annCount.classList.toggle("zero", open.length === 0);
        if (annotations.length === 0) {
          annList.innerHTML = '<div id="ann-none">还没有注释。框选图元后点击“添加注释”，标注你要让 Agent 修改的地方。</div>';
          return;
        }
        const escape = (value) => String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
        annList.innerHTML = annotations.map((task) => {
          const status = task.stale ? "stale" : task.status;
          const cells = (task.cells || []).map((cell) => escape(cell.label || cell.id)).join("、");
          const region = task.region
            ? "区域 x=" + Math.round(task.region.x) + " y=" + Math.round(task.region.y)
              + " w=" + Math.round(task.region.width) + " h=" + Math.round(task.region.height)
            : "";
          const result = task.result
            ? '<div style="margin-top:6px;font-size:11px;color:#64748b">已处理：' + escape(task.result.summary || "") + "（revision " + task.result.revision + "）</div>"
            : "";
          const resolveBtn = task.status !== "resolved"
            ? '<form><button type="button" data-resolve="' + escape(task.id) + '">标记已解决</button></form>'
            : "";
          return '<div class="item ' + status + '">'
            + '<div class="meta"><span class="badge ' + status + '">' + ({ open: "待处理", stale: "已过时", resolved: "已解决" }[status] || status) + '</span>'
            + '<span>页面 ' + escape(task.page.name || task.page.id) + '</span>'
            + '<span>rev ' + task.baseRevision + '→' + task.currentRevision + '</span></div>'
            + '<div class="instruction">' + escape(task.instruction) + '</div>'
            + '<div class="cells">范围：' + escape(task.scopeLabel || "只修改选区") + ' · 图元：' + (cells || "（无）") + (region ? " · " + region : "") + '</div>'
            + (task.staleReason ? '<div style="margin-top:4px;font-size:11px;color:#b45309">⚠ ' + escape(task.staleReason) + '</div>' : "")
            + result + resolveBtn + '</div>';
        }).join("");
      }

      annBtn.addEventListener("click", openDrawer);
      document.getElementById("ann-close").addEventListener("click", closeDrawer);
      document.getElementById("ann-new").addEventListener("click", startAnnotation);
      document.getElementById("ann-cancel").addEventListener("click", cancelAnnotationForm);
      annSubmit.addEventListener("click", submitAnnotation);
      annList.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const id = target.getAttribute("data-resolve");
        if (id) void resolveAnnotation(id, target);
      });

      historyBtn.addEventListener("click", () => void openHistory());
      document.getElementById("hist-close").addEventListener("click", closeHistory);
      document.getElementById("hist-refresh").addEventListener("click", () => void refreshHistoryList());
      document.getElementById("hist-cancel").addEventListener("click", closeHistory);
      histRestore.addEventListener("click", showConfirmRestore);
      document.getElementById("hist-confirm-cancel").addEventListener("click", cancelConfirmRestore);
      document.getElementById("hist-confirm-ok").addEventListener("click", () => void confirmRestore());
      histPage.addEventListener("change", () => {
        if (selectedSnapshot) void loadPagePreview(selectedSnapshot.id, histPage.value);
      });
      histList.addEventListener("click", (event) => {
        const node = event.target instanceof Element ? event.target : null;
        const card = node ? node.closest(".h-card") : null;
        if (!card || !(card instanceof HTMLElement)) return;
        const id = card.getAttribute("data-id");
        if (selectedSnapshot && selectedSnapshot.id === id) { selectHistoryCard(selectedSnapshot); return; }
        void fetch(CONFIG.historyUrl, { cache: "no-store" }).then((response) => response.json()).then((result) => {
          const found = (result.entries || []).find((candidate) => candidate.id === id);
          if (found) selectHistoryCard(found);
        }).catch(() => showStatus("读取历史失败", 4000));
      });
      document.getElementById("conflict-reload").addEventListener("click", () => void reloadLatest());
      document.getElementById("conflict-retry").addEventListener("click", retryRestoreLoad);
      histModal.addEventListener("click", (event) => {
        if (event.target === histModal) closeHistory();
      });
      histConfirm.addEventListener("click", (event) => {
        if (event.target === histConfirm) cancelConfirmRestore();
      });
      // Focus management: open moves focus into the top dialog, Escape closes
      // only the top dialog, and Tab/Shift+Tab stays inside the top dialog.
      function trapFocus(container, event) {
        const focusables = container.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusables.length === 0) { event.preventDefault(); return; }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          if (histConfirm.classList.contains("open")) cancelConfirmRestore();
          else if (histModal.classList.contains("open")) closeHistory();
          return;
        }
        if (event.key === "Tab") {
          if (histConfirm.classList.contains("open")) { trapFocus(histConfirm, event); return; }
          if (histModal.classList.contains("open")) { trapFocus(histModal, event); return; }
        }
      });

      editor.src = CONFIG.drawioUrl;
      window.addEventListener("message", async event => {
        if (event.origin !== CONFIG.drawioOrigin || event.source !== editor.contentWindow) return;
        let message = event.data;
        try { if (typeof message === "string") message = JSON.parse(message); } catch { return; }
        if (!message || typeof message !== "object") return;
        if (message.event === "configure") {
          sendEditor({ action: "configure", config: { autosaveDelay: 250, preserveViewState: true } });
        } else if (message.event === "init") {
          try {
            current = await readLatest();
            sendEditor({ action: "load", xml: current.xml, autosave: 1, diffSync: true, title: CONFIG.file });
            void refreshAnnotations();
          } catch (error) { showStatus(error.message || "读取失败", 5000); }
        } else if (message.event === "export" && message.format === "json" && awaitingSelection) {
          applySelectionExport(message.data);
        } else if (message.event === "load" && typeof message.xml === "string") {
          // Draw.io acknowledges action:"load" with event:"load". Only the
          // exact restore target may release the save guard; a delayed initial
          // load acknowledgement must not confirm a different document.
          confirmRestoreTargetLoaded(message.xml);
        } else if ((message.event === "autosave" || message.event === "save") && typeof message.xml === "string") {
          const action = decideHistoryAutosave(editorMode, message.xml, restoreTargetXml);
          if (action === "drop") return;
          if (action === "confirm") {
            // Keep accepting a matching autosave/save as a compatibility
            // fallback for editor builds that emit it after loading.
            confirmRestoreTargetLoaded(message.xml);
            return;
          }
          queueSave(message.xml);
        }
      });

      const events = new EventSource(CONFIG.eventsUrl);
      events.addEventListener("diagram", event => {
        const update = JSON.parse(event.data);
        if (update.clientId === clientId) return;
        clearTimeout(externalTimer);
        externalTimer = setTimeout(() => {
          if (editorMode === "restoring" || editorMode === "loading-restored-xml" || editorMode === "conflict") return;
          void applyExternalRevision(update.revision);
        }, 250);
      });
      events.addEventListener("annotation", () => {
        void refreshAnnotations();
      });
      events.addEventListener("history", event => {
        if (!historyOpen) return;
        const update = JSON.parse(event.data);
        if (update.kind === "snapshot-created" || update.kind === "snapshot-evicted") {
          void refreshHistoryList();
        } else if (update.kind === "preview-ready" || update.kind === "preview-failed") {
          if (selectedSnapshot && update.snapshotId === selectedSnapshot.id) {
            void refreshHistoryList();
            if (update.kind === "preview-ready" && histPage.value) {
              void loadPagePreview(update.snapshotId, histPage.value);
            }
          } else {
            void refreshHistoryList();
          }
        }
      });
      events.onerror = () => showStatus("正在重连图表同步服务…", 5000);
    })();
  </script>
</body>
</html>`
}

async function handleIntegratedBridgeRequest(
  request: IncomingMessage,
  response: import("node:http").ServerResponse,
) {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`)
  const state = getIntegratedBridgeState()

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    integratedJsonResponse(response, 200, { ok: true, service: "drawio-integrated-bridge" })
    return
  }

  const authenticated = integratedTokenSession(request)
  if (!authenticated) {
    integratedJsonResponse(response, 401, { ok: false, error: "invalid or expired session token" })
    return
  }

  const { session } = authenticated
  if (request.method === "GET" && requestUrl.pathname === "/editor") {
    const editorUrl = drawioEditorUrl(
      session.editorUrl || process.env.DRAWIO_WEB_URL?.trim() || "https://embed.diagrams.net",
    )
    const bridgeUrl = new URL(`http://${state.host}:${state.port}`)
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Security-Policy": `default-src 'self'; frame-src ${editorUrl.origin}; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`,
      "Content-Type": "text/html; charset=utf-8",
    })
    response.end(buildIntegratedEditorPage({
      session,
      editorUrl,
      bridgeUrl,
      ["token"]: authenticated.sessionKey,
    }))
    return
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/diagram") {
    await refreshIntegratedSession(session)
    integratedJsonResponse(response, 200, integratedDocumentPayload(session))
    return
  }

  if (request.method === "PUT" && requestUrl.pathname === "/api/diagram") {
    let body: Record<string, unknown>
    try {
      body = await integratedRequestJson(request)
    } catch (error) {
      integratedJsonResponse(response, 400, { ok: false, error: (error as Error).message })
      return
    }
    const xml = typeof body.xml === "string" ? body.xml : ""
    const baseRevision = body.baseRevision
    if (!Number.isInteger(baseRevision)) {
      integratedJsonResponse(response, 400, { ok: false, error: "baseRevision must be an integer" })
      return
    }
    const result = await integratedCommit(
      session,
      xml,
      baseRevision as number,
      integratedSource(body.source),
      typeof body.clientId === "string" ? body.clientId : null,
    )
    if (result.conflict) {
      integratedJsonResponse(response, 409, {
        ok: false,
        error: "revision_conflict",
        current: integratedDocumentPayload(result.current),
        manualChanges: result.manualChanges,
      })
      return
    }
    if (result.invalid) {
      integratedJsonResponse(response, 422, {
        ok: false,
        error: "invalid Draw.io XML",
        validation: result.report,
      })
      return
    }
    integratedJsonResponse(response, 200, {
      ok: true,
      ...integratedDocumentPayload(result.document),
      validation: result.validation,
    })
    return
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/events") {
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    })
    response.write(": connected\\n\\n")
    const clients = state.eventClients.get(session.sessionId) || new Set()
    clients.add(response)
state.eventClients.set(session.sessionId, clients)
    request.on("close", () => {
      clients.delete(response)
      if (clients.size === 0) state.eventClients.delete(session.sessionId)
    })
    return
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/history") {
    await flushEditorHistoryCheckpoint(session)
    await refreshIntegratedSession(session)
    // If history recording lagged behind (e.g. an Agent commit whose snapshot
    // write failed earlier), capture the true current content now so the UI
    // never marks an old snapshot as the current version and blocks restoring it.
    try {
      await reconcileCurrentCheckpoint(session)
    } catch (error) {
      console.warn(`history reconcile failed for ${session.file}: ${(error as Error).message}`)
    }
    let manifest: HistoryManifest | null = null
    try {
      manifest = await readHistoryManifest(session)
    } catch (error) {
      session.historyWarning = `history disabled: ${(error as Error).message}`
      console.warn(session.historyWarning)
      await quarantineCorruptHistory(session)
      manifest = null
    }
    const entries = manifest ? [...manifest.entries].sort((a, b) => b.sequence - a.sequence) : []
    // The current version is the NEWEST snapshot whose content hash matches the
    // live diagram. When the same content appears in several snapshots (e.g. an
    // initial version plus a later re-discovered or restored copy of it), the
    // newest one is the live current version, not the oldest.
    const currentSnapshotId = manifest
      ? [...manifest.entries].reverse().find((entry) => entry.contentHash === session.fileHash)?.id ?? null
      : null
    integratedJsonResponse(response, 200, {
      ok: true,
      file: path.relative(session.workspace, session.file).split(path.sep).join("/"),
      currentRevision: session.revision,
      currentSnapshotId,
      historyWarning: session.historyWarning,
      count: entries.length,
      entries: entries.map((entry) => ({
        id: entry.id,
        sequence: entry.sequence,
        createdAt: entry.createdAt,
        source: entry.source,
        isCurrent: entry.id === currentSnapshotId,
        restoredFromSnapshotId: entry.restoredFromSnapshotId,
        restoredFromSequence: entry.restoredFromSnapshotId
          ? manifest?.entries.find((candidate) => candidate.id === entry.restoredFromSnapshotId)?.sequence ?? null
          : null,
        pages: entry.pages,
        previewState: entry.previewState,
      })),
    })
    return
  }

  const previewMatch = requestUrl.pathname.match(/^\/api\/history\/([^/]+)\/preview$/)
  if (request.method === "GET" && previewMatch) {
    const snapshotId = decodeURIComponent(previewMatch[1])
    if (!HISTORY_SNAPSHOT_ID_RE.test(snapshotId)) {
      integratedJsonResponse(response, 400, { ok: false, error: "invalid snapshot id" })
      return
    }
    const pageId = requestUrl.searchParams.get("pageId") || ""
    const mode = requestUrl.searchParams.get("mode") || "thumb"
    if (mode !== "thumb" && mode !== "preview") {
      integratedJsonResponse(response, 400, { ok: false, error: "mode must be thumb or preview" })
      return
    }
    if (!pageId) {
      integratedJsonResponse(response, 400, { ok: false, error: "pageId is required" })
      return
    }
    try {
      const manifest = await readHistoryManifest(session)
      const entry = manifest?.entries.find((candidate) => candidate.id === snapshotId)
      if (!entry) {
        integratedJsonResponse(response, 404, { ok: false, error: "snapshot not found" })
        return
      }
      if (!entry.pages.some((page) => page.id === pageId)) {
        integratedJsonResponse(response, 404, { ok: false, error: "page not found in snapshot" })
        return
      }
      // Validate the on-disk snapshot against its recorded contentHash before
      // serving any (possibly cached) preview, so a tampered snapshot can never
      // masquerade as the version described by the manifest.
      try {
        await readSnapshotXml(session, snapshotId, entry.contentHash)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          integratedJsonResponse(response, 404, { ok: false, error: "snapshot not found" })
          return
        }
        integratedJsonResponse(response, 503, {
          ok: false,
          error: "preview_unavailable",
          detail: (error as Error).message,
        })
        return
      }
      let content: Buffer | null = null
      const cached = previewFileFor(session, snapshotId, pageId, mode)
      try {
        content = await fs.readFile(cached)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      }
      if (!content) {
        try {
          content = await generateHistoryPreview(session, snapshotId, pageId, mode)
        } catch (error) {
          if (/page not found in snapshot/.test((error as Error).message)) {
            integratedJsonResponse(response, 404, { ok: false, error: "page not found in snapshot" })
            return
          }
          integratedJsonResponse(response, 503, {
            ok: false,
            error: "preview_unavailable",
            detail: (error as Error).message,
          })
          return
        }
      }
      response.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=86400",
        "Content-Length": String(content.length),
      })
      response.end(content)
    } catch (error) {
      integratedJsonResponse(response, 500, { ok: false, error: (error as Error).message })
    }
    return
  }

  const restoreMatch = requestUrl.pathname.match(/^\/api\/history\/([^/]+)\/restore$/)
  if (request.method === "POST" && restoreMatch) {
    const snapshotId = decodeURIComponent(restoreMatch[1])
    if (!HISTORY_SNAPSHOT_ID_RE.test(snapshotId)) {
      integratedJsonResponse(response, 400, { ok: false, error: "invalid snapshot id" })
      return
    }
    let body: Record<string, unknown>
    try {
      body = await integratedRequestJson(request)
    } catch (error) {
      integratedJsonResponse(response, 400, { ok: false, error: (error as Error).message })
      return
    }
    const baseRevision = body.baseRevision
    if (!Number.isInteger(baseRevision)) {
      integratedJsonResponse(response, 400, { ok: false, error: "baseRevision must be an integer" })
      return
    }
    const result = await restoreHistorySnapshot(
      session,
      snapshotId,
      baseRevision as number,
      typeof body.clientId === "string" ? body.clientId : null,
    )
    if (result.conflict) {
      integratedJsonResponse(response, 409, {
        ok: false,
        error: "revision_conflict",
        current: integratedDocumentPayload(result.current),
      })
      return
    }
    if (result.invalid) {
      if (result.error === "snapshot_not_found") {
        integratedJsonResponse(response, 404, { ok: false, error: "snapshot_not_found" })
      } else if (result.error === "current_snapshot") {
        integratedJsonResponse(response, 400, { ok: false, error: "current_snapshot" })
      } else {
        integratedJsonResponse(response, 422, {
          ok: false,
          error: "snapshot_damaged",
          detail: result.error,
        })
      }
      return
    }
    if (result.checkpointFailed) {
      integratedJsonResponse(response, 500, {
        ok: false,
        error: "current_checkpoint_failed",
        detail: result.error,
      })
      return
    }
    if (result.partFailed) {
      integratedJsonResponse(response, 200, {
        ok: true,
        partial: true,
        message: result.message,
        ...integratedDocumentPayload(result.document),
      })
      return
    }
    integratedJsonResponse(response, 200, {
      ok: true,
      ...integratedDocumentPayload(result.document),
      snapshotId: result.snapshot.id,
      sequence: result.snapshot.sequence,
      restoredFromSnapshotId: result.snapshot.restoredFromSnapshotId,
      restoredFromSequence: result.restoredFromSequence,
      annotationInvalidationWarning: result.annotationInvalidationWarning,
    })
    return
  }

  const annotationIdMatch = requestUrl.pathname.match(/^\/api\/annotations\/([^/]+)$/)
  const annotationId = annotationIdMatch ? decodeURIComponent(annotationIdMatch[1]) : null

  if (request.method === "GET" && requestUrl.pathname === "/api/annotations") {
    await refreshIntegratedSession(session)
    const map = getSessionAnnotations(session.sessionId)
    const statusFilter = requestUrl.searchParams.get("status")
    const list = [...map.values()]
      .map((task) => ({ task, state: annotationEffectiveState(session, task) }))
      .filter((entry) => annotationMatchesStatus(entry.state, statusFilter))
      .map((entry) => annotationPayload(session, entry.task, entry.state))
    integratedJsonResponse(response, 200, {
      ok: true,
      sessionId: session.sessionId,
      file: path.relative(session.workspace, session.file).split(path.sep).join("/"),
      count: list.length,
      annotations: list,
    })
    return
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/annotations") {
    let body: Record<string, unknown>
    try {
      body = await integratedRequestJson(request)
    } catch (error) {
      integratedJsonResponse(response, 400, { ok: false, error: (error as Error).message })
      return
    }
    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : ""
    if (!instruction) {
      integratedJsonResponse(response, 400, { ok: false, error: "instruction must not be empty" })
      return
    }
    const pageId = typeof body.pageId === "string" ? body.pageId : ""
    const scope = annotationScope(body.scope)
    const cells = Array.isArray(body.cells)
      ? body.cells
        .filter((cell): cell is Record<string, unknown> => integratedRecord(cell) && typeof cell.id === "string")
        .map((cell) => ({
          id: String(cell.id),
          kind: cell.kind === "edge" ? ("edge" as const) : ("node" as const),
          label: typeof cell.label === "string" ? cell.label : "",
          source: typeof cell.source === "string" ? cell.source : undefined,
          target: typeof cell.target === "string" ? cell.target : undefined,
        }))
      : []
    if (cells.length === 0) {
      integratedJsonResponse(response, 400, { ok: false, error: "select at least one cell before adding an annotation" })
      return
    }
    await refreshIntegratedSession(session)
    const pages = parseDrawio(session.xml)
    const pageName = typeof body.pageName === "string" ? body.pageName
      : pages.find((page) => page.id === pageId)?.name || ""
    const region = annotationRegion(pages, pageId, cells.map((cell) => cell.id))
    const now = new Date().toISOString()
    const id = `ant_${randomBytes(6).toString("base64url")}`
    const task: AnnotationTask = {
      id,
      sessionId: session.sessionId,
      file: path.relative(session.workspace, session.file).split(path.sep).join("/"),
      pageId,
      pageName,
      cells,
      region,
      instruction,
      scope,
      authorization: null,
      status: "open",
      baseRevision: session.revision,
      result: null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    }
    const map = getSessionAnnotations(session.sessionId)
    map.set(task.id, task)
    await persistStoredAnnotations(session)
    broadcastAnnotation(session, task, "created")
    integratedJsonResponse(response, 201, {
      ok: true,
      annotation: annotationPayload(session, task),
    })
    return
  }

  if (annotationId && request.method === "GET") {
    await refreshIntegratedSession(session)
    const map = getSessionAnnotations(session.sessionId)
    const task = map.get(annotationId)
    if (!task) {
      integratedJsonResponse(response, 404, { ok: false, error: "annotation not found" })
      return
    }
    integratedJsonResponse(response, 200, {
      ok: true,
      annotation: annotationPayload(session, task),
    })
    return
  }

  if (annotationId && (request.method === "PATCH" || request.method === "PUT")) {
    const map = getSessionAnnotations(session.sessionId)
    const task = map.get(annotationId)
    if (!task) {
      integratedJsonResponse(response, 404, { ok: false, error: "annotation not found" })
      return
    }
    let body: Record<string, unknown>
    try {
      body = await integratedRequestJson(request)
    } catch (error) {
      integratedJsonResponse(response, 400, { ok: false, error: (error as Error).message })
      return
    }
    const requestedStatus = typeof body.status === "string" ? body.status : ""
    if (requestedStatus === "resolved") {
      const summary = typeof body.summary === "string" ? body.summary.trim() : ""
      const changedIds = Array.isArray(body.changedIds)
        ? body.changedIds.map((value) => String(value))
        : []
      task.status = "resolved"
      task.result = {
        summary: summary || "resolved",
        changedIds,
        revision: session.revision,
        updatedAt: new Date().toISOString(),
      }
      task.resolvedAt = task.result.updatedAt
      if (session.activeAnnotationId === task.id) session.activeAnnotationId = null
    } else if (requestedStatus === "open" || requestedStatus === "stale") {
      task.status = requestedStatus
      if (requestedStatus === "open") {
        task.result = null
        task.resolvedAt = null
      }
    }
    task.updatedAt = new Date().toISOString()
    map.set(annotationId, task)
    await persistStoredAnnotations(session)
    broadcastAnnotation(session, task, "updated")
    integratedJsonResponse(response, 200, {
      ok: true,
      annotation: annotationPayload(session, task),
    })
    return
  }

  integratedJsonResponse(response, 404, { ok: false, error: "not found" })
}

function integratedBridgeSettings() {
  const host = process.env.DRAWIO_BRIDGE_HOST?.trim() || "127.0.0.1"
  const rawPort = process.env.DRAWIO_BRIDGE_PORT?.trim() || "0"
  const port = Number(rawPort)
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`invalid DRAWIO_BRIDGE_PORT: ${rawPort}`)
  }
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
    throw new Error("integrated Draw.io bridge must listen on loopback")
  }
  return { host, port }
}

async function ensureIntegratedBridgeStarted(): Promise<{ host: string; port: number }> {
  const state = getIntegratedBridgeState()
  if (state.startPromise) return state.startPromise
  const settings = integratedBridgeSettings()
  state.startPromise = new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      void handleIntegratedBridgeRequest(request, response).catch(error => {
        if (!response.headersSent) {
          integratedJsonResponse(response, 500, { ok: false, error: (error as Error).message })
        } else {
          response.end()
        }
      })
    })
    server.once("error", error => {
      state.startPromise = null
      reject(error)
    })
    server.listen(settings.port, settings.host, () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        state.startPromise = null
        reject(new Error("integrated Draw.io bridge did not bind a TCP port"))
        return
      }
      state.server = server
      state.host = settings.host
      state.port = address.port
      resolve({ host: settings.host, port: address.port })
    })
  })
  return state.startPromise
}

async function bindIntegratedSession(
  context: { sessionID: string; directory: string; worktree?: string },
  target: string,
): Promise<{ session: IntegratedSession; token: string; bridge: { host: string; port: number } }> {
  const workspace = resolveWorkspaceRoot(context)
  const initialXml = await readDiagramFile(target)
  const report = validationReport(parseDrawio(initialXml))
  if (!report.valid) throw new Error(`refusing to open invalid diagram: ${JSON.stringify(report.errors)}`)

  const state = getIntegratedBridgeState()
  const existing = state.sessions.get(context.sessionID)
  const session = existing && path.resolve(existing.file) === path.resolve(target)
    ? await refreshIntegratedSession(existing)
    : {
      sessionId: context.sessionID,
      workspace,
      file: target,
      revision: 0,
      xml: initialXml,
      fileHash: integratedHash(initialXml),
      updatedBy: "initial" as const,
      updatedAt: new Date().toISOString(),
      history: [{
        revision: 0,
        xml: initialXml,
        updatedBy: "initial" as const,
        updatedAt: new Date().toISOString(),
      }],
      backupFile: null,
      activeAnnotationId: null,
      historyWarning: null,
    }
state.sessions.set(context.sessionID, session)
  session.activeAnnotationId ??= null
  await loadStoredAnnotations(session)
  await bindHistoryCheckpoint(session)
  const bridge = await ensureIntegratedBridgeStarted()
  const token = randomBytes(24).toString("base64url")
  state.tokens.set(token, {
    sessionId: context.sessionID,
    expiresAt: Date.now() + BRIDGE_TOKEN_TTL_MS,
  })
  return { session, token, bridge }
}

const nodeSchema = tool.schema.object({
  id: tool.schema.string().describe("Stable unique cell id; 0 and 1 are reserved"),
  label: tool.schema.string().describe("Visible node label"),
  kind: tool.schema
    .enum(["default", "application", "service", "database", "external", "decision"])
    .optional()
    .describe("Visual node category"),
})

const edgeSchema = tool.schema.object({
  id: tool.schema.string().optional().describe("Stable unique edge id"),
  source: tool.schema.string().describe("Source node id"),
  target: tool.schema.string().describe("Target node id"),
  label: tool.schema.string().optional().describe("Visible edge label"),
})

const patchOperationSchema = tool.schema.object({
  type: tool.schema.enum([
    "add-node",
    "update-node",
    "remove-node",
    "add-edge",
    "update-edge",
    "remove-edge",
  ]),
  id: tool.schema.string().describe("Stable target or new cell id"),
  label: tool.schema.string().optional(),
  kind: tool.schema
    .enum(["default", "application", "service", "database", "external", "decision"])
    .optional(),
  source: tool.schema.string().optional(),
  target: tool.schema.string().optional(),
  x: tool.schema.number().optional(),
  y: tool.schema.number().optional(),
  width: tool.schema.number().positive().optional(),
  height: tool.schema.number().positive().optional(),
  cascade: tool.schema
    .boolean()
    .optional()
    .describe("For remove-node, also remove connected edges"),
})

const DRAWIO_RUNTIME_GUIDANCE = `## Draw.io 文件写入与交付

已通过 drawio_open 绑定的文件可能包含用户在内置浏览器中的手动修改。
每次修改前必须立即调用 drawio_get_state，并把返回的最新 XML 作为修改基线。人工编辑不是只读内容，可以按当前任务要求继续调整。
提交时必须携带该次读取返回的准确 base_revision；revision_conflict 后重新读取，在新 XML 上重新执行所需变更并重试，禁止重发旧 XML。
禁止用普通 write、edit 或脚本直接覆盖已绑定的 .drawio 文件，因为这会绕过 revision 检查并可能用旧快照丢失最新内容。
本轮全部可执行创建或修改（包括 fresh annotation）完成后必须统一调用 drawio_finalize：校验、评分、自动导出同名 PNG，并将 openUrl 交给 MobileWork 现有 browser.open_url 打开。完成浏览器调用前不要结束任务。

## 注释任务（框选评审）

用户在内置浏览器中框选图元并提交注释后，每条注释是一条独立任务，记录选中图元的稳定 ID、页面、区域范围、修改说明、允许范围和提交时的 revision。
注释的 status 只有 open/resolved；freshness=stale 表示图元已变化但任务仍未完成。执行 stale 注释前必须先询问用户；fresh 注释可直接进入计划和审批流程。
处理注释时必须先读取最新状态并 dry-run，向用户说明计划、完整稳定 ID 清单和范围，再调用 drawio_authorize_annotation_change。该工具必须由 OpenCode 以 ask 权限弹窗在写入前批准；批准后才可把一次性 token 传给正式 drawio_patch/drawio_update_state。调用 drawio_patch 时传 annotation_id，由运行时强制使用注释绑定的 pageId。禁止先改后问。
不得修改授权范围外内容。确需越界时，在 authorization 的 escalation_reason 中先说明不可避免的原因并申请更宽范围；未获批准不得写入。drawio_polish 会重排整页，存在活动注释时禁止正式运行。
用户本轮另有明确任务时先完成该任务，然后在同一轮重新探测注释；最终回复前仍存在 requiresConfirmation=false 的 open 注释时必须继续处理，不能只提示用户稍后继续。
注释任务的检查与处理流程由 drawio-session-editing 技能负责编排，详见该 SKILL.md。`

function candidateDrawioPath(args: unknown): string | null {
  if (!args || typeof args !== "object" || Array.isArray(args)) return null
  const record = args as Record<string, unknown>
  for (const key of ["filePath", "file_path", "path", "file"]) {
    if (typeof record[key] === "string" && record[key].toLowerCase().endsWith(".drawio")) {
      return record[key]
    }
  }
  return null
}

export const DrawioExpertPlugin: Plugin = async (input) => {
  await loadWorkspaceEnvironment(input.directory)

  return {
"experimental.chat.system.transform": async (_input, output) => {
    output.system.push(DRAWIO_RUNTIME_GUIDANCE)
  },
  "tool.execute.before": async (input, output) => {
    if (!["write", "edit", "apply_patch"].includes(input.tool)) return
    const requested = candidateDrawioPath(output.args)
    if (!requested) return
    const state = getIntegratedBridgeState()
    const session = state.sessions.get(input.sessionID)
    if (!session) return
    const target = path.isAbsolute(requested)
      ? path.resolve(requested)
      : path.resolve(session.workspace, requested)
    if (target.toLowerCase() === path.resolve(session.file).toLowerCase()) {
      throw new Error(
        "This Draw.io file is bound to an active browser session. "
        + "Call drawio_get_state, then use drawio_patch, drawio_polish, or drawio_update_state with its exact revision.",
      )
    }
  },
  tool: {
    drawio_validate: tool({
      description: "Validate a workspace Draw.io file and report pages, file size, nodes, edges, errors, and warnings.",
      args: {
        input_path: tool.schema.string().describe("Workspace-relative .drawio or .xml file"),
      },
      async execute(args, context) {
        const target = resolveWorkspacePath(context, args.input_path)
        const session = integratedSessionFor(context, target)
        const xml = session ? (await refreshIntegratedSession(session)).xml : await readDiagramFile(target)
        const pages = parseDrawio(xml)
        const stat = await fs.stat(target)
        return JSON.stringify({
          success: true,
          input_path: workspaceRelative(context, target),
          file_size_bytes: stat.size,
          is_valid_drawio: true,
          page_count: pages.length,
          pages: pages.map((page) => ({
            id: page.id,
            name: page.name,
            compressed: page.compressed,
            nodes: page.cells.filter((cell) => cell.vertex).length,
            edges: page.cells.filter((cell) => cell.edge).length,
          })),
          ...validationReport(pages),
        }, null, 2)
      },
    }),

    drawio_export: tool({
      description:
        "Export a workspace Draw.io file to PNG, JPEG, or PDF through the configured Docker HTTP Export Server.",
      args: {
        input_path: tool.schema.string().describe("Workspace-relative .drawio or .xml input file"),
        format: tool.schema.enum(["png", "jpeg", "pdf"]),
        output_path: tool.schema.string().optional().describe("Workspace-relative output path"),
        page_id: tool.schema.string().optional(),
        all_pages: tool.schema.boolean().default(false),
        scale: tool.schema.number().positive().default(1),
        border: tool.schema.number().int().min(0).default(0),
        background: tool.schema
          .string()
          .default(DEFAULT_EXPORT_BACKGROUND)
          .describe("Export background color; defaults to white to avoid transparent PNG previews"),
        embed_xml: tool.schema.boolean().default(false),
        overwrite: tool.schema.boolean().default(false),
      },
      async execute(args, context) {
        const inputTarget = resolveWorkspacePath(context, args.input_path)
        const session = integratedSessionFor(context, inputTarget)
        const xml = session ? (await refreshIntegratedSession(session)).xml : await readDiagramFile(inputTarget)
        const pages = parseDrawio(xml)
        const report = validationReport(pages)
        if (!report.valid) {
          throw new Error(`refusing to export invalid Draw.io XML: ${JSON.stringify(report.errors)}`)
        }
        const exported = await exportDiagramToFile({
          context,
          inputTarget,
          xml,
          format: args.format,
          outputPath: args.output_path,
          pageId: args.page_id,
          allPages: args.all_pages,
          scale: args.scale,
          border: args.border,
          background: args.background,
          embedXml: args.embed_xml,
          overwrite: args.overwrite,
        })
        return JSON.stringify({
          success: true,
          input_path: workspaceRelative(context, inputTarget),
          output_path: workspaceRelative(context, exported.outputTarget),
          format: args.format,
          file_size_bytes: exported.bytes,
          content_type: exported.contentType,
          export_url: exported.exportUrl,
        }, null, 2)
      },
    }),

    drawio_health_check: tool({
      description: "Check the TypeScript Draw.io runtime and Docker Export Server; deep=true performs a real PNG export.",
      args: {
        deep: tool.schema.boolean().default(false),
      },
      async execute(args, context) {
        const settings = exportSettings()
        const connectivity = await checkExportConnectivity()
        const result: Record<string, unknown> = {
          success: connectivity.reachable,
          checks: {
            runtime: { status: "ok", implementation: "opencode-typescript-plugin" },
            workspace: { root: resolveWorkspaceRoot(context) },
            export_server: { url: settings.url.toString(), ...connectivity },
            supported_formats: ["jpeg", "pdf", "png"],
            configuration: {
              timeout_seconds: settings.timeoutMs / 1000,
              max_input_size_mb: MAX_FILE_BYTES / 1024 / 1024,
              max_output_size_mb: settings.maxOutputBytes / 1024 / 1024,
            },
          },
        }
        if (args.deep && connectivity.reachable) {
          try {
            const xml = buildDrawioDocument(
              "HealthCheck",
              [{ id: "health", label: "OK", kind: "default" }],
              [],
              "left-to-right",
              false,
            )
            const exported = await requestDrawioExport(xml, "png")
            ;(result.checks as Record<string, unknown>).deep_test = {
              success: true,
              format: "png",
              content_type: exported.contentType,
              size_bytes: exported.content.length,
            }
          } catch (error) {
            result.success = false
            ;(result.checks as Record<string, unknown>).deep_test = {
              success: false,
              error: (error as Error).message,
            }
          }
        } else if (args.deep) {
          ;(result.checks as Record<string, unknown>).deep_test = {
            success: false,
            error: "export server is not reachable",
          }
        }
        return JSON.stringify(result, null, 2)
      },
    }),

    drawio_create: tool({
      description:
        "Create a validated Draw.io file from a semantic graph. Use this instead of writing mxGraphModel XML directly.",
      args: {
        file: tool.schema.string().describe("Workspace-relative .drawio or .xml output path"),
        title: tool.schema.string().describe("Diagram page title"),
        nodes: tool.schema.array(nodeSchema).describe("Diagram nodes"),
        edges: tool.schema.array(edgeSchema).default([]).describe("Diagram edges"),
        direction: tool.schema
          .enum(["left-to-right", "top-to-bottom"])
          .default("left-to-right")
          .describe("Layered layout direction"),
        compressed: tool.schema
          .boolean()
          .default(false)
          .describe("Write standard compressed Draw.io page payload"),
        overwrite: tool.schema
          .boolean()
          .default(false)
          .describe("Allow replacement; the previous file is preserved as a timestamped backup"),
      },
      async execute(args, context) {
        validateSemanticGraph(args.nodes, args.edges)
        const target = resolveWorkspacePath(context, args.file)
        if (integratedSessionFor(context, target)) {
          throw new Error(
            "active Draw.io sessions cannot be replaced by drawio_create; "
            + "call drawio_get_state and submit an incremental revision-aware update",
          )
        }
        const xml = buildDrawioDocument(
          args.title,
          args.nodes,
          args.edges,
          args.direction,
          args.compressed,
        )
        const pages = parseDrawio(xml)
        const report = validationReport(pages)
        if (!report.valid) {
          throw new Error(`generated diagram failed validation: ${JSON.stringify(report.errors)}`)
        }
        const writeResult = await atomicWrite(target, xml, args.overwrite)
        return JSON.stringify({
          created: workspaceRelative(context, target),
          backup: writeResult.backup
            ? workspaceRelative(context, writeResult.backup)
            : null,
          compressed: args.compressed,
          ...report,
        }, null, 2)
      },
    }),

    drawio_inspect: tool({
      description:
        "Inspect a compressed or uncompressed Draw.io file and return pages, nodes, edges, geometry, and styles.",
      args: {
        file: tool.schema.string().describe("Workspace-relative .drawio or .xml file"),
      },
      async execute(args, context) {
        const target = resolveWorkspacePath(context, args.file)
        const session = integratedSessionFor(context, target)
        const xml = session ? (await refreshIntegratedSession(session)).xml : await readDiagramFile(target)
        const pages = parseDrawio(xml)
        return JSON.stringify({
          file: workspaceRelative(context, target),
          pages: pages.map((page) => ({
            id: page.id,
            name: page.name,
            compressed: page.compressed,
            nodes: page.cells.filter((cell) => cell.vertex),
            edges: page.cells.filter((cell) => cell.edge),
          })),
          ...validationReport(pages),
        }, null, 2)
      },
    }),

    drawio_quality: tool({
      description:
        "Score Draw.io layout quality and report actionable issues including node overlaps, edge-node intersections, edge crossings, edge-label collisions, empty labels, and missing arc line jumps.",
      args: {
        file: tool.schema.string().describe("Workspace-relative .drawio or .xml file"),
        threshold: tool.schema
          .number()
          .min(0)
          .max(100)
          .default(90)
          .describe("Minimum accepted quality score"),
      },
      async execute(args, context) {
        const target = resolveWorkspacePath(context, args.file)
        const session = integratedSessionFor(context, target)
        const xml = session ? (await refreshIntegratedSession(session)).xml : await readDiagramFile(target)
        const pages = parseDrawio(xml)
        return JSON.stringify({
          file: workspaceRelative(context, target),
          ...qualityReport(pages, args.threshold),
        }, null, 2)
      },
    }),

    drawio_patch: tool({
      description:
        "Apply semantic node and edge operations to an existing Draw.io file. Pass annotation_id when executing an annotation so its bound page is enforced. Preserves unrelated cells and creates a recoverable backup unless dry_run is true.",
      args: {
        file: tool.schema.string().describe("Workspace-relative .drawio or .xml file"),
        page: tool.schema
          .string()
          .optional()
          .describe("Page id or name; defaults to the first page unless annotation_id enforces the annotation page"),
        annotation_id: tool.schema
          .string()
          .optional()
          .describe("Annotation being executed; binds the target page and is mandatory for a formal annotation-driven write"),
        operations: tool.schema
          .array(patchOperationSchema)
          .min(1)
          .describe("Ordered semantic operations"),
        dry_run: tool.schema
          .boolean()
          .default(false)
          .describe("Return the diff and validation result without writing"),
        base_revision: tool.schema
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Exact revision returned by drawio_get_state; mandatory when writing an active session"),
        approval_token: tool.schema
          .string()
          .optional()
          .describe("One-time token returned after drawio_authorize_annotation_change is approved"),
      },
      async execute(args, context) {
        const target = resolveWorkspacePath(context, args.file)
        const session = integratedSessionFor(context, target)
        const activeSession = session ? await refreshIntegratedSession(session) : null
        let pageSelector = args.page
        if (args.annotation_id) {
          if (!activeSession) {
            throw new Error("annotation_id requires an active Draw.io session for this file")
          }
          const annotation = getSessionAnnotations(activeSession.sessionId).get(args.annotation_id)
          if (!annotation) throw new Error(`annotation not found: ${args.annotation_id}`)
          if (annotation.status === "resolved") {
            throw new Error(`annotation is already resolved: ${args.annotation_id}`)
          }
          if (!annotation.pageId.trim()) {
            throw new Error(`annotation has no stable page id: ${args.annotation_id}`)
          }
          if (args.page && args.page !== annotation.pageId && args.page !== annotation.pageName) {
            throw new Error(
              `annotation ${args.annotation_id} is bound to page ${annotation.pageId}; received page ${args.page}`,
            )
          }
          pageSelector = annotation.pageId
        }
        if (activeSession && !args.dry_run && args.base_revision === undefined) {
          throw new Error(
            "base_revision is required for an active Draw.io session; "
            + "call drawio_get_state immediately before writing",
          )
        }
        const annotationGuard = activeSession && !args.dry_run
          ? requireAnnotationAuthorization(activeSession, args.annotation_id, args.approval_token)
          : null
        const beforeXml = activeSession?.xml || await readDiagramFile(target)
        const beforePages = parseDrawio(beforeXml)
        const editable = parseEditableDrawio(beforeXml)
        const page = selectEditablePage(editable, pageSelector)
        const changedIds = applyPatchOperations(page, args.operations as PatchOperation[])
        if (annotationGuard) {
          validateAnnotationPatchScope(annotationGuard, args.operations as PatchOperation[], changedIds)
        }
        const afterXml = serializeEditableDrawio(editable)
        const afterPages = parseDrawio(afterXml)
        const report = validationReport(afterPages)
        if (!report.valid) {
          throw new Error(`patched diagram failed validation: ${JSON.stringify(report.errors)}`)
        }
        const diff = diffParsedPages(beforePages, afterPages)

        if (args.dry_run) {
          return JSON.stringify({
            file: args.file,
            dryRun: true,
            changedIds,
            diff,
            ...report,
          }, null, 2)
        }

        if (activeSession) {
          const commit = await integratedCommit(activeSession, afterXml, args.base_revision!, "agent")
          if (commit.conflict) {
            return JSON.stringify({
              file: args.file,
              dryRun: false,
              ...commit,
            }, null, 2)
          }
          if (commit.invalid) {
            throw new Error(`patched diagram failed validation: ${JSON.stringify(commit.report.errors)}`)
          }
          if (annotationGuard) await consumeAnnotationAuthorization(activeSession, annotationGuard)
          return JSON.stringify({
            file: workspaceRelative(context, target),
            dryRun: false,
            backup: activeSession.backupFile
              ? workspaceRelative(context, activeSession.backupFile)
              : null,
            revision: activeSession.revision,
            changedIds,
            diff,
            ...report,
          }, null, 2)
        }

        const writeResult = await atomicWrite(target, afterXml, true)
        return JSON.stringify({
          file: workspaceRelative(context, target),
          dryRun: false,
          backup: writeResult.backup
            ? workspaceRelative(context, writeResult.backup)
            : null,
          changedIds,
          diff,
          ...report,
        }, null, 2)
      },
    }),

    drawio_polish: tool({
      description:
        "Run a deterministic quality loop: analyze, auto-layout and reroute a page, validate the result, enforce a quality threshold, and optionally write with backup.",
      args: {
        file: tool.schema.string().describe("Workspace-relative .drawio or .xml file"),
        page: tool.schema
          .string()
          .optional()
          .describe("Page id or name; defaults to the first page"),
        direction: tool.schema
          .enum(["left-to-right", "top-to-bottom"])
          .default("left-to-right")
          .describe("Layered layout direction"),
        threshold: tool.schema
          .number()
          .min(0)
          .max(100)
          .default(90)
          .describe("Minimum quality score required before writing"),
        dry_run: tool.schema
          .boolean()
          .default(true)
          .describe("Analyze and preview the complete diff without writing"),
        base_revision: tool.schema
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Exact revision returned by drawio_get_state; mandatory when writing an active session"),
      },
      async execute(args, context) {
        const target = resolveWorkspacePath(context, args.file)
        const session = integratedSessionFor(context, target)
        const activeSession = session ? await refreshIntegratedSession(session) : null
        if (activeSession && !args.dry_run && args.base_revision === undefined) {
          throw new Error(
            "base_revision is required for an active Draw.io session; "
            + "call drawio_get_state immediately before writing",
          )
        }
        if (activeSession && !args.dry_run && activeAnnotationTask(activeSession)) {
          throw new Error(
            "drawio_polish may relayout the whole page and is blocked while an annotation is active; "
            + "use scoped drawio_patch after explicit annotation approval",
          )
        }
        const beforeXml = activeSession?.xml || await readDiagramFile(target)
        const beforePages = parseDrawio(beforeXml)
        const beforeQuality = qualityReport(beforePages, args.threshold)
        const editable = parseEditableDrawio(beforeXml)
        const page = selectEditablePage(editable, args.page)
        const changedIds = autoLayoutPage(page, args.direction)
        const afterXml = serializeEditableDrawio(editable)
        const afterPages = parseDrawio(afterXml)
        const afterQuality = qualityReport(afterPages, args.threshold)
        const diff = diffParsedPages(beforePages, afterPages)

        const result = {
          file: workspaceRelative(context, target),
          dryRun: args.dry_run,
          accepted: afterQuality.pass,
          changedIds,
          diff,
          beforeQuality,
          afterQuality,
        }
        if (args.dry_run) {
          return JSON.stringify({
            ...result,
            backup: null,
          }, null, 2)
        }
        if (!afterQuality.pass) {
          throw new Error(
            `polished diagram did not meet quality threshold ${args.threshold}; `
            + `score=${afterQuality.score}, issues=${JSON.stringify(afterQuality.issues)}`,
          )
        }

        let writeResult: { backup: string | null }
        if (activeSession) {
          const commit = await integratedCommit(activeSession, afterXml, args.base_revision!, "agent")
          if (commit.conflict) {
            return JSON.stringify({
              ...result,
              conflict: true,
              current: integratedDocumentPayload(commit.current),
              manualChanges: commit.manualChanges,
            }, null, 2)
          }
          if (commit.invalid) {
            throw new Error(`polished diagram failed validation: ${JSON.stringify(commit.report.errors)}`)
          }
          writeResult = { backup: activeSession.backupFile }
        } else {
          writeResult = await atomicWrite(target, afterXml, true)
        }
        return JSON.stringify({
          ...result,
          backup: writeResult.backup
            ? workspaceRelative(context, writeResult.backup)
            : null,
        }, null, 2)
      },
    }),

    drawio_compare: tool({
      description:
        "Compare two Draw.io files by stable page and cell ids, reporting added, removed, changed, and unchanged nodes and edges.",
      args: {
        before: tool.schema
          .string()
          .describe("Workspace-relative baseline .drawio, .xml, or plugin-created .bak file"),
        after: tool.schema
          .string()
          .describe("Workspace-relative updated .drawio, .xml, or plugin-created .bak file"),
      },
      async execute(args, context) {
        const beforeTarget = resolveWorkspaceFile(context, args.before, COMPARABLE_EXTENSIONS)
        const afterTarget = resolveWorkspaceFile(context, args.after, COMPARABLE_EXTENSIONS)
        const beforePages = parseDrawio(await readDiagramFile(beforeTarget))
        const afterPages = parseDrawio(await readDiagramFile(afterTarget))
        return JSON.stringify({
          before: workspaceRelative(context, beforeTarget),
          after: workspaceRelative(context, afterTarget),
          diff: diffParsedPages(beforePages, afterPages),
          beforeStats: validationReport(beforePages).stats,
          afterStats: validationReport(afterPages).stats,
        }, null, 2)
      },
    }),

    drawio_get_state: tool({
      description:
        "Read the latest XML and revision for the current session's active Draw.io file. Use this before changing a user-edited diagram.",
      args: {
        since_revision: tool.schema
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Optionally report stable-ID changes since this revision"),
      },
      async execute(args, context) {
        const session = getIntegratedBridgeState().sessions.get(context.sessionID)
        if (!session) throw new Error("No active Draw.io session. Call drawio_open first.")
        await refreshIntegratedSession(session)
        const result: Record<string, unknown> = integratedDocumentPayload(session)
        if (args.since_revision !== undefined) {
          result.changesSince = integratedManualChanges(session, args.since_revision)
        }
        return JSON.stringify(result, null, 2)
      },
    }),

    drawio_update_state: tool({
      description:
        "Replace the active session's complete Draw.io XML using the exact revision from an immediately preceding drawio_get_state call. A stale revision is rejected.",
      args: {
        base_revision: tool.schema.number().int().min(0),
        xml: tool.schema.string().min(1),
        annotation_id: tool.schema
          .string()
          .optional()
          .describe("Active annotation id; mandatory for an annotation-driven write"),
        approval_token: tool.schema
          .string()
          .optional()
          .describe("One-time token returned after drawio_authorize_annotation_change is approved"),
      },
      async execute(args, context) {
        const session = getIntegratedBridgeState().sessions.get(context.sessionID)
        if (!session) throw new Error("No active Draw.io session. Call drawio_open first.")
        await refreshIntegratedSession(session)
        const annotationGuard = requireAnnotationAuthorization(
          session,
          args.annotation_id,
          args.approval_token,
        )
        if (annotationGuard) {
          validateAnnotationXmlScope(
            annotationGuard,
            parseDrawio(session.xml),
            parseDrawio(args.xml),
          )
        }
        const result = await integratedCommit(session, args.xml, args.base_revision, "agent")
        if (result.conflict) {
          return JSON.stringify({
            ok: false,
            error: "revision_conflict",
            current: integratedDocumentPayload(result.current),
            manualChanges: result.manualChanges,
          }, null, 2)
        }
        if (result.invalid) {
          return JSON.stringify({ ok: false, error: "invalid_drawio_xml", validation: result.report }, null, 2)
        }
        if (annotationGuard) await consumeAnnotationAuthorization(session, annotationGuard)
        return JSON.stringify({
          ok: true,
          ...integratedDocumentPayload(result.document),
          validation: result.validation,
        }, null, 2)
      },
    }),

    drawio_open: tool({
      description:
        "Bind the current Draw.io session to one validated workspace file and return a URL for OpenWork's existing built-in browser.",
      args: {
        file: tool.schema.string().describe("Workspace-relative .drawio or .xml file to open"),
        drawio_url: tool.schema
          .string()
          .optional()
          .describe("Draw.io Web URL; defaults to DRAWIO_WEB_URL or https://embed.diagrams.net"),
      },
      async execute(args, context) {
        const source = resolveWorkspacePath(context, args.file)
        const bound = await bindIntegratedSession(context, source)
        const editorUrl = drawioEditorUrl(
          args.drawio_url?.trim()
          || process.env.DRAWIO_WEB_URL?.trim()
          || "https://embed.diagrams.net",
        )
        bound.session.editorUrl = editorUrl.toString()
        const bridgeUrl = `http://${bound.bridge.host}:${bound.bridge.port}`
        const openUrl = new URL("/editor", bridgeUrl)
        openUrl.searchParams.set("sessionId", context.sessionID)
        openUrl.searchParams.set("token", bound.token)
        return JSON.stringify({
          ok: true,
          file: workspaceRelative(context, source).split(path.sep).join("/"),
          sessionId: context.sessionID,
          revision: bound.session.revision,
          openUrl: openUrl.toString(),
          editorUrl: editorUrl.toString(),
          browserAction: "Open the returned openUrl with OpenWork's existing browser.open_url action.",
          saveMode: "workspace-file",
          tokenExpiresAt: new Date(Date.now() + BRIDGE_TOKEN_TTL_MS).toISOString(),
        }, null, 2)
      },
    }),

    drawio_finalize: tool({
      description:
        "Finish a Draw.io task: refresh the latest revision, validate and score it, export an up-to-date PNG, bind the browser session, and return the URL that must be opened with browser.open_url.",
      args: {
        file: tool.schema.string().describe("Workspace-relative .drawio or .xml file"),
        output_path: tool.schema
          .string()
          .optional()
          .describe("Workspace-relative PNG path; defaults to the input basename with .png"),
        threshold: tool.schema.number().min(0).max(100).default(90),
        scale: tool.schema.number().positive().default(1),
        border: tool.schema.number().int().min(0).default(0),
        background: tool.schema
          .string()
          .default(DEFAULT_EXPORT_BACKGROUND)
          .describe("PNG background color; defaults to white"),
        drawio_url: tool.schema
          .string()
          .optional()
          .describe("Draw.io Web URL; defaults to DRAWIO_WEB_URL or https://embed.diagrams.net"),
      },
      async execute(args, context) {
        const source = resolveWorkspacePath(context, args.file)
        const activeSession = integratedSessionFor(context, source)
        const xml = activeSession
          ? (await refreshIntegratedSession(activeSession)).xml
          : await readDiagramFile(source)
        const pages = parseDrawio(xml)
        const validation = validationReport(pages)
        if (!validation.valid) {
          throw new Error(`refusing to finalize invalid Draw.io XML: ${JSON.stringify(validation.errors)}`)
        }
        const quality = qualityReport(pages, args.threshold)
        const exported = await exportDiagramToFile({
          context,
          inputTarget: source,
          xml,
          format: "png",
          outputPath: args.output_path,
          scale: args.scale,
          border: args.border,
          background: args.background,
          overwrite: true,
        })
        const bound = await bindIntegratedSession(context, source)
        const editorUrl = drawioEditorUrl(
          args.drawio_url?.trim()
          || process.env.DRAWIO_WEB_URL?.trim()
          || "https://embed.diagrams.net",
        )
        bound.session.editorUrl = editorUrl.toString()
        const bridgeUrl = `http://${bound.bridge.host}:${bound.bridge.port}`
        const openUrl = new URL("/editor", bridgeUrl)
        openUrl.searchParams.set("sessionId", context.sessionID)
        openUrl.searchParams.set("token", bound.token)
        return JSON.stringify({
          ok: true,
          file: workspaceRelative(context, source).split(path.sep).join("/"),
          revision: bound.session.revision,
          validation,
          quality,
          png: {
            output_path: workspaceRelative(context, exported.outputTarget).split(path.sep).join("/"),
            file_size_bytes: exported.bytes,
            content_type: exported.contentType,
            export_url: exported.exportUrl,
          },
          openUrl: openUrl.toString(),
          editorUrl: editorUrl.toString(),
          browserAction: "Immediately call MobileWork's existing browser.open_url with openUrl before ending the task.",
          saveMode: "workspace-file",
          tokenExpiresAt: new Date(Date.now() + BRIDGE_TOKEN_TTL_MS).toISOString(),
        }, null, 2)
},
    }),

    drawio_list_annotations: tool({
      description:
        "List annotation (review comment) tasks for an opened Draw.io file. Each task contains selected stable cell ids, page, region, user-selected modification scope, instruction, approval state and status.",
      args: {
        file: tool.schema.string().describe("Workspace-relative .drawio or .xml file bound to the session"),
        status: tool.schema
          .enum(["open", "resolved", "stale", "all"])
          .default("open")
          .describe("Filter by status; open returns pending tasks Agent should process"),
      },
      async execute(args, context) {
        const target = resolveWorkspacePath(context, args.file)
        const session = integratedSessionFor(context, target)
        if (!session) throw new Error("No active Draw.io session for this file. Call drawio_open first.")
        await refreshIntegratedSession(session)
        const map = getSessionAnnotations(session.sessionId)
        const list = [...map.values()]
          .map((task) => ({ task, state: annotationEffectiveState(session, task) }))
          .filter((entry) => annotationMatchesStatus(entry.state, args.status))
          .map((entry) => annotationPayload(session, entry.task, entry.state))
        return JSON.stringify({
          file: workspaceRelative(context, target).split(path.sep).join("/"),
          sessionId: session.sessionId,
          currentRevision: session.revision,
          count: list.length,
          annotations: list,
          guidance: "Open includes fresh and stale unfinished tasks. Ask for confirmation before executing any task with requiresConfirmation=true. For each executable task: call drawio_get_annotation and drawio_get_state, dry-run, disclose scope and exact stable IDs with drawio_authorize_annotation_change, and wait for its OpenCode approval popup. Only then pass annotation_id and the one-time approval token to one scoped write, resolve the annotation, and finalize. Never modify first and ask later.",
        }, null, 2)
      },
    }),

    drawio_get_annotation: tool({
      description:
        "Read one annotation task in full and make it the active guarded task, including selected stable cell ids, region, user-selected scope, instruction, base revision, staleness and latest per-cell snapshots.",
      args: {
        id: tool.schema.string().describe("Annotation id returned by drawio_list_annotations"),
      },
      async execute(args, context) {
        const session = getIntegratedBridgeState().sessions.get(context.sessionID)
        if (!session) throw new Error("No active Draw.io session. Call drawio_open first.")
        await refreshIntegratedSession(session)
        const map = getSessionAnnotations(session.sessionId)
        const task = map.get(args.id)
        if (!task) throw new Error(`annotation not found: ${args.id}`)
        session.activeAnnotationId = task.id
        const annotationState = annotationEffectiveState(session, task)
        const payload = annotationPayload(session, task, annotationState)
        let snapshots: Array<Record<string, unknown>> = []
        try {
          const pages = parseDrawio(session.xml)
          const page = pages.find((candidate) => candidate.id === task.pageId) || pages[0]
          if (page) {
            const byId = new Map(page.cells.map((cell) => [cell.id, cell]))
            snapshots = task.cells.map((selected) => {
              const cell = byId.get(selected.id)
              if (!cell) return { id: selected.id, missing: true }
              const rectangle = cell.vertex ? vertexRectangle(cell, createGeometryContext(page.cells)) : null
              return {
                id: cell.id,
                kind: cell.edge ? "edge" : "node",
                label: cell.label || "",
                style: cell.style || "",
                source: cell.source,
                target: cell.target,
                geometry: rectangle || null,
                parent: cell.parent,
              }
            })
          }
        } catch {
          // snapshot is best-effort; the core payload still carries ids and instruction
        }
        return JSON.stringify({
          annotation: payload,
          cellSnapshots: snapshots,
          guidance: annotationState.requiresConfirmation
            ? "This annotation is stale but still open. Ask the user whether to execute it. After confirmation, call drawio_get_state, prepare a dry-run and exact changed-id plan, then call drawio_authorize_annotation_change. Wait for the OpenCode approval popup before passing annotation_id and its one-time token to drawio_patch/drawio_update_state; resolve only after the write succeeds."
            : "Call drawio_get_state, prepare a dry-run and exact changed-id plan, then call drawio_authorize_annotation_change. Wait for the OpenCode approval popup before passing annotation_id and its one-time token to drawio_patch/drawio_update_state; resolve only after the write succeeds.",
        }, null, 2)
      },
    }),

    drawio_authorize_annotation_change: tool({
      description:
        "Request the user's pre-change approval for one annotation plan. OpenCode must show its permission popup before this tool runs. If approved, returns a one-time token bound to the current revision, declared stable IDs and requested scope. Never call after modifying the diagram.",
      args: {
        id: tool.schema.string().describe("Annotation id returned by drawio_get_annotation"),
        plan: tool.schema
          .string()
          .min(1)
          .describe("Concrete pre-change explanation of what will be modified"),
        proposed_changed_ids: tool.schema
          .array(tool.schema.string())
          .min(1)
          .describe("Complete stable-ID allowlist disclosed to the user before the write"),
        requested_scope: tool.schema
          .enum(["selection_only", "selection_and_edges", "surrounding_layout"])
          .describe("Scope needed by this plan; normally equal to or narrower than the user's annotation scope"),
        escalation_reason: tool.schema
          .string()
          .optional()
          .describe("Required when requesting a scope wider than the user originally selected"),
      },
      async execute(args, context) {
        const session = getIntegratedBridgeState().sessions.get(context.sessionID)
        if (!session) throw new Error("No active Draw.io session. Call drawio_open first.")
        await refreshIntegratedSession(session)
        const task = getSessionAnnotations(session.sessionId).get(args.id)
        if (!task) throw new Error(`annotation not found: ${args.id}`)
        if (task.status === "resolved") throw new Error(`annotation is already resolved: ${args.id}`)
        const requestedScope = annotationScope(args.requested_scope)
        const escalationReason = args.escalation_reason?.trim() || null
        if (annotationScopeRank(requestedScope) > annotationScopeRank(task.scope) && !escalationReason) {
          throw new Error(
            `scope escalation from "${annotationScopeLabel(task.scope)}" to "${annotationScopeLabel(requestedScope)}" requires an explicit reason shown before approval`,
          )
        }
        const proposedChangedIds = [...new Set(args.proposed_changed_ids.map((id) => id.trim()))]
          .filter(Boolean)
        if (proposedChangedIds.length === 0) {
          throw new Error("proposed_changed_ids must contain at least one stable id")
        }
        const scope = annotationScopeContext(session, task, requestedScope)
        const approvalPattern = [
          "annotation",
          task.id,
          `revision-${session.revision}`,
          requestedScope,
          proposedChangedIds.toSorted().join(","),
        ].join(":")
        await context.ask({
          permission: "drawio_authorize_annotation_change",
          patterns: [approvalPattern],
          always: [approvalPattern],
          metadata: {
            annotationId: task.id,
            plan: args.plan.trim(),
            proposedChangedIds,
            requestedScope,
            requestedScopeLabel: annotationScopeLabel(requestedScope),
            originalScope: task.scope,
            originalScopeLabel: annotationScopeLabel(task.scope),
            escalationReason,
            baseRevision: session.revision,
          },
        })
        const now = new Date().toISOString()
        task.authorization = {
          token: randomBytes(24).toString("base64url"),
          scope: requestedScope,
          plan: args.plan.trim(),
          proposedChangedIds,
          escalationReason,
          baseRevision: session.revision,
          approvedAt: now,
          consumedAt: null,
        }
        task.updatedAt = now
        session.activeAnnotationId = task.id
        await persistStoredAnnotations(session)
        broadcastAnnotation(session, task, "authorization-approved")
        return JSON.stringify({
          ok: true,
          annotationId: task.id,
          approvalToken: task.authorization.token,
          baseRevision: task.authorization.baseRevision,
          requestedScope,
          requestedScopeLabel: annotationScopeLabel(requestedScope),
          originalScope: task.scope,
          originalScopeLabel: annotationScopeLabel(task.scope),
          escalationReason,
          proposedChangedIds,
          allowedExistingIds: [...scope.allowedIds],
          guidance:
            "Approval is valid for one formal write at this exact revision. Pass annotation_id and approval_token to drawio_patch or drawio_update_state. Any undeclared or out-of-scope stable ID is rejected.",
        }, null, 2)
      },
    }),

    drawio_resolve_annotation: tool({
      description:
        "Mark an annotation task as resolved after the requested change has been written (or after deciding no change is needed). This updates status and stores a summary; it does not modify the diagram itself.",
      args: {
        id: tool.schema.string().describe("Annotation id to resolve"),
        summary: tool.schema
          .string()
          .describe("Short description of what was changed or why the annotation needs no change"),
        changed_ids: tool.schema
          .array(tool.schema.string())
          .optional()
          .describe("Stable cell ids that were added, removed or modified for this annotation"),
      },
      async execute(args, context) {
        const session = getIntegratedBridgeState().sessions.get(context.sessionID)
        if (!session) throw new Error("No active Draw.io session. Call drawio_open first.")
        await refreshIntegratedSession(session)
        const map = getSessionAnnotations(session.sessionId)
        const task = map.get(args.id)
        if (!task) throw new Error(`annotation not found: ${args.id}`)
        const now = new Date().toISOString()
        task.status = "resolved"
        task.result = {
          summary: args.summary,
          changedIds: args.changed_ids || [],
          revision: session.revision,
          updatedAt: now,
        }
        task.resolvedAt = now
        task.updatedAt = now
        map.set(task.id, task)
        if (session.activeAnnotationId === task.id) session.activeAnnotationId = null
        await persistStoredAnnotations(session)
        broadcastAnnotation(session, task, "updated")
        return JSON.stringify({
          ok: true,
          annotation: annotationPayload(session, task),
        }, null, 2)
      },
    }),

  },
  }
}
