import { promises as fs } from "node:fs"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { createServer, type IncomingMessage, type Server } from "node:http"
import { createConnection } from "node:net"
import path from "node:path"
import type { tool } from "@opencode-ai/plugin"
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
  properties: {
    background: string
  }
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
  style_updates?: PatchStyleUpdates
}

type PatchStyleUpdates = {
  font_size?: number
  font_family?: string
  font_color?: string
  fill_color?: string
  stroke_color?: string
  stroke_width?: number
  opacity?: number
  rounded?: boolean
  dashed?: boolean
}

type QualityIssue = {
  code:
    | "invalid-structure"
    | "node-overlap"
    | "edge-through-node"
    | "edge-crossing"
    | "edge-overlap"
    | "shared-port-congestion"
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
const MAX_FILE_BYTES = 20 * 1024 * 1024
const DEFAULT_MAX_OUTPUT_BYTES = 100 * 1024 * 1024
const DEFAULT_EXPORT_URL = "http://127.0.0.1:18765/ImageExport4/export"
const DEFAULT_EXPORT_BACKGROUND = "#ffffff"
const BRIDGE_TOKEN_TTL_MS = 12 * 60 * 60 * 1000
// How long an editor-channel export waits for the built-in browser editor
// page to (re)connect before answering with an editor_required response that
// asks the agent to open the page via MobileWork's built-in browser.
const EDITOR_EXPORT_CONNECT_GRACE_MS = 3000
const SESSION_HISTORY_LIMIT = 20
const PATCH_PREVIEW_TTL_MS = 30 * 60 * 1000
const PATCH_PREVIEW_RETENTION_MS = 2 * 60 * 60 * 1000
const PATCH_PREVIEW_ID_PREFIX = "__ai_preview_"
// User-visible persistent history settings. The in-memory `session.history`
// window above is a short-lived per-revision conflict window; this store is a
// separate durable checkpoint repository that survives runtime restarts.
const HISTORY_MAX_ENTRIES = 20
const HISTORY_EDITOR_DEBOUNCE_MS = 2000
const HISTORY_PREVIEW_CONCURRENCY = 2
const HISTORY_THUMB_SCALE = 0.25
const HISTORY_PREVIEW_MAX_BYTES = 8 * 1024 * 1024
const HISTORY_SCHEMA_VERSION = 1
const DIAGRAM_REVISION_SCHEMA_VERSION = 1
const HISTORY_SNAPSHOT_ID_RE = /^h_[A-Za-z0-9_-]+_[A-Fa-f0-9]{8,}$/
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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
  if (/^[\x00-\x7f]*$/.test(value) && normalized) return normalized
  const digest = createHash("sha256").update(value).digest("hex").slice(0, 12)
  return `${normalized || "diagram"}-${digest}`
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

function graphModelProperties(modelXml: string): ParsedPage["properties"] {
  const document = parser.parse(modelXml) as Record<string, unknown>
  const graph = document.mxGraphModel as Record<string, unknown> | undefined
  return {
    background: attribute(graph?.["@_background"]) || "",
  }
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
      properties: graphModelProperties(xml),
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
        properties: graphModelProperties(modelXml),
        cells: parseGraphModel(modelXml),
      }
    }

    const payload = attribute(diagram["#text"])
    if (!payload?.trim()) throw new Error(`page ${pageName} has no diagram data`)
    const modelXml = decodeDiagramPayload(payload)
    return {
      id: pageId,
      name: pageName,
      compressed: true,
      properties: graphModelProperties(modelXml),
      cells: parseGraphModel(modelXml),
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

const PATCH_STYLE_KEYS: Record<keyof PatchStyleUpdates, string> = {
  font_size: "fontSize",
  font_family: "fontFamily",
  font_color: "fontColor",
  fill_color: "fillColor",
  stroke_color: "strokeColor",
  stroke_width: "strokeWidth",
  opacity: "opacity",
  rounded: "rounded",
  dashed: "dashed",
}

function parseStyleEntries(style: string | undefined): Array<[string, string]> {
  return (style || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf("=")
      return separator < 0
        ? [entry, ""]
        : [entry.slice(0, separator), entry.slice(separator + 1)]
    })
}

function normalizedStyle(style: string | undefined): Record<string, string> {
  return Object.fromEntries(parseStyleEntries(style).toSorted(([left], [right]) => left.localeCompare(right)))
}

function patchStyle(style: string | undefined, updates: PatchStyleUpdates | undefined): string {
  if (!updates) return style || ""
  const entries = parseStyleEntries(style)
  const values = new Map(entries)
  for (const [inputKey, styleKey] of Object.entries(PATCH_STYLE_KEYS) as Array<[keyof PatchStyleUpdates, string]>) {
    const value = updates[inputKey]
    if (value === undefined) continue
    if (typeof value === "string" && (!value.trim() || /[;=\r\n]/.test(value))) {
      throw new Error(`style_updates.${inputKey} contains an unsafe Draw.io style delimiter`)
    }
    values.set(styleKey, typeof value === "boolean" ? (value ? "1" : "0") : String(value))
  }
  const emitted = new Set<string>()
  const result: string[] = []
  for (const [key] of entries) {
    if (emitted.has(key)) continue
    emitted.add(key)
    const value = values.get(key) || ""
    result.push(`${key}${value === "" ? "" : `=${value}`}`)
  }
  for (const [key, value] of values) {
    if (emitted.has(key)) continue
    result.push(`${key}${value === "" ? "" : `=${value}`}`)
  }
  return result.length > 0 ? `${result.join(";")};` : ""
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
        "@_style": patchStyle(nodeStyle(operation.kind), operation.style_updates),
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
        "@_style": patchStyle(EDGE_BASE_STYLE, operation.style_updates),
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
      if (operation.style_updates !== undefined) {
        existing["@_style"] = patchStyle(attribute(existing["@_style"]), operation.style_updates)
      }
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
      if (operation.style_updates !== undefined) {
        existing["@_style"] = patchStyle(attribute(existing["@_style"]), operation.style_updates)
      }
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
    style: normalizedStyle(cell.style),
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
    pageId: string
    cellId: string
    kind: "node" | "edge"
    changedFields: string[]
    styleChanges: Array<{ property: string; before: string | null; after: string | null }>
    geometryChanges: Array<{ property: string; before: unknown; after: unknown }>
    labelChange: { before: string; after: string } | null
    before: ReturnType<typeof comparableCell>
    after: ReturnType<typeof comparableCell>
  }> = []
  const pageChanges: Array<{
    pageId: string
    pageName: string
    property: string
    before: string | null
    after: string | null
  }> = []

  for (const [key, cell] of after) {
    if (!before.has(key)) {
      added.push({ key, cell })
      continue
    }
    const beforeCell = comparableCell(before.get(key)!)
    const afterCell = comparableCell(cell)
    if (JSON.stringify(beforeCell) !== JSON.stringify(afterCell)) {
      const changedFields = (Object.keys(afterCell) as Array<keyof typeof afterCell>)
        .filter((field) => JSON.stringify(beforeCell[field]) !== JSON.stringify(afterCell[field]))
      const styleProperties = new Set([...Object.keys(beforeCell.style), ...Object.keys(afterCell.style)])
      const styleChanges = [...styleProperties]
        .filter((property) => beforeCell.style[property] !== afterCell.style[property])
        .sort()
        .map((property) => ({
          property,
          before: beforeCell.style[property] ?? null,
          after: afterCell.style[property] ?? null,
        }))
      const geometryProperties = new Set([
        ...Object.keys(beforeCell.geometry),
        ...Object.keys(afterCell.geometry),
      ])
      const geometryChanges = [...geometryProperties]
        .filter((property) => JSON.stringify(
          (beforeCell.geometry as Record<string, unknown>)[property],
        ) !== JSON.stringify((afterCell.geometry as Record<string, unknown>)[property]))
        .sort()
        .map((property) => ({
          property,
          before: (beforeCell.geometry as Record<string, unknown>)[property] ?? null,
          after: (afterCell.geometry as Record<string, unknown>)[property] ?? null,
        }))
      const pageId = key.slice(0, Math.max(0, key.length - cell.id.length - 1))
      changed.push({
        key,
        pageId,
        cellId: cell.id,
        kind: cell.edge ? "edge" : "node",
        changedFields,
        styleChanges,
        geometryChanges,
        labelChange: beforeCell.label !== afterCell.label
          ? { before: beforeCell.label, after: afterCell.label }
          : null,
        before: beforeCell,
        after: afterCell,
      })
    }
  }
  for (const [key, cell] of before) {
    if (!after.has(key)) removed.push({ key, cell })
  }

  const beforePageMap = new Map(beforePages.map((page) => [page.id, page]))
  const afterPageMap = new Map(afterPages.map((page) => [page.id, page]))
  for (const pageId of new Set([...beforePageMap.keys(), ...afterPageMap.keys()])) {
    const beforePage = beforePageMap.get(pageId)
    const afterPage = afterPageMap.get(pageId)
    const pageName = afterPage?.name || beforePage?.name || pageId
    if (!beforePage || !afterPage) {
      pageChanges.push({
        pageId,
        pageName,
        property: "page",
        before: beforePage ? "present" : null,
        after: afterPage ? "present" : null,
      })
      continue
    }
    if (beforePage.name !== afterPage.name) {
      pageChanges.push({ pageId, pageName, property: "name", before: beforePage.name, after: afterPage.name })
    }
    if (beforePage.properties.background !== afterPage.properties.background) {
      pageChanges.push({
        pageId,
        pageName,
        property: "background",
        before: beforePage.properties.background || null,
        after: afterPage.properties.background || null,
      })
    }
  }

  return {
    added,
    removed,
    changed,
    pageChanges,
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      pagesChanged: new Set(pageChanges.map((entry) => entry.pageId)).size,
      unchanged: [...after.keys()].filter(
        (key) => before.has(key)
          && JSON.stringify(comparableCell(before.get(key)!))
            === JSON.stringify(comparableCell(after.get(key)!)),
      ).length,
    },
  }
}

type DrawioThreeWayMergeResult =
  | {
    status: "merged"
    xml: string
    localChangedKeys: string[]
    remoteChangedKeys: string[]
  }
  | {
    status: "conflict"
    conflicts: string[]
    details: DrawioMergeConflictDetail[]
    userResolutionXml: string
    agentResolutionXml: string
    localChangedKeys: string[]
    remoteChangedKeys: string[]
  }
  | { status: "unavailable"; reason: string }

type DrawioMergeCellSnapshot = {
  exists: boolean
  kind: "node" | "edge" | "cell"
  label: string
  style: string
  parent: string | null
  source: string | null
  target: string | null
  geometry: { x: string | null; y: string | null; width: string | null; height: string | null } | null
}

type DrawioMergeConflictDetail = {
  key: string
  pageId: string
  pageName: string
  cellId: string
  changedFields: string[]
  fields: Array<{
    path: string
    user: { exists: boolean; value: unknown }
    agent: { exists: boolean; value: unknown }
  }>
  base: DrawioMergeCellSnapshot
  user: DrawioMergeCellSnapshot
  agent: DrawioMergeCellSnapshot
}

function canonicalMergeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalMergeValue)
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalMergeValue(entry)]),
  )
}

function mergeValueKey(value: unknown): string {
  return value === undefined
    ? "<missing>"
    : JSON.stringify(canonicalMergeValue(value))
}

type StructuredMergeConflict = {
  path: string
  user: { exists: boolean; value: unknown }
  agent: { exists: boolean; value: unknown }
}

function mergeStructuredValue(
  base: unknown,
  user: unknown,
  agent: unknown,
  pathParts: string[] = [],
): { userValue: unknown; agentValue: unknown; conflicts: StructuredMergeConflict[] } {
  const baseKey = mergeValueKey(base)
  const userKey = mergeValueKey(user)
  const agentKey = mergeValueKey(agent)
  if (userKey === agentKey) return { userValue: user, agentValue: user, conflicts: [] }
  if (userKey === baseKey) return { userValue: agent, agentValue: agent, conflicts: [] }
  if (agentKey === baseKey) return { userValue: user, agentValue: user, conflicts: [] }

  if (integratedRecord(base) && integratedRecord(user) && integratedRecord(agent)) {
    const userResult: Record<string, unknown> = {}
    const agentResult: Record<string, unknown> = {}
    const conflicts: StructuredMergeConflict[] = []
    const keys = new Set([...Object.keys(base), ...Object.keys(user), ...Object.keys(agent)])
    for (const key of keys) {
      const merged = mergeStructuredValue(base[key], user[key], agent[key], [...pathParts, key])
      if (merged.userValue !== undefined) userResult[key] = merged.userValue
      if (merged.agentValue !== undefined) agentResult[key] = merged.agentValue
      conflicts.push(...merged.conflicts)
    }
    return { userValue: userResult, agentValue: agentResult, conflicts }
  }

  return {
    userValue: user,
    agentValue: agent,
    conflicts: [{
      path: pathParts.join(".") || "existence",
      user: { exists: user !== undefined, value: user },
      agent: { exists: agent !== undefined, value: agent },
    }],
  }
}

function mergeCellMap(page: EditablePage): Map<string, Record<string, unknown>> {
  const result = new Map<string, Record<string, unknown>>()
  for (const cell of editableCells(page)) {
    const id = attribute(cell["@_id"])
    if (!id) throw new Error(`page ${page.name} contains a cell without a stable id`)
    if (result.has(id)) throw new Error(`page ${page.name} contains duplicate cell id ${id}`)
    result.set(id, cell)
  }
  return result
}

function mergeCellSnapshot(cell: Record<string, unknown> | undefined): DrawioMergeCellSnapshot {
  if (!cell) {
    return {
      exists: false,
      kind: "cell",
      label: "",
      style: "",
      parent: null,
      source: null,
      target: null,
      geometry: null,
    }
  }
  const geometry = integratedRecord(cell.mxGeometry) ? cell.mxGeometry : null
  return {
    exists: true,
    kind: attribute(cell["@_vertex"]) === "1"
      ? "node"
      : attribute(cell["@_edge"]) === "1" ? "edge" : "cell",
    label: attribute(cell["@_value"]),
    style: attribute(cell["@_style"]),
    parent: attribute(cell["@_parent"]) || null,
    source: attribute(cell["@_source"]) || null,
    target: attribute(cell["@_target"]) || null,
    geometry: geometry ? {
      x: attribute(geometry["@_x"]) || null,
      y: attribute(geometry["@_y"]) || null,
      width: attribute(geometry["@_width"]) || null,
      height: attribute(geometry["@_height"]) || null,
    } : null,
  }
}

function mergePageEnvelope(page: EditablePage): string {
  const diagram = page.diagram
    ? Object.fromEntries(
      Object.entries(page.diagram).filter(([key]) => key !== "mxGraphModel" && key !== "#text"),
    )
    : null
  const model = Object.fromEntries(
    Object.entries(page.model).filter(([key]) => !["root", "@_dx", "@_dy"].includes(key)),
  )
  const root = page.model.root && typeof page.model.root === "object"
    ? Object.fromEntries(
      Object.entries(page.model.root as Record<string, unknown>).filter(([key]) => key !== "mxCell"),
    )
    : null
  return JSON.stringify(canonicalMergeValue({ diagram, model, root }))
}

function applyMergedCell(
  targetPages: Map<string, EditablePage>,
  preferredPages: Map<string, EditablePage>,
  pageId: string,
  cellId: string,
  mergedCell: Record<string, unknown> | undefined,
): void {
  const targetCells = editableCells(targetPages.get(pageId)!)
  const index = targetCells.findIndex((cell) => attribute(cell["@_id"]) === cellId)
  if (mergedCell === undefined) {
    if (index >= 0) targetCells.splice(index, 1)
    return
  }
  if (index >= 0) {
    targetCells[index] = structuredClone(mergedCell)
    return
  }
  const preferredOrder = editableCells(preferredPages.get(pageId)!)
    .map((cell) => attribute(cell["@_id"]))
  const preferredIndex = preferredOrder.indexOf(cellId)
  const previousId = [...preferredOrder.slice(0, preferredIndex)].reverse()
    .find((id) => targetCells.some((cell) => attribute(cell["@_id"]) === id))
  const nextId = preferredOrder.slice(preferredIndex + 1)
    .find((id) => targetCells.some((cell) => attribute(cell["@_id"]) === id))
  if (previousId) {
    const previousIndex = targetCells.findIndex((cell) => attribute(cell["@_id"]) === previousId)
    targetCells.splice(previousIndex + 1, 0, structuredClone(mergedCell))
  } else if (nextId) {
    const nextIndex = targetCells.findIndex((cell) => attribute(cell["@_id"]) === nextId)
    targetCells.splice(nextIndex, 0, structuredClone(mergedCell))
  } else {
    targetCells.push(structuredClone(mergedCell))
  }
}

function tryMergeDrawioXml(
  baseXml: string,
  localXml: string,
  remoteXml: string,
): DrawioThreeWayMergeResult {
  try {
    const base = parseEditableDrawio(baseXml)
    const local = parseEditableDrawio(localXml)
    const remote = parseEditableDrawio(remoteXml)
    if (base.directModel !== local.directModel || base.directModel !== remote.directModel) {
      return { status: "unavailable", reason: "document container structure changed" }
    }

    const basePages = new Map(base.pages.map((page) => [page.id, page]))
    const localPages = new Map(local.pages.map((page) => [page.id, page]))
    const remotePages = new Map(remote.pages.map((page) => [page.id, page]))
    const pageIds = [...basePages.keys()].sort()
    if (
      JSON.stringify([...localPages.keys()].sort()) !== JSON.stringify(pageIds)
      || JSON.stringify([...remotePages.keys()].sort()) !== JSON.stringify(pageIds)
    ) {
      return { status: "unavailable", reason: "page additions or removals require user confirmation" }
    }
    const basePageOrder = base.pages.map((page) => page.id)
    const localPageOrder = local.pages.map((page) => page.id)
    const remotePageOrder = remote.pages.map((page) => page.id)
    if (
      JSON.stringify(localPageOrder) !== JSON.stringify(basePageOrder)
      && JSON.stringify(localPageOrder) !== JSON.stringify(remotePageOrder)
    ) {
      return { status: "unavailable", reason: "local page order changed" }
    }

    const localChangedKeys: string[] = []
    const remoteChangedKeys: string[] = []
    const conflicts: string[] = []
    const conflictDetails: DrawioMergeConflictDetail[] = []
    const cellChoices: Array<{
      key: string
      pageId: string
      cellId: string
      userCell: Record<string, unknown> | undefined
      agentCell: Record<string, unknown> | undefined
    }> = []

    for (const pageId of pageIds) {
      const basePage = basePages.get(pageId)!
      const localPage = localPages.get(pageId)!
      const remotePage = remotePages.get(pageId)!
      const baseEnvelope = mergePageEnvelope(basePage)
      const localEnvelope = mergePageEnvelope(localPage)
      const remoteEnvelope = mergePageEnvelope(remotePage)
      if (localEnvelope !== baseEnvelope && localEnvelope !== remoteEnvelope) {
        return { status: "unavailable", reason: `local page metadata changed for ${pageId}` }
      }
      const baseCells = mergeCellMap(basePage)
      const localCells = mergeCellMap(localPage)
      const remoteCells = mergeCellMap(remotePage)
      const commonIds = new Set(
        [...baseCells.keys()].filter((id) => localCells.has(id) && remoteCells.has(id)),
      )
      const baseOrder = [...baseCells.keys()].filter((id) => commonIds.has(id))
      const localOrder = [...localCells.keys()].filter((id) => commonIds.has(id))
      const remoteOrder = [...remoteCells.keys()].filter((id) => commonIds.has(id))
      if (
        JSON.stringify(localOrder) !== JSON.stringify(baseOrder)
        && JSON.stringify(localOrder) !== JSON.stringify(remoteOrder)
      ) {
        return { status: "unavailable", reason: `local cell order changed for page ${pageId}` }
      }
      const cellIds = new Set([...baseCells.keys(), ...localCells.keys(), ...remoteCells.keys()])
      for (const cellId of cellIds) {
        const key = `${pageId}:${cellId}`
        const baseValue = mergeValueKey(baseCells.get(cellId))
        const localValue = mergeValueKey(localCells.get(cellId))
        const remoteValue = mergeValueKey(remoteCells.get(cellId))
        const localChanged = localValue !== baseValue
        const remoteChanged = remoteValue !== baseValue
        if (localChanged) localChangedKeys.push(key)
        if (remoteChanged) remoteChangedKeys.push(key)
        const merged = mergeStructuredValue(
          baseCells.get(cellId),
          localCells.get(cellId),
          remoteCells.get(cellId),
        )
        cellChoices.push({
          key,
          pageId,
          cellId,
          userCell: merged.userValue as Record<string, unknown> | undefined,
          agentCell: merged.agentValue as Record<string, unknown> | undefined,
        })
        if (merged.conflicts.length > 0) {
          conflicts.push(key)
          const baseSnapshot = mergeCellSnapshot(baseCells.get(cellId))
          const userSnapshot = mergeCellSnapshot(localCells.get(cellId))
          const agentSnapshot = mergeCellSnapshot(remoteCells.get(cellId))
          conflictDetails.push({
            key,
            pageId,
            pageName: basePage.name,
            cellId,
            changedFields: merged.conflicts.map((entry) => entry.path),
            fields: merged.conflicts,
            base: baseSnapshot,
            user: userSnapshot,
            agent: agentSnapshot,
          })
        }
      }
    }

    const userDocument = structuredClone(remote)
    const agentDocument = structuredClone(remote)
    const userPages = new Map(userDocument.pages.map((page) => [page.id, page]))
    const agentPages = new Map(agentDocument.pages.map((page) => [page.id, page]))
    for (const choice of cellChoices) {
      applyMergedCell(userPages, localPages, choice.pageId, choice.cellId, choice.userCell)
      applyMergedCell(agentPages, localPages, choice.pageId, choice.cellId, choice.agentCell)
    }
    const userXml = serializeEditableDrawio(userDocument)
    const agentXml = serializeEditableDrawio(agentDocument)
    const userReport = validationReport(parseDrawio(userXml))
    const agentReport = validationReport(parseDrawio(agentXml))
    if (!userReport.valid || !agentReport.valid) {
      return {
        status: "unavailable",
        reason: `merged diagram is invalid: ${[
          ...userReport.errors,
          ...agentReport.errors,
        ].join("; ")}`,
      }
    }
    if (conflicts.length > 0) {
      return {
        status: "conflict",
        conflicts,
        details: conflictDetails,
        userResolutionXml: userXml,
        agentResolutionXml: agentXml,
        localChangedKeys,
        remoteChangedKeys,
      }
    }
    return { status: "merged", xml: userXml, localChangedKeys, remoteChangedKeys }
  } catch (error) {
    return { status: "unavailable", reason: `automatic merge failed: ${(error as Error).message}` }
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

function distributedPortRatio(index: number, count: number): number {
  return (index + 1) / (count + 1)
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
    const crossAxisCenter = (nodeId: string) => {
      const position = positions.get(nodeId)!
      return direction === "left-to-right"
        ? position.y + position.height / 2
        : position.x + position.width / 2
    }
    const siblingEdges = edges
      .filter((candidate) => candidate.source === edge.source)
      .sort((left, right) =>
        crossAxisCenter(left.target) - crossAxisCenter(right.target)
        || edges.indexOf(left) - edges.indexOf(right))
    const siblingIndex = siblingEdges.indexOf(edge)
    const incomingEdges = edges
      .filter((candidate) => candidate.target === edge.target)
      .sort((left, right) =>
        crossAxisCenter(left.source) - crossAxisCenter(right.source)
        || edges.indexOf(left) - edges.indexOf(right))
    const incomingIndex = incomingEdges.indexOf(edge)
    const sourcePortRatio = distributedPortRatio(siblingIndex, siblingEdges.length)
    const targetPortRatio = distributedPortRatio(incomingIndex, incomingEdges.length)
    const laneOffset = ((siblingEdges.length - 1) / 2 - siblingIndex) * 18

    let style = EDGE_BASE_STYLE
    let points: string

    if (direction === "left-to-right") {
      const sourceRight = source.x + source.width
      const targetLeft = target.x
      const corridor = targetLeft > sourceRight
        ? (sourceRight + targetLeft) / 2 + laneOffset
        : Math.max(sourceRight, target.x + target.width) + 80 + siblingIndex * 18
      const sourceY = source.y + source.height * sourcePortRatio
      const targetY = target.y + target.height * targetPortRatio
      style += `exitX=1;exitY=${sourcePortRatio};exitDx=0;exitDy=0;entryX=0;entryY=${targetPortRatio};entryDx=0;entryDy=0;`
      points = `          <mxPoint x="${corridor}" y="${sourceY}"/>
          <mxPoint x="${corridor}" y="${targetY}"/>`
    } else {
      const sourceBottom = source.y + source.height
      const targetTop = target.y
      const corridor = targetTop > sourceBottom
        ? (sourceBottom + targetTop) / 2 + laneOffset
        : Math.max(sourceBottom, target.y + target.height) + 80 + siblingIndex * 18
      const sourceX = source.x + source.width * sourcePortRatio
      const targetX = target.x + target.width * targetPortRatio
      style += `exitX=${sourcePortRatio};exitY=1;exitDx=0;exitDy=0;entryX=${targetPortRatio};entryY=0;entryDx=0;entryDy=0;`
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

function collinearSegmentOverlapLength(
  leftStart: Point,
  leftEnd: Point,
  rightStart: Point,
  rightEnd: Point,
): number {
  const leftDx = leftEnd.x - leftStart.x
  const leftDy = leftEnd.y - leftStart.y
  const rightDx = rightEnd.x - rightStart.x
  const rightDy = rightEnd.y - rightStart.y
  const leftLength = Math.hypot(leftDx, leftDy)
  const rightLength = Math.hypot(rightDx, rightDy)
  if (leftLength < 1e-6 || rightLength < 1e-6) return 0

  const parallelError = Math.abs(leftDx * rightDy - leftDy * rightDx)
    / (leftLength * rightLength)
  if (parallelError > 1e-6) return 0

  const unitX = leftDx / leftLength
  const unitY = leftDy / leftLength
  const perpendicularDistance = (point: Point) => Math.abs(
    (point.x - leftStart.x) * unitY - (point.y - leftStart.y) * unitX,
  )
  if (perpendicularDistance(rightStart) > 0.5 || perpendicularDistance(rightEnd) > 0.5) {
    return 0
  }

  const project = (point: Point) =>
    (point.x - leftStart.x) * unitX + (point.y - leftStart.y) * unitY
  const rightA = project(rightStart)
  const rightB = project(rightEnd)
  const overlapStart = Math.max(0, Math.min(rightA, rightB))
  const overlapEnd = Math.min(leftLength, Math.max(rightA, rightB))
  return Math.max(0, overlapEnd - overlapStart)
}

function polylineOverlapLength(left: Point[], right: Point[]): number {
  let maximum = 0
  for (let leftIndex = 0; leftIndex < left.length - 1; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < right.length - 1; rightIndex += 1) {
      maximum = Math.max(
        maximum,
        collinearSegmentOverlapLength(
          left[leftIndex],
          left[leftIndex + 1],
          right[rightIndex],
          right[rightIndex + 1],
        ),
      )
    }
  }
  return maximum
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
    edgeOverlaps: 0,
    sharedPortCongestions: 0,
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

    const portGroups = new Map<string, {
      vertexId: string
      role: "source" | "target"
      edges: string[]
    }>()
    const coordinateKey = (value: number) => Math.round(value * 100) / 100
    for (const edge of edges) {
      const polyline = polylines.get(edge.id)
      if (!polyline || polyline.length < 2) continue
      const endpoints = [
        { role: "source" as const, vertexId: edge.source, point: polyline[0] },
        { role: "target" as const, vertexId: edge.target, point: polyline[polyline.length - 1] },
      ]
      for (const endpoint of endpoints) {
        if (!endpoint.vertexId) continue
        const key = [
          endpoint.role,
          endpoint.vertexId,
          coordinateKey(endpoint.point.x),
          coordinateKey(endpoint.point.y),
        ].join(":")
        const group = portGroups.get(key) || {
          vertexId: endpoint.vertexId,
          role: endpoint.role,
          edges: [],
        }
        group.edges.push(edge.id)
        portGroups.set(key, group)
      }
    }
    for (const group of portGroups.values()) {
      if (group.edges.length < 2) continue
      metrics.sharedPortCongestions += 1
      issues.push({
        code: "shared-port-congestion",
        severity: "error",
        page: page.name,
        cells: [group.vertexId, ...group.edges],
        message:
          `${page.name}: ${group.edges.length} edges share the same ${group.role} port on node ${group.vertexId}`,
      })
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
        const rightPolyline = polylines.get(right.id)
        if (!rightPolyline) continue
        const overlapLength = polylineOverlapLength(leftPolyline, rightPolyline)
        if (overlapLength >= 8) {
          metrics.edgeOverlaps += 1
          issues.push({
            code: "edge-overlap",
            severity: "error",
            page: page.name,
            cells: [left.id, right.id],
            message:
              `${page.name}: edges ${left.id} and ${right.id} overlap for ${Math.round(overlapLength)}px`,
          })
        }
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
      - metrics.edgeOverlaps * 10
      - metrics.sharedPortCongestions * 8
      - metrics.labelOverlaps * 6
      - metrics.emptyLabels * 2
      - metrics.missingLineJumps,
  )
  return {
    pass:
      validation.valid
      && metrics.overlaps === 0
      && metrics.edgeNodeIntersections === 0
      && metrics.edgeOverlaps === 0
      && metrics.sharedPortCongestions === 0
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
    const crossAxisCenter = (vertexId: string) => {
      const position = positions.get(vertexId)!
      return direction === "left-to-right"
        ? position.y + position.height / 2
        : position.x + position.width / 2
    }
    const siblings = edges
      .filter((candidate) => attribute(candidate["@_source"]) === sourceId)
      .sort((left, right) =>
        crossAxisCenter(attribute(left["@_target"])!)
        - crossAxisCenter(attribute(right["@_target"])!)
        || rawCellId(left).localeCompare(rawCellId(right)))
    const siblingIndex = siblings.indexOf(edge)
    const incoming = edges
      .filter((candidate) => attribute(candidate["@_target"]) === targetId)
      .sort((left, right) =>
        crossAxisCenter(attribute(left["@_source"])!)
        - crossAxisCenter(attribute(right["@_source"])!)
        || rawCellId(left).localeCompare(rawCellId(right)))
    const incomingIndex = incoming.indexOf(edge)
    const sourcePortRatio = distributedPortRatio(siblingIndex, siblings.length)
    const targetPortRatio = distributedPortRatio(incomingIndex, incoming.length)
    const laneOffset = ((siblings.length - 1) / 2 - siblingIndex) * 18
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
        { x: corridor, y: source.y + source.height * sourcePortRatio },
        { x: corridor, y: target.y + target.height * targetPortRatio },
      ]
      anchors = {
        exitX: "1", exitY: String(sourcePortRatio), exitDx: "0", exitDy: "0",
        entryX: "0", entryY: String(targetPortRatio), entryDx: "0", entryDy: "0",
      }
    } else {
      const sourceBottom = source.y + source.height
      const targetTop = target.y
      const corridor = targetTop > sourceBottom
        ? (sourceBottom + targetTop) / 2 + laneOffset
        : Math.max(sourceBottom, target.y + target.height) + 80 + edgeIndex * 18
      points = [
        { x: source.x + source.width * sourcePortRatio, y: corridor },
        { x: target.x + target.width * targetPortRatio, y: corridor },
      ]
      anchors = {
        exitX: String(sourcePortRatio), exitY: "1", exitDx: "0", exitDy: "0",
        entryX: String(targetPortRatio), entryY: "0", entryDx: "0", entryDy: "0",
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

type ExportFormat = "png" | "jpeg" | "pdf" | "svg" | "xmlsvg" | "xmlpng" | "html2"

// Formats rendered by the Draw.io editor iframe in the built-in browser (embed
// protocol export action) instead of the Docker ImageExport4 server.
const EDITOR_EXPORT_FORMATS = new Set<ExportFormat>(["svg", "xmlsvg", "html2"])
const MULTI_FILE_EXPORT_FORMATS = new Set<ExportFormat>(["png", "jpeg", "xmlpng"])
const EDITOR_MULTI_FILE_EXPORT_FORMATS = new Set<ExportFormat>(["svg", "xmlsvg"])

type ExportOptions = {
  pageId?: string
  allPages?: boolean
  scale?: number
  border?: number
  background?: string
  embedXml?: boolean
}

const EXPORT_SAFE_PAGE_ID = /^[A-Za-z0-9._:-]{1,120}$/

function exportPageIdAlias(pageId: string, index: number, used: Set<string>): string {
  const digest = createHash("sha256").update(pageId).digest("hex").slice(0, 12)
  const base = `export-page-${index + 1}-${digest}`
  let alias = base
  let suffix = 2
  while (used.has(alias)) {
    alias = `${base}-${suffix}`
    suffix += 1
  }
  used.add(alias)
  return alias
}

function prepareDrawioExport(
  xml: string,
  requestedPageId?: string,
): { xml: string; pageId: string | undefined } {
  const document = parser.parse(xml) as Record<string, unknown>
  const mxfile = document.mxfile as Record<string, unknown> | undefined
  if (!mxfile) return { xml, pageId: requestedPageId }

  const diagrams = asArray(
    mxfile.diagram as Record<string, unknown> | Record<string, unknown>[] | undefined,
  )
  const used = new Set(
    diagrams
      .map((diagram) => attribute(diagram["@_id"]))
      .filter((pageId): pageId is string => Boolean(pageId) && EXPORT_SAFE_PAGE_ID.test(pageId)),
  )
  const aliases = new Map<string, string>()
  let changed = false

  diagrams.forEach((diagram, index) => {
    const pageId = attribute(diagram["@_id"])
    if (!pageId || EXPORT_SAFE_PAGE_ID.test(pageId)) return
    const alias = exportPageIdAlias(pageId, index, used)
    diagram["@_id"] = alias
    if (!aliases.has(pageId)) aliases.set(pageId, alias)
    changed = true
  })

  let pageId = requestedPageId
  if (requestedPageId && !EXPORT_SAFE_PAGE_ID.test(requestedPageId)) {
    pageId = aliases.get(requestedPageId)
    if (!pageId) {
      throw new Error(
        `requested page ID ${JSON.stringify(requestedPageId)} was not found in the Draw.io document`,
      )
    }
  }

  return {
    xml: changed ? builder.build(document) : xml,
    pageId,
  }
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
  if (format === "jpeg") return ".jpeg"
  if (format === "xmlpng") return ".editable.png"
  if (format === "xmlsvg") return ".editable.svg"
  if (format === "html2") return ".html"
  return `.${format}`
}

function allowedOutputExtensions(format: ExportFormat): string[] {
  if (format === "xmlpng") return [".editable.png", ".png"]
  if (format === "xmlsvg") return [".editable.svg", ".svg"]
  return [outputExtension(format)]
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
  const target = resolveWorkspaceFile(context, requested, allowedOutputExtensions(format))
  const relative = path.relative(workspace, target)
  if (!relative || path.isAbsolute(relative)) {
    throw new Error("output file must resolve inside the current workspace")
  }
  return target
}

function resolveMultiPageExportOutputs(
  context: WorkspaceContext,
  input: string,
  output: string | undefined,
  format: ExportFormat,
  pages: ParsedPage[],
): Array<{ page: ParsedPage; pageIndex: number; outputTarget: string }> {
  const baseTarget = resolveExportOutput(context, input, output, format)
  const extension = [...allowedOutputExtensions(format)]
    .sort((left, right) => right.length - left.length)
    .find((candidate) => baseTarget.toLowerCase().endsWith(candidate))
  if (!extension) throw new Error(`cannot derive a multi-page output name for ${format}`)
  const stem = baseTarget.slice(0, -extension.length)
  return pages.map((page, index) => ({
    page,
    pageIndex: index + 1,
    outputTarget: `${stem}.page-${index + 1}-${slug(page.name)}${extension}`,
  }))
}

function requireExportPage(xml: string, pageId: string): ParsedPage {
  const page = parseDrawio(xml).find((candidate) => candidate.id === pageId)
  if (!page) {
    throw new Error(`requested page ID ${JSON.stringify(pageId)} was not found in the Draw.io document`)
  }
  return page
}

function singlePageDrawioXml(xml: string, pageId: string): string {
  requireExportPage(xml, pageId)
  const document = parser.parse(xml) as Record<string, unknown>
  const mxfile = document.mxfile as Record<string, unknown> | undefined
  if (!mxfile) throw new Error("Draw.io document is missing mxfile")
  const diagrams = asArray(
    mxfile.diagram as Record<string, unknown> | Record<string, unknown>[] | undefined,
  )
  const selected = diagrams.find((diagram) => attribute(diagram["@_id"]) === pageId)
  if (!selected) {
    throw new Error(`requested page ID ${JSON.stringify(pageId)} was not found in the Draw.io document`)
  }
  mxfile.diagram = selected
  return builder.build(document)
}

function validateExportBytes(content: Buffer, format: ExportFormat, contentType: string) {
  if (content.length === 0) throw new Error("export server returned an empty response")
  const expectedContentTypes: Record<ExportFormat, string[]> = {
    png: ["image/png", "application/octet-stream"],
    jpeg: ["image/jpeg", "application/octet-stream"],
    pdf: ["application/pdf", "application/octet-stream"],
    xmlpng: ["image/png", "image/jpg", "application/octet-stream"],
    svg: ["image/svg+xml", "text/plain", "application/octet-stream"],
    xmlsvg: ["image/svg+xml", "text/plain", "application/octet-stream"],
    html2: ["text/html", "text/plain", "application/octet-stream"],
  }
  if (!expectedContentTypes[format].some((expected) => contentType.includes(expected))) {
    throw new Error(`export server returned unexpected Content-Type: ${contentType || "(missing)"}`)
  }
  const valid = format === "png" || format === "xmlpng"
    ? content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    : format === "jpeg"
      ? content.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
      : format === "pdf"
        ? content.subarray(0, 5).toString("ascii") === "%PDF-"
        : true
  if (!valid) throw new Error(`export server response is not a valid ${format.toUpperCase()} file`)
}

function decodeDataUri(value: string): Buffer {
  if (typeof value !== "string") throw new Error("editor export data must be a data URI string")
  const match = value.match(/^data:([^;,]+)?((?:;[^,]*)*),(.*)$/s)
  if (!match) throw new Error("editor returned an invalid data URI")
  return match[2].split(";").includes("base64")
    ? Buffer.from(match[3], "base64")
    : Buffer.from(decodeURIComponent(match[3]), "utf8")
}

function validateEditorExportContent(content: Buffer, format: ExportFormat) {
  if (content.length === 0) throw new Error("editor export returned empty content")
  if (format !== "svg" && format !== "xmlsvg" && format !== "html2") {
    throw new Error(`${format} is not an editor-channel export format`)
  }
  const head = content.subarray(0, 4096).toString("utf8")
  if (format === "svg" || format === "xmlsvg") {
    if (!head.includes("<svg")) throw new Error(`editor export is not valid ${format.toUpperCase()} content`)
  } else {
    const lowered = head.toLowerCase()
    if (!lowered.includes("<html") && !lowered.includes("<!doctype")) {
      throw new Error("editor export is not valid HTML content")
    }
  }
}

function editorExportContentType(format: ExportFormat): string {
  if (format === "svg" || format === "xmlsvg") return "image/svg+xml"
  if (format === "html2") return "text/html"
  return "application/octet-stream"
}

async function requestDrawioExport(
  xml: string,
  format: ExportFormat,
  options: ExportOptions = {},
): Promise<{ content: Buffer; contentType: string; exportUrl: string }> {
  const settings = exportSettings()
  const prepared = prepareDrawioExport(xml, options.pageId)
  // The Docker ImageExport4 server has no "xmlpng" format; an editable PNG is
  // a regular PNG export with the source XML embedded (embedXml=1).
  const form = new URLSearchParams({ format: format === "xmlpng" ? "png" : format, xml: prepared.xml })
  if (prepared.pageId && !options.allPages) form.set("pageId", prepared.pageId)
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
    let detail = ""
    try {
      detail = (await response.text()).trim().slice(0, 500)
    } catch (error) {
      detail = `response body unavailable: ${(error as Error).message}`
    }
    throw new Error(
      `Draw.io Export Server returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
    )
  }
  let content: Buffer
  try {
    content = Buffer.from(await response.arrayBuffer())
  } catch (error) {
    throw new Error(
      `Draw.io Export Server closed the HTTP ${response.status} response before the export completed: ${(error as Error).message}`,
    )
  }
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

async function atomicWriteBinaryBatch(
  files: Array<{ target: string; content: Buffer }>,
  overwrite: boolean,
): Promise<void> {
  const uniqueTargets = new Set(files.map((file) => path.resolve(file.target)))
  if (uniqueTargets.size !== files.length) throw new Error("multi-page export resolved duplicate output paths")

  const staged: Array<{
    target: string
    temporary: string
    backup: string | null
    existed: boolean
  }> = []
  try {
    for (const [index, file] of files.entries()) {
      await fs.mkdir(path.dirname(file.target), { recursive: true })
      let existed = false
      try {
        existed = (await fs.stat(file.target)).isFile()
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      }
      if (existed && !overwrite) {
        throw new Error(`output already exists: ${file.target}; set overwrite=true to replace it`)
      }
      const nonce = `${process.pid}.${Date.now()}.${index}.${randomUUID()}`
      const temporary = `${file.target}.${nonce}.tmp`
      await fs.writeFile(temporary, file.content)
      staged.push({
        target: file.target,
        temporary,
        backup: existed ? `${file.target}.${nonce}.previous` : null,
        existed,
      })
    }

    const committed: typeof staged = []
    try {
      for (const file of staged) {
        if (file.existed && file.backup) await fs.rename(file.target, file.backup)
        try {
          await fs.rename(file.temporary, file.target)
          committed.push(file)
        } catch (error) {
          if (file.existed && file.backup) await fs.rename(file.backup, file.target)
          throw error
        }
      }
    } catch (error) {
      for (const file of committed.reverse()) {
        await fs.rm(file.target, { force: true })
        if (file.existed && file.backup) await fs.rename(file.backup, file.target)
      }
      throw error
    }

    for (const file of staged) {
      if (file.backup) await fs.rm(file.backup, { force: true })
    }
  } finally {
    for (const file of staged) {
      await fs.rm(file.temporary, { force: true })
      if (file.backup) {
        try {
          await fs.access(file.target)
        } catch {
          try {
            await fs.rename(file.backup, file.target)
          } catch { /* best-effort rollback after an interrupted batch commit */ }
        }
      }
    }
  }
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

async function exportDiagramPagesToFiles(options: {
  context: WorkspaceContext
  inputTarget: string
  xml: string
  format: ExportFormat
  outputPath?: string
  scale?: number
  border?: number
  background?: string
  embedXml?: boolean
  overwrite: boolean
}) {
  if (!MULTI_FILE_EXPORT_FORMATS.has(options.format)) {
    throw new Error(`${options.format} is not a per-page multi-file export format`)
  }
  const pages = parseDrawio(options.xml)
  const outputs = resolveMultiPageExportOutputs(
    options.context,
    options.inputTarget,
    options.outputPath,
    options.format,
    pages,
  )
  if (!options.overwrite) {
    for (const output of outputs) {
      try {
        if ((await fs.stat(output.outputTarget)).isFile()) {
          throw new Error(
            `output already exists: ${workspaceRelative(options.context, output.outputTarget)}; set overwrite=true to replace it`,
          )
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      }
    }
  }

  const rendered: Array<{
    page: ParsedPage
    pageIndex: number
    outputTarget: string
    content: Buffer
    contentType: string
    exportUrl: string
  }> = []
  for (const output of outputs) {
    const result = await requestDrawioExport(options.xml, options.format, {
      pageId: output.page.id,
      scale: options.scale,
      border: options.border,
      background: options.background,
      embedXml: options.embedXml,
    })
    rendered.push({ ...output, ...result })
  }
  for (const output of rendered) {
    await atomicWriteBinary(output.outputTarget, output.content, options.overwrite)
  }
  return rendered.map((output) => ({
    pageId: output.page.id,
    pageName: output.page.name,
    pageIndex: output.pageIndex,
    outputTarget: output.outputTarget,
    bytes: output.content.length,
    contentType: output.contentType,
    exportUrl: output.exportUrl,
  }))
}

type EditorExportOutcome =
  | {
    status: "exported"
    outputTarget: string
    bytes: number
    contentType: string
    content?: Buffer
    sourceRevision?: number
  }
  | {
    status: "editor_required"
    openUrl: string
    tokenExpiresAt: string
  }

async function waitForEditorConnection(
  sessionId: string,
  file: string,
  graceMs: number,
): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < graceMs) {
    if (integratedEditorConnected(sessionId, file)) return true
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return integratedEditorConnected(sessionId, file)
}

// Exports svg/xmlsvg/html2 through the Draw.io editor iframe connected over
// SSE. The iframe renders these formats client-side, so the built-in browser
// editor page must be open; when it is not, the caller receives editor_required
// with an openUrl to hand to MobileWork's built-in browser before retrying.
async function exportDiagramViaEditor(options: {
  context: { sessionID: string; directory: string; worktree?: string }
  inputTarget: string
  format: ExportFormat
  outputPath?: string
  xml?: string
  pageId?: string
  allPages?: boolean
  sourceRevision?: number
  writeOutput?: boolean
  overwrite: boolean
}): Promise<EditorExportOutcome> {
  if (!EDITOR_EXPORT_FORMATS.has(options.format)) {
    throw new Error(`${options.format} is not an editor-channel export format`)
  }
  const bound = await bindIntegratedSession(options.context, options.inputTarget)
  const outputTarget = resolveExportOutput(
    options.context,
    options.inputTarget,
    options.outputPath,
    options.format,
  )
  const connected = await waitForEditorConnection(
    bound.session.sessionId,
    options.inputTarget,
    EDITOR_EXPORT_CONNECT_GRACE_MS,
  )
  if (!connected) {
    const openUrl = new URL("/editor", `http://${bound.bridge.host}:${bound.bridge.port}`)
    openUrl.searchParams.set("sessionId", bound.session.sessionId)
    openUrl.searchParams.set("token", bound.token)
    return {
      status: "editor_required",
      openUrl: openUrl.toString(),
      tokenExpiresAt: new Date(Date.now() + BRIDGE_TOKEN_TTL_MS).toISOString(),
    }
  }

  const state = getIntegratedBridgeState()
  const requestId = `export_${randomUUID()}`
  const timeoutMs = exportSettings().timeoutMs
  return await new Promise<EditorExportOutcome>((resolve, reject) => {
    const timer = setTimeout(() => {
      state.pendingEditorExports.delete(requestId)
      reject(new Error(
        `editor export timed out after ${Math.round(timeoutMs / 1000)}s; make sure the built-in browser editor page is open and responsive, then retry`,
      ))
    }, timeoutMs)
    state.pendingEditorExports.set(requestId, {
      requestId,
      sessionId: bound.session.sessionId,
      diagramKey: integratedDiagramKey(bound.session.file),
      format: options.format,
      outputTarget,
      overwrite: options.overwrite,
      writeOutput: options.writeOutput !== false,
      resolve: (result) => resolve({
        status: "exported",
        ...result,
        sourceRevision: options.sourceRevision,
      }),
      reject,
      timer,
    })
    broadcastEditorCommand(
      bound.session,
      {
        action: "export",
        requestId,
        format: options.format,
        pageId: options.pageId,
        allPages: options.allPages === true,
        xml: options.xml,
        sourceRevision: options.sourceRevision,
      },
    )
  })
}

type EditorMultiPageExportOutcome =
  | {
    status: "exported"
    outputs: Array<{
      pageId: string
      pageName: string
      pageIndex: number
      outputTarget: string
      bytes: number
      contentType: string
    }>
    sourceRevision?: number
  }
  | {
    status: "editor_required"
    openUrl: string
    tokenExpiresAt: string
  }

async function exportDiagramPagesViaEditor(options: {
  context: { sessionID: string; directory: string; worktree?: string }
  inputTarget: string
  xml: string
  format: ExportFormat
  outputPath?: string
  sourceRevision?: number
  overwrite: boolean
}): Promise<EditorMultiPageExportOutcome> {
  if (!EDITOR_MULTI_FILE_EXPORT_FORMATS.has(options.format)) {
    throw new Error(`${options.format} is not an editor per-page multi-file export format`)
  }
  const pages = parseDrawio(options.xml)
  const outputs = resolveMultiPageExportOutputs(
    options.context,
    options.inputTarget,
    options.outputPath,
    options.format,
    pages,
  )
  if (!options.overwrite) {
    for (const output of outputs) {
      try {
        if ((await fs.stat(output.outputTarget)).isFile()) {
          throw new Error(
            `output already exists: ${workspaceRelative(options.context, output.outputTarget)}; set overwrite=true to replace it`,
          )
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      }
    }
  }

  const rendered: Array<{
    page: ParsedPage
    pageIndex: number
    outputTarget: string
    content: Buffer
    contentType: string
  }> = []
  for (const output of outputs) {
    const result = await exportDiagramViaEditor({
      context: options.context,
      inputTarget: options.inputTarget,
      format: options.format,
      outputPath: workspaceRelative(options.context, output.outputTarget),
      xml: options.xml,
      pageId: output.page.id,
      sourceRevision: options.sourceRevision,
      writeOutput: false,
      overwrite: options.overwrite,
    })
    if (result.status === "editor_required") return result
    if (!result.content) throw new Error("editor export completed without buffered content")
    rendered.push({ ...output, content: result.content, contentType: result.contentType })
  }
  await atomicWriteBinaryBatch(
    rendered.map((output) => ({ target: output.outputTarget, content: output.content })),
    options.overwrite,
  )
  return {
    status: "exported",
    sourceRevision: options.sourceRevision,
    outputs: rendered.map((output) => ({
      pageId: output.page.id,
      pageName: output.page.name,
      pageIndex: output.pageIndex,
      outputTarget: output.outputTarget,
      bytes: output.content.length,
      contentType: output.contentType,
    })),
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


type DiagramUpdateSource = "editor" | "agent" | "external" | "initial" | "restore"

type IntegratedSessionHistory = {
  revision: number
  xml: string
  updatedBy: DiagramUpdateSource
  updatedAt: string
}

type IntegratedSession = {
  sessionId: string
  bindingId: string
  workspace: string
  file: string
  editorUrl?: string
  revision: number
  xml: string
  fileHash: string
  updatedBy: DiagramUpdateSource
  updatedAt: string
  history: IntegratedSessionHistory[]
  backupFile: string | null
  activeAnnotationId: string | null
  activePreviewId: string | null
  annotationAuthorizations: Map<string, AnnotationAuthorization>
  historyWarning: string | null
  revisionWarning: string | null
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
  diagramKey: string
  bindingId: string
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

type AnnotationScope = "selection_only" | "selection_and_edges" | "surrounding_layout" | "diagram_wide"
type AnnotationWorkflowStatus = "open" | "resolved" | "ignored"
type AnnotationFreshness = "fresh" | "stale"
type AnnotationEffectiveStatus = AnnotationWorkflowStatus | "stale"
type AnnotationStatusFilter = AnnotationWorkflowStatus | "pending" | "fresh" | "stale" | "all"

type AnnotationAuthorization = {
  approvalToken: string
  sessionId: string
  diagramKey: string
  scope: AnnotationScope
  plan: string
  proposedChangedIds: string[]
  escalationReason: string | null
  baseRevision: number
  approvedAt: string
  consumedAt: string | null
  previewId: string | null
}

type DiagramRevisionTransition = {
  fromRevision: number
  revision: number
  contentHash: string
  updatedBy: DiagramUpdateSource
  updatedAt: string
}

type DiagramRevisionLedger = {
  schemaVersion: 1
  file: { relativePath: string; pathKey: string }
  revision: number
  contentHash: string
  updatedBy: DiagramUpdateSource
  updatedAt: string
  pendingTransition: DiagramRevisionTransition | null
}

type PatchPreviewStatus = "pending" | "authorized" | "cancelled" | "applied" | "stale"

type ApprovalReviewStatus =
  | "awaiting_question"
  | "waiting_for_user"
  | "approved"
  | "cancelled"
  | "feedback"
  | "consumed"
  | "stale"

type ApprovalQuestion = {
  question: string
  header: string
  options: Array<{ label: string; description: string }>
  multiple: false
  custom: true
}

type ApprovalReview = {
  id: string
  fingerprint: string
  kind: "preview" | "annotation"
  sessionId: string
  diagramKey: string
  previewId: string
  baseRevision: number
  candidateHash: string
  plan: string
  annotationId: string | null
  requestedScope: AnnotationScope | null
  proposedChangedIds: string[]
  escalationReason: string | null
  question: ApprovalQuestion
  requestIds: string[]
  status: ApprovalReviewStatus
  feedback: string | null
  createdAt: string
  expiresAt: number
  resolvedAt: string | null
}

type PatchPreview = {
  id: string
  sessionId: string
  diagramKey: string
  file: string
  pageId: string
  baseRevision: number
  baseFileHash: string
  candidateXml: string
  candidateHash: string
  beforePreviewXml: string
  comparePreviewXml: string
  changedIds: string[]
  changedQualifiedIds: string[]
  affectedPageIds: string[]
  diff: ReturnType<typeof diffParsedPages>
  status: PatchPreviewStatus
  statusReason: string | null
  approvalToken: string | null
  approvedAt: string | null
  consumedAt: string | null
  approvalReviewId: string | null
  createdAt: string
  expiresAt: number
  terminalAt: number | null
}

type AnnotationTask = {
  id: string
  file: string
  pageId: string
  pageName: string
  cells: AnnotationCell[]
  region: AnnotationRegion | null
  instruction: string
  scope: AnnotationScope
  status: AnnotationWorkflowStatus
  baseRevision: number
  baseFileHash: string
  baseCellHashes: Record<string, string>
  result: AnnotationResult
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  ignoredAt: string | null
  ignoredReason: string | null
}

type AnnotationEffectiveState = {
  status: AnnotationWorkflowStatus
  effectiveStatus: AnnotationEffectiveStatus
  freshness: AnnotationFreshness
  requiresConfirmation: boolean
  staleReason?: string
}

type PendingEditorExport = {
  requestId: string
  sessionId: string
  diagramKey: string
  format: ExportFormat
  outputTarget: string
  overwrite: boolean
  writeOutput: boolean
  resolve: (result: {
    outputTarget: string
    bytes: number
    contentType: string
    content?: Buffer
  }) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

type IntegratedBridgeState = {
  server: Server | null
  startPromise: Promise<{ host: string; port: number }> | null
  host: string
  port: number
  sessions: Map<string, IntegratedSession>
  tokens: Map<string, IntegratedToken>
  eventClients: Map<string, Set<{
    response: import("node:http").ServerResponse
    diagramKey: string
  }>>
  pendingEditorExports: Map<string, PendingEditorExport>
  writeQueues: Map<string, Promise<unknown>>
  annotationWriteQueues: Map<string, Promise<unknown>>
  annotationsByDiagram: Map<string, Map<string, AnnotationTask>>
  historyWriteQueues: Map<string, Promise<unknown>>
  historyDebounce: Map<string, HistoryPendingEditor>
  previewInFlight: Map<string, Promise<Buffer>>
  previewActive: number
  previewWaiters: Array<() => void>
  patchPreviews: Map<string, PatchPreview>
  approvalReviews: Map<string, ApprovalReview>
  questionReviewIds: Map<string, string>
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
      pendingEditorExports: new Map(),
      writeQueues: new Map(),
      annotationWriteQueues: new Map(),
      annotationsByDiagram: new Map(),
      historyWriteQueues: new Map(),
      historyDebounce: new Map(),
      previewInFlight: new Map(),
      previewActive: 0,
      previewWaiters: [],
      patchPreviews: new Map(),
      approvalReviews: new Map(),
      questionReviewIds: new Map(),
    }
  }
  integratedBridgeGlobal.__drawioIntegratedBridge.writeQueues ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.pendingEditorExports ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.annotationWriteQueues ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.annotationsByDiagram ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.historyWriteQueues ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.historyDebounce ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.previewInFlight ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.previewActive ||= 0
  integratedBridgeGlobal.__drawioIntegratedBridge.previewWaiters ||= []
  integratedBridgeGlobal.__drawioIntegratedBridge.patchPreviews ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.approvalReviews ||= new Map()
  integratedBridgeGlobal.__drawioIntegratedBridge.questionReviewIds ||= new Map()
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
  if (value === "selection_and_edges" || value === "surrounding_layout" || value === "diagram_wide") return value
  return "selection_only"
}

function annotationScopeLabel(scope: AnnotationScope): string {
  if (scope === "diagram_wide") return "允许修改整个图表"
  if (scope === "selection_and_edges") return "允许调整关联连线"
  if (scope === "surrounding_layout") return "允许调整周边布局"
  return "只修改选区"
}

function annotationScopeRank(scope: AnnotationScope): number {
  if (scope === "diagram_wide") return 3
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
  if (diskHash !== session.fileHash) {
    const pages = parseDrawio(diskXml)
    const report = validationReport(pages)
    if (!report.valid) {
      throw new Error(`workspace file changed to invalid Draw.io XML: ${JSON.stringify(report.errors)}`)
    }
  }

  const previousHash = session.fileHash
  const previousRevision = session.revision
  const reconciled = await reconcileDiagramRevisionLedger(session, diskHash)
  if (diskHash === previousHash && reconciled.ledger.revision === previousRevision) return session

  if (diskHash !== previousHash) integratedHistoryPush(session)
  session.revision = reconciled.ledger.revision
  session.xml = diskXml
  session.fileHash = diskHash
  session.updatedBy = reconciled.ledger.updatedBy
  session.updatedAt = reconciled.ledger.updatedAt
  session.revisionWarning = null
  finishPatchPreviewsForCommit(session.file, null)
  broadcastIntegratedRevision(session)
  if (reconciled.advancedExternally) {
    await createHistorySnapshot(session, { source: "external", xml: diskXml, sessionRevision: session.revision })
  }
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

function annotationSessionFor(
  context: { sessionID: string; directory: string; worktree?: string },
  file?: string,
): IntegratedSession | null {
  if (file?.trim()) {
    return integratedSessionFor(context, resolveWorkspacePath(context, file))
  }
  return getIntegratedBridgeState().sessions.get(context.sessionID) || null
}

async function integratedCommit(
  session: IntegratedSession,
  xml: string,
  baseRevision: number,
  source: "editor" | "agent",
  clientId: string | null = null,
  options: { autoMerge?: boolean; appliedPreviewId?: string | null } = {},
) {
  const state = getIntegratedBridgeState()
  const queueKey = path.resolve(session.file).toLowerCase()
  const previous = state.writeQueues.get(queueKey) || Promise.resolve()
  const operation = previous.catch(() => undefined).then(async () => {
    let candidateXml = xml
    let autoMerge: null | {
      status: "merged"
      fromRevision: number
      ontoRevision: number
      localChangedKeys: string[]
      remoteChangedKeys: string[]
    } = null
    // LP semantics: refresh and compare inside the serialized critical section.
    // No writer can pass the same revision check concurrently.
    await refreshIntegratedSession(session)
    if (baseRevision !== session.revision) {
      const manualChanges = integratedManualChanges(session, baseRevision)
      if (options.autoMerge) {
        const base = session.history.find((entry) => entry.revision === baseRevision)
        const merge = base
          ? tryMergeDrawioXml(base.xml, xml, session.xml)
          : { status: "unavailable" as const, reason: "base revision is no longer in memory" }
        if (merge.status === "merged") {
          candidateXml = merge.xml
          autoMerge = {
            status: "merged",
            fromRevision: baseRevision,
            ontoRevision: session.revision,
            localChangedKeys: merge.localChangedKeys,
            remoteChangedKeys: merge.remoteChangedKeys,
          }
          if (
            merge.localChangedKeys.length === 0
            || integratedHash(candidateXml) === session.fileHash
          ) {
            return {
              conflict: false as const,
              document: session,
              validation: validationReport(parseDrawio(session.xml)),
              autoMerge,
            }
          }
        } else {
          return {
            conflict: true as const,
            current: session,
            manualChanges,
            merge,
          }
        }
      } else {
        return {
          conflict: true as const,
          current: session,
          manualChanges,
          merge: null,
        }
      }
    }

    const pages = parseDrawio(candidateXml)
    const report = validationReport(pages)
    if (!report.valid) {
      return { invalid: true as const, report }
    }

    const candidateHash = integratedHash(candidateXml)
    const transition = await prepareDiagramRevisionTransition(session, candidateHash, source)
    integratedHistoryPush(session)
    try {
      if (!session.backupFile) {
        const write = await atomicWrite(session.file, candidateXml, true)
        session.backupFile = write.backup
      } else {
        await replaceDiagramWithoutBackup(session.file, candidateXml)
      }
    } catch (error) {
      // A failed file replacement leaves the prepared transition recoverable.
      // Reconcile immediately when possible so the next caller is not blocked.
      try {
        const currentXml = await readDiagramFile(session.file)
        await reconcileDiagramRevisionLedger(session, integratedHash(currentXml))
      } catch (recoveryError) {
        console.warn(`diagram revision recovery failed for ${session.file}: ${(recoveryError as Error).message}`)
      }
      throw error
    }

    session.revision = transition.revision
    session.xml = candidateXml
    session.fileHash = candidateHash
    session.updatedBy = source
    session.updatedAt = transition.updatedAt
    session.revisionWarning = null
    try {
      await finalizeDiagramRevisionTransition(session, transition)
    } catch (error) {
      // The pending transition was durably written before the diagram file.
      // A later bind/read can therefore finalize the same revision safely.
      session.revisionWarning = `diagram revision finalization pending: ${(error as Error).message}`
      console.warn(`${session.revisionWarning} for ${session.file}`)
    }
    finishPatchPreviewsForCommit(session.file, options.appliedPreviewId || null)
    broadcastIntegratedRevision(session, clientId)
    if (source === "agent") {
      // A history-record failure must never roll back or fail the actual save.
      // Only the pre-restore checkpoint in the restore transaction is mandatory.
      try {
        await createHistorySnapshot(session, { source: "agent", xml: candidateXml, sessionRevision: session.revision })
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
      autoMerge,
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
  if (integratedDiagramKey(session.file) !== tokenState.diagramKey) return null
  if (session.bindingId !== tokenState.bindingId) return null
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
    revisionScope: "diagram",
    revisionWarning: session.revisionWarning,
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
  })}\n\n`
  const diagramKey = integratedDiagramKey(session.file)
  const state = getIntegratedBridgeState()
  for (const candidate of state.sessions.values()) {
    if (integratedDiagramKey(candidate.file) !== diagramKey) continue
    for (const client of state.eventClients.get(candidate.sessionId) || []) {
      if (client.diagramKey === diagramKey) client.response.write(payload)
    }
  }
}

function integratedEditorConnected(sessionId: string, file: string): boolean {
  const diagramKey = integratedDiagramKey(file)
  return [...(getIntegratedBridgeState().eventClients.get(sessionId) || [])]
    .some((client) => client.diagramKey === diagramKey)
}

// Sends an editor-command SSE frame to exactly one connected editor page for
// the given diagram. With multiple tabs open on the same file, only the first
// connected page performs the command, avoiding duplicate exports.
function broadcastEditorCommand(session: IntegratedSession, payload: Record<string, unknown>) {
  const frame = `event: editor-command\ndata: ${JSON.stringify(payload)}\n\n`
  const diagramKey = integratedDiagramKey(session.file)
  const client = [...(getIntegratedBridgeState().eventClients.get(session.sessionId) || [])]
    .find((candidate) => candidate.diagramKey === diagramKey)
  client?.response.write(frame)
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

function diagramRevisionRoot(workspace: string): string {
  return path.join(workspace, ".mobilework", "drawio-state", "v1")
}

function diagramRevisionStatePath(session: IntegratedSession): string {
  return assertHistoryContained(
    diagramRevisionRoot(session.workspace),
    path.join(diagramRevisionRoot(session.workspace), historyFileKey(session), "state.json"),
  )
}

function isDiagramUpdateSource(value: unknown): value is DiagramUpdateSource {
  return ["editor", "agent", "external", "initial", "restore"].includes(String(value))
}

function isDiagramRevisionTransition(value: unknown): value is DiagramRevisionTransition {
  return integratedRecord(value)
    && Number.isInteger(value.fromRevision) && (value.fromRevision as number) >= 0
    && Number.isInteger(value.revision) && (value.revision as number) > (value.fromRevision as number)
    && typeof value.contentHash === "string" && /^[a-f0-9]{64}$/.test(value.contentHash)
    && isDiagramUpdateSource(value.updatedBy)
    && typeof value.updatedAt === "string"
}

function isDiagramRevisionLedger(value: unknown): value is DiagramRevisionLedger {
  if (!integratedRecord(value) || value.schemaVersion !== DIAGRAM_REVISION_SCHEMA_VERSION) return false
  if (!integratedRecord(value.file)) return false
  if (typeof value.file.relativePath !== "string" || typeof value.file.pathKey !== "string") return false
  if (!Number.isInteger(value.revision) || (value.revision as number) < 0) return false
  if (typeof value.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(value.contentHash)) return false
  if (!isDiagramUpdateSource(value.updatedBy) || typeof value.updatedAt !== "string") return false
  return value.pendingTransition === null || isDiagramRevisionTransition(value.pendingTransition)
}

async function readDiagramRevisionLedger(session: IntegratedSession): Promise<DiagramRevisionLedger | null> {
  const target = diagramRevisionStatePath(session)
  let raw: string
  try {
    raw = await fs.readFile(target, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(`diagram revision state for ${historyFileKey(session)} is corrupted: ${(error as Error).message}`)
  }
  if (!isDiagramRevisionLedger(parsed)) {
    throw new Error(`diagram revision state for ${historyFileKey(session)} failed schema validation`)
  }
  const relativePath = path.relative(session.workspace, session.file).split(path.sep).join("/")
  if (parsed.file.relativePath !== relativePath || parsed.file.pathKey !== historyFileKey(session)) {
    throw new Error(`diagram revision state for ${historyFileKey(session)} is bound to another diagram`)
  }
  return parsed
}

async function writeDiagramRevisionLedger(
  session: IntegratedSession,
  ledger: DiagramRevisionLedger,
): Promise<void> {
  const target = diagramRevisionStatePath(session)
  await fs.mkdir(path.dirname(target), { recursive: true })
  const temporary = `${target}.${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}.tmp`
  await fs.writeFile(temporary, JSON.stringify(ledger, null, 2), "utf8")
  await fs.rename(temporary, target)
}

async function legacyDiagramRevisionBase(session: IntegratedSession): Promise<number> {
  try {
    const manifest = await readHistoryManifest(session)
    if (!manifest) return 0
    return manifest.entries.reduce(
      (maximum, entry) => Math.max(maximum, entry.sequence, entry.sessionRevision),
      0,
    )
  } catch {
    // Persistent history is auxiliary and may be unavailable. A new dedicated
    // revision ledger is still safe to establish from the current file.
    return 0
  }
}

async function reconcileDiagramRevisionLedger(
  session: IntegratedSession,
  diskHash: string,
): Promise<{ ledger: DiagramRevisionLedger; advancedExternally: boolean }> {
  let ledger = await readDiagramRevisionLedger(session)
  if (!ledger) {
    const now = new Date().toISOString()
    ledger = {
      schemaVersion: DIAGRAM_REVISION_SCHEMA_VERSION,
      file: {
        relativePath: path.relative(session.workspace, session.file).split(path.sep).join("/"),
        pathKey: historyFileKey(session),
      },
      revision: await legacyDiagramRevisionBase(session),
      contentHash: diskHash,
      updatedBy: "initial",
      updatedAt: now,
      pendingTransition: null,
    }
    await writeDiagramRevisionLedger(session, ledger)
    return { ledger, advancedExternally: false }
  }

  if (ledger.pendingTransition) {
    const pending = ledger.pendingTransition
    if (diskHash === pending.contentHash) {
      ledger = {
        ...ledger,
        revision: pending.revision,
        contentHash: pending.contentHash,
        updatedBy: pending.updatedBy,
        updatedAt: pending.updatedAt,
        pendingTransition: null,
      }
      await writeDiagramRevisionLedger(session, ledger)
      return { ledger, advancedExternally: false }
    }
    if (diskHash === ledger.contentHash) {
      ledger = { ...ledger, pendingTransition: null }
      await writeDiagramRevisionLedger(session, ledger)
      return { ledger, advancedExternally: false }
    }
    const now = new Date().toISOString()
    ledger = {
      ...ledger,
      revision: Math.max(ledger.revision, pending.revision) + 1,
      contentHash: diskHash,
      updatedBy: "external",
      updatedAt: now,
      pendingTransition: null,
    }
    await writeDiagramRevisionLedger(session, ledger)
    return { ledger, advancedExternally: true }
  }

  if (ledger.contentHash !== diskHash) {
    ledger = {
      ...ledger,
      revision: ledger.revision + 1,
      contentHash: diskHash,
      updatedBy: "external",
      updatedAt: new Date().toISOString(),
    }
    await writeDiagramRevisionLedger(session, ledger)
    return { ledger, advancedExternally: true }
  }
  return { ledger, advancedExternally: false }
}

async function prepareDiagramRevisionTransition(
  session: IntegratedSession,
  contentHash: string,
  updatedBy: DiagramUpdateSource,
): Promise<DiagramRevisionTransition> {
  const current = await readDiagramRevisionLedger(session)
  if (!current) throw new Error("diagram revision state is missing; re-open the diagram")
  if (current.pendingTransition) {
    throw new Error("diagram revision state has an unfinished transition; re-read the diagram state")
  }
  if (current.revision !== session.revision || current.contentHash !== session.fileHash) {
    throw new Error("diagram revision state changed; re-read the diagram state")
  }
  const transition: DiagramRevisionTransition = {
    fromRevision: current.revision,
    revision: current.revision + 1,
    contentHash,
    updatedBy,
    updatedAt: new Date().toISOString(),
  }
  await writeDiagramRevisionLedger(session, { ...current, pendingTransition: transition })
  return transition
}

async function finalizeDiagramRevisionTransition(
  session: IntegratedSession,
  transition: DiagramRevisionTransition,
): Promise<void> {
  const current = await readDiagramRevisionLedger(session)
  if (!current?.pendingTransition
    || current.pendingTransition.fromRevision !== transition.fromRevision
    || current.pendingTransition.revision !== transition.revision
    || current.pendingTransition.contentHash !== transition.contentHash) {
    throw new Error("diagram revision transition no longer matches the prepared write")
  }
  await writeDiagramRevisionLedger(session, {
    ...current,
    revision: transition.revision,
    contentHash: transition.contentHash,
    updatedBy: transition.updatedBy,
    updatedAt: transition.updatedAt,
    pendingTransition: null,
  })
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
  const data = `event: history\ndata: ${JSON.stringify({ kind, ...payload })}\n\n`
  const diagramKey = integratedDiagramKey(session.file)
  for (const client of getIntegratedBridgeState().eventClients.get(session.sessionId) || []) {
    if (client.diagramKey === diagramKey) client.response.write(data)
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

    // 3. Write the restored XML as a new current diagram revision. The
    // transition is persisted before the file replacement so a runtime restart
    // can recover the exact revision instead of resetting or double-incrementing.
    const snapshotHash = integratedHash(snapshotXml)
    const transition = await prepareDiagramRevisionTransition(session, snapshotHash, "restore")
    try {
      await replaceDiagramWithoutBackup(session.file, snapshotXml)
    } catch (error) {
      try {
        const currentXml = await readDiagramFile(session.file)
        await reconcileDiagramRevisionLedger(session, integratedHash(currentXml))
      } catch (recoveryError) {
        console.warn(`diagram revision recovery failed for ${session.file}: ${(recoveryError as Error).message}`)
      }
      throw error
    }
    integratedHistoryPush(session)
    session.revision = transition.revision
    session.xml = snapshotXml
    session.fileHash = snapshotHash
    session.updatedBy = "restore"
    session.updatedAt = transition.updatedAt
    session.revisionWarning = null
    try {
      await finalizeDiagramRevisionTransition(session, transition)
    } catch (error) {
      session.revisionWarning = `diagram revision finalization pending: ${(error as Error).message}`
      console.warn(`${session.revisionWarning} for ${session.file}`)
    }
    finishPatchPreviewsForCommit(session.file, null)

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
  const diagramKey = integratedDiagramKey(session.file)
  for (const candidate of getIntegratedBridgeState().sessions.values()) {
    if (integratedDiagramKey(candidate.file) !== diagramKey) continue
    for (const authorization of candidate.annotationAuthorizations.values()) {
      if (!authorization.previewId) continue
      const preview = getIntegratedBridgeState().patchPreviews.get(authorization.previewId)
      if (preview) cancelPatchPreview(candidate, preview, "关联的标注审批已失效")
    }
    candidate.annotationAuthorizations.clear()
    candidate.activeAnnotationId = null
  }
}

function annotationStorePath(session: IntegratedSession): string {
  const base = session.file.replace(/\.(drawio|xml)$/i, "")
  return `${base}.annotations.json`
}

function integratedDiagramKey(file: string): string {
  const resolved = path.resolve(file)
  return process.platform === "win32" ? resolved.toLowerCase() : resolved
}

function getDiagramAnnotations(session: IntegratedSession): Map<string, AnnotationTask> {
  const state = getIntegratedBridgeState()
  const diagramKey = integratedDiagramKey(session.file)
  let map = state.annotationsByDiagram.get(diagramKey)
  if (!map) {
    map = new Map()
    state.annotationsByDiagram.set(diagramKey, map)
  }
  return map
}

async function loadStoredAnnotations(session: IntegratedSession): Promise<void> {
  if (session.workspace === undefined) return
  const map = getDiagramAnnotations(session)
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
  const entries = Array.isArray(parsed)
    ? parsed
    : integratedRecord(parsed) && Array.isArray(parsed.annotations)
      ? parsed.annotations
      : []
  for (const entry of entries) {
    if (!integratedRecord(entry) || typeof entry.id !== "string") continue
    const task = normalizeAnnotationTask(entry, session)
    if (task) map.set(task.id, task)
  }
}

function patchPreviewPayload(preview: PatchPreview, includeXml = false) {
  return {
    id: preview.id,
    file: preview.file,
    pageId: preview.pageId,
    baseRevision: preview.baseRevision,
    candidateHash: preview.candidateHash,
    changedIds: preview.changedIds,
    changedQualifiedIds: preview.changedQualifiedIds,
    affectedPageIds: preview.affectedPageIds,
    diff: preview.diff,
    summary: preview.diff.summary,
    status: preview.status,
    statusReason: preview.statusReason,
    approvedAt: preview.approvedAt,
    consumedAt: preview.consumedAt,
    createdAt: preview.createdAt,
    expiresAt: new Date(preview.expiresAt).toISOString(),
    ...(includeXml ? {
      // xml remains the default compare view for older wrapper pages.
      xml: preview.comparePreviewXml,
      beforePreviewXml: preview.beforePreviewXml,
      afterPreviewXml: preview.candidateXml,
      candidateXml: preview.candidateXml,
      comparePreviewXml: preview.comparePreviewXml,
    } : {}),
  }
}

function broadcastPatchPreview(preview: PatchPreview, kind: string): void {
  const session = getIntegratedBridgeState().sessions.get(preview.sessionId)
  if (!session || integratedDiagramKey(session.file) !== preview.diagramKey) return
  const frame = `event: preview\ndata: ${JSON.stringify({
    kind,
    preview: patchPreviewPayload(preview),
  })}\n\n`
  for (const client of getIntegratedBridgeState().eventClients.get(preview.sessionId) || []) {
    if (client.diagramKey === preview.diagramKey) client.response.write(frame)
  }
}

function prunePatchPreviews(now = Date.now()): void {
  const state = getIntegratedBridgeState()
  for (const [id, review] of state.approvalReviews) {
    if (
      review.expiresAt <= now
      && !["consumed", "cancelled", "feedback", "stale"].includes(review.status)
    ) {
      review.status = "stale"
      review.resolvedAt = new Date(now).toISOString()
    }
    if (
      review.resolvedAt
      && Date.parse(review.resolvedAt) + PATCH_PREVIEW_RETENTION_MS <= now
    ) {
      for (const requestId of review.requestIds) state.questionReviewIds.delete(requestId)
      state.approvalReviews.delete(id)
    }
  }
  for (const [id, preview] of state.patchPreviews) {
    const terminalAt = preview.terminalAt
    if (terminalAt !== null && terminalAt + PATCH_PREVIEW_RETENTION_MS <= now) {
      state.patchPreviews.delete(id)
    }
  }
}

function clearApprovalQuestionBindings(review: ApprovalReview): void {
  const state = getIntegratedBridgeState()
  for (const requestId of review.requestIds) state.questionReviewIds.delete(requestId)
}

function invalidateApprovalReview(
  preview: PatchPreview,
  status: "cancelled" | "stale",
  reason: string,
): void {
  if (!preview.approvalReviewId) return
  const state = getIntegratedBridgeState()
  const review = state.approvalReviews.get(preview.approvalReviewId)
  if (!review || ["consumed", "cancelled", "feedback", "stale"].includes(review.status)) return
  review.status = status
  review.feedback = reason
  review.resolvedAt = new Date().toISOString()
  clearApprovalQuestionBindings(review)
}

function currentPatchPreview(session: IntegratedSession): PatchPreview | null {
  prunePatchPreviews()
  if (!session.activePreviewId) return null
  const preview = getIntegratedBridgeState().patchPreviews.get(session.activePreviewId)
  if (!preview || preview.sessionId !== session.sessionId
    || preview.diagramKey !== integratedDiagramKey(session.file)) {
    session.activePreviewId = null
    return null
  }
  if ((preview.status === "pending" || preview.status === "authorized")
    && preview.expiresAt <= Date.now()) {
    preview.status = "stale"
    preview.statusReason = "预览已过期，请基于最新图表重新生成"
    preview.approvalToken = null
    preview.terminalAt = Date.now()
    session.activePreviewId = null
    invalidateApprovalReview(preview, "stale", preview.statusReason)
    broadcastPatchPreview(preview, "stale")
  } else if ((preview.status === "pending" || preview.status === "authorized")
    && (preview.baseRevision !== session.revision || preview.baseFileHash !== session.fileHash)) {
    preview.status = "stale"
    preview.statusReason = `图表已从 revision ${preview.baseRevision} 更新到 ${session.revision}`
    preview.approvalToken = null
    preview.terminalAt = Date.now()
    session.activePreviewId = null
    invalidateApprovalReview(preview, "stale", preview.statusReason)
    broadcastPatchPreview(preview, "stale")
  }
  return preview
}

function cancelPatchPreview(session: IntegratedSession, preview: PatchPreview, reason: string): void {
  if (preview.status === "applied" || preview.status === "cancelled") return
  preview.status = "cancelled"
  preview.statusReason = reason
  preview.approvalToken = null
  preview.terminalAt = Date.now()
  invalidateApprovalReview(preview, "cancelled", reason)
  if (session.activePreviewId === preview.id) session.activePreviewId = null
  broadcastPatchPreview(preview, "cancelled")
}

function createPatchPreview(
  session: IntegratedSession,
  beforeXml: string,
  candidateXml: string,
  pageId: string,
  changedIds: string[],
  diff: ReturnType<typeof diffParsedPages>,
): PatchPreview {
  if (beforeXml.includes(PATCH_PREVIEW_ID_PREFIX) || candidateXml.includes(PATCH_PREVIEW_ID_PREFIX)) {
    throw new Error("formal Draw.io XML must not contain reserved preview artifacts")
  }
  const previous = currentPatchPreview(session)
  if (previous && (previous.status === "pending" || previous.status === "authorized")) {
    cancelPatchPreview(session, previous, "已生成新的修改预览")
  }
  const id = `prv_${randomBytes(9).toString("base64url")}`
  const createdAt = new Date().toISOString()
  const changedQualifiedIds = [...new Set([
    ...diff.added.map((entry) => entry.key),
    ...diff.removed.map((entry) => entry.key),
    ...diff.changed.map((entry) => entry.key),
    ...diff.pageChanges.map((entry) => `${entry.pageId}:@page`),
  ])]
  const affectedPageIds = [...new Set([
    ...diff.added.map((entry) => previewPageIdFromKey(entry.key, entry.cell.id)),
    ...diff.removed.map((entry) => previewPageIdFromKey(entry.key, entry.cell.id)),
    ...diff.changed.map((entry) => entry.pageId),
    ...diff.pageChanges.map((entry) => entry.pageId),
  ])].filter(Boolean)
  const comparePreviewXml = decoratePatchPreviewXml(beforeXml, candidateXml, diff, id)
  const preview: PatchPreview = {
    id,
    sessionId: session.sessionId,
    diagramKey: integratedDiagramKey(session.file),
    file: path.relative(session.workspace, session.file).split(path.sep).join("/"),
    pageId,
    baseRevision: session.revision,
    baseFileHash: session.fileHash,
    candidateXml,
    candidateHash: integratedHash(candidateXml),
    beforePreviewXml: beforeXml,
    comparePreviewXml,
    changedIds: [...new Set(changedIds.length > 0
      ? changedIds
      : [
          ...diff.added.map((entry) => entry.cell.id),
          ...diff.removed.map((entry) => entry.cell.id),
          ...diff.changed.map((entry) => entry.cellId),
          ...diff.pageChanges.map(() => "@page"),
        ])],
    changedQualifiedIds,
    affectedPageIds,
    diff,
    status: "pending",
    statusReason: null,
    approvalToken: null,
    approvedAt: null,
    consumedAt: null,
    approvalReviewId: null,
    createdAt,
    expiresAt: Date.now() + PATCH_PREVIEW_TTL_MS,
    terminalAt: null,
  }
  getIntegratedBridgeState().patchPreviews.set(id, preview)
  session.activePreviewId = id
  broadcastPatchPreview(preview, "created")
  return preview
}

function authorizePatchPreview(
  session: IntegratedSession,
  preview: PatchPreview,
  approvalToken: string,
): void {
  const current = currentPatchPreview(session)
  if (!current || current.id !== preview.id) throw new Error("patch preview is no longer active")
  if (preview.status !== "pending") {
    throw new Error(`patch preview is ${preview.status}; generate a fresh dry-run preview`)
  }
  preview.status = "authorized"
  preview.statusReason = null
  preview.approvalToken = approvalToken
  preview.approvedAt = new Date().toISOString()
  broadcastPatchPreview(preview, "authorized")
}

function patchPreviewForCandidate(
  session: IntegratedSession,
  requestedPreviewId: string | undefined,
  baseRevision: number,
  candidateXml: string,
): PatchPreview | null {
  const preview = requestedPreviewId
    ? getIntegratedBridgeState().patchPreviews.get(requestedPreviewId) || null
    : currentPatchPreview(session)
  if (!preview) {
    if (requestedPreviewId) throw new Error("patch preview not found for this session and diagram")
    return null
  }
  if (preview.sessionId !== session.sessionId
    || preview.diagramKey !== integratedDiagramKey(session.file)) {
    throw new Error("patch preview not found for this session and diagram")
  }
  currentPatchPreview(session)
  if (preview.status !== "pending" && preview.status !== "authorized") {
    if (!requestedPreviewId) return null
    throw new Error(`patch preview is ${preview.status}; generate a fresh preview`)
  }
  if (preview.baseRevision !== baseRevision
    || preview.candidateHash !== integratedHash(candidateXml)) {
    if (requestedPreviewId) {
      throw new Error("formal write does not match the requested preview candidate or revision")
    }
    return null
  }
  return preview
}

function defaultPatchPreviewPlan(preview: PatchPreview): string {
  const summary = preview.diff.summary
  return `Apply the visible Draw.io candidate: ${summary.added} added, ${summary.removed} removed, ${summary.changed} changed.`
}

type ApprovalReviewInput = {
  kind: "preview" | "annotation"
  plan: string
  annotationId?: string
  requestedScope?: AnnotationScope
  proposedChangedIds?: string[]
  escalationReason?: string | null
}

type ForwardedApprovalAnswer = {
  reviewId?: string
  answer?: string
}

type ApprovalReviewOutcome =
  | { approved: true; approvalToken: string; review: ApprovalReview }
  | { approved: false; payload: Record<string, unknown>; review: ApprovalReview }

const APPROVAL_CONFIRM_LABEL = "确认修改"
const APPROVAL_CANCEL_LABEL = "取消修改"

function approvalQuestion(review: Omit<ApprovalReview, "question">): ApprovalQuestion {
  const scope = review.requestedScope ? `；范围：${annotationScopeLabel(review.requestedScope)}` : ""
  const changedIds = review.proposedChangedIds.length > 0
    ? `；变更 ID：${review.proposedChangedIds.join(", ")}`
    : ""
  return {
    header: review.kind === "annotation" ? "批注修改审批" : "图表修改审批",
    question:
      `已在 Draw.io 画布展示候选修改，是否批准写入 ${review.baseRevision} 号版本？`
      + `\n计划：${review.plan}${scope}${changedIds}`
      + `\n审批编号：${review.id}`,
    options: [
      {
        label: APPROVAL_CONFIRM_LABEL,
        description: "仅批准当前画布中与该审批编号绑定的候选修改。",
      },
      {
        label: APPROVAL_CANCEL_LABEL,
        description: "不写入当前候选并使本次预览失效。",
      },
    ],
    multiple: false,
    custom: true,
  }
}

function approvalReviewFingerprint(
  preview: PatchPreview,
  input: ApprovalReviewInput,
): string {
  return integratedHash(JSON.stringify({
    kind: input.kind,
    previewId: preview.id,
    baseRevision: preview.baseRevision,
    candidateHash: preview.candidateHash,
    plan: input.plan.trim(),
    annotationId: input.annotationId || null,
    requestedScope: input.requestedScope || null,
    proposedChangedIds: [...(input.proposedChangedIds || [])].toSorted(),
    escalationReason: input.escalationReason?.trim() || null,
  }))
}

function ensureApprovalReview(
  session: IntegratedSession,
  preview: PatchPreview,
  input: ApprovalReviewInput,
): ApprovalReview {
  if (preview.status !== "pending") {
    throw new Error(`patch preview is ${preview.status}; generate a fresh preview`)
  }
  prunePatchPreviews()
  const state = getIntegratedBridgeState()
  if (preview.approvalReviewId) {
    const current = state.approvalReviews.get(preview.approvalReviewId)
    if (current) return current
  }
  const fingerprint = approvalReviewFingerprint(preview, input)
  const id = `rev_${randomBytes(12).toString("base64url")}`
  const base = {
    id,
    fingerprint,
    kind: input.kind,
    sessionId: session.sessionId,
    diagramKey: preview.diagramKey,
    previewId: preview.id,
    baseRevision: preview.baseRevision,
    candidateHash: preview.candidateHash,
    plan: input.plan.trim(),
    annotationId: input.annotationId || null,
    requestedScope: input.requestedScope || null,
    proposedChangedIds: [...(input.proposedChangedIds || [])],
    escalationReason: input.escalationReason?.trim() || null,
    requestIds: [],
    status: "awaiting_question" as const,
    feedback: null,
    createdAt: new Date().toISOString(),
    expiresAt: Math.min(preview.expiresAt, Date.now() + PATCH_PREVIEW_TTL_MS),
    resolvedAt: null,
  }
  const review: ApprovalReview = { ...base, question: approvalQuestion(base) }
  state.approvalReviews.set(id, review)
  preview.approvalReviewId = id
  return review
}

function approvalReviewPayload(review: ApprovalReview): Record<string, unknown> {
  const status = review.status === "feedback"
    ? "feedback_received"
    : review.status === "cancelled"
      ? "cancelled"
      : review.status === "stale"
        ? "stale"
        : review.status === "waiting_for_user"
          ? "question_pending"
          : "question_required"
  return {
    ok: false,
    applied: false,
    approvalRequired: status === "question_required",
    status,
    reviewId: review.id,
    previewId: review.previewId,
    baseRevision: review.baseRevision,
    candidateHash: review.candidateHash,
    ...(review.feedback ? { userFeedback: review.feedback } : {}),
    ...(status === "question_required" ? {
      question: {
        tool: "question",
        arguments: { questions: [review.question] },
      },
      guidance:
        "Call OpenCode's built-in question tool with exactly the returned arguments. "
        + "After the user answers, call the same Draw.io authorization or formal-write tool again with "
        + "approval_review_id set to reviewId and approval_answer set to the exact returned answer. "
        + "Do not invent, summarize, or answer the question yourself.",
    } : status === "question_pending" ? {
      guidance:
        "The OpenCode question is already active. Do not ask it again. "
        + "If the Agent already received the user's answer, retry this same Draw.io tool with "
        + "approval_review_id set to reviewId and approval_answer set to that exact answer. "
        + "Otherwise wait for the user's answer.",
      diagnostic: "question_answer_not_forwarded_or_pending",
    } : status === "feedback_received" ? {
      guidance:
        "The user supplied revision feedback instead of approving. Do not write this candidate. "
        + "Regenerate the candidate preview from the latest revision, then request a new question review.",
    } : {
      guidance: "The candidate was not approved. Do not write it; generate a new preview before trying again.",
    }),
  }
}

function resolvePatchPreviewApproval(
  session: IntegratedSession,
  preview: PatchPreview,
  input: ApprovalReviewInput,
  forwarded: ForwardedApprovalAnswer = {},
): ApprovalReviewOutcome {
  const review = ensureApprovalReview(session, preview, input)
  const hasForwardedReviewId = forwarded.reviewId !== undefined
  const hasForwardedAnswer = forwarded.answer !== undefined
  if (hasForwardedReviewId !== hasForwardedAnswer) {
    throw new Error("approval_review_id and approval_answer must be provided together after the OpenCode question returns")
  }
  if (hasForwardedReviewId && hasForwardedAnswer) {
    if (forwarded.reviewId !== review.id) {
      throw new Error("approval_review_id does not match the review bound to this preview")
    }
    if (review.status === "awaiting_question" || review.status === "waiting_for_user") {
      const answer = forwarded.answer!.trim()
      review.resolvedAt = new Date().toISOString()
      clearApprovalQuestionBindings(review)
      if (answer === APPROVAL_CONFIRM_LABEL) {
        review.status = "approved"
        review.feedback = null
      } else if (!answer || answer === APPROVAL_CANCEL_LABEL) {
        review.status = "cancelled"
        review.feedback = null
      } else {
        review.status = "feedback"
        review.feedback = answer
      }
    } else if (review.status === "approved" && forwarded.answer!.trim() !== APPROVAL_CONFIRM_LABEL) {
      throw new Error("approval_answer conflicts with the answer already recorded for this review")
    }
  }
  if (review.status === "approved") {
    if (
      review.sessionId !== session.sessionId
      || review.diagramKey !== integratedDiagramKey(session.file)
      || review.previewId !== preview.id
      || review.baseRevision !== session.revision
      || review.candidateHash !== preview.candidateHash
    ) {
      review.status = "stale"
      review.feedback = "图表版本或候选内容已变化"
      review.resolvedAt = new Date().toISOString()
      return { approved: false, payload: approvalReviewPayload(review), review }
    }
    const approvalToken = randomBytes(24).toString("base64url")
    authorizePatchPreview(session, preview, approvalToken)
    review.status = "consumed"
    review.resolvedAt = new Date().toISOString()
    clearApprovalQuestionBindings(review)
    return { approved: true, approvalToken, review }
  }
  if (review.status === "cancelled" || review.status === "feedback" || review.status === "stale") {
    cancelPatchPreview(
      session,
      preview,
      review.status === "feedback" ? "用户提出了新的修改意见" : "用户未批准该修改预览",
    )
  }
  return { approved: false, payload: approvalReviewPayload(review), review }
}

function validatePatchPreviewWrite(
  session: IntegratedSession,
  previewId: string | undefined,
  approvalToken: string | undefined,
  baseRevision: number,
  candidateXml: string,
): PatchPreview {
  if (!previewId) {
    throw new Error("preview_id is required for an active-session write; create a dry-run preview first")
  }
  const preview = getIntegratedBridgeState().patchPreviews.get(previewId)
  if (!preview || preview.sessionId !== session.sessionId
    || preview.diagramKey !== integratedDiagramKey(session.file)) {
    throw new Error("patch preview not found for this session and diagram")
  }
  currentPatchPreview(session)
  if (preview.status !== "authorized") {
    throw new Error(`patch preview is ${preview.status}; approve the visible preview before writing`)
  }
  if (!approvalToken || preview.approvalToken !== approvalToken) {
    throw new Error("patch preview approval token is missing or invalid")
  }
  if (preview.consumedAt) throw new Error("patch preview approval token has already been used")
  if (preview.baseRevision !== baseRevision || preview.baseRevision !== session.revision) {
    throw new Error("patch preview revision no longer matches the active diagram")
  }
  if (preview.candidateHash !== integratedHash(candidateXml)) {
    throw new Error("formal write does not match the candidate XML shown in the preview")
  }
  return preview
}

function finishPatchPreviewsForCommit(file: string, appliedPreviewId: string | null): void {
  const state = getIntegratedBridgeState()
  const diagramKey = integratedDiagramKey(file)
  const now = Date.now()
  for (const preview of state.patchPreviews.values()) {
    if (preview.diagramKey !== diagramKey
      || (preview.status !== "pending" && preview.status !== "authorized")) continue
    const session = state.sessions.get(preview.sessionId)
    if (preview.id === appliedPreviewId) {
      preview.status = "applied"
      preview.statusReason = null
      preview.consumedAt = new Date(now).toISOString()
      preview.terminalAt = now
      if (session?.activePreviewId === preview.id) session.activePreviewId = null
      broadcastPatchPreview(preview, "applied")
    } else {
      preview.status = "stale"
      preview.statusReason = "图表已被其它修改更新，请重新生成预览"
      preview.approvalToken = null
      preview.terminalAt = now
      if (session?.activePreviewId === preview.id) session.activePreviewId = null
      broadcastPatchPreview(preview, "stale")
    }
  }
}

function appendPreviewStyle(style: string | undefined, additions: string): string {
  const base = style?.trim() || ""
  return `${base}${base && !base.endsWith(";") ? ";" : ""}${additions}`
}

function previewPageIdFromKey(key: string, cellId: string): string {
  return key.slice(0, Math.max(0, key.length - cellId.length - 1))
}

function previewOverlayCell(
  id: string,
  parent: string,
  rectangle: Rectangle,
  color: string,
  label = "",
  ghost = false,
): Record<string, unknown> {
  const padding = ghost ? 0 : 6
  return {
    "@_id": id,
    "@_value": label,
    "@_style": [
      "rounded=1", "whiteSpace=wrap", "html=1",
      `fillColor=${ghost ? color : "none"}`, `strokeColor=${color}`,
      `strokeWidth=${ghost ? 3 : 4}`, "dashed=1", `opacity=${ghost ? 28 : 80}`,
      `fontColor=${color}`, "fontStyle=1", "movable=0", "resizable=0", "editable=0",
      "deletable=0", "connectable=0", "pointerEvents=0", "shadow=0",
    ].join(";") + ";",
    "@_vertex": "1",
    "@_parent": parent,
    mxGeometry: {
      "@_x": String(rectangle.x - padding),
      "@_y": String(rectangle.y - padding),
      "@_width": String(Math.max(1, rectangle.width + padding * 2)),
      "@_height": String(Math.max(1, rectangle.height + padding * 2)),
      "@_as": "geometry",
    },
  }
}

function previewOverlayEdge(
  raw: Record<string, unknown>,
  id: string,
  parent: string,
  color: string,
  opacity = 85,
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>
  clone["@_id"] = id
  clone["@_parent"] = parent
  clone["@_value"] = ""
  clone["@_style"] = appendPreviewStyle(attribute(clone["@_style"]),
    `strokeColor=${color};strokeWidth=4;opacity=${opacity};dashed=1;movable=0;editable=0;deletable=0;pointerEvents=0;`)
  return clone
}

function decoratePatchPreviewXml(
  beforeXml: string,
  candidateXml: string,
  diff: ReturnType<typeof diffParsedPages>,
  previewId: string,
): string {
  const beforePages = parseDrawio(beforeXml)
  const afterPages = parseDrawio(candidateXml)
  const editableBefore = parseEditableDrawio(beforeXml)
  const editableAfter = parseEditableDrawio(candidateXml)
  const beforeByPage = new Map(beforePages.map((page) => [page.id, page]))
  const afterByPage = new Map(afterPages.map((page) => [page.id, page]))
  const editableBeforeByPage = new Map(editableBefore.pages.map((page) => [page.id, page]))
  const editableAfterByPage = new Map(editableAfter.pages.map((page) => [page.id, page]))
  const changedKeys = new Map(diff.changed.map((entry) => [entry.key, entry]))
  const addedKeys = new Set(diff.added.map((entry) => entry.key))
  const removedKeys = new Set(diff.removed.map((entry) => entry.key))
  let overlayIndex = 0

  for (const [pageId, editablePage] of editableAfterByPage) {
    const beforePage = beforeByPage.get(pageId)
    const afterPage = afterByPage.get(pageId)
    if (!afterPage) continue
    const pageHasChanges = diff.added.some((entry) => previewPageIdFromKey(entry.key, entry.cell.id) === pageId)
      || diff.removed.some((entry) => previewPageIdFromKey(entry.key, entry.cell.id) === pageId)
      || diff.changed.some((entry) => entry.key.startsWith(`${pageId}:`))
    if (!pageHasChanges) continue

    const cells = editableCells(editablePage)
    const layerId = `${PATCH_PREVIEW_ID_PREFIX}layer_${previewId}_${overlayIndex++}`
    cells.push({ "@_id": layerId, "@_value": "AI 修改预览（临时）", "@_parent": "0" })
    const rawAfterById = new Map(cells.map((cell) => [rawCellId(cell), cell]))
    const afterContext = createGeometryContext(afterPage.cells)
    const beforeContext = beforePage ? createGeometryContext(beforePage.cells) : null
    const beforeCellsById = new Map((beforePage?.cells || []).map((cell) => [cell.id, cell]))
    const afterCellsById = new Map(afterPage.cells.map((cell) => [cell.id, cell]))

    for (const cell of afterPage.cells) {
      if (!cell.vertex && !cell.edge) continue
      const key = `${pageId}:${cell.id}`
      const raw = rawAfterById.get(cell.id)
      if (addedKeys.has(key)) {
        if (cell.vertex) {
          const rectangle = vertexRectangle(cell, afterContext)
          if (rectangle) cells.push(previewOverlayCell(
            `${PATCH_PREVIEW_ID_PREFIX}added_${previewId}_${overlayIndex++}`, layerId, rectangle, "#22c55e",
          ))
        } else if (raw) {
          cells.push(previewOverlayEdge(
            raw,
            `${PATCH_PREVIEW_ID_PREFIX}added_edge_${previewId}_${overlayIndex++}`,
            layerId,
            "#22c55e",
          ))
        }
        continue
      }
      const changed = changedKeys.get(key)
      if (!changed) continue
      if (cell.vertex) {
        const rectangle = vertexRectangle(cell, afterContext)
        if (rectangle) cells.push(previewOverlayCell(
          `${PATCH_PREVIEW_ID_PREFIX}changed_${previewId}_${overlayIndex++}`, layerId, rectangle, "#f59e0b",
        ))
        const beforeCell = beforeCellsById.get(cell.id)
        if (beforeCell && beforeContext
          && JSON.stringify(changed.before.geometry) !== JSON.stringify(changed.after.geometry)) {
          const oldRectangle = vertexRectangle(beforeCell, beforeContext)
          if (oldRectangle) cells.push(previewOverlayCell(
            `${PATCH_PREVIEW_ID_PREFIX}old_${previewId}_${overlayIndex++}`,
            layerId, oldRectangle, "#ef4444", "原位置", true,
          ))
        }
      } else if (raw) {
        cells.push(previewOverlayEdge(
          raw,
          `${PATCH_PREVIEW_ID_PREFIX}changed_edge_${previewId}_${overlayIndex++}`,
          layerId,
          "#3b82f6",
        ))
      }
    }

    if (beforePage && beforeContext) {
      const beforeEditablePage = editableBeforeByPage.get(pageId)
      const rawBeforeById = new Map(
        beforeEditablePage ? editableCells(beforeEditablePage).map((cell) => [rawCellId(cell), cell]) : [],
      )
      for (const cell of beforePage.cells) {
        const key = `${pageId}:${cell.id}`
        if (!removedKeys.has(key)) continue
        if (cell.vertex) {
          const rectangle = vertexRectangle(cell, beforeContext)
          if (rectangle) cells.push(previewOverlayCell(
            `${PATCH_PREVIEW_ID_PREFIX}removed_${previewId}_${overlayIndex++}`,
            layerId, rectangle, "#ef4444", `删除：${cell.label?.trim() || cell.id}`, true,
          ))
          continue
        }
        if (cell.edge && cell.source && cell.target
          && afterCellsById.has(cell.source) && afterCellsById.has(cell.target)) {
          const source = rawBeforeById.get(cell.id)
          if (!source) continue
          const clone = JSON.parse(JSON.stringify(source)) as Record<string, unknown>
          clone["@_id"] = `${PATCH_PREVIEW_ID_PREFIX}removed_edge_${previewId}_${overlayIndex++}`
          clone["@_parent"] = layerId
          clone["@_value"] = cell.label ? `删除：${cell.label}` : ""
          clone["@_style"] = appendPreviewStyle(attribute(clone["@_style"]),
            "strokeColor=#ef4444;strokeWidth=4;opacity=45;dashed=1;movable=0;editable=0;deletable=0;")
          cells.push(clone)
        }
      }
    }
  }

  const previewXml = serializeEditableDrawio(editableAfter)
  const report = validationReport(parseDrawio(previewXml))
  if (!report.valid) throw new Error(`generated preview XML is invalid: ${JSON.stringify(report.errors)}`)
  return previewXml
}

async function persistStoredAnnotations(session: IntegratedSession): Promise<void> {
  const state = getIntegratedBridgeState()
  const diagramKey = integratedDiagramKey(session.file)
  const previous = state.annotationWriteQueues.get(diagramKey) || Promise.resolve()
  const operation = previous.catch(() => undefined).then(async () => {
    if (testFaultInjected("annotationsFile")) throw new Error("injected annotation sidecar write failure")
    const map = getDiagramAnnotations(session)
    const annotations = [...map.values()].map((task) => ({
      id: task.id,
      file: task.file,
      pageId: task.pageId,
      pageName: task.pageName,
      cells: task.cells,
      region: task.region,
      instruction: task.instruction,
      scope: task.scope,
      status: task.status,
      baseRevision: task.baseRevision,
      baseFileHash: task.baseFileHash,
      baseCellHashes: task.baseCellHashes,
      result: task.result,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      resolvedAt: task.resolvedAt,
      ignoredAt: task.ignoredAt,
      ignoredReason: task.ignoredReason,
    }))
    const store = {
      schemaVersion: 3,
      file: path.relative(session.workspace, session.file).split(path.sep).join("/"),
      annotations,
    }
    const target = annotationStorePath(session)
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
    await fs.writeFile(temporary, JSON.stringify(store, null, 2), "utf8")
    await fs.rename(temporary, target)
  })
  state.annotationWriteQueues.set(diagramKey, operation)
  try {
    await operation
  } finally {
    if (state.annotationWriteQueues.get(diagramKey) === operation) {
      state.annotationWriteQueues.delete(diagramKey)
    }
  }
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
  // Schema v2 allowed a persisted "stale" status. Staleness is now derived
  // from the latest diagram, so legacy stale tasks migrate back to open.
  const status: AnnotationWorkflowStatus = value.status === "resolved" || value.status === "ignored"
    ? value.status
    : "open"
  return {
    id: String(value.id),
    file: path.relative(session.workspace, session.file).split(path.sep).join("/"),
    pageId: typeof value.pageId === "string" ? String(value.pageId) : "",
    pageName: typeof value.pageName === "string" ? String(value.pageName) : "",
    cells,
    region,
    instruction: typeof value.instruction === "string" ? String(value.instruction) : "",
    scope: annotationScope(value.scope),
    status,
    baseRevision: Number.isInteger(value.baseRevision) ? Number(value.baseRevision) : 0,
    baseFileHash: typeof value.baseFileHash === "string" ? String(value.baseFileHash) : "",
    baseCellHashes: integratedRecord(value.baseCellHashes)
      ? Object.fromEntries(Object.entries(value.baseCellHashes).filter((entry): entry is [string, string] => (
        typeof entry[1] === "string"
      )))
      : {},
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
    ignoredAt: typeof value.ignoredAt === "string" ? String(value.ignoredAt) : null,
    ignoredReason: typeof value.ignoredReason === "string" ? String(value.ignoredReason) : null,
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

function annotationBaseCellHashes(
  pages: ParsedPage[],
  pageId: string,
  cellIds: string[],
): Record<string, string> {
  const page = pages.find((candidate) => candidate.id === pageId || !pageId)
  if (!page) return {}
  const byId = new Map(page.cells.map((cell) => [cell.id, cell]))
  return Object.fromEntries(cellIds.flatMap((id) => {
    const cell = byId.get(id)
    return cell ? [[`${page.id}:${id}`, integratedHash(JSON.stringify(comparableCell(cell)))]] : []
  }))
}

type AnnotationScopeContext = {
  pages: ParsedPage[]
  page: ParsedPage
  selectedIds: Set<string>
  selectedNodeIds: Set<string>
  allowedIds: Set<string>
  allowedQualifiedIds: Set<string>
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
  const page = task.pageId
    ? pages.find((candidate) => candidate.id === task.pageId)
    : pages[0]
  if (!page) throw new Error(`annotation page not found: ${task.pageId || "(first page)"}`)
  const cellsById = new Map(page.cells.map((cell) => [cell.id, cell]))
  const selectedIds = new Set(task.cells.map((cell) => cell.id))
  const selectedNodeIds = new Set(
    task.cells
      .filter((cell) => cellsById.get(cell.id)?.vertex)
      .map((cell) => cell.id),
  )
  const allowedIds = new Set(selectedIds)
  const allowedQualifiedIds = new Set<string>()
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

  if (scope === "diagram_wide") {
    for (const candidate of pages) {
      for (const cell of candidate.cells) {
        if (cell.vertex || cell.edge) allowedQualifiedIds.add(`${candidate.id}:${cell.id}`)
      }
    }
  }

  return {
    pages,
    page,
    selectedIds,
    selectedNodeIds,
    allowedIds,
    allowedQualifiedIds,
    allowedVertexIds,
    expandedRegion,
  }
}

function activeAnnotationTask(session: IntegratedSession): AnnotationTask | null {
  const id = session.activeAnnotationId
  if (!id) return null
  const task = getDiagramAnnotations(session).get(id)
  if (!task || task.status !== "open") {
    session.annotationAuthorizations.delete(id)
    session.activeAnnotationId = null
    return null
  }
  return task
}

function requireAnnotationAuthorization(
  session: IntegratedSession,
  annotationId: string | undefined,
  approvalToken: string | undefined,
): { task: AnnotationTask; authorization: AnnotationAuthorization; scope: AnnotationScopeContext } | null {
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
  const authorization = session.annotationAuthorizations.get(active.id)
  if (!authorization || !approvalToken || authorization.approvalToken !== approvalToken) {
    throw new Error(
      "annotation change has not been approved; complete the OpenCode question review returned by drawio_authorize_annotation_change before writing",
    )
  }
  if (authorization.consumedAt) {
    throw new Error("annotation approval token has already been used; request approval again before another write")
  }
  if (
    authorization.sessionId !== session.sessionId
    || authorization.diagramKey !== integratedDiagramKey(session.file)
  ) {
    throw new Error("annotation approval belongs to a different diagram session; request approval again")
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
  pageId: string,
  operations: PatchOperation[],
  changedIds: string[],
): void {
  const { task, authorization, scope } = guard
  const planned = new Set(authorization.proposedChangedIds)
  const addedNodeIds = new Set(
    operations.filter((operation) => operation.type === "add-node").map((operation) => operation.id),
  )

  for (const operation of operations) {
    const disclosedId = authorization.scope === "diagram_wide"
      ? `${pageId}:${operation.id}`
      : operation.id
    if (!planned.has(disclosedId)) {
      throw new Error(`annotation scope violation: ${disclosedId} was not disclosed in the approved change plan`)
    }
    if (authorization.scope === "diagram_wide") continue
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
    const disclosedId = authorization.scope === "diagram_wide" ? `${pageId}:${id}` : id
    if (!planned.has(disclosedId)) {
      throw new Error(`annotation scope violation: actual change ${disclosedId} was not disclosed in the approved plan`)
    }
    if (authorization.scope === "diagram_wide") continue
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
  const changedKeys = [
    ...[...diff.added, ...diff.removed, ...diff.changed].map((entry) => entry.key),
    ...diff.pageChanges.map((entry) => `${entry.pageId}:@page`),
  ]
  const changedIds = guard.authorization.scope === "diagram_wide"
    ? changedKeys
    : changedKeys.map((key) => key.startsWith(pagePrefix) ? key.slice(pagePrefix.length) : key)
  const planned = new Set(guard.authorization.proposedChangedIds)
  for (const id of changedIds) {
    if (!planned.has(id)) {
      throw new Error(`annotation scope violation: actual change ${id} was not disclosed in the approved plan`)
    }
    const allowed = guard.authorization.scope === "diagram_wide"
      ? guard.scope.allowedQualifiedIds.has(id) || planned.has(id)
      : guard.scope.allowedIds.has(id)
    if (!allowed) {
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

function annotationAuthorizationPayload(
  session: IntegratedSession,
  task: AnnotationTask,
  authorization: AnnotationAuthorization,
  alreadyAuthorized = false,
): Record<string, unknown> {
  const scope = annotationScopeContext(session, task, authorization.scope)
  return {
    ok: true,
    annotationId: task.id,
    approvalToken: authorization.approvalToken,
    previewId: authorization.previewId,
    baseRevision: authorization.baseRevision,
    requestedScope: authorization.scope,
    requestedScopeLabel: annotationScopeLabel(authorization.scope),
    originalScope: task.scope,
    originalScopeLabel: annotationScopeLabel(task.scope),
    escalationReason: authorization.escalationReason,
    proposedChangedIds: authorization.proposedChangedIds,
    allowedExistingIds: authorization.scope === "diagram_wide"
      ? [...scope.allowedQualifiedIds]
      : [...scope.allowedIds],
    alreadyAuthorized,
    guidance:
      "Approval is valid for one formal write at this exact revision. Pass annotation_id and approval_token to drawio_patch or drawio_update_state. Any undeclared or out-of-scope stable ID is rejected.",
  }
}

function annotationStaleState(
  session: IntegratedSession,
  task: AnnotationTask,
): { stale: boolean; reason?: string } {
  if (task.status !== "open") return { stale: false }
  if (task.baseFileHash && task.baseFileHash === session.fileHash) return { stale: false }
  if (!task.baseFileHash && task.baseRevision >= session.revision) return { stale: false }
  if (task.cells.length === 0) return { stale: false }
  const revisionBase = session.history.find((entry) => entry.revision === task.baseRevision)
  const base = revisionBase && (
    !task.baseFileHash || integratedHash(revisionBase.xml) === task.baseFileHash
  ) ? revisionBase : undefined
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
      const expectedHash = task.baseCellHashes[`${task.pageId}:${selected.id}`]
      if (expectedHash && integratedHash(JSON.stringify(comparableCell(after))) !== expectedHash) {
        return { stale: true, reason: `selected cell "${selected.id}" changed since the annotation was created` }
      }
      if (!expectedHash && before && JSON.stringify(comparableCell(before)) !== JSON.stringify(comparableCell(after))) {
        return { stale: true, reason: `selected cell "${selected.id}" changed since the annotation was created` }
      }
      if (!expectedHash && !before && (
        (selected.label || "") !== (after.label || "")
        || (selected.source || "") !== (after.source || "")
        || (selected.target || "") !== (after.target || "")
      )) {
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
  if (task.status !== "open") {
    return {
      status: task.status,
      effectiveStatus: task.status,
      freshness: "fresh",
      requiresConfirmation: false,
    }
  }
  const computed = annotationStaleState(session, task)
  return {
    status: "open",
    effectiveStatus: computed.stale ? "stale" : "open",
    freshness: computed.stale ? "stale" : "fresh",
    requiresConfirmation: computed.stale,
    staleReason: computed.stale ? computed.reason : undefined,
  }
}

function annotationMatchesStatus(
  state: AnnotationEffectiveState,
  statusFilter: AnnotationStatusFilter,
): boolean {
  if (statusFilter === "all") return true
  if (statusFilter === "pending" || statusFilter === "open") return state.status === "open"
  if (statusFilter === "fresh") return state.status === "open" && state.freshness === "fresh"
  if (statusFilter === "resolved") return state.status === "resolved"
  if (statusFilter === "ignored") return state.status === "ignored"
  if (statusFilter === "stale") return state.status === "open" && state.freshness === "stale"
  return false
}

function annotationStatusCounts(states: AnnotationEffectiveState[]) {
  const counts = {
    pending: 0,
    open: 0,
    fresh: 0,
    stale: 0,
    resolved: 0,
    ignored: 0,
    all: states.length,
  }
  for (const state of states) {
    if (state.status === "open") {
      counts.pending += 1
      counts.open += 1
      counts[state.freshness] += 1
    } else {
      counts[state.status] += 1
    }
  }
  return counts
}

function annotationPayload(
  session: IntegratedSession,
  task: AnnotationTask,
  state: AnnotationEffectiveState = annotationEffectiveState(session, task),
) {
  const authorization = session.annotationAuthorizations.get(task.id) || null
  return {
    id: task.id,
    file: task.file,
    page: { id: task.pageId, name: task.pageName },
    cells: task.cells,
    region: task.region,
    instruction: task.instruction,
    scope: task.scope,
    scopeLabel: annotationScopeLabel(task.scope),
    authorization: authorization
      ? {
        scope: authorization.scope,
        scopeLabel: annotationScopeLabel(authorization.scope),
        plan: authorization.plan,
        proposedChangedIds: authorization.proposedChangedIds,
        escalationReason: authorization.escalationReason,
        baseRevision: authorization.baseRevision,
        approvedAt: authorization.approvedAt,
        consumedAt: authorization.consumedAt,
      }
      : null,
    status: state.status,
    effectiveStatus: state.effectiveStatus,
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
    ignoredAt: task.ignoredAt,
    ignoredReason: task.ignoredReason,
  }
}

function broadcastAnnotation(session: IntegratedSession, task: AnnotationTask, kind: string): void {
  const state = getIntegratedBridgeState()
  const diagramKey = integratedDiagramKey(session.file)
  for (const candidate of state.sessions.values()) {
    if (integratedDiagramKey(candidate.file) !== diagramKey) continue
    const payload = `event: annotation\\ndata: ${JSON.stringify({
      kind,
      annotation: annotationPayload(candidate, task),
    })}\n\n`
    const candidateDiagramKey = integratedDiagramKey(candidate.file)
    for (const client of state.eventClients.get(candidate.sessionId) || []) {
      if (client.diagramKey === candidateDiagramKey) client.response.write(payload)
    }
  }
}

function clearAnnotationSessionState(session: IntegratedSession, annotationId: string): void {
  const diagramKey = integratedDiagramKey(session.file)
  for (const candidate of getIntegratedBridgeState().sessions.values()) {
    if (integratedDiagramKey(candidate.file) !== diagramKey) continue
    const authorization = candidate.annotationAuthorizations.get(annotationId)
    if (authorization?.previewId) {
      const preview = getIntegratedBridgeState().patchPreviews.get(authorization.previewId)
      if (preview) cancelPatchPreview(candidate, preview, "关联的标注任务已结束")
    }
    candidate.annotationAuthorizations.delete(annotationId)
    if (candidate.activeAnnotationId === annotationId) candidate.activeAnnotationId = null
  }
}

function resolveAnnotationPage(
  pages: ParsedPage[],
  pageId: string,
  pageName: string,
  cells: AnnotationCell[],
): ParsedPage | null {
  const exact = pageId ? pages.find((page) => page.id === pageId) : pages[0]
  if (exact) return exact

  // Draw.io assigns a zero-based numeric id when loading an <diagram> that has
  // no explicit id, while parseDrawio deliberately uses stable page-1/page-2
  // fallbacks. Only accept that numeric compatibility path when both the page
  // name and every selected cell still identify the indexed canonical page.
  if (!/^\d+$/u.test(pageId)) return null
  const pageIndex = Number(pageId)
  if (!Number.isSafeInteger(pageIndex) || pageIndex < 0) return null
  const indexed = pages[pageIndex]
  if (!indexed) return null
  if (pageName && pageName !== indexed.name) return null
  const indexedCellIds = new Set(indexed.cells.map((cell) => cell.id))
  if (cells.some((cell) => !indexedCellIds.has(cell.id))) return null
  return indexed
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
  eventsUrl.searchParams.set(
    "file",
    path.relative(options.session.workspace, options.session.file).split(path.sep).join("/"),
  )
  const annotationsUrl = new URL("/api/annotations", options.bridgeUrl)
  annotationsUrl.searchParams.set("sessionId", options.session.sessionId)
  annotationsUrl.searchParams.set("token", options.token)
  const historyUrl = new URL("/api/history", options.bridgeUrl)
  historyUrl.searchParams.set("sessionId", options.session.sessionId)
  historyUrl.searchParams.set("token", options.token)
  const patchPreviewUrl = new URL("/api/preview", options.bridgeUrl)
  patchPreviewUrl.searchParams.set("sessionId", options.session.sessionId)
  patchPreviewUrl.searchParams.set("token", options.token)
  const editorExportUrl = new URL("/api/editor-export", options.bridgeUrl)
  editorExportUrl.searchParams.set("sessionId", options.session.sessionId)
  editorExportUrl.searchParams.set("token", options.token)
  const config = safeScriptJson({
    file: path.relative(options.session.workspace, options.session.file).split(path.sep).join("/"),
    drawioUrl: options.editorUrl.toString(),
    drawioOrigin: options.editorUrl.origin,
    apiUrl: apiUrl.toString(),
    eventsUrl: eventsUrl.toString(),
    annotationsUrl: annotationsUrl.toString(),
    historyUrl: historyUrl.toString(),
    patchPreviewUrl: patchPreviewUrl.toString(),
    editorExportUrl: editorExportUrl.toString(),
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
    #patch-preview-bar { --preview-accent: #d97706; --preview-ink: #172033; --preview-muted: #64748b;
      position: fixed; z-index: 11; top: 12px; left: 50%; transform: translateX(-50%);
      box-sizing: border-box; width: min(920px, calc(100vw - 24px)); display: none;
      grid-template-columns: minmax(220px, 1fr) auto;
      grid-template-areas: "overview actions" "meta meta"; align-items: center; gap: 9px 18px;
      padding: 11px 14px 10px; border: 1px solid rgba(148,163,184,.54);
      border-top: 3px solid var(--preview-accent); border-radius: 14px;
      background: rgba(255,255,255,.96); color: var(--preview-ink);
      box-shadow: 0 16px 40px rgba(15,23,42,.16), 0 2px 8px rgba(15,23,42,.08);
      backdrop-filter: blur(16px); font-family: "Segoe UI Variable", "Microsoft YaHei UI", sans-serif; }
    #patch-preview-bar.visible { display: grid; }
    #patch-preview-bar .preview-overview { grid-area: overview; min-width: 0; display: flex;
      align-items: center; gap: 10px; }
    #patch-preview-bar .preview-eyebrow { flex: none; padding: 5px 7px; border-radius: 6px;
      background: #fff7ed; color: #9a3412; font-size: 10px; font-weight: 750;
      letter-spacing: .08em; line-height: 1; white-space: nowrap; }
    #patch-preview-summary { min-width: 0; overflow: hidden; color: var(--preview-ink);
      font-size: 13px; font-weight: 700; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
    #patch-preview-bar .preview-actions { grid-area: actions; display: flex; align-items: center;
      justify-content: flex-end; gap: 8px; white-space: nowrap; }
    #patch-preview-bar .segmented { display: inline-flex; flex: none; gap: 2px; padding: 3px;
      border: 1px solid #dbe2ea; border-radius: 10px; background: #f1f5f9; }
    #patch-preview-bar button { min-height: 32px; box-sizing: border-box; border: 1px solid transparent;
      border-radius: 8px; background: transparent; color: #475569; padding: 5px 10px;
      cursor: pointer; font: inherit; font-weight: 650; line-height: 1.2; white-space: nowrap;
      transition: background-color .15s ease, border-color .15s ease, color .15s ease; }
    #patch-preview-bar button:hover { background: #f8fafc; color: #0f172a; }
    #patch-preview-bar button:focus-visible { outline: 3px solid rgba(37,99,235,.28); outline-offset: 2px; }
    #patch-preview-bar .segmented button { min-width: 60px; }
    #patch-preview-bar .segmented button.active { border-color: #cbd5e1; background: #fff;
      color: #9a3412; box-shadow: 0 1px 3px rgba(15,23,42,.11); }
    #patch-preview-details-toggle { display: inline-flex; align-items: center; gap: 6px;
      border-color: #dbe2ea !important; background: #fff !important; color: #334155 !important; }
    #patch-preview-details-count { min-width: 19px; height: 18px; padding: 0 5px; box-sizing: border-box;
      display: inline-flex; align-items: center; justify-content: center; border-radius: 999px;
      background: #e2e8f0; color: #475569; font-size: 10px; font-weight: 750; }
    #patch-preview-bar button.danger { border-color: #fecaca; background: #fff; color: #b91c1c; }
    #patch-preview-bar button.danger:hover { border-color: #fca5a5; background: #fef2f2; color: #991b1b; }
    #patch-preview-bar button:disabled { opacity: .48; cursor: not-allowed; }
    #patch-preview-bar .preview-meta { grid-area: meta; min-width: 0; display: flex;
      align-items: center; gap: 14px; padding-top: 8px; border-top: 1px solid #e8edf3; }
    #patch-preview-guidance { min-width: 0; display: flex; align-items: center; gap: 7px;
      overflow: hidden; color: var(--preview-muted); font-size: 11px; text-overflow: ellipsis;
      white-space: nowrap; }
    #patch-preview-guidance::before { content: ""; flex: none; width: 7px; height: 7px;
      border-radius: 50%; background: #f59e0b; box-shadow: 0 0 0 3px #ffedd5; }
    #patch-preview-bar .legend { margin-left: auto; display: flex; flex-wrap: wrap;
      align-items: center; gap: 5px 11px; color: #475569; font-size: 11px; }
    #patch-preview-bar .legend span { display: inline-flex; align-items: center; white-space: nowrap; }
    #patch-preview-bar .swatch { display: inline-block; width: 8px; height: 8px; margin-right: 5px;
      border-radius: 50%; box-shadow: 0 0 0 1px rgba(15,23,42,.08); }
    #patch-preview-details { position: absolute; z-index: 10; display: none; top: calc(100% + 8px); right: 0;
      width: min(410px, calc(100vw - 24px)); max-height: min(58vh, 520px); overflow: hidden;
      border: 1px solid #dbe2ea; border-radius: 12px; background: rgba(255,255,255,.98);
      color: #334155; box-shadow: 0 18px 42px rgba(15,23,42,.18), 0 2px 8px rgba(15,23,42,.08);
      font-size: 12px; }
    #patch-preview-details.visible { display: block; }
    #patch-preview-details .details-head { position: sticky; top: 0; display: flex; align-items: center;
      gap: 8px; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; background: inherit; }
    #patch-preview-details .details-head strong { flex: 1; }
    #patch-preview-details .details-head button { width: 30px; height: 30px; border: 0;
      border-radius: 6px; background: transparent; color: #64748b; cursor: pointer; font-size: 18px; }
    #patch-preview-details .details-head button:hover { background: #f1f5f9; color: #0f172a; }
    #patch-preview-details-body { max-height: min(calc(58vh - 52px), 468px); overflow: auto;
      padding: 3px 12px 11px; scrollbar-gutter: stable; }
    #patch-preview-details .change { padding: 7px 0; border-bottom: 1px solid #e2e8f0; }
    #patch-preview-details .change:last-child { border-bottom: 0; }
    #patch-preview-details .property { display: grid; grid-template-columns: 94px 1fr 18px 1fr;
      align-items: center; gap: 5px; margin-top: 4px; }
    #patch-preview-details .value { overflow-wrap: anywhere; color: #475569; }
    #patch-preview-details .color { width: 14px; height: 14px; border: 1px solid #94a3b8; border-radius: 3px; }
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
    #conflict-modal { position: fixed; z-index: 12; inset: 0; display: none; align-items: center;
      justify-content: center; padding: 24px; background: rgba(15, 23, 42, .58); backdrop-filter: blur(2px); }
    #conflict-modal.open { display: flex; }
    #conflict-modal .dialog { width: min(760px, 96vw); max-height: min(720px, 90vh); display: flex;
      flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 18px;
      background: #fff; color: #0f172a; box-shadow: 0 24px 70px rgba(15,23,42,.32); }
    #conflict-modal header { display: flex; gap: 12px; padding: 20px 22px 16px; border-bottom: 1px solid #e2e8f0; }
    #conflict-modal .conflict-icon { width: 38px; height: 38px; flex: 0 0 38px; display: grid;
      place-items: center; border-radius: 11px; background: #fff7ed; color: #c2410c; font-size: 21px; }
    #conflict-modal h2 { margin: 0 0 5px; font-size: 18px; }
    #conflict-modal .subtitle { margin: 0; color: #64748b; line-height: 1.55; }
    #conflict-details { overflow-y: auto; padding: 16px 22px; }
    .conflict-card { margin-bottom: 12px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 12px; }
    .conflict-card:last-child { margin-bottom: 0; }
    .conflict-card-title { display: flex; align-items: center; gap: 8px; padding: 10px 12px;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .conflict-card-title strong { font-size: 13px; }
    .conflict-card-title code { color: #64748b; font-size: 11px; }
    .conflict-columns { display: grid; grid-template-columns: 1fr 1fr; }
    .conflict-version { min-width: 0; padding: 12px; }
    .conflict-version + .conflict-version { border-left: 1px solid #e2e8f0; }
    .conflict-version.user { background: #eff6ff; }
    .conflict-version.agent { background: #fff7ed; }
    .conflict-version .version-title { margin-bottom: 8px; font-size: 12px; font-weight: 700; }
    .conflict-version.user .version-title { color: #1d4ed8; }
    .conflict-version.agent .version-title { color: #c2410c; }
    .conflict-field { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 7px;
      margin-top: 6px; line-height: 1.45; }
    .conflict-field .field-name { color: #64748b; }
    .conflict-field .field-value { overflow-wrap: anywhere; white-space: pre-wrap; }
    #conflict-modal footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px;
      padding: 14px 22px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
    #conflict-modal footer .danger-note { margin-right: auto; color: #64748b; font-size: 12px; }
    #conflict-modal footer button { padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 8px;
      background: #fff; color: #334155; cursor: pointer; font-weight: 600; }
    #conflict-modal footer .primary { border-color: #2563eb; background: #2563eb; color: #fff; }
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
    #ann-filters { display: flex; align-items: center; gap: 8px; padding: 9px 14px;
      border-bottom: 1px solid #e2e8f0; }
    #ann-filters label { color: #64748b; font-size: 12px; }
    #ann-filter { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff;
      padding: 5px 8px; }
    #ann-list { flex: 1; overflow-y: auto; padding: 10px 14px; }
    #ann-list .item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;
      margin-bottom: 10px; background: #fafbfc; }
    #ann-list .item.resolved { opacity: .65; background: #f1f5f9; }
    #ann-list .item.ignored { opacity: .65; background: #f8fafc; }
    #ann-list .item .meta { display: flex; align-items: center; gap: 6px; font-size: 11px;
      color: #64748b; margin-bottom: 6px; }
    #ann-list .item .badge { padding: 1px 7px; border-radius: 999px; font-weight: 600; }
    #ann-list .item .badge.open { background: #dbeafe; color: #1d4ed8; }
    #ann-list .item .badge.stale { background: #fef3c7; color: #b45309; }
    #ann-list .item .badge.resolved { background: #dcfce7; color: #15803d; }
    #ann-list .item .badge.ignored { background: #e2e8f0; color: #475569; }
    #ann-list .item .instruction { color: #1f2937; white-space: pre-wrap; word-break: break-word; }
    #ann-list .item .cells { font-size: 11px; color: #64748b; margin-top: 6px; }
    #ann-list .item .item-actions { display: flex; gap: 6px; margin-top: 8px; }
    #ann-list .item .item-actions button { border: 1px solid #c8d0dc; border-radius: 6px;
      background: #fff; padding: 4px 10px; cursor: pointer; }
    #ann-list .item .item-actions button:hover { background: #f1f5f9; }
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
    @media (max-width: 760px) {
      #patch-preview-bar { top: 8px; width: calc(100vw - 16px); grid-template-columns: 1fr;
        grid-template-areas: "overview" "actions" "meta"; gap: 9px; padding: 10px 11px 9px; }
      #patch-preview-bar .preview-actions { justify-content: stretch; }
      #patch-preview-bar .segmented { flex: 1 1 auto; min-width: 0; }
      #patch-preview-bar .segmented button { flex: 1 1 0; min-width: 0; }
      #patch-preview-bar .preview-meta { align-items: flex-start; flex-wrap: wrap; gap: 7px 12px; }
      #patch-preview-guidance { flex-basis: 100%; }
      #patch-preview-bar .legend { margin-left: 0; }
      #patch-preview-details { width: min(390px, 100%); }
    }
    @media (max-width: 440px) {
      #patch-preview-bar .preview-actions { display: grid; grid-template-columns: 1fr auto; }
      #patch-preview-bar .segmented { grid-column: 1 / -1; }
      #patch-preview-details-toggle { justify-content: center; }
      #patch-preview-summary { font-size: 12px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #patch-preview-bar button { transition: none; }
    }
    @media (prefers-color-scheme: dark) {
      body { background: #0f172a; }
      #patch-preview-bar { --preview-ink: #f8fafc; --preview-muted: #94a3b8;
        border-color: #334155; border-top-color: #f59e0b; background: rgba(15,23,42,.96); }
      #patch-preview-bar .preview-eyebrow { background: #431407; color: #fed7aa; }
      #patch-preview-bar .segmented { border-color: #334155; background: #111827; }
      #patch-preview-bar button { color: #cbd5e1; }
      #patch-preview-bar button:hover { background: #243049; color: #f8fafc; }
      #patch-preview-bar .segmented button.active { border-color: #475569; background: #334155; color: #fed7aa; }
      #patch-preview-details-toggle { border-color: #475569 !important; background: #1e293b !important;
        color: #e2e8f0 !important; }
      #patch-preview-details-count { background: #334155; color: #cbd5e1; }
      #patch-preview-bar button.danger { border-color: #7f1d1d; background: #1f1518; color: #fca5a5; }
      #patch-preview-bar button.danger:hover { border-color: #b91c1c; background: #450a0a; color: #fecaca; }
      #patch-preview-bar .preview-meta { border-color: #334155; }
      #patch-preview-guidance::before { box-shadow: 0 0 0 3px #431407; }
      #patch-preview-bar .legend { color: #cbd5e1; }
      #patch-preview-details { border-color: #334155; background: rgba(15,23,42,.98); color: #e2e8f0; }
      #patch-preview-details .details-head, #patch-preview-details .change { border-color: #334155; }
      #patch-preview-details .details-head button { color: #94a3b8; }
      #patch-preview-details .details-head button:hover { background: #243049; color: #f8fafc; }
      #patch-preview-details .value { color: #cbd5e1; }
      #history-btn, #ann-btn, #ann-drawer { background: #1e293b; color: #e2e8f0; border-color: #334155; }
      #history-btn:hover, #ann-btn:hover, #ann-drawer header button { background: #243049; }
      #ann-filters { background: #172033; border-color: #334155; }
      #ann-filter { background: #0f172a; color: #e2e8f0; border-color: #334155; }
      #ann-list .item { background: #243049; border-color: #334155; }
      #ann-list .item .item-actions button { background: #243049; color: #e2e8f0; border-color: #334155; }
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
      #conflict-modal .dialog { background: #111827; color: #f8fafc; border-color: #334155; }
      #conflict-modal header, #conflict-modal footer, .conflict-card,
      .conflict-card-title, .conflict-version + .conflict-version { border-color: #334155; }
      #conflict-modal .subtitle, #conflict-modal footer .danger-note,
      .conflict-field .field-name, .conflict-card-title code { color: #94a3b8; }
      #conflict-modal footer, .conflict-card-title { background: #1e293b; }
      .conflict-version.user { background: #172554; }
      .conflict-version.agent { background: #431407; }
      #conflict-modal footer button { background: #1e293b; color: #e2e8f0; border-color: #475569; }
      #conflict-modal footer .primary { background: #2563eb; border-color: #2563eb; color: #fff; }
    }
  </style>
</head>
<body>
  <iframe id="editor" title="Draw.io editor"></iframe>
  <div id="status" role="status"></div>
  <div id="patch-preview-bar" role="region" aria-label="Agent 修改预览">
    <div class="preview-overview">
      <span class="preview-eyebrow">AGENT 预览</span>
      <strong id="patch-preview-summary">正在准备修改摘要</strong>
    </div>
    <div class="preview-actions">
      <div class="segmented" role="group" aria-label="预览显示方式">
        <button type="button" id="patch-preview-before" aria-pressed="false">修改前</button>
        <button type="button" id="patch-preview-after" aria-pressed="false">修改后</button>
        <button type="button" id="patch-preview-compare" class="active" aria-pressed="true">对比</button>
      </div>
      <button type="button" id="patch-preview-details-toggle" aria-expanded="true"
        aria-controls="patch-preview-details">变化详情 <span id="patch-preview-details-count">0</span></button>
      <button type="button" id="patch-preview-cancel" class="danger">取消修改</button>
    </div>
    <div class="preview-meta">
      <span id="patch-preview-guidance" role="status">只读预览，不会写入源文件</span>
      <span class="legend" aria-label="对比颜色说明">
        <span><i class="swatch" style="background:#22c55e"></i>新增</span>
        <span><i class="swatch" style="background:#f59e0b"></i>修改</span>
        <span><i class="swatch" style="background:#ef4444"></i>删除/原位置</span>
        <span><i class="swatch" style="background:#3b82f6"></i>连线</span>
      </span>
    </div>
    <aside id="patch-preview-details" aria-live="polite" aria-label="修改变化详情">
      <div class="details-head">
        <strong>变化详情</strong>
        <button type="button" id="patch-preview-details-close" aria-label="关闭变化详情">×</button>
      </div>
      <div id="patch-preview-details-body"></div>
    </aside>
  </div>
  <div id="conflict-banner" role="alert">
    <span id="conflict-message">图表刚发生变化，当前画布暂未保存，请确认最新版本。</span>
    <button type="button" id="conflict-retry" style="display:none">重试加载</button>
    <button type="button" id="conflict-overwrite" style="display:none">保留我的版本并覆盖</button>
    <button type="button" id="conflict-reload">重新加载最新版本</button>
  </div>
  <div id="conflict-modal" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
    <div class="dialog">
      <header>
        <div class="conflict-icon" aria-hidden="true">!</div>
        <div>
          <h2 id="conflict-title">发现版本冲突</h2>
          <p class="subtitle" id="conflict-subtitle">AI 和你修改了同一处内容。画布仍保留你的版本，请选择如何处理。</p>
        </div>
      </header>
      <div id="conflict-details"></div>
      <footer>
        <span class="danger-note">覆盖操作会丢弃 AI 在冲突位置的修改。</span>
        <button type="button" id="conflict-modal-reload">使用 AI 版本</button>
        <button type="button" class="primary" id="conflict-modal-overwrite">保留我的版本并覆盖</button>
      </footer>
    </div>
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
    <div id="ann-filters">
      <label for="ann-filter">状态</label>
      <select id="ann-filter">
        <option value="pending">待处理</option>
        <option value="fresh">未完成</option>
        <option value="stale">已过时</option>
        <option value="resolved">已完成</option>
        <option value="ignored">已忽略</option>
        <option value="all">全部</option>
      </select>
    </div>
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
        <label><input type="radio" name="ann-scope" value="diagram_wide">
          <span>允许修改整个图表<small>可调整当前图表全部页面中的节点、连线和布局，不包括其它文件。</small></span></label>
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
      let canvasRevision = 0;
      let lastEditorXml = null;
      let saveChain = Promise.resolve();
      let externalTimer = null;
      let editorReady = false;
      let pendingExport = null; // file export requested via SSE editor-command
      let exportWorker = null;
      let exportWorkerReady = false;
      let exportWorkerLoaded = false;
      let pendingSelection = null;
      let awaitingSelection = false;
      let editorMode = "editing"; // editing | preview-loading | previewing | preview-exiting | restoring | loading-restored-xml | conflict
      let historyOpen = false;
      let selectedSnapshot = null;
      let confirmSnapshot = null;
      let restoreTargetXml = null;
      let preRestoreXml = null;
      let pendingRestore = null; // { xml } kept so a load timeout can retry the same target
      let pendingConflict = null; // { xml, latest, merge } kept until the user chooses
      let restoreLoadTimer = null;
      let activePatchPreview = null;
      let previewTargetXml = null;
      let previewExitXml = null;
      let patchPreviewView = "compare";
      let patchPreviewDetailsExpanded = true;

      const historyBtn = document.getElementById("history-btn");
      const annBtn = document.getElementById("ann-btn");
      const annCount = document.getElementById("ann-count");
      const annDrawer = document.getElementById("ann-drawer");
      const annFilter = document.getElementById("ann-filter");
      const annList = document.getElementById("ann-list");
      const annForm = document.getElementById("ann-form");
      const annSelection = document.getElementById("ann-selection");
      const annInstruction = document.getElementById("ann-instruction");
      const annSubmit = document.getElementById("ann-submit");
      const conflictBanner = document.getElementById("conflict-banner");
      const conflictModal = document.getElementById("conflict-modal");
      const conflictDetails = document.getElementById("conflict-details");
      const histModal = document.getElementById("history-modal");
      const histList = document.getElementById("hist-list");
      const histPreview = document.getElementById("hist-preview");
      const histPage = document.getElementById("hist-page");
      const histRestore = document.getElementById("hist-restore");
      const histNote = document.getElementById("hist-note");
      const histConfirm = document.getElementById("history-confirm");
      const restoreOverlay = document.getElementById("restore-overlay");
      const patchPreviewBar = document.getElementById("patch-preview-bar");
      const patchPreviewSummary = document.getElementById("patch-preview-summary");
      const patchPreviewGuidance = document.getElementById("patch-preview-guidance");
      const patchPreviewBefore = document.getElementById("patch-preview-before");
      const patchPreviewAfter = document.getElementById("patch-preview-after");
      const patchPreviewCompare = document.getElementById("patch-preview-compare");
      const patchPreviewDetailsToggle = document.getElementById("patch-preview-details-toggle");
      const patchPreviewDetailsCount = document.getElementById("patch-preview-details-count");
      const patchPreviewDetails = document.getElementById("patch-preview-details");
      const patchPreviewDetailsBody = document.getElementById("patch-preview-details-body");

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

      function sendExportWorker(payload) {
        exportWorker?.contentWindow?.postMessage(JSON.stringify(payload), CONFIG.drawioOrigin);
      }

      function clearExportWorker() {
        exportWorkerReady = false;
        exportWorkerLoaded = false;
        if (exportWorker) exportWorker.remove();
        exportWorker = null;
      }

      function startExportWorker(active) {
        clearExportWorker();
        const workerUrl = new URL(CONFIG.drawioUrl);
        if (active.pageId) workerUrl.searchParams.set("page-id", active.pageId);
        workerUrl.searchParams.set("export-worker", active.requestId);
        exportWorker = document.createElement("iframe");
        exportWorker.setAttribute("aria-hidden", "true");
        exportWorker.style.position = "fixed";
        exportWorker.style.left = "-10000px";
        exportWorker.style.top = "0";
        exportWorker.style.width = "1200px";
        exportWorker.style.height = "800px";
        exportWorker.style.opacity = "0";
        exportWorker.style.pointerEvents = "none";
        exportWorker.src = workerUrl.toString();
        document.body.appendChild(exportWorker);
      }

      function dispatchExport() {
        if (!pendingExport) return;
        const active = pendingExport;
        if (active.useWorker && (!exportWorkerReady || !exportWorkerLoaded)) return;
        if (!active.useWorker && !editorReady) return;
        const payload = {
          action: "export",
          format: active.format,
          currentPage: !active.allPages,
          allPages: active.allPages,
          message: { requestId: active.requestId },
        };
        if (active.useWorker) sendExportWorker(payload);
        else sendEditor(payload);
      }

      async function reportEditorExportError(requestId, message) {
        try {
          await fetch(CONFIG.editorExportUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ requestId, error: String(message || "export failed") }),
          });
        } catch { /* 上报失败时仅保留页面提示 */ }
      }

      async function saveExport(message) {
        const active = pendingExport;
        pendingExport = null;
        clearExportWorker();
        try {
          if (typeof message.data !== "string" || !message.data) {
            throw new Error("Draw.io 未返回导出数据");
          }
          const response = await fetch(CONFIG.editorExportUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              requestId: active.requestId,
              format: active.format,
              data: message.data,
            }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.ok) throw new Error(result.error || "导出结果保存失败");
          showStatus("已导出 " + result.outputPath + "（" + result.bytes + " 字节）", 6000);
        } catch (error) {
          showStatus(error.message || "导出失败", 6000);
          void reportEditorExportError(active.requestId, error.message);
        }
      }

      function requestEditorExport(command) {
        if (editorMode === "preview-loading" || editorMode === "previewing" || editorMode === "preview-exiting") {
          showStatus("只读修改预览期间不能从当前画布导出", 4000);
          void reportEditorExportError(command.requestId, "patch preview is active");
          return;
        }
        if (pendingExport) {
          showStatus("已有一次导出正在进行，请稍候", 3000);
          void reportEditorExportError(command.requestId, "another export is already running on this page");
          return;
        }
        const useWorker = typeof command.xml === "string" && command.xml.length > 0
          && (Boolean(command.pageId) || command.allPages === true);
        pendingExport = {
          format: command.format,
          requestId: command.requestId,
          pageId: typeof command.pageId === "string" ? command.pageId : null,
          allPages: command.allPages === true,
          xml: useWorker ? command.xml : null,
          useWorker,
        };
        showStatus((editorReady ? "正在导出 " : "等待编辑器就绪后导出 ") + command.format + "…", 10000);
        if (useWorker) startExportWorker(pendingExport);
        dispatchExport();
      }

      async function readLatest() {
        const response = await fetch(CONFIG.apiUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("读取图表失败（HTTP " + response.status + "）");
        return response.json();
      }

      async function readPatchPreview() {
        const response = await fetch(CONFIG.patchPreviewUrl, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "读取修改预览失败");
        return result.preview || null;
      }

      function patchPreviewVisible(preview) {
        return preview && (preview.status === "pending" || preview.status === "authorized")
          && typeof preview.xml === "string";
      }

      function setPatchPreviewControlsDisabled(disabled) {
        historyBtn.disabled = disabled;
        annBtn.disabled = disabled;
      }

      function patchPreviewValue(value) {
        return value === null || value === undefined || value === "" ? "（未设置）" : String(value);
      }

      function appendPatchPreviewProperty(container, property, before, after) {
        const row = document.createElement("div");
        row.className = "property";
        const name = document.createElement("strong");
        name.textContent = property;
        const beforeValue = document.createElement("span");
        beforeValue.className = "value";
        beforeValue.textContent = patchPreviewValue(before);
        const arrow = document.createElement("span");
        arrow.textContent = "→";
        const afterValue = document.createElement("span");
        afterValue.className = "value";
        afterValue.textContent = patchPreviewValue(after);
        row.append(name, beforeValue, arrow, afterValue);
        if (/color|background/i.test(property)) {
          for (const [value, target] of [[before, beforeValue], [after, afterValue]]) {
            if (!value) continue;
            const swatch = document.createElement("i");
            swatch.className = "color";
            swatch.style.backgroundColor = String(value);
            target.prepend(swatch, " ");
          }
        }
        container.appendChild(row);
      }

      function renderPatchPreviewDetails(preview) {
        patchPreviewDetailsBody.replaceChildren();
        const diff = preview?.diff || {};
        for (const [kind, entries] of [["新增", diff.added || []], ["删除", diff.removed || []]]) {
          for (const change of entries) {
            const section = document.createElement("div");
            section.className = "change";
            const title = document.createElement("strong");
            title.textContent = kind + (change.cell?.edge ? "连线 " : "图元 ")
              + (change.cell?.id || change.key || "");
            section.appendChild(title);
            patchPreviewDetailsBody.appendChild(section);
          }
        }
        for (const change of diff.changed || []) {
          const section = document.createElement("div");
          section.className = "change";
          const title = document.createElement("strong");
          title.textContent = (change.kind === "edge" ? "连线 " : "图元 ")
            + (change.cellId || change.key || "");
          section.appendChild(title);
          if (change.labelChange) {
            appendPatchPreviewProperty(section, "label", change.labelChange.before, change.labelChange.after);
          }
          for (const style of change.styleChanges || []) {
            appendPatchPreviewProperty(section, style.property, style.before, style.after);
          }
          for (const geometry of change.geometryChanges || []) {
            appendPatchPreviewProperty(section, geometry.property, geometry.before, geometry.after);
          }
          patchPreviewDetailsBody.appendChild(section);
        }
        for (const change of diff.pageChanges || []) {
          const section = document.createElement("div");
          section.className = "change";
          const title = document.createElement("strong");
          title.textContent = "页面 " + (change.pageName || change.pageId);
          section.appendChild(title);
          appendPatchPreviewProperty(section, change.property, change.before, change.after);
          patchPreviewDetailsBody.appendChild(section);
        }
        const count = patchPreviewDetailsBody.childElementCount;
        patchPreviewDetailsCount.textContent = String(count);
        patchPreviewDetailsToggle.disabled = count === 0;
        setPatchPreviewDetailsExpanded(count > 0 && patchPreviewDetailsExpanded);
      }

      function setPatchPreviewDetailsExpanded(expanded) {
        patchPreviewDetailsExpanded = expanded;
        patchPreviewDetails.classList.toggle("visible", expanded);
        patchPreviewDetailsToggle.setAttribute("aria-expanded", String(expanded));
      }

      function updatePatchPreviewViewButtons(view) {
        patchPreviewBefore.classList.toggle("active", view === "before");
        patchPreviewAfter.classList.toggle("active", view === "after");
        patchPreviewCompare.classList.toggle("active", view === "compare");
        patchPreviewBefore.setAttribute("aria-pressed", String(view === "before"));
        patchPreviewAfter.setAttribute("aria-pressed", String(view === "after"));
        patchPreviewCompare.setAttribute("aria-pressed", String(view === "compare"));
      }

      function setPatchPreviewView(view) {
        if (!activePatchPreview || !editorReady) return;
        const xml = view === "before"
          ? activePatchPreview.beforePreviewXml
          : view === "after"
            ? activePatchPreview.candidateXml || activePatchPreview.afterPreviewXml
            : activePatchPreview.comparePreviewXml || activePatchPreview.xml;
        if (typeof xml !== "string" || !xml) return;
        patchPreviewView = view;
        previewTargetXml = xml;
        editorMode = "preview-loading";
        updatePatchPreviewViewButtons(view);
        sendEditor({ action: "load", xml, autosave: 0, diffSync: false,
          title: CONFIG.file + ({ before: " · 修改前", after: " · 修改后", compare: " · 修改对比" }[view]) });
      }

      async function showPatchPreview(preview) {
        if (!patchPreviewVisible(preview) || !editorReady) return;
        if (activePatchPreview?.id === preview.id
          && (editorMode === "preview-loading" || editorMode === "previewing")) {
          activePatchPreview = preview;
          patchPreviewGuidance.textContent = preview.status === "authorized"
            ? "已批准，正在提交精确候选"
            : "请核对画布后在 OpenCode question 弹窗中确认、取消或填写修改意见";
          return;
        }
        await saveChain;
        if (editorMode !== "editing") {
          showStatus("修改预览已就绪；请先完成当前恢复或冲突处理", 5000);
          return;
        }
        const latest = await readLatest();
        if (latest.revision !== preview.baseRevision) {
          showStatus("修改预览基线已变化，等待 Agent 重新生成", 4200);
          return;
        }
        if (lastEditorXml && current?.xml && !historyXmlEquals(lastEditorXml, current.xml)) {
          showStatus("检测到尚未同步的人工编辑，暂不覆盖当前画布", 5000);
          return;
        }
        current = latest;
        canvasRevision = latest.revision;
        activePatchPreview = preview;
        patchPreviewView = "compare";
        patchPreviewDetailsExpanded = true;
        previewTargetXml = preview.comparePreviewXml || preview.xml;
        previewExitXml = null;
        editorMode = "preview-loading";
        updatePatchPreviewViewButtons("compare");
        renderPatchPreviewDetails(preview);
        closeDrawer();
        closeHistory();
        setPatchPreviewControlsDisabled(true);
        const totalChanges = patchPreviewDetailsBody.childElementCount;
        patchPreviewSummary.textContent = totalChanges + " 项变化 · 基于版本 " + preview.baseRevision;
        patchPreviewGuidance.textContent = preview.status === "authorized"
          ? "已批准，正在提交精确候选"
          : "请核对画布后在 OpenCode question 弹窗中确认、取消或填写修改意见";
        patchPreviewBar.classList.add("visible");
        sendEditor({ action: "load", xml: previewTargetXml, autosave: 0, diffSync: false,
          title: CONFIG.file + " · Agent 修改对比" });
      }

      async function leavePatchPreview(reloadLatest = true) {
        if (!reloadLatest) {
          activePatchPreview = null;
          previewTargetXml = null;
          previewExitXml = null;
          editorMode = "editing";
          patchPreviewBar.classList.remove("visible");
          patchPreviewDetails.classList.remove("visible");
          patchPreviewDetailsToggle.setAttribute("aria-expanded", "false");
          setPatchPreviewControlsDisabled(false);
          return;
        }
        const latest = await readLatest();
        current = latest;
        canvasRevision = latest.revision;
        previewTargetXml = null;
        previewExitXml = latest.xml;
        editorMode = "preview-exiting";
        sendEditor({ action: "load", xml: latest.xml, autosave: 1, diffSync: true, title: CONFIG.file });
      }

      function confirmPatchPreviewLoad(xml) {
        if (editorMode === "preview-loading" && previewTargetXml
          && historyXmlEquals(xml, previewTargetXml)) {
          previewTargetXml = null;
          editorMode = "previewing";
          showStatus("已加载只读修改预览", 1800);
          return true;
        }
        if (editorMode === "preview-exiting" && previewExitXml
          && historyXmlEquals(xml, previewExitXml)) {
          lastEditorXml = previewExitXml;
          previewExitXml = null;
          activePatchPreview = null;
          editorMode = "editing";
          patchPreviewBar.classList.remove("visible");
          patchPreviewDetails.classList.remove("visible");
          patchPreviewDetailsToggle.setAttribute("aria-expanded", "false");
          setPatchPreviewControlsDisabled(false);
          showStatus("已返回正式图表", 1800);
          return true;
        }
        return false;
      }

      async function refreshPatchPreview() {
        const preview = await readPatchPreview();
        if (patchPreviewVisible(preview)) {
          await showPatchPreview(preview);
          return;
        }
        if (editorMode === "preview-loading" || editorMode === "previewing") {
          await leavePatchPreview(true);
        }
        if (preview?.statusReason) showStatus(preview.statusReason, 4200);
      }

      async function cancelVisiblePatchPreview() {
        if (!activePatchPreview) return;
        const cancelUrl = new URL(CONFIG.patchPreviewUrl);
        cancelUrl.pathname = cancelUrl.pathname.endsWith("/")
          ? cancelUrl.pathname + encodeURIComponent(activePatchPreview.id)
          : cancelUrl.pathname + "/" + encodeURIComponent(activePatchPreview.id);
        const response = await fetch(cancelUrl.toString(), { method: "DELETE" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "取消预览失败");
        await leavePatchPreview(true);
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
          error.merge = result.merge;
          error.localXml = xml;
          error.baseRevision = baseRevision;
          throw error;
        }
        if (!response.ok) throw new Error(result.error || "保存图表失败");
        return result;
      }

      function queueSave(xml) {
        saveChain = saveChain.then(async () => {
          if (editorMode === "preview-loading" || editorMode === "previewing" || editorMode === "preview-exiting") return;
          if (editorMode === "restoring" || editorMode === "loading-restored-xml") return;
          if (editorMode === "conflict") {
            if (pendingConflict && typeof xml === "string") pendingConflict.xml = xml;
            return;
          }
          if (typeof xml !== "string" || xml === current?.xml) return;
          const submittedXml = xml;
          const submittedRevision = canvasRevision;
          const result = await writeState(submittedXml, submittedRevision);
          const editorAdvanced = lastEditorXml !== submittedXml;
          current = result;
          if (result.autoMerge?.status === "merged") {
            showConflictBanner(
              "已自动合并不重叠修改并保存 revision " + result.revision
                + "。为保护可能仍在输入的内容，当前画布没有自动刷新；可在编辑完成后加载合并版本。",
              false,
              false,
            );
            showStatus("已自动合并；为保护正在输入的内容，画布未刷新", 5000);
          } else {
            if (!editorAdvanced) canvasRevision = result.revision;
            showStatus("已保存 revision " + result.revision, 1000);
            conflictBanner.classList.remove("visible");
          }
        }).catch(error => {
          if (error && error.status === 409) {
            enterConflict(error.current, error.localXml, error.merge, undefined, false, error.baseRevision);
          } else {
            showStatus(error.message || "保存失败", 5000);
          }
        });
      }

      function showConflictBanner(message, showRetry, showOverwrite) {
        document.getElementById("conflict-message").textContent = message;
        document.getElementById("conflict-retry").style.display = showRetry ? "" : "none";
        document.getElementById("conflict-overwrite").style.display = showOverwrite ? "" : "none";
        conflictBanner.classList.add("visible");
      }

      function conflictFieldLabel(field) {
        const leaf = String(field).split(".").at(-1);
        return ({
          existence: "状态",
          "@_value": "文字",
          "@_style": "样式",
          "@_parent": "父级",
          "@_source": "连线起点",
          "@_target": "连线终点",
          "@_x": "横坐标",
          "@_y": "纵坐标",
          "@_width": "宽度",
          "@_height": "高度",
          mxPoint: "折点",
        })[leaf] || field;
      }

      function conflictFieldValue(entry) {
        if (!entry?.exists) return "已删除 / 不存在";
        if (entry.value === "") return "（空）";
        if (entry.value === null) return "null";
        if (typeof entry.value === "object") return JSON.stringify(entry.value, null, 2);
        return String(entry.value);
      }

      function appendConflictVersion(container, title, className, fields, side) {
        const version = document.createElement("section");
        version.className = "conflict-version " + className;
        const heading = document.createElement("div");
        heading.className = "version-title";
        heading.textContent = title;
        version.appendChild(heading);
        for (const field of fields) {
          const row = document.createElement("div");
          row.className = "conflict-field";
          const name = document.createElement("span");
          name.className = "field-name";
          name.textContent = conflictFieldLabel(field.path);
          const value = document.createElement("span");
          value.className = "field-value";
          value.textContent = conflictFieldValue(field[side]);
          row.append(name, value);
          version.appendChild(row);
        }
        container.appendChild(version);
      }

      function showConflictModal(merge) {
        conflictDetails.replaceChildren();
        const details = merge?.status === "conflict" && Array.isArray(merge.details)
          ? merge.details
          : [];
        document.getElementById("conflict-title").textContent = details.length
          ? "发现 " + details.length + " 处版本冲突"
          : "无法自动合并这次修改";
        document.getElementById("conflict-subtitle").textContent = details.length
          ? "AI 和你修改了同一图元。下方只展示发生冲突的字段，当前画布仍保留你的版本。"
          : "当前修改涉及页面结构或缺少合并基线，系统没有覆盖任何一方。";
        if (!details.length) {
          const empty = document.createElement("div");
          empty.className = "conflict-card";
          const title = document.createElement("div");
          title.className = "conflict-card-title";
          title.textContent = merge?.reason || "请在保留当前画布和加载 AI 最新版本之间选择。";
          empty.appendChild(title);
          conflictDetails.appendChild(empty);
        }
        for (const detail of details) {
          const card = document.createElement("article");
          card.className = "conflict-card";
          const title = document.createElement("div");
          title.className = "conflict-card-title";
          const strong = document.createElement("strong");
          strong.textContent = (detail.pageName || detail.pageId) + " · "
            + (detail.user?.label || detail.agent?.label || "未命名图元");
          const code = document.createElement("code");
          code.textContent = detail.key;
          title.append(strong, code);
          const columns = document.createElement("div");
          columns.className = "conflict-columns";
          const fields = detail.fields?.length ? detail.fields : [{
            path: "existence",
            user: { exists: detail.user?.exists, value: detail.user },
            agent: { exists: detail.agent?.exists, value: detail.agent },
          }];
          appendConflictVersion(columns, "我的未保存版本", "user", fields, "user");
          appendConflictVersion(columns, "AI 已保存版本", "agent", fields, "agent");
          card.append(title, columns);
          conflictDetails.appendChild(card);
        }
        conflictBanner.classList.remove("visible");
        conflictModal.classList.add("open");
      }

      function enterConflict(latest, localXml, merge, message, showRetry, baseRevision) {
        editorMode = "conflict";
        pendingConflict = localXml && latest ? {
          xml: localXml,
          originalXml: localXml,
          baseRevision: Number.isInteger(baseRevision) ? baseRevision : canvasRevision,
          latest,
          merge,
        } : null;
        if (pendingConflict) {
          showConflictModal(merge);
          void refreshAnnotations();
          showStatus("保存冲突：画布仍保留你的未保存版本", 6000);
          return;
        }
        const overlap = merge?.status === "conflict" && merge.conflicts?.length
          ? "重叠图元：" + merge.conflicts.join("、") + "。"
          : "";
        showConflictBanner(
          message || ("检测到重叠修改，未覆盖服务端版本。" + overlap + "请选择保留哪一版。"),
          !!showRetry,
          !!pendingConflict,
        );
        void refreshAnnotations();
        if (latest) showStatus("保存冲突：图表刚发生变化，已保留你的本地画布（revision " + (current?.revision ?? 0) + "，最新 revision " + latest.revision + "）", 6000);
      }

      function setConflictResolutionBusy(busy) {
        document.getElementById("conflict-modal-reload").disabled = busy;
        document.getElementById("conflict-modal-overwrite").disabled = busy;
      }

      async function resolveConflict(choice) {
        setConflictResolutionBusy(true);
        try {
          await saveChain;
          const pending = pendingConflict;
          if (!pending) return;
          if (pending.xml !== pending.originalXml) {
            try {
              const refreshed = await writeState(pending.xml, pending.baseRevision);
              current = refreshed;
              canvasRevision = refreshed.revision;
              lastEditorXml = refreshed.xml;
              pendingConflict = null;
              editorMode = "editing";
              conflictModal.classList.remove("open");
              sendEditor({ action: "load", xml: refreshed.xml, autosave: 1, diffSync: true, title: CONFIG.file });
              showStatus("已合并保存冲突期间的最新编辑 · revision " + refreshed.revision, 3000);
              return;
            } catch (error) {
              if (error && error.status === 409) {
                enterConflict(
                  error.current,
                  error.localXml,
                  error.merge,
                  undefined,
                  false,
                  error.baseRevision,
                );
                return;
              }
              throw error;
            }
          }
          const candidate = choice === "user"
            ? pending.merge?.userResolutionXml || pending.xml
            : pending.merge?.agentResolutionXml || pending.latest.xml;
          const result = await writeState(candidate, pending.latest.revision);
          current = result;
          canvasRevision = result.revision;
          lastEditorXml = result.xml;
          pendingConflict = null;
          editorMode = "editing";
          conflictBanner.classList.remove("visible");
          conflictModal.classList.remove("open");
          sendEditor({ action: "load", xml: result.xml, autosave: 1, diffSync: true, title: CONFIG.file });
          showStatus(
            (choice === "user" ? "已保留你的冲突修改" : "已保留 AI 的冲突修改")
              + "，双方非冲突修改均已合并 · revision " + result.revision,
            4000,
          );
          void refreshAnnotations();
        } catch (error) {
          if (error && error.status === 409) {
            enterConflict(
              error.current,
              error.localXml,
              error.merge,
              undefined,
              false,
              error.baseRevision,
            );
          } else {
            showStatus(error.message || "保存图表失败", 5000);
          }
        } finally {
          setConflictResolutionBusy(false);
        }
      }

      async function reloadLatest() {
        await saveChain;
        try {
          const latest = await readLatest();
          current = latest;
          canvasRevision = latest.revision;
          lastEditorXml = latest.xml;
          editorMode = "editing";
          clearTimeout(restoreLoadTimer);
          restoreTargetXml = null;
          preRestoreXml = null;
          pendingRestore = null;
          pendingConflict = null;
          conflictBanner.classList.remove("visible");
          conflictModal.classList.remove("open");
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
        // Keep the user's canvas on its current base when Agent/external writes
        // arrive. A forced reload here can erase an in-progress label edit
        // before Draw.io emits its autosave. The next user save will perform the
        // conservative three-way merge or enter the explicit conflict flow.
        if (editorMode !== "editing") return;
        if (revision <= (current?.revision ?? 0)) return;
        showConflictBanner(
          "Agent 已保存新版本 revision " + revision + "。当前画布未被强制刷新；继续编辑并保存时会自动合并，重叠修改会提示冲突。",
          false,
          false,
        );
        showStatus("检测到 Agent 更新 · 当前画布保持不变", 5000);
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
        if (editorMode !== "editing") return;
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
        if (editorMode !== "editing") return;
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
        if (editorMode !== "editing") {
          showStatus("请先退出修改预览或完成当前冲突处理", 3600);
          return;
        }
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
        const scope = selectedAnnotationScope();
        if (scope === "diagram_wide" && !window.confirm(
          "这将允许 Agent 修改当前图表的所有页面、节点、连线和布局。正式写入前仍会展示具体计划并再次请求审批。是否继续提交？"
        )) return;
        annSubmit.disabled = true;
        try {
          await saveChain;
          const response = await fetch(CONFIG.annotationsUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ instruction, scope, pageId: pendingSelection.pageId, pageName: pendingSelection.pageName, cells: pendingSelection.cells }),
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

      async function updateAnnotationStatus(id, nextStatus, button) {
        if (nextStatus === "ignored" && !window.confirm(
          "忽略后 Agent 将不再处理这条注释。仍可在“已忽略”中重新打开。是否继续？"
        )) return;
        if (button) button.disabled = true;
        try {
          const body = { status: nextStatus };
          if (nextStatus === "resolved") body.summary = "已由用户标记为已完成";
          if (nextStatus === "ignored") body.reason = "已由用户手动忽略";
          const statusUrl = new URL(CONFIG.annotationsUrl);
          statusUrl.pathname = statusUrl.pathname.endsWith("/")
            ? statusUrl.pathname + encodeURIComponent(id)
            : statusUrl.pathname + "/" + encodeURIComponent(id);
          const response = await fetch(statusUrl.toString(), {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "更新注释状态失败");
          await refreshAnnotations();
        } catch (error) {
          showStatus(error.message || "更新注释状态失败", 5000);
          if (button) button.disabled = false;
        }
      }

      async function refreshAnnotations() {
        try {
          const url = new URL(CONFIG.annotationsUrl);
          url.searchParams.set("status", annFilter.value || "pending");
          const response = await fetch(url.toString(), { cache: "no-store" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "读取注释失败");
          renderAnnotations(result.annotations || [], result.counts || {});
        } catch (error) {
          showStatus(error.message || "读取注释失败", 5000);
        }
      }

      function renderAnnotations(annotations, counts) {
        const pendingCount = Number(counts.pending || 0);
        annCount.textContent = String(pendingCount);
        annCount.classList.toggle("zero", pendingCount === 0);
        const filterLabels = {
          pending: "待处理", fresh: "未完成", stale: "已过时",
          resolved: "已完成", ignored: "已忽略", all: "全部",
        };
        Object.entries(filterLabels).forEach(([value, label]) => {
          const option = annFilter.querySelector('option[value="' + value + '"]');
          if (option) option.textContent = label + "（" + Number(counts[value] || 0) + "）";
        });
        if (annotations.length === 0) {
          const emptyText = counts.all
            ? "当前筛选条件下没有注释。"
            : "还没有注释。框选图元后点击“添加注释”，标注你要让 Agent 修改的地方。";
          annList.innerHTML = '<div id="ann-none">' + emptyText + '</div>';
          return;
        }
        const escape = (value) => String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
        annList.innerHTML = annotations.map((task) => {
          const status = task.effectiveStatus || (task.stale ? "stale" : task.status);
          const cells = (task.cells || []).map((cell) => escape(cell.label || cell.id)).join("、");
          const region = task.region
            ? "区域 x=" + Math.round(task.region.x) + " y=" + Math.round(task.region.y)
              + " w=" + Math.round(task.region.width) + " h=" + Math.round(task.region.height)
            : "";
          const result = task.result
            ? '<div style="margin-top:6px;font-size:11px;color:#64748b">处理结果：' + escape(task.result.summary || "") + "（revision " + task.result.revision + "）</div>"
            : "";
          const ignored = task.ignoredReason
            ? '<div style="margin-top:6px;font-size:11px;color:#64748b">忽略原因：' + escape(task.ignoredReason) + '</div>'
            : "";
          const actions = task.status === "open"
            ? '<div class="item-actions"><button type="button" data-id="' + escape(task.id) + '" data-status="resolved">标记已完成</button>'
              + '<button type="button" data-id="' + escape(task.id) + '" data-status="ignored">忽略</button></div>'
            : '<div class="item-actions"><button type="button" data-id="' + escape(task.id) + '" data-status="open">重新打开</button></div>';
          return '<div class="item ' + status + '">'
            + '<div class="meta"><span class="badge ' + status + '">' + ({ open: "未完成", stale: "已过时", resolved: "已完成", ignored: "已忽略" }[status] || status) + '</span>'
            + '<span>页面 ' + escape(task.page.name || task.page.id) + '</span>'
            + '<span>rev ' + task.baseRevision + '→' + task.currentRevision + '</span></div>'
            + '<div class="instruction">' + escape(task.instruction) + '</div>'
            + '<div class="cells">范围：' + escape(task.scopeLabel || "只修改选区") + ' · 图元：' + (cells || "（无）") + (region ? " · " + region : "") + '</div>'
            + (task.staleReason ? '<div style="margin-top:4px;font-size:11px;color:#b45309">⚠ ' + escape(task.staleReason) + '</div>' : "")
            + result + ignored + actions + '</div>';
        }).join("");
      }

      annBtn.addEventListener("click", openDrawer);
      document.getElementById("ann-close").addEventListener("click", closeDrawer);
      document.getElementById("ann-new").addEventListener("click", startAnnotation);
      document.getElementById("ann-cancel").addEventListener("click", cancelAnnotationForm);
      annFilter.addEventListener("change", () => void refreshAnnotations());
      annSubmit.addEventListener("click", submitAnnotation);
      annList.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const id = target.getAttribute("data-id");
        const nextStatus = target.getAttribute("data-status");
        if (id && nextStatus) void updateAnnotationStatus(id, nextStatus, target);
      });
      document.getElementById("patch-preview-cancel").addEventListener("click", () => {
        void cancelVisiblePatchPreview().catch(error => showStatus(error.message || "取消候选失败", 5000));
      });
      patchPreviewBefore.addEventListener("click", () => setPatchPreviewView("before"));
      patchPreviewAfter.addEventListener("click", () => setPatchPreviewView("after"));
      patchPreviewCompare.addEventListener("click", () => setPatchPreviewView("compare"));
      patchPreviewDetailsToggle.addEventListener("click", () => {
        if (!patchPreviewDetailsToggle.disabled) {
          setPatchPreviewDetailsExpanded(!patchPreviewDetailsExpanded);
        }
      });
      document.getElementById("patch-preview-details-close").addEventListener("click", () => {
        setPatchPreviewDetailsExpanded(false);
      });
      document.addEventListener("keydown", event => {
        if (event.key === "Escape" && patchPreviewDetailsExpanded
          && (editorMode === "preview-loading" || editorMode === "previewing")) {
          setPatchPreviewDetailsExpanded(false);
        }
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
      document.getElementById("conflict-overwrite").addEventListener("click", () => void resolveConflict("user"));
      document.getElementById("conflict-modal-reload").addEventListener("click", () => void resolveConflict("agent"));
      document.getElementById("conflict-modal-overwrite").addEventListener("click", () => void resolveConflict("user"));
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
        if (event.origin !== CONFIG.drawioOrigin) return;
        let message = event.data;
        try { if (typeof message === "string") message = JSON.parse(message); } catch { return; }
        if (!message || typeof message !== "object") return;
        if (exportWorker && event.source === exportWorker.contentWindow) {
          if (message.event === "configure") {
            sendExportWorker({ action: "configure", config: { autosaveDelay: 0, preserveViewState: true } });
          } else if (message.event === "init" && pendingExport?.useWorker) {
            exportWorkerReady = true;
            sendExportWorker({
              action: "load",
              xml: pendingExport.xml,
              autosave: 0,
              diffSync: false,
              title: CONFIG.file,
            });
          } else if (message.event === "load" && pendingExport?.useWorker) {
            exportWorkerLoaded = true;
            dispatchExport();
          } else if (message.event === "export" && message.format !== "json" && pendingExport?.useWorker) {
            void saveExport(message);
          }
          return;
        }
        if (event.source !== editor.contentWindow) return;
        if (message.event === "configure") {
          sendEditor({ action: "configure", config: { autosaveDelay: 250, preserveViewState: true } });
        } else if (message.event === "init") {
          try {
            editorReady = true;
            current = await readLatest();
            canvasRevision = current.revision;
            lastEditorXml = current.xml;
            sendEditor({ action: "load", xml: current.xml, autosave: 1, diffSync: true, title: CONFIG.file });
            void refreshAnnotations();
            void refreshPatchPreview();
            if (pendingExport) setTimeout(dispatchExport, 250);
          } catch (error) { showStatus(error.message || "读取失败", 5000); }
        } else if (message.event === "export" && message.format === "json" && awaitingSelection) {
          applySelectionExport(message.data);
        } else if (message.event === "export" && message.format !== "json" && pendingExport) {
          void saveExport(message);
        } else if (message.event === "load" && typeof message.xml === "string") {
          lastEditorXml = message.xml;
          // Draw.io acknowledges action:"load" with event:"load". Only the
          // exact restore target may release the save guard; a delayed initial
          // load acknowledgement must not confirm a different document.
          confirmPatchPreviewLoad(message.xml);
          confirmRestoreTargetLoaded(message.xml);
        } else if ((message.event === "autosave" || message.event === "save") && typeof message.xml === "string") {
          lastEditorXml = message.xml;
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
      events.addEventListener("preview", () => {
        void refreshPatchPreview().catch(error => showStatus(error.message || "刷新修改预览失败", 5000));
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
      events.addEventListener("editor-command", event => {
        const command = JSON.parse(event.data);
        if (command.action === "export" && command.requestId && command.format) {
          requestEditorExport(command);
        }
      });
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
    if (xml.includes(PATCH_PREVIEW_ID_PREFIX)) {
      integratedJsonResponse(response, 409, {
        ok: false,
        error: "preview_artifact",
        message: "临时修改预览不能保存到正式 Draw.io 文件",
      })
      return
    }
    const activePreview = currentPatchPreview(session)
    if (
      body.source === "editor"
      && activePreview
      && (integratedHash(xml) === activePreview.candidateHash
        || integratedHash(xml) === integratedHash(activePreview.comparePreviewXml))
    ) {
      integratedJsonResponse(response, 409, {
        ok: false,
        error: "preview_candidate",
        message: "只读修改预览候选不能通过编辑器保存，必须先完成写前审批",
      })
      return
    }
    const result = await integratedCommit(
      session,
      xml,
      baseRevision as number,
      integratedSource(body.source),
      typeof body.clientId === "string" ? body.clientId : null,
      { autoMerge: body.source === "editor" },
    )
    if (result.conflict) {
      integratedJsonResponse(response, 409, {
        ok: false,
        error: "revision_conflict",
        current: integratedDocumentPayload(result.current),
        manualChanges: result.manualChanges,
        merge: result.merge,
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
      autoMerge: result.autoMerge,
    })
    return
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/events") {
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    })
    response.write(": connected\n\n")
    const requestedFile = requestUrl.searchParams.get("file")
    const connectedFile = requestedFile
      ? resolveWorkspacePath({ directory: session.workspace }, requestedFile)
      : session.file
    const client = { response, diagramKey: integratedDiagramKey(connectedFile) }
    const clients = state.eventClients.get(session.sessionId) || new Set()
    clients.add(client)
    state.eventClients.set(session.sessionId, clients)
    request.on("close", () => {
      clients.delete(client)
      if (clients.size === 0) state.eventClients.delete(session.sessionId)
    })
    return
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/preview") {
    await refreshIntegratedSession(session)
    const preview = currentPatchPreview(session)
    integratedJsonResponse(response, 200, {
      ok: true,
      preview: preview ? patchPreviewPayload(preview, true) : null,
    })
    return
  }

  const patchPreviewIdMatch = requestUrl.pathname.match(/^\/api\/preview\/([^/]+)$/)
  const patchPreviewId = patchPreviewIdMatch ? decodeURIComponent(patchPreviewIdMatch[1]) : null
  if (patchPreviewId && request.method === "DELETE") {
    const preview = state.patchPreviews.get(patchPreviewId)
    if (!preview || preview.sessionId !== session.sessionId
      || preview.diagramKey !== integratedDiagramKey(session.file)) {
      integratedJsonResponse(response, 404, { ok: false, error: "patch preview not found" })
      return
    }
    cancelPatchPreview(session, preview, "用户退出了修改预览")
    integratedJsonResponse(response, 200, { ok: true, preview: patchPreviewPayload(preview) })
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
    const map = getDiagramAnnotations(session)
    const requestedFilter = requestUrl.searchParams.get("status") || "pending"
    const allowedFilters: AnnotationStatusFilter[] = [
      "pending", "open", "fresh", "stale", "resolved", "ignored", "all",
    ]
    if (!allowedFilters.includes(requestedFilter as AnnotationStatusFilter)) {
      integratedJsonResponse(response, 400, { ok: false, error: `unsupported annotation status: ${requestedFilter}` })
      return
    }
    const statusFilter = requestedFilter as AnnotationStatusFilter
    const entries = [...map.values()]
      .map((task) => ({ task, state: annotationEffectiveState(session, task) }))
      .sort((left, right) => right.task.updatedAt.localeCompare(left.task.updatedAt))
    const list = entries
      .filter((entry) => annotationMatchesStatus(entry.state, statusFilter))
      .map((entry) => annotationPayload(session, entry.task, entry.state))
    integratedJsonResponse(response, 200, {
      ok: true,
      file: path.relative(session.workspace, session.file).split(path.sep).join("/"),
      status: statusFilter,
      count: list.length,
      counts: annotationStatusCounts(entries.map((entry) => entry.state)),
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
    const submittedPageName = typeof body.pageName === "string" ? body.pageName : ""
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
    const resolvedPage = resolveAnnotationPage(pages, pageId, submittedPageName, cells)
    if (!resolvedPage) {
      integratedJsonResponse(response, 400, {
        ok: false,
        error: pageId ? `page "${pageId}" not found` : "the diagram has no pages to annotate",
        pages: pages.map((page) => ({ id: page.id, name: page.name })),
      })
      return
    }
    const pageCellsById = new Map(resolvedPage.cells.map((cell) => [cell.id, cell]))
    for (const cell of cells) {
      const actual = pageCellsById.get(cell.id)
      if (!actual) {
        integratedJsonResponse(response, 400, {
          ok: false,
          error: `cell "${cell.id}" not found on page "${resolvedPage.name || resolvedPage.id}"`,
        })
        return
      }
      if (cell.kind === "node" && !actual.vertex) {
        integratedJsonResponse(response, 400, {
          ok: false,
          error: `cell "${cell.id}" is not a node on page "${resolvedPage.name || resolvedPage.id}"`,
        })
        return
      }
      if (cell.kind === "edge" && !actual.edge) {
        integratedJsonResponse(response, 400, {
          ok: false,
          error: `cell "${cell.id}" is not an edge on page "${resolvedPage.name || resolvedPage.id}"`,
        })
        return
      }
      if (cell.kind === "edge" && actual.edge) {
        if (cell.source !== undefined && cell.source !== (actual.source ?? "")) {
          integratedJsonResponse(response, 400, {
            ok: false,
            error: `edge "${cell.id}" source mismatch: "${cell.source}" does not match "${actual.source ?? ""}"`,
          })
          return
        }
        if (cell.target !== undefined && cell.target !== (actual.target ?? "")) {
          integratedJsonResponse(response, 400, {
            ok: false,
            error: `edge "${cell.id}" target mismatch: "${cell.target}" does not match "${actual.target ?? ""}"`,
          })
          return
        }
      }
    }
    const resolvedPageId = resolvedPage.id
    const pageName = resolvedPage.name || submittedPageName
    const region = annotationRegion(pages, resolvedPageId, cells.map((cell) => cell.id))
    const now = new Date().toISOString()
    const id = `ant_${randomBytes(6).toString("base64url")}`
    const task: AnnotationTask = {
      id,
      file: path.relative(session.workspace, session.file).split(path.sep).join("/"),
      pageId: resolvedPageId,
      pageName,
      cells,
      region,
      instruction,
      scope,
      status: "open",
      baseRevision: session.revision,
      baseFileHash: session.fileHash,
      baseCellHashes: annotationBaseCellHashes(pages, resolvedPageId, cells.map((cell) => cell.id)),
      result: null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      ignoredAt: null,
      ignoredReason: null,
    }
    const map = getDiagramAnnotations(session)
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
    const map = getDiagramAnnotations(session)
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
    await refreshIntegratedSession(session)
    const map = getDiagramAnnotations(session)
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
    if ((requestedStatus === "resolved" || requestedStatus === "ignored") && task.status !== "open") {
      integratedJsonResponse(response, 409, {
        ok: false,
        error: `annotation is ${task.status}; reopen it before changing to ${requestedStatus}`,
      })
      return
    }
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
      task.ignoredAt = null
      task.ignoredReason = null
      clearAnnotationSessionState(session, task.id)
    } else if (requestedStatus === "ignored") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : ""
      task.status = "ignored"
      task.result = null
      task.resolvedAt = null
      task.ignoredAt = new Date().toISOString()
      task.ignoredReason = reason || "已由用户手动忽略"
      clearAnnotationSessionState(session, task.id)
    } else if (requestedStatus === "open") {
      clearAnnotationSessionState(session, task.id)
      task.status = "open"
      task.result = null
      task.resolvedAt = null
      task.ignoredAt = null
      task.ignoredReason = null
    } else {
      integratedJsonResponse(response, 400, {
        ok: false,
        error: `unsupported annotation status: ${requestedStatus || "(empty)"}`,
      })
      return
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

  if (request.method === "POST" && requestUrl.pathname === "/api/editor-export") {
    let body: Record<string, unknown>
    try {
      body = await integratedRequestJson(request)
    } catch (error) {
      integratedJsonResponse(response, 400, { ok: false, error: (error as Error).message })
      return
    }
    const requestId = typeof body.requestId === "string" ? body.requestId : ""
    const pending = requestId ? state.pendingEditorExports.get(requestId) : undefined
    if (
      !pending
      || pending.sessionId !== session.sessionId
      || pending.diagramKey !== integratedDiagramKey(session.file)
    ) {
      integratedJsonResponse(response, 404, { ok: false, error: "unknown editor export request" })
      return
    }
    const fail = (message: string) => {
      clearTimeout(pending.timer)
      state.pendingEditorExports.delete(requestId)
      pending.reject(new Error(message))
    }
    if (typeof body.error === "string" && body.error) {
      fail(`editor export failed: ${body.error}`)
      integratedJsonResponse(response, 200, { ok: false, error: body.error })
      return
    }
    if (typeof body.data !== "string" || !body.data) {
      fail("editor export returned no data")
      integratedJsonResponse(response, 400, { ok: false, error: "editor export data must be a non-empty data URI" })
      return
    }
    let content: Buffer
    try {
      content = decodeDataUri(body.data)
    } catch (error) {
      fail((error as Error).message)
      integratedJsonResponse(response, 400, { ok: false, error: (error as Error).message })
      return
    }
    try {
      if (content.length === 0 || content.length > MAX_FILE_BYTES) {
        throw new Error("editor export size is out of range")
      }
      validateEditorExportContent(content, pending.format)
      if (pending.writeOutput) {
        await atomicWriteBinary(pending.outputTarget, content, pending.overwrite)
      }
    } catch (error) {
      fail((error as Error).message)
      integratedJsonResponse(response, 400, { ok: false, error: (error as Error).message })
      return
    }
    clearTimeout(pending.timer)
    state.pendingEditorExports.delete(requestId)
    const result = {
      outputTarget: pending.outputTarget,
      bytes: content.length,
      contentType: editorExportContentType(pending.format),
      content: pending.writeOutput ? undefined : content,
    }
    pending.resolve(result)
    integratedJsonResponse(response, 200, {
      ok: true,
      format: pending.format,
      outputPath: path.relative(session.workspace, pending.outputTarget).split(path.sep).join("/"),
      bytes: result.bytes,
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
  let session: IntegratedSession
  if (existing && path.resolve(existing.file) === path.resolve(target)) {
    session = await refreshIntegratedSession(existing)
  } else {
    session = {
      sessionId: context.sessionID,
      bindingId: randomBytes(16).toString("base64url"),
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
      activePreviewId: null,
      annotationAuthorizations: new Map(),
      historyWarning: null,
      revisionWarning: null,
    }
    const reconciled = await reconcileDiagramRevisionLedger(session, session.fileHash)
    session.revision = reconciled.ledger.revision
    session.updatedBy = reconciled.ledger.updatedBy
    session.updatedAt = reconciled.ledger.updatedAt
    session.history = [{
      revision: session.revision,
      xml: session.xml,
      updatedBy: session.updatedBy,
      updatedAt: session.updatedAt,
    }]
  }
  state.sessions.set(context.sessionID, session)
  session.bindingId ??= randomBytes(16).toString("base64url")
  session.activeAnnotationId ??= null
  session.activePreviewId ??= null
  session.annotationAuthorizations ??= new Map()
  session.revisionWarning ??= null
  await loadStoredAnnotations(session)
  await bindHistoryCheckpoint(session)
  const bridge = await ensureIntegratedBridgeStarted()
  const token = randomBytes(24).toString("base64url")
  state.tokens.set(token, {
    sessionId: context.sessionID,
    diagramKey: integratedDiagramKey(session.file),
    bindingId: session.bindingId,
    expiresAt: Date.now() + BRIDGE_TOKEN_TTL_MS,
  })
  return { session, token, bridge }
}

const DRAWIO_RUNTIME_GUIDANCE = `## Draw.io 文件写入与交付

已通过 drawio_open 绑定的文件可能包含用户在内置浏览器中的手动修改。
每次新的用户轮次只要涉及已绑定图表，即使本轮没有加载任何 Draw.io Skill，也必须先调用 drawio_get_state 同步最新 revision、XML、updatedBy 和 updatedAt，再调用 drawio_list_annotations(file=当前文件, status="all") 检查新增注释以及 instruction、scope、freshness、resolved 或 ignored 状态变化；本轮结果覆盖上一轮缓存。正式写入前再次检查 revision，最终交付前再次调用 drawio_list_annotations(file=当前文件, status="pending")；若状态变化，必须按最新基线重新规划，禁止复用旧 preview_id、approval_token、稳定 ID 清单或上一轮结论。
每次修改前必须立即调用 drawio_get_state，并把返回的最新 XML 作为修改基线。人工编辑不是只读内容，可以按当前任务要求继续调整。
提交时必须携带该次读取返回的准确 base_revision；revision_conflict 后重新读取，在新 XML 上重新执行所需变更并重试，禁止重发旧 XML。
禁止用普通 write、edit 或脚本直接覆盖已绑定的 .drawio 文件，因为这会绕过 revision 检查并可能用旧快照丢失最新内容。
对已绑定文件的普通修改必须先用 drawio_patch(dry_run=true)、drawio_polish(dry_run=true) 或 drawio_preview_state 生成同画布候选，再调用 drawio_authorize_preview。授权工具第一次只返回绑定 preview_id、revision 与候选哈希的 OpenCode question 参数；必须把 arguments 原样传给内置 question，不得自行回答或改写。Question 返回后，再次调用同一授权工具，并显式传入 approval_review_id=第一次返回的 reviewId 和 approval_answer=Question 返回的原始答案；只有“确认修改”才会复核并写入。“取消修改”、关闭或自定义文字都不写入，自定义文字是修改反馈，必须基于最新 revision 重新生成预览。字体、填充色、文字色、边框色等常用属性使用 drawio_patch.style_updates；只有完整 XML 才能表达的页面背景或高级样式使用 drawio_preview_state。预览把修改前、真实修改后和带高亮覆盖层的前后对比分开，并提供可收起的属性级变化详情；绿色表示新增、黄色表示修改、红色表示删除或原位置、蓝色表示变更连线。
本轮全部可执行创建或修改（包括 fresh annotation）完成后必须统一调用 drawio_finalize：校验、评分、自动导出同名 PNG。调用前必须先调用 drawio_list_annotations(status='pending') 探测未完成注释；存在 requiresConfirmation=false 的注释时 drawio_finalize 会拒绝执行，必须先逐条处理并 drawio_resolve_annotation 后再重试，不得跳过。只有返回 shouldOpenBrowser=true 时才调用 MobileWork 工具 openwork_browser_open_url，并传入 url=openUrl、provider="builtin"；editorConnected=true 时必须保持现有编辑器，禁止重新打开或刷新，以免丢失用户尚未保存的编辑。
drawio_export 支持 PNG、JPEG、PDF、xmlpng、SVG、xmlsvg 和 html2。SVG、xmlsvg、html2 由内置浏览器编辑器渲染并通过 Bridge 写回工作区；返回 editor_required 时必须立即调用 openwork_browser_open_url，并传入 url=openUrl、provider="builtin"，等待编辑器连接后用完全相同的参数重试，禁止把该状态解释为不支持格式或要求用户手工导出。PNG、JPEG、xmlpng、SVG、xmlsvg 使用 all_pages=true 时逐页生成文件并返回 outputs[]，必须核对 page_count 与 outputs 数量一致；PDF 和 html2 的 all_pages=true 各返回一个包含全部页面的多页单文件，html2 还需核对 contains_all_pages=true。

## 注释任务（框选评审）

用户在内置浏览器中框选图元并提交注释后，每条注释是一条按图表文件持久化的独立任务，不绑定创建它的对话 session；任务记录稳定 ID、页面、区域范围、修改说明、允许范围和提交时的图表基线。
注释的持久化 status 为 open/resolved/ignored；freshness=stale 表示图元已变化但任务仍未完成。执行 stale 注释前必须先询问用户；fresh 注释可直接进入计划和审批流程。resolved 和 ignored 都是终态，Agent 必须跳过，只有用户重新打开后才能处理。
处理注释时必须先读取最新状态并 dry-run，让候选结果显示在同一 Draw.io 画布中；向用户说明计划、完整稳定 ID 清单和范围后，携带 preview_id 调用 drawio_authorize_annotation_change。第一次调用只返回 OpenCode question 参数；原样调用内置 question。Question 返回后，把第一次返回的 reviewId 和原始答案分别作为 approval_review_id、approval_answer 显式传入第二次授权调用；只有“确认修改”才会返回当前 session 的一次性 token。插件事件桥仅作兼容和审计辅助，正常授权不依赖它。取消、关闭、自定义文字、过期或重放回复均不授权。正式 drawio_patch/drawio_update_state 的 XML 必须与已展示候选完全一致。非全图范围由运行时强制使用注释绑定的 pageId；diagram_wide 覆盖当前图表全部页面并使用 pageId:cellId。禁止先改后问。
不得修改授权范围外内容。确需越界时，在 authorization 的 escalation_reason 中先说明不可避免的原因并申请更宽范围；未获批准不得写入。drawio_polish 会重排整页，存在活动注释时只有取得 diagram_wide 审批后才能正式运行。
用户本轮另有明确任务时先完成该任务，然后在同一轮重新探测注释；最终回复前仍存在 requiresConfirmation=false 的 open 注释时必须继续处理，不能只提示用户稍后继续。
注释任务的检查与处理流程由 drawio-session-editing 技能负责编排，详见该 SKILL.md。`

const DRAWIO_EXPERT_AGENT_MARKER = "Agent ID 是 `drawio-expert`"

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

export async function initializeDrawioWorkspace(directory: string): Promise<void> {
  await loadWorkspaceEnvironment(directory)
}

function approvalQuestionMatches(value: unknown, expected: ApprovalQuestion): boolean {
  if (!integratedRecord(value)) return false
  if (
    value.question !== expected.question
    || value.header !== expected.header
    || value.multiple !== false
    || value.custom !== true
    || !Array.isArray(value.options)
    || value.options.length !== expected.options.length
  ) return false
  return value.options.every((option, index) => {
    const target = expected.options[index]
    return integratedRecord(option)
      && option.label === target.label
      && option.description === target.description
  })
}

export function handleDrawioOpenCodeEvent(event: unknown): boolean {
  if (!integratedRecord(event) || typeof event.type !== "string" || !integratedRecord(event.properties)) {
    return false
  }
  const properties = event.properties
  const state = getIntegratedBridgeState()
  prunePatchPreviews()

  if (event.type === "question.asked" || event.type === "question.v2.asked") {
    if (
      typeof properties.id !== "string"
      || typeof properties.sessionID !== "string"
      || !Array.isArray(properties.questions)
      || properties.questions.length !== 1
      || !integratedRecord(properties.tool)
      || typeof properties.tool.callID !== "string"
      || typeof properties.tool.messageID !== "string"
    ) return false
    const review = [...state.approvalReviews.values()].find((candidate) => (
      candidate.sessionId === properties.sessionID
      && (candidate.status === "awaiting_question" || candidate.status === "waiting_for_user")
      && approvalQuestionMatches(properties.questions[0], candidate.question)
    ))
    if (!review) return false
    if (!review.requestIds.includes(properties.id)) review.requestIds.push(properties.id)
    review.status = "waiting_for_user"
    state.questionReviewIds.set(properties.id, review.id)
    return true
  }

  if (
    event.type !== "question.replied"
    && event.type !== "question.v2.replied"
    && event.type !== "question.rejected"
    && event.type !== "question.v2.rejected"
  ) return false
  if (typeof properties.requestID !== "string" || typeof properties.sessionID !== "string") return false
  const reviewId = state.questionReviewIds.get(properties.requestID)
  const review = reviewId ? state.approvalReviews.get(reviewId) : null
  if (!review || review.sessionId !== properties.sessionID || review.status !== "waiting_for_user") return false

  review.resolvedAt = new Date().toISOString()
  clearApprovalQuestionBindings(review)
  if (event.type.endsWith(".rejected")) {
    review.status = "cancelled"
    review.feedback = null
    return true
  }
  const answers = Array.isArray(properties.answers) && Array.isArray(properties.answers[0])
    ? properties.answers[0].filter((answer): answer is string => typeof answer === "string").map(answer => answer.trim()).filter(Boolean)
    : []
  if (answers.length === 1 && answers[0] === APPROVAL_CONFIRM_LABEL) {
    review.status = "approved"
    review.feedback = null
  } else if (answers.length === 0 || (answers.length === 1 && answers[0] === APPROVAL_CANCEL_LABEL)) {
    review.status = "cancelled"
    review.feedback = null
  } else {
    review.status = "feedback"
    review.feedback = answers.join("\n")
  }
  return true
}

export function applyDrawioSystemGuidance(output: { system: string[] }): boolean {
  // OpenCode 的系统提示转换钩子不会直接提供当前选中的 Agent 名称，
  // 但当前 Agent 的生成提示词已经合并到 output.system。只识别该稳定 ID 标记，
  // 避免把 Draw.io 工作流约束注入普通 Agent、标题生成等辅助模型请求。
  if (!output.system.some((part) => part.includes(DRAWIO_EXPERT_AGENT_MARKER))) return false
  output.system.push(DRAWIO_RUNTIME_GUIDANCE)
  return true
}

export function enforceDrawioWriteGuard(
  input: { tool: string; sessionID: string; callID?: string },
  output: { args: unknown },
): void {
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
}

export const DRAWIO_TOOL_NAMES = [
  "drawio_validate",
  "drawio_export",
  "drawio_health_check",
  "drawio_create",
  "drawio_inspect",
  "drawio_quality",
  "drawio_patch",
  "drawio_polish",
  "drawio_compare",
  "drawio_get_state",
  "drawio_preview_state",
  "drawio_update_state",
  "drawio_open",
  "drawio_finalize",
  "drawio_list_annotations",
  "drawio_get_annotation",
  "drawio_authorize_preview",
  "drawio_authorize_annotation_change",
  "drawio_resolve_annotation",
] as const

type DrawioToolFactory = typeof tool
type DrawioToolDefinition = ReturnType<DrawioToolFactory>
type DrawioToolset = { [Name in (typeof DRAWIO_TOOL_NAMES)[number]]: DrawioToolDefinition }

const drawioToolsets = new WeakMap<DrawioToolFactory, DrawioToolset>()

export function createDrawioToolset(toolApi: DrawioToolFactory): DrawioToolset {
  const cachedToolset = drawioToolsets.get(toolApi)
  if (cachedToolset) return cachedToolset

  const tool = toolApi

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

  const patchStyleUpdatesSchema = tool.schema.object({
    font_size: tool.schema.number().positive().max(200).optional(),
    font_family: tool.schema.string().min(1).max(120).optional(),
    font_color: tool.schema.string().min(1).max(80).optional(),
    fill_color: tool.schema.string().min(1).max(80).optional(),
    stroke_color: tool.schema.string().min(1).max(80).optional(),
    stroke_width: tool.schema.number().min(0).max(50).optional(),
    opacity: tool.schema.number().min(0).max(100).optional(),
    rounded: tool.schema.boolean().optional(),
    dashed: tool.schema.boolean().optional(),
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
    style_updates: patchStyleUpdatesSchema
      .optional()
      .describe("Whitelisted visual property updates that preserve unrelated style keys"),
    cascade: tool.schema
      .boolean()
      .optional()
      .describe("For remove-node, also remove connected edges"),
  })

  const defineTool = (config: Parameters<DrawioToolFactory>[0]): DrawioToolDefinition =>
    toolApi({
      ...config,
      async execute(args, context) {
        await loadWorkspaceEnvironment(context.directory)
        return config.execute(args, context)
      },
    })

  const toolset: DrawioToolset = {
    drawio_validate: defineTool({
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

    drawio_export: defineTool({
      description:
        "Export a workspace Draw.io file. PNG, JPEG, PDF, and editable PNG (xmlpng) use the Docker HTTP Export Server. SVG, editable SVG (xmlsvg), and HTML (html2) use the built-in browser Bridge. all_pages=true writes one file per page for PNG/JPEG/xmlpng/SVG/XMLSVG, while PDF and HTML2 each produce one multi-page file. page_id exports one page for every format. When an editor-channel export is not connected, call openwork_browser_open_url with url=openUrl and provider=builtin, then retry the same export.",
      args: {
        input_path: tool.schema.string().describe("Workspace-relative .drawio or .xml input file"),
        format: tool.schema.enum(["png", "jpeg", "pdf", "xmlpng", "svg", "xmlsvg", "html2"]),
        output_path: tool.schema.string().optional().describe("Workspace-relative output path"),
        page_id: tool.schema.string().optional().describe("Stable page id to export; cannot be combined with all_pages"),
        all_pages: tool.schema.boolean().default(false).describe("Export every page; multi-file formats return outputs[], while PDF and HTML2 return one multi-page file"),
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
        const refreshedSession = session ? await refreshIntegratedSession(session) : null
        const xml = refreshedSession?.xml || await readDiagramFile(inputTarget)
        const sourceRevision = refreshedSession?.revision
        const report = validationReport(parseDrawio(xml))
        if (!report.valid) {
          throw new Error(`refusing to export invalid Draw.io XML: ${JSON.stringify(report.errors)}`)
        }
        if (args.page_id && args.all_pages) {
          throw new Error("page_id and all_pages cannot be used together")
        }

        if (EDITOR_EXPORT_FORMATS.has(args.format)) {
          const selectedPage = args.page_id ? requireExportPage(xml, args.page_id) : null
          if (args.all_pages && EDITOR_MULTI_FILE_EXPORT_FORMATS.has(args.format)) {
            const outcome = await exportDiagramPagesViaEditor({
              context,
              inputTarget,
              xml,
              format: args.format,
              outputPath: args.output_path,
              sourceRevision,
              overwrite: args.overwrite,
            })
            if (outcome.status === "editor_required") {
              return JSON.stringify({
                status: "editor_required",
                message:
                  "SVG and HTML exports are rendered by the Draw.io editor page in the built-in browser, which is currently not connected for this diagram.",
                input_path: workspaceRelative(context, inputTarget).split(path.sep).join("/"),
                format: args.format,
                all_pages: true,
                openUrl: outcome.openUrl,
                browserAction:
                  "Call MobileWork's openwork_browser_open_url tool with url=openUrl and provider=builtin now, wait for the editor page to finish loading, then call drawio_export again with identical arguments to complete the export.",
                tokenExpiresAt: outcome.tokenExpiresAt,
              }, null, 2)
            }
            return JSON.stringify({
              success: true,
              channel: "editor",
              input_path: workspaceRelative(context, inputTarget).split(path.sep).join("/"),
              format: args.format,
              all_pages: true,
              page_count: outcome.outputs.length,
              source_revision: outcome.sourceRevision,
              outputs: outcome.outputs.map((output) => ({
                page_index: output.pageIndex,
                page_id: output.pageId,
                page_name: output.pageName,
                output_path: workspaceRelative(context, output.outputTarget).split(path.sep).join("/"),
                file_size_bytes: output.bytes,
                content_type: output.contentType,
              })),
            }, null, 2)
          }
          const workerXml = args.page_id
            ? args.format === "html2" ? singlePageDrawioXml(xml, args.page_id) : xml
            : args.all_pages ? xml : undefined
          const outcome = await exportDiagramViaEditor({
            context,
            inputTarget,
            format: args.format,
            outputPath: args.output_path,
            xml: workerXml,
            pageId: args.page_id,
            allPages: args.all_pages,
            sourceRevision,
            overwrite: args.overwrite,
          })
          if (outcome.status === "editor_required") {
            return JSON.stringify({
              status: "editor_required",
              message:
                "SVG and HTML exports are rendered by the Draw.io editor page in the built-in browser, which is currently not connected for this diagram.",
              input_path: workspaceRelative(context, inputTarget).split(path.sep).join("/"),
              format: args.format,
              openUrl: outcome.openUrl,
              browserAction:
              "Call MobileWork's openwork_browser_open_url tool with url=openUrl and provider=builtin now, wait for the editor page to finish loading, then call drawio_export again with identical arguments to complete the export.",
              tokenExpiresAt: outcome.tokenExpiresAt,
            }, null, 2)
          }
          return JSON.stringify({
            success: true,
            channel: "editor",
            input_path: workspaceRelative(context, inputTarget).split(path.sep).join("/"),
            output_path: workspaceRelative(context, outcome.outputTarget).split(path.sep).join("/"),
            format: args.format,
            file_size_bytes: outcome.bytes,
            content_type: outcome.contentType,
            page_id: selectedPage?.id,
            page_name: selectedPage?.name,
            all_pages: args.all_pages,
            page_count: args.all_pages && args.format === "html2" ? report.stats.pages : undefined,
            contains_all_pages: args.all_pages && args.format === "html2" ? true : undefined,
            source_revision: outcome.sourceRevision,
          }, null, 2)
        }

        if (args.all_pages && MULTI_FILE_EXPORT_FORMATS.has(args.format)) {
          const exportedPages = await exportDiagramPagesToFiles({
            context,
            inputTarget,
            xml,
            format: args.format,
            outputPath: args.output_path,
            scale: args.scale,
            border: args.border,
            background: args.background,
            embedXml: args.format === "xmlpng" || args.embed_xml,
            overwrite: args.overwrite,
          })
          return JSON.stringify({
            success: true,
            channel: "docker",
            input_path: workspaceRelative(context, inputTarget).split(path.sep).join("/"),
            format: args.format,
            all_pages: true,
            page_count: exportedPages.length,
            outputs: exportedPages.map((output) => ({
              page_index: output.pageIndex,
              page_id: output.pageId,
              page_name: output.pageName,
              output_path: workspaceRelative(context, output.outputTarget).split(path.sep).join("/"),
              file_size_bytes: output.bytes,
              content_type: output.contentType,
              export_url: output.exportUrl,
            })),
          }, null, 2)
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
          embedXml: args.format === "xmlpng" || args.embed_xml,
          overwrite: args.overwrite,
        })
        return JSON.stringify({
          success: true,
          channel: "docker",
          input_path: workspaceRelative(context, inputTarget).split(path.sep).join("/"),
          output_path: workspaceRelative(context, exported.outputTarget).split(path.sep).join("/"),
          format: args.format,
          file_size_bytes: exported.bytes,
          content_type: exported.contentType,
          export_url: exported.exportUrl,
          all_pages: args.all_pages,
          page_count: args.all_pages ? report.stats.pages : undefined,
        }, null, 2)
      },
    }),

    drawio_health_check: defineTool({
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
            supported_formats: ["html2", "jpeg", "pdf", "png", "svg", "xmlpng", "xmlsvg"],
            export_channels: {
              docker_export_server: ["jpeg", "pdf", "png", "xmlpng"],
              builtin_browser_editor: ["html2", "svg", "xmlsvg"],
            },
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

    drawio_create: defineTool({
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

    drawio_inspect: defineTool({
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

    drawio_quality: defineTool({
      description:
        "Score Draw.io layout quality and report actionable issues including node overlaps, edge-node intersections, edge crossings, collinear edge overlaps, shared-port congestion, edge-label collisions, empty labels, and missing arc line jumps.",
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

    drawio_patch: defineTool({
      description:
        "Apply semantic node and edge operations to an opened Draw.io file. Use dry_run first, then drawio_authorize_preview and the returned OpenCode question flow before committing. Pass annotation_id and its scoped approval when executing an annotation.",
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
        preview_id: tool.schema
          .string()
          .optional()
          .describe("Preview id returned by the immediately preceding active-session dry-run"),
        preview_approval_token: tool.schema
          .string()
          .optional()
          .describe("One-time token returned by drawio_authorize_preview; annotation approval_token also authorizes its linked preview"),
        approval_plan: tool.schema
          .string()
          .optional()
          .describe("Concise explanation shown in the OpenCode question review for a formal non-annotation write"),
        approval_review_id: tool.schema
          .string()
          .optional()
          .describe("Review id returned before invoking OpenCode question; pass it back with approval_answer"),
        approval_answer: tool.schema
          .string()
          .optional()
          .describe("Exact answer returned by OpenCode question; must be paired with approval_review_id"),
      },
      async execute(args, context) {
        const target = resolveWorkspacePath(context, args.file)
        const session = integratedSessionFor(context, target)
        const activeSession = session ? await refreshIntegratedSession(session) : null
        if (!activeSession && !args.dry_run) {
          throw new Error(
            "formal Draw.io changes require an active preview session; call drawio_open before writing",
          )
        }
        let pageSelector = args.page
        if (args.annotation_id) {
          if (!activeSession) {
            throw new Error("annotation_id requires an active Draw.io session for this file")
          }
          const annotation = getDiagramAnnotations(activeSession).get(args.annotation_id)
          if (!annotation) throw new Error(`annotation not found: ${args.annotation_id}`)
          if (annotation.status !== "open") {
            throw new Error(`annotation is ${annotation.status} and must be reopened before processing: ${args.annotation_id}`)
          }
          if (!annotation.pageId.trim()) {
            throw new Error(`annotation has no stable page id: ${args.annotation_id}`)
          }
          if (
            annotation.scope !== "diagram_wide"
            && args.page
            && args.page !== annotation.pageId
            && args.page !== annotation.pageName
          ) {
            throw new Error(
              `annotation ${args.annotation_id} is bound to page ${annotation.pageId}; received page ${args.page}`,
            )
          }
          pageSelector = annotation.scope === "diagram_wide" && args.page
            ? args.page
            : annotation.pageId
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
          validateAnnotationPatchScope(annotationGuard, page.id, args.operations as PatchOperation[], changedIds)
        }
        const afterXml = serializeEditableDrawio(editable)
        const afterPages = parseDrawio(afterXml)
        const report = validationReport(afterPages)
        if (!report.valid) {
          throw new Error(`patched diagram failed validation: ${JSON.stringify(report.errors)}`)
        }
        const diff = diffParsedPages(beforePages, afterPages)

        if (args.dry_run) {
          const preview = activeSession
            ? createPatchPreview(activeSession, beforeXml, afterXml, page.id, changedIds, diff)
            : null
          return JSON.stringify({
            file: args.file,
            dryRun: true,
            changedIds,
            diff,
            preview: preview ? patchPreviewPayload(preview) : null,
            previewGuidance: preview
              ? "The exact candidate is visible in the bound Draw.io canvas. Call drawio_authorize_preview, submit its returned arguments unchanged to OpenCode question, then retry authorization with the returned reviewId and exact answer."
              : "Bind the file with drawio_open or drawio_finalize to receive an interactive canvas preview.",
            ...report,
          }, null, 2)
        }

        if (activeSession) {
          const previewId = args.preview_id
            || annotationGuard?.authorization.previewId
            || activeSession.activePreviewId
            || undefined
          let preview = patchPreviewForCandidate(
            activeSession,
            previewId,
            args.base_revision!,
            afterXml,
          )
          if (!preview) {
            preview = createPatchPreview(activeSession, beforeXml, afterXml, page.id, changedIds, diff)
          }
          let previewApprovalToken = args.preview_approval_token || args.approval_token
          if (!annotationGuard && !previewApprovalToken) {
            const approval = resolvePatchPreviewApproval(
              activeSession,
              preview,
              {
                kind: "preview",
                plan: args.approval_plan?.trim() || defaultPatchPreviewPlan(preview),
              },
              { reviewId: args.approval_review_id, answer: args.approval_answer },
            )
            if (!approval.approved) return JSON.stringify(approval.payload, null, 2)
            previewApprovalToken = approval.approvalToken
          }
          validatePatchPreviewWrite(
            activeSession,
            preview.id,
            previewApprovalToken,
            args.base_revision!,
            afterXml,
          )
          const commit = await integratedCommit(activeSession, afterXml, args.base_revision!, "agent", null, {
            appliedPreviewId: preview.id,
          })
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

        throw new Error("formal Draw.io changes require an active preview session; call drawio_open before writing")
      },
    }),

    drawio_polish: defineTool({
      description:
        "Run a deterministic quality loop over an opened Draw.io file. Use dry_run first, then approve the exact accepted layout through drawio_authorize_preview and OpenCode question before committing with backup.",
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
        annotation_id: tool.schema
          .string()
          .optional()
          .describe("Active annotation id; whole-page polish requires diagram_wide approval"),
        approval_token: tool.schema
          .string()
          .optional()
          .describe("One-time diagram_wide token returned by drawio_authorize_annotation_change"),
        preview_id: tool.schema.string().optional().describe("Preview id returned by the dry-run"),
        preview_approval_token: tool.schema
          .string()
          .optional()
          .describe("One-time token returned by drawio_authorize_preview"),
        approval_plan: tool.schema
          .string()
          .optional()
          .describe("Concise explanation shown in the OpenCode question review for a formal non-annotation write"),
        approval_review_id: tool.schema
          .string()
          .optional()
          .describe("Review id returned before invoking OpenCode question; pass it back with approval_answer"),
        approval_answer: tool.schema
          .string()
          .optional()
          .describe("Exact answer returned by OpenCode question; must be paired with approval_review_id"),
      },
      async execute(args, context) {
        const target = resolveWorkspacePath(context, args.file)
        const session = integratedSessionFor(context, target)
        const activeSession = session ? await refreshIntegratedSession(session) : null
        if (!activeSession && !args.dry_run) {
          throw new Error(
            "formal Draw.io changes require an active preview session; call drawio_open before writing",
          )
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
        if (annotationGuard && annotationGuard.authorization.scope !== "diagram_wide") {
          throw new Error(
            "drawio_polish may relayout the whole page and requires diagram_wide annotation approval; "
            + "use scoped drawio_patch or request wider approval",
          )
        }
        const beforeXml = activeSession?.xml || await readDiagramFile(target)
        const beforePages = parseDrawio(beforeXml)
        const beforeQuality = qualityReport(beforePages, args.threshold)
        const editable = parseEditableDrawio(beforeXml)
        const page = selectEditablePage(editable, args.page)
        const changedIds = autoLayoutPage(page, args.direction)
        if (annotationGuard) {
          validateAnnotationPatchScope(annotationGuard, page.id, [], changedIds)
        }
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
          const preview = activeSession
            ? createPatchPreview(activeSession, beforeXml, afterXml, page.id, changedIds, diff)
            : null
          return JSON.stringify({
            ...result,
            backup: null,
            preview: preview ? patchPreviewPayload(preview) : null,
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
          const previewId = args.preview_id
            || annotationGuard?.authorization.previewId
            || activeSession.activePreviewId
            || undefined
          let preview = patchPreviewForCandidate(
            activeSession,
            previewId,
            args.base_revision!,
            afterXml,
          )
          if (!preview) {
            preview = createPatchPreview(activeSession, beforeXml, afterXml, page.id, changedIds, diff)
          }
          let previewApprovalToken = args.preview_approval_token || args.approval_token
          if (!annotationGuard && !previewApprovalToken) {
            const approval = resolvePatchPreviewApproval(
              activeSession,
              preview,
              {
                kind: "preview",
                plan: args.approval_plan?.trim() || defaultPatchPreviewPlan(preview),
              },
              { reviewId: args.approval_review_id, answer: args.approval_answer },
            )
            if (!approval.approved) return JSON.stringify(approval.payload, null, 2)
            previewApprovalToken = approval.approvalToken
          }
          validatePatchPreviewWrite(
            activeSession,
            preview.id,
            previewApprovalToken,
            args.base_revision!,
            afterXml,
          )
          const commit = await integratedCommit(activeSession, afterXml, args.base_revision!, "agent", null, {
            appliedPreviewId: preview.id,
          })
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
          if (annotationGuard) await consumeAnnotationAuthorization(activeSession, annotationGuard)
          writeResult = { backup: activeSession.backupFile }
        } else {
          throw new Error("formal Draw.io changes require an active preview session; call drawio_open before writing")
        }
        return JSON.stringify({
          ...result,
          backup: writeResult.backup
            ? workspaceRelative(context, writeResult.backup)
            : null,
        }, null, 2)
      },
    }),

    drawio_compare: defineTool({
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

    drawio_get_state: defineTool({
      description:
        "Read the latest XML and diagram-scoped persistent revision for the current session's active Draw.io file. Use this before changing a user-edited diagram.",
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

    drawio_preview_state: defineTool({
      description:
        "Preview an exact complete-XML candidate in the active Draw.io canvas without writing it. Use when semantic drawio_patch operations cannot express the requested change, including page backgrounds or advanced styles.",
      args: {
        base_revision: tool.schema
          .number()
          .int()
          .min(0)
          .describe("Exact revision returned by the immediately preceding drawio_get_state call"),
        xml: tool.schema.string().min(1).describe("Complete candidate Draw.io XML"),
        annotation_id: tool.schema
          .string()
          .optional()
          .describe("Open annotation task this candidate is intended to address"),
      },
      async execute(args, context) {
        const session = getIntegratedBridgeState().sessions.get(context.sessionID)
        if (!session) throw new Error("No active Draw.io session. Call drawio_open first.")
        await refreshIntegratedSession(session)
        if (args.base_revision !== session.revision) {
          return JSON.stringify({
            ok: false,
            error: "revision_conflict",
            current: integratedDocumentPayload(session),
            manualChanges: integratedManualChanges(session, args.base_revision),
          }, null, 2)
        }
        if (args.annotation_id) {
          const annotation = getDiagramAnnotations(session).get(args.annotation_id)
          if (!annotation) throw new Error(`annotation not found: ${args.annotation_id}`)
          if (annotation.status !== "open") {
            throw new Error(`annotation is ${annotation.status} and must be reopened before previewing`)
          }
        }
        if (args.xml.includes(PATCH_PREVIEW_ID_PREFIX)) {
          throw new Error("formal Draw.io XML must not contain reserved preview artifacts")
        }
        const afterPages = parseDrawio(args.xml)
        const report = validationReport(afterPages)
        if (!report.valid) {
          return JSON.stringify({ ok: false, error: "invalid_drawio_xml", validation: report }, null, 2)
        }
        const beforePages = parseDrawio(session.xml)
        const diff = diffParsedPages(beforePages, afterPages)
        const changeCount = diff.summary.added + diff.summary.removed + diff.summary.changed
          + diff.pageChanges.length
        if (changeCount === 0) throw new Error("candidate XML is identical to the active diagram")
        const firstAffectedPageId = diff.changed[0]?.pageId
          || (diff.added[0] ? previewPageIdFromKey(diff.added[0].key, diff.added[0].cell.id) : undefined)
          || (diff.removed[0] ? previewPageIdFromKey(diff.removed[0].key, diff.removed[0].cell.id) : undefined)
          || diff.pageChanges[0]?.pageId
          || afterPages[0]?.id
          || beforePages[0]?.id
          || "page-1"
        const preview = createPatchPreview(
          session,
          session.xml,
          args.xml,
          firstAffectedPageId,
          [],
          diff,
        )
        return JSON.stringify({
          ok: true,
          dryRun: true,
          file: path.relative(session.workspace, session.file).split(path.sep).join("/"),
          changedIds: preview.changedIds,
          changedQualifiedIds: preview.changedQualifiedIds,
          affectedPageIds: preview.affectedPageIds,
          diff,
          preview: patchPreviewPayload(preview),
          validation: report,
          previewGuidance:
            "The exact complete-XML candidate is visible in the bound Draw.io canvas. Compare Before and After, inspect the property list, then authorize the preview.",
        }, null, 2)
      },
    }),

    drawio_update_state: defineTool({
      description:
        "Apply an exact complete-XML candidate to the active Draw.io session. Preview it with drawio_preview_state, then use drawio_authorize_preview and OpenCode question; write only after revision and candidate-hash revalidation. Annotation changes still require their scoped approval.",
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
        preview_id: tool.schema
          .string()
          .optional()
          .describe("Preview id from drawio_preview_state; annotation approval may supply its linked preview"),
        preview_approval_token: tool.schema
          .string()
          .optional()
          .describe("Preview approval token; annotation approval_token also authorizes its linked preview"),
        approval_plan: tool.schema
          .string()
          .optional()
          .describe("Concise explanation shown in the OpenCode question review for a formal non-annotation write"),
        approval_review_id: tool.schema
          .string()
          .optional()
          .describe("Review id returned before invoking OpenCode question; pass it back with approval_answer"),
        approval_answer: tool.schema
          .string()
          .optional()
          .describe("Exact answer returned by OpenCode question; must be paired with approval_review_id"),
      },
      async execute(args, context) {
        const session = getIntegratedBridgeState().sessions.get(context.sessionID)
        if (!session) throw new Error("No active Draw.io session. Call drawio_open first.")
        await refreshIntegratedSession(session)
        if (args.base_revision !== session.revision) {
          return JSON.stringify({
            ok: false,
            error: "revision_conflict",
            current: integratedDocumentPayload(session),
            manualChanges: integratedManualChanges(session, args.base_revision),
          }, null, 2)
        }
        if (integratedHash(args.xml) === session.fileHash) {
          return JSON.stringify({
            ok: true,
            ...integratedDocumentPayload(session),
            validation: validationReport(parseDrawio(session.xml)),
            noOp: true,
          }, null, 2)
        }
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
        const previewId = args.preview_id || annotationGuard?.authorization.previewId || undefined
        const beforePages = parseDrawio(session.xml)
        const afterPages = parseDrawio(args.xml)
        const candidateValidation = validationReport(afterPages)
        if (!candidateValidation.valid) {
          return JSON.stringify({
            ok: false,
            error: "invalid_drawio_xml",
            validation: candidateValidation,
          }, null, 2)
        }
        const diff = diffParsedPages(beforePages, afterPages)
        let preview = patchPreviewForCandidate(
          session,
          previewId,
          args.base_revision,
          args.xml,
        )
        if (!preview) {
          const firstAffectedPageId = diff.changed[0]?.pageId
            || (diff.added[0] ? previewPageIdFromKey(diff.added[0].key, diff.added[0].cell.id) : undefined)
            || (diff.removed[0] ? previewPageIdFromKey(diff.removed[0].key, diff.removed[0].cell.id) : undefined)
            || diff.pageChanges[0]?.pageId
            || afterPages[0]?.id
            || beforePages[0]?.id
            || "page-1"
          preview = createPatchPreview(
            session,
            session.xml,
            args.xml,
            firstAffectedPageId,
            [],
            diff,
          )
        }
        let previewApprovalToken = args.preview_approval_token || args.approval_token
        if (!annotationGuard && !previewApprovalToken) {
          const approval = resolvePatchPreviewApproval(
            session,
            preview,
            {
              kind: "preview",
              plan: args.approval_plan?.trim() || defaultPatchPreviewPlan(preview),
            },
            { reviewId: args.approval_review_id, answer: args.approval_answer },
          )
          if (!approval.approved) return JSON.stringify(approval.payload, null, 2)
          previewApprovalToken = approval.approvalToken
        }
        validatePatchPreviewWrite(
          session,
          preview.id,
          previewApprovalToken,
          args.base_revision,
          args.xml,
        )
        const result = await integratedCommit(session, args.xml, args.base_revision, "agent", null, {
          appliedPreviewId: preview.id,
        })
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

    drawio_open: defineTool({
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
        const editorConnected = integratedEditorConnected(bound.session.sessionId, source)
        return JSON.stringify({
          ok: true,
          file: workspaceRelative(context, source).split(path.sep).join("/"),
          sessionId: context.sessionID,
          revision: bound.session.revision,
          revisionScope: "diagram",
          revisionWarning: bound.session.revisionWarning,
          openUrl: openUrl.toString(),
          editorUrl: editorUrl.toString(),
          editorConnected,
          shouldOpenBrowser: !editorConnected,
          browserAction: editorConnected
            ? "Keep the connected editor open. Do not call openwork_browser_open_url because reopening it can discard an in-progress manual edit."
            : "Call MobileWork's openwork_browser_open_url tool with url=openUrl and provider=builtin.",
          saveMode: "workspace-file",
          tokenExpiresAt: new Date(Date.now() + BRIDGE_TOKEN_TTL_MS).toISOString(),
        }, null, 2)
      },
    }),

    drawio_finalize: defineTool({
      description:
        "Finish a Draw.io task: refresh the latest revision, require validation and layout quality to pass, export an up-to-date PNG, bind the browser session, and report whether a new editor must be opened. Refuses to run while any fresh (requiresConfirmation=false) annotation is still open; returns pendingAnnotations for stale open annotations that still need user confirmation. Resolved and ignored annotations are terminal and do not block finalization.",
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
        if (!quality.pass) {
          throw new Error(
            `refusing to finalize Draw.io layout that failed the quality gate: `
            + `score=${quality.score}, threshold=${quality.threshold}, `
            + `issues=${JSON.stringify(quality.issues)}`,
          )
        }
        const bound = await bindIntegratedSession(context, source)
        const openAnnotationTasks = [...getDiagramAnnotations(bound.session).values()]
          .filter((task) => task.status === "open")
        const blockingAnnotations = openAnnotationTasks.filter(
          (task) => !annotationEffectiveState(bound.session, task).requiresConfirmation,
        )
        if (blockingAnnotations.length > 0) {
          throw new Error(
            `refusing to finalize: ${blockingAnnotations.length} unfinished fresh annotation(s) must be handled first — `
            + blockingAnnotations.map((task) => `${task.id}: ${task.instruction.slice(0, 120)}`).join(" | ")
            + ". Handle each one (plan, get approval, write, then drawio_resolve_annotation) before calling drawio_finalize again.",
          )
        }
        const pendingAnnotations = openAnnotationTasks.map((task) => {
          const state = annotationEffectiveState(bound.session, task)
          return {
            id: task.id,
            instruction: task.instruction,
            requiresConfirmation: state.requiresConfirmation,
            freshness: state.freshness,
          }
        })
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
        const editorConnected = integratedEditorConnected(bound.session.sessionId, source)
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
          pendingAnnotations,
          openUrl: openUrl.toString(),
          editorUrl: editorUrl.toString(),
          editorConnected,
          shouldOpenBrowser: !editorConnected,
          browserAction: editorConnected
            ? "Keep the connected editor open. Do not call openwork_browser_open_url because reopening it can discard an in-progress manual edit."
            : "Immediately call MobileWork's openwork_browser_open_url tool with url=openUrl and provider=builtin before ending the task.",
          saveMode: "workspace-file",
          tokenExpiresAt: new Date(Date.now() + BRIDGE_TOKEN_TTL_MS).toISOString(),
        }, null, 2)
},
    }),

    drawio_list_annotations: defineTool({
      description:
        "List annotation (review comment) tasks for an opened Draw.io file. Each task contains selected stable cell ids, page, region, user-selected modification scope, instruction, approval state and status.",
      args: {
        file: tool.schema.string().describe("Workspace-relative .drawio or .xml file bound to the session"),
        status: tool.schema
          .enum(["pending", "open", "fresh", "stale", "resolved", "ignored", "all"])
          .default("pending")
          .describe("Filter by status; pending/open return all unfinished tasks, while fresh and stale refine them"),
      },
      async execute(args, context) {
        const target = resolveWorkspacePath(context, args.file)
        const session = integratedSessionFor(context, target)
        if (!session) throw new Error("No active Draw.io session for this file. Call drawio_open first.")
        await refreshIntegratedSession(session)
        const map = getDiagramAnnotations(session)
        const entries = [...map.values()]
          .map((task) => ({ task, state: annotationEffectiveState(session, task) }))
          .sort((left, right) => right.task.updatedAt.localeCompare(left.task.updatedAt))
        const list = entries
          .filter((entry) => annotationMatchesStatus(entry.state, args.status))
          .map((entry) => annotationPayload(session, entry.task, entry.state))
        return JSON.stringify({
          file: workspaceRelative(context, target).split(path.sep).join("/"),
          sessionId: session.sessionId,
          currentRevision: session.revision,
          count: list.length,
          counts: annotationStatusCounts(entries.map((entry) => entry.state)),
          annotations: list,
          guidance: "Pending/open include fresh and stale unfinished tasks; resolved and ignored are terminal until the user reopens them. Ask for confirmation before executing any task with requiresConfirmation=true. For each executable task: call drawio_get_annotation and drawio_get_state, dry-run, disclose scope and exact stable IDs with drawio_authorize_annotation_change, submit its returned arguments unchanged to OpenCode question, then retry authorization with approval_review_id=reviewId and approval_answer set to the exact returned answer. Only an explicit confirmation can return the one-time token. Never modify first and ask later.",
        }, null, 2)
      },
    }),

    drawio_get_annotation: defineTool({
      description:
        "Read one annotation task in full and make it the active guarded task, including selected stable cell ids, region, user-selected scope, instruction, base revision, staleness and latest per-cell snapshots.",
      args: {
        file: tool.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),
        id: tool.schema.string().describe("Annotation id returned by drawio_list_annotations"),
      },
      async execute(args, context) {
        const session = annotationSessionFor(context, args.file)
        if (!session) throw new Error("No active Draw.io session. Call drawio_open first.")
        await refreshIntegratedSession(session)
        const map = getDiagramAnnotations(session)
        const task = map.get(args.id)
        if (!task) throw new Error(`annotation not found: ${args.id}`)
        session.activeAnnotationId = task.status === "open" ? task.id : null
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
          guidance: task.status !== "open"
            ? `This annotation is ${task.status} and terminal. Do not process it unless the user reopens it in the annotation panel.`
            : annotationState.requiresConfirmation
              ? "This annotation is stale but still open. Ask the user whether to execute it. After confirmation, call drawio_get_state, generate a dry-run canvas preview and exact changed-id plan, then call drawio_authorize_annotation_change with the preview id. Complete the returned OpenCode question flow before applying the exact hash-matched candidate; resolve only after the write succeeds."
              : "Call drawio_get_state, generate a dry-run canvas preview and exact changed-id plan, then call drawio_authorize_annotation_change with the preview id. After approval, apply the exact hash-matched candidate and resolve the annotation.",
        }, null, 2)
      },
    }),

    drawio_authorize_preview: defineTool({
      description:
        "Request human approval for the exact candidate visible in the Draw.io canvas. The first call returns exact OpenCode question arguments and never writes. After question returns, retry with approval_review_id and the exact approval_answer; confirmation applies the hash-matched candidate. Cancel, close, or custom feedback never authorizes a write.",
      args: {
        file: tool.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),
        preview_id: tool.schema.string().describe("Preview id returned by drawio_patch/drawio_polish dry-run or drawio_preview_state"),
        plan: tool.schema.string().min(1).describe("Concise explanation of the visible candidate change"),
        approval_review_id: tool.schema
          .string()
          .optional()
          .describe("Review id returned by the first call; pass it back after OpenCode question returns"),
        approval_answer: tool.schema
          .string()
          .optional()
          .describe("Exact answer returned by OpenCode question; must be paired with approval_review_id"),
      },
      async execute(args, context) {
        const session = annotationSessionFor(context, args.file)
        if (!session) throw new Error("No active Draw.io session. Call drawio_open first.")
        await refreshIntegratedSession(session)
        if (activeAnnotationTask(session)) {
          throw new Error(
            "an annotation task is active; authorize its scoped preview with drawio_authorize_annotation_change instead",
          )
        }
        const preview = getIntegratedBridgeState().patchPreviews.get(args.preview_id)
        if (!preview || preview.sessionId !== session.sessionId
          || preview.diagramKey !== integratedDiagramKey(session.file)) {
          throw new Error("patch preview not found for this session and diagram")
        }
        currentPatchPreview(session)
        if (preview.status === "applied") {
          return JSON.stringify({
            ok: true,
            applied: true,
            alreadyApplied: true,
            ...integratedDocumentPayload(session),
            preview: patchPreviewPayload(preview),
            guidance: "This exact preview was already applied. Do not request another approval or write it again.",
          }, null, 2)
        }
        if (preview.status !== "pending") {
          throw new Error(`patch preview is ${preview.status}; generate a fresh dry-run preview`)
        }
        const approval = resolvePatchPreviewApproval(
          session,
          preview,
          { kind: "preview", plan: args.plan },
          { reviewId: args.approval_review_id, answer: args.approval_answer },
        )
        if (!approval.approved) return JSON.stringify(approval.payload, null, 2)
        const approvalToken = approval.approvalToken
        validatePatchPreviewWrite(
          session,
          preview.id,
          approvalToken,
          preview.baseRevision,
          preview.candidateXml,
        )
        const applied = await integratedCommit(
          session,
          preview.candidateXml,
          preview.baseRevision,
          "agent",
          null,
          { appliedPreviewId: preview.id },
        )
        if (applied.conflict) {
          currentPatchPreview(session)
          return JSON.stringify({
            ok: false,
            applied: false,
            error: "revision_conflict",
            current: integratedDocumentPayload(applied.current),
            manualChanges: applied.manualChanges,
          }, null, 2)
        }
        if (applied.invalid) {
          throw new Error(`approved preview failed validation: ${JSON.stringify(applied.report.errors)}`)
        }
        return JSON.stringify({
          ok: true,
          applied: true,
          file: path.relative(session.workspace, session.file).split(path.sep).join("/"),
          revision: applied.document.revision,
          backup: applied.document.backupFile
            ? path.relative(session.workspace, applied.document.backupFile).split(path.sep).join("/")
            : null,
          validation: applied.validation,
          preview: patchPreviewPayload(preview),
          guidance:
            "The approved preview was applied immediately. Do not call drawio_patch or drawio_polish again for this candidate; finalize the diagram if an updated export is required.",
        }, null, 2)
      },
    }),

    drawio_authorize_annotation_change: defineTool({
      description:
        "Request the user's pre-change approval for one annotation plan. The first call returns an exact OpenCode question request and no token. After question returns, retry with approval_review_id and the exact approval_answer; confirmation returns a one-time token bound to the current revision, preview hash, declared stable IDs and requested scope. Cancel, close, or custom feedback never authorizes a write.",
      args: {
        file: tool.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),
        id: tool.schema.string().describe("Annotation id returned by drawio_get_annotation"),
        plan: tool.schema
          .string()
          .min(1)
          .describe("Concrete pre-change explanation of what will be modified"),
        proposed_changed_ids: tool.schema
          .array(tool.schema.string())
          .min(1)
          .describe("Complete stable-ID allowlist disclosed before writing; diagram_wide uses pageId:cellId"),
        requested_scope: tool.schema
          .enum(["selection_only", "selection_and_edges", "surrounding_layout", "diagram_wide"])
          .describe("Scope needed by this plan; normally equal to or narrower than the user's annotation scope"),
        escalation_reason: tool.schema
          .string()
          .optional()
          .describe("Required when requesting a scope wider than the user originally selected"),
        preview_id: tool.schema
          .string()
          .optional()
          .describe("Preview id returned by the immediately preceding drawio_patch dry-run; defaults to the active preview"),
        approval_review_id: tool.schema
          .string()
          .optional()
          .describe("Review id returned by the first call; pass it back after OpenCode question returns"),
        approval_answer: tool.schema
          .string()
          .optional()
          .describe("Exact answer returned by OpenCode question; must be paired with approval_review_id"),
      },
      async execute(args, context) {
        const session = annotationSessionFor(context, args.file)
        if (!session) throw new Error("No active Draw.io session. Call drawio_open first.")
        await refreshIntegratedSession(session)
        const task = getDiagramAnnotations(session).get(args.id)
        if (!task) throw new Error(`annotation not found: ${args.id}`)
        if (task.status !== "open") {
          throw new Error(`annotation is ${task.status} and must be reopened before authorization: ${args.id}`)
        }
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
        const existingAuthorization = session.annotationAuthorizations.get(task.id)
        if (
          existingAuthorization
          && !existingAuthorization.consumedAt
          && existingAuthorization.sessionId === session.sessionId
          && existingAuthorization.diagramKey === integratedDiagramKey(session.file)
          && existingAuthorization.baseRevision === session.revision
          && existingAuthorization.scope === requestedScope
          && (args.preview_id || existingAuthorization.previewId) === existingAuthorization.previewId
        ) {
          const existingIds = new Set(existingAuthorization.proposedChangedIds)
          if (
            existingIds.size === proposedChangedIds.length
            && proposedChangedIds.every((id) => existingIds.has(id))
          ) {
            return JSON.stringify(
              annotationAuthorizationPayload(session, task, existingAuthorization, true),
              null,
              2,
            )
          }
        }
        const preview = args.preview_id
          ? getIntegratedBridgeState().patchPreviews.get(args.preview_id)
          : currentPatchPreview(session)
        if (!preview) {
          throw new Error("annotation approval requires the active dry-run preview; generate it before requesting approval")
        }
        if (preview.sessionId !== session.sessionId
          || preview.diagramKey !== integratedDiagramKey(session.file)) {
          throw new Error("patch preview belongs to a different session or diagram")
        }
        currentPatchPreview(session)
        if (preview.status !== "pending") {
          throw new Error(`patch preview is ${preview.status}; generate a fresh dry-run preview`)
        }
        const previewChangedIds = requestedScope === "diagram_wide"
          ? new Set(preview.changedQualifiedIds)
          : new Set(preview.changedIds)
        const proposedForPreview = new Set(proposedChangedIds)
        if (
          previewChangedIds.size !== proposedForPreview.size
          || [...previewChangedIds].some((id) => !proposedForPreview.has(id))
        ) {
          throw new Error("proposed_changed_ids must exactly match the stable IDs shown in the active preview")
        }
        const approval = resolvePatchPreviewApproval(
          session,
          preview,
          {
            kind: "annotation",
            plan: args.plan,
            annotationId: task.id,
            requestedScope,
            proposedChangedIds,
            escalationReason,
          },
          { reviewId: args.approval_review_id, answer: args.approval_answer },
        )
        if (!approval.approved) return JSON.stringify(approval.payload, null, 2)
        await refreshIntegratedSession(session)
        validatePatchPreviewWrite(
          session,
          preview.id,
          approval.approvalToken,
          preview.baseRevision,
          preview.candidateXml,
        )
        const now = new Date().toISOString()
        const approvedScope = approval.review.requestedScope || requestedScope
        const approvedChangedIds = approval.review.proposedChangedIds.length > 0
          ? approval.review.proposedChangedIds
          : proposedChangedIds
        const authorization: AnnotationAuthorization = {
          approvalToken: approval.approvalToken,
          sessionId: session.sessionId,
          diagramKey: integratedDiagramKey(session.file),
          scope: approvedScope,
          plan: approval.review.plan,
          proposedChangedIds: approvedChangedIds,
          escalationReason: approval.review.escalationReason,
          baseRevision: preview.baseRevision,
          approvedAt: now,
          consumedAt: null,
          previewId: preview.id,
        }
        session.annotationAuthorizations.set(task.id, authorization)
        task.updatedAt = now
        session.activeAnnotationId = task.id
        await persistStoredAnnotations(session)
        broadcastAnnotation(session, task, "authorization-approved")
        return JSON.stringify(annotationAuthorizationPayload(session, task, authorization), null, 2)
      },
    }),

    drawio_resolve_annotation: defineTool({
      description:
        "Mark an annotation task as resolved after the requested change has been written (or after deciding no change is needed). This updates status and stores a summary; it does not modify the diagram itself.",
      args: {
        file: tool.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),
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
        const session = annotationSessionFor(context, args.file)
        if (!session) throw new Error("No active Draw.io session. Call drawio_open first.")
        await refreshIntegratedSession(session)
        const map = getDiagramAnnotations(session)
        const task = map.get(args.id)
        if (!task) throw new Error(`annotation not found: ${args.id}`)
        if (task.status !== "open") {
          throw new Error(`annotation is ${task.status} and must be reopened before it can be resolved: ${args.id}`)
        }
        const now = new Date().toISOString()
        task.status = "resolved"
        task.result = {
          summary: args.summary,
          changedIds: args.changed_ids || [],
          revision: session.revision,
          updatedAt: now,
        }
        task.resolvedAt = now
        task.ignoredAt = null
        task.ignoredReason = null
        task.updatedAt = now
        map.set(task.id, task)
        clearAnnotationSessionState(session, task.id)
        await persistStoredAnnotations(session)
        broadcastAnnotation(session, task, "updated")
        return JSON.stringify({
          ok: true,
          annotation: annotationPayload(session, task),
        }, null, 2)
      },
    }),
  }

  drawioToolsets.set(toolApi, toolset)
  return toolset
}

export function createDrawioTool(
  name: string,
  toolApi: DrawioToolFactory,
): DrawioToolDefinition {
  const toolset = createDrawioToolset(toolApi)
  const definition = (toolset as Record<string, DrawioToolDefinition | undefined>)[name]
  if (!definition) {
    throw new Error(`Unknown Draw.io tool: ${name}`)
  }
  return definition
}
