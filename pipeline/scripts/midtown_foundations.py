"""Find hillside buildings whose generic roof needs an uphill finished-floor datum."""
import json
import math
from collections import defaultdict

import numpy as np
from shapely import contains_xy
from shapely.geometry import Polygon

from pathlib import Path
from vignette import MIDTOWN_ROWS, ROOT

PACK = Path(ROOT) / "pipeline/prototypes"


def footprint_heights(rings, dem, bounds, step):
    # On a piecewise planar surface the extrema lie at an interior mesh node,
    # a corner of the footprint, or the intersection of its edge with a triangle.
    samples = []
    for ring in rings:
        for (x, z), (x1, z1) in zip(ring, ring[1:] + ring[:1]):
            t = [0.]
            for a, b in [(x, x1), (z, z1), (x+z, x1+z1)]:
                if a != b:
                    t.extend((i*step-a)/(b-a) for i in range(math.floor(min(a,b)/step)+1, math.ceil(max(a,b)/step)))
            samples.extend((x+v*(x1-x), z+v*(z1-z)) for v in t)
    poly = Polygon(rings[0], rings[1:])
    x0, z0, x1, z1 = poly.bounds
    xs, zs = np.meshgrid(np.arange(math.ceil(x0/step), math.floor(x1/step)+1)*step,
                         np.arange(math.ceil(z0/step), math.floor(z1/step)+1)*step)
    inside = contains_xy(poly, xs, zs)
    samples.extend(zip(xs[inside], zs[inside]))
    points = np.asarray(samples)
    u = np.clip((points[:,0]-bounds["minX"])/step, 0, dem.shape[1]-1)
    v = np.clip((points[:,1]-bounds["minZ"])/step, 0, dem.shape[0]-1)
    i = np.minimum(u.astype(int), dem.shape[1]-2)
    j = np.minimum(v.astype(int), dem.shape[0]-2)
    a, b = u-i, v-j
    sw, ne = dem[j+1,i], dem[j,i+1]
    heights = np.where(a+b <= 1, dem[j,i]*(1-a-b)+ne*a+sw*b,
                       dem[j+1,i+1]*(a+b-1)+ne*(1-b)+sw*(1-a))
    return float(heights.min()), float(heights.max())


def bake():
    sites = defaultdict(list)
    for row in [*MIDTOWN_ROWS, "north-band"]:
        folder = PACK / "square-board" / row
        m = json.loads((folder/"ground.json").read_text())
        dem = np.fromfile(folder/"ground.i16",dtype="<i2").reshape(m["rows"],m["cols"]) * m["scaleM"]
        zero = m["vertical"]["sceneZeroNavd88M"]
        for b in json.loads((folder/"context.json").read_text())["buildings"]:
            ident = b["id"].split("/")[0]
            if row == "north-band" and ident not in sites:
                continue
            low, high = footprint_heights(b["rings"], dem, m["bounds"], m["stepM"])
            h = b["h"] or (3.6*b["floors"] if b["floors"] else 8)
            sites[ident].append((low, high, math.floor(low-zero) + zero + h))
    grades = {}
    for ident, pieces in sorted(sites.items()):
        low, high, roof = min(p[0] for p in pieces), max(p[1] for p in pieces), min(p[2] for p in pieces)
        # Include the low-tier tessellation tolerance at the cutoff.
        if roof < high + .4:
            grades[ident] = [math.floor(low*10)/10, math.ceil(high*10)/10]
    (PACK/"midtown-foundations/grades.json").write_text('{\n' + ',\n'.join(f'  {json.dumps(k)}: {json.dumps(v)}' for k, v in grades.items()) + '\n}'+"\n")
    return grades


if __name__ == "__main__":
    print(len(bake()), "hillside building grades")
