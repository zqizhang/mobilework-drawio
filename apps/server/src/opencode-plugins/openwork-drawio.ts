import { z } from "zod";

const DRAWIO_AGENT_GUIDANCE = `## Draw.io side-panel diagrams

OpenWork has a session-scoped Draw.io editor in the right side panel.

When the user asks to create or edit a diagram:
1. Open or focus the editor with openwork_execute id "drawio.panel.open".
2. Call drawio_get_state immediately before making a change. Its XML is the latest state, including manual edits made by the user.
3. Preserve the user's existing cells and changes unless the user explicitly asks to replace them.
4. Call drawio_update_state with the exact revision returned by drawio_get_state and the complete updated draw.io XML.
5. If the update reports revision_conflict, call drawio_get_state again, reconcile your intended edit with the new XML, and retry. Never resubmit stale XML.
6. When the user asks for SVG, PNG, editable SVG, editable PNG, PDF, JPEG, or HTML, keep the side panel open and call drawio_side_panel_export.

The XML state is the source of truth. Do not rely on screenshots or overwrite a newer revision.`;

const updateArgsSchema = z.object({
  baseRevision: z.number().int().min(0).describe(
    "Exact revision returned by the most recent drawio_get_state call.",
  ),
  xml: z.string().min(1).describe(
    "Complete updated draw.io XML rooted at mxfile or mxGraphModel.",
  ),
});

const exportArgsSchema = z.object({
  format: z.enum(["svg", "xmlsvg", "png", "xmlpng", "pdf", "jpeg", "html2"]).describe(
    "Draw.io Web export format: SVG, editable SVG, PNG, editable PNG, PDF, JPEG, or HTML.",
  ),
  fileName: z.string().min(1).max(255).optional().describe(
    "Optional output file name. Directory components are ignored by the desktop bridge.",
  ),
});

type DrawioToolContext = {
  sessionID: string;
};

function bridgeUrl(): URL {
  const configured = process.env.OPENWORK_DRAWIO_BRIDGE_URL?.trim();
  if (!configured) throw new Error("The OpenWork Draw.io bridge is not running.");
  const url = new URL(configured);
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]";
  if (url.protocol !== "http:" || !loopback) {
    throw new Error("The OpenWork Draw.io bridge URL is not a loopback HTTP address.");
  }
  return url;
}

function diagramUrl(sessionID: string): URL {
  const url = new URL("/api/diagram", bridgeUrl());
  url.searchParams.set("sessionId", sessionID);
  return url;
}

function exportUrl(sessionID: string): URL {
  const url = new URL("/api/export", bridgeUrl());
  url.searchParams.set("sessionId", sessionID);
  return url;
}

async function parseResponse(response: Response): Promise<Record<string, unknown>> {
  const body: unknown = await response.json();
  if (!isRecord(body)) {
    throw new Error("The OpenWork Draw.io bridge returned an invalid response.");
  }
  return body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const OpenWorkDrawio = async () => ({
  "experimental.chat.system.transform": async (_input: unknown, output: { system: string[] }) => {
    output.system.push(DRAWIO_AGENT_GUIDANCE);
  },
  tool: {
    drawio_get_state: {
      description: "Read the latest session-scoped Draw.io XML and revision, including the user's manual edits. Always call this immediately before changing a diagram.",
      args: {},
      async execute(_rawArgs: unknown, context: DrawioToolContext) {
        const response = await fetch(diagramUrl(context.sessionID), {
          cache: "no-store",
          signal: AbortSignal.timeout(5_000),
        });
        const body = await parseResponse(response);
        if (!response.ok) throw new Error(String(body.error ?? "Unable to read Draw.io state."));
        return JSON.stringify(body, null, 2);
      },
    },
    drawio_update_state: {
      description: "Replace the current session's Draw.io XML using optimistic concurrency. A stale revision is rejected so user edits cannot be overwritten.",
      args: updateArgsSchema.shape,
      async execute(rawArgs: unknown, context: DrawioToolContext) {
        const args = updateArgsSchema.parse(rawArgs);
        const response = await fetch(diagramUrl(context.sessionID), {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            xml: args.xml,
            baseRevision: args.baseRevision,
            source: "agent",
          }),
          signal: AbortSignal.timeout(10_000),
        });
        const body = await parseResponse(response);
        if (response.status === 409) {
          return JSON.stringify({
            ok: false,
            error: "revision_conflict",
            message: "The user or another agent changed the diagram. Read the latest state, reconcile the XML, and retry.",
            current: body.current,
          }, null, 2);
        }
        if (!response.ok) throw new Error(String(body.error ?? "Unable to update Draw.io state."));
        return JSON.stringify({ ok: true, ...body }, null, 2);
      },
    },
    drawio_side_panel_export: {
      description: "Export the current OpenWork side-panel diagram through the connected Draw.io Web editor. The Draw.io side panel must be open.",
      args: exportArgsSchema.shape,
      async execute(rawArgs: unknown, context: DrawioToolContext) {
        const args = exportArgsSchema.parse(rawArgs);
        const response = await fetch(exportUrl(context.sessionID), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(args),
          signal: AbortSignal.timeout(50_000),
        });
        const body = await parseResponse(response);
        if (!response.ok) throw new Error(String(body.error ?? "Unable to export the Draw.io diagram."));
        return JSON.stringify(body, null, 2);
      },
    },
  },
});
