---
name: drawio-session-editing
description: 当用户需要在MobileWork内置浏览器中手动编辑Draw.io工作区文件，或Agent需要在人工编辑后继续修改时使用。负责读取最新会话revision、把用户保存版本作为新的修改基线、以乐观并发方式提交XML，并在revision_conflict时重新读取和重试，避免旧快照造成内容丢失。
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

诊断Bridge或实现宿主适配时读取[references/protocol.md](references/protocol.md)。需要理解基础XML模式时读取[references/xml-patterns.md](references/xml-patterns.md)；复杂绘图知识以`drawio-skill`为准。
