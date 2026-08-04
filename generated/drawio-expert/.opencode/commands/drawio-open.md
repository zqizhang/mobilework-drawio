---
description: 在MobileWork现有内置浏览器中打开并协同编辑Draw.io。
agent: drawio-expert
---

加载drawio-session-editing。优先调用drawio_finalize自动校验并更新同名PNG；使用MobileWork现有browser.open_url打开返回的openUrl。后续每次Agent修改前立即调用drawio_get_state；携带准确base_revision提交，发生revision_conflict时重新读取、合并人工改动并重试。
