---
name: drawio-session-editing
description: 当用户需要在MobileWork内置浏览器中手动编辑Draw.io工作区文件，或Agent需要在人工编辑后继续修改时使用。负责读取最新会话revision、把用户保存版本作为新的修改基线、以乐观并发方式提交XML，并在revision_conflict时重新读取和重试，避免旧快照造成内容丢失。已绑定图表的patch和polish先在同一画布展示临时只读差异预览，再通过OpenCode审批绑定候选哈希后写入。同时覆盖按图表持久化的框选注释任务流程和稳定ID范围守卫，禁止先修改后确认。
---

# Draw.io 会话同步与并发控制

Draw.io会话中的最新XML是后续修改的基线。用户人工编辑的图元不是只读内容；Agent可以按当前任务要求继续移动、改名、删除或重构它们，但必须先读取用户最新保存的版本，不能用旧快照覆盖整个文件。

## 标准流程

1. 创建或修改完成后调用`drawio_finalize`，自动校验并导出同名PNG；仅打开已有文件时调用`drawio_open`。
2. 将返回的`openUrl`立即交给MobileWork现有的`browser.open_url`打开，不新增界面按钮；完成浏览器调用前不得结束任务。
3. 如果任务依赖项目内容，先读取相关工作区文件再设计或修改图表。
4. 每次修改前立即调用`drawio_get_state`，取得最新XML和revision。
5. 以最新XML中的图元、标签、几何和样式为起点，根据当前任务判断哪些内容需要保留、调整、删除或重构。
6. 调用`drawio_patch(dry_run=true)`或`drawio_polish(dry_run=true)`生成同画布差异预览；普通任务调用`drawio_authorize_preview`，用户在弹窗允许后该工具会立即提交已展示的精确候选，Agent不得再重复调用正式patch/polish。注释任务继续调用`drawio_authorize_annotation_change`并按其范围授权流程写入。
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
- `drawio_patch(dry_run=true)` / `drawio_polish(dry_run=true)`：除返回结构化diff外，还会把临时预览XML推送到同一画布；绿色为新增、黄色为修改、红色为删除或原位置、蓝色为变更连线。预览不写入源文件。
- `drawio_authorize_preview(preview_id, plan)`：无活动注释的普通修改在看图后调用；OpenCode弹窗允许后，运行时在同一次工具调用中校验候选哈希和revision并立即写入，返回`applied=true`与新revision。无需也不得要求用户再发文字确认。
- 这些工具根据运行时上下文识别session，不需要用户手动传入session ID。
- 如果会话工具不可用，应明确说明无法提供冲突安全的浏览器编辑，不得假装当前画布已同步。

## 注释任务（框选评审）

用户在内置浏览器中框选一个或多个图元并填写修改说明后，还必须选择允许修改范围。每条注释记录选中图元的稳定 ID、页面、区域范围、修改说明、范围策略和提交时的图表基线。注释按图表文件持久化到 `<basename>.annotations.json`，不绑定对话session；重启或换新对话后打开同一图表仍可恢复。

范围策略只有四种：

| 策略 | 允许修改 | 明确禁止 |
|---|---|---|
| `selection_only`（只修改选区） | 仅用户选中的稳定 ID | 未选中的节点、关联线、周边布局以及新增图元 |
| `selection_and_edges`（允许调整关联连线） | 选中图元、与选中节点直接相连的边；可新增端点包含选中节点的边 | 其它节点和无关连线 |
| `surrounding_layout`（允许调整周边布局） | 选区附近、一跳关联节点及它们之间的连线；新增节点必须落在运行时计算的周边区域内 | 更远节点、其它页面或未披露的稳定 ID |
| `diagram_wide`（允许修改整个图表） | 当前 `.drawio` 文件的所有页面、节点、连线和布局；可修改计划中披露的新增/删除图元 | 工作区其它文件或未披露的 `pageId:cellId` |

范围是上限，不是自动修改许可。选择`diagram_wide`时浏览器先显示高风险确认；无论选择哪一种，Agent在正式写入前都必须再次展示具体计划并触发OpenCode审批弹窗。运行时按图表、session、稳定ID、范围、revision和一次性token强制校验。`diagram_wide`的稳定ID必须写成`pageId:cellId`。

### 每轮同时关注注释与手动编辑（重要）

只要当前会话已通过 `drawio_open`/`drawio_finalize` 绑定了 `.drawio` 文件，**每一轮对话开始都必须先并发地完成两项探测**，再决定本轮动作：

1. 调 `drawio_list_annotations(file, status="pending")` 查待处理注释（未完成和已过时）；
2. 调 `drawio_get_state` 拿最新 `revision` 和 `updatedBy`——`updatedBy` 取值 `editor`/`external` 表示用户在内置浏览器里手动动过画布，取 `agent`/`initial` 表示上次是 agent 改的或刚打开。

两者都是用户意图，必须合起来看，不能只看注释。探测后按下表决定本轮动作：

| 注释 | `updatedBy` | 本轮动作 |
|---|---|---|
| 无 | 任意 | 按用户本轮意图正常处理（无关问答/创建/导出等）。 |
| 有 | `agent`/`initial` | 用户没手调：准备dry-run和精确稳定ID计划，调用`drawio_authorize_annotation_change`触发写前审批；批准后才正式写入。 |
| 有 | `editor`/`external` | 用户手动改过画布。先`drawio_get_state(since_revision=注释的 baseRevision)`拿diff，把手动变化并入计划；然后调用`drawio_authorize_annotation_change`展示计划并等待写前审批。看到stale注释同样重新规划并审批。 |
| 用户本轮明确提了其它动作 | 任意 | 先做用户明确要的，注释放到之后或在本轮回话里提示还有几条待处理。 |
| 用户明确说"先不动注释 / 我先看看" | 任意 | 尊重意愿，跳过或仅列出。 |

关键点是手动编辑和注释可能同时存在（用户一边挪节点一边框选另一批提交注释），agent 必须先把两者都摸清楚再行动。该协议每轮都要执行，包括用户只发"嗯"、"继续"、"好了吗"这类简短回复的轮次——只要会话还绑定着文件，就先探测再回话。

### 工具

- `drawio_list_annotations(file, status="pending")`：列出待处理注释。每轮第一句对话必调一次。`pending` 聚合未完成和已过时；精确筛选可用 `"open"`、`"stale"`、`"resolved"`、`"ignored"`，也可用 `"all"`。
- `drawio_get_annotation(id)`：取注释详情并把它设为当前活动注释，含选中id、region、范围、过时标记和最新图元快照。
- `drawio_authorize_annotation_change(id, plan, proposed_changed_ids, requested_scope, escalation_reason?, preview_id?)`：必须在正式写入前调用；它自动绑定当前画布预览，并校验披露的稳定ID与预览一致。该工具权限固定为`ask`，OpenCode先弹窗，用户批准后才返回绑定当前revision、候选哈希和计划ID的一次性token。请求比用户原选项更宽的范围时，`escalation_reason`必填。
- `drawio_resolve_annotation(id, summary, changed_ids?)`：标记已完成并记录 summary；只改任务状态，不改图。

### 处理一条注释的标准闭环

1. `drawio_get_annotation(id)` 取详情；
2. `drawio_get_state` 取最新 XML 与 revision——这一步拿到的 XML 已经包含用户全部手动编辑（用户保存即 bump revision，agent 拿到的是最新版），patch 在这个基线上完成增量修改；
3. 用`drawio_patch(dry_run=true)`或`drawio_polish(dry_run=true)`形成精确计划并把差异预览推送到画布，列出所有会改变的稳定ID和所需范围；此时不得写入；
4. 调`drawio_authorize_annotation_change`并传入返回的`preview_id`。OpenCode弹窗出现前，Agent先用`plan`说明将改什么；用户应先看画布高亮，再决定是否批准。拒绝或关闭弹窗则立即停止，不得改图；
5. 用户批准后，把返回的`approvalToken`、`previewId`、`annotation_id`和同一`base_revision`传给一次正式`drawio_patch`或`drawio_polish`。运行时会核对候选哈希；token仅能使用一次，revision变化后必须重新规划、预览和审批；
6. `drawio_resolve_annotation(id, summary, changed_ids)`；
7. `drawio_finalize`刷新PNG与浏览器。

正式`drawio_polish`会重排整页，活动注释期间只有取得`diagram_wide`审批并携带`annotation_id`与`approval_token`才能使用。完整XML写入也会进行跨页稳定ID差异校验；新增图元优先使用带明确operation的`drawio_patch`。

### 越界申请

如果当前要求客观上无法在用户选择的范围内完成，先停止在dry-run阶段，不得尝试写入。随后：

1. 说明具体受阻点、必须越界的稳定ID以及不越界会造成什么问题；
2. 选择所需的更宽`requested_scope`，把原因写入`escalation_reason`；
3. 再调用`drawio_authorize_annotation_change`触发新的审批弹窗；
4. 只有用户批准后才使用新token写入；拒绝则保持原图不变。

禁止先改完再让用户检查，也禁止用普通`write`、`edit`、脚本或省略`annotation_id`绕过范围守卫。

一次只处理一条以避免 revision 冲突；处理完一条后回到第 1 步处理下一条。`stale` 注释表示提交后图元被改动——有时是 agent 上一次处理触发的，有时是用户手调的；不要盲 patch，先 `drawio_get_state` 看最新状态，必要时用 `since_revision` 取手动编辑 diff 弄清"谁改的、怎么改的"，再在新基线上重新核对这条注释到底要怎么落地。

注释的持久化流程状态是 `open`、`resolved` 或 `ignored`；`stale` 是运行时根据当前图表和提交基线动态计算的有效状态，不写死到持久化状态中。用户可以在浏览器注释面板手动标记已完成、忽略或重新打开。agent 必须跳过 `resolved` 和 `ignored`，也不得为这两种终态申请写入授权；只有用户重新打开后才可继续处理。忽略或完成时，已有活动注释和未使用的一次性授权立即失效。

诊断Bridge或实现宿主适配时读取[references/protocol.md](references/protocol.md)。需要理解基础XML模式时读取[references/xml-patterns.md](references/xml-patterns.md)；复杂绘图知识以`drawio-skill`为准。
