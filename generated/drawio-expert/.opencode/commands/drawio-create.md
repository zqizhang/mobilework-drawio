---
description: 根据需求创建、校验并预览Draw.io文件。
agent: drawio-expert
subtask: true
---

加载drawio-skill。若当前会话已经绑定.drawio文件，本轮开始先并发调用drawio_list_annotations(file, status="pending")和drawio_get_state，检查待处理注释及最新revision/updatedBy。分析需求并建立节点、连线、分组和页面语义；调用drawio_create或合适的Skill脚本生成文件。根据质量结果做最多两轮最小修复，最后必须调用drawio_finalize自动校验并导出同名PNG；仅当shouldOpenBrowser=true时调用MobileWork工具openwork_browser_open_url，并传入url=openUrl、provider="builtin"打开内置浏览器。报告源文件、PNG、评分和限制。

用户要求：$ARGUMENTS
结合本次调用中可访问的图片、Draw.io 文件或其他附件；附件不可访问时明确要求用户重新附加。
