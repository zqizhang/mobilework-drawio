---
name: drawio-skill
version: 3.0.0
description: 当用户需要生成图表、流程图、架构图、ER图、UML/序列/类图、SysML/MBSE图（块定义、内部块、需求、参数）、BPMN业务流程图、泳道/跨职能流程图、网络拓扑、Terraform或Kubernetes基础设施图、ML/DL模型图（Transformer/CNN/LSTM）、思维导图等可视化内容时使用。也应在解释含有3个以上组件、复杂数据流或适合可视化的系统关系时主动使用。适用于需要自定义样式、丰富形状词汇、泳道或导出图像（PNG/JPEG/PDF）的场景。生成.drawio XML并通过Draw.io Export MCP导出为图像。
license: MIT
homepage: https://github.com/Agents365-ai/drawio-skill
compatibility: 需要已在OpenCode中配置并启用的Draw.io Export MCP Server（提供drawio_export、drawio_validate、drawio_health_check工具）。可选自动布局（scripts/autolayout.py）需要Graphviz（dot）。自检步骤需要支持视觉能力的模型（如Claude Sonnet/Opus）；不可用时自动跳过。
platforms: [macos, linux, windows]
metadata: {"openclaw":{"emoji":"📐","os":["darwin","linux","win32"]},"hermes":{"tags":["drawio","diagram","flowchart","architecture","visualization","uml"],"category":"design","related_skills":["mermaid","excalidraw","plantuml"]},"author":"Agents365-ai (MCP adaptation by wujingming)","version":"3.0.0"}
---

# Draw.io 图表生成与导出

## 概述

通过编写`.drawio` XML生成专业图表，并调用**Draw.io Export MCP**将图表导出为PNG、JPEG或PDF。

**支持格式：** PNG、JPEG、PDF —— 全部通过MCP工具`drawio_export`完成。

> **注意：** 本Skill已从Draw.io Desktop CLI迁移至MCP。PNG、JPEG和PDF导出通过远程Export Server完成，不再依赖宿主机安装Draw.io Desktop。

## 适用与不适用场景

**使用本Skill：** 需要精美、精确的图表（架构、网络、严格UML、ERD），需要不透明填充、10,000+官方/品牌形状、泳道或自定义几何图形，导出为PNG/JPEG/PDF。

**不使用本Skill，改用其他方案：**

- 手绘/白板风格 → **excalidraw** 或 **tldraw**
- 以文本为主、适合git版本控制的图表 → **mermaid**（通用）或 **plantuml**（UML专用）
- 自由画布草图/手绘笔触 → **tldraw**

## 前置条件

### 必需

- **Draw.io Export MCP Server** 已在OpenCode中配置并启用。
- 该MCP提供以下三个工具：`drawio_export`、`drawio_validate`、`drawio_health_check`。

### 可选

- **Graphviz** (`dot`) —— `scripts/autolayout.py`自动布局脚本需要。安装：macOS `brew install graphviz`，Linux `apt install graphviz`。
- **视觉模型** —— 自检步骤（查看导出PNG）需要支持图像输入的模型。不可用时自动跳过。

### 不再需要

- ~~宿主机安装 Draw.io Desktop~~
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
- 否则检查`~/.drawio-skill/styles/`中是否有`"default": true`的文件。如有 → 活动预设 = 该文件。
- 否则 → 无活动预设；使用内置颜色/形状/连线约定。

从`~/.drawio-skill/styles/<名称>.json`加载预设JSON，回退到`<本skill目录>/styles/built-in/<名称>.json`。预设不存在则告知用户并停止，不得静默回退。

加载成功时首行回复：*"使用预设\`<名称>\`（置信度：<级别>）。"* 详见`references/style-presets.md`→"应用预设"。

### 步骤1 —— 生成或修改.drawio文件

根据需求选择生成方式：

**(a) 手写XML** —— 自定义样式、品牌图标、泳道、精确几何。**先读`references/xml-authoring.md`**（文件骨架、形状/连线形式、容器、连接点分布、色板、间距规则）。

**(b) Mermaid→CLI转换** —— 标准图表类型、无自定义样式/图标需求、且CLI ≥ v30时。写`.mmd`文件，运行`drawio -x -f xml -o <名称>.drawio <名称>.mmd`。此路径仍需要Draw.io Desktop CLI——当前MCP不支持此功能。如CLI不可用，回退到手写XML。

**(c) 数据驱动生成器** —— 适用于以下场景。**布局密集型图表（>~15节点）不要手写坐标**——用JSON描述图结构并运行`python3 <本skill目录>/scripts/autolayout.py graph.json -o <名称>.drawio`通过Graphviz计算节点位置和正交连线路由。

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

生成`.drawio`后运行`python3 <本skill目录>/scripts/validate.py <名称>.drawio`做快速确定性结构检查（悬空边、重复ID、重叠）。

### 步骤2 —— 调用drawio_validate校验XML

生成或大幅修改`.drawio`文件后，**必须调用MCP工具**`drawio_validate`检查XML结构和页面信息：

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
- **安全阀：** 5轮后建议用户直接在draw.io桌面版中微调

### 步骤6 —— 最终导出

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

- 如用户未指定格式，默认导出PNG。
- 报告`.drawio`源文件和导出图像的文件路径。
- 询问用户是否在draw.io桌面版中打开`.drawio`进一步微调。

## MCP工具参考

### drawio_export

统一导出工具，通过`format`参数选择PNG、JPEG或PDF。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input_path` | string | 是 | 本地.drawio文件路径 |
| `format` | string | 是 | 输出格式：`png`、`jpeg`、`pdf` |
| `output_path` | string | 否 | 输出路径；未提供时在输入文件旁自动生成 |
| `page_id` | string | 否 | 指定导出的页面ID |
| `all_pages` | bool | 否 | 导出所有页面（默认false） |
| `scale` | float | 否 | 缩放比例（默认1） |
| `border` | int | 否 | 边框宽度像素（默认0） |
| `background` | string | 否 | 背景色，如`#ffffff` |
| `embed_xml` | bool | 否 | 嵌入源XML（仅部分格式支持，默认false） |
| `overwrite` | bool | 否 | 允许覆盖已有文件（默认false） |

**预览建议：** `format="png"`，输出到`preview/`或临时目录，`overwrite=true`。
**最终文件建议：** `overwrite=false`（默认），未经用户允许不得覆盖已有文件。

### drawio_validate

校验`.drawio`文件的结构和页面信息。不执行导出，不修改文件。

**调用时机：**
- 新生成`.drawio`文件后
- 大幅修改图表后
- 怀疑XML结构或页面信息异常时
- 导出服务返回图表解析错误时

### drawio_health_check

检查MCP Server和Export Server的健康状态。

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
1. `~/.drawio-skill/styles/<名称>.json` —— 用户预设
2. `<本skill目录>/styles/built-in/<名称>.json` —— 内置预设（`default`、`corporate`、`handdrawn`、`colorblind-safe`、`dark`）

名称查找前统一转为小写。

## 辅助脚本

本Skill捆绑了大量Python脚本用于数据导入、自动布局、格式转换等。脚本列表及用途详见`references/toolbox.md`。

> **注意：** 辅助脚本是独立Python程序，**无法直接调用MCP工具**。脚本层面的导出功能（如`buildup.py`的PNG帧导出、`svgflow.py`的SVG导出）仍依赖Draw.io Desktop CLI。详见"当前MCP能力边界"。

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

- `drawio_export`只支持`png`、`jpeg`、`pdf`。
- 如需SVG，参考"当前MCP能力边界"。

### 浏览器回退（不需要CLI）

当MCP不可用时，生成客户端URL：

```bash
python3 <本skill目录>/scripts/encode_drawio_url.py input.drawio          # 只读查看
python3 <本skill目录>/scripts/encode_drawio_url.py --edit input.drawio    # 可编辑编辑器
```

## 当前MCP能力边界

### 已通过MCP验证支持

- ✅ Draw.io XML校验（`drawio_validate`）
- ✅ PNG导出（`drawio_export`，format="png"）
- ✅ JPEG导出（`drawio_export`，format="jpeg"）
- ✅ PDF导出（`drawio_export`，format="pdf"）
- ✅ 服务健康检查（`drawio_health_check`）
- ✅ deep模式实际导出验证

### 尚未由当前MCP支持

以下功能**尚未通过MCP验证**，不得宣称已迁移：

- ❌ **SVG导出** —— 当前MCP不支持SVG格式。
- ❌ **可编辑SVG**（嵌入XML的SVG） —— 依赖SVG导出。
- ❌ **嵌入XML的可编辑PDF** —— 当前MCP的PDF导出可能不嵌入源XML。
- ❌ **Mermaid→原生.drawio转换** —— 需要Draw.io Desktop CLI ≥ v30。当前MCP不支持此路径。
- ❌ **ELK `--layout` 布局** —— 需要Draw.io Desktop CLI ≥ v30。当前MCP不支持。
- ❌ **`-e`（嵌入XML）** —— 当前MCP通过`embed_xml`参数支持，但实际效果取决于后端。

**处理原则：**
1. 用户请求这些功能时，明确说明当前MCP后端暂不支持。
2. **不得自动回退到宿主机Draw.io Desktop CLI。**
3. 至少保留可编辑的`.drawio`源文件，以便用户在draw.io桌面版中手动导出。
4. 辅助脚本中的CLI依赖保持原样，不得伪装为已迁移。

### 辅助脚本CLI依赖清单

以下脚本内部直接调用Draw.io Desktop CLI。**这些脚本是独立Python程序，不能调用MCP工具。** 本次未修改这些脚本：

| 脚本 | CLI用途 | 依赖格式 | MCP可覆盖？ | 本次修改？ |
|------|---------|----------|------------|-----------|
| `buildup.py` | 逐帧导出PNG制作动画 | PNG | ✅ PNG | 否（独立脚本） |
| `drawio2pptx.py` | 每页导出PNG嵌入PPTX | PNG | ✅ PNG | 否（独立脚本） |
| `prdiff.py` | CI中渲染base/head/diff PNG | PNG | ✅ PNG | 否（CI脚本） |
| `svgflow.py` | 导出SVG制作流动动画 | **SVG** | ❌ | 否（SVG不支持） |
| `drawiohtml.py` | 导出SVG嵌入HTML查看器 | **SVG** | ❌ | 否（SVG不支持） |

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
| 评审循环不结束 | 5轮后建议用户在draw.io桌面版中微调 |

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
| `references/mermaid-authoring.md` | 标准类型无自定义样式时（需要CLI ≥ v30） |
