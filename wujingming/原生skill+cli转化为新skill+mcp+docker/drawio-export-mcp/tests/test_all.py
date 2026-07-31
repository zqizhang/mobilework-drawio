"""
Test suite for Draw.io Export MCP Server.

Covers:
1. Path security (traversal, missing files, workspace boundaries)
2. XML validation (valid/invalid)
3. Export client (connectivity, format validation)
4. MCP tools (direct function calls)
5. Health checks

Run: python tests/test_all.py
"""

import os
import sys
import json
import tempfile
from pathlib import Path

# Fix encoding on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# Add project to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from drawio_export_mcp.path_security import PathSecurity, PathSecurityError, get_default_workspace
from drawio_export_mcp.drawio_validation import validate_drawio_xml, get_diagram_info, DrawioValidationError
from drawio_export_mcp.export_client import ExportClient, ExportClientError

TESTS_PASSED = 0
TESTS_FAILED = 0
TEST_NUM = 0

EXAMPLES_DIR = Path(__file__).resolve().parent.parent / "examples"
MINIMAL_DRAWIO = EXAMPLES_DIR / "minimal.drawio"


def test(name):
    global TEST_NUM
    TEST_NUM += 1
    print(f"\n{'='*60}")
    print(f"Test {TEST_NUM}: {name}")
    print(f"{'='*60}")


def ok(msg=""):
    global TESTS_PASSED
    TESTS_PASSED += 1
    suffix = f" — {msg}" if msg else ""
    print(f"  ✅ PASS{suffix}")


def fail(msg=""):
    global TESTS_FAILED
    TESTS_FAILED += 1
    suffix = f" — {msg}" if msg else ""
    print(f"  ❌ FAIL{suffix}")


def assert_true(cond, msg=""):
    if cond:
        ok(msg)
    else:
        fail(msg)


def assert_raises(exc_type, fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
        fail(f"Expected {exc_type.__name__} but no exception raised")
    except exc_type as e:
        ok(f"Caught {exc_type.__name__}: {e}")
    except Exception as e:
        fail(f"Expected {exc_type.__name__} but got {type(e).__name__}: {e}")


def section(text):
    print(f"\n{'─'*50}")
    print(f"  {text}")
    print(f"{'─'*50}")


# ============================================================================
# Tests
# ============================================================================

def run_tests():
    global TESTS_PASSED, TESTS_FAILED

    # ---- Setup ----
    ws_root = Path(__file__).resolve().parent.parent  # drawio-export-mcp/
    ps = PathSecurity(workspace_root=ws_root)
    client = ExportClient()

    section("Path Security Tests")

    # Test 1: Valid input path
    test("Valid input path")
    resolved = ps.resolve_input_path(str(MINIMAL_DRAWIO))
    assert_true(resolved.is_file(), f"Resolved to {resolved}")

    # Test 2: Non-existent input file
    test("Non-existent input file")
    assert_raises(PathSecurityError, ps.resolve_input_path, "nonexistent.drawio")

    # Test 3: Path traversal attempt (../ escape)
    test("Path traversal attempt")
    assert_raises(PathSecurityError, ps.resolve_input_path, "../etc/passwd")

    # Test 4: Path traversal with .. inside path
    test("Path traversal with nested ..")
    # This should be caught because the resolved path will be outside workspace
    traversal = str(ws_root / ".." / "outside" / "file.drawio")
    assert_raises(PathSecurityError, ps.resolve_input_path, traversal)

    # Test 5: Output extension mismatch
    test("Output extension mismatch")
    assert_raises(
        PathSecurityError,
        ps.resolve_output_path,
        str(ws_root / "out.pdf"),
        MINIMAL_DRAWIO,
        "png",
    )

    # Test 6: Valid output path derivation
    test("Auto-generated output path")
    out = ps.resolve_output_path(None, MINIMAL_DRAWIO, "png")
    assert_true(str(out).endswith(".png"), f"Output: {out}")

    # Test 7: Attempt to write output outside workspace
    test("Output outside workspace")
    assert_raises(
        PathSecurityError,
        ps.resolve_output_path,
        "C:/Windows/out.png",
        MINIMAL_DRAWIO,
        "png",
    )

    section("Draw.io XML Validation Tests")

    # Test 8: Valid Draw.io file
    test("Valid Draw.io XML")
    tree = validate_drawio_xml(MINIMAL_DRAWIO)
    assert_true(tree is not None, "Parsed XML tree returned")

    # Test 9: Get diagram info from valid file
    test("Get diagram info")
    info = get_diagram_info(MINIMAL_DRAWIO)
    assert_true(len(info) > 0, f"Found {len(info)} page(s)")
    for page in info:
        print(f"    Page: id={page['id']}, name={page['name']}, elements={page['element_count']}")

    # Test 10: Invalid XML (not XML at all)
    test("Invalid XML file")
    bad_file = ws_root / "bad.xml"
    bad_file.write_text("This is not XML at all!!!", encoding="utf-8")
    try:
        assert_raises(DrawioValidationError, validate_drawio_xml, bad_file)
    finally:
        bad_file.unlink()

    # Test 11: Valid XML but not Draw.io
    test("Valid XML but wrong root element")
    wrong_file = ws_root / "wrong.xml"
    wrong_file.write_text('<?xml version="1.0"?><html><body>Hello</body></html>', encoding="utf-8")
    try:
        assert_raises(DrawioValidationError, validate_drawio_xml, wrong_file)
    finally:
        wrong_file.unlink()

    # Test 12: mxfile without diagrams
    test("mxfile without diagram elements")
    empty_file = ws_root / "empty.xml"
    empty_file.write_text('<?xml version="1.0"?><mxfile host="test" version="1.0"></mxfile>', encoding="utf-8")
    try:
        assert_raises(DrawioValidationError, validate_drawio_xml, empty_file)
    finally:
        empty_file.unlink()

    section("Export Client Tests")

    # Test 13: Supported formats
    test("Supported formats check")
    formats = client.get_supported_formats()
    assert_true("png" in formats, f"Formats: {formats}")
    assert_true("jpeg" in formats)
    assert_true("pdf" in formats)

    # Test 14: Unsupported format
    test("Unsupported format rejection")
    assert_raises(
        ExportClientError,
        client.export,
        "<mxfile></mxfile>",
        "gif",
    )

    # Test 15: Connectivity check
    test("Export server connectivity check")
    connectivity = client.check_connectivity()
    print(f"    URL: {connectivity['url']}")
    print(f"    Reachable: {connectivity['reachable']}")
    if not connectivity.get("reachable"):
        print(f"    Error: {connectivity.get('error', 'unknown')}")
    # This doesn't fail the test — just reports status

    # Test 16: Content type map
    test("Content type mappings")
    assert_true(client.CONTENT_TYPE_MAP["png"] == "image/png")
    assert_true(client.CONTENT_TYPE_MAP["jpeg"] == "image/jpeg")
    assert_true(client.CONTENT_TYPE_MAP["pdf"] == "application/pdf")

    section("MCP Tool Integration Tests")
    # These test the actual tool functions directly (not via MCP protocol)

    from drawio_export_mcp.server import (
        drawio_export,
        drawio_validate,
        drawio_health_check,
    )

    # Test 17: drawio_validate with valid file
    test("drawio_validate with valid .drawio file")
    result = drawio_validate(str(MINIMAL_DRAWIO))
    print(f"    Result: success={result.get('success')}, pages={result.get('page_count')}")
    assert_true(result.get("success"), f"Validation succeeded")
    assert_true(result.get("page_count", 0) > 0)
    assert_true(result.get("is_valid_drawio"))

    # Test 18: drawio_validate with non-existent file
    test("drawio_validate with non-existent file")
    result = drawio_validate("nonexistent.drawio")
    assert_true(not result.get("success"))
    assert_true(result.get("error_code") == "INPUT_NOT_FOUND")
    print(f"    Error: {result.get('error_code')} — {result.get('message')[:80]}")

    # Test 19: drawio_export with unsupported format
    test("drawio_export with unsupported format")
    result = drawio_export(str(MINIMAL_DRAWIO), format="gif")
    assert_true(not result.get("success"))
    assert_true(result.get("error_code") == "UNSUPPORTED_FORMAT")

    # Test 20: drawio_export with non-existent file
    test("drawio_export with non-existent file")
    result = drawio_export("nonexistent.drawio", format="png")
    assert_true(not result.get("success"))
    assert_true(result.get("error_code") == "INPUT_NOT_FOUND")

    # Test 21: drawio_export with invalid output extension
    test("drawio_export with invalid output extension")
    result = drawio_export(
        str(MINIMAL_DRAWIO),
        format="png",
        output_path=str(ws_root / "output.pdf"),  # .pdf != png
    )
    assert_true(not result.get("success"))
    assert_true(result.get("error_code") == "INVALID_OUTPUT_EXTENSION")

    # Test 22: drawio_health_check (basic)
    test("drawio_health_check (basic)")
    result = drawio_health_check(deep=False)
    print(f"    Success: {result.get('success')}")
    checks = result.get("checks", {})
    # Check workspace
    ws = checks.get("workspace", {})
    print(f"    Workspace writable: {ws.get('writable')}")
    assert_true("workspace" in checks)
    # Check export server connectivity (may fail but shouldn't crash)
    es = checks.get("export_server", {})
    print(f"    Export server reachable: {es.get('reachable')}")
    assert_true("export_server" in checks)
    # Check supported formats
    assert_true("supported_formats" in checks)
    # Check configuration
    assert_true("configuration" in checks)

    # Test 23: drawio_health_check (deep) — may fail if server unreachable
    test("drawio_health_check (deep)")
    result = drawio_health_check(deep=True)
    print(f"    Success: {result.get('success')}")
    dt = result.get("checks", {}).get("deep_test", {})
    if dt:
        print(f"    Deep test: {dt.get('success')}, message: {dt.get('message', '')[:100]}")
    # Should not crash regardless

    # Test 24: Invalid XML
    test("drawio_validate with invalid XML")
    invalid_xml = ws_root / "invalid.drawio"
    invalid_xml.write_text("not xml <<< >>>", encoding="utf-8")
    try:
        result = drawio_validate(str(invalid_xml))
        assert_true(not result.get("success"))
        assert_true(result.get("error_code") == "INVALID_DRAWIO_XML")
        print(f"    Error: {result.get('error_code')} — {result.get('message')[:80]}")
    finally:
        invalid_xml.unlink()

    # ========================================================================
    # Summary
    # ========================================================================
    print(f"\n{'='*60}")
    print(f"  RESULTS SUMMARY")
    print(f"{'='*60}")
    print(f"  Passed: {TESTS_PASSED}")
    print(f"  Failed: {TESTS_FAILED}")
    print(f"  Total:  {TESTS_PASSED + TESTS_FAILED}")

    if TESTS_FAILED == 0:
        print(f"\n  ✅ ALL TESTS PASSED!")
    else:
        print(f"\n  ❌ {TESTS_FAILED} TEST(S) FAILED!")

    return TESTS_FAILED


if __name__ == "__main__":
    failed = run_tests()
    sys.exit(0 if failed == 0 else 1)
