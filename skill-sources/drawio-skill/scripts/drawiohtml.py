#!/usr/bin/env python3
"""Publish a .drawio as one self-contained PNG-based HTML viewer.

Every page is exported through the bundled HTTP Export Server client and
embedded as a data URL. The viewer provides page tabs, drag-pan, wheel zoom,
zoom buttons, and fit-to-window. The current backend does not export SVG, so
node search and SVG drill-down links are intentionally not claimed.

Usage: python3 drawiohtml.py <file.drawio> [-o out.html] [--scale N]
"""

import argparse
import base64
import html
import json
import os
import sys
import tempfile
import xml.etree.ElementTree as ET

from http_export import export_file


def pages_of(path):
    try:
        root = ET.parse(path).getroot()
    except (ET.ParseError, OSError) as exc:
        sys.exit(f"error: cannot parse {path}: {exc}")
    diagrams = root.findall("diagram")
    return [
        (page.get("id"), page.get("name") or f"Page {index + 1}")
        for index, page in enumerate(diagrams)
    ]


def build_html(title, pages):
    metadata = json.dumps(
        [{"name": name, "image": image} for name, image in pages],
        ensure_ascii=False,
    ).replace("</", "<\\/")
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><style>
:root{{color-scheme:light dark}}*{{box-sizing:border-box}}
body{{margin:0;height:100vh;display:flex;flex-direction:column;font:14px/1.5 system-ui,sans-serif;background:#f6f7f9;color:#1a1a1a}}
@media(prefers-color-scheme:dark){{body{{background:#15171a;color:#e8e8e8}}}}
header{{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:10px 16px 8px}}
h1{{margin:0;font-size:15px}}nav{{display:flex;gap:6px;flex-wrap:wrap}}
button{{font:inherit;color:inherit;padding:4px 10px;border:1px solid #0002;border-radius:8px;background:#fff;cursor:pointer}}
button.on{{border-color:#0d99ff;color:#0d99ff;font-weight:600}}
.ctl{{display:flex;gap:8px;margin-left:auto}}
@media(prefers-color-scheme:dark){{button{{background:#262b31;border-color:#fff2}}}}
#stage{{flex:1;overflow:hidden;position:relative;background:#fff;border-top:1px solid #0001;cursor:grab;touch-action:none}}
@media(prefers-color-scheme:dark){{#stage{{background:#1e2226;border-color:#fff2}}}}
#stage.drag{{cursor:grabbing}}#image{{position:absolute;transform-origin:0 0;max-width:none;user-select:none;pointer-events:none}}
</style></head><body><header><h1>{html.escape(title)}</h1><nav id="tabs"></nav>
<div class="ctl"><button id="zout">−</button><button id="zin">+</button><button id="fit">Fit</button></div>
</header><main id="stage"><img id="image" alt="diagram page"></main><script>
const P={metadata},stage=document.getElementById('stage'),img=document.getElementById('image'),tabs=document.getElementById('tabs');
let cur=0,view=P.map(()=>({{x:0,y:0,s:1,seen:false}})),drag=null;
P.forEach((p,i)=>{{const b=document.createElement('button');b.textContent=p.name;b.onclick=()=>show(i);tabs.appendChild(b);}});
function apply(){{const v=view[cur];img.style.transform=`translate(${{v.x}}px,${{v.y}}px) scale(${{v.s}})`;}}
function fit(){{const v=view[cur],r=stage.getBoundingClientRect(),s=Math.min((r.width-40)/img.naturalWidth,(r.height-40)/img.naturalHeight,4);v.s=s;v.x=(r.width-img.naturalWidth*s)/2;v.y=(r.height-img.naturalHeight*s)/2;v.seen=true;apply();}}
function show(i){{cur=i;[...tabs.children].forEach((b,j)=>b.classList.toggle('on',j===i));img.onload=()=>view[i].seen?apply():fit();img.src=P[i].image;}}
stage.addEventListener('wheel',e=>{{e.preventDefault();const v=view[cur],r=stage.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,k=Math.exp(-e.deltaY*.0015),s=Math.min(Math.max(v.s*k,.05),8);v.x=mx-(mx-v.x)*s/v.s;v.y=my-(my-v.y)*s/v.s;v.s=s;apply();}},{{passive:false}});
stage.addEventListener('pointerdown',e=>{{drag={{x:e.clientX,y:e.clientY}};stage.classList.add('drag');stage.setPointerCapture(e.pointerId);}});
stage.addEventListener('pointermove',e=>{{if(!drag)return;const v=view[cur];v.x+=e.clientX-drag.x;v.y+=e.clientY-drag.y;drag={{x:e.clientX,y:e.clientY}};apply();}});
stage.addEventListener('pointerup',()=>{{drag=null;stage.classList.remove('drag');}});
function zoom(k){{const v=view[cur],r=stage.getBoundingClientRect(),mx=r.width/2,my=r.height/2,s=Math.min(Math.max(v.s*k,.05),8);v.x=mx-(mx-v.x)*s/v.s;v.y=my-(my-v.y)*s/v.s;v.s=s;apply();}}
document.getElementById('zin').onclick=()=>zoom(1.25);document.getElementById('zout').onclick=()=>zoom(.8);document.getElementById('fit').onclick=fit;show(0);
</script></body></html>"""


def main():
    parser = argparse.ArgumentParser(description="Export Draw.io to a self-contained PNG-based HTML viewer.")
    parser.add_argument("file")
    parser.add_argument("-o", "--output")
    parser.add_argument("--scale", type=float, default=2)
    args = parser.parse_args()
    if not os.path.isfile(args.file):
        sys.exit(f"error: {args.file} not found")
    metadata = pages_of(args.file)
    if not metadata:
        sys.exit(f"error: no <diagram> pages in {args.file}")

    rendered = []
    with tempfile.TemporaryDirectory() as temp:
        for index, (page_id, name) in enumerate(metadata, 1):
            output = os.path.join(temp, f"page-{index}.png")
            result = export_file(args.file, output, format="png", page_id=page_id, scale=args.scale)
            if not result.get("success"):
                sys.stderr.write(f"warning: page {index} ({name}) export failed: {result.get('message')}\n")
                continue
            with open(output, "rb") as handle:
                image = "data:image/png;base64," + base64.b64encode(handle.read()).decode("ascii")
            rendered.append((name, image))

    if not rendered:
        sys.exit("error: no pages exported; check DRAWIO_EXPORT_URL and the Export Server")
    title = os.path.splitext(os.path.basename(args.file))[0]
    output = args.output or os.path.splitext(args.file)[0] + ".html"
    with open(output, "w", encoding="utf-8") as handle:
        handle.write(build_html(title, rendered))
    sys.stderr.write(f"wrote {output} ({len(rendered)} pages, PNG-based viewer)\n")


if __name__ == "__main__":
    main()
