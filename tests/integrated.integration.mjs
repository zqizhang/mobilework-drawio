import assert from "node:assert/strict"
import { promises as fs } from "node:fs"
import { createServer } from "node:http"
import os from "node:os"
import path from "node:path"
import { Script } from "node:vm"

const runtimeModule = process.env.DRAWIO_TEST_SOURCE === "1"
  ? "../runtime/drawio-runtime.ts"
  : "../generated/drawio-expert/.opencode/skills/drawio-expert-common/scripts/drawio-runtime-core.mjs"
const runtime = await import(runtimeModule)
const { tool } = await import("@opencode-ai/plugin")

function createSseFrameReader(reader, timeoutMs = 2000) {
  const decoder = new TextDecoder()
  let buffered = ""
  return async function readSseFrame() {
    while (!buffered.includes("\n\n")) {
      let timer
      const result = await Promise.race([
        reader.read(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("timed out waiting for SSE frame")), timeoutMs)
        }),
      ]).finally(() => clearTimeout(timer))
      if (result.done) throw new Error("SSE stream ended before a complete frame")
      buffered += decoder.decode(result.value, { stream: true })
    }
    const boundary = buffered.indexOf("\n\n") + 2
    const frame = buffered.slice(0, boundary)
    buffered = buffered.slice(boundary)
    return frame
  }
}

async function nextMatchingSseFrame(readFrame, pattern, limit = 20) {
  for (let index = 0; index < limit; index += 1) {
    const frame = await readFrame()
    if (pattern.test(frame)) return frame
  }
  throw new Error(`did not receive matching SSE frame: ${pattern}`)
}

const DRAWIO_ENVIRONMENT_KEYS = [
  "DRAWIO_WEB_URL",
  "DRAWIO_BRIDGE_HOST",
  "DRAWIO_BRIDGE_PORT",
  "DRAWIO_EXPORT_URL",
  "DRAWIO_REQUEST_TIMEOUT",
  "DRAWIO_MAX_INPUT_SIZE_MB",
  "DRAWIO_MAX_OUTPUT_SIZE_MB",
]
const originalEnvironment = Object.fromEntries(
  DRAWIO_ENVIRONMENT_KEYS.map((name) => [name, process.env[name]]),
)
for (const name of DRAWIO_ENVIRONMENT_KEYS) delete process.env[name]

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(128, 1),
])
const exportRequests = []
const exportServer = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/ImageExport4/export") {
    response.writeHead(404).end()
    return
  }
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString("utf8")
  const form = new URLSearchParams(body)
  assert.equal(form.get("format"), "png")
  assert.equal(typeof form.get("xml"), "string")
  assert.equal(form.get("bg"), "#ffffff")
  exportRequests.push({
    format: form.get("format"),
    xml: form.get("xml"),
    pageId: form.get("pageId"),
    allPages: form.get("allPages"),
    embedXml: form.get("embedXml"),
  })
  response.writeHead(200, { "content-type": "image/png" })
  response.end(Buffer.concat([PNG, Buffer.from(form.get("pageId") || "all-pages")]))
})
await new Promise((resolve) => exportServer.listen(0, "127.0.0.1", resolve))
const exportAddress = exportServer.address()

const XML = '<mxfile host="test"><diagram id="p1" name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="node" value="MobileWork" vertex="1" parent="1"><mxGeometry x="20" y="20" width="120" height="60" as="geometry"/></mxCell><mxCell id="neighbor" value="Neighbor" vertex="1" parent="1"><mxGeometry x="300" y="20" width="120" height="60" as="geometry"/></mxCell></root></mxGraphModel></diagram><diagram id="p2" name="Page-2"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="remote" value="Remote" vertex="1" parent="1"><mxGeometry x="40" y="40" width="120" height="60" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>'
const MISSING_PAGE_ID_XML = '<mxfile host="test"><diagram name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="compat-node" value="Compat" vertex="1" parent="1"><mxGeometry x="20" y="20" width="120" height="60" as="geometry"/></mxCell><mxCell id="compat-neighbor" value="Neighbor" vertex="1" parent="1"><mxGeometry x="280" y="20" width="120" height="60" as="geometry"/></mxCell><mxCell id="compat-edge" value="Flow" edge="1" parent="1" source="compat-node" target="compat-neighbor"><mxGeometry relative="1" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>'
const NESTED_XML = `<mxfile host="test"><diagram id="nested" name="Nested containers"><mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="user" value="User" vertex="1" parent="1"><mxGeometry x="390" y="60" width="160" height="60" as="geometry"/></mxCell>
  <mxCell id="app" value="Application" vertex="1" parent="1"><mxGeometry x="390" y="200" width="160" height="60" as="geometry"/></mxCell>
  <mxCell id="agentRt" value="Agent runtime" style="swimlane;startSize=30;" vertex="1" parent="1"><mxGeometry x="40" y="360" width="1000" height="300" as="geometry"/></mxCell>
  <mxCell id="orch" value="Orchestrator" vertex="1" parent="agentRt"><mxGeometry x="340" y="70" width="220" height="80" as="geometry"/></mxCell>
  <mxCell id="eval" value="Evaluator" vertex="1" parent="agentRt"><mxGeometry x="340" y="200" width="220" height="80" as="geometry"/></mxCell>
  <mxCell id="tools" value="Tools" style="swimlane;startSize=30;" vertex="1" parent="1"><mxGeometry x="40" y="720" width="1000" height="250" as="geometry"/></mxCell>
  <mxCell id="search" value="Search" vertex="1" parent="tools"><mxGeometry x="310" y="70" width="200" height="60" as="geometry"/></mxCell>
  <mxCell id="e1" value="request" style="edgeStyle=orthogonalEdgeStyle;jumpStyle=arc;" edge="1" parent="1" source="user" target="app"><mxGeometry relative="1" as="geometry"/></mxCell>
  <mxCell id="e8" value="tool call" style="edgeStyle=orthogonalEdgeStyle;jumpStyle=arc;exitX=1;exitY=0.5;entryX=1;entryY=0.5;" edge="1" parent="1" source="orch" target="search"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="700" y="470"/><mxPoint x="700" y="820"/></Array></mxGeometry></mxCell>
</root></mxGraphModel></diagram></mxfile>`
const NESTED_CROSSING_XML = NESTED_XML.replace(
  '<mxCell id="e1"',
  '<mxCell id="blocker" value="Blocker" vertex="1" parent="1"><mxGeometry x="430" y="140" width="80" height="40" as="geometry"/></mxCell><mxCell id="e1"',
)
const LABEL_OVERLAP_XML = `<mxfile host="test"><diagram id="labels" name="Label overlap"><mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="app" value="Application" vertex="1" parent="1"><mxGeometry x="470" y="160" width="160" height="60" as="geometry"/></mxCell>
  <mxCell id="agentRt" value="Agent runtime" style="swimlane;startSize=30;" vertex="1" parent="1"><mxGeometry x="40" y="300" width="940" height="280" as="geometry"/></mxCell>
  <mxCell id="orch" value="Orchestrator" vertex="1" parent="agentRt"><mxGeometry x="360" y="60" width="220" height="80" as="geometry"/></mxCell>
  <mxCell id="e2" value="任务输入" style="edgeStyle=orthogonalEdgeStyle;jumpStyle=arc;exitX=0.5;exitY=1;entryX=0.5;entryY=0;" edge="1" parent="1" source="app" target="orch"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="550" y="340"/><mxPoint x="510" y="340"/></Array></mxGeometry></mxCell>
</root></mxGraphModel></diagram></mxfile>`
const LABEL_CLEAR_XML = LABEL_OVERLAP_XML.replace(
  '<mxGeometry relative="1" as="geometry"><Array',
  '<mxGeometry relative="1" as="geometry"><mxPoint x="0" y="-50" as="offset"/><Array',
)
const SHARED_PORT_XML = `<mxfile host="test"><diagram id="shared-port" name="Shared port"><mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="client" value="Client" vertex="1" parent="1"><mxGeometry x="320" y="190" width="170" height="70" as="geometry"/></mxCell>
  <mxCell id="server-a" value="Server A" vertex="1" parent="1"><mxGeometry x="580" y="50" width="160" height="70" as="geometry"/></mxCell>
  <mxCell id="server-b" value="Server B" vertex="1" parent="1"><mxGeometry x="580" y="190" width="160" height="70" as="geometry"/></mxCell>
  <mxCell id="server-c" value="Server C" vertex="1" parent="1"><mxGeometry x="580" y="330" width="160" height="70" as="geometry"/></mxCell>
  <mxCell id="rpc-a" value="" style="edgeStyle=orthogonalEdgeStyle;jumpStyle=arc;exitX=1;exitY=0.5;entryX=0;entryY=0.5;" edge="1" parent="1" source="client" target="server-a"><mxGeometry relative="1" as="geometry"/></mxCell>
  <mxCell id="rpc-b" value="" style="edgeStyle=orthogonalEdgeStyle;jumpStyle=arc;exitX=1;exitY=0.5;entryX=0;entryY=0.5;" edge="1" parent="1" source="client" target="server-b"><mxGeometry relative="1" as="geometry"/></mxCell>
  <mxCell id="rpc-c" value="" style="edgeStyle=orthogonalEdgeStyle;jumpStyle=arc;exitX=1;exitY=0.5;entryX=0;entryY=0.5;" edge="1" parent="1" source="client" target="server-c"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`
const EDGE_OVERLAP_XML = SHARED_PORT_XML
  .replace('<mxGeometry relative="1" as="geometry"/></mxCell>\n  <mxCell id="rpc-b"', '<mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="535" y="225"/><mxPoint x="535" y="85"/></Array></mxGeometry></mxCell>\n  <mxCell id="rpc-b"')
  .replace('<mxGeometry relative="1" as="geometry"/></mxCell>\n  <mxCell id="rpc-c"', '<mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="535" y="225"/></Array></mxGeometry></mxCell>\n  <mxCell id="rpc-c"')
  .replace('<mxGeometry relative="1" as="geometry"/></mxCell>\n</root>', '<mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="535" y="225"/><mxPoint x="535" y="365"/></Array></mxGeometry></mxCell>\n</root>')

const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "drawio-integrated-"))
const approvalRequests = []
await fs.writeFile(path.join(workspace, ".env"), [
  'DRAWIO_WEB_URL="http://127.0.0.1:18080" # local Docker editor',
  "DRAWIO_BRIDGE_HOST=127.0.0.1",
  "DRAWIO_BRIDGE_PORT=0",
  `DRAWIO_EXPORT_URL=http://127.0.0.1:${exportAddress.port}/ImageExport4/export`,
  "DRAWIO_REQUEST_TIMEOUT=60",
  "DRAWIO_MAX_INPUT_SIZE_MB=20",
  "DRAWIO_MAX_OUTPUT_SIZE_MB=100",
  "DRAWIO_UNRELATED_VALUE=must-not-load",
  "",
].join("\n"), "utf8")
const context = {
  sessionID: "integrated-session",
  messageID: "integrated-message",
  agent: "drawio-expert",
  directory: workspace,
  // OpenCode represents a non-Git directory as the global project whose
  // worktree is "/". File tools must still stay inside the session directory.
  worktree: "/",
  abort: new AbortController().signal,
  metadata() {},
  async ask(input) { approvalRequests.push(input) },
}

let approvalQuestionSequence = 0
function answerApprovalQuestion(result, sessionID, answer = "确认修改", mirrorV2 = false) {
  assert.equal(result.status, "question_required")
  assert.equal(result.approvalRequired, true)
  assert.equal(result.question.tool, "question")
  const questions = result.question.arguments.questions
  assert.equal(questions.length, 1)
  const requestID = `question-${++approvalQuestionSequence}`
  assert.equal(runtime.handleDrawioOpenCodeEvent({
    type: "question.asked",
    properties: {
      id: requestID,
      sessionID,
      questions,
      tool: { messageID: `message-${approvalQuestionSequence}`, callID: `call-${approvalQuestionSequence}` },
    },
  }), true)
  const replyRequestID = mirrorV2 ? `${requestID}-v2` : requestID
  if (mirrorV2) {
    assert.equal(runtime.handleDrawioOpenCodeEvent({
      type: "question.v2.asked",
      properties: {
        id: replyRequestID,
        sessionID,
        questions,
        tool: { messageID: `message-${approvalQuestionSequence}-v2`, callID: `call-${approvalQuestionSequence}-v2` },
      },
    }), true)
  }
  const event = answer === null
    ? { type: "question.rejected", properties: { sessionID, requestID: replyRequestID } }
    : { type: "question.replied", properties: { sessionID, requestID: replyRequestID, answers: [[answer]] } }
  assert.equal(runtime.handleDrawioOpenCodeEvent(event), true)
  return { requestID, event }
}

async function executeWithApprovalQuestion(execute, args, toolContext = context, answer = "确认修改") {
  const first = JSON.parse(await execute(args, toolContext))
  assert.equal(first.status, "question_required")
  assert.equal(first.question.tool, "question")
  // The built-in question result is returned to the Agent, not to a custom
  // Draw.io tool. Exercise the real handoff: the Agent must forward the
  // review id and exact answer on the second call. No plugin event is emitted.
  const second = JSON.parse(await execute({
    ...args,
    approval_review_id: first.reviewId,
    approval_answer: answer,
  }, toolContext))
  return { first, second }
}

try {
  await runtime.initializeDrawioWorkspace(workspace)
  const plugin = { tool: runtime.createDrawioToolset(tool) }
  assert.equal(process.env.DRAWIO_WEB_URL, "http://127.0.0.1:18080")
  assert.equal(process.env.DRAWIO_UNRELATED_VALUE, undefined)
  assert.equal(typeof plugin.tool.drawio_export.execute, "function")
  assert.equal(typeof plugin.tool.drawio_validate.execute, "function")
  assert.equal(typeof plugin.tool.drawio_health_check.execute, "function")
  assert.equal(typeof plugin.tool.drawio_finalize.execute, "function")
  assert.equal(typeof plugin.tool.drawio_authorize_annotation_change.execute, "function")
  assert.equal(typeof plugin.tool.drawio_authorize_preview.execute, "function")
  assert.equal(typeof plugin.tool.drawio_preview_state.execute, "function")
  const generatedAgentPrompt = await fs.readFile(
    path.resolve("generated/drawio-expert/.opencode/agents/drawio-expert.md"),
    "utf8",
  )
  const systemOutput = { system: [generatedAgentPrompt] }
  assert.equal(runtime.applyDrawioSystemGuidance(systemOutput), true)
  assert.match(systemOutput.system.join("\n"), /人工编辑不是只读内容/)
  assert.match(systemOutput.system.join("\n"), /最新 XML 作为修改基线/)
  assert.match(systemOutput.system.join("\n"), /freshness=stale/)
  assert.match(systemOutput.system.join("\n"), /requiresConfirmation=false/)
  assert.match(systemOutput.system.join("\n"), /shouldOpenBrowser=true/)
  assert.match(systemOutput.system.join("\n"), /不能只提示用户稍后继续/)
  assert.match(systemOutput.system.join("\n"), /禁止先改后问/)
  assert.match(systemOutput.system.join("\n"), /SVG、xmlsvg、html2/)
  assert.match(systemOutput.system.join("\n"), /openwork_browser_open_url/)
  assert.match(systemOutput.system.join("\n"), /每次新的用户轮次/)
  assert.match(systemOutput.system.join("\n"), /drawio_list_annotations\(file=当前文件, status="all"\)/)
  assert.match(systemOutput.system.join("\n"), /禁止复用旧 preview_id、approval_token/)
  assert.doesNotMatch(systemOutput.system.join("\n"), /\bbrowser\.open_url\b/)
  const generalAgentSystemOutput = { system: ["You are a general coding agent."] }
  assert.equal(runtime.applyDrawioSystemGuidance(generalAgentSystemOutput), false)
  assert.deepEqual(generalAgentSystemOutput.system, ["You are a general coding agent."])

  const auxiliarySystemOutput = { system: ["Generate a short title for this session."] }
  assert.equal(runtime.applyDrawioSystemGuidance(auxiliarySystemOutput), false)
  assert.deepEqual(auxiliarySystemOutput.system, ["Generate a short title for this session."])

  assert.match(generatedAgentPrompt, /禁止声称运行时不支持/)
  assert.match(generatedAgentPrompt, /逐个page_id/)
  assert.match(generatedAgentPrompt, /openwork_browser_open_url/)
  assert.match(generatedAgentPrompt, /每次新的用户轮次只要涉及已绑定图表/)
  assert.match(generatedAgentPrompt, /drawio_list_annotations\(file=当前文件,status="all"\)/)
  assert.match(generatedAgentPrompt, /本轮未加载drawio-skill或drawio-session-editing/)
  const generatedRoleSkill = await fs.readFile(
    path.resolve("generated/drawio-expert/.opencode/skills/drawio-expert-drawio-expert/SKILL.md"),
    "utf8",
  )
  assert.match(generatedRoleSkill, /## 每轮同步检查/)
  assert.match(generatedRoleSkill, /drawio_list_annotations\(file=当前文件, status="all"\)/)
  const generatedCommonSkill = await fs.readFile(
    path.resolve("generated/drawio-expert/.opencode/skills/drawio-expert-common/SKILL.md"),
    "utf8",
  )
  assert.match(generatedCommonSkill, /禁止复用上一轮缓存/)
  const generatedOpenCodeConfig = JSON.parse(await fs.readFile(
    path.resolve("generated/drawio-expert/opencode.json"),
    "utf8",
  ))
  assert.equal(
    generatedOpenCodeConfig.agent["drawio-expert"].permission.drawio_authorize_annotation_change,
    "allow",
  )
  assert.equal(
    generatedOpenCodeConfig.agent["drawio-expert"].permission.drawio_authorize_preview,
    "allow",
  )
  assert.equal(
    generatedOpenCodeConfig.agent["drawio-expert"].permission.question,
    undefined,
  )
  assert.equal(
    generatedOpenCodeConfig.agent["drawio-expert"].permission.drawio_open,
    "allow",
  )
  assert.equal(
    generatedOpenCodeConfig.agent["drawio-expert"].mode,
    "all",
  )
  assert.equal(
    generatedOpenCodeConfig.agent["drawio-expert"].steps,
    80,
  )
  const createResult = JSON.parse(await plugin.tool.drawio_create.execute({
    file: "architecture.drawio",
    title: "Integrated test",
    nodes: [{ id: "node", label: "MobileWork", kind: "application" }],
    edges: [],
    direction: "left-to-right",
    compressed: false,
    overwrite: false,
  }, context))
  assert.equal(createResult.valid, true)
  assert.equal(createResult.created, "architecture.drawio")
  assert.equal((await fs.stat(path.join(workspace, "architecture.drawio"))).isFile(), true)

  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      operations: [{ type: "update-node", id: "node", label: "Unbound write" }],
      dry_run: false,
    }, context),
    /active preview session; call drawio_open/,
  )
  assert.doesNotMatch(
    await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"),
    /Unbound write/,
  )
  await assert.rejects(
    plugin.tool.drawio_polish.execute({
      file: "architecture.drawio",
      direction: "left-to-right",
      threshold: 0,
      dry_run: false,
    }, context),
    /active preview session; call drawio_open/,
  )

  const validateResult = JSON.parse(await plugin.tool.drawio_validate.execute({
    input_path: "architecture.drawio",
  }, context))
  assert.equal(validateResult.success, true)
  assert.equal(validateResult.page_count, 1)

  const inspectResult = JSON.parse(await plugin.tool.drawio_inspect.execute({
    file: "architecture.drawio",
  }, context))
  assert.equal(inspectResult.valid, true)
  assert.equal(inspectResult.file, "architecture.drawio")

  const qualityResult = JSON.parse(await plugin.tool.drawio_quality.execute({
    file: "architecture.drawio",
    threshold: 0,
  }, context))
  assert.equal(qualityResult.pass, true)
  assert.equal(qualityResult.file, "architecture.drawio")

  await fs.writeFile(path.join(workspace, "nested.drawio"), NESTED_XML, "utf8")
  const nestedQuality = JSON.parse(await plugin.tool.drawio_quality.execute({
    file: "nested.drawio",
    threshold: 90,
  }, context))
  assert.equal(nestedQuality.pass, true)
  assert.equal(nestedQuality.score, 100)
  assert.equal(nestedQuality.metrics.edgeNodeIntersections, 0)

  await fs.writeFile(path.join(workspace, "nested-crossing.drawio"), NESTED_CROSSING_XML, "utf8")
  const nestedCrossingQuality = JSON.parse(await plugin.tool.drawio_quality.execute({
    file: "nested-crossing.drawio",
    threshold: 90,
  }, context))
  assert.equal(nestedCrossingQuality.metrics.edgeNodeIntersections, 1)
  assert.equal(
    nestedCrossingQuality.issues.some((issue) =>
      issue.code === "edge-through-node" && issue.cells.join(",") === "e1,blocker"),
    true,
  )

  await fs.writeFile(path.join(workspace, "label-overlap.drawio"), LABEL_OVERLAP_XML, "utf8")
  const labelOverlapQuality = JSON.parse(await plugin.tool.drawio_quality.execute({
    file: "label-overlap.drawio",
    threshold: 90,
  }, context))
  assert.equal(labelOverlapQuality.pass, false)
  assert.equal(labelOverlapQuality.metrics.labelOverlaps, 1)
  assert.equal(
    labelOverlapQuality.issues.some((issue) =>
      issue.code === "label-overlap" && issue.cells.join(",") === "e2,agentRt"),
    true,
  )

  await fs.writeFile(path.join(workspace, "label-clear.drawio"), LABEL_CLEAR_XML, "utf8")
  const labelClearQuality = JSON.parse(await plugin.tool.drawio_quality.execute({
    file: "label-clear.drawio",
    threshold: 90,
  }, context))
  assert.equal(labelClearQuality.pass, true)
  assert.equal(labelClearQuality.metrics.labelOverlaps, 0)

  await fs.writeFile(path.join(workspace, "shared-port.drawio"), SHARED_PORT_XML, "utf8")
  const sharedPortQuality = JSON.parse(await plugin.tool.drawio_quality.execute({
    file: "shared-port.drawio",
    threshold: 90,
  }, context))
  assert.equal(sharedPortQuality.pass, false)
  assert.equal(sharedPortQuality.metrics.sharedPortCongestions, 1)
  assert.equal(
    sharedPortQuality.issues.some((issue) =>
      issue.code === "shared-port-congestion"
      && issue.cells.join(",") === "client,rpc-a,rpc-b,rpc-c"),
    true,
  )
  await assert.rejects(
    plugin.tool.drawio_finalize.execute({
      file: "shared-port.drawio",
      threshold: 90,
    }, context),
    /refusing to finalize Draw\.io layout that failed the quality gate/,
  )

  await fs.writeFile(path.join(workspace, "edge-overlap.drawio"), EDGE_OVERLAP_XML, "utf8")
  const edgeOverlapQuality = JSON.parse(await plugin.tool.drawio_quality.execute({
    file: "edge-overlap.drawio",
    threshold: 90,
  }, context))
  assert.equal(edgeOverlapQuality.pass, false)
  assert.equal(edgeOverlapQuality.metrics.edgeOverlaps, 3)
  assert.deepEqual(
    edgeOverlapQuality.issues
      .filter((issue) => issue.code === "edge-overlap")
      .map((issue) => issue.cells.join(","))
      .sort(),
    ["rpc-a,rpc-b", "rpc-a,rpc-c", "rpc-b,rpc-c"],
  )

  const fanoutCreate = JSON.parse(await plugin.tool.drawio_create.execute({
    file: "fanout.drawio",
    title: "Fanout",
    nodes: [
      { id: "client", label: "Client" },
      { id: "server-a", label: "Server A" },
      { id: "server-b", label: "Server B" },
      { id: "server-c", label: "Server C" },
    ],
    edges: [
      { id: "rpc-a", source: "client", target: "server-a" },
      { id: "rpc-b", source: "client", target: "server-b" },
      { id: "rpc-c", source: "client", target: "server-c" },
    ],
    direction: "left-to-right",
    compressed: false,
    overwrite: false,
  }, context))
  assert.equal(fanoutCreate.valid, true)
  const fanoutQuality = JSON.parse(await plugin.tool.drawio_quality.execute({
    file: "fanout.drawio",
    threshold: 90,
  }, context))
  assert.equal(fanoutQuality.pass, true, JSON.stringify(fanoutQuality, null, 2))
  assert.equal(fanoutQuality.metrics.sharedPortCongestions, 0)
  assert.equal(fanoutQuality.metrics.edgeOverlaps, 0)

  const openResult = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "architecture.drawio",
  }, context))
  assert.equal(openResult.ok, true)
  assert.match(openResult.openUrl, /\/editor\?/) 
  const editorPage = await fetch(openResult.openUrl).then((response) => response.text())
  assert.match(editorPage, /127\.0\.0\.1:18080/)
  assert.match(editorPage, /baseRevision/)
  assert.match(editorPage, /只修改选区/)
  assert.match(editorPage, /允许调整关联连线/)
  assert.match(editorPage, /允许调整周边布局/)
  assert.match(editorPage, /允许修改整个图表/)
  assert.match(editorPage, /所有页面、节点、连线和布局/)
  assert.match(editorPage, /Agent 修改预览/)
  assert.match(editorPage, /class="preview-overview"/)
  assert.match(editorPage, /class="preview-actions"/)
  assert.match(editorPage, /class="preview-meta"/)
  assert.match(editorPage, /class="segmented" role="group"/)
  assert.match(editorPage, /grid-template-areas: "overview actions" "meta meta"/)
  assert.match(editorPage, /@media \(max-width: 760px\)/)
  assert.match(editorPage, /white-space: nowrap/)
  assert.match(editorPage, /top: calc\(100% \+ 8px\)/)
  assert.match(editorPage, /项变化 · 基于版本/)
  assert.match(editorPage, /id="patch-preview-before"/)
  assert.match(editorPage, /id="patch-preview-after"/)
  assert.match(editorPage, /id="patch-preview-compare"/)
  assert.match(editorPage, /id="patch-preview-details-toggle"/)
  assert.match(editorPage, /id="patch-preview-details-close"/)
  assert.match(editorPage, /id="patch-preview-cancel"/)
  assert.match(editorPage, /取消修改/)
  assert.doesNotMatch(editorPage, /id="patch-preview-exit"/)
  assert.match(editorPage, /id="patch-preview-details"/)
  assert.match(editorPage, /setPatchPreviewDetailsExpanded\(!patchPreviewDetailsExpanded\)/)
  assert.match(editorPage, /view === "after"[\s\S]*activePatchPreview\.candidateXml/)
  assert.match(editorPage, /view === "compare"[\s\S]*activePatchPreview\.comparePreviewXml/)
  assert.match(editorPage, /const cancelUrl = new URL\(CONFIG\.patchPreviewUrl\)/)
  assert.doesNotMatch(editorPage, /CONFIG\.patchPreviewUrl \+ "\/"/)
  assert.match(editorPage, /id="history-btn"/, "editor page must include the history entry")
  assert.match(editorPage, /版本历史/, "editor page must include the history modal")
  assert.match(editorPage, /将图表恢复为 v/, "editor page must include the restore confirmation text")
  assert.match(editorPage, /恢复会创建新版本，当前版本不会被删除/, "editor page must explain append-only restore")
  assert.match(editorPage, /重新加载最新版本/, "editor page must offer an explicit reload action on conflict")
  assert.doesNotMatch(
    editorPage,
    /return writeState\(xml, result\.current\.revision\)/,
    "browser must not blind-retry an old XML with a new revision on 409",
  )
  assert.match(editorPage, /id="conflict-overwrite"/)
  assert.match(editorPage, /id="conflict-modal"/)
  assert.match(editorPage, /id="conflict-details"/)
  assert.match(editorPage, /\.conflict-version\.user/)
  assert.match(editorPage, /\.conflict-version\.agent/)
  assert.match(editorPage, /保留我的版本并覆盖/)
  assert.match(editorPage, /已自动合并不重叠修改并保存/)
  assert.match(editorPage, /当前画布未被强制刷新/)
  assert.doesNotMatch(editorPage, /Agent 更新已加载/)

  const apiUrl = new URL(openResult.openUrl)
  apiUrl.pathname = "/api/diagram"
  const initial = await fetch(apiUrl).then((response) => response.json())
  assert.equal(initial.revision, 0)

  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      operations: [{ type: "update-node", id: "node", label: "Unsafe" }],
      dry_run: false,
    }, context),
    /base_revision is required/,
  )
  assert.throws(
    () => runtime.enforceDrawioWriteGuard(
      { tool: "write", sessionID: context.sessionID, callID: "write-call" },
      { args: { filePath: "architecture.drawio", content: XML } },
    ),
    /bound to an active browser session/,
  )

  const manualXml = XML.replace("MobileWork", "MobileWork Manual")
  const manualSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ xml: manualXml, baseRevision: 0, source: "editor", clientId: "browser" }),
  })
  assert.equal(manualSave.status, 200)
  assert.equal((await manualSave.json()).revision, 1)

  const state = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  assert.equal(state.revision, 1)
  assert.equal(state.revisionScope, "diagram")
  assert.match(state.xml, /MobileWork Manual/)

  // A new conversation binding to the same diagram must observe the diagram's
  // durable revision instead of starting its own revision counter at zero.
  const peerContext = { ...context, sessionID: "integrated-session-peer" }
  const peerOpen = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "architecture.drawio",
  }, peerContext))
  assert.equal(peerOpen.revision, state.revision)
  assert.equal(peerOpen.revisionScope, "diagram")
  const peerState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, peerContext))
  assert.equal(peerState.revision, state.revision)
  assert.match(peerState.xml, /MobileWork Manual/)

  const stale = JSON.parse(await plugin.tool.drawio_update_state.execute({
    base_revision: 0,
    xml: manualXml.replace("MobileWork Manual", "Agent Stale"),
  }, context))
  assert.equal(stale.error, "revision_conflict")
  assert.equal(stale.current.revision, 1)
  assert.equal(stale.manualChanges.available, true)

  const beforeRejectedApproval = await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8")
  const rejectedArgs = {
    base_revision: 1,
    xml: manualXml.replace("MobileWork Manual", "No Preview"),
    approval_plan: "Reject this complete XML candidate",
  }
  const pendingRejection = JSON.parse(await plugin.tool.drawio_update_state.execute(rejectedArgs, context))
  const bypassAttempt = JSON.parse(await plugin.tool.drawio_update_state.execute(rejectedArgs, context))
  assert.equal(bypassAttempt.status, "question_required")
  assert.equal(bypassAttempt.reviewId, pendingRejection.reviewId)
  assert.equal(bypassAttempt.approvalToken, undefined)
  const forgedQuestions = structuredClone(pendingRejection.question.arguments.questions)
  forgedQuestions[0].question += "（伪造）"
  assert.equal(runtime.handleDrawioOpenCodeEvent({
    type: "question.asked",
    properties: {
      id: "forged-question",
      sessionID: context.sessionID,
      questions: forgedQuestions,
      tool: { messageID: "forged-message", callID: "forged-call" },
    },
  }), false)
  const pendingRequestID = "pending-question-before-reply"
  assert.equal(runtime.handleDrawioOpenCodeEvent({
    type: "question.asked",
    properties: {
      id: pendingRequestID,
      sessionID: context.sessionID,
      questions: pendingRejection.question.arguments.questions,
      tool: { messageID: "pending-message", callID: "pending-call" },
    },
  }), true)
  const waitingForReply = JSON.parse(await plugin.tool.drawio_update_state.execute({
    ...rejectedArgs,
    approval_plan: "Changed wording must not create a second question",
  }, context))
  assert.equal(waitingForReply.status, "question_pending")
  assert.equal(waitingForReply.reviewId, pendingRejection.reviewId)
  assert.equal(waitingForReply.question, undefined)
  const cancelledEvent = {
    type: "question.replied",
    properties: { sessionID: context.sessionID, requestID: pendingRequestID, answers: [["取消修改"]] },
  }
  assert.equal(runtime.handleDrawioOpenCodeEvent(cancelledEvent), true)
  assert.equal(runtime.handleDrawioOpenCodeEvent(cancelledEvent), false)
  const rejectedApproval = JSON.parse(await plugin.tool.drawio_update_state.execute(rejectedArgs, context))
  assert.equal(rejectedApproval.status, "cancelled")
  assert.equal(rejectedApproval.approvalToken, undefined)
  assert.equal(
    await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"),
    beforeRejectedApproval,
  )
  const feedbackArgs = {
    base_revision: 1,
    xml: manualXml.replace("MobileWork Manual", "Needs Feedback"),
    approval_plan: "Candidate that needs user feedback",
  }
  const pendingFeedback = JSON.parse(await plugin.tool.drawio_update_state.execute(feedbackArgs, context))
  const feedbackResult = JSON.parse(await plugin.tool.drawio_update_state.execute({
    ...feedbackArgs,
    approval_review_id: pendingFeedback.reviewId,
    approval_answer: "请把节点改成蓝色，并保留原来的文字",
  }, context))
  assert.equal(feedbackResult.status, "feedback_received")
  assert.equal(feedbackResult.userFeedback, "请把节点改成蓝色，并保留原来的文字")
  assert.equal(feedbackResult.approvalToken, undefined)
  assert.equal(
    await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"),
    beforeRejectedApproval,
  )
  const concurrent = await Promise.all([
    fetch(apiUrl, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        xml: manualXml.replace("MobileWork Manual", "Agent A"),
        baseRevision: 1,
        source: "editor",
        clientId: "concurrent-a",
      }),
    }).then((response) => response.json()),
    fetch(apiUrl, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        xml: manualXml.replace("MobileWork Manual", "Agent B"),
        baseRevision: 1,
        source: "editor",
        clientId: "concurrent-b",
      }),
    }).then((response) => response.json()),
  ])
  assert.equal(concurrent.filter((result) => result.ok).length, 1)
  assert.equal(concurrent.filter((result) => result.error === "revision_conflict").length, 1)
  assert.equal(concurrent.find((result) => result.ok).revision, 2)
  const agentUpdatedState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  assert.match(agentUpdatedState.xml, /Agent [AB]/)
  assert.doesNotMatch(agentUpdatedState.xml, /MobileWork Manual/)

  const mergeLocalXml = agentUpdatedState.xml.replace(/Agent [AB]/, "Local Merge")
  const mergeRemoteXml = agentUpdatedState.xml.replace("Neighbor", "Remote Neighbor")
  const mergeRemoteSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: mergeRemoteXml,
      baseRevision: agentUpdatedState.revision,
      source: "editor",
      clientId: "remote-browser",
    }),
  })
  assert.equal(mergeRemoteSave.status, 200)
  const mergeRemoteResult = await mergeRemoteSave.json()
  const automaticMergeSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: mergeLocalXml,
      baseRevision: agentUpdatedState.revision,
      source: "editor",
      clientId: "local-browser",
    }),
  })
  assert.equal(automaticMergeSave.status, 200)
  const automaticMerge = await automaticMergeSave.json()
  assert.equal(automaticMerge.autoMerge.status, "merged")
  assert.equal(automaticMerge.revision, mergeRemoteResult.revision + 1)
  assert.equal(automaticMerge.autoMerge.localChangedKeys.includes("p1:node"), true)
  assert.equal(automaticMerge.autoMerge.remoteChangedKeys.includes("p1:neighbor"), true)
  assert.match(automaticMerge.xml, /Local Merge/)
  assert.match(automaticMerge.xml, /Remote Neighbor/)

  const fieldRemoteXml = automaticMerge.xml.replace('x="20" y="20"', 'x="35" y="20"')
  const fieldLocalXml = automaticMerge.xml.replace("Local Merge", "Field Local")
  const fieldRemoteSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: fieldRemoteXml,
      baseRevision: automaticMerge.revision,
      source: "editor",
      clientId: "remote-browser",
    }),
  })
  assert.equal(fieldRemoteSave.status, 200)
  const fieldRemoteResult = await fieldRemoteSave.json()
  const fieldMergeSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: fieldLocalXml,
      baseRevision: automaticMerge.revision,
      source: "editor",
      clientId: "local-browser",
    }),
  })
  assert.equal(fieldMergeSave.status, 200)
  const fieldMerge = await fieldMergeSave.json()
  assert.equal(fieldMerge.autoMerge.status, "merged")
  assert.equal(fieldMerge.revision, fieldRemoteResult.revision + 1)
  assert.match(fieldMerge.xml, /Field Local/)
  assert.match(fieldMerge.xml, /x="35" y="20"/)

  const overlapRemoteXml = fieldMerge.xml
    .replace("Field Local", "Remote Overlap")
    .replace("Remote Neighbor", "AI NonConflict")
  const overlapLocalXml = fieldMerge.xml
    .replace("Field Local", "Local Overlap")
    .replace('value="Remote"', 'value="User NonConflict"')
  const overlapRemoteSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: overlapRemoteXml,
      baseRevision: fieldMerge.revision,
      source: "editor",
      clientId: "remote-browser",
    }),
  })
  assert.equal(overlapRemoteSave.status, 200)
  const overlapSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: overlapLocalXml,
      baseRevision: fieldMerge.revision,
      source: "editor",
      clientId: "local-browser",
    }),
  })
  assert.equal(overlapSave.status, 409)
  const overlapConflict = await overlapSave.json()
  assert.equal(overlapConflict.merge.status, "conflict")
  assert.equal(overlapConflict.merge.conflicts.includes("p1:node"), true)
  assert.equal(overlapConflict.merge.details[0].key, "p1:node")
  assert.equal(overlapConflict.merge.details[0].user.label, "Local Overlap")
  assert.equal(overlapConflict.merge.details[0].agent.label, "Remote Overlap")
  assert.equal(overlapConflict.merge.details[0].changedFields.includes("@_value"), true)
  assert.equal(overlapConflict.merge.details[0].fields[0].path, "@_value")
  assert.match(overlapConflict.merge.userResolutionXml, /Local Overlap/)
  assert.match(overlapConflict.merge.userResolutionXml, /AI NonConflict/)
  assert.match(overlapConflict.merge.userResolutionXml, /User NonConflict/)
  assert.match(overlapConflict.merge.agentResolutionXml, /Remote Overlap/)
  assert.match(overlapConflict.merge.agentResolutionXml, /AI NonConflict/)
  assert.match(overlapConflict.merge.agentResolutionXml, /User NonConflict/)
  assert.match(overlapConflict.current.xml, /Remote Overlap/)
  assert.doesNotMatch(overlapConflict.current.xml, /Local Overlap/)

  const eventsUrl = new URL(openResult.openUrl)
  eventsUrl.pathname = "/api/events"
  const eventsResponse = await fetch(eventsUrl)
  assert.equal(eventsResponse.status, 200)

  const finalize = JSON.parse(await plugin.tool.drawio_finalize.execute({
    file: "architecture.drawio",
    threshold: 0,
    scale: 1,
    border: 0,
  }, context))
  assert.equal(finalize.ok, true)
  assert.equal(finalize.png.output_path, "architecture.png")
  assert.equal((await fs.readFile(path.join(workspace, "architecture.png"))).subarray(0, 8).equals(PNG.subarray(0, 8)), true)
  assert.match(finalize.openUrl, /\/editor\?/)
  assert.equal(finalize.editorConnected, true)
  assert.equal(finalize.shouldOpenBrowser, false)
  assert.match(finalize.browserAction, /Do not call openwork_browser_open_url/)
  await eventsResponse.body.cancel()

  const health = JSON.parse(await plugin.tool.drawio_health_check.execute({ deep: true }, context))
  assert.equal(health.success, true)
  assert.equal(health.checks.deep_test.success, true)

  const annotationsUrl = new URL(finalize.openUrl)
  annotationsUrl.pathname = "/api/annotations"
  const editorHtml = await fetch(finalize.openUrl).then((response) => response.text())
  assert.match(editorHtml, /value="pending">待处理/)
  assert.match(editorHtml, /value="fresh">未完成/)
  assert.match(editorHtml, /value="ignored">已忽略/)
  assert.match(editorHtml, /data-status="ignored">忽略/)
  assert.match(editorHtml, /const statusUrl = new URL\(CONFIG\.annotationsUrl\)/)
  assert.match(editorHtml, /statusUrl\.pathname = statusUrl\.pathname\.endsWith/)
  assert.doesNotMatch(editorHtml, /fetch\(CONFIG\.annotationsUrl \+ "\/"/)
  const editorScripts = [...editorHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  assert.ok(editorScripts.length > 0)
  for (const [, script] of editorScripts) new Script(script)
  const liveInspect = JSON.parse(await plugin.tool.drawio_inspect.execute({
    file: "architecture.drawio",
  }, context))
  const pageId = liveInspect.pages[0].id
  const pageName = liveInspect.pages[0].name
  const submitted = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "把该节点改名为 Draw.io 并标记处理完成",
      scope: "selection_only",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Agent" }],
    }),
  }).then((response) => response.json())
  assert.equal(submitted.ok, true, JSON.stringify(submitted))
  assert.equal(submitted.annotation.status, "open")
  assert.equal(submitted.annotation.freshness, "fresh")
  assert.equal(submitted.annotation.requiresConfirmation, false)
  assert.equal(submitted.annotation.cells.length, 1)
  assert.equal(submitted.annotation.scope, "selection_only")
  assert.equal(submitted.annotation.scopeLabel, "只修改选区")
  assert.ok(submitted.annotation.region)
  assert.ok(submitted.annotation.region.width > 0)

  const listResult = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, context))
  assert.equal(listResult.count, 1)
  assert.equal(listResult.annotations[0].id, submitted.annotation.id)
  assert.equal(listResult.counts.pending, 1)
  assert.equal(listResult.counts.open, 1)
  assert.equal(listResult.counts.fresh, 1)
  const freshOnly = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "fresh",
  }, context))
  assert.equal(freshOnly.count, 1)
  assert.equal(freshOnly.annotations[0].effectiveStatus, "open")

  // Simulate an explicit user task that advances the revision without touching
  // the annotated cell. Explicit work runs before activating an annotation's
  // guarded write flow; the annotation must remain fresh and executable.
  const beforeExplicitTask = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const explicitTaskPreview = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    operations: [{ type: "add-node", id: "explicit-task-node", label: "Explicit Task" }],
    dry_run: true,
    base_revision: beforeExplicitTask.revision,
  }, context))
  assert.equal(explicitTaskPreview.diff.summary.added, 1)
  const explicitTaskArgs = {
    file: "architecture.drawio",
    preview_id: explicitTaskPreview.preview.id,
    plan: "新增 Explicit Task 节点",
  }
  const { first: explicitApprovalPrompt, second: explicitTask } = await executeWithApprovalQuestion(
    plugin.tool.drawio_authorize_preview.execute,
    explicitTaskArgs,
  )
  assert.equal(explicitTask.applied, true)
  assert.match(explicitApprovalPrompt.question.arguments.questions[0].question, /审批编号/)

  const freshAfterExplicitTask = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, context))
  assert.equal(freshAfterExplicitTask.count, 1)
  assert.equal(freshAfterExplicitTask.annotations[0].id, submitted.annotation.id)
  assert.equal(freshAfterExplicitTask.annotations[0].status, "open")
  assert.equal(freshAfterExplicitTask.annotations[0].freshness, "fresh")
  assert.equal(freshAfterExplicitTask.annotations[0].requiresConfirmation, false)
  assert.ok(
    freshAfterExplicitTask.annotations[0].currentRevision
      > freshAfterExplicitTask.annotations[0].baseRevision,
  )

  const detail = JSON.parse(await plugin.tool.drawio_get_annotation.execute({
    id: submitted.annotation.id,
  }, context))
  assert.equal(detail.annotation.id, submitted.annotation.id)
  assert.equal(Array.isArray(detail.cellSnapshots), true)
  assert.equal(detail.cellSnapshots[0].id, "node")
  assert.equal(detail.cellSnapshots[0].missing, undefined)

  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      page: "wrong-page",
      annotation_id: submitted.annotation.id,
      operations: [{ type: "update-node", id: "node", label: "Wrong Page" }],
      dry_run: true,
    }, context),
    /is bound to page/,
  )

  const beforePatch = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const dryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    operations: [{ type: "update-node", id: "node", label: "Draw.io" }],
    dry_run: true,
    base_revision: beforePatch.revision,
  }, context))
  assert.equal(dryRun.dryRun, true)
  assert.equal(dryRun.preview.status, "pending")
  assert.equal(dryRun.preview.baseRevision, beforePatch.revision)
  assert.equal(dryRun.preview.summary.changed, 1)
  const previewUrl = new URL(finalize.openUrl)
  previewUrl.pathname = "/api/preview"
  const visiblePreview = await fetch(previewUrl).then((response) => response.json())
  assert.equal(visiblePreview.preview.id, dryRun.preview.id)
  assert.match(visiblePreview.preview.xml, /__ai_preview_/)
  assert.match(visiblePreview.preview.xml, /#f59e0b/)
  assert.doesNotMatch(await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"), /__ai_preview_/)
  const previewArtifactSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: visiblePreview.preview.xml,
      baseRevision: beforePatch.revision,
      source: "editor",
      clientId: "preview-artifact-test",
    }),
  })
  assert.equal(previewArtifactSave.status, 409)
  assert.equal((await previewArtifactSave.json()).error, "preview_artifact")
  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      operations: [{ type: "update-node", id: "node", label: "Draw.io" }],
      dry_run: false,
      base_revision: beforePatch.revision,
    }, context),
    /pre-approved approval_token|has not been approved|formal writes require/,
  )
  await assert.rejects(
    plugin.tool.drawio_authorize_annotation_change.execute({
      id: submitted.annotation.id,
      plan: "尝试扩大到关联连线",
      proposed_changed_ids: ["node"],
      requested_scope: "selection_and_edges",
    }, context),
    /requires an explicit reason/,
  )
  const annotationApprovalArgs = {
    id: submitted.annotation.id,
    plan: "仅把选中节点 node 改名为 Draw.io",
    proposed_changed_ids: ["node"],
    requested_scope: "selection_only",
  }
  const { first: annotationApprovalPrompt, second: authorization } = await executeWithApprovalQuestion(
    plugin.tool.drawio_authorize_annotation_change.execute,
    annotationApprovalArgs,
  )
  assert.equal(authorization.ok, true)
  assert.equal(authorization.baseRevision, beforePatch.revision)
  assert.equal(authorization.requestedScope, "selection_only")
  assert.equal(authorization.previewId, dryRun.preview.id)
  assert.match(annotationApprovalPrompt.question.arguments.questions[0].question, /仅把选中节点 node 改名为 Draw\.io/)
  assert.match(annotationApprovalPrompt.question.arguments.questions[0].question, /变更 ID：node/)
  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      operations: [{ type: "update-node", id: "neighbor", label: "Out of scope" }],
      dry_run: false,
      base_revision: beforePatch.revision,
      annotation_id: submitted.annotation.id,
      approval_token: authorization.approvalToken,
    }, context),
    /not disclosed|scope violation/,
  )
  const patchResult = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    operations: [{ type: "update-node", id: "node", label: "Draw.io" }],
    dry_run: false,
    base_revision: beforePatch.revision,
    annotation_id: submitted.annotation.id,
    approval_token: authorization.approvalToken,
  }, context))
  assert.equal(patchResult.diff.summary.changed, 1)
  assert.doesNotMatch(await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"), /__ai_preview_/)
  assert.equal((await fetch(previewUrl).then((response) => response.json())).preview, null)
  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      operations: [{ type: "update-node", id: "node", label: "Draw.io Again" }],
      dry_run: false,
      base_revision: patchResult.revision,
      annotation_id: submitted.annotation.id,
      approval_token: authorization.approvalToken,
    }, context),
    /already been used|revision/,
  )

  const resolved = JSON.parse(await plugin.tool.drawio_resolve_annotation.execute({
    id: submitted.annotation.id,
    summary: "已将节点改名为 Draw.io",
    changed_ids: ["node"],
  }, context))
  assert.equal(resolved.ok, true)
  assert.equal(resolved.annotation.status, "resolved")
  assert.equal(resolved.annotation.result.changedIds.join(","), "node")

  const storedAnnotations = await fs.readFile(path.join(workspace, "architecture.annotations.json"), "utf8")
  assert.match(storedAnnotations, /architecture\/|architecture\.drawio|"file":\s*"architecture.drawio"/)
  assert.match(storedAnnotations, /已将节点改名为 Draw\.io/)
  assert.match(storedAnnotations, /"schemaVersion":\s*3/)
  assert.doesNotMatch(storedAnnotations, /"sessionId"/)
  assert.doesNotMatch(storedAnnotations, /approvalToken|"authorization"|base64url/)

  const openAfterResolve = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, context))
  assert.equal(openAfterResolve.count, 0)

  const previewEventsUrl = new URL(openResult.openUrl)
  previewEventsUrl.pathname = "/api/events"
  const previewEventsResponse = await fetch(previewEventsUrl)
  assert.equal(previewEventsResponse.status, 200)
  const previewEventsReader = previewEventsResponse.body.getReader()
  const nextPreviewEvent = createSseFrameReader(previewEventsReader)
  assert.match(await nextPreviewEvent(), /^: connected/)

  const generalPreviewState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const previewContext = { ...context }
  const generalPatchArgs = {
    file: "architecture.drawio",
    operations: [{ type: "update-node", id: "neighbor", label: "Neighbor Preview" }],
    dry_run: false,
    base_revision: generalPreviewState.revision,
    approval_plan: "将 Neighbor 节点改名为 Neighbor Preview",
  }
  const { second: generalPreviewAuthorization } = await executeWithApprovalQuestion(
    plugin.tool.drawio_patch.execute,
    generalPatchArgs,
    previewContext,
  )
  assert.equal(generalPreviewAuthorization.revision, generalPreviewState.revision + 1)
  const createdPreviewEvent = await nextMatchingSseFrame(nextPreviewEvent, /"kind":"created"/)
  assert.match(createdPreviewEvent, /^event: preview\ndata: /)
  assert.match(await nextMatchingSseFrame(nextPreviewEvent, /"kind":"authorized"/), /^event: preview/)
  assert.match(await nextMatchingSseFrame(nextPreviewEvent, /"kind":"applied"/), /^event: preview/)
  assert.match(await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"), /Neighbor Preview/)
  assert.equal((await fetch(previewUrl).then((response) => response.json())).preview, null)

  const cancelPreviewDryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    operations: [{ type: "update-node", id: "neighbor", label: "Cancelled Candidate" }],
    dry_run: true,
    base_revision: generalPreviewAuthorization.revision,
  }, context))
  assert.match(await nextMatchingSseFrame(nextPreviewEvent, /^event: diagram\\ndata: /), /^event: diagram/)
  assert.match(await nextMatchingSseFrame(nextPreviewEvent, /"kind":"created"/), /^event: preview/)
  const cancelPreviewUrl = new URL(previewUrl)
  cancelPreviewUrl.pathname = `/api/preview/${encodeURIComponent(cancelPreviewDryRun.preview.id)}`
  const cancelledPreview = await fetch(cancelPreviewUrl, { method: "DELETE" }).then((response) => response.json())
  assert.equal(cancelledPreview.preview.status, "cancelled")
  assert.match(await nextMatchingSseFrame(nextPreviewEvent, /"kind":"cancelled"/), /^event: preview/)
  await previewEventsReader.cancel()
  assert.doesNotMatch(await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"), /Cancelled Candidate/)

  const styleState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const styleDryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    operations: [
      {
        type: "update-node",
        id: "node",
        style_updates: { font_size: 26, fill_color: "#123456", font_color: "#ffffff" },
      },
      {
        type: "add-edge",
        id: "preview-edge",
        source: "node",
        target: "neighbor",
        style_updates: { stroke_color: "#7c3aed", stroke_width: 3 },
      },
    ],
    dry_run: true,
    base_revision: styleState.revision,
  }, context))
  const nodeStyleChange = styleDryRun.diff.changed.find((entry) => entry.cellId === "node")
  assert.deepEqual(
    nodeStyleChange.styleChanges.map((entry) => entry.property),
    ["fillColor", "fontColor", "fontSize"],
  )
  assert.equal(nodeStyleChange.styleChanges.find((entry) => entry.property === "fontSize").after, "26")
  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      operations: [{
        type: "update-node",
        id: "node",
        style_updates: { fill_color: "#fff;editable=1" },
      }],
      dry_run: true,
      base_revision: styleState.revision,
    }, context),
    /unsafe Draw\.io style delimiter/,
  )
  const styleVisiblePreview = await fetch(previewUrl).then((response) => response.json())
  assert.equal(typeof styleVisiblePreview.preview.beforePreviewXml, "string")
  assert.equal(typeof styleVisiblePreview.preview.afterPreviewXml, "string")
  assert.equal(styleVisiblePreview.preview.afterPreviewXml, styleVisiblePreview.preview.candidateXml)
  assert.notEqual(styleVisiblePreview.preview.comparePreviewXml, styleVisiblePreview.preview.candidateXml)
  assert.equal(styleVisiblePreview.preview.xml, styleVisiblePreview.preview.comparePreviewXml)
  const candidateEdgeTag = styleVisiblePreview.preview.afterPreviewXml
    .match(/<mxCell[^>]*id="preview-edge"[^>]*>/)?.[0]
  assert.match(candidateEdgeTag, /strokeColor=#7c3aed/)
  assert.doesNotMatch(candidateEdgeTag, /strokeColor=#22c55e/)

  const fullXmlCandidate = styleState.xml
    .replace("<mxGraphModel>", '<mxGraphModel background="#ddeeff">')
    .replace('id="node"', 'id="node" style="fontSize=26;fillColor=#123456;fontColor=#ffffff;"')
  const fullXmlPreview = JSON.parse(await plugin.tool.drawio_preview_state.execute({
    base_revision: styleState.revision,
    xml: fullXmlCandidate,
  }, context))
  assert.equal(fullXmlPreview.ok, true)
  assert.equal(fullXmlPreview.diff.pageChanges[0].property, "background")
  assert.equal(fullXmlPreview.diff.pageChanges[0].after, "#ddeeff")
  assert.equal(fullXmlPreview.diff.changed[0].styleChanges.length, 3)
  assert.deepEqual(fullXmlPreview.affectedPageIds, ["p1"])
  const fullXmlVisiblePreview = await fetch(previewUrl).then((response) => response.json())
  assert.doesNotMatch(fullXmlVisiblePreview.preview.beforePreviewXml, /background="#ddeeff"/)
  assert.match(fullXmlVisiblePreview.preview.afterPreviewXml, /background="#ddeeff"/)
  assert.equal(fullXmlVisiblePreview.preview.afterPreviewXml, fullXmlVisiblePreview.preview.candidateXml)
  assert.equal(fullXmlVisiblePreview.preview.xml, fullXmlVisiblePreview.preview.comparePreviewXml)
  const undecoratedPreviewSave = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: fullXmlCandidate,
      baseRevision: styleState.revision,
      source: "editor",
      clientId: "undecorated-preview-test",
    }),
  })
  assert.equal(undecoratedPreviewSave.status, 409)
  assert.equal((await undecoratedPreviewSave.json()).error, "preview_candidate")
  const { second: fullXmlApplied } = await executeWithApprovalQuestion(
    plugin.tool.drawio_authorize_preview.execute,
    {
    file: "architecture.drawio",
    preview_id: fullXmlPreview.preview.id,
    plan: "将节点字体调大并修改填充色，同时调整第一页背景色",
    },
    previewContext,
  )
  assert.equal(fullXmlApplied.applied, true)
  assert.match(await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"), /fontSize=26/)
  assert.doesNotMatch(await fs.readFile(path.join(workspace, "architecture.drawio"), "utf8"), /preview-edge/)

  // Reopen a resolved annotation via the UI-toggle server path (PATCH status=open):
  // the state must revert, result/resolvedAt must clear, and no stale approval survives.
  const reopenUrl = new URL(annotationsUrl.toString())
  reopenUrl.pathname += "/" + encodeURIComponent(submitted.annotation.id)
  const reopened = await fetch(reopenUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "open" }),
  }).then((response) => response.json())
  assert.equal(reopened.ok, true)
  assert.equal(reopened.annotation.status, "open")
  assert.equal(reopened.annotation.result, null)
  assert.equal(reopened.annotation.resolvedAt, null)

  const reopenedDetail = JSON.parse(await plugin.tool.drawio_get_annotation.execute({
    file: "architecture.drawio",
    id: submitted.annotation.id,
  }, context))
  assert.equal(reopenedDetail.annotation.status, "open")
  assert.equal(reopenedDetail.annotation.resolvedAt, null, "reopen must clear the resolved timestamp")
  assert.equal(reopenedDetail.annotation.authorization, null, "reopen must not carry over a stale approval")

  const reopenedList = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, context))
  assert.equal(reopenedList.count, 1, "reopened annotation must reappear in open tasks")

  const reResolved = await fetch(reopenUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "resolved", summary: "已由用户标记为已解决" }),
  }).then((response) => response.json())
  assert.equal(reResolved.ok, true)
  assert.equal(reResolved.annotation.status, "resolved")
  assert.equal(reResolved.annotation.resolvedAt, reResolved.annotation.result.updatedAt)

  // Ignoring is a terminal, user-controlled state. It removes the task from
  // pending work, invalidates approvals across sessions, and can only continue
  // after an explicit reopen.
  const ignoredAnn = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "这条注释将被手动忽略",
      scope: "selection_only",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Draw.io" }],
    }),
  }).then((response) => response.json())
  await plugin.tool.drawio_get_annotation.execute({ id: ignoredAnn.annotation.id }, context)
  const ignoredBase = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const ignoredPreview = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    annotation_id: ignoredAnn.annotation.id,
    operations: [{ type: "update-node", id: "node", label: "Ignored Candidate" }],
    dry_run: true,
    base_revision: ignoredBase.revision,
  }, context))
  const { second: ignoredAuthorization } = await executeWithApprovalQuestion(
    plugin.tool.drawio_authorize_annotation_change.execute,
    {
    id: ignoredAnn.annotation.id,
    plan: "准备修改后由用户决定忽略",
    proposed_changed_ids: ["node"],
    requested_scope: "selection_only",
    preview_id: ignoredPreview.preview.id,
    },
  )
  const ignoredStatusUrl = new URL(annotationsUrl)
  ignoredStatusUrl.pathname = `${annotationsUrl.pathname}/${encodeURIComponent(ignoredAnn.annotation.id)}`
  const ignoredResult = await fetch(ignoredStatusUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "ignored", reason: "当前不需要处理" }),
  }).then((response) => response.json())
  assert.equal(ignoredResult.annotation.status, "ignored")
  assert.equal(ignoredResult.annotation.effectiveStatus, "ignored")
  assert.equal(ignoredResult.annotation.ignoredReason, "当前不需要处理")
  assert.ok(ignoredResult.annotation.ignoredAt)
  await assert.rejects(
    plugin.tool.drawio_authorize_annotation_change.execute({
      id: ignoredAnn.annotation.id,
      plan: "忽略后不应再授权",
      proposed_changed_ids: ["node"],
      requested_scope: "selection_only",
    }, context),
    /must be reopened before authorization/,
  )
  await assert.rejects(
    plugin.tool.drawio_resolve_annotation.execute({
      id: ignoredAnn.annotation.id,
      summary: "忽略后不能由 Agent 直接完成",
    }, context),
    /must be reopened before it can be resolved/,
  )
  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      operations: [{ type: "update-node", id: "node", label: "Should Not Apply" }],
      dry_run: false,
      base_revision: ignoredBase.revision,
      annotation_id: ignoredAnn.annotation.id,
      approval_token: ignoredAuthorization.approvalToken,
    }, context),
    /must be reopened before processing|not active|invalidated|re-read the annotation/,
  )
  const ignoredListUrl = new URL(annotationsUrl)
  ignoredListUrl.searchParams.set("status", "ignored")
  const ignoredList = await fetch(ignoredListUrl).then((response) => response.json())
  assert.equal(ignoredList.count, 1)
  assert.equal(ignoredList.annotations[0].id, ignoredAnn.annotation.id)
  assert.equal(ignoredList.counts.ignored, 1)
  const pendingAfterIgnore = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "pending",
  }, context))
  assert.equal(pendingAfterIgnore.count, 0)
  assert.equal((await fetch(ignoredStatusUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "resolved", summary: "不能跨终态转换" }),
  })).status, 409)

  const reopenedIgnored = await fetch(ignoredStatusUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "open" }),
  }).then((response) => response.json())
  assert.equal(reopenedIgnored.annotation.status, "open")
  assert.equal(reopenedIgnored.annotation.ignoredAt, null)
  assert.equal(reopenedIgnored.annotation.ignoredReason, null)
  assert.equal(reopenedIgnored.annotation.authorization, null)
  assert.equal((await fetch(ignoredStatusUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "unknown" }),
  })).status, 400)
  const reignored = await fetch(ignoredStatusUrl, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "ignored", reason: "保持忽略" }),
  }).then((response) => response.json())
  assert.equal(reignored.annotation.status, "ignored")

  const invalidStatusUrl = new URL(annotationsUrl)
  invalidStatusUrl.searchParams.set("status", "unknown")
  assert.equal((await fetch(invalidStatusUrl)).status, 400)

  const globalAnn = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "把第二页的 Remote 节点改名为 Global Remote",
      scope: "diagram_wide",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Draw.io" }],
    }),
  }).then((response) => response.json())
  assert.equal(globalAnn.annotation.scope, "diagram_wide")
  assert.equal(globalAnn.annotation.scopeLabel, "允许修改整个图表")

  // Simulate a fresh conversation/process cache: annotations must reload from
  // the diagram sidecar even though its legacy creator session differs.
  const v2BeforeMigration = JSON.parse(await fs.readFile(
    path.join(workspace, "architecture.annotations.json"),
    "utf8",
  ))
  await fs.writeFile(
    path.join(workspace, "architecture.annotations.json"),
    JSON.stringify({
      schemaVersion: 2,
      file: "architecture.drawio",
      annotations: v2BeforeMigration.annotations.map((task) => ({
        ...task,
        status: task.id === globalAnn.annotation.id ? "stale" : task.status,
        sessionId: "legacy-foreign-session",
      })),
    }, null, 2),
    "utf8",
  )
  globalThis.__drawioIntegratedBridge.annotationsByDiagram.clear()
  const secondContext = {
    ...context,
    sessionID: "integrated-session-2",
    messageID: "integrated-message-2",
  }
  const secondOpen = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "architecture.drawio",
  }, secondContext))
  assert.equal(secondOpen.ok, true)
  const secondList = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, secondContext))
  assert.equal(secondList.count, 1)
  assert.equal(secondList.annotations[0].id, globalAnn.annotation.id)
  assert.equal(secondList.annotations[0].status, "open")

  await plugin.tool.drawio_get_annotation.execute({
    file: "architecture.drawio",
    id: globalAnn.annotation.id,
  }, secondContext)
  const secondState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, secondContext))
  const globalDryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    page: "p2",
    operations: [{ type: "update-node", id: "remote", label: "Global Remote" }],
    dry_run: true,
    base_revision: secondState.revision,
  }, secondContext))
  assert.equal(globalDryRun.preview.status, "pending")
  const { second: globalAuthorization } = await executeWithApprovalQuestion(
    plugin.tool.drawio_authorize_annotation_change.execute,
    {
    file: "architecture.drawio",
    id: globalAnn.annotation.id,
    plan: "修改第二页的 remote 节点",
    proposed_changed_ids: ["p2:remote"],
    requested_scope: "diagram_wide",
    preview_id: globalDryRun.preview.id,
    },
    secondContext,
  )
  assert.equal(globalAuthorization.previewId, globalDryRun.preview.id)
  assert.equal(globalAuthorization.allowedExistingIds.includes("p2:remote"), true)

  await plugin.tool.drawio_get_annotation.execute({
    file: "architecture.drawio",
    id: globalAnn.annotation.id,
  }, context)
  const firstState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  await assert.rejects(
    plugin.tool.drawio_patch.execute({
      file: "architecture.drawio",
      page: "p2",
      operations: [{ type: "update-node", id: "remote", label: "Cross-session token" }],
      dry_run: false,
      base_revision: firstState.revision,
      annotation_id: globalAnn.annotation.id,
      approval_token: globalAuthorization.approvalToken,
    }, context),
    /has not been approved|different diagram session/,
  )

  const globalPatch = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    page: "p2",
    operations: [{ type: "update-node", id: "remote", label: "Global Remote" }],
    dry_run: false,
    base_revision: secondState.revision,
    annotation_id: globalAnn.annotation.id,
    approval_token: globalAuthorization.approvalToken,
  }, secondContext))
  assert.deepEqual(globalPatch.changedIds, ["remote"])
  await plugin.tool.drawio_resolve_annotation.execute({
    file: "architecture.drawio",
    id: globalAnn.annotation.id,
    summary: "已修改第二页节点",
    changed_ids: ["p2:remote"],
  }, secondContext)
  const migratedStore = await fs.readFile(path.join(workspace, "architecture.annotations.json"), "utf8")
  assert.match(migratedStore, /"schemaVersion":\s*3/)
  assert.doesNotMatch(migratedStore, /legacy-foreign-session|"sessionId"/)

  const polishAnn = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "重新整理第一页的整体布局",
      scope: "diagram_wide",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Draw.io" }],
    }),
  }).then((response) => response.json())
  await plugin.tool.drawio_get_annotation.execute({ id: polishAnn.annotation.id }, context)
  const beforePolish = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const polishDryRun = JSON.parse(await plugin.tool.drawio_polish.execute({
    file: "architecture.drawio",
    page: "p1",
    direction: "top-to-bottom",
    threshold: 0,
    dry_run: true,
    base_revision: beforePolish.revision,
  }, context))
  assert.ok(polishDryRun.changedIds.length > 0)
  const { second: polishAuthorization } = await executeWithApprovalQuestion(
    plugin.tool.drawio_authorize_annotation_change.execute,
    {
    id: polishAnn.annotation.id,
    plan: "重新布局第一页中的全部节点和连线",
    proposed_changed_ids: polishDryRun.changedIds.map((id) => `p1:${id}`),
    requested_scope: "diagram_wide",
    preview_id: polishDryRun.preview.id,
    },
  )
  const polished = JSON.parse(await plugin.tool.drawio_polish.execute({
    file: "architecture.drawio",
    page: "p1",
    direction: "top-to-bottom",
    threshold: 0,
    dry_run: false,
    base_revision: beforePolish.revision,
    annotation_id: polishAnn.annotation.id,
    approval_token: polishAuthorization.approvalToken,
  }, context))
  assert.equal(polished.accepted, true)
  await plugin.tool.drawio_resolve_annotation.execute({
    id: polishAnn.annotation.id,
    summary: "已重新整理第一页布局",
    changed_ids: polishDryRun.changedIds.map((id) => `p1:${id}`),
  }, context)

  const staleAnn = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "检查陈旧标记",
      scope: "surrounding_layout",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Draw.io" }],
    }),
  }).then((response) => response.json())
  const staleRevision = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context)).revision
  const externalChange = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: JSON.parse(await plugin.tool.drawio_get_state.execute({}, context)).xml.replace("Draw.io", "Draw.io Updated"),
      baseRevision: staleRevision,
      source: "editor",
      clientId: "stale-test",
    }),
  })
  assert.equal(externalChange.status, 200)
  const staleDetail = JSON.parse(await plugin.tool.drawio_get_annotation.execute({
    id: staleAnn.annotation.id,
  }, context))
  assert.equal(staleDetail.annotation.status, "open")
  assert.equal(staleDetail.annotation.effectiveStatus, "stale")
  assert.equal(staleDetail.annotation.freshness, "stale")
  assert.equal(staleDetail.annotation.requiresConfirmation, true)
  assert.equal(staleDetail.annotation.stale, true)
  assert.match(staleDetail.annotation.staleReason, /changed/)

  const openWithStale = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, context))
  assert.equal(openWithStale.count, 1)
  assert.equal(openWithStale.annotations[0].id, staleAnn.annotation.id)
  assert.equal(openWithStale.annotations[0].requiresConfirmation, true)
  assert.equal(openWithStale.counts.open, 1)
  assert.equal(openWithStale.counts.stale, 1)
  assert.equal(openWithStale.counts.fresh, 0)

  const staleOnly = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "stale",
  }, context))
  assert.equal(staleOnly.count, 1)
  assert.equal(staleOnly.annotations[0].id, staleAnn.annotation.id)

  // Simulate user confirmation: re-read the latest revision, apply the stale
  // task on its bound page through the same pre-write approval guard, then
  // resolve it only after the write succeeds.
  const confirmedState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const confirmedDryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    annotation_id: staleAnn.annotation.id,
    operations: [{ type: "update-node", id: "node", label: "Draw.io Confirmed" }],
    dry_run: true,
    base_revision: confirmedState.revision,
  }, context))
  assert.equal(confirmedDryRun.dryRun, true)
  const { second: staleAuthorization } = await executeWithApprovalQuestion(
    plugin.tool.drawio_authorize_annotation_change.execute,
    {
    id: staleAnn.annotation.id,
    plan: "用户确认后把选中节点 node 改名为 Draw.io Confirmed",
    proposed_changed_ids: ["node"],
    requested_scope: "selection_only",
    preview_id: confirmedDryRun.preview.id,
    },
  )
  const confirmedPatch = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    annotation_id: staleAnn.annotation.id,
    operations: [{ type: "update-node", id: "node", label: "Draw.io Confirmed" }],
    dry_run: false,
    base_revision: confirmedState.revision,
    approval_token: staleAuthorization.approvalToken,
  }, context))
  assert.equal(confirmedPatch.diff.summary.changed, 1)

  const staleResolved = JSON.parse(await plugin.tool.drawio_resolve_annotation.execute({
    id: staleAnn.annotation.id,
    summary: "用户确认后基于最新版本完成修改",
    changed_ids: ["node"],
  }, context))
  assert.equal(staleResolved.ok, true)
  assert.equal(staleResolved.annotation.status, "resolved")
  assert.equal(staleResolved.annotation.requiresConfirmation, false)

  const finalOpenAnnotations = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "open",
  }, context))
  assert.equal(finalOpenAnnotations.count, 0)
  const finalStaleAnnotations = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "stale",
  }, context))
  assert.equal(finalStaleAnnotations.count, 0)
  const finalResolvedAnnotations = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "resolved",
  }, context))
  assert.equal(finalResolvedAnnotations.count, 4)
  assert.deepEqual(
    new Set(finalResolvedAnnotations.annotations.map((annotation) => annotation.id)),
    new Set([
      submitted.annotation.id,
      globalAnn.annotation.id,
      polishAnn.annotation.id,
      staleAnn.annotation.id,
    ]),
  )
  const finalIgnoredAnnotations = JSON.parse(await plugin.tool.drawio_list_annotations.execute({
    file: "architecture.drawio",
    status: "ignored",
  }, context))
  assert.equal(finalIgnoredAnnotations.count, 1)
  assert.equal(finalIgnoredAnnotations.annotations[0].id, ignoredAnn.annotation.id)

  const annotationFinalize = JSON.parse(await plugin.tool.drawio_finalize.execute({
    file: "architecture.drawio",
    threshold: 0,
    scale: 1,
    border: 0,
  }, context))
  assert.equal(annotationFinalize.ok, true)
  assert.equal(annotationFinalize.png.output_path, "architecture.png")
  assert.match(annotationFinalize.openUrl, /\/editor\?/)
  assert.deepEqual(annotationFinalize.pendingAnnotations, [])

  // The finalize gate must hard-block while a fresh (requiresConfirmation=false)
  // annotation is still open: it cannot silently finalize unfinished work.
  const blockingAnn = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "必须先行处理的门禁注释",
      scope: "selection_only",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Draw.io Confirmed" }],
    }),
  }).then((response) => response.json())
  assert.equal(blockingAnn.ok, true)
  await assert.rejects(
    () => plugin.tool.drawio_finalize.execute({
      file: "architecture.drawio",
      threshold: 0,
      scale: 1,
      border: 0,
    }, context),
    /refusing to finalize: 1 unfinished fresh annotation/,
  )

  // Handle and resolve the fresh annotation, then finalize succeeds with no pending work.
  await plugin.tool.drawio_get_annotation.execute({ id: blockingAnn.annotation.id }, context)
  const blockingState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const blockingPatchDryRun = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    annotation_id: blockingAnn.annotation.id,
    operations: [{ type: "update-node", id: "node", label: "Draw.io Gated" }],
    dry_run: true,
    base_revision: blockingState.revision,
  }, context))
  assert.equal(blockingPatchDryRun.dryRun, true)
  const { second: blockingApproval } = await executeWithApprovalQuestion(
    plugin.tool.drawio_authorize_annotation_change.execute,
    {
    id: blockingAnn.annotation.id,
    plan: "用户确认后把选中节点门禁注释对应的改名执行完成",
    proposed_changed_ids: ["node"],
    requested_scope: "selection_only",
    preview_id: blockingPatchDryRun.preview.id,
    },
  )
  const repeatedBlockingApproval = JSON.parse(
    await plugin.tool.drawio_authorize_annotation_change.execute({
      id: blockingAnn.annotation.id,
      plan: "把门禁注释对应的节点改名写入图表",
      proposed_changed_ids: ["node"],
      requested_scope: "selection_only",
      preview_id: blockingPatchDryRun.preview.id,
    }, context),
  )
  assert.equal(repeatedBlockingApproval.alreadyAuthorized, true)
  assert.equal(repeatedBlockingApproval.approvalToken, blockingApproval.approvalToken)
  const blockingPatch = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    annotation_id: blockingAnn.annotation.id,
    operations: [{ type: "update-node", id: "node", label: "Draw.io Gated" }],
    dry_run: false,
    base_revision: blockingState.revision,
    approval_token: blockingApproval.approvalToken,
  }, context))
  assert.equal(blockingPatch.diff.summary.changed, 1)
  const blockingResolved = JSON.parse(await plugin.tool.drawio_resolve_annotation.execute({
    id: blockingAnn.annotation.id,
    summary: "门禁注释已处理",
    changed_ids: ["node"],
  }, context))
  assert.equal(blockingResolved.annotation.status, "resolved")
  const gateFinalize = JSON.parse(await plugin.tool.drawio_finalize.execute({
    file: "architecture.drawio",
    threshold: 0,
    scale: 1,
    border: 0,
  }, context))
  assert.equal(gateFinalize.ok, true)
  assert.equal(gateFinalize.pendingAnnotations.length, 0)

  // A stale (requiresConfirmation=true) annotation does not block finalize, but is
  // reported through pendingAnnotations so the agent asks the user before ending.
  const staleGateAnn = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "等待用户确认的过时注释",
      scope: "selection_only",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "node", label: "Draw.io Gated" }],
    }),
  }).then((response) => response.json())
  assert.equal(staleGateAnn.ok, true)
  const staleGateState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const staleGateExternal = await fetch(apiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: JSON.parse(await plugin.tool.drawio_get_state.execute({}, context)).xml.replace("Draw.io Gated", "Draw.io Gated Manual"),
      baseRevision: staleGateState.revision,
      source: "editor",
      clientId: "stale-gate-test",
    }),
  })
  assert.equal(staleGateExternal.status, 200)
  const staleGateFinalize = JSON.parse(await plugin.tool.drawio_finalize.execute({
    file: "architecture.drawio",
    threshold: 0,
    scale: 1,
    border: 0,
  }, context))
  assert.equal(staleGateFinalize.ok, true)
  assert.equal(staleGateFinalize.pendingAnnotations.length, 1)
  assert.equal(staleGateFinalize.pendingAnnotations[0].id, staleGateAnn.annotation.id)
  assert.equal(staleGateFinalize.pendingAnnotations[0].requiresConfirmation, true)
  assert.equal(staleGateFinalize.pendingAnnotations[0].freshness, "stale")

  // Invalid annotations must be rejected with 400 before anything is
  // persisted or broadcast: unknown page, unknown cell, node/edge kind
  // mismatch, and edge endpoint mismatch.
  const guardState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, context))
  const guardEdgePreview = JSON.parse(await plugin.tool.drawio_patch.execute({
    file: "architecture.drawio",
    operations: [{ type: "add-edge", id: "guard-edge", source: "node", target: "neighbor", label: "Guard" }],
    dry_run: true,
    base_revision: guardState.revision,
  }, context))
  assert.equal(guardEdgePreview.diff.summary.added, 1)
  const guardApprovalArgs = {
    file: "architecture.drawio",
    preview_id: guardEdgePreview.preview.id,
    plan: "新增 Guard 连线",
  }
  const pendingGuardApproval = JSON.parse(await plugin.tool.drawio_authorize_preview.execute(
    guardApprovalArgs,
    context,
  ))
  answerApprovalQuestion(pendingGuardApproval, context.sessionID, "确认修改", true)
  const guardEdge = JSON.parse(await plugin.tool.drawio_authorize_preview.execute({
    ...guardApprovalArgs,
    plan: "把新增的 Guard 连线写入图表",
  }, context))
  assert.equal(guardEdge.applied, true)
  const repeatedGuardApproval = JSON.parse(await plugin.tool.drawio_authorize_preview.execute(
    guardApprovalArgs,
    context,
  ))
  assert.equal(repeatedGuardApproval.applied, true)
  assert.equal(repeatedGuardApproval.alreadyApplied, true)
  const invalidPage = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "页面不存在",
      scope: "selection_only",
      pageId: "missing-page",
      cells: [{ id: "node", kind: "node", label: "Agent" }],
    }),
  })
  assert.equal(invalidPage.status, 400)
  assert.match((await invalidPage.json()).error, /page "missing-page" not found/)
  await fs.writeFile(path.join(workspace, "missing-page-id.drawio"), MISSING_PAGE_ID_XML, "utf8")
  const pageIdCompatContext = {
    ...context,
    sessionID: "page-id-compat-session",
    messageID: "page-id-compat-message",
  }
  const pageIdCompatOpen = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "missing-page-id.drawio",
  }, pageIdCompatContext))
  const pageIdCompatUrl = new URL(pageIdCompatOpen.openUrl)
  pageIdCompatUrl.pathname = "/api/annotations"
  const compatibleNumericPage = await fetch(pageIdCompatUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "兼容 Draw.io 为缺失页面 ID 补出的数字索引",
      scope: "selection_and_edges",
      pageId: "0",
      pageName: "Page-1",
      cells: [
        { id: "compat-node", kind: "node", label: "Compat" },
        { id: "compat-edge", kind: "edge", label: "Flow", source: "compat-node", target: "compat-neighbor" },
      ],
    }),
  })
  assert.equal(compatibleNumericPage.status, 201)
  const compatibleNumericAnnotation = await compatibleNumericPage.json()
  assert.equal(compatibleNumericAnnotation.annotation.page.id, "page-1")
  assert.equal(compatibleNumericAnnotation.annotation.page.name, "Page-1")
  const mismatchedNumericPage = await fetch(pageIdCompatUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "错误页面名称不得按索引绑定",
      scope: "selection_only",
      pageId: "0",
      pageName: "Wrong Page",
      cells: [{ id: "compat-node", kind: "node", label: "Compat" }],
    }),
  })
  assert.equal(mismatchedNumericPage.status, 400)
  assert.match((await mismatchedNumericPage.json()).error, /page "0" not found/)
  const invalidCell = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "图元不存在",
      scope: "selection_only",
      pageId,
      pageName,
      cells: [{ id: "missing-cell", kind: "node", label: "Missing" }],
    }),
  })
  assert.equal(invalidCell.status, 400)
  assert.match((await invalidCell.json()).error, /cell "missing-cell" not found/)
  const invalidKind = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "类型不匹配",
      scope: "selection_only",
      pageId,
      pageName,
      cells: [{ id: "node", kind: "edge", label: "Agent" }],
    }),
  })
  assert.equal(invalidKind.status, 400)
  assert.match((await invalidKind.json()).error, /is not an edge/)
  const endpointMismatch = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "端点不匹配",
      scope: "selection_only",
      pageId,
      pageName,
      cells: [{ id: "guard-edge", kind: "edge", label: "Guard", source: "neighbor", target: "node" }],
    }),
  })
  assert.equal(endpointMismatch.status, 400)
  assert.match((await endpointMismatch.json()).error, /source mismatch/)
  const validEdge = await fetch(annotationsUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instruction: "合法连线注释",
      scope: "selection_only",
      pageId,
      pageName,
      cells: [{ id: "guard-edge", kind: "edge", label: "Guard", source: "node", target: "neighbor" }],
    }),
  })
  assert.equal(validEdge.status, 201)
  const validEdgeAnnotation = await validEdge.json()
  assert.equal(validEdgeAnnotation.ok, true)
  assert.ok(validEdgeAnnotation.annotation.region)

  await fs.writeFile(path.join(workspace, "other.drawio"), XML, "utf8")
  const originalEventsUrl = new URL(annotationFinalize.openUrl)
  originalEventsUrl.pathname = "/api/events"
  const originalEventsResponse = await fetch(originalEventsUrl)
  assert.equal(originalEventsResponse.status, 200)
  const otherOpen = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "other.drawio",
  }, context))
  assert.equal(otherOpen.editorConnected, false)
  assert.equal(otherOpen.shouldOpenBrowser, true)
  assert.match(otherOpen.browserAction, /openwork_browser_open_url/)
  assert.match(otherOpen.browserAction, /provider=builtin/)

  // An editor URL is permanently bound to its diagram. After the same
  // OpenCode session switches files, the old page must not read or write the
  // newly active file through its stale token.
  const staleApiUrl = new URL(annotationFinalize.openUrl)
  staleApiUrl.pathname = "/api/diagram"
  const staleRead = await fetch(staleApiUrl)
  assert.equal(staleRead.status, 401)
  const staleWrite = await fetch(staleApiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: XML.replace("MobileWork", "Must Not Write"),
      baseRevision: 0,
      source: "editor",
    }),
  })
  assert.equal(staleWrite.status, 401)
  const otherApiUrl = new URL(otherOpen.openUrl)
  otherApiUrl.pathname = "/api/diagram"
  const otherState = await fetch(otherApiUrl).then((response) => response.json())
  assert.match(otherState.xml, /MobileWork/)
  assert.doesNotMatch(otherState.xml, /Must Not Write/)

  const reopenedOriginal = JSON.parse(await plugin.tool.drawio_open.execute({
    file: "architecture.drawio",
  }, context))
  const resurrectedRead = await fetch(staleApiUrl)
  assert.equal(resurrectedRead.status, 401)
  const resurrectedWrite = await fetch(staleApiUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xml: XML.replace("MobileWork", "Resurrected Token Write"),
      baseRevision: 0,
      source: "editor",
    }),
  })
  assert.equal(resurrectedWrite.status, 401)
  const reopenedApiUrl = new URL(reopenedOriginal.openUrl)
  reopenedApiUrl.pathname = "/api/diagram"
  const reopenedRead = await fetch(reopenedApiUrl)
  assert.equal(reopenedRead.status, 200)
  await originalEventsResponse.body.cancel()

  const unicodeContext = {
    ...context,
    sessionID: "unicode-export-session",
    messageID: "unicode-export-message",
  }
  await plugin.tool.drawio_create.execute({
    file: "unicode-created.drawio",
    title: "中文系统架构图",
    nodes: [{ id: "node", label: "服务", kind: "service" }],
    edges: [],
    direction: "left-to-right",
    compressed: false,
    overwrite: false,
  }, unicodeContext)
  const unicodeCreatedXml = await fs.readFile(path.join(workspace, "unicode-created.drawio"), "utf8")
  assert.match(unicodeCreatedXml, /<diagram id="[\x20-\x7e]+" name="中文系统架构图">/)

  const unicodePageXml = XML.replace('id="p1" name="Page-1"', 'id="中文页面" name="中文页面"')
  await fs.writeFile(path.join(workspace, "unicode-existing.drawio"), unicodePageXml, "utf8")
  const finalizeRequestStart = exportRequests.length
  const unicodeFinalized = JSON.parse(await plugin.tool.drawio_finalize.execute({
    file: "unicode-existing.drawio",
    threshold: 0,
    scale: 1,
    border: 0,
  }, unicodeContext))
  assert.equal(unicodeFinalized.ok, true)
  const unicodeFinalizeRequests = exportRequests.slice(finalizeRequestStart)
    .filter((request) => request.xml.includes('name="中文页面"'))
  assert.ok(unicodeFinalizeRequests.length >= 1)
  for (const request of unicodeFinalizeRequests) {
    assert.doesNotMatch(request.xml, /<diagram id="中文页面"/)
    assert.match(request.xml, /<diagram id="[\x20-\x7e]+" name="中文页面">/)
  }
  assert.equal(await fs.readFile(path.join(workspace, "unicode-existing.drawio"), "utf8"), unicodePageXml)

  await plugin.tool.drawio_export.execute({
    input_path: "unicode-existing.drawio",
    output_path: "unicode-selected.png",
    format: "png",
    page_id: "中文页面",
    all_pages: false,
    scale: 1,
    border: 0,
    background: "#ffffff",
    embed_xml: false,
    overwrite: false,
  }, unicodeContext)
  const unicodeSelectedRequest = exportRequests.at(-1)
  assert.notEqual(unicodeSelectedRequest.pageId, "中文页面")
  assert.match(unicodeSelectedRequest.pageId, /^[\x20-\x7e]+$/)
  assert.match(unicodeSelectedRequest.xml, new RegExp(`<diagram id="${unicodeSelectedRequest.pageId}" name="中文页面">`))
  await assert.rejects(
    plugin.tool.drawio_export.execute({
      input_path: "unicode-existing.drawio",
      output_path: "unicode-missing.png",
      format: "png",
      page_id: "不存在的页面",
      all_pages: false,
      scale: 1,
      border: 0,
      background: "#ffffff",
      embed_xml: false,
      overwrite: false,
    }, unicodeContext),
    /requested page ID "不存在的页面" was not found/,
  )

  await fs.writeFile(path.join(workspace, "multi-page.drawio"), XML, "utf8")
  const multiPageRequestStart = exportRequests.length
  const multiPagePng = JSON.parse(await plugin.tool.drawio_export.execute({
    input_path: "multi-page.drawio",
    output_path: "exports/multi-page.png",
    format: "png",
    all_pages: true,
    scale: 1,
    border: 0,
    background: "#ffffff",
    embed_xml: false,
    overwrite: false,
  }, unicodeContext))
  assert.equal(multiPagePng.success, true)
  assert.equal(multiPagePng.all_pages, true)
  assert.equal(multiPagePng.page_count, 2)
  assert.deepEqual(
    multiPagePng.outputs.map((output) => [output.page_index, output.page_id, output.page_name]),
    [[1, "p1", "Page-1"], [2, "p2", "Page-2"]],
  )
  assert.deepEqual(
    multiPagePng.outputs.map((output) => output.output_path),
    [
      "exports/multi-page.page-1-page-1.png",
      "exports/multi-page.page-2-page-2.png",
    ],
  )
  const multiPageRequests = exportRequests.slice(multiPageRequestStart)
  assert.deepEqual(multiPageRequests.map((request) => request.pageId), ["p1", "p2"])
  assert.deepEqual(multiPageRequests.map((request) => request.allPages), [null, null])
  const firstPagePng = await fs.readFile(path.join(workspace, multiPagePng.outputs[0].output_path))
  const secondPagePng = await fs.readFile(path.join(workspace, multiPagePng.outputs[1].output_path))
  assert.notDeepEqual(firstPagePng, secondPagePng)
  await assert.rejects(
    fs.access(path.join(workspace, "exports", "multi-page.png")),
    /ENOENT/,
  )

  const multiPageXmlPng = JSON.parse(await plugin.tool.drawio_export.execute({
    input_path: "multi-page.drawio",
    output_path: "exports/editable.editable.png",
    format: "xmlpng",
    all_pages: true,
    scale: 1,
    border: 0,
    background: "#ffffff",
    embed_xml: false,
    overwrite: false,
  }, unicodeContext))
  assert.equal(multiPageXmlPng.page_count, 2)
  assert.deepEqual(
    multiPageXmlPng.outputs.map((output) => output.output_path),
    [
      "exports/editable.page-1-page-1.editable.png",
      "exports/editable.page-2-page-2.editable.png",
    ],
  )
  assert.deepEqual(exportRequests.slice(-2).map((request) => request.embedXml), ["1", "1"])

  const editorExportRequestStart = exportRequests.length
  const svgEditorRequired = JSON.parse(await plugin.tool.drawio_export.execute({
    input_path: "multi-page.drawio",
    output_path: "exports/multi-page.svg",
    format: "svg",
    all_pages: false,
    scale: 1,
    border: 0,
    background: "#ffffff",
    embed_xml: false,
    overwrite: false,
  }, unicodeContext))
  assert.equal(svgEditorRequired.status, "editor_required")
  assert.match(svgEditorRequired.openUrl, /\/editor\?/)
  assert.match(svgEditorRequired.browserAction, /openwork_browser_open_url/)
  assert.match(svgEditorRequired.browserAction, /provider=builtin/)
  assert.equal(
    exportRequests.slice(editorExportRequestStart).every((request) => request.format === "png"),
    true,
    "SVG itself must use the built-in browser Bridge instead of the HTTP Export Server",
  )
  const svgEventsUrl = new URL(svgEditorRequired.openUrl)
  svgEventsUrl.pathname = "/api/events"
  const svgEventsResponse = await fetch(svgEventsUrl)
  assert.equal(svgEventsResponse.status, 200)
  const svgEventsReader = svgEventsResponse.body.getReader()
  const svgReadyChunk = await svgEventsReader.read()
  assert.equal(svgReadyChunk.done, false)
  assert.equal(new TextDecoder().decode(svgReadyChunk.value), ": connected\n\n")
  const svgExportPromise = plugin.tool.drawio_export.execute({
    input_path: "multi-page.drawio",
    output_path: "exports/multi-page.svg",
    format: "svg",
    all_pages: false,
    scale: 1,
    border: 0,
    background: "#ffffff",
    embed_xml: false,
    overwrite: false,
  }, unicodeContext)
  const decoder = new TextDecoder()
  let svgEventBuffer = ""
  async function nextEditorExportCommand() {
    while (true) {
      const frame = svgEventBuffer.match(/event: editor-command\ndata: ([^\n]+)\n\n/)
      if (frame) {
        svgEventBuffer = svgEventBuffer.slice(frame.index + frame[0].length)
        return JSON.parse(frame[1])
      }
      const eventChunk = await svgEventsReader.read()
      assert.equal(eventChunk.done, false)
      svgEventBuffer += decoder.decode(eventChunk.value, { stream: true })
    }
  }
  async function submitEditorExport(command, artifact, contentType) {
    const response = await fetch(svgExportUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: command.requestId,
        data: `data:${contentType};base64,${Buffer.from(artifact).toString("base64")}`,
      }),
    })
    assert.equal(response.status, 200)
    return response.json()
  }
  const svgExportCommand = await nextEditorExportCommand()
  assert.equal(svgExportCommand.action, "export")
  assert.equal(svgExportCommand.format, "svg")
  const svgArtifact = '<svg xmlns="http://www.w3.org/2000/svg"><text>Bridge SVG</text></svg>'
  const svgExportUrl = new URL(svgEditorRequired.openUrl)
  svgExportUrl.pathname = "/api/editor-export"
  await submitEditorExport(svgExportCommand, svgArtifact, "image/svg+xml")
  const svgExported = JSON.parse(await svgExportPromise)
  assert.equal(svgExported.success, true)
  assert.equal(svgExported.channel, "editor")
  assert.equal(svgExported.output_path, "exports/multi-page.svg")
  assert.equal(await fs.readFile(path.join(workspace, "exports", "multi-page.svg"), "utf8"), svgArtifact)

  const pageSvgPromise = plugin.tool.drawio_export.execute({
    input_path: "multi-page.drawio",
    output_path: "exports/page-two.svg",
    format: "svg",
    page_id: "p2",
    all_pages: false,
    scale: 1,
    border: 0,
    background: "#ffffff",
    embed_xml: false,
    overwrite: false,
  }, unicodeContext)
  const pageSvgCommand = await nextEditorExportCommand()
  assert.equal(pageSvgCommand.pageId, "p2")
  assert.equal(pageSvgCommand.allPages, false)
  assert.match(pageSvgCommand.xml, /Page-2/)
  const pageSvgArtifact = '<svg xmlns="http://www.w3.org/2000/svg"><text>Page-2</text></svg>'
  await submitEditorExport(pageSvgCommand, pageSvgArtifact, "image/svg+xml")
  const pageSvg = JSON.parse(await pageSvgPromise)
  assert.equal(pageSvg.page_id, "p2")
  assert.equal(pageSvg.page_name, "Page-2")
  assert.equal(await fs.readFile(path.join(workspace, "exports", "page-two.svg"), "utf8"), pageSvgArtifact)

  const allSvgPromise = plugin.tool.drawio_export.execute({
    input_path: "multi-page.drawio",
    output_path: "exports/all-pages.svg",
    format: "svg",
    all_pages: true,
    scale: 1,
    border: 0,
    background: "#ffffff",
    embed_xml: false,
    overwrite: false,
  }, unicodeContext)
  const allSvgCommand1 = await nextEditorExportCommand()
  assert.equal(allSvgCommand1.pageId, "p1")
  await submitEditorExport(
    allSvgCommand1,
    '<svg xmlns="http://www.w3.org/2000/svg"><text>Page-1</text></svg>',
    "image/svg+xml",
  )
  const allSvgCommand2 = await nextEditorExportCommand()
  assert.equal(allSvgCommand2.pageId, "p2")
  await submitEditorExport(
    allSvgCommand2,
    '<svg xmlns="http://www.w3.org/2000/svg"><text>Page-2</text></svg>',
    "image/svg+xml",
  )
  const allSvg = JSON.parse(await allSvgPromise)
  assert.equal(allSvg.all_pages, true)
  assert.equal(allSvg.page_count, 2)
  assert.deepEqual(allSvg.outputs.map((output) => output.page_id), ["p1", "p2"])
  assert.deepEqual(
    allSvg.outputs.map((output) => output.output_path),
    ["exports/all-pages.page-1-page-1.svg", "exports/all-pages.page-2-page-2.svg"],
  )

  const allXmlSvgPromise = plugin.tool.drawio_export.execute({
    input_path: "multi-page.drawio",
    output_path: "exports/all-editable.editable.svg",
    format: "xmlsvg",
    all_pages: true,
    scale: 1,
    border: 0,
    background: "#ffffff",
    embed_xml: false,
    overwrite: false,
  }, unicodeContext)
  const allXmlSvgCommand1 = await nextEditorExportCommand()
  assert.equal(allXmlSvgCommand1.format, "xmlsvg")
  assert.equal(allXmlSvgCommand1.pageId, "p1")
  await submitEditorExport(
    allXmlSvgCommand1,
    '<svg xmlns="http://www.w3.org/2000/svg" content="editable-p1"><text>Page-1</text></svg>',
    "image/svg+xml",
  )
  const allXmlSvgCommand2 = await nextEditorExportCommand()
  assert.equal(allXmlSvgCommand2.format, "xmlsvg")
  assert.equal(allXmlSvgCommand2.pageId, "p2")
  await submitEditorExport(
    allXmlSvgCommand2,
    '<svg xmlns="http://www.w3.org/2000/svg" content="editable-p2"><text>Page-2</text></svg>',
    "image/svg+xml",
  )
  const allXmlSvg = JSON.parse(await allXmlSvgPromise)
  assert.equal(allXmlSvg.page_count, 2)
  assert.deepEqual(
    allXmlSvg.outputs.map((output) => output.output_path),
    [
      "exports/all-editable.page-1-page-1.editable.svg",
      "exports/all-editable.page-2-page-2.editable.svg",
    ],
  )

  const allHtmlPromise = plugin.tool.drawio_export.execute({
    input_path: "multi-page.drawio",
    output_path: "exports/all-pages.html",
    format: "html2",
    all_pages: true,
    scale: 1,
    border: 0,
    background: "#ffffff",
    embed_xml: false,
    overwrite: false,
  }, unicodeContext)
  const allHtmlCommand = await nextEditorExportCommand()
  assert.equal(allHtmlCommand.format, "html2")
  assert.equal(allHtmlCommand.allPages, true)
  assert.match(allHtmlCommand.xml, /Page-1/)
  assert.match(allHtmlCommand.xml, /Page-2/)
  const allHtmlArtifact = '<!doctype html><html><body>Page-1 Page-2</body></html>'
  await submitEditorExport(allHtmlCommand, allHtmlArtifact, "text/html")
  const allHtml = JSON.parse(await allHtmlPromise)
  assert.equal(allHtml.all_pages, true)
  assert.equal(allHtml.page_count, 2)
  assert.equal(allHtml.contains_all_pages, true)
  assert.equal(allHtml.output_path, "exports/all-pages.html")

  const pageHtmlPromise = plugin.tool.drawio_export.execute({
    input_path: "multi-page.drawio",
    output_path: "exports/page-two.html",
    format: "html2",
    page_id: "p2",
    all_pages: false,
    scale: 1,
    border: 0,
    background: "#ffffff",
    embed_xml: false,
    overwrite: false,
  }, unicodeContext)
  const pageHtmlCommand = await nextEditorExportCommand()
  assert.equal(pageHtmlCommand.pageId, "p2")
  assert.match(pageHtmlCommand.xml, /Page-2/)
  assert.doesNotMatch(pageHtmlCommand.xml, /Page-1/)
  const pageHtmlArtifact = '<!doctype html><html><body>Page-2</body></html>'
  await submitEditorExport(pageHtmlCommand, pageHtmlArtifact, "text/html")
  const pageHtml = JSON.parse(await pageHtmlPromise)
  assert.equal(pageHtml.page_id, "p2")
  assert.equal(pageHtml.page_name, "Page-2")
  await svgEventsReader.cancel()

  const automaticContext = {
    ...context,
    sessionID: "automatic-approval-session",
    messageID: "automatic-approval-message",
  }
  await plugin.tool.drawio_create.execute({
    file: "automatic-approval.drawio",
    title: "Automatic approval",
    nodes: [
      { id: "auto-a", label: "A" },
      { id: "auto-b", label: "B" },
    ],
    edges: [{ id: "auto-edge", source: "auto-a", target: "auto-b" }],
    direction: "left-to-right",
    compressed: false,
    overwrite: false,
  }, automaticContext)
  await plugin.tool.drawio_open.execute({ file: "automatic-approval.drawio" }, automaticContext)
  const automaticState = JSON.parse(await plugin.tool.drawio_get_state.execute({}, automaticContext))
  const automaticXml = automaticState.xml.replace('value="A"', 'value="A updated"')
  assert.notEqual(automaticXml, automaticState.xml)
  const automaticUpdateArgs = {
    base_revision: automaticState.revision,
    xml: automaticXml,
    approval_plan: "Rename node A",
  }
  const { first: automaticUpdatePrompt, second: automaticUpdate } = await executeWithApprovalQuestion(
    plugin.tool.drawio_update_state.execute,
    automaticUpdateArgs,
    automaticContext,
  )
  assert.equal(automaticUpdate.revision, automaticState.revision + 1)
  assert.match(automaticUpdatePrompt.question.arguments.questions[0].question, /Rename node A/)

  const automaticPolishArgs = {
    file: "automatic-approval.drawio",
    direction: "left-to-right",
    threshold: 0,
    dry_run: false,
    base_revision: automaticUpdate.revision,
    approval_plan: "Apply automatic layout",
  }
  const { first: automaticPolishPrompt, second: automaticPolish } = await executeWithApprovalQuestion(
    plugin.tool.drawio_polish.execute,
    automaticPolishArgs,
    automaticContext,
  )
  assert.equal(automaticPolish.dryRun, false)
  assert.match(automaticPolishPrompt.question.arguments.questions[0].question, /Apply automatic layout/)

  assert.equal(approvalRequests.length, 0)
  console.log(JSON.stringify({
    ok: true,
    openUrl: true,
    revisionConflict: true,
    manualChanges: true,
    manualChangesRemainEditable: true,
    serializedRevisionWrites: true,
    multiPageRasterExport: true,
    svgEditorBridgeRouting: true,
    editorPageIdExport: true,
    editorMultiPageExport: true,
    editorMultiPageEditableSvgExport: true,
    html2MultiPageExport: true,
    automaticNonOverlappingMerge: true,
    sameCellNonOverlappingFieldMerge: true,
    mixedConflictPreservesNonConflictingChanges: true,
    overlappingConflictRequiresChoice: true,
    connectedEditorIsFileScoped: true,
    staleEditorTokenRejected: true,
    staleEditorTokenCannotResurrect: true,
    autoMergeDoesNotForceReload: true,
    nestedContainerQuality: true,
    genuineIntersectionDetection: true,
    edgeLabelCollisionDetection: true,
    edgeOverlapDetection: true,
    sharedPortCongestionDetection: true,
    distributedFanoutRouting: true,
    finalizeQualityGate: true,
    automaticPng: true,
    browserOpenUrl: true,
    exportOwnedByTypeScript: true,
    annotationLifecycle: true,
    annotationRegionComputation: true,
    annotationPersistence: true,
    annotationDiagramBinding: true,
    annotationStalenessDetection: true,
    annotationFreshAutoClosure: true,
    annotationStaleConfirmationClosure: true,
    annotationInputValidation: true,
    annotationPageBinding: true,
    annotationFinalizationGate: true,
    annotationScopeEnforcement: true,
    annotationDiagramWideScope: true,
    annotationSessionBoundApproval: true,
    annotationDiagramWidePolish: true,
    annotationPreWriteApproval: true,
    patchPreviewCanvas: true,
    patchPreviewArtifactGuard: true,
    patchPreviewExactCandidateApproval: true,
    patchPreviewCancelWithoutWrite: true,
    patchPreviewBrowserActions: true,
    patchPreviewOneClickApply: true,
    questionPatchApproval: true,
    questionXmlApproval: true,
    questionPolishApproval: true,
    permissionAskNotUsedForApproval: true,
    rejectedApprovalDoesNotWrite: true,
    unboundFormalWriteRejected: true,
    unicodePageIdExport: true,
  }, null, 2))
} finally {
  const bridge = globalThis.__drawioIntegratedBridge
  if (bridge?.server) {
    for (const clients of bridge.eventClients.values()) {
      for (const client of clients) client.response.end()
    }
    await new Promise((resolve) => bridge.server.close(resolve))
  }
  await new Promise((resolve) => exportServer.close(resolve))
  await fs.rm(workspace, { recursive: true, force: true })
  for (const name of DRAWIO_ENVIRONMENT_KEYS) {
    if (originalEnvironment[name] === undefined) delete process.env[name]
    else process.env[name] = originalEnvironment[name]
  }
}
