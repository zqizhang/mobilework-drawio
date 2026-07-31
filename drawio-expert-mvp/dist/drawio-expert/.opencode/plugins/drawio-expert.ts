import { promises as fs } from "node:fs"
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
  }
}

type ParsedPage = {
  id: string
  name: string
  compressed: boolean
  cells: ParsedCell[]
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
const MAX_FILE_BYTES = 20 * 1024 * 1024
const SAFE_ID = /^[A-Za-z0-9_.:-]+$/

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

function resolveWorkspacePath(
  context: { directory: string; worktree?: string },
  requestedPath: string,
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
  if (!ALLOWED_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
    throw new Error(`unsupported file extension; expected ${ALLOWED_EXTENSIONS.join(" or ")}`)
  }

  return target
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
  return {
    x: numberAttribute(geometry["@_x"]),
    y: numberAttribute(geometry["@_y"]),
    width: numberAttribute(geometry["@_width"]),
    height: numberAttribute(geometry["@_height"]),
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

  for (const node of nodes) {
    const rank = ranks.get(node.id) || 0
    const row = byRank.get(rank) || []
    row.push(node)
    byRank.set(rank, row)
  }

  const nodeCells = nodes.map((node) => {
    const rank = ranks.get(node.id) || 0
    const offset = (byRank.get(rank) || []).findIndex((candidate) => candidate.id === node.id)
    const x = direction === "left-to-right" ? 80 + rank * 240 : 80 + offset * 240
    const y = direction === "left-to-right" ? 80 + offset * 140 : 80 + rank * 140
    const width = node.kind === "decision" ? 140 : 160
    const height = node.kind === "decision" ? 100 : 70
    return `      <mxCell id="${xmlEscape(node.id)}" value="${xmlEscape(node.label)}" style="${xmlEscape(nodeStyle(node.kind))}" vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/>
      </mxCell>`
  })

  const edgeCells = edges.map((edge, index) => {
    const id = edge.id || `edge-${index + 1}`
    const style = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;"
    return `      <mxCell id="${xmlEscape(id)}" value="${xmlEscape(edge.label || "")}" style="${style}" edge="1" parent="1" source="${xmlEscape(edge.source)}" target="${xmlEscape(edge.target)}">
        <mxGeometry relative="1" as="geometry"/>
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
