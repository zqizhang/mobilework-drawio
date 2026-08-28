---
description: 以稳定ID安全增量修改Draw.io文件。
agent: drawio-expert
subtask: true
---

加载drawio-skill。若文件已经通过drawio_open绑定，必须先调用drawio_get_state并使用其最新XML和准确revision；可先以dry_run=true调用drawio_patch提前查看差异，随后携带base_revision正式调用drawio_patch，由工具自动展示或复用预览、弹出审批并在批准后写入。完成后必须调用drawio_finalize更新PNG；仅在shouldOpenBrowser=true时调用MobileWork工具openwork_browser_open_url，传入url=openUrl、provider="builtin"。revision_conflict时重新读取、合并并重试。
