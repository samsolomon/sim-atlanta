"""Report clipped neighborhood areas, payload and named road crossings for the coverage preview."""
import argparse
import gzip
import json
from pathlib import Path

from shapely.geometry import LineString, box, shape
from shapely.ops import transform

from square_board import PACK
from vignette import ROOT, VIGNETTES, project

SCENE = Path(ROOT) / "web/public/data/scene"
PATCHES = ["north-band", "north-corner", "south-band", "south-corner"]
CONTEXT = {name: PACK / name / "context.json" for name in PATCHES}
CONTEXT.update({"downtown": SCENE / "downtown/vignette.json",
                "king-memorial": SCENE / "king-memorial/context.json",
                "sweet-auburn": SCENE / "sweet-auburn/context.json"})


def rect(name):
    x0, x1 = VIGNETTES[name]["x"]
    z0, z1 = VIGNETTES[name]["z"]
    return box(x0, z0, x1, z1)


def crossings(roads, edge):
    result = {}
    for road in roads:
        if not road["name"]:
            continue
        hit = LineString(road["pts"]).intersection(edge)
        for p in getattr(hit, "geoms", [hit]):
            if p.geom_type == "Point" and not p.is_empty:
                result.setdefault(road["name"], []).append(p)
    return result


def report():
    source = json.loads((SCENE.parent / "ga/neighborhoods.json").read_bytes())
    neighborhoods = [(f["properties"]["name"], transform(project, shape(f["geometry"])))
                     for f in source["features"]]
    roads = {key: json.loads(file.read_bytes())["roads"] for key, file in CONTEXT.items()}
    for i, name in enumerate(PATCHES):
        data = [p.read_bytes() for p in (PACK / name).iterdir() if p.is_file()]
        area = rect(name)
        clipped = sorted(((area.intersection(poly).area / 10000, place) for place, poly in neighborhoods),
                         reverse=True)
        print(name, sum(map(len, data)), "raw bytes,", sum(len(gzip.compress(d, mtime=0)) for d in data),
              "gzip bytes;", ", ".join(f"{place} {ha:.1f} ha" for ha, place in clipped if ha >= 0.05))
        for other in list(CONTEXT)[i+1:]:
            edge = area.intersection(rect(other))
            if edge.geom_type != "LineString" or edge.is_empty:
                continue
            a, b = crossings(roads[name], edge), crossings(roads[other], edge)
            # Both directions catch unmatched sides of a divided road. Exact names only.
            for label in sorted(a.keys() & b.keys()):
                sides = [(a[label], b[label]), (b[label], a[label])]
                error = max(min(p.distance(q) for q in dst) for src, dst in sides for p in src)
                print(f"  {other}: {label}: {error:.2f} m")


def figure(path):
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new("RGB", (1230, 792), "#fbf8ef")
    draw = ImageDraw.Draw(img)
    ink = "#213c40"
    def label(x, y, value, size=19, anchor="la"):
        draw.text((x,y), value, fill=ink, font=ImageFont.load_default(size=size), anchor=anchor)
    label(42, 30, "Atlanta board coverage", 38)
    label(42, 87, "North up   /   City coordinates in metres   /   Both panels at the same scale", 20)
    colors = {"downtown":"#a6c1c2","king-memorial":"#a7cbb0","sweet-auburn":"#c1d8aa",
              "north":"#e9bb7f","south":"#aebbea","gap":"#f5e5dc"}
    old = ["downtown","king-memorial","sweet-auburn"]
    for i, title in enumerate(["Existing board and missing corners", "Two independent additions"]):
        x0, top, scale = 52 + 610*i, 168, .186
        label(x0, 132, title, 24)
        def xy(x,z):
            return (x0+(x+1000)*scale,top+(z+1700)*scale)
        def tile(name, color):
            x,z,e,s = rect(name).bounds
            draw.rectangle((*xy(x,z),*xy(e,s)),fill=colors[color],outline=ink,width=2)
        for key in old:
            tile(key,key)
        for key in PATCHES:
            if i or key.endswith("corner"):
                tile(key,key.split("-")[0] if i else "gap")
        for x,z,text in [(0,-400,"Downtown"),(1400,-95,"Sweet Auburn"),(1400,460,"King Memorial"),
                         (1400,-910,"NE corner"),(0,-1500,"North +400 m"),(0,900,"South +400 m")]:
            if not i and "400 m" in text: continue
            label(*xy(x,z),text,18,"mm")
        ax,ay = xy(1400,670)
        bx,by = xy(1530,905 if not i else 1035)
        draw.line((ax,ay,bx,by), fill=ink,width=2)
        label(bx-3,by,"SE 60 m",15,"rm")
        label(x0,706, "4.928 km² of ground" if not i else "7.840 km² of ground", 22)
        label(x0,743, "East-side gaps total 0.672 km²" if not i else "2,800 m east–west × 2,800 m north–south",17)
    img.save(path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--figure", type=Path)
    args = parser.parse_args()
    if args.figure:
        figure(args.figure)
    report()
