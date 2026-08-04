# Mermaid semantics to native Draw.io

The integrated expert does not run an automatic Mermaid-to-Draw.io converter.
Use Mermaid input as a semantic description, then produce native, editable
Draw.io XML with one of these supported paths:

1. For a small graph, map Mermaid nodes and edges to stable IDs and call
   `drawio_create`.
2. For more than roughly 15 nodes, translate the graph to the JSON contract in
   `autolayout.md`, then run `scripts/autolayout.py`.
3. For custom containers, ports, or geometry, author XML using
   `xml-authoring.md`.

Preserve labels, edge directions, subgraph/group membership, and declared
layout direction. Mermaid styling is not automatically portable; map it to a
named style preset or explicit Draw.io style attributes. Validate the result,
export a PNG preview through `drawio_export`, and complete the normal visual
review loop.
