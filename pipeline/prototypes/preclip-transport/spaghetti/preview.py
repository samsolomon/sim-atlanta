"""Write a freestanding SVG plan and a vector chase view from the checked bake."""

import json, sys
from pathlib import Path

DIR = Path(__file__).resolve().parent
d = json.load(sys.stdin)
roads = d["surfaces"]


def px(p):
    return (54 + (p[2] + 630) * 0.51, 50 + (1080 - p[0]) * 0.46)


def xy(p):
    return ",".join(f"{v:.1f}" for v in px(p))


def path(rows, color, width):
    return (
        '<polyline points="'
        + " ".join(xy(p) for p in rows)
        + '" fill="none" stroke="'
        + color
        + '" stroke-width="'
        + str(width)
        + '" stroke-linejoin="round"/>'
    )


svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 975 495" font-family="system-ui,sans-serif"><title>I-285 eastbound to I-85 northbound, ramp plan</title><rect width="975" height="495" fill="#f5f3ea"/><g fill="#1a3835"><text x="32" y="42" font-size="24" font-weight="650">I-285 eastbound → I-85 northbound</text><text x="32" y="68" font-size="15">Tom Moreland Interchange · 2.169 km · north up</text></g>'
]
cutx = px([0, 0, d["cut"]])[0]
svg.append(
    f'<path d="M{cutx:.1f} 100V455" stroke="#b24e37" stroke-dasharray="5 4"/><text x="{cutx + 7:.1f}" y="450" fill="#963d29">Tile cut · 985 m</text>'
)
for road in roads[1:]:
    svg.append(path(road["centers"], "#889395", 4))
svg.append(path(roads[0]["centers"], "#12695d", 5))
for road, c in zip(roads[1:], d["crossings"]):
    if c["upper"] == c["crossingWay"]:
        svg.append(path(road["centers"], "#6f7d83", 5))
for label, p, off in [
    ("I-285 gore", roads[0]["centers"][0], -12),
    ("I-85 merge", roads[0]["centers"][-1], -12),
]:
    x, y = px(p)
    svg.append(
        f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="#08473e"/><text x="{x - 18:.1f}" y="{y + off:.1f}" fill="#143c35">{label}</text>'
    )
svg.append(
    '<text x="32" y="479" font-size="13" fill="#49575a">Green: selected ramp · Gray: crossed roads, shortened for this fixture · OSM contributors / USGS 3DEP</text></svg>'
)
(DIR / "overhead.svg").write_text("".join(svg))
# Keep the 2 m drive mesh where vehicles steer. Decimate only the preview road polygons.
data = []
for r in roads:
    rows = r["rows"]
    keep = [*rows[::3], rows[-1]]
    data.append([[[round(a, 3) for a in v] for v in pair] for pair in keep])
preview = (
    (DIR / "view.template")
    .read_text()
    .replace("/*ROADS*/", json.dumps(data, separators=(",", ":")))
    .replace("/*ENDS*/", json.dumps(d["ends"]))
    .replace("/*IDS*/", json.dumps(d["routeIds"]))
)
(DIR / "drive.html").write_text(preview)
