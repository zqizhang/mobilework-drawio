---
description: 执行自动布局、路由调整和质量门禁。
agent: drawio-expert
subtask: true
---

若文件已经绑定，本轮开始先并发调用drawio_list_annotations(file, status="pending")和drawio_get_state，取得待处理注释、最新XML、revision和updatedBy。再以dry_run=true调用drawio_polish并核对前后评分及完整差异；仅在afterQuality.pass=true时携带准确base_revision正式写入。若存在活动批注，必须先取得diagram_wide审批，并把annotation_id和当前session的一次性approval_token传给正式drawio_polish。完成后必须调用drawio_finalize更新PNG；仅在shouldOpenBrowser=true时使用openwork_browser_open_url打开。

用户要求：$ARGUMENTS
结合本次调用中可访问的图片、Draw.io 文件或其他附件；附件不可访问时明确要求用户重新附加。
