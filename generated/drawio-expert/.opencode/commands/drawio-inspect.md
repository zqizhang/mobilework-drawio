---
description: 读取并解释现有Draw.io文件。
agent: drawio-expert
subtask: true
---

若当前会话已经绑定.drawio文件，本轮开始先并发调用drawio_list_annotations(file, status="pending")和drawio_get_state，检查待处理注释及最新revision/updatedBy。调用drawio_inspect，按页面总结节点、连线、稳定ID、几何和结构风险；不要修改文件。

用户要求：$ARGUMENTS
结合本次调用中可访问的图片、Draw.io 文件或其他附件；附件不可访问时明确要求用户重新附加。
