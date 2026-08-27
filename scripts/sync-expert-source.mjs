import { createHash } from "node:crypto"
import { promises as fs } from "node:fs"
import path from "node:path"

const SKILLS = ["drawio-skill", "drawio-session-editing"]

function normalizeBrowserContract(value) {
  if (typeof value === "string") {
    return value
      .replaceAll(
        "MobileWork现有browser.open_url",
        "MobileWork工具openwork_browser_open_url，并传入url=openUrl、provider=\"builtin\"",
      )
      .replaceAll(
        "MobileWork已有的browser.open_url",
        "MobileWork工具openwork_browser_open_url，并传入url=openUrl、provider=\"builtin\"",
      )
      .replaceAll(
        "MobileWork已有browser.open_url",
        "MobileWork工具openwork_browser_open_url，并传入url=openUrl、provider=\"builtin\"",
      )
      .replaceAll(
        "MobileWork内置浏览器browser.open_url",
        "MobileWork工具openwork_browser_open_url（url=openUrl、provider=\"builtin\"）",
      )
      .replaceAll("browser.open_url", "openwork_browser_open_url")
  }
  if (Array.isArray(value)) return value.map(normalizeBrowserContract)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeBrowserContract(entry)]),
    )
  }
  return value
}

function renderToolAdapter(name) {
  return `import { tool } from "@opencode-ai/plugin"\n\nconst coreUrl = new URL(import.meta.url)\ncoreUrl.pathname = coreUrl.pathname.replace(\n  /\\/tools\\/[^/]+$/,\n  "/skills/drawio-session-editing/scripts/drawio-runtime-core.mjs",\n)\nconst { createDrawioTool } = await import(coreUrl.href)\n\nexport default createDrawioTool(${JSON.stringify(name)}, tool)\n`
}

function normalizeCommandTemplate(template) {
  const normalized = normalizeBrowserContract(template).trim()
  const argumentsLine = normalized.includes("$ARGUMENTS")
    ? ""
    : "\n\n用户要求：$ARGUMENTS"
  const attachmentLine = normalized.includes("本次调用中可访问")
    ? ""
    : "\n结合本次调用中可访问的图片、Draw.io 文件或其他附件；附件不可访问时明确要求用户重新附加。"
  return `${normalized}${argumentsLine}${attachmentLine}`
}

async function walkFiles(root) {
  const files = []
  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile()) files.push(full)
    }
  }
  await walk(root)
  return files.sort((left, right) => left.localeCompare(right, "en"))
}

function resourceKind(content) {
  if (content.includes(0)) return "binary"
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(content)
    return "text"
  } catch {
    return "binary"
  }
}

async function collectPackageResources(manifestDirectory) {
  const root = path.join(manifestDirectory, ".opencode", "skills")
  const resources = []
  for (const skill of SKILLS) {
    for (const file of await walkFiles(path.join(root, skill))) {
      const content = await fs.readFile(file)
      resources.push({
        path: path.relative(manifestDirectory, file).replaceAll(path.sep, "/"),
        kind: resourceKind(content),
        sha256: createHash("sha256").update(content).digest("hex"),
      })
    }
  }
  return resources.sort((left, right) => left.path.localeCompare(right.path, "en"))
}

export async function synchronizeExpertSource({ projectDirectory, manifestDirectory }) {
  const sourceManifestPath = path.join(projectDirectory, "expert.json")
  const source = normalizeBrowserContract(
    JSON.parse(await fs.readFile(sourceManifestPath, "utf8")),
  )
  const toolsDescriptor = JSON.parse(
    await fs.readFile(path.join(projectDirectory, "runtime", "drawio-tools.json"), "utf8"),
  )
  const hooksContent = await fs.readFile(
    path.join(projectDirectory, "runtime", "drawio-runtime-hooks.js"),
    "utf8",
  )
  const projectPackage = JSON.parse(
    await fs.readFile(path.join(projectDirectory, "package.json"), "utf8"),
  )

  const customTools = toolsDescriptor.tools.map(({ name, purpose }) => ({
    path: `${name}.js`,
    purpose,
    content: renderToolAdapter(name),
  }))

  const manifest = {
    ...source,
    skills: SKILLS.map((name) => ({
      name,
      origin: "legacy-migrated",
      edit_policy: "managed",
    })),
    package_resources: await collectPackageResources(manifestDirectory),
    runtime_extensions: {
      commands: (source.runtime_extensions?.commands ?? []).map((command) => ({
        name: command.name,
        description: command.description,
        template: normalizeCommandTemplate(command.template),
        agent: "drawio-expert",
        subtask: true,
      })),
      custom_tools: customTools,
      plugins: {
        local: [{
          path: "drawio-runtime-hooks.js",
          content: hooksContent,
        }],
        package_json: {
          dependencies: {
            "@opencode-ai/plugin": projectPackage.dependencies["@opencode-ai/plugin"],
          },
        },
      },
    },
    agent: {
      ...source.agent,
      mode: "all",
      autonomy: "guided",
      steps: 80,
      skills: [...SKILLS],
      custom_tools: customTools.map(({ path: toolPath }) => toolPath),
      permission: {
        drawio_authorize_preview: "ask",
        drawio_authorize_annotation_change: "ask",
      },
      permission_reason: "预览提交和批注范围写入必须保留人工审批；其余权限按 guided 自主度派生。",
    },
  }
  delete manifest.common_skills
  delete manifest.agent.max_turns
  delete manifest.agent.maxTurns
  delete manifest.agent.instructions
  delete manifest.agent.mcp
  delete manifest.agent.references

  const serialized = `${JSON.stringify(manifest, null, 2)}\n`
  await fs.writeFile(sourceManifestPath, serialized, "utf8")
  await fs.writeFile(path.join(manifestDirectory, "expert.json"), serialized, "utf8")
  return manifest
}
