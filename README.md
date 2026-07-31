# AI Draw.io Agent based on OpenWork

基于 OpenWork + OpenCode 的 AI 绘图Agent，实现通过自然语言生成、修改和导出 draw.io 图表。

当前版本目标：

> 用户通过 OpenWork 调用 drawio-expert Agent，根据自然语言需求生成draw.io 图，并支持 PNG/SVG/PDF/JPG 导出。

------------------------------------------------------------------------

# 1. 项目实现方案

整体架构：

``` text
User
 |
 v
OpenWork
 |
 v
OpenCode Agent
(drawio-expert)
 |
 +----------------+
 |                |
 v                v
draw.io MCP    drawio-skill
 |                |
 v                v
diagrams.net   Agent Drawing Rules
(Web Editor)
 |
 v
.drawio file
 |
 v
Python Export Tools
 |
 v
Docker Image
(rlespinasse/drawio-export)
 |
 +---- PNG
 +---- SVG
 +---- PDF
 +---- JPG
```

------------------------------------------------------------------------

# 2. 核心组件

## 2.1 OpenWork / OpenCode

作为 Agent 工作台和执行环境。

负责：

-   用户交互
-   Agent 调度
-   Skill 加载
-   MCP 调用
-   文件操作

## 2.2 draw.io MCP

使用官方 draw.io MCP。

作用：

-   创建 draw.io 图表
-   打开 diagrams.net 在线编辑页面
-   与 draw.io Web 编辑器交互
-   提供图表相关工具能力

当前不依赖 draw.io Desktop。

## 2.3 Agent365-ai/drawio-skill

提供绘图领域知识：

-   图表类型选择
-   节点布局规范
-   连线规则
-   样式规范
-   图标选择建议
-   XML 生成约束

Agent 不直接自由生成图，而是在 Skill 规则约束下完成绘制。

## 2.4 drawio-expert Agent

负责：

-   理解用户绘图需求
-   调用 drawio-skill
-   调用 draw.io MCP
-   管理生成流程
-   调用导出工具

流程：

``` text
用户需求
 |
 v
分析图类型
 |
 v
加载 drawio-skill
 |
 v
生成/修改 draw.io 图
 |
 v
保存 .drawio 文件
 |
 v
导出图片或文档
```

## 2.5 Docker Export Backend

使用：

``` text
rlespinasse/drawio-export
```

作用：

无头环境下调用 draw.io 导出能力。

支持：

-   PNG
-   SVG
-   PDF
-   JPG

避免依赖本机 draw.io Desktop。

------------------------------------------------------------------------

# 3. 文件结构

``` text
drawio-openwork/

├── opencode.jsonc
├── .opencode/
│   ├── agents/
│   │   └── drawio-expert.md          # draw.io 专家 Agent
│   ├── skills/
│   │   └── drawio-skill/             # draw.io 绘图规范与知识
│   └── node_modules/                 # MCP/Agent 依赖包
│
├── tools/
│   ├── save-drawio.py                # 跨平台 drawio 文件保存工具
│   ├── export-drawio.py              # 跨平台 Docker 导出工具
│   ├── save-drawio.ps1               # Windows 版脚本（已弃用）
│   └── export-drawio.ps1             # Windows 版脚本（已弃用）
│
├── diagrams/
│   └── *.drawio                      # draw.io 源文件
│
├── exports/
│   ├── *.png                         # PNG 导出文件
│   ├── *.svg                         # SVG 导出文件
│   ├── *.pdf                         # PDF 导出文件
│   └── *.jpg                         # JPG 导出文件
│
└── README.md                         # 项目说明
```

------------------------------------------------------------------------

# 4. 运行流程

## Step 1：用户提出绘图需求

例如创建三层 Web 系统架构图。

## Step 2：drawio-expert 解析需求

Agent：

1.  判断图类型
2.  规划节点和关系
3.  加载 drawio-skill
4.  生成 draw.io XML

## Step 3：通过 draw.io MCP 打开图表

生成：

``` text
diagrams/example.drawio
```

并通过 MCP 在 diagrams.net Web 页面打开。

用户可以：

-   查看
-   手动编辑
-   继续让 Agent 修改

## Step 4：导出

调用：

``` bash
python tools/export-drawio.py --input diagrams/example.drawio --format png
```

内部流程：

``` text
Python Script
      |
      v
docker run
      |
      v
rlespinasse/drawio-export
      |
      v
exports/
```

------------------------------------------------------------------------

# 5. 已实现功能

## 图表生成

支持：

-   流程图
-   系统架构图
-   软件架构图
-   基础 UML

## 图表编辑

支持：

-   添加节点
-   修改文字
-   调整结构
-   更新连接关系

## 在线编辑

支持自动打开 diagrams.net Web 编辑器。

## 文件导出

  格式   用途
------ ------------
  PNG    图片展示
  SVG    高清矢量图
  PDF    文档交付
  JPG    普通图片

------------------------------------------------------------------------

# 6. 当前限制

## 1. 修改粒度较粗

当前主要：

``` text
重新生成 XML
```

不足：

-   可能覆盖用户手动修改
-   缺少节点级 diff

## 2. 缺少版本管理

未来：

``` text
diagram.drawio

snapshot/
 ├── version1
 ├── version2
```

支持：

-   回滚
-   对比
-   恢复

## 3. 导出依赖 Docker

当前要求：

``` text
Python + Docker
```

后续：

-   远程 export server
-   MCP 化导出服务

## 4. Agent 权限优化

后续：

-   最小权限
-   工具白名单
-   更细粒度安全控制

------------------------------------------------------------------------

# 7. 后续可能的开发方向

## draw.io 专家增强

增加：

-   架构设计规范
-   云服务图规范
-   UML 规范
-   企业绘图模板

## 图表版本管理

增加：

``` text
Git-like diagram history
```

支持：

-   修改记录
-   Diff
-   回滚

## 导出能力增强

支持：

-   Markdown 文档生成
-   自动生成架构说明
-   批量导出
-   CI/CD 自动生成技术文档
