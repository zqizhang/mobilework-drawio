---
description: 以稳定ID安全增量修改Draw.io文件。
agent: drawio-expert
subtask: true
---

加载drawio-skill。若文件已经通过drawio_open或drawio_finalize绑定，本轮开始必须并发调用drawio_list_annotations(file, status="pending")和drawio_get_state，使用其最新XML和准确revision并同时处理注释状态；再以dry_run=true调用drawio_patch，确认差异后携带base_revision正式修改。完成后必须调用drawio_finalize更新PNG；仅在shouldOpenBrowser=true时打开内置浏览器。revision_conflict时重新读取、合并并重试。

用户要求：$ARGUMENTS
结合本次调用中可访问的图片、Draw.io 文件或其他附件；附件不可访问时明确要求用户重新附加。
