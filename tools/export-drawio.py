#!/usr/bin/env python3
"""Export a draw.io file through the rlespinasse/drawio-export Docker image.

Supported formats: PNG, SVG, PDF and JPG.
No third-party Python packages are required.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Iterable


DEFAULT_IMAGE = "rlespinasse/drawio-export:v4.52.0"
SUPPORTED_FORMATS = ("png", "svg", "pdf", "jpg")


def emit_error(message: str, **details: object) -> int:
    result: dict[str, object] = {
        "success": False,
        "error": message,
    }
    result.update(details)
    print(json.dumps(result, ensure_ascii=False), file=sys.stderr)
    return 1


def resolve_in_workspace(workspace: Path, value: str, label: str) -> Path:
    candidate = Path(value).expanduser()
    if not candidate.is_absolute():
        candidate = workspace / candidate
    candidate = candidate.resolve()

    try:
        candidate.relative_to(workspace)
    except ValueError as exc:
        raise ValueError(
            f"{label} must be located inside the workspace: {candidate}"
        ) from exc

    return candidate


def remove_old_outputs(
    output_directory: Path,
    base_name: str,
    extension: str,
) -> None:
    # draw.io may append a page name, for example:
    # order-flow-订单流程.png
    for file_path in output_directory.glob(f"{base_name}*.{extension}"):
        if file_path.is_file():
            file_path.unlink()


def find_outputs(
    output_directory: Path,
    base_name: str,
    extension: str,
) -> list[Path]:
    matches: Iterable[Path] = output_directory.glob(
        f"{base_name}*.{extension}"
    )
    return sorted(
        (path.resolve() for path in matches if path.is_file()),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Export a draw.io file to PNG, SVG, PDF or JPG through Docker."
        )
    )
    parser.add_argument(
        "-i",
        "--input",
        required=True,
        help="Input file inside the workspace, for example diagrams/demo.drawio",
    )
    parser.add_argument(
        "-f",
        "--format",
        required=True,
        choices=SUPPORTED_FORMATS,
        help="Output format",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        default="exports",
        help="Output directory inside the workspace; default: exports",
    )
    parser.add_argument(
        "--workspace",
        default=".",
        help="Workspace root; default: current directory",
    )
    parser.add_argument(
        "--image",
        default=os.environ.get("DRAWIO_EXPORT_IMAGE", DEFAULT_IMAGE),
        help=(
            "Docker image. It can also be set through DRAWIO_EXPORT_IMAGE."
        ),
    )
    args = parser.parse_args()

    workspace = Path(args.workspace).expanduser().resolve()
    if not workspace.is_dir():
        return emit_error(f"Workspace does not exist: {workspace}")

    try:
        input_path = resolve_in_workspace(
            workspace, args.input, "Input file"
        )
        output_directory = resolve_in_workspace(
            workspace, args.output_dir, "Output directory"
        )
    except ValueError as exc:
        return emit_error(str(exc))

    if not input_path.is_file():
        return emit_error(f"Input file does not exist: {input_path}")

    output_directory.mkdir(parents=True, exist_ok=True)

    relative_input = input_path.relative_to(workspace).as_posix()
    relative_output = output_directory.relative_to(workspace).as_posix()
    container_input = f"/data/{relative_input}"
    container_output = (
        "/data" if relative_output == "." else f"/data/{relative_output}"
    )

    base_name = input_path.stem
    try:
        remove_old_outputs(output_directory, base_name, args.format)
    except OSError as exc:
        return emit_error(f"Unable to remove old output files: {exc}")

    # Passing an argument list with shell=False avoids quoting and path issues
    # on Windows, Linux and macOS.
    docker_command = [
        "docker",
        "run",
        "--rm",
        "-v",
        f"{workspace}:/data",
        args.image,
        "--format",
        args.format,
        "--output",
        container_output,
        container_input,
    ]

    print(
        f"[drawio-export] input={input_path}",
        file=sys.stderr,
    )
    print(
        f"[drawio-export] format={args.format}",
        file=sys.stderr,
    )
    print(
        f"[drawio-export] outputDirectory={output_directory}",
        file=sys.stderr,
    )
    print(
        f"[drawio-export] image={args.image}",
        file=sys.stderr,
    )

    try:
        completed = subprocess.run(
            docker_command,
            cwd=workspace,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
    except FileNotFoundError:
        return emit_error(
            "Docker CLI was not found. Install Docker and ensure "
            "'docker' is available on PATH."
        )
    except OSError as exc:
        return emit_error(f"Unable to start Docker: {exc}")

    if completed.stdout:
        print(completed.stdout.rstrip(), file=sys.stderr)
    if completed.stderr:
        print(completed.stderr.rstrip(), file=sys.stderr)

    outputs = find_outputs(
        output_directory,
        base_name,
        args.format,
    )

    # Some draw.io export versions may return a non-zero code after creating
    # valid output files. The newly generated files are the final success test.
    if outputs:
        print(
            json.dumps(
                {
                    "success": True,
                    "method": "Docker via tools/export-drawio.py",
                    "format": args.format,
                    "input": str(input_path),
                    "outputs": [str(path) for path in outputs],
                    "dockerExitCode": completed.returncode,
                    "image": args.image,
                },
                ensure_ascii=False,
            )
        )
        return 0

    existing_files = sorted(
        str(path.resolve())
        for path in output_directory.iterdir()
        if path.is_file()
    )
    return emit_error(
        "Docker export failed: no matching output file was generated.",
        dockerExitCode=completed.returncode,
        expectedPattern=f"{base_name}*.{args.format}",
        outputDirectory=str(output_directory),
        existingFiles=existing_files,
        dockerStdout=completed.stdout,
        dockerStderr=completed.stderr,
    )


if __name__ == "__main__":
    raise SystemExit(main())
