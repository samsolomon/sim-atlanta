"""Annotate the pinned viewport. Inputs: rendered PNG, project.ts JSON, output PNG."""
import json
import math
import sys
from PIL import Image, ImageDraw, ImageFont

base = Image.open(sys.argv[1]).convert("RGB")
assert base.size == (1200, 720)
sheet = Image.new("RGB", (1200, 932), "#151e26")
sheet.paste(base)
ink = ImageDraw.Draw(sheet)
font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 18)
bold = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 20)
rows = {
    38981789: ("A", "#ff967d", "Exit ramp · 1 lane · SB"),
    38983384: ("B", "#d8b1ff", "I-85 · 5 lanes · SB"),
    1409808969: ("B", "#d8b1ff", "I-85 · 5 lanes · SB"),
    369529900: ("C", "#92eda0", "I-85 · 6 lanes · NB"),
    879130781: ("D", "#7fdfff", "GA 13 · 2 lanes · SB"),
    187141934: ("E", "#ffda70", "GA 13 · 2 lanes · NB"),
}
for path in json.load(open(sys.argv[2]))["paths"]:
    if path["id"] not in rows:
        continue
    letter, color, label = rows[path["id"]]
    points = [(p[4],p[5]) for p in path["samples"] if -1 < p[6] < 1 and -5 < p[4] < 1205 and -5 < p[5] < 725]
    if len(points) < 3:
        continue
    ink.line(points, fill=color, width=2)
    i = min(range(1,len(points)),key=lambda j:abs(points[j][1]-330))
    x,y = points[i]
    dx,dy = x-points[i-1][0], y-points[i-1][1]
    length = math.hypot(dx,dy)
    dx,dy = dx/length,dy/length
    ink.polygon([(x+13*dx,y+13*dy),(x-10*dx+6*dy,y-10*dy-6*dx),(x-10*dx-6*dy,y-10*dy+6*dx)],fill=color,outline="black")
    ink.text((x+10,y),letter,font=bold,fill=color,stroke_fill="#141c22",stroke_width=2)
ink.text((22,732),"Brookwood   /   Source axes and travel direction",font=bold,fill="white")
ink.text((696,734),"Low   ·   9c2e854a   ·   08:01:12 EST   ·   1200 × 720",font=font,fill="#bbc8d1")
for i,(ident,(letter,color,label)) in enumerate((k,v) for k,v in rows.items() if k!=1409808969):
    x,y=22+(i%3)*393,775+(i//3)*50
    ink.text((x,y),letter,font=bold,fill=color)
    ink.text((x+27,y),label,font=font,fill="white")
    ids="38983384 → 1409808969" if ident==38983384 else str(ident)
    ink.text((x+27,y+22),ids,font=font,fill="#b5c3d0")
ink.text((22,891),"A emerges from tunnel 38981788 near the upper rim. D and E follow separate surface ways. Hidden floor elevation is unresolved.",font=font,fill="#e4eaf0")
sheet.save(sys.argv[3])
