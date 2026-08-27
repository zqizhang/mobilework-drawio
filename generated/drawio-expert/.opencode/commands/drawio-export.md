---
description: 通过Docker Export Server或内置浏览器Bridge导出七种格式。
agent: drawio-expert
subtask: true
---

若当前会话已经绑定.drawio文件，本轮开始先并发调用drawio_list_annotations(file, status="pending")和drawio_get_state，检查待处理注释及最新revision/updatedBy。调用TypeScript运行时工具drawio_validate；通过后调用drawio_export。png、jpeg、pdf、xmlpng走Docker通道；svg、xmlsvg、html2走内置浏览器Bridge。编辑器通道返回editor_required时，立即用openwork_browser_open_url打开其openUrl，等待连接后以相同参数重试，不要把该状态报告为格式不支持。all_pages=true时：png、jpeg、xmlpng、svg、xmlsvg每页生成一个文件并返回outputs[]，必须核对page_count与outputs数量一致；pdf、html2返回一个包含全部页面的多页单文件，html2还需核对contains_all_pages=true。确认文件非空、类型有效并报告通道、输入、输出、格式、页数、字节数和警告。不得调用Draw.io Desktop。

用户要求：$ARGUMENTS
结合本次调用中可访问的图片、Draw.io 文件或其他附件；附件不可访问时明确要求用户重新附加。
