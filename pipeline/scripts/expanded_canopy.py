"""Bake the optional City neighborhood crowns from Atlanta's 2023 UTC and Meta/WRI heights."""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import rasterio
from affine import Affine
from pyproj import Transformer
from rasterio.features import rasterize
from rasterio.windows import from_bounds
from scipy import ndimage
from shapely.geometry import LineString, Polygon

from vignette import ROOT, project
from vignette_trees import fetch_crop, scene_to_lonlat

PACK = Path(ROOT) / "pipeline/prototypes"
BOARDS = ["king-memorial", "sweet-auburn", "square-board/north-band", "square-board/north-corner",
          "square-board/south-band", "square-board/south-corner"]
UTC_SHA256 = "2da149ea8b5c8f24ef69ef18cb15a1e08c1e29cd564687c8b82bef2a3407af0f"
WIDTH = dict(motorway=22, trunk=14, primary=13, secondary=11, tertiary=9,
             residential=7.5, unclassified=7, service=4.5, pedestrian=5, footway=2, steps=2, cycleway=2)


def sample(array, transform, crs, output, x0, z0):
    """Project scene cell centres in strips. Neighboring height tiles fill the same grid."""
    tr = Transformer.from_crs(4326, crs, always_xy=True)
    rows_out, cols_out = output.shape
    for i in range(0, rows_out, 64):
        x, z = np.meshgrid(x0 + np.arange(cols_out) + .5, z0 + np.arange(i, min(i + 64, rows_out)) + .5)
        mx, my = tr.transform(*scene_to_lonlat(x, z))
        rows = np.floor((my - transform.f) / transform.e).astype(int)
        cols = np.floor((mx - transform.c) / transform.a).astype(int)
        ok = (rows >= 0) & (cols >= 0) & (rows < array.shape[0]) & (cols < array.shape[1])
        output[i:i + len(z)][ok] = array[rows[ok], cols[ok]]


def sources(tile, x0, x1, z0, z1, crop):
    if hashlib.sha256(tile.read_bytes()).hexdigest() != UTC_SHA256:
        raise ValueError("Expected the published UTCMosaic2023.tif")
    canopy = np.zeros((z1-z0, x1-x0), dtype=np.uint8)
    heights = np.zeros_like(canopy)
    with rasterio.open(tile) as src:
        tr = Transformer.from_crs(4326, src.crs, always_xy=True)
        corners = [tr.transform(*scene_to_lonlat(x, z)) for x in (x0, x1) for z in (z0, z1)]
        xs, ys = zip(*corners)
        win = from_bounds(min(xs)-2, min(ys)-2, max(xs)+2, max(ys)+2, src.transform).round_offsets().round_lengths()
        sample(src.read(1, window=win), src.window_transform(win), src.crs, canopy, x0, z0)
    for key in ("032002311", "032003200"):
        chm, valid, transform = fetch_crop(crop, (x0, x1), (z0, z1), key)
        sample(np.where(valid, chm, 0), transform, 3857, heights, x0, z0)
    return canopy == 1, heights


def obstacles(boards):
    for ctx in boards.values():
        for feature in ctx.get("ground", []):
            if feature["kind"] == "water":
                yield Polygon(feature["rings"][0], feature["rings"][1:]), 2
        for b in ctx["buildings"]:
            yield Polygon(b["rings"][0], b["rings"][1:]), 2
        for road in ctx["roads"]:
            if road.get("tunnel"):
                continue
            cls = road["cls"]
            width = WIDTH.get(cls, 4)
            if road.get("sub") == "link" or cls.endswith("_link"):
                width = 7
            elif road.get("sub") == "parking_aisle":
                width = 6.4
            is_path = cls in ("footway", "steps", "path", "pedestrian", "cycleway")
            yield LineString(road["pts"]).buffer(width / 2 + .6), 1 if is_path else 2
    # Parallel freight tracks, surface transit and streetcar ways in the archived maps.
    maps = [PACK / "expanded-canopy/source/king-map.json.gz", PACK / "sweet-auburn/source/osm-map.json.gz", *sorted((PACK / "square-board/source").glob("*.gz"))]
    for path in maps:
        elements = json.loads(gzip.decompress(path.read_bytes()))["elements"]
        nodes = {e["id"]: project(e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
        for way in elements:
            tags = way.get("tags", {})
            if (way["type"] == "way" and tags.get("railway") in ("rail", "light_rail", "tram", "subway")
                    and tags.get("tunnel", "no") == "no"):
                yield LineString([nodes[n] for n in way["nodes"]]).buffer(3.5), 2
    corridor = json.loads((PACK / "king-memorial/corridor.json").read_text())
    yield LineString([(p["x"], p["z"]) for p in corridor["guideway"]]).buffer(9), 2
    for platform in corridor["station"]["platforms"]:
        yield LineString([project(*p) for p in platform["ring"]]).buffer(5), 2


def bake(tile, names=BOARDS, out=PACK / "expanded-canopy/crowns.json", crop="expanded-square", extra_ground=None, neighboring_crowns=(),
         contexts=None, extra_obstacles=()):
    # `contexts` bakes staged boards that differ from the tracked ones; `extra_obstacles` are
    # (geometry, 1 or 2) pairs that keep trunks and crowns off ground a board does not describe.
    boards = contexts or {k: json.loads((PACK / k / "context.json").read_bytes()) for k in names}
    if extra_ground:
        for ctx in boards.values():
            ctx["ground"].extend(extra_ground[ctx["name"]])
    bounds = [ctx["bounds"] for ctx in boards.values()]
    x0, z0 = (int(min(b[key] for b in bounds)) for key in ("minX", "minZ"))
    x1, z1 = (int(max(b[key] for b in bounds)) for key in ("maxX", "maxZ"))
    cover, heights = sources(tile, x0, x1, z0, z1, crop)
    # Walks exclude trunks but can pass underneath an existing crown. Roadways,
    # buildings and rail clear the full width of the seasonal model.
    blocked = rasterize(sorted([*obstacles(boards), *extra_obstacles], key=lambda a: a[1]), out_shape=cover.shape,
                        transform=Affine.translation(x0, z0), all_touched=True, dtype="uint8")
    clear = ndimage.distance_transform_edt(blocked < 2)
    interior = ndimage.distance_transform_edt(cover)
    radius = np.minimum(np.minimum(interior+.5, (clear-.75)/1.3), 10)
    strength = radius + .12 * ndimage.gaussian_filter(heights.astype("f4"), 2)
    eligible = cover & (radius >= 2.8) & (blocked == 0)
    # A broad grove has room for several crowns. Rank candidate centers from
    # the deepest canopy interiors, then reserve space around each accepted center.
    top = ndimage.maximum_filter(heights, size=5)
    occupied = np.zeros_like(cover)

    def reserve(i, j, separation):
        a, b = max(0, i-separation), max(0, j-separation)
        sub = occupied[a:i+separation+1, b:j+separation+1]
        yy, xx = np.ogrid[a:a+sub.shape[0], b:b+sub.shape[1]]
        sub |= (yy-i)**2 + (xx-j)**2 < separation**2

    # The previously published square owns its edge crowns. Reserve their
    # spacing across the outer seam before selecting any new centers.
    for x, z, _, r in neighboring_crowns:
        gap = max(7, math.ceil(1.36 * r))
        if x0-gap <= x < x1+gap and z0-gap <= z < z1+gap:
            reserve(math.floor(z-z0), math.floor(x-x0), gap)

    pack = {}
    for name, ctx in boards.items():
        b = ctx["bounds"]
        i0, i1 = int(b["minZ"])-z0, int(b["maxZ"])-z0
        j0, j1 = int(b["minX"])-x0, int(b["maxX"])-x0
        trees = []

        def place(x, z, radius, height):
            i, j = math.floor(z-z0), math.floor(x-x0)
            # A deciduous clump can reach 1.28 nominal radii. Allow for pixel registration.
            offset = math.hypot(x - (x0 + j + .5), z - (z0 + i + .5))
            radius = math.floor(min(radius, (clear[i,j] - .75 - offset)/1.3, 10)*10)/10
            if radius < 2 or blocked[i,j] or occupied[i,j] or min(x-b["minX"], b["maxX"]-x, z-b["minZ"], b["maxZ"]-z) < 1:
                return
            trees.append([x, z, round(float(height), 1), radius])
            reserve(i, j, max(7, math.ceil(1.36 * radius)))

        for x, z, h, r in ctx["trees"]:
            place(x, z, r, h)
        manual = len(trees)
        ii, jj = np.nonzero(eligible[i0:i1, j0:j1])
        ii, jj = ii+i0, jj+j0
        for k in np.argsort(-strength[ii,jj], kind="stable"):
            i, j = ii[k], jj[k]
            if occupied[i,j]:
                continue
            r = radius[i,j]
            h = top[i,j] if top[i,j] >= 4 else 1.8*r+1.5
            place(x0+int(j)+.5, z0+int(i)+.5, r, h)
        # Keep the largest crown in each 32 m cell for the low-detail view.
        ranked = sorted(trees, key=lambda t: (-t[3], -t[2], t[1], t[0]))
        cells, dominant, rest = set(), [], []
        for t in ranked:
            cell = (math.floor(t[0]/32), math.floor(t[1]/32))
            if cell in cells:
                rest.append(t)
            else:
                dominant.append(t)
                cells.add(cell)
        pack[ctx["name"]] = dict(trees=dominant + rest, lowCount=len(dominant))
        print(name, f"{cover[i0:i1,j0:j1].mean():.1%} classified", len(trees), "crowns,", manual,
              "retained from photo traces,", len(dominant), "on low")
    out.write_text(json.dumps(pack, separators=(",", ":"))+"\n")
    return cover, boards, pack


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tile", type=Path)
    bake(parser.parse_args().tile)
