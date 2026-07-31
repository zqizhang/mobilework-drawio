# drawio-skill 改造说明

本仓库基于 [Agents365-ai/drawio-skill](https://github.com/Agents365-ai/drawio-skill) v2.1.0 进行改造，版本号升级至 **v3.0.0**。

## 改造目标

将原 Skill 中依赖宿主机 **Draw.io Desktop CLI** 的导出流程，替换为调用 **Draw.io Export MCP Server**，实现无需安装 Draw.io Desktop 即可完成 PNG、JPEG、PDF 导出。

## 修改文件

| 文件 | 变更 | 说明 |
|------|------|------|
| `skills/drawio-skill/SKILL.md` | **重写** | 核心 Skill：中文化 + MCP 工作流 |
| `README.md` | 修改 | 安装说明从 CLI 改为 MCP；新增 Current Limitations |
| `README_CN.md` | 修改 | 简介从 CLI 改为 MCP |
| `skills/drawio-skill/references/troubleshooting.md` | 新增 | MCP 故障处理条目 |

```
 README.md                                         |  55 +-
 README_CN.md                                      |   4 +-
 skills/drawio-skill/SKILL.md                      | 580 +++++-----
 skills/drawio-skill/references/troubleshooting.md |  18 +-
 4 files changed, 381 insertions(+), 276 deletions(-)
```

## 核心变化

### 1. 工作流程重构

| 原流程 (v2.1.0) | 新流程 (v3.0.0) |
|-----------------|-----------------|
| `drawio --version` 检测 CLI | **删除** |
| 手写 XML / 生成器 | 保留 |
| — | **新增** `drawio_validate` 校验 XML |
| `drawio -x -f png ...` CLI 预览 | `drawio_export(format="png")` MCP 预览 |
| 视觉自检 | 保留 |
| 评审循环 → CLI 重导出 | 评审循环 → MCP 重导出 |
| `drawio -x -f png -e -s 2` CLI 终出 | `drawio_export(format="png", scale=2)` MCP 终出 |

### 2. 前置条件变更

| 原要求 | 新要求 |
|--------|--------|
| Draw.io Desktop CLI 在 PATH 上 | **删除** — 不再需要 |
| `brew install --cask drawio` 等 | **删除** |
| xvfb-run（Linux headless） | **删除** |
| — | **新增** Draw.io Export MCP Server 已配置启用 |

### 3. 新增内容

- **MCP 工具参考**：`drawio_export`、`drawio_validate`、`drawio_health_check` 的完整说明
- **当前 MCP 能力边界**：明确列出已支持和尚未支持的功能
- **辅助脚本 CLI 依赖清单**：记录 5 个脚本的 CLI 依赖状态
- **MCP 故障处理**：`troubleshooting.md` 新增 MCP 相关条目

### 4. 删除内容

- Draw.io Desktop 安装说明（macOS/Windows/Linux）
- CLI 二进制名称检测逻辑（`drawio` vs `draw.io` vs `.exe`）
- `-x`、`-f`、`-e`、`-s`、`--width`、`--page-index` 等 CLI 标志文档
- `repair_png.py` 修复截断 IEND 的步骤
- macOS sandbox / Linux headless / WSL2 的 CLI 故障处理

### 5. 中文化

SKILL.md 全文改为中文，包括：

- frontmatter description
- 工作流程（步骤 0-6）
- 图表生成规范
- 视觉检查流程
- 图表类型预设
- 常见错误

保留原文的：Skill name、MCP 工具名称、文件名、XML 标签、参数名、PNG/JPEG/PDF/SVG 等标准术语。

## 当前 MCP 能力边界

| 功能 | 状态 |
|------|------|
| PNG 导出 | ✅ `drawio_export(format="png")` |
| JPEG 导出 | ✅ `drawio_export(format="jpeg")` |
| PDF 导出 | ✅ `drawio_export(format="pdf")` |
| XML 校验 | ✅ `drawio_validate` |
| 健康检查 | ✅ `drawio_health_check` |
| SVG 导出 | ❌ MCP 不支持 |
| Mermaid→draw.io | ❌ 需 Desktop CLI ≥ v30 |
| ELK 布局 | ❌ 需 Desktop CLI ≥ v30 |

## 未修改的文件

以下辅助脚本**保留原样**，因为它们内部直接调用 Draw.io Desktop CLI，且是独立 Python 程序，无法调用 MCP 工具：

| 脚本 | CLI 用途 | 未修改原因 |
|------|---------|-----------|
| `buildup.py` | 逐帧导出 PNG 制 HTML 动画 | 独立脚本，无法调用 MCP |
| `drawio2pptx.py` | 每页导出 PNG 嵌入 PPTX | 独立脚本，无法调用 MCP |
| `prdiff.py` | CI 中渲染 base/head/diff PNG | CI 脚本，无法调用 MCP |
| `svgflow.py` | 导出 SVG 制作流动动画 | **SVG 格式 MCP 不支持** |
| `drawiohtml.py` | 导出 SVG 嵌入 HTML 查看器 | **SVG 格式 MCP 不支持** |

## 部署方式

本仓库**已部署**到以下位置：

| 位置 | 用途 |
|------|------|
| `~\.claude\skills\drawio-skill\` | 全局 Skill 位置 |
| `opencode\.opencode\skills\drawio-skill\` | 项目级 OpenCode 位置 |
| `opencode\.opencode\opencode.jsonc` → `skills.paths` | 显式注册 |

## 依赖的 MCP Server

[drawio-export-mcp](../drawio-export-mcp/) — 提供 `drawio_export`、`drawio_validate`、`drawio_health_check` 三个工具。

## 后续测试

在 OpenCode 中使用以下提示词验证：

```
用 drawio_health_check 检查导出环境，deep=true
用 drawio_validate 校验 drawio-export-mcp/examples/minimal.drawio
用 drawio_export 把 minimal.drawio 导出为 PNG
```
