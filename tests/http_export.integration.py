import importlib.util
import os
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HELPER = (
    ROOT
    / "generated"
    / "drawio-expert"
    / ".opencode"
    / "skills"
    / "drawio-skill"
    / "scripts"
    / "http_export.py"
)
XML = """<mxfile host="test"><diagram id="p1" name="Page-1">
<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="n1" value="HTTP" vertex="1" parent="1">
<mxGeometry x="10" y="10" width="80" height="40" as="geometry"/>
</mxCell></root></mxGraphModel></diagram></mxfile>"""
PNG = b"\x89PNG\r\n\x1a\nmain-export-server-test"


class ExportHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("content-length", "0"))
        body = self.rfile.read(length)
        assert b"format=png" in body
        assert b"xml=" in body
        self.send_response(200)
        self.send_header("content-type", "image/png")
        self.send_header("content-length", str(len(PNG)))
        self.end_headers()
        self.wfile.write(PNG)

    def log_message(self, *_args):
        pass


def main():
    spec = importlib.util.spec_from_file_location("integrated_http_export", HELPER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    server = ThreadingHTTPServer(("127.0.0.1", 0), ExportHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    previous_url = os.environ.get("DRAWIO_EXPORT_URL")
    os.environ["DRAWIO_EXPORT_URL"] = (
        f"http://127.0.0.1:{server.server_port}/ImageExport4/export"
    )
    try:
        with tempfile.TemporaryDirectory(prefix="drawio-http-export-") as temp:
            source = Path(temp) / "diagram.drawio"
            target = Path(temp) / "diagram.png"
            source.write_text(XML, encoding="utf-8")
            result = module.export_file(source, target, format="png", scale=2)
            assert result["success"] is True, result
            assert target.read_bytes() == PNG
            print({"ok": True, "shared_service": True, "bytes": target.stat().st_size})
    finally:
        server.shutdown()
        server.server_close()
        if previous_url is None:
            os.environ.pop("DRAWIO_EXPORT_URL", None)
        else:
            os.environ["DRAWIO_EXPORT_URL"] = previous_url


if __name__ == "__main__":
    main()
