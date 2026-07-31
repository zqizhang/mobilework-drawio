# Draw.io Export MCP Server

通过远程 Draw.io Export Server 导出 `.drawio` 文件为 PNG / JPEG / PDF 的本地 MCP Server。

## 架构

```
OpenCode Agent
  → 调用本地 stdio MCP Server (drawio-export-mcp)
    → 读取本地 .drawio 文件的 XML 内容
    → HTTP POST XML 到远程 Export Server
    → 接收 PNG/JPEG/PDF 二进制
    → 保存到本地工作区
    → 返回输出路径和结果
```

## 前置条件

- Python >= 3.12
- `uv` 包管理器（推荐）或 `pip`
- 局域网内可访问的 Draw.io Export Server（默认 `http://192.168.1.210:18765`）

## 安装

```bash
# 克隆/进入项目目录
cd drawio-export-mcp

# 使用 uv 安装依赖（推荐）
uv pip install -e .

# 或使用 pip
pip install -e .
```

## 配置

复制 `.env.example` 为 `.env` 并按需修改：

```bash
cp .env.example .env
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DRAWIO_EXPORT_URL` | `http://192.168.1.210:18765/ImageExport4/export` | 远程导出服务地址 |
| `DRAWIO_WORKSPACE_ROOT` | 当前工作目录 | 允许读写的根目录 |
| `DRAWIO_REQUEST_TIMEOUT` | `60` | HTTP 请求超时（秒） |
| `DRAWIO_MAX_INPUT_SIZE_MB` | `20` | 输入文件大小上限（MB） |
| `DRAWIO_MAX_OUTPUT_SIZE_MB` | `100` | 输出文件大小上限（MB） |

## 启动

### 本地开发测试

```bash
uv run python -m drawio_export_mcp.server
```

### OpenCode MCP 配置

在 `.opencode/opencode.jsonc` 中添加：

```jsonc
"mcp": {
  "drawio-export": {
    "type": "local",
    "command": ["python的绝对路径", "-m", "drawio_export_mcp.server"],
    "environment": {
      "DRAWIO_EXPORT_URL": "http://192.168.1.210:18765/ImageExport4/export",
      "DRAWIO_WORKSPACE_ROOT": "你的工作区路径"
    },
    "enabled": true
  }
}
```

### Linux 启动

```bash
# 使用 uv
uv run python -m drawio_export_mcp.server

# 或使用绝对路径
/path/to/python -m drawio_export_mcp.server
```

### Windows 启动

```powershell
# 使用 uv
uv run python -m drawio_export_mcp.server

# 或使用绝对路径
C:\Users\xxx\AppData\Local\Python\bin\python.exe -m drawio_export_mcp.server
```

## MCP 工具

### 1. drawio_export

导出 `.drawio` 文件为 PNG、JPEG 或 PDF。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input_path` | string | 是 | 本地 .drawio 文件路径 |
| `format` | string | 是 | 输出格式：`png`、`jpeg`、`pdf` |
| `output_path` | string | 否 | 输出路径。未提供时自动生成（输入文件旁、同主名、对应后缀） |
| `page_id` | string | 否 | 指定导出的页面 ID |
| `all_pages` | bool | 否 | 导出所有页面（默认 false） |
| `scale` | float | 否 | 缩放比例（默认 1） |
| `border` | int | 否 | 边框宽度像素（默认 0） |
| `background` | string | 否 | 背景色，如 `#ffffff` |
| `embed_xml` | bool | 否 | 在导出结果中嵌入源 XML（仅部分格式支持） |
| `overwrite` | bool | 否 | 允许覆盖已有输出文件（默认 false） |

**成功返回：**

```json
{
  "success": true,
  "input_path": "/path/to/architecture.drawio",
  "output_path": "/path/to/architecture.png",
  "format": "png",
  "size_bytes": 182430,
  "content_type": "image/png",
  "warnings": []
}
```

### 2. drawio_validate

校验 `.drawio` 文件结构，返回页面信息。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input_path` | string | 是 | 本地 .drawio 文件路径 |

**成功返回：**

```json
{
  "success": true,
  "input_path": "/path/to/file.drawio",
  "file_size_bytes": 2048,
  "is_valid_drawio": true,
  "page_count": 3,
  "pages": [
    {"id": "page1", "name": "Architecture", "element_count": 15},
    {"id": "page2", "name": "Sequence", "element_count": 8}
  ]
}
```

### 3. drawio_health_check

检查 MCP Server 和远程 Export Server 的健康状态。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `deep` | bool | 否 | 执行完整导出测试（默认 false 仅快速检查） |

## 错误码

| 错误码 | 说明 |
|--------|------|
| `INPUT_NOT_FOUND` | 输入文件不存在或不可读 |
| `INPUT_OUTSIDE_WORKSPACE` | 文件在工作区之外 |
| `INPUT_TOO_LARGE` | 输入文件超过大小限制 |
| `INVALID_DRAWIO_XML` | 文件不是合法的 Draw.io XML |
| `UNSUPPORTED_FORMAT` | 不支持的导出格式 |
| `INVALID_OUTPUT_EXTENSION` | 输出文件后缀与格式不一致 |
| `OUTPUT_ALREADY_EXISTS` | 输出文件已存在且 overwrite=false |
| `EXPORT_SERVER_UNREACHABLE` | 无法连接导出服务器 |
| `EXPORT_SERVER_TIMEOUT` | 导出服务器响应超时 |
| `EXPORT_SERVER_ERROR` | 导出服务器返回错误 |
| `INVALID_EXPORT_RESPONSE` | 导出服务器返回了意外内容 |
| `OUTPUT_TOO_LARGE` | 导出结果超过大小限制 |
| `OUTPUT_WRITE_FAILED` | 写入输出文件失败 |

## 安全特性

- 只允许读写工作区内的文件
- 阻止路径穿越（`../`）和符号链接逃逸
- 仅支持 `png`、`jpeg`、`pdf` 三种格式
- 默认不覆盖已有文件
- 不允许通过工具参数修改 Export Server 地址
- HTTP 连接和读取超时
- 输入/输出文件大小上限
- 原子写入（先写临时文件，再 move 到目标位置）
- 导出失败时不留下不完整文件

## 项目结构

```
drawio-export-mcp/
├── pyproject.toml              # 项目配置和依赖
├── README.md                   # 本文件
├── .env.example                # 环境变量模板
├── src/
│   └── drawio_export_mcp/
│       ├── __init__.py
│       ├── server.py           # MCP Server 主程序（3 个工具）
│       ├── export_client.py    # HTTP 导出客户端
│       ├── path_security.py    # 路径安全校验
│       └── drawio_validation.py # Draw.io XML 校验
├── tests/
│   └── test_all.py             # 完整测试套件
└── examples/
    └── minimal.drawio          # 最小示例文件
```

## 运行测试

```bash
python tests/test_all.py
```

## 许可证

MIT
