# Draw.io XML patterns

## Minimal document

```xml
<mxfile host="OpenWork">
  <diagram id="page-1" name="Page-1">
    <mxGraphModel grid="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

## Vertex

```xml
<mxCell id="step-login" value="Login" style="rounded=1;whiteSpace=wrap;html=1;"
  vertex="1" parent="1">
  <mxGeometry x="80" y="80" width="140" height="60" as="geometry"/>
</mxCell>
```

## Edge

```xml
<mxCell id="edge-login-success" value="Success"
  style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;"
  edge="1" parent="1" source="step-login" target="step-home">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

Escape `&`, `<`, `>`, and quotes in attribute values. Keep existing IDs stable.
When adding cells, choose IDs that do not collide with any current cell.
