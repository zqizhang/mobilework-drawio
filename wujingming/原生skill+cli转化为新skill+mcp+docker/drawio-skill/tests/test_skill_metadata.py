#!/usr/bin/env python3
"""Regression tests for version metadata consumed by distribution tooling."""

import json
import os
import re
import unittest


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILL = os.path.join(ROOT, "skills", "drawio-skill", "SKILL.md")


class TestSkillMetadata(unittest.TestCase):
    def test_declared_versions_match(self):
        with open(SKILL, encoding="utf-8") as f:
            text = f.read()

        version_match = re.search(
            r"^version:\s*([0-9]+\.[0-9]+\.[0-9]+)\s*$", text, re.M)
        self.assertIsNotNone(version_match, "top-level version is missing")

        metadata_match = re.search(r"^metadata:\s*(\{.*\})\s*$", text, re.M)
        self.assertIsNotNone(metadata_match, "metadata JSON is missing")
        metadata = json.loads(metadata_match.group(1))

        self.assertEqual(version_match.group(1), metadata.get("version"))


if __name__ == "__main__":
    unittest.main()
