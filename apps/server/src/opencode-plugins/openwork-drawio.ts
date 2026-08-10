import { z } from "zod";

const DRAWIO_AGENT_GUIDANCE = `## Draw.io side-panel diagrams

OpenWork has a workspace-scoped Draw.io editor in the right side panel. Sessions and agents in the same workspace share its current diagram and revision history.

When the user asks to create or edit a diagram:
1. Open or focus the editor with openwork_execute id "drawio.panel.open".
2. Call drawio_get_state immediately before making a change. Its XML is the latest state, including manual edits made by the user.
3. Preserve the user's existing cells and changes unless the user explicitly asks to replace them.
4. Call drawio_update_state with the exact revision returned by drawio_get_state and the complete updated draw.io XML.
5. If the update reports revision_conflict, call drawio_get_state again, reconcile your intended edit with the new XML, and retry. Never resubmit stale XML.
6. When the user asks for SVG, PNG, editable SVG, editable PNG, PDF, JPEG, or HTML, keep the side panel open and call drawio_side_panel_export.
7. Use drawio_history and drawio_diff to inspect prior work. Use drawio_restore only when the user asks to restore a version, and drawio_checkpoint for explicit Git milestones.

The XML state is the source of truth. Do not rely on screenshots or overwrite a newer revision.`;

const updateArgsSchema = z.object({
  baseRevision: z.number().int().min(0).describe(
    "Exact revision returned by the most recent drawio_get_state call.",
  ),
  xml: z.string().min(1).describe(
    "Complete updated draw.io XML rooted at mxfile or mxGraphModel.",
  ),
  summary: z.string().min(1).max(500).optional().describe("Short description of the diagram change."),
});

const exportArgsSchema = z.object({
  format: z.enum(["svg", "xmlsvg", "png", "xmlpng", "pdf", "jpeg", "html2"]).describe(
    "Draw.io Web export format: SVG, editable SVG, PNG, editable PNG, PDF, JPEG, or HTML.",
  ),
  fileName: z.string().min(1).max(255).optional().describe(
    "Optional output file name. Directory components are ignored by the desktop bridge.",
  ),
});

const diffArgsSchema = z.object({
  fromRevision: z.number().int().min(1),
  toRevision: z.number().int().min(1),
});

const restoreArgsSchema = z.object({
  revision: z.number().int().min(1),
  summary: z.string().min(1).max(500).optional(),
});

const checkpointArgsSchema = z.object({
  message: z.string().min(1).max(500).optional(),
});

type DrawioToolContext = {
  sessionID: string;
  agent?: string;
  directory?: string;
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

function scopedUrl(pathname: string, sessionID: string, workspacePath?: string): URL {
  const url = new URL(pathname, bridgeUrl());
  url.searchParams.set("sessionId", sessionID);
  if (workspacePath) url.searchParams.set("workspacePath", workspacePath);
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

export const OpenWorkDrawio = async (factoryInput?: unknown) => {
  const factoryDirectory = isRecord(factoryInput) && typeof factoryInput.directory === "string"
    ? factoryInput.directory
    : undefined;
  const workspaceFor = (context: DrawioToolContext) => context.directory ?? factoryDirectory;
  const actorFor = (context: DrawioToolContext) => context.agent ?? "agent";

  return {
    "experimental.chat.system.transform": async (_input: unknown, output: { system: string[] }) => {
      output.system.push(DRAWIO_AGENT_GUIDANCE);
    },
    tool: {
    drawio_get_state: {
      description: "Read the latest workspace-scoped Draw.io XML and revision, including manual edits and changes from other sessions or agents.",
      args: {},
      async execute(_rawArgs: unknown, context: DrawioToolContext) {
        const response = await fetch(scopedUrl("/api/diagram", context.sessionID, workspaceFor(context)), {
          cache: "no-store",
          signal: AbortSignal.timeout(5_000),
        });
        const body = await parseResponse(response);
        if (!response.ok) throw new Error(String(body.error ?? "Unable to read Draw.io state."));
        return JSON.stringify(body, null, 2);
      },
    },
    drawio_update_state: {
      description: "Replace the current workspace diagram XML using optimistic concurrency. A stale revision is rejected so user or agent edits cannot be overwritten.",
      args: updateArgsSchema.shape,
      async execute(rawArgs: unknown, context: DrawioToolContext) {
        const args = updateArgsSchema.parse(rawArgs);
        const response = await fetch(scopedUrl("/api/diagram", context.sessionID, workspaceFor(context)), {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            xml: args.xml,
            baseRevision: args.baseRevision,
            source: "agent",
            actorId: actorFor(context),
            summary: args.summary,
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
        const response = await fetch(scopedUrl("/api/export", context.sessionID, workspaceFor(context)), {
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
    drawio_history: {
      description: "List the complete revision history for the current workspace diagram, including session and agent identities.",
      args: {},
      async execute(_rawArgs: unknown, context: DrawioToolContext) {
        const response = await fetch(scopedUrl("/api/history", context.sessionID, workspaceFor(context)), {
          cache: "no-store",
          signal: AbortSignal.timeout(5_000),
        });
        const body = await parseResponse(response);
        if (!response.ok) throw new Error(String(body.error ?? "Unable to read Draw.io history."));
        return JSON.stringify(body, null, 2);
      },
    },
    drawio_diff: {
      description: "Compare two revisions of the current workspace diagram by added, removed, and changed Draw.io cell IDs.",
      args: diffArgsSchema.shape,
      async execute(rawArgs: unknown, context: DrawioToolContext) {
        const args = diffArgsSchema.parse(rawArgs);
        const url = scopedUrl("/api/diff", context.sessionID, workspaceFor(context));
        url.searchParams.set("fromRevision", String(args.fromRevision));
        url.searchParams.set("toRevision", String(args.toRevision));
        const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5_000) });
        const body = await parseResponse(response);
        if (!response.ok) throw new Error(String(body.error ?? "Unable to compare Draw.io revisions."));
        return JSON.stringify(body, null, 2);
      },
    },
    drawio_restore: {
      description: "Restore a previous revision as a new current revision. Use only when the user explicitly requests a restore.",
      args: restoreArgsSchema.shape,
      async execute(rawArgs: unknown, context: DrawioToolContext) {
        const args = restoreArgsSchema.parse(rawArgs);
        const response = await fetch(scopedUrl("/api/restore", context.sessionID, workspaceFor(context)), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...args, actorId: actorFor(context) }),
          signal: AbortSignal.timeout(10_000),
        });
        const body = await parseResponse(response);
        if (!response.ok) throw new Error(String(body.error ?? "Unable to restore the Draw.io revision."));
        return JSON.stringify(body, null, 2);
      },
    },
    drawio_checkpoint: {
      description: "Create an explicit Git milestone containing the current diagram, workspace manifest, and revision history.",
      args: checkpointArgsSchema.shape,
      async execute(rawArgs: unknown, context: DrawioToolContext) {
        const args = checkpointArgsSchema.parse(rawArgs);
        const response = await fetch(scopedUrl("/api/checkpoint", context.sessionID, workspaceFor(context)), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(args),
          signal: AbortSignal.timeout(15_000),
        });
        const body = await parseResponse(response);
        if (!response.ok) throw new Error(String(body.error ?? "Unable to create the Draw.io Git checkpoint."));
        return JSON.stringify(body, null, 2);
      },
    },
  },
  };
};
