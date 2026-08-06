---
name: drawio-session-editing
description: 当用户需要在MobileWork内置浏览器中手动编辑Draw.io工作区文件，或Agent需要在人工编辑后继续修改时使用。负责读取最新会话revision、把用户保存版本作为新的修改基线、以乐观并发方式提交XML，并在revision_conflict时重新读取和重试，避免旧快照造成内容丢失。同时覆盖框选注释任务流程：用户在内置浏览器框选图元并提交修改说明，每条注释形成包含稳定ID、页面、区域和说明的独立任务；每轮对话需同时探测"手动编辑"和"待处理注释"两种用户意图，合并为同一基线后再决定是否自动处理，user手调过画布时必须先确认再改动，避免与用户中间状态冲突。
---

# Draw.io 会话同步与并发控制

Draw.io会话中的最新XML是后续修改的基线。用户人工编辑的图元不是只读内容；Agent可以按当前任务要求继续移动、改名、删除或重构它们，但必须先读取用户最新保存的版本，不能用旧快照覆盖整个文件。

## 标准流程

1. 创建或修改完成后调用`drawio_finalize`，自动校验并导出同名PNG；仅打开已有文件时调用`drawio_open`。
2. 将返回的`openUrl`立即交给MobileWork现有的`browser.open_url`打开，不新增界面按钮；完成浏览器调用前不得结束任务。
3. 如果任务依赖项目内容，先读取相关工作区文件再设计或修改图表。
4. 每次修改前立即调用`drawio_get_state`，取得最新XML和revision。
5. 以最新XML中的图元、标签、几何和样式为起点，根据当前任务判断哪些内容需要保留、调整、删除或重构。
6. 调用`drawio_update_state`提交完整XML，或调用`drawio_patch`/`drawio_polish`执行最小修改，并携带紧邻本次写入前读取到的准确`base_revision`；不得自动补齐revision。
7. 收到`revision_conflict`时，重新读取最新状态，在新XML上重新执行当前任务所需的变更，再以新revision重试。禁止原样重发旧XML。
8. 更新成功后，简要说明结构变化、当前revision以及是否合并了人工修改。

## 修改原则

- 先通过稳定ID和标签定位图元，再进行修改。
- 修改范围以当前用户要求为准；局部任务优先局部修改，整体重构任务可以调整整张图。
- 不要仅因无法识别某个图元或样式就删除它；如果当前任务确实需要，可以在理解其关系后修改或移除。
- 对移动、重命名、新增或删除少量图元的请求，优先增量修改；只有任务本身要求整体重构时才重新生成整张图。
- 人工编辑与当前任务意图不一致时，以当前用户要求为准在最新版本上处理；revision协议只防止旧版本误覆盖，不赋予人工图元永久保留属性。
- 浏览器中的保存会增加revision并写回原`.drawio`文件；后续Agent写入必须基于该最新revision。
- 已绑定文件禁止使用普通`write`、`edit`或脚本直接覆盖；所有Agent写入必须经过revision提交网关。

## 工具契约

- `drawio_open(file=...)`：绑定当前会话和工作区文件，返回内置浏览器可打开的URL。
- `drawio_finalize(file=...)`：读取最新revision、校验、评分、导出同名PNG并返回必须交给`browser.open_url`的URL。
- `drawio_get_state(since_revision=...)`：返回最新XML、revision及可选的稳定ID变化。
- `drawio_update_state(base_revision=..., xml=...)`：以乐观并发方式提交完整XML。
- 这些工具根据运行时上下文识别session，不需要用户手动传入session ID。
- 如果会话工具不可用，应明确说明无法提供冲突安全的浏览器编辑，不得假装当前画布已同步。

## 注释任务（框选评审）

用户在内置浏览器中框选一个或多个图元并填写修改说明后，每条注释是一条独立任务，记录选中图元的稳定 ID、页面、区域范围、修改说明和提交时的 revision。注释随文件持久化到 `<basename>.annotations.json`，重启后仍可恢复。

### 每轮同时关注注释与手动编辑（重要）

只要当前会话已通过 `drawio_open`/`drawio_finalize` 绑定了 `.drawio` 文件，**每一轮对话开始都必须先并发地完成两项探测**，再决定本轮动作：

1. 调 `drawio_list_annotations(file, status="open")` 查待处理注释；
2. 调 `drawio_get_state` 拿最新 `revision` 和 `updatedBy`——`updatedBy` 取值 `editor`/`external` 表示用户在内置浏览器里手动动过画布，取 `agent`/`initial` 表示上次是 agent 改的或刚打开。

两者都是用户意图，必须合起来看，不能只看注释。探测后按下表决定本轮动作：

| 注释 | `updatedBy` | 本轮动作 |
|---|---|---|
| 无 | 任意 | 按用户本轮意图正常处理（无关问答/创建/导出等）。 |
| 有 | `agent`/`initial` | 用户没手调、意图明确交给 agent：立即按"处理一条注释的标准闭环"逐条处理，全部处理完再回话。 |
| 有 | `editor`/`external` | 用户手动改过画布。**先 `drawio_get_state(since_revision=注释的 baseRevision)` 拿手动编辑的 diff**，在回话里同时说出：手动改了哪些（diff 摘要）+ 还有多少条注释待处理；并问"要我基于你当前画布处理这些注释吗？"。**得到用户确认后才开始 patch**，不要擅自下手。看到 stale 注释同样先确认。 |
| 用户本轮明确提了其它动作 | 任意 | 先做用户明确要的，注释放到之后或在本轮回话里提示还有几条待处理。 |
| 用户明确说"先不动注释 / 我先看看" | 任意 | 尊重意愿，跳过或仅列出。 |

关键点是手动编辑和注释可能同时存在（用户一边挪节点一边框选另一批提交注释），agent 必须先把两者都摸清楚再行动。该协议每轮都要执行，包括用户只发"嗯"、"继续"、"好了吗"这类简短回复的轮次——只要会话还绑定着文件，就先探测再回话。

### 工具

- `drawio_list_annotations(file, status="open")`：列出待处理注释。每轮第一句对话必调一次。`status` 可用 `"open"`、`"resolved"`、`"stale"`、`"all"`。
- `drawio_get_annotation(id)`：取注释详情，含选中 id、region、过时标记和最新图元快照，省去重新解析 XML。
- `drawio_resolve_annotation(id, summary, changed_ids?)`：标记已解决并记录 summary；只改任务状态，不改图。

### 处理一条注释的标准闭环

1. `drawio_get_annotation(id)` 取详情；
2. `drawio_get_state` 取最新 XML 与 revision——这一步拿到的 XML 已经包含用户全部手动编辑（用户保存即 bump revision，agent 拿到的是最新版），patch 在这个基线上完成增量修改；
3. 用 `drawio_patch` 或 `drawio_update_state` 执行修改并携带上一步返回的 revision；
4. `drawio_resolve_annotation(id, summary, changed_ids)`；
5. `drawio_finalize` 刷新 PNG 与浏览器。

一次只处理一条以避免 revision 冲突；处理完一条后回到第 1 步处理下一条。`stale` 注释表示提交后图元被改动——有时是 agent 上一次处理触发的，有时是用户手调的；不要盲 patch，先 `drawio_get_state` 看最新状态，必要时用 `since_revision` 取手动编辑 diff 弄清"谁改的、怎么改的"，再在新基线上重新核对这条注释到底要怎么落地。

用户也可以在浏览器注释面板手动标记已解决；agent 看到 `resolved` 的注释跳过即可，无需再次处理。

诊断Bridge或实现宿主适配时读取[references/protocol.md](references/protocol.md)。需要理解基础XML模式时读取[references/xml-patterns.md](references/xml-patterns.md)；复杂绘图知识以`drawio-skill`为准。
