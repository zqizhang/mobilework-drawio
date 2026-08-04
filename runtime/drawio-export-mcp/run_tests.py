"""综合测试脚本：依次执行 health_check、validate、png/jpeg/pdf 导出"""
import json, os, sys, socket, tempfile, time
from pathlib import Path
from urllib.parse import urlparse

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from drawio_export_mcp.drawio_validation import validate_drawio_xml, get_diagram_info, DrawioValidationError
from drawio_export_mcp.export_client import ExportClient, ExportClientError
from drawio_export_mcp.path_security import get_default_workspace

# ---------------------------------------------------------------------------
EXPORT_URL = os.environ.get("DRAWIO_EXPORT_URL", "http://127.0.0.1:18765/ImageExport4/export")
REQUEST_TIMEOUT = float(os.environ.get("DRAWIO_REQUEST_TIMEOUT", "60"))
MAX_INPUT_SIZE_MB = float(os.environ.get("DRAWIO_MAX_INPUT_SIZE_MB", "20"))
MAX_OUTPUT_SIZE_MB = float(os.environ.get("DRAWIO_MAX_OUTPUT_SIZE_MB", "100"))

BASE_DIR = Path(__file__).parent
EXAMPLES_DIR = BASE_DIR / "examples"
# ---------------------------------------------------------------------------

SEP = "=" * 60

# ── 1. drawio_health_check (含 deep 模式) ──────────────────────────────
print(f"\n{SEP}")
print("1. drawio_health_check (普通模式 + deep 模式)")
print(f"{SEP}")

print(f"[CHECK] MCP Server 运行状态: OK (当前脚本直接在本地执行)")
print(f"[CHECK] Workspace 根目录: {BASE_DIR}")
print(f"        存在: {BASE_DIR.exists()}, 是否目录: {BASE_DIR.is_dir()}")

# 测试工作区可写
try:
    test_file = BASE_DIR / ".drawio_mcp_health_check_temp"
    test_file.write_text("health check", encoding="utf-8")
    test_file.unlink()
    print(f"[CHECK] 工作区可写: OK")
except Exception as e:
    print(f"[CHECK] 工作区可写: FAILED - {e}")

client = ExportClient(export_url=EXPORT_URL, timeout=REQUEST_TIMEOUT)

# 连通性检查
print(f"[CHECK] 导出服务地址: {EXPORT_URL}")
parsed = urlparse(EXPORT_URL)
host, port = parsed.hostname, parsed.port or 80

try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5.0)
    sock.connect((host, port))
    sock.close()
    server_reachable = True
    print(f"[CHECK] Export Server 连通性: OK (TCP {host}:{port} 可达)")
except Exception as e:
    server_reachable = False
    print(f"[CHECK] Export Server 连通性: FAILED - {e}")

print(f"[CHECK] 支持格式: {client.get_supported_formats()}")
print(f"[CHECK] 配置: timeout={client.timeout}s, max_input={MAX_INPUT_SIZE_MB}MB, max_output={MAX_OUTPUT_SIZE_MB}MB")

# Deep 检查
print(f"\n--- deep 模式 (完整导出测试) ---")
if server_reachable:
    minimal_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<mxfile host="health-check" version="1.0">'
        '<diagram id="hc1" name="HealthCheck">'
        '<mxGraphModel>'
        "<root>"
        '<mxCell id="0"/>'
        '<mxCell id="1" parent="0"/>'
        '<mxCell id="2" value="OK" style="rounded=1;" vertex="1" parent="1">'
        '<mxGeometry x="10" y="10" width="60" height="30" as="geometry"/>'
        "</mxCell>"
        "</root>"
        "</mxGraphModel>"
        "</diagram>"
        "</mxfile>"
    )
    try:
        data, ct = client.export(xml_content=minimal_xml, format="png", scale=1, border=0)
        is_valid_png = data.startswith(b"\x89PNG\r\n\x1a\n")
        if is_valid_png:
            print(f"deep 检查 PASSED — 导出服务器返回有效PNG, size={len(data)} bytes, content_type={ct}")
        else:
            print(f"deep 检查 FAILED — 不是有效PNG, content_type={ct}")
    except ExportClientError as e:
        print(f"deep 检查 FAILED — {e.error_code}: {e.message}")
else:
    print(f"deep 检查 SKIPPED — 导出服务器不可达")

# ── 2. drawio_validate ─────────────────────────────────────────────────
print(f"\n{SEP}")
print("2. drawio_validate — 校验 minimal.drawio")
print(f"{SEP}")

INPUT_FILE = EXAMPLES_DIR / "minimal.drawio"
try:
    info = get_diagram_info(INPUT_FILE)
    file_size = INPUT_FILE.stat().st_size
    print(f"[RESULT] 文件: {INPUT_FILE}")
    print(f"         大小: {file_size} bytes")
    print(f"         有效 drawio: True")
    print(f"         页数: {len(info)}")
    for page in info:
        print(f"         - 页面ID={page['id']}, 名称={page['name']}, 元素数={page['element_count']}")
except DrawioValidationError as e:
    print(f"[RESULT] 校验失败: {e.error_code}: {e.message}")
    print(f"[RESULT] 修复建议: {e.remediation}")
    sys.exit(1)

# ── 3. 导出 PNG (test-preview.png, 覆盖已有) ──────────────────────────
print(f"\n{SEP}")
print("3. 导出 PNG → test-preview.png (覆盖已有)")
print(f"{SEP}")

if not server_reachable:
    print("[SKIP] 导出服务器不可达，跳过后续导出测试")
    sys.exit(1)

xml_content = INPUT_FILE.read_text(encoding="utf-8")
PNG_OUTPUT = EXAMPLES_DIR / "test-preview.png"

# 先删旧文件
if PNG_OUTPUT.exists():
    PNG_OUTPUT.unlink()
    print(f"[INFO] 已删除旧文件: {PNG_OUTPUT}")

try:
    data, ct = client.export(xml_content=xml_content, format="png", scale=1, border=0)
    PNG_OUTPUT.write_bytes(data)
    print(f"[OK] PNG 导出成功: {PNG_OUTPUT} ({len(data)} bytes, {ct})")
except ExportClientError as e:
    print(f"[FAIL] PNG 导出失败: {e.error_code}: {e.message} | {e.remediation}")

# ── 4. 导出 JPEG 和 PDF ──────────────────────────────────────────────
print(f"\n{SEP}")
print("4. 导出 JPEG 和 PDF")
print(f"{SEP}")

JPEG_OUTPUT = EXAMPLES_DIR / "minimal.jpeg"
PDF_OUTPUT = EXAMPLES_DIR / "minimal.pdf"

# JPEG
try:
    data, ct = client.export(xml_content=xml_content, format="jpeg", scale=1, border=0)
    JPEG_OUTPUT.write_bytes(data)
    print(f"[OK] JPEG 导出成功: {JPEG_OUTPUT} ({len(data)} bytes, {ct})")
except ExportClientError as e:
    print(f"[FAIL] JPEG 导出失败: {e.error_code}: {e.message}")

# PDF
try:
    data, ct = client.export(xml_content=xml_content, format="pdf", scale=1, border=0)
    PDF_OUTPUT.write_bytes(data)
    print(f"[OK] PDF 导出成功:  {PDF_OUTPUT} ({len(data)} bytes, {ct})")
except ExportClientError as e:
    print(f"[FAIL] PDF 导出失败: {e.error_code}: {e.message}")

print(f"\n{SEP}")
print("全部测试完成")
print(f"{SEP}")

# 验证生成文件
for p in [PNG_OUTPUT, JPEG_OUTPUT, PDF_OUTPUT]:
    if p.exists():
        print(f"  {p.name}: {p.stat().st_size} bytes")
    else:
        print(f"  {p.name}: (不存在)")
