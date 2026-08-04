from pathlib import Path

from drawio_export_mcp.path_security import PathSecurity
from drawio_export_mcp.service import export_drawio_file


MINIMAL_XML = """<mxfile host="test"><diagram id="p1" name="Page-1">
<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="n1" value="A" vertex="1" parent="1">
<mxGeometry x="10" y="10" width="80" height="40" as="geometry"/>
</mxCell></root></mxGraphModel></diagram></mxfile>"""


class FakeExportClient:
    SUPPORTED_FORMATS = {"png", "jpeg", "pdf"}

    def __init__(self):
        self.calls = []

    def export(self, **kwargs):
        self.calls.append(kwargs)
        return b"\x89PNG\r\n\x1a\nunit-test", "image/png"


def test_shared_service_exports_and_writes_atomically(tmp_path: Path):
    source = tmp_path / "diagram.drawio"
    target = tmp_path / "diagram.png"
    source.write_text(MINIMAL_XML, encoding="utf-8")
    client = FakeExportClient()

    result = export_drawio_file(
        str(source),
        "png",
        path_security=PathSecurity(tmp_path),
        export_client=client,
        output_path=str(target),
        page_id="p1",
        scale=2,
    )

    assert result["success"] is True
    assert target.read_bytes().startswith(b"\x89PNG")
    assert client.calls[0]["page_id"] == "p1"
    assert client.calls[0]["scale"] == 2


def test_shared_service_rejects_unsupported_format(tmp_path: Path):
    source = tmp_path / "diagram.drawio"
    source.write_text(MINIMAL_XML, encoding="utf-8")

    result = export_drawio_file(
        str(source),
        "svg",
        path_security=PathSecurity(tmp_path),
        export_client=FakeExportClient(),
    )

    assert result["success"] is False
    assert result["error_code"] == "UNSUPPORTED_FORMAT"
