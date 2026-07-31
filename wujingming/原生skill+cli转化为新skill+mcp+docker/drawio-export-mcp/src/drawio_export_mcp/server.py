"""
Draw.io Export MCP Server.

Provides three tools:
- drawio_export: Export .drawio files to PNG/JPEG/PDF via remote export server
- drawio_validate: Validate .drawio XML structure and list pages
- drawio_health_check: Check MCP server and export server health
"""

import os
import tempfile
import shutil
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Load .env file if present
load_dotenv()

from .path_security import PathSecurity, PathSecurityError, get_default_workspace
from .drawio_validation import (
    validate_drawio_xml,
    get_diagram_info,
    DrawioValidationError,
)
from .export_client import ExportClient, ExportClientError

# ---------------------------------------------------------------------------
# FastMCP import — must come after env is loaded so config is available
# ---------------------------------------------------------------------------
from fastmcp import FastMCP

mcp = FastMCP(name="drawio-export-mcp")

# ---------------------------------------------------------------------------
# Configuration from environment variables
# ---------------------------------------------------------------------------
EXPORT_URL = os.environ.get(
    "DRAWIO_EXPORT_URL",
    "http://192.168.1.210:18765/ImageExport4/export",
)
WORKSPACE_ROOT = get_default_workspace()
REQUEST_TIMEOUT = float(os.environ.get("DRAWIO_REQUEST_TIMEOUT", "60"))
MAX_INPUT_SIZE_MB = float(os.environ.get("DRAWIO_MAX_INPUT_SIZE_MB", "20"))
MAX_OUTPUT_SIZE_MB = float(os.environ.get("DRAWIO_MAX_OUTPUT_SIZE_MB", "100"))

# Singleton instances — lazily initialized
_path_security: Optional[PathSecurity] = None
_export_client: Optional[ExportClient] = None


def _get_path_security() -> PathSecurity:
    global _path_security
    if _path_security is None:
        _path_security = PathSecurity(
            workspace_root=WORKSPACE_ROOT,
            max_input_size_mb=MAX_INPUT_SIZE_MB,
            max_output_size_mb=MAX_OUTPUT_SIZE_MB,
        )
    return _path_security


def _get_export_client() -> ExportClient:
    global _export_client
    if _export_client is None:
        _export_client = ExportClient(
            export_url=EXPORT_URL,
            timeout=REQUEST_TIMEOUT,
        )
    return _export_client


# ---------------------------------------------------------------------------
# Error response helper
# ---------------------------------------------------------------------------
def _error(
    error_code: str, message: str, remediation: str, **extra
) -> dict:
    result = {
        "success": False,
        "error_code": error_code,
        "message": message,
        "remediation": remediation,
    }
    result.update(extra)
    return result


# ---------------------------------------------------------------------------
# MCP Tool: drawio_export
# ---------------------------------------------------------------------------
@mcp.tool
def drawio_export(
    input_path: str,
    format: str,
    output_path: Optional[str] = None,
    page_id: Optional[str] = None,
    all_pages: bool = False,
    scale: float = 1,
    border: int = 0,
    background: Optional[str] = None,
    embed_xml: bool = False,
    overwrite: bool = False,
) -> dict:
    """Export a .drawio file to PNG, JPEG, or PDF via a remote Draw.io Export Server.

    Reads the .drawio file from the local workspace, sends its XML content
    to the export server over HTTP, and saves the returned binary image/PDF
    back to the local workspace.

    Args:
        input_path: Absolute or relative path to the local .drawio file.
        format: Output format — must be one of: png, jpeg, pdf.
        output_path: Optional output path. Auto-generated from input_path + format suffix when omitted.
        page_id: Export a specific diagram page by its ID.
        all_pages: Export all pages (overrides page_id).
        scale: Scale factor, default 1.
        border: Border width in pixels, default 0.
        background: Background color, e.g. "#ffffff".
        embed_xml: Embed source XML in output (only supported by some formats).
        overwrite: Allow overwriting an existing output file. Default false.
    """
    ps = _get_path_security()
    client = _get_export_client()
    warnings = []

    # ---- 1. Validate format ----
    format = format.lower().strip()
    if format not in client.SUPPORTED_FORMATS:
        return _error(
            error_code="UNSUPPORTED_FORMAT",
            message=f"Unsupported format '{format}'. Supported: {', '.join(sorted(client.SUPPORTED_FORMATS))}",
            remediation="Use one of: png, jpeg, pdf.",
        )

    # ---- 2. Resolve and validate input path ----
    try:
        resolved_input = ps.resolve_input_path(input_path)
    except PathSecurityError as e:
        return _error(e.error_code, e.message, e.remediation)

    # ---- 3. Validate Draw.io XML ----
    try:
        validate_drawio_xml(resolved_input)
    except DrawioValidationError as e:
        return _error(e.error_code, e.message, e.remediation)

    # ---- 4. Resolve output path ----
    try:
        resolved_output = ps.resolve_output_path(
            output_path, resolved_input, format, overwrite=overwrite
        )
    except PathSecurityError as e:
        return _error(e.error_code, e.message, e.remediation)

    # ---- 5. Read XML content ----
    try:
        xml_content = resolved_input.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        return _error(
            error_code="INPUT_NOT_FOUND",
            message=f"Cannot read input file: {e}",
            remediation="Ensure the file is a UTF-8 encoded XML document.",
        )

    # ---- 6. Send to export server ----
    try:
        binary_data, content_type = client.export(
            xml_content=xml_content,
            format=format,
            page_id=page_id,
            all_pages=all_pages,
            scale=scale,
            border=border,
            background=background,
            embed_xml=embed_xml,
        )
    except ExportClientError as e:
        return _error(e.error_code, e.message, e.remediation)

    # ---- 7. Check output size ----
    try:
        ps.check_output_size(len(binary_data))
    except PathSecurityError as e:
        return _error(e.error_code, e.message, e.remediation)

    # ---- 8. Write to temp file, then atomic move ----
    try:
        # Create temp file in the same directory as the target
        tmp_fd, tmp_path = tempfile.mkstemp(
            dir=str(resolved_output.parent),
            prefix=f".{resolved_output.stem}_",
            suffix=f".{format}",
        )
        try:
            with os.fdopen(tmp_fd, "wb") as f:
                f.write(binary_data)
            # Atomic replace on same filesystem
            os.replace(tmp_path, str(resolved_output))
        except Exception:
            # Clean up temp file on failure
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise
    except OSError as e:
        return _error(
            error_code="OUTPUT_WRITE_FAILED",
            message=f"Failed to write output file: {e}",
            remediation="Check disk space and directory write permissions.",
        )

    # ---- 9. Return success ----
    return {
        "success": True,
        "input_path": str(resolved_input),
        "output_path": str(resolved_output),
        "format": format,
        "size_bytes": len(binary_data),
        "content_type": content_type,
        "warnings": warnings,
    }


# ---------------------------------------------------------------------------
# MCP Tool: drawio_validate
# ---------------------------------------------------------------------------
@mcp.tool
def drawio_validate(input_path: str) -> dict:
    """Validate a .drawio file without exporting it.

    Checks that the file exists, is readable, contains valid XML,
    and is a recognizable Draw.io document. Returns page/diagram
    information.

    Args:
        input_path: Absolute or relative path to the local .drawio file.
    """
    ps = _get_path_security()

    # ---- Resolve and validate path ----
    try:
        resolved = ps.resolve_input_path(input_path)
    except PathSecurityError as e:
        return _error(e.error_code, e.message, e.remediation)

    # ---- Validate XML structure ----
    try:
        diagram_info = get_diagram_info(resolved)
    except DrawioValidationError as e:
        return _error(e.error_code, e.message, e.remediation)

    # ---- File info ----
    file_stat = resolved.stat()

    return {
        "success": True,
        "input_path": str(resolved),
        "file_size_bytes": file_stat.st_size,
        "is_valid_drawio": True,
        "page_count": len(diagram_info),
        "pages": diagram_info,
    }


# ---------------------------------------------------------------------------
# MCP Tool: drawio_health_check
# ---------------------------------------------------------------------------
@mcp.tool
def drawio_health_check(deep: bool = False) -> dict:
    """Check the health of the MCP server and the remote Export Server.

    Performs connectivity and configuration checks. When deep=true, performs
    a full end-to-end test by exporting a built-in minimal diagram to a
    temporary PNG, verifies the result, and cleans up.

    Args:
        deep: If true, run a full export test with a minimal diagram. Default false.
    """
    ps = _get_path_security()
    client = _get_export_client()

    result = {
        "success": True,
        "checks": {},
    }

    # ---- Check 1: MCP server is running ----
    result["checks"]["mcp_server"] = {
        "status": "ok",
        "message": "MCP server is running.",
    }

    # ---- Check 2: Workspace is read-writable ----
    ws_root = ps.get_workspace_root()
    ws_check = {
        "workspace_root": str(ws_root),
        "exists": ws_root.exists(),
        "is_directory": ws_root.is_dir(),
    }
    # Test write by creating and deleting a temp file
    try:
        test_file = ws_root / ".drawio_mcp_health_check_temp"
        test_file.write_text("health check", encoding="utf-8")
        test_file.unlink()
        ws_check["writable"] = True
        ws_check["status"] = "ok"
    except Exception as e:
        ws_check["writable"] = False
        ws_check["status"] = "error"
        ws_check["error"] = str(e)
        result["success"] = False

    result["checks"]["workspace"] = ws_check

    # ---- Check 3: Export server connectivity ----
    connectivity = client.check_connectivity()
    result["checks"]["export_server"] = connectivity
    if not connectivity.get("reachable"):
        result["success"] = False

    # ---- Check 4: Supported formats ----
    result["checks"]["supported_formats"] = client.get_supported_formats()

    # ---- Check 5: Configuration ----
    result["checks"]["configuration"] = {
        "export_url": client.export_url,
        "timeout_seconds": client.timeout,
        "max_input_size_mb": MAX_INPUT_SIZE_MB,
        "max_output_size_mb": MAX_OUTPUT_SIZE_MB,
    }

    # ---- Deep check: full export test ----
    if deep and connectivity.get("reachable"):
        deep_result = _run_deep_health_check(client, ps)
        result["checks"]["deep_test"] = deep_result
        if not deep_result.get("success"):
            result["success"] = False
    elif deep and not connectivity.get("reachable"):
        result["checks"]["deep_test"] = {
            "success": False,
            "message": "Skipped — export server is not reachable.",
        }
        result["success"] = False

    return result


def _run_deep_health_check(client: ExportClient, ps: PathSecurity) -> dict:
    """Run a full end-to-end export test with a minimal built-in diagram."""
    minimal_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<mxfile host="health-check" version="1.0">'
        '<diagram id="hc1" name="HealthCheck">'
        '<mxGraphModel>'
        "<root>"
        '<mxCell id="0"/>'
        '<mxCell id="1" parent="0"/>'
        '<mxCell id="2" value="OK" '
        'style="rounded=1;" vertex="1" parent="1">'
        '<mxGeometry x="10" y="10" width="60" height="30" as="geometry"/>'
        "</mxCell>"
        "</root>"
        "</mxGraphModel>"
        "</diagram>"
        "</mxfile>"
    )

    try:
        # Export to PNG
        binary_data, content_type = client.export(
            xml_content=minimal_xml,
            format="png",
            scale=1,
            border=0,
        )

        # Verify PNG header
        is_valid_png = binary_data.startswith(b"\x89PNG\r\n\x1a\n")

        if is_valid_png and len(binary_data) > 100:
            return {
                "success": True,
                "message": "Deep health check passed — export server returned a valid PNG.",
                "format": "png",
                "content_type": content_type,
                "size_bytes": len(binary_data),
            }
        else:
            return {
                "success": False,
                "message": "Deep health check failed — response is not a valid PNG.",
                "content_type": content_type,
                "size_bytes": len(binary_data),
                "starts_with_png_header": is_valid_png,
            }
    except ExportClientError as e:
        return {
            "success": False,
            "message": f"Deep health check failed: {e.message}",
            "error_code": e.error_code,
        }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    """Entry point for the MCP server.

    Runs with stdio transport. Use:
        uv run drawio-export-mcp
        or
        python -m drawio_export_mcp.server
    """
    mcp.run()


if __name__ == "__main__":
    main()
