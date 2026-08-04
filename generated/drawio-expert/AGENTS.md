# `Draw.io 绘图专家` 的 AGENTS.md 指令

这是由 `mobilework-expert-manager` 生成的MobileWork `expert` 包。

## 源文件与生成边界

- `expert.json` 是本包的源 manifest。
- `AGENTS.md`、`README.md`、MobileWork 运行时配置文件、agent 定义目录和 skill 目录都是可重建产物。
- `avatars/` 存放包内头像；本地相对 `avatar_url` 必须能解析到包内真实文件。
- 如果要改变包行为，先更新 `expert.json`，再用 `create_expert.py` 重新生成。
- 不要向生成包添加非 MobileWork 运行所需的根级配置或隐藏目录。

## 包形态

- 包标识 Slug：`drawio-expert`
- 类型：`expert`
- 语言：`zh`
- 专业定位：`系统可视化与技术绘图专家`
- 分类 ID：`02-Engineering`
- 团长 agent：`drawio-expert`
- 团员 agents：`无`
- 默认提示：`根据我的描述创建Draw.io图，校验、导出预览并修复影响可读性的问题。`

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

## 运行模型

直接使用生成的专家 agent。这个包是单专家形态，由专家 agent 直接执行专家工作流，并在完成前验证自己的输出。

开始工作前，先使用每个 agent 文件中声明的通用和角色专属 skill。保持角色边界清晰，完成前说明验证证据和剩余风险。

## 推荐问法

- 根据我的描述创建Draw.io图，校验、导出预览并修复影响可读性的问题。
- 安全修改这张Draw.io图，保留已有内容并给出稳定ID差异和质量评分。
- 在MobileWork内置浏览器中打开这张Draw.io图，保留我的手动编辑并继续协同修改。

## 验证

- 用 `mobilework-expert-manager` skill 中的 `scripts/validate_expert.py <package-dir>` 校验包结构。
- 确认 `expert.json` 可以被 JSON 解析器解析。
- 确认 MobileWork 运行时配置文件可以被 JSON 解析器解析；当前兼容文件名为 `opencode.json`。
- 确认本地相对 `avatar_url` 都指向包内头像文件，且 agent Markdown frontmatter 与 `expert.json` 一致。
- 确认 `README.md` 是 MobileWork 中文介绍页，且包根目录保持当前运行结构。
