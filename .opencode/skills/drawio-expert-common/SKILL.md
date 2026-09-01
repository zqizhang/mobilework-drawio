---
name: drawio-expert-common
description: Draw.io 绘图专家 的通用工作指引。
---

# 通用专家工作指引

这个 playbook 适用于 `Draw.io 绘图专家` 中的所有 agent。

包类型：`expert`

描述：创建、修改和检查Draw.io图表，以稳定ID完成增量编辑与质量验收；通过Docker Export Server导出PNG、JPEG、PDF和可编辑PNG，并在需要时自动打开内置浏览器、通过Bridge导出SVG、可编辑SVG和HTML；用revision协议确保Agent始终基于用户保存的最新版本继续修改。

## 工作节奏

1. 当前轮涉及已绑定Draw.io图表时，即使没有加载其它Skill，也先用`drawio_get_state`同步最新revision/XML，再用`drawio_list_annotations(status="all")`同步全部注释变化；禁止复用上一轮缓存。
2. 先澄清用户目标、输入材料和验收标准。
3. 判断当前任务是单专家直接执行，还是专家团团长委派团员执行。
4. 输出要有证据、可验收、可复查。
5. 优先交付最小但完整的有用产物，避免发散和臆测。
6. 正式写入前复查revision，报告完成前复查pending注释并说明验证证据。

## 回传格式

向其他 agent 回传，或总结最终工作时，使用以下结构：

```markdown
## 结果
[完成了什么，或发现了什么。]

## 证据
[命令、文件、检查结果、来源引用或其他证据。]

## 验收状态
[逐条标记验收标准为通过、失败或阻塞。]

## 依赖关系
[使用了哪些上游输入，解除了哪些下游阻塞，以及该分支是否可并行。]

## 失败或阻塞项
[明确原因和下一步动作；没有则写 none。]

## 风险
[已知缺口；没有则写 none。]
```

## 共享运行时核心

本技能目录同时承载全部 `drawio_*` 自定义工具共享的运行时核心：

- `scripts/drawio-runtime-core.mjs`：单文件 ESM 运行时，内置 XML 解析、质量评分、revision Bridge、注释持久化、历史快照和 Docker/浏览器导出客户端。
- 所有 `.opencode/tools/drawio_*.js` 适配器都通过同一份核心加载工具定义；session、注释审批 token 和预览状态保存在共享全局状态中，跨工具有效；revision 按图表文件持久化到工作区 `.mobilework/drawio-state/v1/`，切换会话或重启运行时后仍延续。
- 适配器优先从 `MOBILEWORK_SKILLS_DIR/drawio-expert-common/scripts/drawio-runtime-core.mjs` 解析核心；直接把专家包作为普通 OpenCode 项目运行时，回退到包内 `.opencode/skills/` 路径。
- 不要移动、重命名或复制该文件；也不要在其它技能中打包第二份运行时。
