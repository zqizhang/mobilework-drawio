---
description: 列出、新增、重命名、删除或移动Draw.io文件页面。
agent: drawio-expert
---

加载drawio-skill。调用drawio_pages执行页面级管理：list查看页面，add新增页面，rename重命名，remove删除页面，move调整页面顺序。若文件已经通过drawio_open绑定，写入前必须先调用drawio_get_state并携带准确base_revision；完成写入后必须调用drawio_finalize更新PNG和内置浏览器。
