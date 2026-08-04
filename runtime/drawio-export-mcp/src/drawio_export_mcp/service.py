"""Shared file-export service used by the MCP tools and bundled Skill scripts."""

import os
import tempfile
from pathlib import Path
from typing import Optional

from .drawio_validation import DrawioValidationError, validate_drawio_xml
from .export_client import ExportClient, ExportClientError
from .path_security import PathSecurity, PathSecurityError


def error_response(error_code: str, message: str, remediation: str, **extra) -> dict:
    result = {
        "success": False,
        "error_code": error_code,
        "message": message,
        "remediation": remediation,
    }
    result.update(extra)
    return result


def export_drawio_file(
    input_path: str,
    format: str,
    *,
    path_security: PathSecurity,
    export_client: ExportClient,
    output_path: Optional[str] = None,
    page_id: Optional[str] = None,
    all_pages: bool = False,
    scale: float = 1,
    border: int = 0,
    background: Optional[str] = None,
    embed_xml: bool = False,
    overwrite: bool = False,
) -> dict:
    """Validate, export, size-check, and atomically write one Draw.io file."""
    export_format = format.lower().strip()
    if export_format not in export_client.SUPPORTED_FORMATS:
        return error_response(
            "UNSUPPORTED_FORMAT",
            f"Unsupported format '{export_format}'. Supported: "
            f"{', '.join(sorted(export_client.SUPPORTED_FORMATS))}",
            "Use one of: png, jpeg, pdf.",
        )

    try:
        resolved_input = path_security.resolve_input_path(input_path)
        validate_drawio_xml(resolved_input)
        resolved_output = path_security.resolve_output_path(
            output_path,
            resolved_input,
            export_format,
            overwrite=overwrite,
        )
    except (PathSecurityError, DrawioValidationError) as exc:
        return error_response(exc.error_code, exc.message, exc.remediation)

    try:
        xml_content = resolved_input.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        return error_response(
            "INPUT_NOT_FOUND",
            f"Cannot read input file: {exc}",
            "Ensure the file is a UTF-8 encoded XML document.",
        )

    try:
        binary_data, content_type = export_client.export(
            xml_content=xml_content,
            format=export_format,
            page_id=page_id,
            all_pages=all_pages,
            scale=scale,
            border=border,
            background=background,
            embed_xml=embed_xml,
        )
        path_security.check_output_size(len(binary_data))
    except (ExportClientError, PathSecurityError) as exc:
        return error_response(exc.error_code, exc.message, exc.remediation)

    try:
        _atomic_write(resolved_output, binary_data, export_format)
    except OSError as exc:
        return error_response(
            "OUTPUT_WRITE_FAILED",
            f"Failed to write output file: {exc}",
            "Check disk space and directory write permissions.",
        )

    return {
        "success": True,
        "input_path": str(resolved_input),
        "output_path": str(resolved_output),
        "format": export_format,
        "size_bytes": len(binary_data),
        "content_type": content_type,
        "warnings": [],
    }


def _atomic_write(output_path: Path, data: bytes, suffix: str) -> None:
    descriptor, temporary_path = tempfile.mkstemp(
        dir=str(output_path.parent),
        prefix=f".{output_path.stem}_",
        suffix=f".{suffix}",
    )
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(data)
        os.replace(temporary_path, str(output_path))
    except Exception:
        try:
            os.unlink(temporary_path)
        except OSError:
            pass
        raise
