"""
Draw.io XML validation module.

Validates that a file contains well-formed XML with a recognizable
Draw.io / mxfile document structure.
"""

import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Any


class DrawioValidationError(Exception):
    """Raised when XML is not a valid Draw.io document."""

    def __init__(self, error_code: str, message: str, remediation: str):
        self.error_code = error_code
        self.message = message
        self.remediation = remediation
        super().__init__(message)


def validate_drawio_xml(file_path: Path) -> ET.ElementTree:
    """Validate that a file is a well-formed Draw.io XML document.

    Checks:
    - File content is valid XML
    - Root element is <mxfile>
    - Contains at least one <diagram> element

    Returns the parsed ElementTree on success.
    Raises DrawioValidationError on failure.
    """
    try:
        tree = ET.parse(str(file_path))
    except ET.ParseError as e:
        raise DrawioValidationError(
            error_code="INVALID_DRAWIO_XML",
            message=f"File is not valid XML: {e}",
            remediation="Ensure the file is a valid .drawio (mxfile) XML document.",
        ) from e
    except (OSError, IOError) as e:
        raise DrawioValidationError(
            error_code="INVALID_DRAWIO_XML",
            message=f"Cannot read file as XML: {e}",
            remediation="Check file permissions and ensure it is a text XML file.",
        ) from e

    root = tree.getroot()

    # Check root element
    if root.tag != "mxfile":
        raise DrawioValidationError(
            error_code="INVALID_DRAWIO_XML",
            message=f"Root element is '<{root.tag}>', expected '<mxfile>'",
            remediation="Ensure the file is a valid Draw.io document with <mxfile> root.",
        )

    # Check for at least one diagram
    diagrams = root.findall("diagram")
    if not diagrams:
        raise DrawioValidationError(
            error_code="INVALID_DRAWIO_XML",
            message="No <diagram> elements found in the document",
            remediation="The .drawio file must contain at least one diagram page.",
        )

    return tree


def get_diagram_info(file_path: Path) -> List[Dict[str, Any]]:
    """Extract page/diagram information from a Draw.io file.

    Returns a list of dicts with keys: id, name, element_count
    Does not modify the file.
    """
    tree = validate_drawio_xml(file_path)
    root = tree.getroot()
    diagrams = root.findall("diagram")

    result = []
    for d in diagrams:
        d_id = d.get("id", "")
        d_name = d.get("name", d_id or "Unnamed")

        # Count elements in the mxGraphModel
        element_count = 0
        model = d.find("mxGraphModel")
        if model is not None:
            root_elem = model.find("root")
            if root_elem is not None:
                # Count cells (skip id="0" and id="1" which are always present)
                cells = root_elem.findall("mxCell")
                element_count = len(cells)

        result.append({
            "id": d_id,
            "name": d_name,
            "element_count": element_count,
        })

    return result
