"""Command-line adapter for the same export service used by the MCP server."""

import argparse
import json
import os
import sys

from .export_client import ExportClient
from .path_security import PathSecurity, get_default_workspace
from .service import export_drawio_file


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Export Draw.io through the configured HTTP Export Server."
    )
    parser.add_argument("input_path")
    parser.add_argument("--format", choices=("png", "jpeg", "pdf"), required=True)
    parser.add_argument("--output", dest="output_path")
    parser.add_argument("--page-id")
    parser.add_argument("--all-pages", action="store_true")
    parser.add_argument("--scale", type=float, default=1)
    parser.add_argument("--border", type=int, default=0)
    parser.add_argument("--background")
    parser.add_argument("--embed-xml", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    return parser


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    workspace = get_default_workspace()
    path_security = PathSecurity(
        workspace_root=workspace,
        max_input_size_mb=float(os.environ.get("DRAWIO_MAX_INPUT_SIZE_MB", "20")),
        max_output_size_mb=float(os.environ.get("DRAWIO_MAX_OUTPUT_SIZE_MB", "100")),
    )
    result = export_drawio_file(
        args.input_path,
        args.format,
        path_security=path_security,
        export_client=ExportClient(),
        output_path=args.output_path,
        page_id=args.page_id,
        all_pages=args.all_pages,
        scale=args.scale,
        border=args.border,
        background=args.background,
        embed_xml=args.embed_xml,
        overwrite=args.overwrite,
    )
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result.get("success") else 1


if __name__ == "__main__":
    sys.exit(main())
