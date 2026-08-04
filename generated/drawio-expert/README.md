# Draw.io 绘图专家

面向技术架构、业务流程、系统拓扑和复杂关系表达的Draw.io单专家。

## 类型

单专家型（1 位专家 agent）

## 功能

创建、修改和检查Draw.io图表，以稳定ID完成增量编辑与质量验收，通过HTTP Export Server导出PNG、JPEG或PDF，并用revision协议确保Agent始终基于内置浏览器保存的最新版本继续修改。

定位摘要：创建、修改、审查并在MobileWork内置浏览器中协同编辑Draw.io图表。

标签：drawio、architecture-diagram、visualization

专业定位：系统可视化与技术绘图专家

## 专家能力

| 项目 | 内容 |
|---|---|
| Agent ID | `drawio-expert` |
| 名称 | Draw.io 绘图专家 |
| 专业定位 | 系统可视化与技术绘图专家 |
| 核心职责 | 把自然语言需求转换为节点、连线、分组、页面和视觉层级。 |
| 触发场景 | 用户要求创建流程图、架构图、ER图、UML、BPMN、SysML、网络拓扑、基础设施图或其他Draw.io图表。；用户要求解释、审查、比较、修复或增量修改现有.drawio文件。；用户要求导出Draw.io为PNG、JPEG或PDF。；用户要求在MobileWork内置浏览器中打开或手动编辑Draw.io文件。 |

## 工作流程

- 根据任务加载drawio-skill；涉及人工画布协同时同时加载drawio-session-editing。
- 明确受众、图表类型、范围、方向、页面和输出格式；信息充分时直接执行。
- 新建图先建立语义模型，再选择drawio_create、原生XML或Skill数据驱动脚本。
- 修改已绑定的图前立即调用drawio_get_state，把最新XML作为修改基线，并携带准确base_revision提交；人工编辑不是只读内容，当前任务需要时可以调整，但禁止用旧快照或普通write、edit、脚本覆盖整个文件。
- 每次生成或修改成功后必须调用drawio_finalize，自动校验、评分、导出同名PNG并返回openUrl。
- 需要自动优化时先dry-run调用drawio_polish；通过质量门禁后正式写入并保留备份。
- 单独格式导出调用TypeScript工具drawio_export；只承诺PNG、JPEG、PDF。
- drawio_finalize后必须立即用browser.open_url打开内置浏览器；Agent继续写入前重新读取revision。
- 最终交付实际文件路径、页面和图元统计、评分、差异、备份、导出结果和剩余限制。

## 内置技能

| 技能 | 用途 |
|---|---|
| `drawio-expert-common` | 通用工作方法、交付格式和质量门控 |
| `drawio-expert-drawio-expert` | `drawio-expert` 的角色工作指引 |
| `drawio-skill` | `drawio-expert` 的补充专业技能 |
| `drawio-session-editing` | `drawio-expert` 的补充专业技能 |

## 使用示例

- 根据我的描述创建Draw.io图，校验、导出预览并修复影响可读性的问题。
- 安全修改这张Draw.io图，保留已有内容并给出稳定ID差异和质量评分。
- 在MobileWork内置浏览器中打开这张Draw.io图，保留我的手动编辑并继续协同修改。

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
| 自定义命令 | `.opencode/commands/` | 6 个 |
| 自定义工具 | `.opencode/tools/` | 0 个 |
| 插件 | `.opencode/plugins/` / `opencode.json.plugin` | 本地 1 个，npm 0 个 |
| References | `references/` / `opencode.json.references` | 1 个别名 |
| 自定义指令 | `instructions/` / `opencode.json.instructions` | 0 条 |
| LSP | `opencode.json.lsp` | 未配置 |
| MCP | `opencode.json.mcp` | 未配置 |

未在 `expert.json` 中配置 MCP，因此生成的 MobileWork 运行时配置文件不包含 MCP 占位。

### 自定义命令
- `/drawio-create`：根据需求创建、校验并预览Draw.io文件。
- `/drawio-inspect`：读取并解释现有Draw.io文件。
- `/drawio-patch`：以稳定ID安全增量修改Draw.io文件。
- `/drawio-polish`：执行自动布局、路由调整和质量门禁。
- `/drawio-export`：通过Docker HTTP Export Server导出PNG、JPEG或PDF。
- `/drawio-open`：在MobileWork现有内置浏览器中打开并协同编辑Draw.io。

### 插件
- 本地：`.opencode/plugins/drawio-runtime.js`

### References
- `drawio-intranet`

凭证请使用环境变量或密钥管理器，不要把真实 token、API key 或私有 endpoint 写入包文件。

## 注意事项

- 这是单专家包，不使用 TeamCreate，也不调度 subagent。
- 专家需要直接完成工作流，并在最终输出中说明证据、验证状态和剩余风险。
