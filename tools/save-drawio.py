#!/usr/bin/env python3
"""Validate draw.io XML and save it as a .drawio file.

No third-party Python packages are required.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def emit_error(message: str) -> int:
    print(
        json.dumps(
            {"success": False, "error": message},
            ensure_ascii=False,
        ),
        file=sys.stderr,
    )
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate draw.io XML and save it as a .drawio file."
    )
    parser.add_argument(
        "-i",
        "--input",
        required=True,
        help="Input XML file, for example temp/diagram.xml",
    )
    parser.add_argument(
        "-o",
        "--output",
        required=True,
        help="Output .drawio file, for example diagrams/diagram.drawio",
    )
    args = parser.parse_args()

    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()

    if not input_path.is_file():
        return emit_error(f"Input file does not exist: {input_path}")

    try:
        # utf-8-sig accepts both ordinary UTF-8 and UTF-8 with BOM.
        content = input_path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError as exc:
        return emit_error(f"Input file is not valid UTF-8: {exc}")
    except OSError as exc:
        return emit_error(f"Unable to read input file: {exc}")

    if "<mxfile" not in content and "<mxGraphModel" not in content:
        return emit_error("Input content is not valid draw.io XML.")

    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding="utf-8", newline="")
    except OSError as exc:
        return emit_error(f"Unable to write output file: {exc}")

    print(
        json.dumps(
            {
                "success": True,
                "method": "Python via tools/save-drawio.py",
                "input": str(input_path),
                "output": str(output_path),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
