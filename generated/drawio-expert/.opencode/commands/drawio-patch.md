---
description: 以稳定ID安全增量修改Draw.io文件。
agent: drawio-expert
---

加载drawio-skill。若文件已经通过drawio_open绑定，必须先调用drawio_get_state并使用其最新XML和准确revision；再以dry_run=true调用drawio_patch，确认差异后携带base_revision正式修改。完成后必须调用drawio_finalize更新PNG和内置浏览器。revision_conflict时重新读取、合并并重试。
