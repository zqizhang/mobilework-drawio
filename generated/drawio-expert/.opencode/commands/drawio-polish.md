---
description: 执行自动布局、路由调整和质量门禁。
agent: drawio-expert
---

若文件已经绑定，先调用drawio_get_state取得最新XML和revision。再以dry_run=true调用drawio_polish并核对前后评分及完整差异；仅在afterQuality.pass=true时携带准确base_revision正式写入。完成后必须调用drawio_finalize更新PNG并使用browser.open_url打开。
