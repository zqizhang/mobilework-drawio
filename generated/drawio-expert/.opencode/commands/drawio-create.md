---
description: 根据需求创建、校验并预览Draw.io文件。
agent: drawio-expert
---

加载drawio-skill。分析需求并建立节点、连线、分组和页面语义；调用drawio_create或合适的Skill脚本生成文件。根据质量结果做最多两轮最小修复，最后必须调用drawio_finalize自动校验、导出同名PNG并取得openUrl，再立即调用MobileWork现有browser.open_url打开内置浏览器。报告源文件、PNG、评分和限制。
