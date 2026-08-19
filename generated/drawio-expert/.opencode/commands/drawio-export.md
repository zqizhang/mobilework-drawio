---
description: 通过Docker Export Server或内置浏览器Bridge导出七种格式。
agent: drawio-expert
---

调用TypeScript运行时工具drawio_validate；通过后调用drawio_export。png、jpeg、pdf、xmlpng走Docker通道；svg、xmlsvg、html2走内置浏览器Bridge。编辑器通道返回editor_required时，立即用browser.open_url打开其openUrl，等待连接后以相同参数重试，不要把该状态报告为格式不支持。all_pages=true时：png、jpeg、xmlpng、svg、xmlsvg每页生成一个文件并返回outputs[]，必须核对page_count与outputs数量一致；pdf、html2返回一个包含全部页面的多页单文件，html2还需核对contains_all_pages=true。确认文件非空、类型有效并报告通道、输入、输出、格式、页数、字节数和警告。不得调用Draw.io Desktop。
