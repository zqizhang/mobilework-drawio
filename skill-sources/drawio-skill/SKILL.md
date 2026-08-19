---
name: drawio-skill
version: 3.0.0
description: 当用户需要生成图表、流程图、架构图、ER图、UML/序列/类图、SysML/MBSE图（块定义、内部块、需求、参数）、BPMN业务流程图、泳道/跨职能流程图、网络拓扑、Terraform或Kubernetes基础设施图、ML/DL模型图（Transformer/CNN/LSTM）、思维导图等可视化内容时使用。也应在解释含有3个以上组件、复杂数据流或适合可视化的系统关系时主动使用。适用于需要自定义样式、丰富形状词汇、泳道或导出PNG/JPEG/PDF/xmlpng/SVG/xmlsvg/html2的场景。生成.drawio XML；位图和PDF通过Docker Export Server导出，SVG、可编辑SVG和HTML通过自动打开的内置浏览器与Bridge导出。
license: MIT
homepage: https://github.com/Agents365-ai/drawio-skill
compatibility: 核心创建、校验、质量检查、Docker HTTP导出和内置浏览器协同由专家包内OpenCode TypeScript插件提供，用户无需安装Python、uv、npm或Draw.io Desktop。可选高级脚本需要Python，autolayout.py还需要Graphviz（dot）；缺少时不得作为默认主流程。
platforms: [macos, linux, windows]
metadata: {"openclaw":{"emoji":"📐","os":["darwin","linux","win32"]},"hermes":{"tags":["drawio","diagram","flowchart","architecture","visualization","uml"],"category":"design","related_skills":["mermaid","excalidraw","plantuml"]},"author":"Agents365-ai (MCP adaptation by wujingming)","version":"3.0.0"}
---

# Draw.io 图表生成与导出

## 概述

通过编写`.drawio` XML生成专业图表，并调用专家包内**TypeScript运行时工具**导出PNG、JPEG、PDF、可编辑PNG、SVG、可编辑SVG或HTML。

**支持格式：** PNG、JPEG、PDF、xmlpng、SVG、xmlsvg、html2 —— 全部通过运行时工具`drawio_export`完成。

> **注意：** PNG、JPEG、PDF和xmlpng通过TypeScript插件调用Docker HTTP Export Server；SVG、xmlsvg和html2由内置浏览器中的Draw.io编辑器渲染并通过Bridge写回工作区。编辑器未连接时，Agent必须自动打开工具返回的`openUrl`并重试。整个流程不依赖Python MCP、npm命令或宿主机Draw.io Desktop。

## 适用与不适用场景

**使用本Skill：** 需要精美、精确的图表（架构、网络、严格UML、ERD），需要不透明填充、10,000+官方/品牌形状、泳道或自定义几何图形，或需要导出上述七种格式。

**不使用本Skill，改用其他方案：**

- 手绘/白板风格 → **excalidraw** 或 **tldraw**
- 以文本为主、适合git版本控制的图表 → **mermaid**（通用）或 **plantuml**（UML专用）
- 自由画布草图/手绘笔触 → **tldraw**

## 前置条件

### 必需

- 已加载专家包内`drawio-runtime`插件，提供`drawio_export`、`drawio_validate`、`drawio_health_check`和`drawio_finalize`。
- `DRAWIO_EXPORT_URL`指向可访问的Docker Draw.io HTTP Export Server。

### 可选

- **Graphviz** (`dot`) —— `scripts/autolayout.py`自动布局脚本需要。安装：macOS `brew install graphviz`，Linux `apt install graphviz`。
- **视觉模型** —— 自检步骤（查看导出PNG）需要支持图像输入的模型。不可用时自动跳过。

### 不再需要

- ~~宿主机安装 Draw.io Desktop~~
- ~~Python、uv和独立Draw.io Export MCP进程~~
- ~~用户手动执行npm install或npx~~
- ~~`drawio`/`draw.io` 命令行工具~~
- ~~`--export`、`-x`、`-f` 等CLI标志~~
- ~~xvfb-run、Xvfb等Linux headless依赖~~

## 工作流程

开始前，评估用户需求是否明确。如关键信息缺失，问1-3个聚焦的问题：

- **图表类型** —— 哪种预设？（ERD、UML、序列、架构、ML/DL、流程图、SysML、BPMN、网络、泳道、或通用）
- **输出格式** —— PNG（默认）、JPEG还是PDF？
- **输出位置** —— 默认为用户工作目录；尊重用户指定的路径。
- **范围/粒度** —— 多少组件？有特定技术栈或标签吗？

如果需求已明确或明显简单（如"画一个X的流程图"），跳过询问。

### 步骤0 —— 确定活动样式预设

检查是否有用户定义的样式预设适用于本次生成。

- 扫描用户消息中明确命名样式预设的短语："用我的`<名称>`样式"、"以`<名称>`风格"。单独的`用<名称>`不算——"用redis画图"只是指定组件。
- 如果匹配到 → 活动预设 = `<名称>`。
- 否则检查当前工作区`.drawio/styles/`中是否有`"default": true`的文件。如有 → 活动预设 = 该文件。
- 否则 → 无活动预设；使用内置颜色/形状/连线约定。

从当前工作区`.drawio/styles/<名称>.json`加载预设JSON，回退到`<本skill目录>/styles/built-in/<名称>.json`。预设不存在则告知用户并停止，不得静默回退。

加载成功时首行回复：*"使用预设\`<名称>\`（置信度：<级别>）。"* 详见`references/style-presets.md`→"应用预设"。

### 步骤1 —— 生成或修改.drawio文件

如果目标文件已经通过`drawio_open`绑定，必须先立即调用`drawio_get_state`，把返回的最新XML作为修改基线。人工编辑不是只读内容，可按当前任务要求继续调整；正式写入必须携带该次读取返回的准确`base_revision`，不得使用普通`write`、`edit`或脚本直接覆盖。收到`revision_conflict`后重新读取，在新XML上重新执行当前任务所需变更并重试，禁止重发旧XML。

根据需求选择生成方式：

**(a) `drawio_create`** —— 优先用于标准节点、单向连线和自动分层布局。双向关系可用两条反向边近似，简单图例可用普通节点表示。

**(b) 原生XML** —— 当任务依赖`drawio_create`尚未提供的嵌套parent、泳道、双端箭头、成组图例或精确样式/几何字段时使用。只说明具体缺失字段。**先读`references/xml-authoring.md`**。当前专家不执行Mermaid到`.drawio`的自动转换。

**(c) 可选数据驱动生成器** —— 仅在环境已经具备Python及相应依赖时用于以下场景，不是核心流程前置条件。**布局密集型图表（>~15节点）不要手写坐标**——可用JSON描述图结构并运行`python3 <本skill目录>/scripts/autolayout.py graph.json -o <名称>.drawio`通过Graphviz计算节点位置和正交连线路由；环境不具备时改用`drawio_create`或原生XML工具。

- **Python/JS-TS/Go/Rust项目结构可视化**：对应import脚本（`pyimports.py`、`jsimports.py`、`goimports.py`、`rustimports.py`）提取导入图（传`--group`按子包分组）。
- **Python类层次**：`pyclasses.py`提取类+继承关系。
- **Terraform/Kubernetes/docker-compose**：`tfimports.py`、`k8simports.py`、`composeimports.py`提取资源/服务引用图（自动解析官方云图标）。
- **实时基础设施**：`terraform show -json | tfstate.py`或`docker inspect | dockerimports.py`绘制实际运行状态。
- **SQL DDL→ER图**：`sqlerd.py`解析`CREATE TABLE`生成表节点+鱼尾纹FK连线。
- **OpenAPI/Swagger→API图**：`openapiimports.py`按HTTP方法着色操作+组件schema。
- **CI流水线**：`ciimports.py`提取jobs、`needs:`边、触发器和阶段容器。
- **序列图**：跳过autolayout——`seqlayout.py seq.json -o <名称>.drawio`确定性计算生命线/激活条/箭头几何。
- **C4模型**：`c4.py c4.json -o <名称>.drawio`生成多页Context→Container→Component集合（含钻取链接）。
- **热度图**：`heatmap.py <名称>.drawio -m metrics.csv`按成本/延迟/流量/错误率着色。
- **边缘端口分散**：`edgeports.py <名称>.drawio`自动分散堆叠连线到形状周边。

生成`.drawio`后必须调用TypeScript工具`drawio_validate`；如果环境已经具备Python，可额外运行`scripts/validate.py`做辅助检查，但不得把它作为交付前置条件。

### 步骤2 —— 调用drawio_validate校验XML

生成或大幅修改`.drawio`文件后，**必须调用TypeScript运行时工具**`drawio_validate`检查XML结构和页面信息：

```
drawio_validate(input_path="<文件路径>")
```

该工具检查：
- 文件是否有效XML
- 根结构是否为可识别的Draw.io文档（`<mxfile>`）
- 统计diagram页面数量和元素数量

**校验失败时：** 根据返回的`error_code`和`message`修复XML，然后重新校验。不得在校验失败时继续导出。

### 步骤3 —— 调用drawio_export导出PNG预览

校验通过后，调用`drawio_export`导出预览PNG：

```
drawio_export(
  input_path="<文件路径>",
  format="png",
  output_path="<工作区>/preview/<名称>.png",  # 或临时目录
  overwrite=true,
  scale=1
)
```

**预览设置建议：**
- `format` 为 `png`
- `output_path` 输出到当前工作区的`preview`或临时目录
- `overwrite` 为 `true`（预览可覆盖）
- `scale` 为 `1`（预览不需要高分辨率）

### 步骤4 —— 视觉自检

用模型的视觉能力检查导出的PNG，在展示用户前发现并自动修复问题。

| 检查项 | 观察内容 | 自动修复 |
|--------|----------|----------|
| 节点重叠 | 两个以上形状叠在一起 | 将形状分开≥200px |
| 文字截断 | 标签在形状边界被裁切 | 增大形状宽/高以适应标签 |
| 连线缺失 | 箭头未连接到形状 | 检查`source`/`target`与已有cell的id匹配 |
| 画布外形状 | 形状位于负坐标或远离主体 | 移到主体附近的正常坐标 |
| 连线穿越节点 | 连线穿过不相关的形状 | 添加waypoints（`<Array as="points">`）绕行或增大间距 |
| 连线堆叠 | 多条连线重叠在同一路径 | 分散出入口到形状周边不同位置 |
| 连线标签重叠 | 标签文字与其他元素重叠 | 使用白色标签背景+偏移`x`/`y`微调位置 |

- 最多**2轮自检**——2轮后仍有问题则展示用户。
- 每轮修复后重新`drawio_validate`→`drawio_export`预览。

### 步骤5 —— 评审循环

展示导出图片，收集用户反馈。

**定向编辑规则 —— 对每种反馈做最小XML修改：**

| 用户请求 | XML编辑操作 |
|----------|------------|
| 修改X的颜色 | 找到匹配X的`mxCell`，更新`style`中的`fillColor`/`strokeColor` |
| 新增节点 | 追加新`mxCell`顶点，分配下一可用`id`，放在相关节点附近 |
| 删除节点 | 删除该`mxCell`顶点及所有引用它的连线 |
| 移动形状X | 更新匹配`mxCell`中`mxGeometry`的`x`/`y` |
| 调整大小 | 更新匹配`mxCell`中`mxGeometry`的`width`/`height` |
| A到B加箭头 | 追加新`mxCell`连线，`source`/`target`匹配A和B的id |
| 修改标签文字 | 更新匹配`mxCell`的`value`属性 |
| 改变布局方向 | **完全重新生成** —— 用新方向重建XML |

**规则：**
- 单元素修改：就地编辑XML——保留之前迭代的布局调整
- 布局级修改（如LR↔TB互换、"重来"）：完全重新生成XML
- 每次迭代覆盖同一预览PNG（`overwrite=true`）
- 每轮修改后重新`drawio_validate`→`drawio_export`预览
- 循环直到用户说通过/完成/LGTM
- **安全阀：** 最多5轮；每轮任务结束仍必须调用`drawio_finalize`。仅当返回`shouldOpenBrowser=true`时用MobileWork现有`browser.open_url`打开；已有编辑器连接时保持原页面，让用户继续微调。之后必须按revision重新读取与合并。

### 步骤6 —— 自动收尾、PNG导出和内置浏览器

每次创建或修改成功后必须调用：

```
drawio_finalize(file="<工作区相对路径>/<名称>.drawio")
```

该工具会读取最新revision、校验、评分、覆盖更新同名PNG并返回`openUrl`与`shouldOpenBrowser`。仅当`shouldOpenBrowser=true`时调用MobileWork现有`browser.open_url`；若`editorConnected=true`，不得重新打开或刷新现有编辑器。Agent更新只提示新revision并保留用户当前画布，用户保存时再进行三方合并或冲突处理。

用户另外指定JPEG、PDF、输出目录或高分辨率PNG时，再补充调用`drawio_export`：

用户批准后，根据需求导出最终格式：

```
# PNG最终版
drawio_export(
  input_path="<文件路径>",
  format="png",
  output_path="<输出路径>/<名称>.png",
  overwrite=false,   # 默认不覆盖
  scale=2            # 最终版用高分辨率
)

# JPEG
drawio_export(
  input_path="<文件路径>",
  format="jpeg",
  output_path="<输出路径>/<名称>.jpeg",
  overwrite=false
)

# PDF
drawio_export(
  input_path="<文件路径>",
  format="pdf",
  output_path="<输出路径>/<名称>.pdf",
  overwrite=false
)
```

- 如用户未指定格式，`drawio_finalize`默认导出同名PNG。
- 报告`.drawio`源文件和导出图像的文件路径。
- 仅当`drawio_finalize`返回`shouldOpenBrowser=true`时使用MobileWork已有的`browser.open_url`打开地址；已有编辑器连接时禁止重复打开。

## TypeScript运行时工具参考

### drawio_export

统一导出工具。`png`、`jpeg`、`pdf`、`xmlpng`（可编辑PNG，嵌入源XML）走 Docker Export Server；`svg`、`xmlsvg`（可编辑SVG）、`html2`（HTML）由内置浏览器中的 Draw.io 编辑器页面渲染，需该页面处于打开状态。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input_path` | string | 是 | 本地.drawio文件路径 |
| `format` | string | 是 | 输出格式：`png`、`jpeg`、`pdf`、`xmlpng`、`svg`、`xmlsvg`、`html2` |
| `output_path` | string | 否 | 输出路径；未提供时在输入文件旁自动生成（xmlpng默认`.editable.png`，xmlsvg默认`.editable.svg`） |
| `page_id` | string | 否 | 指定导出的稳定页面ID；所有格式均支持，不能与`all_pages`同时使用 |
| `all_pages` | bool | 否 | 导出所有页面（默认false）：PNG/JPEG/xmlpng/SVG/xmlsvg逐页生成独立文件并返回`outputs[]`；PDF和html2各生成一个包含全部页面的文件 |
| `scale` | float | 否 | 缩放比例（默认1） |
| `border` | int | 否 | 边框宽度像素（默认0） |
| `background` | string | 否 | 背景色，默认白色`#ffffff`；需要其他背景时可显式覆盖 |
| `embed_xml` | bool | 否 | 嵌入源XML（仅部分格式支持，默认false；xmlpng始终嵌入） |
| `overwrite` | bool | 否 | 允许覆盖已有文件（默认false） |

**预览建议：** `format="png"`，输出到`preview/`或临时目录，`overwrite=true`。
**最终文件建议：** `overwrite=false`（默认），未经用户允许不得覆盖已有文件。

**SVG/HTML导出流程（编辑器通道）：** 若编辑器页面未打开，工具返回`status="editor_required"`及`openUrl`。Agent必须立即用MobileWork内置浏览器`browser.open_url`自动打开`openUrl`，等待编辑器连接后以相同参数重试`drawio_export`，由Bridge接收编辑器产物并写入工作区；不得把`editor_required`解释为格式不支持，也不应让用户手工执行菜单导出。指定`page_id`时，Bridge使用隐藏的导出专用编辑器加载冻结XML，不切换用户可见页面；`all_pages=true`时SVG/xmlsvg返回逐页文件，html2返回一个多页HTML文件。

**禁止错误降级：** 用户请求SVG或xmlsvg的`all_pages=true`时，必须直接调用`drawio_export`并使用返回的`outputs[]`；不得声称运行时不支持，也不得在未调用工具时改成逐个`page_id`导出。只有工具真实返回错误时才能报告失败，`editor_required`应按上述自动打开与重试流程处理。

### drawio_validate

校验`.drawio`文件的结构和页面信息。不执行导出，不修改文件。

**调用时机：**
- 新生成`.drawio`文件后
- 大幅修改图表后
- 怀疑XML结构或页面信息异常时
- 导出服务返回图表解析错误时

### drawio_health_check

检查TypeScript运行时和Docker Export Server的健康状态。

**调用时机：**
- Export Server不可达
- 导出请求超时
- 返回文件类型异常
- 连续导出失败
- 用户要求检查Draw.io导出环境

先执行普通健康检查（`deep=false`）。只有普通检查无法定位问题时，再使用deep模式（`deep=true`），该模式会实际导出一个临时PNG并验证结果。

## 编写.drawio XML

**手写XML前必须读`references/xml-authoring.md`**——文件骨架、形状/连线形式、容器、连接点分布、色板、间距规则。使用数据驱动生成器时跳过。

两条通用规则：
- 永远不要重用id `0`和`1`（保留根cell）
- 每条连线`mxCell`需要`<mxGeometry relative="1" as="geometry" />`子元素——自闭合连线cell不会渲染

## 图表类型预设

当用户指定图表类型时，读`references/diagram-types.md`获取匹配预设（形状、连线、布局方向）。按用户措辞选择：

| 用户说法 | `references/diagram-types.md`中的章节 |
|----------|--------------------------------------|
| "ER图"、"数据模型" | ERD |
| "UML类图"、"类图" | UML Class |
| "序列图"、"交互图"、"生命线" | Sequence |
| "架构"、"系统图"、"服务图" | Architecture |
| "神经网络"、"模型架构"、"ML图" | ML / Deep Learning Model |
| "流程图"、"决策树"、"流程" | Flowchart |
| "C4"、"系统上下文图"、"容器图"、"组件图" | C4 Model |
| "SysML"、"MBSE"、"块定义图"、"内部块图"、"需求图"、"参数图" | SysML |
| "BPMN"、"业务流程"、"泳池和泳道" | BPMN |
| "网络拓扑"、"网络图"、"子网"、"防火墙图" | Network Topology |
| "泳道图"、"跨职能流程图"、"谁做什么"、"交接图" | Cross-Functional Flowchart |

图表类型预设设置**结构**样式关键词。如果用户样式预设也处于活动状态，保留结构关键词并在其上叠加颜色/字体/连线——详见`references/style-presets.md`→"与图表类型预设的交互"。

## 样式预设

**样式预设**是一个命名JSON文件，捕获用户的视觉偏好（色板、形状、字体、连线）。活动时完全替换内置颜色/形状约定。

**预设名称查找顺序：**
1. `<工作区>/.drawio/styles/<名称>.json` —— 用户预设
2. `<本skill目录>/styles/built-in/<名称>.json` —— 内置预设（`default`、`corporate`、`handdrawn`、`colorblind-safe`、`dark`）

名称查找前统一转为小写。

## 辅助脚本

本Skill捆绑了大量Python脚本用于数据导入、自动布局、格式转换等。脚本列表及用途详见`references/toolbox.md`。

PNG导出统一调用专家提供的`drawio_export`或`drawio_finalize`工具，不通过Python脚本，也不调用Draw.io Desktop。`svgflow.py`只处理已经存在的SVG，不负责从`.drawio`转换。

## 故障处理

### 导出失败

1. 调用`drawio_health_check`（`deep=false`）检查Export Server连通性。
2. 如服务器不可达，告知用户并检查网络连接。
3. 如deep模式也无法定位问题，提供`.drawio`源文件给用户。

### 校验失败

- 检查返回的`error_code`和`message`。
- 常见原因：XML语法错误、非`<mxfile>`根元素、缺少`<diagram>`元素。
- 修复XML后重新调用`drawio_validate`。

### 格式不支持

- `drawio_export`支持`png`、`jpeg`、`pdf`、`xmlpng`（Docker通道）和`svg`、`xmlsvg`、`html2`（编辑器通道，需内置浏览器编辑器页面打开）。
- 其他格式（如vsdx、gif）上游服务不支持。

### 内置浏览器编辑

生成或修改完成时调用`drawio_finalize(file="<工作区相对路径>")`；仅在返回`shouldOpenBrowser=true`时使用MobileWork已有的
`browser.open_url`打开返回的`openUrl`。已有编辑器连接时保持现有页面。仅打开现有文件且不需要导出时可调用`drawio_open`。
浏览器保存会增加revision；Agent写入前必须立即调用`drawio_get_state`，只在最新XML上修改，
并携带该次读取返回的准确`base_revision`。不允许由工具自动补齐revision。

## 当前运行时能力边界

### 已通过TypeScript运行时验证支持

- ✅ Draw.io XML校验（`drawio_validate`）
- ✅ PNG导出（`drawio_export`，format="png"）
- ✅ JPEG导出（`drawio_export`，format="jpeg"）
- ✅ PDF导出（`drawio_export`，format="pdf"）
- ✅ 可编辑PNG导出（`drawio_export`，format="xmlpng"，Docker通道嵌入源XML）
- ✅ SVG导出（`drawio_export`，format="svg"，编辑器通道）
- ✅ 可编辑SVG导出（`drawio_export`，format="xmlsvg"，编辑器通道）
- ✅ HTML导出（`drawio_export`，format="html2"，编辑器通道）
- ✅ 多页PNG/JPEG/xmlpng逐页导出（`all_pages=true`返回与页面数一致的`outputs[]`）
- ✅ 多页PDF单文件导出（`all_pages=true`）
- ✅ SVG/xmlsvg按`page_id`导出及多页逐页导出（编辑器通道，`all_pages=true`返回`outputs[]`）
- ✅ HTML按`page_id`导出及多页单文件导出（编辑器通道，`all_pages=true`）
- ✅ 服务健康检查（`drawio_health_check`）
- ✅ deep模式实际导出验证

### 尚未由当前运行时支持

以下功能**尚未通过当前运行时验证**，不得宣称已迁移：

- ❌ **嵌入XML的可编辑PDF** —— 当前Docker后端的PDF导出可能不嵌入源XML。
- ❌ **Mermaid→原生.drawio自动转换** —— 当前专家不提供该转换；改用原生XML、`drawio_create`或Graphviz自动布局。
- ❌ **Draw.io ELK布局命令** —— 当前专家不提供；大型图使用`autolayout.py`的Graphviz布局。

**处理原则：**
1. 用户请求这些功能时，明确说明当前运行时暂不支持。
2. **不得自动回退到宿主机Draw.io Desktop CLI。**
3. 至少保留可编辑的`.drawio`源文件；任务完成时用`drawio_finalize`导出PNG并在MobileWork内置浏览器中打开。
4. 不得调用宿主机Draw.io Desktop。

### 辅助脚本导出边界

| 脚本 | 当前实现 |
|------|----------|
| `buildup.py` | HTTP导出逐帧PNG并制作动画 |
| `drawio2pptx.py` | HTTP按页面导出PNG并嵌入PPTX |
| `prdiff.py` | HTTP渲染base/head/diff PNG |
| `timelapse.py` | HTTP导出历史帧PNG |
| `drawiohtml.py` | HTTP导出PNG并生成分页、平移、缩放HTML；不含SVG节点搜索和钻取 |
| `svgflow.py` | 仅为已有SVG增加动画；不接受`.drawio`输入 |

## 常见错误

| 错误 | 修复 |
|------|------|
| 缺少`id="0"`和`id="1"`根cell | 始终在`<root>`顶部包含二者 |
| 形状未连接 | 连线上的`source`和`target`必须匹配已有形状的`id` |
| 自闭合连线cell | 使用展开形式，包含`<mxGeometry relative="1" as="geometry" />`子元素 |
| XML注释中的`--` | XML规范禁止——用单连字符或改写 |
| `value`中的特殊字符 | 使用XML实体：`&amp;` `&lt;` `&gt;` `&quot;` |
| 标签中的文字换行 | 在`value`属性中使用`&#xa;`（不要用`\n`） |
| 节点重叠 | 间距随复杂度缩放（200-350px）；留出走线通道 |
| 连线穿越节点 | 添加waypoints、分散出入口或增大间距 |
| 评审循环不结束 | 5轮后用`drawio_finalize`更新PNG并在内置浏览器中微调，再按revision合并 |

> 更多详见`references/troubleshooting.md`。

## 内置资源

| 文件 | 何时阅读 |
|------|----------|
| `references/toolbox.md` | 不确定哪个脚本适合需求时——31个脚本按用例分组 |
| `references/xml-authoring.md` | 手写.drawio XML前——文件骨架、形状/连线cell、容器、色板、间距 |
| `references/diagram-types.md` | 用户指定具体图表类型时 |
| `references/shapes.md` + `scripts/shapesearch.py` | 需要特定形状时——10k+官方形状搜索 |
| `scripts/aiicons.py` | 涉及AI/LLM品牌logo时——321个品牌图标 |
| `references/style-presets.md` | 样式预设管理 |
| `references/troubleshooting.md` | 导出失败或渲染异常时 |
| `references/autolayout.md` | 大型布局密集型图表时 |
| `references/mermaid-authoring.md` | 将Mermaid语义迁移为原生Draw.io XML时的映射参考；不执行自动转换 |
