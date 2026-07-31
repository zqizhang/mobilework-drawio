import { promises as fs } from "node:fs"
import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { createServer, type IncomingMessage, type Server } from "node:http"
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
const RENDER_EXTENSIONS = [".svg", ".png"]
const ARTIFACT_EXTENSIONS = [".html"]
const MAX_FILE_BYTES = 20 * 1024 * 1024
const BRIDGE_TOKEN_TTL_MS = 12 * 60 * 60 * 1000
const ARTIFACT_MARKER = "drawio-expert-artifact:v1"
const SAFE_ID = /^[A-Za-z0-9_.:-]+$/
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

function resolveWorkspaceFile(
  context: { directory: string; worktree?: string },
  requestedPath: string,
  allowedExtensions: string[],
): string {
  if (!requestedPath.trim()) throw new Error("file must be a non-empty path")
  if (path.isAbsolute(requestedPath)) {
    throw new Error("absolute paths are not allowed; use a workspace-relative path")
  }

  const workspace = path.resolve(context.worktree || context.directory)
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
  return {
    x: numberAttribute(geometry["@_x"]),
    y: numberAttribute(geometry["@_y"]),
    width: numberAttribute(geometry["@_width"]),
    height: numberAttribute(geometry["@_height"]),
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

function vertexRectangle(cell: ParsedCell): Rectangle | null {
  const geometry = cell.geometry
  if (
    geometry?.x === undefined
    || geometry.y === undefined
    || geometry.width === undefined
    || geometry.height === undefined
  ) {
    return null
  }
  return {
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
  }
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

function edgePolyline(
  edge: ParsedCell,
  vertices: Map<string, ParsedCell>,
): Point[] | null {
  const source = edge.source ? vertices.get(edge.source) : undefined
  const target = edge.target ? vertices.get(edge.target) : undefined
  const sourceRectangle = source ? vertexRectangle(source) : null
  const targetRectangle = target ? vertexRectangle(target) : null
  if (!sourceRectangle || !targetRectangle) return null

  const start = rectangleCenter(sourceRectangle)
  const end = rectangleCenter(targetRectangle)
  const waypoints = edge.geometry?.points || []
  if (waypoints.length > 0) return [start, ...waypoints, end]

  if (Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)) {
    const middleX = (start.x + end.x) / 2
    return [start, { x: middleX, y: start.y }, { x: middleX, y: end.y }, end]
  }
  const middleY = (start.y + end.y) / 2
  return [start, { x: start.x, y: middleY }, { x: end.x, y: middleY }, end]
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
    emptyLabels: 0,
    missingLineJumps: 0,
  }

  for (const page of pages) {
    const vertices = page.cells.filter((cell) => cell.vertex)
    const edges = page.cells.filter((cell) => cell.edge)
    const verticesById = new Map(vertices.map((cell) => [cell.id, cell]))

    for (let leftIndex = 0; leftIndex < vertices.length; leftIndex += 1) {
      const left = vertices[leftIndex]
      const leftRectangle = vertexRectangle(left)
      if (!left.label?.trim()) {
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
        const rightRectangle = vertexRectangle(right)
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
    for (const edge of edges) {
      const polyline = edgePolyline(edge, verticesById)
      if (polyline) polylines.set(edge.id, polyline)
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
      for (const vertex of vertices) {
        if (vertex.id === edge.source || vertex.id === edge.target) continue
        const rectangle = vertexRectangle(vertex)
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
      - metrics.emptyLabels * 2
      - metrics.missingLineJumps,
  )
  return {
    pass:
      validation.valid
      && metrics.overlaps === 0
      && metrics.edgeNodeIntersections === 0
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

async function replaceGeneratedArtifact(target: string, content: string, overwrite: boolean) {
  await fs.mkdir(path.dirname(target), { recursive: true })
  let exists = false
  try {
    exists = (await fs.stat(target)).isFile()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }

  if (exists && !overwrite) {
    const existing = await fs.readFile(target, "utf8")
    if (!existing.slice(0, 512).includes(ARTIFACT_MARKER)) {
      throw new Error(
        "artifact output already exists and was not generated by Draw.io Expert; "
        + "set overwrite=true to preserve and replace it",
      )
    }
  }

  if (exists && overwrite) {
    return atomicWrite(target, content, true)
  }

  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(temporary, content, "utf8")
  if (!exists) {
    await fs.rename(temporary, target)
    return { backup: null }
  }

  const rollback = `${target}.${process.pid}.${Date.now()}.rollback`
  await fs.rename(target, rollback)
  try {
    await fs.rename(temporary, target)
    await fs.rm(rollback, { force: true })
    return { backup: null }
  } catch (error) {
    await fs.rm(target, { force: true })
    await fs.rename(rollback, target)
    throw error
  }
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

function runProcess(
  command: string,
  args: string[],
  timeoutMs = 60_000,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`Draw.io CLI timed out after ${timeoutMs / 1000} seconds`))
    }, timeoutMs)

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    child.on("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
      } else {
        reject(new Error(
          `Draw.io CLI exited with code ${code}: ${stderr.trim() || stdout.trim() || "no output"}`,
        ))
      }
    })
  })
}

async function renderWithDrawioCli(
  input: string,
  output: string,
): Promise<{ command: string; stdout: string; stderr: string }> {
  const configured = process.env.DRAWIO_CLI?.trim()
  const defaults = process.platform === "win32"
    ? ["drawio.exe", "draw.io.exe", "drawio", "draw.io"]
    : ["drawio", "draw.io"]
  const candidates = [...new Set([...(configured ? [configured] : []), ...defaults])]
  const notFound: string[] = []

  for (const command of candidates) {
    try {
      const result = await runProcess(command, ["--export", "--output", output, input])
      return { command, ...result }
    } catch (error) {
      const processError = error as NodeJS.ErrnoException
      if (processError.code === "ENOENT") {
        notFound.push(command)
        continue
      }
      throw error
    }
  }

  throw new Error(
    `Draw.io Desktop CLI was not found (${notFound.join(", ")}). `
    + "Add it to PATH or set DRAWIO_CLI to the executable path, then reload OpenWork.",
  )
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

export const DrawioExpertPlugin: Plugin = async () => ({
  tool: {
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
          created: path.relative(context.worktree || context.directory, target),
          backup: writeResult.backup
            ? path.relative(context.worktree || context.directory, writeResult.backup)
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
        const xml = await readDiagramFile(target)
        const pages = parseDrawio(xml)
        return JSON.stringify({
          file: path.relative(context.worktree || context.directory, target),
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
        "Score Draw.io layout quality and report actionable issues including overlaps, edge-node intersections, edge crossings, empty labels, and missing arc line jumps.",
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
        const pages = parseDrawio(await readDiagramFile(target))
        return JSON.stringify({
          file: path.relative(context.worktree || context.directory, target),
          ...qualityReport(pages, args.threshold),
        }, null, 2)
      },
    }),

    drawio_patch: tool({
      description:
        "Apply semantic node and edge operations to an existing Draw.io file. Preserves unrelated cells and creates a recoverable backup unless dry_run is true.",
      args: {
        file: tool.schema.string().describe("Workspace-relative .drawio or .xml file"),
        page: tool.schema
          .string()
          .optional()
          .describe("Page id or name; defaults to the first page"),
        operations: tool.schema
          .array(patchOperationSchema)
          .min(1)
          .describe("Ordered semantic operations"),
        dry_run: tool.schema
          .boolean()
          .default(false)
          .describe("Return the diff and validation result without writing"),
      },
      async execute(args, context) {
        const target = resolveWorkspacePath(context, args.file)
        const beforeXml = await readDiagramFile(target)
        const beforePages = parseDrawio(beforeXml)
        const editable = parseEditableDrawio(beforeXml)
        const page = selectEditablePage(editable, args.page)
        const changedIds = applyPatchOperations(page, args.operations as PatchOperation[])
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

        const writeResult = await atomicWrite(target, afterXml, true)
        return JSON.stringify({
          file: path.relative(context.worktree || context.directory, target),
          dryRun: false,
          backup: writeResult.backup
            ? path.relative(context.worktree || context.directory, writeResult.backup)
            : null,
          changedIds,
          diff,
          ...report,
        }, null, 2)
      },
    }),

    drawio_polish: tool({
      description:
        "Run a deterministic quality loop: analyze, auto-layout and reroute a page, validate the result, enforce a quality threshold, optionally write with backup, and optionally render an SVG or PNG preview.",
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
        render_output: tool.schema
          .string()
          .optional()
          .describe("Optional workspace-relative .svg or .png preview path after writing"),
      },
      async execute(args, context) {
        const target = resolveWorkspacePath(context, args.file)
        const beforeXml = await readDiagramFile(target)
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
          file: path.relative(context.worktree || context.directory, target),
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
            render: args.render_output
              ? { ok: false, skipped: true, reason: "rendering is skipped during dry-run" }
              : null,
          }, null, 2)
        }
        if (!afterQuality.pass) {
          throw new Error(
            `polished diagram did not meet quality threshold ${args.threshold}; `
            + `score=${afterQuality.score}, issues=${JSON.stringify(afterQuality.issues)}`,
          )
        }

        const renderTarget = args.render_output
          ? resolveWorkspaceFile(context, args.render_output, RENDER_EXTENSIONS)
          : null
        const writeResult = await atomicWrite(target, afterXml, true)
        let render: Record<string, unknown> | null = null
        if (renderTarget) {
          const output = renderTarget
          await fs.mkdir(path.dirname(output), { recursive: true })
          let outputExists = false
          try {
            outputExists = (await fs.stat(output)).isFile()
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
          }
          const previewBackup = outputExists
            ? `${output}.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`
            : null
          if (previewBackup) await fs.rename(output, previewBackup)
          try {
            const cli = await renderWithDrawioCli(target, output)
            const stat = await fs.stat(output)
            if (!stat.isFile() || stat.size === 0) {
              throw new Error("Draw.io CLI completed without producing a non-empty output file")
            }
            render = {
              ok: true,
              output: path.relative(context.worktree || context.directory, output),
              bytes: stat.size,
              backup: previewBackup
                ? path.relative(context.worktree || context.directory, previewBackup)
                : null,
              command: cli.command,
            }
          } catch (error) {
            await fs.rm(output, { force: true })
            if (previewBackup) await fs.rename(previewBackup, output)
            render = {
              ok: false,
              output: args.render_output,
              error: (error as Error).message,
            }
          }
        }

        return JSON.stringify({
          ...result,
          backup: writeResult.backup
            ? path.relative(context.worktree || context.directory, writeResult.backup)
            : null,
          render,
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
          before: path.relative(context.worktree || context.directory, beforeTarget),
          after: path.relative(context.worktree || context.directory, afterTarget),
          diff: diffParsedPages(beforePages, afterPages),
          beforeStats: validationReport(beforePages).stats,
          afterStats: validationReport(afterPages).stats,
        }, null, 2)
      },
    }),

    drawio_render: tool({
      description:
        "Export a Draw.io file to SVG or PNG with the local Draw.io Desktop CLI. Uses DRAWIO_CLI when the executable is not on PATH.",
      args: {
        file: tool.schema.string().describe("Workspace-relative .drawio or .xml input file"),
        output: tool.schema.string().describe("Workspace-relative .svg or .png output file"),
        overwrite: tool.schema
          .boolean()
          .default(false)
          .describe("Allow replacement; the previous preview is preserved as a backup"),
      },
      async execute(args, context) {
        const input = resolveWorkspacePath(context, args.file)
        const output = resolveWorkspaceFile(context, args.output, RENDER_EXTENSIONS)
        if (input === output) throw new Error("render output must differ from the input file")

        const pages = parseDrawio(await readDiagramFile(input))
        const report = validationReport(pages)
        if (!report.valid) {
          throw new Error(`refusing to render invalid diagram: ${JSON.stringify(report.errors)}`)
        }

        await fs.mkdir(path.dirname(output), { recursive: true })
        let outputExists = false
        try {
          outputExists = (await fs.stat(output)).isFile()
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
        }
        if (outputExists && !args.overwrite) {
          throw new Error("render output already exists; set overwrite=true to preserve and replace it")
        }

        const backup = outputExists
          ? `${output}.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`
          : null
        if (backup) await fs.rename(output, backup)

        try {
          const cli = await renderWithDrawioCli(input, output)
          const stat = await fs.stat(output)
          if (!stat.isFile() || stat.size === 0) {
            throw new Error("Draw.io CLI completed without producing a non-empty output file")
          }
          return JSON.stringify({
            input: path.relative(context.worktree || context.directory, input),
            output: path.relative(context.worktree || context.directory, output),
            format: path.extname(output).slice(1).toLowerCase(),
            bytes: stat.size,
            backup: backup
              ? path.relative(context.worktree || context.directory, backup)
              : null,
            command: cli.command,
            stdout: cli.stdout,
            stderr: cli.stderr,
            sourceValidation: report,
          }, null, 2)
        } catch (error) {
          await fs.rm(output, { force: true })
          if (backup) await fs.rename(backup, output)
          throw error
        }
      },
    }),

    drawio_open: tool({
      description:
        "Create an OpenWork HTML Artifact that embeds the intranet Draw.io editor and securely "
        + "loads and saves one validated workspace diagram through a short-lived bridge token.",
      args: {
        file: tool.schema.string().describe("Workspace-relative .drawio or .xml file to open"),
        output: tool.schema
          .string()
          .optional()
          .describe(
            "Workspace-relative .html Artifact path; defaults to <file>.openwork.html",
          ),
        drawio_url: tool.schema
          .string()
          .optional()
          .describe(
            "Browser-reachable intranet Draw.io URL; defaults to DRAWIO_WEB_URL or http://127.0.0.1:8080",
          ),
        bridge_url: tool.schema
          .string()
          .optional()
          .describe(
            "Browser-reachable bridge base URL; defaults to DRAWIO_BRIDGE_PUBLIC_URL or the bound host and port",
          ),
        overwrite: tool.schema
          .boolean()
          .default(false)
          .describe(
            "Allow replacing a non-generated HTML file; generated Artifacts refresh automatically",
          ),
      },
      async execute(args, context) {
        const workspace = path.resolve(context.worktree || context.directory)
        const source = resolveWorkspacePath(context, args.file)
        const initialXml = await readDiagramFile(source)
        const pages = parseDrawio(initialXml)
        const report = validationReport(pages)
        if (!report.valid) {
          throw new Error(
            `refusing to open invalid diagram: ${JSON.stringify(report.errors)}`,
          )
        }

        const artifactRequest = args.output?.trim() || `${args.file}.openwork.html`
        const artifact = resolveWorkspaceFile(context, artifactRequest, ARTIFACT_EXTENSIONS)
        if (artifact === source) throw new Error("artifact output must differ from the diagram")

        const drawioUrl = drawioEditorUrl(
          args.drawio_url?.trim()
          || process.env.DRAWIO_WEB_URL?.trim()
          || "http://127.0.0.1:8080",
        )
        const bridge = await ensureBridgeStarted()
        let publicBridgeValue = args.bridge_url?.trim()
          || process.env.DRAWIO_BRIDGE_PUBLIC_URL?.trim()
        if (!publicBridgeValue) {
          if (["0.0.0.0", "::", "[::]"].includes(bridge.host)) {
            throw new Error(
              "DRAWIO_BRIDGE_HOST listens on all interfaces; set DRAWIO_BRIDGE_PUBLIC_URL "
              + "to the browser-reachable intranet URL, for example http://192.168.1.20:8799",
            )
          }
          const browserHost = bridge.host.includes(":") ? `[${bridge.host}]` : bridge.host
          publicBridgeValue = `http://${browserHost}:${bridge.port}`
        }
        const bridgeUrl = normalizeWebUrl(publicBridgeValue, "bridge_url")
        const authToken = randomBytes(32).toString("base64url")
        const sourceRelative = path.relative(workspace, source).split(path.sep).join("/")
        const artifactRelative = path.relative(workspace, artifact).split(path.sep).join("/")
        const html = buildDrawioArtifactHtml({
          title: path.basename(sourceRelative),
          sourceFile: sourceRelative,
          drawioUrl,
          bridgeUrl,
          authToken,
          initialXml,
        })

        const state = getBridgeState()
        state.grants.set(authToken, {
          file: source,
          workspace,
          expiresAt: Date.now() + BRIDGE_TOKEN_TTL_MS,
        })
        let writeResult: { backup: string | null }
        try {
          writeResult = await replaceGeneratedArtifact(artifact, html, args.overwrite)
        } catch (error) {
          state.grants.delete(authToken)
          throw error
        }

        const warnings: string[] = []
        if (drawioUrl.protocol !== bridgeUrl.protocol) {
          warnings.push(
            "Draw.io and bridge use different URL schemes; HTTPS OpenWork pages may block HTTP iframe or API content.",
          )
        }
        if (["localhost", "127.0.0.1", "[::1]"].includes(drawioUrl.hostname)) {
          warnings.push(
            "drawio_url is loopback-only; remote intranet collaborators must use a server LAN hostname or IP.",
          )
        }
        if (["localhost", "127.0.0.1", "[::1]"].includes(bridgeUrl.hostname)) {
          warnings.push(
            "bridge_url is loopback-only; remote intranet collaborators must use DRAWIO_BRIDGE_PUBLIC_URL.",
          )
        }

        return JSON.stringify({
          type: "drawio-artifact",
          file: sourceRelative,
          artifact: artifactRelative,
          files: [artifactRelative],
          open: artifactRelative,
          editorUrl: drawioUrl.toString(),
          bridgeUrl: bridgeUrl.toString(),
          bridgeBinding: `${bridge.host}:${bridge.port}`,
          tokenExpiresAt: new Date(Date.now() + BRIDGE_TOKEN_TTL_MS).toISOString(),
          saveMode: "direct-workspace",
          backup: writeResult.backup
            ? path.relative(workspace, writeResult.backup).split(path.sep).join("/")
            : null,
          validation: report,
          warnings,
        }, null, 2)
      },
    }),

    drawio_validate: tool({
      description:
        "Validate Draw.io XML, page structure, cell ids, parent/source/target references, and node geometry.",
      args: {
        file: tool.schema.string().describe("Workspace-relative .drawio or .xml file"),
      },
      async execute(args, context) {
        const target = resolveWorkspacePath(context, args.file)
        try {
          const xml = await readDiagramFile(target)
          const pages = parseDrawio(xml)
          return JSON.stringify({
            file: path.relative(context.worktree || context.directory, target),
            ...validationReport(pages),
          }, null, 2)
        } catch (error) {
          return JSON.stringify({
            file: args.file,
            valid: false,
            errors: [(error as Error).message],
            warnings: [],
            stats: { pages: 0, nodes: 0, edges: 0 },
          }, null, 2)
        }
      },
    }),
  },
})
