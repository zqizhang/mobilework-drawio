---
name: drawio-session-editing
description: 当用户需要在MobileWork内置浏览器中手动编辑Draw.io工作区文件，或Agent需要在人工编辑后继续修改时使用。负责读取图表级持久化revision、把用户保存版本作为新的修改基线、以乐观并发方式提交XML，并在revision_conflict时重新读取和重试，避免旧快照造成内容丢失。已绑定图表的patch和polish先在同一画布展示临时只读差异预览，再通过OpenCode审批绑定候选哈希后写入。同时覆盖按图表文件持久化的框选注释任务流程和稳定ID范围守卫；仅stale注释需先确认，所有正式写入都禁止先修改后确认。
---

# Draw.io 会话同步与并发控制

Draw.io会话中的最新XML是后续修改的基线。用户人工编辑的图元不是只读内容；Agent可以按当前任务要求继续移动、改名、删除或重构它们，但必须先读取用户最新保存的版本，不能用旧快照覆盖整个文件。

revision属于图表文件而不是对话会话：同一工作区相对路径绑定同一套单调递增revision，并持久化在`.mobilework/drawio-state/v1/`。新会话或运行时重启后继续使用该revision；preview、审批和一次性token仍绑定当前session与bindingId，不能跨会话复用。

## 标准流程

1. 创建或修改完成后调用`drawio_finalize`，自动校验并导出同名PNG；仅打开已有文件时调用`drawio_open`。
2. 检查返回的`shouldOpenBrowser`：仅为`true`时调用MobileWork工具`openwork_browser_open_url`，传入`url=openUrl`、`provider="builtin"`；若`editorConnected=true`，必须保持现有编辑器，不得重新打开或刷新，以免覆盖用户尚未保存的编辑。
3. 如果任务依赖项目内容，先读取相关工作区文件再设计或修改图表。
4. 每次修改前立即调用`drawio_get_state`，取得最新XML和revision。
5. 以最新XML中的图元、标签、几何和样式为起点，根据当前任务判断哪些内容需要保留、调整、删除或重构。
6. 普通任务先用`drawio_patch(dry_run=true)`、`drawio_polish(dry_run=true)`或`drawio_preview_state`生成同画布差异预览，再调用`drawio_authorize_preview`。该工具第一次只返回与候选绑定的OpenCode `question`参数；必须原样调用内置`question`。内置`question`把结果返回给Agent后，Agent必须再次调用同一授权工具，并显式传入返回的`reviewId`作为`approval_review_id`、把用户原始答案作为`approval_answer`，授权工具校验后才会写入。取消或关闭不写入，自定义文字视为修改反馈，必须基于最新revision重新生成预览。字体、填充色、文字色、边框色、透明度等常用视觉属性用`operations[].style_updates`；页面背景或高级样式使用完整XML。注释任务继续调用`drawio_authorize_annotation_change`并按其范围授权流程写入。
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
- `drawio_finalize(file=...)`：读取最新revision、校验、评分、导出同名PNG，并通过`shouldOpenBrowser`说明是否需要打开新编辑器；已有编辑器连接时禁止重复打开。
- `drawio_get_state(since_revision=...)`：返回最新XML、revision及可选的稳定ID变化。
- `drawio_preview_state(base_revision=..., xml=..., annotation_id?)`：为完整XML候选生成只读同画布预览，不写文件、不增加revision；返回属性级样式差异、页面背景差异、完整稳定ID和候选哈希。
- `drawio_update_state(base_revision=..., xml=..., preview_id?, approval_plan?, ...)`：普通任务会自动创建或复用完整XML预览并弹出审批，批准后只提交哈希完全一致的候选；注释任务仍需范围审批。
- `drawio_patch(dry_run=true)` / `drawio_polish(dry_run=true)`：除返回结构化diff外，还会把临时预览XML推送到同一画布；预览栏可切换修改前/修改后并查看属性前后值。绿色为新增、黄色为修改、红色为删除或原位置、蓝色为变更连线。预览不写入源文件，连线高亮也不会覆盖候选线条颜色。
- `drawio_authorize_preview(preview_id, plan, approval_review_id?, approval_answer?)`：普通候选的人工审批入口。第一次调用返回`status=question_required`及必须原样传给内置`question`的参数；用户作答后，第二次调用必须携带返回的`reviewId`和Question原始答案，确认时直接提交候选。`question_pending`表示同一问题已打开但授权工具尚未收到显式转交的答案，禁止再次调用`question`；Agent已有答案时应立即用上述两个字段重试。已提交的同一preview重试返回`alreadyApplied=true`。取消、关闭或自定义文字均不产生token、不写入。
- 这些工具根据运行时上下文识别session，不需要用户手动传入session ID。
- 浏览器保存发生409时，运行时会以稳定页面/图元ID进行保守三方合并；不重叠修改自动合并并落盘，但不强制刷新仍可能处于输入状态的画布；重叠修改则保留本地画布、逐字段展示差异，并让用户选择保留用户版或AI版的冲突字段。
- 自动合并只用于浏览器保存；Agent工具遇到`revision_conflict`时仍必须重新读取、重新执行增量修改并提交，不得把旧XML换用新revision重发。
- 如果会话工具不可用，应明确说明无法提供冲突安全的浏览器编辑，不得假装当前画布已同步。

## 注释任务（框选评审）

用户在内置浏览器中框选一个或多个图元并填写修改说明后，还必须选择允许修改范围。每条注释记录选中图元的稳定 ID、页面、区域范围、修改说明、范围策略和提交时的图表基线。注释按图表文件持久化到 `<basename>.annotations.json`，不绑定创建它的对话session；重启或换新对话后打开同一图表仍可恢复。

任务生命周期是“待处理（open）”“已完成（resolved）”和“已忽略（ignored）”；`freshness=stale` 只表示选中图元在提交后发生变化，任务仍然 open，不能跳过或视为失效，但执行前必须得到用户确认。fresh 注释无需额外口头确认，但仍必须经过下面的写前计划和OpenCode审批。resolved和ignored都是终态，只有用户重新打开后才能再次处理。

范围策略有四种：

| 策略 | 允许修改 | 明确禁止 |
|---|---|---|
| `selection_only`（只修改选区） | 仅用户选中的稳定 ID | 未选中的节点、关联线、周边布局以及新增图元 |
| `selection_and_edges`（允许调整关联连线） | 选中图元、与选中节点直接相连的边；可新增端点包含选中节点的边 | 其它节点和无关连线 |
| `surrounding_layout`（允许调整周边布局） | 选区附近、一跳关联节点及它们之间的连线；新增节点必须落在运行时计算的周边区域内 | 更远节点、其它页面或未披露的稳定 ID |
| `diagram_wide`（允许修改整个图表） | 当前 `.drawio` 文件的所有页面、节点、连线和布局；可修改计划中披露的新增/删除图元 | 工作区其它文件或未披露的 `pageId:cellId` |

范围是上限，不是自动修改许可。选择`diagram_wide`时浏览器先显示高风险确认；无论选择哪一种，Agent在正式写入前都必须再次展示具体计划，并完成OpenCode `question`人工审批。运行时按图表、session、稳定ID、范围、revision、候选哈希、真实question回复和一次性token强制校验。`diagram_wide`的稳定ID必须写成`pageId:cellId`。

### 每轮同时关注注释与手动编辑（重要）

只要当前会话已通过 `drawio_open`/`drawio_finalize` 绑定了 `.drawio` 文件，**每一轮对话开始都必须先并发地完成两项探测**，再决定本轮动作：

1. 调 `drawio_list_annotations(file, status="pending")` 查待处理注释；
2. 调 `drawio_get_state` 拿最新 `revision` 和 `updatedBy`——`updatedBy` 取值 `editor`/`external` 表示用户在内置浏览器里手动动过画布，取 `agent`/`initial` 表示上次是 agent 改的或刚打开。

两者都是用户意图，必须合起来看，不能只看注释。探测后按下表决定本轮动作：

| 注释情况 | `updatedBy` | 本轮动作 |
|---|---|---|
| 无 | 任意 | 按用户本轮意图正常处理（无关问答/创建/导出等）。 |
| 有，且 `requiresConfirmation=false` | 任意 | 图元自注释提交后未变化。即使 `updatedBy=editor/external`，也直接在最新 XML/revision 上按“处理一条注释的标准闭环”逐条处理，不额外口头询问；写前审批仍不可省略。 |
| 有，且至少一条 `requiresConfirmation=true` | 任意 | 这些 stale 注释仍然 open，但执行前先询问用户。若 `updatedBy=editor/external`，可先用 `drawio_get_state(since_revision=注释的 baseRevision)` 摘要说明变化；得到确认后再基于最新版本处理。fresh 注释不受影响，可直接处理。 |
| 用户本轮明确提了其它动作 | 任意 | 先做用户明确要的；完成后必须在同一轮重新调用 `drawio_list_annotations(status="pending")` 和 `drawio_get_state`。重新计算后，fresh 注释继续自动处理，stale 注释才询问。除非用户明确要求暂不处理，否则不得仅提示还有 fresh 注释便结束。 |
| 用户明确说"先不动注释 / 我先看看" | 任意 | 尊重意愿，跳过或仅列出。 |

关键点是手动编辑和注释可能同时存在（用户一边挪节点一边框选另一批提交注释），agent 必须先把两者都摸清楚再行动。`updatedBy=editor/external` 只说明画布发生过人工修改，不是独立的确认条件；是否询问以注释自身的 `requiresConfirmation` 为准。该协议每轮都要执行，包括用户只发"嗯"、"继续"、"好了吗"这类简短回复的轮次——只要会话还绑定着文件，就先探测再回话。

### 决策优先级与结束门禁

条件同时命中时严格按以下顺序执行：

1. 用户明确说暂不处理注释：尊重用户，本轮跳过；
2. 用户本轮有其它明确任务：先完成该任务；
3. 其它任务完成后重新读取最新 revision，并重新列出 pending 注释，不能沿用本轮开始时的 freshness；
4. 对重新计算后 `requiresConfirmation=false` 的注释，在同一轮逐条自动处理；
5. 对 `requiresConfirmation=true` 的注释，说明变化并询问用户，等待确认；
6. 完成所有本轮可执行修改后统一调用一次 `drawio_finalize`，再输出最终回复。

最终回复前必须再次调用 `drawio_list_annotations(file, status="pending")`。如果仍有 `requiresConfirmation=false` 的注释，不得结束本轮，也不得只报告“如需继续请告知”；应继续执行并 resolve。只有以下情况允许保留未处理注释：注释需要用户确认、用户明确要求暂不处理，或工具失败导致无法继续。

### 工具

- `drawio_list_annotations(file, status="pending")`：列出全部待处理注释，包括 `freshness=fresh` 和 `freshness=stale`。每轮第一句对话必调一次。`status="open"` 是兼容别名；精确筛选可用 `"fresh"`、`"stale"`、`"resolved"`、`"ignored"`，也可用 `"all"`。
- `drawio_get_annotation(file?, id)`：取注释详情，含选中id、region、范围、freshness、过时标记和最新图元快照；只有open任务会成为当前session的活动注释，resolved/ignored必须先由用户重新打开。
- `drawio_authorize_annotation_change(file?, id, plan, proposed_changed_ids, requested_scope, escalation_reason?, preview_id?, approval_review_id?, approval_answer?)`：必须在正式写入前调用并绑定当前画布预览，同时校验披露的稳定ID与预览一致。第一次调用只返回`question_required`及精确问题参数；Agent必须原样调用内置`question`，随后把返回的`reviewId`和Question原始答案显式传入第二次调用，用户确认时才返回绑定当前图表、session、revision、候选哈希和原始审批计划的一次性token。`question_pending`时不得重复提问；Agent已有答案时直接转交；同一未消费授权的重试复用原token。请求比用户原选项更宽的范围时，`escalation_reason`必填。
- `drawio_resolve_annotation(file?, id, summary, changed_ids?)`：标记已解决并记录 summary；只改任务状态，不改图。

### 处理一条注释的标准闭环

1. `drawio_get_annotation(id)` 取详情；
2. `drawio_get_state` 取最新 XML 与 revision——这一步拿到的 XML 已经包含用户全部手动编辑（用户保存即 bump revision，agent 拿到的是最新版），patch 在这个基线上完成增量修改；
3. 若`requiresConfirmation=true`，先说明图元变化并询问用户；未确认不得继续。fresh注释跳过本步；
4. 用`drawio_patch(annotation_id=id, dry_run=true)`、`drawio_polish(dry_run=true)`，或在语义工具无法表达时用`drawio_preview_state(annotation_id=id, base_revision=..., xml=...)`形成精确计划并把差异预览推送到画布，列出所有会改变的稳定ID和所需范围；非全图范围由运行时强制使用注释绑定的`pageId`，`diagram_wide`使用`pageId:cellId`，页面级属性使用`pageId:@page`，此时不得写入；
5. 调`drawio_authorize_annotation_change`并传入dry-run返回的`preview_id`。收到`question_required`后，把返回的`question.arguments`原样传给OpenCode内置`question`，不得自行回答、改写问题或跳过弹窗；
6. Question返回后再次调用`drawio_authorize_annotation_change`，必须保持同一`id`、`preview_id`、范围和稳定ID清单，并传入`approval_review_id=<第一次返回的reviewId>`、`approval_answer=<Question返回的原始答案>`；运行时按preview上的唯一review复用原始审批合同，不因Agent重新措辞`plan`而生成第二次审批。答案为“确认修改”时返回`approvalToken`；“取消修改”、关闭弹窗或自定义文字都不得写入，自定义文字必须作为反馈重新规划和预览；
7. 把获批的`approvalToken`、`previewId`、`annotation_id`和同一`base_revision`传给一次正式`drawio_patch`或`drawio_polish`；完整XML候选则传给一次`drawio_update_state`。运行时会核对候选哈希；token仅能使用一次，不能跨session使用，revision变化后必须重新规划、预览和审批；
8. 写入成功后调用`drawio_resolve_annotation(id, summary, changed_ids)`；
9. 重新列出pending注释：继续处理下一条fresh注释；遇到stale注释则询问；全部可执行注释处理完后统一调用一次`drawio_finalize`刷新PNG与浏览器。

正式`drawio_polish`会重排整页，活动注释期间只有取得`diagram_wide`审批并携带`annotation_id`与`approval_token`才能使用。完整XML写入也会进行跨页稳定ID差异校验；新增图元优先使用带明确operation的`drawio_patch`。

注释的持久化流程状态是 `open`、`resolved` 或 `ignored`；`stale` 是运行时根据当前图表和提交基线动态计算的 freshness，不写入持久化状态。用户可以在浏览器注释面板手动标记已完成、忽略或重新打开。Agent必须跳过`resolved`和`ignored`，也不得为这两种终态申请写入授权；只有用户重新打开后才可继续处理。忽略或完成时，当前图表所有session里的活动注释和未使用授权立即失效。

### 越界申请

如果当前要求客观上无法在用户选择的范围内完成，先停止在dry-run阶段，不得尝试写入。随后：

1. 说明具体受阻点、必须越界的稳定ID以及不越界会造成什么问题；
2. 选择所需的更宽`requested_scope`，把原因写入`escalation_reason`；
3. 再调用`drawio_authorize_annotation_change`取得新的question参数，原样调用内置`question`；
4. Question返回后，Agent把同一review编号及原始答案显式传给第二次授权调用；只有答案为“确认修改”才取得新token并写入，取消、关闭或文字反馈都保持原图不变。

OpenCode自定义工具本身不能直接读取内置`question`的返回值，因此这里采用Agent显式转交。插件事件桥只作为兼容和审计辅助，正常授权不依赖它；运行时仍严格绑定review、session、图表、revision、preview和候选哈希，但无法把Agent转交的答案声明为独立于Agent的不可伪造证明。

禁止先改完再让用户检查，也禁止用普通`write`、`edit`、脚本或省略`annotation_id`绕过范围守卫。

一次只处理一条以避免 revision 冲突；处理完一条后回到第 1 步处理下一条。`freshness=stale` 注释表示提交后图元被改动——有时是 agent 上一次处理触发的，有时是用户手调的；它仍然是 open 任务。不要盲 patch，先 `drawio_get_state` 看最新状态，必要时用 `since_revision` 取手动编辑 diff 弄清"谁改的、怎么改的"，询问用户是否仍要执行；确认后在新基线上重新核对并执行，写入成功后再标记 resolved。

用户也可以在浏览器注释面板手动标记已解决；agent 看到 `resolved` 的注释跳过即可，无需再次处理。

## 历史版本恢复

用户在浏览器右下角"历史"弹窗中可以查看最近 20 个持久化版本、通过缩略图和大图预览识别版本，并选择某个旧版本执行恢复。恢复是追加式新提交：它以新 revision 写入目标快照内容并新建一个 `restore` 历史检查点，恢复前的当前版本不会被删除，因此恢复本身也可以再次恢复回退。`restore` 不需要、也不存在 agent 可直接调用的工具，恢复只能由用户在浏览器中确认触发。

恢复发生后 agent 必须按以下规则行动：

- 重新调用 `drawio_get_state` 读取最新 XML 和 revision，把恢复后的内容作为新基线；禁止继续沿用恢复前的旧 XML。
- 所有未完成注释仍然存在，但它们的 `freshness` 会基于恢复后的 XML 重新计算，旧版本上的审批授权与关联预览已被显式清空，`activeAnnotationId` 也会被清除。恢复后旧的 `approval_token` 和 `preview_id` 一律失效；必须重新 `drawio_get_annotation`、重新 dry-run、重新调用 `drawio_authorize_annotation_change`，并在新的 OpenCode `question` 弹窗中确认，才能再次正式写入。
- 已解决注释不会因恢复自动重新打开。
- 恢复只更新 `.drawio` XML；同名 PNG 等派生文件可能暂时落后，直到下一次 `drawio_finalize` 刷新，不得宣称这些导出文件也已恢复。

诊断Bridge或实现宿主适配时读取[references/protocol.md](references/protocol.md)。需要理解基础XML模式时读取[references/xml-patterns.md](references/xml-patterns.md)；复杂绘图知识以`drawio-skill`为准。
