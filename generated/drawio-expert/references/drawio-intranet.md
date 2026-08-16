# Draw.io内置浏览器编辑

设置`DRAWIO_WEB_URL`指向可访问的Draw.io Web页面，默认使用`https://embed.diagrams.net`。Bridge只监听`127.0.0.1`。每次创建或修改成功后调用`drawio_finalize`自动校验并导出同名PNG；只有返回`shouldOpenBrowser=true`时才将`openUrl`交给MobileWork已有的`browser.open_url`打开，已有编辑器连接时禁止重复打开或刷新。浏览器保存会增加revision并写回原文件；Agent每次修改前必须立即调用`drawio_get_state`，只在最新XML上修改并携带准确`base_revision`提交。
