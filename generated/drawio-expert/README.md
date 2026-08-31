# Draw.io 绘图专家

面向技术架构、业务流程、系统拓扑和复杂关系表达的Draw.io单专家。

## 类型

单专家型（1 位专家 agent）

## 功能

创建、修改和检查Draw.io图表，以稳定ID完成增量编辑与质量验收；通过Docker Export Server导出PNG、JPEG、PDF和可编辑PNG，并在需要时自动打开内置浏览器、通过Bridge导出SVG、可编辑SVG和HTML；用revision协议确保Agent始终基于用户保存的最新版本继续修改。

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
| 触发场景 | 用户要求创建流程图、架构图、ER图、UML、BPMN、SysML、网络拓扑、基础设施图或其他Draw.io图表。；用户要求解释、审查、比较、修复或增量修改现有.drawio文件。；用户要求导出Draw.io为PNG、JPEG、PDF、可编辑PNG、SVG、可编辑SVG或HTML。；用户要求在MobileWork内置浏览器中打开或手动编辑Draw.io文件。 |

## 工作流程

- 根据任务加载drawio-skill；涉及人工画布协同时同时加载drawio-session-editing。
- 每次新的用户轮次只要涉及已绑定图表，即使本轮没有加载Skill，也必须先调用drawio_get_state读取最新revision、XML、updatedBy和updatedAt，再调用drawio_list_annotations(file=当前文件,status="all")检查新增注释以及注释内容、范围、freshness、resolved或ignored状态变化；本轮读取结果是唯一当前状态，禁止沿用上一轮缓存判断图表和注释是否未变。
- 明确受众、图表类型、范围、方向、页面和输出格式；信息充分时直接执行。
- 新建图先建立语义模型，再选择drawio_create、原生XML或Skill数据驱动脚本。
- 修改已绑定的图前立即调用drawio_get_state，把最新XML作为修改基线，并携带准确base_revision提交；人工编辑不是只读内容，当前任务需要时可以调整，但禁止用旧快照或普通write、edit、脚本覆盖整个文件。
- 已绑定图表的普通patch、polish和完整XML修改必须先生成同画布预览，再进入OpenCode question人工审批：授权或正式写入工具第一次返回绑定候选的question参数和reviewId，Agent必须原样调用内置question；Question返回后，重试同一工具并显式传入approval_review_id=reviewId和approval_answer=用户原始答案，只有确认修改才会校验revision与候选哈希并写入。同一preview只允许一个review，重试时plan措辞变化不得再次提问；question_pending时禁止重发question，Agent已有答案时直接显式转交。取消或关闭不写入，自定义文字作为修改反馈并要求重新生成预览。常用字体、颜色和透明度使用style_updates，完整XML用于页面背景或高级样式。
- 处理按图表文件持久化的框选注释时只读取pending任务并跳过resolved和ignored；pending中的fresh任务直接进入计划和审批，stale任务先询问，随后都必须dry-run并公开计划、稳定ID和范围，再把preview_id传给drawio_authorize_annotation_change；该工具第一次只返回question参数和reviewId，Agent原样调用内置question，再把reviewId和Question原始答案作为approval_review_id、approval_answer传入第二次授权调用，只有确认修改才返回一次性token。插件事件桥只作兼容和审计辅助，不是正常授权的前置条件。同一未消费授权重试时必须复用原token，禁止重新提问。用户未看图并批准前不得修改，禁止先改后问。
- 注释修改不得越过用户选择的范围；diagram_wide只覆盖当前图表并使用pageId:cellId；确需越界时先说明原因并通过question人工审批申请更宽范围，未批准则停止。
- 正式写入前再次调用drawio_get_state核对revision；最终交付前再次调用drawio_list_annotations(file=当前文件,status="pending")核对未完成注释。若本轮期间出现新revision或注释变化，立即以最新状态重新规划，旧preview_id、approval_token、稳定ID清单和上一轮结论不得继续使用。
- 本轮全部可执行生成或修改（包括fresh注释）完成后必须统一调用drawio_finalize，自动校验、评分、导出同名PNG并返回openUrl。
- 需要自动优化时先dry-run调用drawio_polish；通过质量门禁后正式写入并保留备份。
- 单独格式导出调用TypeScript工具drawio_export；PNG、JPEG、PDF和可编辑PNG走Docker通道，SVG、可编辑SVG和HTML走内置浏览器Bridge。七种格式都支持page_id；all_pages下PNG、JPEG、可编辑PNG、SVG和可编辑SVG返回逐页outputs，PDF和HTML返回一个多页文件。编辑器未连接时必须自动打开返回的openUrl并重试导出。
- 用户请求SVG或可编辑SVG的all_pages导出时必须直接调用drawio_export并交付outputs；禁止声称运行时不支持、禁止未经工具调用就改成逐个page_id导出。若工具失败，只报告实际返回的错误并按editor_required流程重试。
- 仅当drawio_finalize返回shouldOpenBrowser=true时调用MobileWork工具openwork_browser_open_url，传入url=openUrl、provider="builtin"；已有编辑器连接时不得重复打开或刷新。Agent继续写入前重新读取revision。
- 最终交付实际文件路径、页面和图元统计、评分、差异、备份、导出结果和剩余限制。

## 内置技能

| 技能 | 来源 | 编辑策略 | 分配角色 |
|---|---|---|---|
| `drawio-expert-common` | `managed` | `managed` | `drawio-expert` |
| `drawio-expert-drawio-expert` | `managed` | `managed` | `drawio-expert` |
| `drawio-skill` | `managed` | `managed` | `drawio-expert` |
| `drawio-session-editing` | `managed` | `managed` | `drawio-expert` |

## 使用示例

- 根据我的描述创建Draw.io图，校验、导出预览并修复影响可读性的问题。
- 安全修改这张Draw.io图，保留已有内容并给出稳定ID差异和质量评分。
- 在MobileWork内置浏览器中打开这张Draw.io图，保留我的手动编辑并继续协同修改。

## 包结构

- `expert.json`：本包的结构与资源所有权 manifest；修改能力、角色、展示字段或权限时先改这里。
- `opencode.json`：MobileWork 当前兼容的运行时配置文件，包含 agent、权限、MCP 和运行时扩展配置。
- `.env.example`：仅当 `opencode.json` 引用 `{env:VARIABLE}` 时生成的变量名清单；只含占位值，不会自动加载真实配置。
- `avatars/`：包内专家、团长和团员头像资源；本地相对 `avatar_url` 应能解析到这里的真实文件。
- `.opencode/agents/`：MobileWork 运行时读取的专家 / 专家团角色 Markdown 定义。
- `.opencode/skills/`：按已确认能力生成或导入的业务 Skill；无适合固化的能力时保留为空。
- `.opencode/commands/`：可选的自定义命令。
- `.opencode/tools/`：可选的自定义工具定义。
- `.opencode/plugins/`：可选的本地插件；依赖只通过 `.opencode/package.json` 声明，不携带 `node_modules`。
- `.opencode/references/<slug>/<alias>/`：可选的包内资料目录；Git Reference 只在 `expert.json` 和 `opencode.json` 声明仓库，不生成本地 backing file。
- `.opencode/instructions/<slug>/`：可选的指令文件；workspace 规则由 `opencode.json.instructions` 索引，`roles/` 下的角色规则只写入被分配角色的 Agent Markdown。
- `package_resources[]`：统一声明 skill 子树内包括 `SKILL.md` 在内的全部文件及 SHA-256；实际文件保留在对应 skill 子树。

本包保留 MobileWork 项目结构，不生成根级 `AGENTS.md`，也不包含非运行必需的根级配置或隐藏目录。
角色、职责、流程和质量门不会直接生成资源；普通运行只消费包内资源，不修改 `expert.json`、
Skill、custom tool 或 Plugin。

## 运行时扩展

| 能力 | 生成位置 / 配置字段 | 状态 |
|---|---|---|
| 自定义命令 | `.opencode/commands/` | 6 个 |
| 自定义工具 | `.opencode/tools/` | 19 个 |
| 插件 | `.opencode/plugins/` / `opencode.json.plugin` | 本地 1 个，npm 0 个 |
| References | `.opencode/references/` / `opencode.json.references` | 1 个别名 |
| 自定义指令 | `.opencode/instructions/` / `opencode.json.instructions` | 0 条 |
| 角色规则 | Agent Markdown | 0 条 |
| LSP | `opencode.json.lsp` | 未配置 |
| MCP | `opencode.json.mcp` | 未配置 |

### Agent 运行参数
| Agent | steps | model | variant | hidden | options |
|---|---:|---|---|---|---|
| `drawio-expert` | 80 | 继承 | 继承 | 未声明 | 继承 |

未声明的可选参数继承 OpenCode、模型或 provider 默认值。

### Agent 权限基线
| Agent | 角色自主度 | 内部值 | 来源 | `*` | edit | bash | webfetch | external_directory | doom_loop | 外部 Skill |
|---|---|---|---|---|---|---|---|---|---|---|
| `drawio-expert` | 中 | `bounded` | role-autonomy | ask | allow | ask | ask | ask | ask | deny |

未在 `expert.json` 中配置 MCP，因此生成的 MobileWork 运行时配置文件不包含 MCP 占位。

### 自定义命令
- `/drawio-create`：根据需求创建、校验并预览Draw.io文件。
- `/drawio-inspect`：读取并解释现有Draw.io文件。
- `/drawio-patch`：以稳定ID安全增量修改Draw.io文件。
- `/drawio-polish`：执行自动布局、路由调整和质量门禁。
- `/drawio-export`：通过Docker Export Server或内置浏览器Bridge导出七种格式。
- `/drawio-open`：在MobileWork现有内置浏览器中打开并协同编辑Draw.io。

### 自定义工具
- `.opencode/tools/drawio_validate.js`：校验Draw.io文件结构并返回页面、节点、连线、错误和警告。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_export.js`：通过Docker或浏览器Bridge导出七种目标格式。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_health_check.js`：检查导出服务、浏览器Bridge和运行配置是否可用。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_create.js`：根据结构化节点和连线创建新的Draw.io文件。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_inspect.js`：读取图表页面、图元、稳定ID、几何和结构信息。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_quality.js`：计算节点、连线共线重叠、共享端口拥堵、穿越和标签等质量评分。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_patch.js`：基于稳定ID和revision执行可预览的增量修改。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_polish.js`：对布局、路由和样式执行带质量门禁的自动优化。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_compare.js`：比较两个Draw.io版本并返回稳定ID差异。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_get_state.js`：读取当前绑定文件的最新XML、revision和人工修改状态。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_preview_state.js`：将完整XML候选显示为同画布预览并生成候选哈希。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_update_state.js`：提交经过审批且哈希匹配的完整XML候选。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_open.js`：绑定当前会话、文件和浏览器Bridge。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_finalize.js`：完成校验、评分、PNG导出和浏览器绑定。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_list_annotations.js`：列出图表文件持久化的注释任务。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_get_annotation.js`：读取单条注释、范围、稳定ID和新鲜度。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_authorize_preview.js`：请求普通候选预览审批并提交获批候选。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_authorize_annotation_change.js`：请求注释范围审批并生成一次性写入token。；使用角色 `drawio-expert`
- `.opencode/tools/drawio_resolve_annotation.js`：在写入完成后更新注释终态和结果摘要。；使用角色 `drawio-expert`

### 插件
Plugin 是 package-wide 运行行为，供满足 capability contract 的目标 Runtime 发现并加载；它不属于任何单一角色，也不得写成角色私有能力。
本包的生成与静态校验不证明 Plugin 已被真实 Runtime 加载；没有实际加载证据时，Runtime 状态保持 `not-tested`。
- 本地：`.opencode/plugins/drawio-hooks.js`

### References
- `drawio-intranet`：使用角色 `drawio-expert`

凭证请使用环境变量或密钥管理器，不要把真实 token、API key 或私有 endpoint 写入包文件。

本地 Plugin 是整个专家包的运行行为，不是任何角色的私有能力；外部系统访问由 MCP 承担。

## 配置与环境变量

当前生成配置不引用环境变量，因此包根目录不生成 `.env.example`。如后续增加凭证或可配置值，请在 `expert.json` 的现有 OpenCode 配置字段中使用 `{env:VARIABLE}`。

## 注意事项

- 这是单专家包，不调用 `task` 调度 subagent。
- 专家需要直接完成工作流，并在最终输出中说明证据、验证状态和剩余风险。
