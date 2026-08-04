# Draw.io PR diff

`scripts/prdiff.py` lists changed `.drawio` files between two git refs, extracts
base and head blobs, builds a stable-ID diff diagram with `drawiodiff.py` and
`autolayout.py`, exports PNGs through the configured HTTP Export Server, and
writes a Markdown report.

```bash
python3 <this-skill-dir>/scripts/prdiff.py \
  --base origin/main --head HEAD --repo . \
  --out-dir drawio-pr -o drawio-pr/report.md
```

Requirements:

- `git` for history and blob extraction;
- Graphviz for the generated diff layout;
- `DRAWIO_EXPORT_URL` pointing to the main-branch ImageExport4/export service.

The script no longer installs or invokes Draw.io Desktop. If HTTP image export
fails, the Markdown still lists changed files and reports that no image was
produced. CI should provide the URL as an environment variable and must not
commit private endpoints or credentials.
