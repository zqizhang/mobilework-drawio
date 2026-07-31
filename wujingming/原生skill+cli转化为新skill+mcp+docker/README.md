# Draw.io Skill MCP 改造版

本项目基于 `Agents365-ai/drawio-skill` 进行改造，将原 Skill 中对宿主机 **Draw.io Desktop CLI** 的依赖，替换为：

- 中文版 Draw.io Skill
- 本地 Draw.io Export MCP Server
- Docker 部署的 Draw.io Export Server

改造后，用户不再需要在 OpenCode 所在电脑上安装 Draw.io Desktop。Agent 可以通过 MCP 对 `.drawio` 文件进行校验，并通过局域网中的 Docker 导出服务生成 PNG、JPEG 和 PDF 文件。

**已经完成常规 PNG、JPEG、PDF 导出流程的 CLI 替代。** SVG、Mermaid 转换、ELK 布局和部分高级脚本目前还没有迁移。

---

## 一、改造背景

原版 `drawio-skill` 通过宿主机上的 Draw.io Desktop CLI 完成图表预览和格式导出，例如：

```bash
drawio --export --format png diagram.drawio
drawio --export --format pdf diagram.drawio
```

这种方式存在以下问题：

- 用户必须安装 Draw.io Desktop；
- Draw.io CLI 的路径因 Windows、Linux、macOS 而异；
- Linux 无桌面环境时配置复杂；
- Skill 需要检查 `drawio`、`draw.io`、`drawio.exe` 等不同命令；
- 难以在 MobileWork、OpenCode 和企业环境中统一部署；
- 部分系统安装 Draw.io Desktop 需要管理员权限。

本项目将文件生成、校验和导出拆分为三个部分：

```text
Draw.io Skill
  负责指导 Agent 生成和修改 Draw.io XML

Draw.io Export MCP
  负责读取本地文件、校验XML、调用远程导出服务并保存结果

Docker Export Server
  负责实际渲染 Draw.io XML，生成PNG、JPEG或PDF
```

---

## 二、当前架构

```text
用户
  ↓
OpenCode Agent
  ↓ 加载
中文 Draw.io Skill
  ↓ 调用
本地 Draw.io Export MCP Server
  ├── drawio_validate
  ├── drawio_export
  └── drawio_health_check
  ↓ HTTP POST，发送 Draw.io XML
Docker Export Server
192.168.1.210:18765
  ↓ 返回二进制结果
本地 MCP Server
  ↓ 保存文件
OpenCode当前工作区
```

其中：

- `.drawio` 原文件保存在 OpenCode 当前工作区；
- MCP Server 运行在 OpenCode 所在电脑；
- Docker Export Server 运行在局域网服务器；
- MCP 读取 `.drawio` 文件内容后，将 XML 通过 HTTP 请求发送给导出服务；
- Docker 容器不需要访问 OpenCode 的本地文件路径；
- 导出结果由 MCP 保存回 OpenCode 工作区。

---

## 三、MCP 工具

### 1. `drawio_validate`

校验本地 `.drawio` 文件，包括：

- 文件是否存在；
- 文件是否可读；
- XML 语法是否合法；
- 是否为可识别的 Draw.io 结构；
- 页面数量；
- 页面 ID 和页面名称；
- 图形、连线及根节点数量；
- 文件是否位于允许的工作区内。

该工具只执行检查，不修改文件，也不进行导出。

### 2. `drawio_export`

统一负责 PNG、JPEG 和 PDF 导出，通过 `format` 参数选择输出格式。

主要参数包括：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input_path` | string | 是 | 本地 .drawio 文件路径 |
| `format` | string | 是 | 输出格式：png、jpeg、pdf |
| `output_path` | string | 否 | 输出路径；未提供时在输入文件旁自动生成 |
| `page_id` | string | 否 | 指定导出的页面 ID |
| `all_pages` | bool | 否 | 导出所有页面（默认 false） |
| `scale` | float | 否 | 缩放比例（默认 1） |
| `border` | int | 否 | 边框宽度像素（默认 0） |
| `background` | string | 否 | 背景色，如 `#ffffff` |
| `embed_xml` | bool | 否 | 嵌入源 XML（仅部分格式支持） |
| `overwrite` | bool | 否 | 允许覆盖已有文件（默认 false） |

标准流程：

```text
读取本地.drawio文件
→ 提取Draw.io XML
→ 调用Docker Export Server
→ 接收PNG、JPEG或PDF二进制内容
→ 保存到本地工作区
→ 返回文件路径、格式和文件大小
```

默认不覆盖已有文件。只有明确设置 `overwrite=true` 时，才允许覆盖。

### 3. `drawio_health_check`

检查整个导出链路是否正常，包括：

- MCP Server 是否正常运行；
- 工作区是否存在并可读写；
- Docker Export Server 是否可以连接；
- 导出接口是否正常响应；
- 当前支持的输出格式；
- 请求超时等基础配置。

支持两种模式：

**普通模式**（`deep=false`）：只检查网络、配置和文件权限，不产生实际导出文件。

**Deep 模式**（`deep=true`）：使用内置的最小 Draw.io XML 实际执行一次 PNG 导出，并检查返回内容是否为有效 PNG。测试完成后删除临时文件。

---

## 四、原 CLI 能力迁移情况

### 已完成迁移

| 原 Draw.io Desktop CLI 能力 | 当前实现方式 | 状态 |
|---------------------------|-------------|------|
| 检查导出环境是否可用 | `drawio_health_check` | 已实现 |
| 生成 PNG 预览图 | `drawio_export(format="png")` | 已实现并测试 |
| 导出 PNG | `drawio_export(format="png")` | 已实现并测试 |
| 导出 JPG/JPEG | `drawio_export(format="jpeg")` | 已实现并测试 |
| 导出普通 PDF | `drawio_export(format="pdf")` | 已实现并测试 |
| 设置输出文件路径 | `output_path` 参数 | 已实现 |
| 控制是否覆盖已有文件 | `overwrite` 参数 | 已实现 |
| 设置导出倍率 | `scale` 参数 | 已实现 |
| 设置边距 | `border` 参数 | 已实现 |
| 设置背景 | `background` 参数 | 已实现 |
| 指定页面 ID | `page_id` 参数 | 已实现接口 |
| 导出全部页面 | `all_pages` 参数 | 已实现接口 |
| 导出前检查 Draw.io XML | `drawio_validate` | 新增能力 |
| 导出失败后的环境诊断 | `drawio_health_check` | 新增能力 |
| 实际渲染链路诊断 | `drawio_health_check(deep=true)` | 新增能力 |

其中，PNG、JPEG 和 PDF 已经完成真实端到端测试。

`page_id` 和 `all_pages` 已经进入 MCP 参数设计，但当前正式验收使用的是单页面示例文件，多页面场景仍建议补充专项测试。

---

## 五、保留但不依赖 CLI 的能力

以下能力原本主要由 Skill、Python 脚本或 Agent 直接操作 XML 完成，本次改造后继续保留，不需要 Draw.io Desktop CLI：

| 能力 | 实现方式 |
|------|---------|
| 生成 `.drawio` 文件 | Agent 生成 Draw.io XML |
| 修改节点文字 | 修改 XML 中的 `mxCell` |
| 修改节点颜色和样式 | 修改 XML 的 `style` 属性 |
| 添加或删除节点 | 修改 XML 结构 |
| 添加或删除连线 | 修改 edge 类型的 `mxCell` |
| 调整节点位置和大小 | 修改 `mxGeometry` |
| 修改页面名称 | 修改 `diagram` 属性 |
| 检查节点重叠和文字截断 | 导出 PNG 预览后进行视觉检查 |
| 迭代优化布局 | 修改 XML 后重新校验和导出 |
| 保留可编辑源文件 | 始终输出 `.drawio` 文件 |

推荐工作流为：

```text
生成或修改.drawio
→ drawio_validate
→ drawio_export 导出 PNG 预览
→ 检查布局
→ 修改 XML
→ 再次校验和预览
→ 导出最终 PNG、JPEG 或 PDF
```

---

## 六、尚未迁移的 CLI 能力

当前 Docker Export Server 和 MCP 尚未覆盖以下 Draw.io Desktop CLI 能力。

| 原 CLI 能力 | 当前状态 | 原因 |
|------------|---------|------|
| SVG 导出 | 未实现 | 当前 Export Server 未提供已验证的 SVG 后端能力 |
| 可编辑 SVG 导出 | 未实现 | 需要在 SVG 中嵌入 Draw.io XML |
| 嵌入 XML 的可编辑 PDF | 未实现 | 当前只完成普通 PDF 导出 |
| Mermaid 转换为原生 `.drawio` | 未实现 | 原功能依赖 Draw.io Desktop CLI 转换能力 |
| ELK 自动布局 | 未实现 | 原功能依赖 CLI 的 `--layout` 能力 |
| Draw.io CLI 版本检测 | 不再需要 | 新架构不安装宿主机 CLI |
| 打开 Draw.io Desktop 进行编辑 | 不支持 | 当前项目只提供文件生成、校验和导出 |
| 依赖 SVG 的动态效果 | 未实现 | 上游 SVG 导出能力尚未迁移 |
| 通过 CLI 直接指定特殊页面范围 | 未完全验证 | MCP 已提供页面参数，但多页面场景尚未专项验收 |
| CLI 特有的全部导出参数 | 未完全覆盖 | 当前只封装实际需要的常用参数 |

当用户请求上述未支持能力时，Skill 不得静默调用宿主机 Draw.io Desktop CLI，也不得声称已经支持。

应明确说明当前限制，并至少保留可编辑的 `.drawio` 源文件。

---

## 七、辅助脚本迁移状态

原仓库中的部分高级脚本可能仍然直接或间接依赖 Draw.io Desktop CLI。

| 功能或脚本 | 依赖能力 | 当前状态 |
|-----------|---------|---------|
| `drawio2pptx.py` | 页面图片导出 | 尚未完成脚本级迁移 |
| `prdiff.py` | 新旧 Draw.io 文件导出 PNG | 尚未完成脚本级迁移 |
| `buildup.py --gif` | 连续导出图片帧 | 尚未完成脚本级迁移 |
| `svgflow.py` | SVG 导出 | 未迁移 |
| `drawiohtml.py` | SVG 或页面资源导出 | 未迁移 |
| Mermaid 转 Draw.io 流程 | Draw.io CLI 转换 | 未迁移 |
| ELK 布局流程 | Draw.io CLI 布局 | 未迁移 |

其中，依赖 PNG、JPEG 或普通 PDF 导出的脚本，后续可以改为直接调用 Export Server 客户端模块。

但普通 Python 脚本不能直接假设自己可以调用 OpenCode 内部的 MCP 工具。可选改造方式包括：

1. 抽取 MCP 项目中的 HTTP 客户端为可复用 Python 模块；
2. 为脚本提供独立的 HTTP 导出客户端；
3. 将高级操作进一步封装为新的 MCP 工具。

依赖 SVG、Mermaid 转换或 ELK 布局的脚本，需要另外开发 CLI Worker 容器、浏览器桥接服务或专用转换工具。

---

## 八、当前支持范围

### 已支持

- Draw.io XML 生成
- Draw.io XML 修改
- Draw.io XML 结构校验
- 页面和元素信息读取
- PNG 预览
- PNG 最终导出
- JPEG 导出
- 普通 PDF 导出
- 导出倍率
- 边距和背景参数
- 文件覆盖控制
- 工作区路径安全检查
- Export Server 健康检查
- Deep 实际导出检查

### 暂不支持

- SVG 导出
- 可编辑 SVG
- 可编辑 PDF
- Mermaid 转原生 `.drawio`
- ELK 自动布局
- Draw.io Desktop 交互编辑
- 依赖 SVG 的动画和 HTML 功能
- 原仓库全部高级脚本的 CLI 迁移

---

## 九、测试结果

当前已经完成以下端到端测试：

| 测试项 | 结果 |
|-------|------|
| MCP Server 启动 | 通过 |
| OpenCode 发现 MCP 工具 | 通过 |
| Export Server TCP 连接 | 通过 |
| 工作区读写检查 | 通过 |
| `drawio_health_check` 普通模式 | 通过 |
| `drawio_health_check` Deep 模式 | 通过 |
| `drawio_validate` | 通过 |
| PNG 导出 | 通过 |
| JPEG 导出 | 通过 |
| PDF 导出 | 通过 |

使用的测试文件：`minimal.drawio`

校验结果：

- 文件大小：1294 bytes
- 页面数量：1
- 页面 ID：page1
- 页面名称：Page-1
- 元素数量：5

导出结果：

- test-preview.png：3999 bytes
- minimal.jpeg：4746 bytes
- minimal.pdf：15294 bytes

Deep 健康检查实际生成并验证了有效 PNG 文件。

测试发布者：**wujingming**

---

## 十、与原版的主要区别

| 项目 | 原版 drawio-skill | 当前改造版 |
|------|------------------|-----------|
| Skill 语言 | 主要为英文 | 中文 |
| 导出执行位置 | OpenCode 宿主机 | 局域网 Docker 服务器 |
| Draw.io Desktop | 必须安装 | 不需要安装 |
| CLI 路径检查 | 需要 | 已删除 |
| PNG 导出 | Desktop CLI | MCP + Export Server |
| JPEG 导出 | Desktop CLI | MCP + Export Server |
| PDF 导出 | Desktop CLI | MCP + Export Server |
| XML 校验 | 主要依赖脚本或导出结果 | 独立 MCP 工具 |
| 健康检查 | CLI 版本和路径检查 | MCP、工作区、网络及真实导出检查 |
| 环境一致性 | 受操作系统影响 | 导出环境由 Docker 统一提供 |
| 文件存储 | 本地 | 仍然保存在 OpenCode 本地工作区 |
| 安全边界 | 可执行本地 CLI | MCP 限制工作区和允许参数 |

---

## 十一、当前结论

本次改造**已经完成常规 PNG、JPEG、PDF 导出流程的 CLI 替代。**

新的中文 Skill 通过 MCP 调用 Docker Export Server，不再要求 OpenCode 所在电脑安装 Draw.io Desktop。

当前尚未覆盖的主要功能为：

- SVG
- 可编辑 SVG/PDF
- Mermaid 转 Draw.io
- ELK 布局
- 依赖 SVG 的高级脚本

这些能力可在后续通过 CLI Worker Docker、网页编辑器桥接或新的 MCP 工具继续补齐。

---

## 目录结构

```
mobilework-drawio/
├── README.md
└── wujingming/
    └── 原生skill+cli转化为新skill+mcp+docker/
        ├── skill/
        │   └── drawio-skill/              # 中文版 Draw.io Skill（改造自 Agents365-ai/drawio-skill v2.1.0）
        │       └── skills/drawio-skill/
        │           ├── SKILL.md           # 核心 Skill（中文，MCP 工作流）
        │           ├── references/        # 参考文档
        │           ├── scripts/           # 辅助脚本
        │           ├── data/              # 形状数据
        │           └── styles/            # 样式预设
        └── mcp/
            └── drawio-export-mcp/         # Draw.io Export MCP Server
                ├── src/drawio_export_mcp/ # 核心代码
                │   ├── server.py          # MCP Server（3个工具）
                │   ├── export_client.py   # HTTP 导出客户端
                │   ├── path_security.py   # 路径安全校验
                │   └── drawio_validation.py # XML 校验
                ├── examples/              # 示例文件
                ├── tests/                 # 测试
                └── pyproject.toml         # 项目配置
```
