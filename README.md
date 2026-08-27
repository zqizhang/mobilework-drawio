# MobileWork Draw.io 专家包

本仓库把 `mobilework-drawio` 迁移为 MobileWork 专家管理器支持的正式专家包。它不修改 MobileWork 应用内部；最终分发物位于 `generated/drawio-expert`，既可安装到全局专家目录，也可由管理器投影到具体工作区。

## 包结构

```text
generated/drawio-expert/
├── expert.json
├── opencode.json
├── README.md
└── .opencode/
    ├── agents/drawio-expert.md
    ├── commands/*.md
    ├── package.json
    ├── plugins/drawio-expert/drawio-runtime-hooks.js
    ├── references/drawio-expert/drawio-intranet/overview.md
    ├── skills/
    │   ├── drawio-skill/
    │   └── drawio-session-editing/
    │       └── scripts/drawio-runtime-core.mjs
    └── tools/drawio-expert/*.js
```

边界如下：

- `expert.json` 是专家、Skill、Command、Reference、Tool、Plugin 和权限的唯一分发合同。
- 19 个 Tool 是标准 OpenCode custom tool，位于 `.opencode/tools/drawio-expert/`，由 OpenCode 自动发现。
- Plugin 只保留 `experimental.chat.system.transform` 和 `tool.execute.before` 两类 hook，不注册 Tool。
- 共享运行时作为 `drawio-session-editing` 的已声明资源分发，不使用管理器不支持的 `.opencode/lib`。
- 本地 Plugin、Tool 和 Command 均不手写到根 `opencode.json`；根配置由专家管理器生成。
- `.opencode/package.json` 只声明 Tool 入口所需的精确版本依赖；包内不携带 `node_modules`。

## 能力与约束

包内保留 19 个 Draw.io 工具，覆盖创建、检查、比较、增量修改、质量优化、七种格式导出、浏览器 Bridge、revision、预览审批、批注范围审批和历史恢复。

Hook 约束仍然生效：

- 只有系统上下文包含稳定的 `drawio-expert` Agent 标识时，才注入 Draw.io 工作流提示。
- 已通过 `drawio_open` 绑定的文件不能被普通 `write`、`edit` 或 `apply_patch` 覆盖。
- `drawio_authorize_preview` 与 `drawio_authorize_annotation_change` 保持人工审批；其余权限按 `guided` 自主度派生。

浏览器只通过 MobileWork 的 `openwork_browser_open_url` 打开，并传入 `url=openUrl`、`provider="builtin"`。已有编辑器连接时不得重复打开或刷新。

## 构建

```powershell
npm run build
```

构建会打包共享运行时、登记全部 Skill 资源及 SHA-256，并调用本机 `mobilework-expert-manager` 正式生成专家包。默认管理器位置是：

```text
%USERPROFILE%\.mobilework\skills\mobilework-expert-manager
```

如需覆盖，可设置 `MOBILEWORK_EXPERT_MANAGER_ROOT`。

## 验证

```powershell
npm run test:source
npm run test:generated
npm run test:history
npm run test:package
```

`test:package` 会检查正式 manifest、19 个 Tool、hook-only Plugin、自动发现边界，并通过专家管理器完成一次临时工作区安装与卸载。Docker Export Server 的实机验证单独执行：

```powershell
node tests/docker.integration.mjs
```

## 源文件

- `runtime/drawio-runtime.ts`：Tool 与 Hook 共享运行时。
- `runtime/drawio-runtime-hooks.js`：仅包含 Plugin hook 入口。
- `runtime/drawio-tools.json`：19 个 Tool 的稳定清单与用途。
- `skill-sources/`：两个 Skill 的可维护源文件。
- `expert.json`：与构建输入同步的正式能力清单。
- `generated/drawio-expert/`：由管理器生成的可分发专家包。

不要手工修改生成目录；修改源文件后重新运行 `npm run build`。
