"""
Export client module.

Handles HTTP communication with the remote Draw.io Export Server.
Sends XML content (not file paths) and receives binary export results.
"""

import os
from typing import Optional, Tuple

import httpx


class ExportClientError(Exception):
    """Raised when communication with the export server fails."""

    def __init__(self, error_code: str, message: str, remediation: str):
        self.error_code = error_code
        self.message = message
        self.remediation = remediation
        super().__init__(message)


class ExportClient:
    """HTTP client for the Draw.io ImageExport4/export endpoint."""

    SUPPORTED_FORMATS = {"png", "jpeg", "pdf"}

    CONTENT_TYPE_MAP = {
        "png": "image/png",
        "jpeg": "image/jpeg",
        "pdf": "application/pdf",
    }

    PNG_HEADER = b"\x89PNG\r\n\x1a\n"
    JPEG_HEADER = b"\xff\xd8\xff"
    PDF_HEADER = b"%PDF-"

    def __init__(
        self,
        export_url: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self.export_url = (
            export_url
            or os.environ.get(
                "DRAWIO_EXPORT_URL",
                "http://192.168.1.210:18765/ImageExport4/export",
            )
        )
        self.timeout = timeout or float(
            os.environ.get("DRAWIO_REQUEST_TIMEOUT", "60")
        )

    def get_supported_formats(self) -> list:
        """Return the list of supported export formats."""
        return sorted(self.SUPPORTED_FORMATS)

    def check_connectivity(self) -> dict:
        """Quick check if the export server is reachable.

        Returns a dict with status information.
        Does NOT send any XML data.
        """
        result = {
            "url": self.export_url,
            "reachable": False,
            "timeout_seconds": self.timeout,
            "supported_formats": self.get_supported_formats(),
        }

        # Parse host and port from URL
        try:
            from urllib.parse import urlparse

            parsed = urlparse(self.export_url)
            host = parsed.hostname
            port = parsed.port or 80
            scheme = parsed.scheme
        except Exception as e:
            result["error"] = f"Cannot parse export URL: {e}"
            return result

        # Try TCP connection first (fast check)
        import socket

        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(min(5.0, self.timeout))
            sock.connect((host, port))
            sock.close()
            result["reachable"] = True
        except socket.timeout:
            result["error"] = f"Connection timed out connecting to {host}:{port}"
        except ConnectionRefusedError:
            result["error"] = f"Connection refused at {host}:{port}"
        except socket.gaierror:
            result["error"] = f"Hostname resolution failed: {host}"
        except OSError as e:
            result["error"] = f"Network error: {e}"

        return result

    def export(
        self,
        xml_content: str,
        format: str,
        page_id: Optional[str] = None,
        all_pages: bool = False,
        scale: float = 1,
        border: int = 0,
        background: Optional[str] = None,
        embed_xml: bool = False,
    ) -> Tuple[bytes, str]:
        """Export a Draw.io diagram by sending XML to the export server.

        Args:
            xml_content: The raw XML content of the .drawio file.
            format: Output format (png, jpeg, pdf).
            page_id: Optional specific page ID to export.
            all_pages: Export all pages (overrides page_id).
            scale: Scale factor (default 1).
            border: Border width in pixels (default 0).
            background: Optional background color (e.g. "#ffffff").
            embed_xml: Embed source XML in the output (only supported by some formats).

        Returns:
            Tuple of (binary_content, content_type_string).

        Raises:
            ExportClientError on any communication or response error.
        """
        if format not in self.SUPPORTED_FORMATS:
            raise ExportClientError(
                error_code="UNSUPPORTED_FORMAT",
                message=f"Unsupported format '{format}'. "
                f"Supported: {', '.join(sorted(self.SUPPORTED_FORMATS))}",
                remediation="Use one of the supported formats: png, jpeg, pdf.",
            )

        # Build form data — send XML content, NOT file path
        form_data = {
            "format": format,
            "xml": xml_content,
        }

        if page_id and not all_pages:
            form_data["pageId"] = page_id

        if all_pages:
            form_data["allPages"] = "1"

        if scale != 1:
            form_data["scale"] = str(scale)

        if border != 0:
            form_data["border"] = str(border)

        if background:
            form_data["bg"] = background

        if embed_xml:
            form_data["embedXml"] = "1"

        try:
            response = httpx.post(
                self.export_url,
                data=form_data,
                timeout=self.timeout,
                follow_redirects=True,
            )
        except httpx.ConnectError as e:
            raise ExportClientError(
                error_code="EXPORT_SERVER_UNREACHABLE",
                message=f"Cannot connect to export server: {self.export_url}",
                remediation=(
                    "Verify the export server is running and accessible at "
                    f"{self.export_url}. Check network connectivity."
                ),
            ) from e
        except httpx.ReadTimeout as e:
            raise ExportClientError(
                error_code="EXPORT_SERVER_TIMEOUT",
                message=(
                    f"Export server did not respond within {self.timeout} seconds"
                ),
                remediation=(
                    "Increase DRAWIO_REQUEST_TIMEOUT or simplify the diagram."
                ),
            ) from e
        except httpx.WriteTimeout as e:
            raise ExportClientError(
                error_code="EXPORT_SERVER_TIMEOUT",
                message="Request sending timed out",
                remediation="Check network conditions and try again.",
            ) from e
        except httpx.RequestError as e:
            raise ExportClientError(
                error_code="EXPORT_SERVER_UNREACHABLE",
                message=f"Network error communicating with export server: {e}",
                remediation="Check network connectivity to the export server.",
            ) from e

        # Check HTTP status
        if response.status_code != 200:
            # Try to extract error details from response body
            detail = ""
            try:
                body_text = response.text[:500]
                if body_text.strip():
                    detail = f" Response body: {body_text}"
            except Exception:
                pass

            raise ExportClientError(
                error_code="EXPORT_SERVER_ERROR",
                message=(
                    f"Export server returned HTTP {response.status_code}"
                    f"{detail}"
                ),
                remediation=(
                    "Check the export server logs. Verify the XML content "
                    "is valid and the format is supported by the server."
                ),
            )

        # Check content-type
        content_type = response.headers.get("content-type", "").lower()
        expected_type = self.CONTENT_TYPE_MAP.get(format, "")

        if not content_type:
            raise ExportClientError(
                error_code="INVALID_EXPORT_RESPONSE",
                message="Export server returned no Content-Type header",
                remediation="Check the export server configuration.",
            )

        # Validate content matches expected type
        content = response.content

        if not content:
            raise ExportClientError(
                error_code="INVALID_EXPORT_RESPONSE",
                message="Export server returned empty response body",
                remediation="The diagram may be empty or the export server encountered an error.",
            )

        # Validate magic bytes
        self._validate_magic_bytes(content, format, content_type)

        return content, content_type

    def _validate_magic_bytes(
        self, content: bytes, format: str, content_type: str
    ) -> None:
        """Validate that binary content matches the expected format."""
        if format == "png":
            if not content.startswith(self.PNG_HEADER):
                raise ExportClientError(
                    error_code="INVALID_EXPORT_RESPONSE",
                    message=(
                        f"Response does not appear to be a valid PNG image. "
                        f"Content-Type: {content_type}"
                    ),
                    remediation="The export server may have returned an error page instead of an image.",
                )
        elif format == "jpeg":
            if not content.startswith(self.JPEG_HEADER):
                raise ExportClientError(
                    error_code="INVALID_EXPORT_RESPONSE",
                    message=(
                        f"Response does not appear to be a valid JPEG image. "
                        f"Content-Type: {content_type}"
                    ),
                    remediation="The export server may have returned an error page instead of an image.",
                )
        elif format == "pdf":
            if not content.startswith(self.PDF_HEADER):
                raise ExportClientError(
                    error_code="INVALID_EXPORT_RESPONSE",
                    message=(
                        f"Response does not appear to be a valid PDF document. "
                        f"Content-Type: {content_type}"
                    ),
                    remediation="The export server may have returned an error page instead of a PDF.",
                )
