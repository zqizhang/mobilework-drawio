# Draw.io 绘图专家

面向技术架构、业务流程和系统拓扑的 Draw.io 单专家。

## 类型

单专家型（1 位专家 agent）

## 功能

根据需求、文档和代码生成结构清晰、可继续编辑的 Draw.io 架构图、流程图和系统拓扑图，并对现有图表执行结构化检查。

定位摘要：创建、读取和校验可编辑的 Draw.io 技术图表。

标签：drawio、architecture-diagram、visualization

专业定位：系统可视化与技术绘图专家

## 专家能力

| 项目 | 内容 |
|---|---|
| Agent ID | `drawio-expert` |
| 名称 | Draw.io 绘图专家 |
| 专业定位 | 系统可视化与技术绘图专家 |
| 核心职责 | 把用户需求、文档或代码结构转换成明确的节点、连接和页面语义模型。 |
| 触发场景 | 用户要求创建 Draw.io 架构图、流程图、拓扑图或其他技术图表。；用户要求读取、解释或审查已有的 .drawio 或 Draw.io XML 文件。；用户要求检查 Draw.io 文件是否损坏、引用是否完整或结构是否有效。 |

## 工作流程

- 明确图表用途、目标读者、输入材料、图类型和验收标准。
- 创建任务先建立节点与连接的结构化语义模型；读取或校验任务先定位目标文件。
- 创建任务调用 drawio_create，不直接写入原始 mxGraphModel XML。
- 读取任务调用 drawio_inspect，不根据文件名或用户描述猜测图中内容。
- 所有创建结果必须调用 drawio_validate 进行独立校验。
- 核对工具返回的页面数、节点数、连接数、错误和警告。
- 最终报告生成或读取的文件、核心结构、验证状态、限制和剩余风险。

## 内置技能

| 技能 | 用途 |
|---|---|
| `drawio-expert-common` | 通用工作方法、交付格式和质量门控 |
| `drawio-expert-drawio-expert` | `drawio-expert` 的角色工作指引 |

## 使用示例

- 根据当前项目生成一张 Draw.io 系统架构图。
- 读取这张 Draw.io 图并说明其中的节点和连接关系。
- 校验这张 Draw.io 图的 XML、节点引用和几何结构。

## 包结构

- `expert.json`：本包的唯一源文件；修改能力、角色、展示字段或权限时先改这里。
- `AGENTS.md`：由 `expert.json` 生成的包级操作说明。
- `opencode.json`：MobileWork 当前兼容的运行时配置文件，包含 agent、权限、MCP 和运行时扩展配置。
- `avatars/`：包内专家、团长和团员头像资源；本地相对 `avatar_url` 应能解析到这里的真实文件。
- `.opencode/agents/`：MobileWork 运行时读取的专家 / 专家团角色 Markdown 定义。
- `.opencode/skills/`：MobileWork 运行时读取的通用和角色专属 playbook。
- `.opencode/commands/`：可选的自定义命令。
- `.opencode/tools/`：可选的自定义工具定义。
- `.opencode/plugins/`：可选的本地插件；依赖只通过 `.opencode/package.json` 声明，不携带 `node_modules`。
- `references/`：可选的包内引用资料。
- `instructions/`：可选的包内自定义指令文件。

本包保留 MobileWork 项目结构，不包含非运行必需的根级配置或隐藏目录。

## 运行时扩展

| 能力 | 生成位置 / 配置字段 | 状态 |
|---|---|---|
| 自定义命令 | `.opencode/commands/` | 3 个 |
| 自定义工具 | `.opencode/tools/` | 0 个 |
| 插件 | `.opencode/plugins/` / `opencode.json.plugin` | 本地 1 个，npm 0 个 |
| References | `references/` / `opencode.json.references` | 0 个别名 |
| 自定义指令 | `instructions/` / `opencode.json.instructions` | 0 条 |
| LSP | `opencode.json.lsp` | 未配置 |
| MCP | `opencode.json.mcp` | 未配置 |

未在 `expert.json` 中配置 MCP，因此生成的 MobileWork 运行时配置文件不包含 MCP 占位。

### 自定义命令
- `/drawio-create`：根据当前需求创建 Draw.io 图表
- `/drawio-inspect`：读取并解释 Draw.io 图表
- `/drawio-validate`：校验 Draw.io 文件结构

### 插件
- 本地：`.opencode/plugins/drawio-expert.ts`

凭证请使用环境变量或密钥管理器，不要把真实 token、API key 或私有 endpoint 写入包文件。

## 注意事项

- 这是单专家包，不使用 TeamCreate，也不调度 subagent。
- 专家需要直接完成工作流，并在最终输出中说明证据、验证状态和剩余风险。
