"""
Path security module.

Ensures all file reads and writes stay within the allowed workspace root.
Blocks path traversal, symlink escapes, and enforces size limits.
"""

import os
from pathlib import Path
from typing import Optional, Tuple


class PathSecurityError(Exception):
    """Raised when a path fails security checks."""

    def __init__(self, error_code: str, message: str, remediation: str):
        self.error_code = error_code
        self.message = message
        self.remediation = remediation
        super().__init__(message)


class PathSecurity:
    """Validates file paths against workspace boundaries and size limits."""

    def __init__(
        self,
        workspace_root: Path,
        max_input_size_mb: float = 20,
        max_output_size_mb: float = 100,
    ):
        self.workspace_root = workspace_root.resolve(strict=False)
        if not self.workspace_root.is_dir():
            raise ValueError(
                f"Workspace root does not exist or is not a directory: "
                f"{self.workspace_root}"
            )
        self.max_input_size = int(max_input_size_mb * 1024 * 1024)
        self.max_output_size = int(max_output_size_mb * 1024 * 1024)

    def resolve_input_path(self, input_path: str) -> Path:
        """Resolve and validate an input path.

        Checks:
        - File exists
        - File is readable
        - Resolved path is within workspace root (no path traversal / symlink escape)
        - File size does not exceed max_input_size

        Returns the resolved absolute Path on success.
        Raises PathSecurityError on failure.
        """
        raw = Path(input_path)

        # Resolve to absolute path
        try:
            resolved = raw.resolve(strict=False)
        except (OSError, RuntimeError) as e:
            raise PathSecurityError(
                error_code="INPUT_NOT_FOUND",
                message=f"Cannot resolve path: {input_path}",
                remediation="Provide a valid absolute or relative path to a .drawio file.",
            ) from e

        # Check existence
        if not resolved.exists():
            raise PathSecurityError(
                error_code="INPUT_NOT_FOUND",
                message=f"File not found: {resolved}",
                remediation="Verify the file path is correct and the file exists.",
            )

        if not resolved.is_file():
            raise PathSecurityError(
                error_code="INPUT_NOT_FOUND",
                message=f"Path is not a regular file: {resolved}",
                remediation="Provide a path to a .drawio file, not a directory.",
            )

        # Check readability
        if not os.access(resolved, os.R_OK):
            raise PathSecurityError(
                error_code="INPUT_NOT_FOUND",
                message=f"File is not readable: {resolved}",
                remediation="Check file permissions and ensure the file is readable.",
            )

        # Check workspace boundary — resolve again with strict to catch symlinks
        try:
            strict_resolved = resolved.resolve(strict=True)
        except (OSError, RuntimeError):
            raise PathSecurityError(
                error_code="INPUT_OUTSIDE_WORKSPACE",
                message=f"Cannot fully resolve path (possible broken symlink): {resolved}",
                remediation="Ensure the file path does not contain broken symbolic links.",
            )

        try:
            strict_resolved.relative_to(self.workspace_root)
        except ValueError:
            raise PathSecurityError(
                error_code="INPUT_OUTSIDE_WORKSPACE",
                message=f"File is outside the workspace: {strict_resolved}",
                remediation=(
                    f"Place the .drawio file inside the workspace root: "
                    f"{self.workspace_root}"
                ),
            )

        # Check size
        file_size = resolved.stat().st_size
        if file_size > self.max_input_size:
            raise PathSecurityError(
                error_code="INPUT_TOO_LARGE",
                message=(
                    f"Input file is {file_size} bytes, "
                    f"exceeds limit of {self.max_input_size} bytes "
                    f"({self.max_input_size // (1024*1024)} MB)"
                ),
                remediation="Use a smaller .drawio file or increase DRAWIO_MAX_INPUT_SIZE_MB.",
            )

        return resolved

    def resolve_output_path(
        self,
        output_path: Optional[str],
        input_path: Path,
        format: str,
        overwrite: bool = False,
    ) -> Path:
        """Resolve and validate an output path.

        If output_path is None, derives it from input_path by replacing the extension.
        Checks:
        - Resolved path is within workspace root
        - Extension matches format
        - Does not already exist (unless overwrite=True)
        - Parent directory exists (or can be created if within workspace)

        Returns the resolved absolute output Path.
        Raises PathSecurityError on failure.
        """
        if output_path is None:
            output_path = str(input_path.with_suffix(f".{format}"))

        raw = Path(output_path)

        # Resolve to absolute path
        try:
            resolved = raw.resolve(strict=False)
        except (OSError, RuntimeError) as e:
            raise PathSecurityError(
                error_code="OUTPUT_WRITE_FAILED",
                message=f"Cannot resolve output path: {output_path}",
                remediation="Provide a valid file path for the output.",
            ) from e

        # Check extension matches format
        expected_ext = f".{format}"
        if resolved.suffix.lower() != expected_ext:
            raise PathSecurityError(
                error_code="INVALID_OUTPUT_EXTENSION",
                message=(
                    f"Output extension '{resolved.suffix}' does not match "
                    f"format '{format}' (expected '{expected_ext}')"
                ),
                remediation=f"Change the output file extension to '{expected_ext}'.",
            )

        # Check workspace boundary
        try:
            resolved.relative_to(self.workspace_root)
        except ValueError:
            raise PathSecurityError(
                error_code="INPUT_OUTSIDE_WORKSPACE",
                message=f"Output path is outside the workspace: {resolved}",
                remediation=(
                    f"Place output files inside the workspace root: "
                    f"{self.workspace_root}"
                ),
            )

        # Check overwrite
        if resolved.exists() and not overwrite:
            raise PathSecurityError(
                error_code="OUTPUT_ALREADY_EXISTS",
                message=f"Output file already exists: {resolved}",
                remediation="Set overwrite=true to overwrite, or choose a different output path.",
            )

        # Check parent directory
        parent = resolved.parent
        if not parent.exists():
            # Only auto-create dirs inside workspace
            try:
                parent.relative_to(self.workspace_root)
                parent.mkdir(parents=True, exist_ok=True)
            except ValueError:
                raise PathSecurityError(
                    error_code="OUTPUT_WRITE_FAILED",
                    message=f"Output parent directory outside workspace: {parent}",
                    remediation="Choose an output path within the workspace root.",
                )
            except OSError as e:
                raise PathSecurityError(
                    error_code="OUTPUT_WRITE_FAILED",
                    message=f"Cannot create output directory: {parent}",
                    remediation="Check directory permissions.",
                ) from e

        return resolved

    def check_output_size(self, size: int) -> None:
        """Check that output size is within limits."""
        if size > self.max_output_size:
            raise PathSecurityError(
                error_code="OUTPUT_TOO_LARGE",
                message=(
                    f"Export result is {size} bytes, "
                    f"exceeds limit of {self.max_output_size} bytes "
                    f"({self.max_output_size // (1024*1024)} MB)"
                ),
                remediation="Export a smaller diagram or increase DRAWIO_MAX_OUTPUT_SIZE_MB.",
            )

    def get_workspace_root(self) -> Path:
        return self.workspace_root


def get_default_workspace() -> Path:
    """Get the default workspace root from environment or current directory."""
    env_root = os.environ.get("DRAWIO_WORKSPACE_ROOT", "").strip()
    if env_root:
        return Path(env_root).resolve()
    return Path.cwd().resolve()
