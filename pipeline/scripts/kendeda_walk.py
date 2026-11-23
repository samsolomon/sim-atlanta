"""Fit the mapped Storza Woods walkway to its coherent 3DEP return band."""
import json
from pathlib import Path

import numpy as np
from shapely import distance, line_locate_point, points
from shapely.geometry import LineString

from king_memorial_corridor import ept_points
from vignette import ROOT
from vignette_trees import scene_to_lonlat

PACK = Path(ROOT) / "pipeline/prototypes"
NAME = "Kendeda Canopy Walk"


def bake():
    path = []
    for row in ("midtown-upper", "brookwood-south"):
        context = json.loads((PACK / f"square-board/{row}/context.json").read_text())
        pts = next(r["pts"] for r in context["roads"] if r["name"] == NAME)
        if path and pts[0] != path[-1]:
            raise ValueError("The adjoining walk centerlines must meet")
        path.extend(pts[1:] if path else pts)
    line = LineString(path)
    west, south = scene_to_lonlat(1570, -4030)
    east, north = scene_to_lonlat(1800, -4230)
    x, z, h, cls, _ = ept_points((west, south, east, north))
    xy = points(x, z)
    close = distance(line, xy) <= 1.65
    s = line_locate_point(line, xy[close])
    # No class-17 returns in this crop. The manually identified descending
    # band runs from 287.2 to 280.9 m, with woods above and class-2 earth below.
    near = np.abs(h[close] - np.interp(s, [0, line.length], [287.2, 280.9])) < .55
    s, h = s[near], h[close][near]
    bins = []
    for start in np.arange(0, line.length, 5):
        inside = (s >= start) & (s < start + 5)
        if inside.sum() >= 5:
            bins.append([round(float(np.median(s[inside])), 2), round(float(np.median(h[inside])), 2), int(inside.sum())])
    out = PACK / "kendeda-walk"
    out.mkdir(exist_ok=True)
    (out / "profile.json").write_text(json.dumps(dict(path=path, bins=bins), separators=(",", ":")) + "\n")
    print(len(bins), "supported bins,", sum(b[2] for b in bins), "returns")


if __name__ == "__main__":
    bake()
