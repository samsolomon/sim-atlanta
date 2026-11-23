"""Detect individual trees for a diorama vignette from the Meta/WRI 1 m canopy height map.

Source: Meta + WRI "High Resolution Canopy Height Maps" (Tolan et al. 2024), CC BY 4.0, on AWS Open
Data: s3://dataforgood-fb-data/forests/v1/alsgedi_global_v6_float/chm/<quadkey>.tif. Each tile is a
zoom-9 Web Mercator QuadKey, 65536 px square, uint8 metres, EPSG:3857 (~1.19 Mercator m/px, ~0.99 m on
the ground at Atlanta's latitude). The sidecar msk/<quadkey>.tif.msk (same pixel grid, no georeference)
flags cloud-covered pixels.

Pipeline:
  1. Window-read the padded patch from the tile over HTTPS (/vsicurl, anonymous), cache the crop and
     its mask under data/raw/meta_chm/ and reuse them on rerun.
  2. Resample to a 1 m grid in *scene* metres: every cell centre (x, z) is inverted through the scene
     tangent-plane projection to lon/lat, then to EPSG:3857, and sampled nearest-neighbour. Everything
     after this is in true scene metres, so Mercator scale and the z = -north flip are handled once.
  3. Zero the CHM inside building footprints (vignette.json "buildings") dilated by 1.5 m, so roof
     artefacts produce neither peaks nor canopy.
  4. Light Gaussian smoothing (sigma 1 m), then candidate local maxima >= MIN_H, then greedy
     non-maximum suppression tallest-first with MIN_SEP metres (the raw data is integer metres, so
     plateaus give tied maxima that a plain maximum filter would keep).
  5. Crown radius: every canopy cell (CHM >= CANOPY_H) within MAX_R of a peak is assigned to its
     nearest peak (a Voronoi split of the canopy) and kept if it is >= CROWN_FRAC x that peak's
     height; r = sqrt(area / pi), clamped to [R_MIN, R_MAX], then capped at the distance from the
     tree top to the nearest footprint (min 1 m). Splits contiguous groves instead of one giant crown.

Needs the repo venv (rasterio, pyproj, scipy, numpy, pillow for footprint rasterising and --debug):
    .venv/bin/python pipeline/scripts/vignette_trees.py [vignette-east] [--debug out.png]
writes web/public/data/scene/<name>/trees.json as {"source","license","notes","trees":[[x,z,h,r],...]}.
"""
import json
import math
import os
import sys

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.windows import Window
from scipy import ndimage
from scipy.spatial import cKDTree

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(ROOT, "data", "raw", "meta_chm")
BASE = "https://dataforgood-fb-data.s3.amazonaws.com/forests/v1/alsgedi_global_v6_float"
QUADKEY = "032002311"  # zoom-9 tile covering downtown Atlanta
UA = "geo-data-client/1.0"

LON0, LAT0 = -84.3916, 33.7539
R = 6_371_008.8
K = math.cos(math.radians(LAT0))
DEG = math.radians(1) * R

PAD = 20.0  # metres of margin read around the patch so edge peaks/crowns are not truncated
MIN_H = 4.0  # minimum tree height (m)
MIN_SEP = 5.0  # minimum distance between tree tops (m)
CANOPY_H = 2.0  # cell counts as canopy at or above this height (m)
BLDG_BUF = 1.5  # drop canopy within this distance of a footprint (m)
MAX_R, R_MIN, R_MAX = 8.0, 1.5, 8.0  # crown assignment reach and radius clamp (m)
CROWN_FRAC = 0.5  # crown cells must be >= this fraction of the tree's peak height


def scene_to_lonlat(x, z):
    return LON0 + x / (DEG * K), LAT0 - z / DEG


def fetch_crop(name, bx, bz, quadkey=QUADKEY):
    """Return (chm uint8, valid bool, transform) for the padded patch, cached on disk."""
    os.makedirs(CACHE, exist_ok=True)
    chm_path = os.path.join(CACHE, f"{name}_{quadkey}_chm.tif")
    msk_path = os.path.join(CACHE, f"{name}_{quadkey}_valid.npy")
    if os.path.exists(chm_path) and os.path.exists(msk_path):
        with rasterio.open(chm_path) as d:
            return d.read(1), np.load(msk_path), d.transform
    to3857 = Transformer.from_crs(4326, 3857, always_xy=True)
    xs = [bx[0] - PAD, bx[1] + PAD]
    zs = [bz[0] - PAD, bz[1] + PAD]
    lons, lats = zip(*[scene_to_lonlat(x, z) for x in xs for z in zs])
    mx, my = to3857.transform(lons, lats)
    with rasterio.Env(GDAL_HTTP_USERAGENT=UA, GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"):
        with rasterio.open(f"/vsicurl/{BASE}/chm/{quadkey}.tif") as src:
            assert src.crs.to_epsg() == 3857, src.crs
            r0, c0 = src.index(min(mx), max(my))
            r1, c1 = src.index(max(mx), min(my))
            r0, c0 = max(r0 - 2, 0), max(c0 - 2, 0)
            win = Window(c0, r0, min(c1 + 3, src.width) - c0, min(r1 + 3, src.height) - r0)
            chm = src.read(1, window=win)
            transform = src.window_transform(win)
            profile = dict(src.profile, width=win.width, height=win.height, transform=transform, tiled=False)
        # Cloud mask: same pixel grid as the CHM tile but stored without georeferencing. The readme
        # says False = NODATA, but empirically the tile is ~97% 0 with sparse 255 while the CHM has
        # data everywhere, so 255 is treated as the cloud flag and 0 as valid.
        try:
            with rasterio.open(f"/vsicurl/{BASE}/msk/{quadkey}.tif.msk") as m:
                valid = m.read(1, window=win) != 255
        except Exception as e:  # noqa: BLE001 - mask is advisory
            print(f"warning: cloud mask unavailable ({e}); assuming all valid")
            valid = np.ones_like(chm, dtype=bool)
    np.save(msk_path, valid)
    with rasterio.open(chm_path, "w", **profile) as d:
        d.write(chm, 1)
    return chm, valid, transform


def rasterize_buildings(buildings, x0, z0, w, h):
    """Boolean grid (rows = z, cols = x, 1 m cells, origin x0/z0) of footprint interiors (outer rings minus holes)."""
    from PIL import Image, ImageDraw

    img = Image.new("1", (w, h), 0)
    dr = ImageDraw.Draw(img)
    for b in buildings:
        for i, ring in enumerate(b["rings"]):
            pts = [(px - x0, pz - z0) for px, pz in ring]
            if len(pts) >= 3:
                dr.polygon(pts, fill=1 if i == 0 else 0, outline=1 if i == 0 else None)
    return np.array(img, dtype=bool)


def main(name, debug_png=None):
    vig = json.load(open(os.path.join(ROOT, "web", "public", "data", "scene", name, "vignette.json")))
    b = vig["bounds"]
    bx, bz = (b["minX"], b["maxX"]), (b["minZ"], b["maxZ"])
    chm, valid, transform = fetch_crop(name, bx, bz)

    # 1 m scene grid over the padded patch; cell (i, j) centre = (x0 + j + .5, z0 + i + .5)
    x0, z0 = bx[0] - PAD, bz[0] - PAD
    w, h = int(bx[1] - bx[0] + 2 * PAD), int(bz[1] - bz[0] + 2 * PAD)
    gx, gz = np.meshgrid(x0 + np.arange(w) + 0.5, z0 + np.arange(h) + 0.5)
    lon, lat = scene_to_lonlat(gx, gz)
    mx, my = Transformer.from_crs(4326, 3857, always_xy=True).transform(lon, lat)
    col = np.floor((mx - transform.c) / transform.a).astype(int)
    row = np.floor((my - transform.f) / transform.e).astype(int)
    assert col.min() >= 0 and row.min() >= 0 and col.max() < chm.shape[1] and row.max() < chm.shape[0]
    raw = chm[row, col].astype(np.float32)
    ok = valid[row, col]
    raw[~ok] = 0.0

    bldg = rasterize_buildings(vig["buildings"], x0, z0, w, h)
    near_bldg = ndimage.distance_transform_edt(~bldg) <= BLDG_BUF
    roof_h = float(raw[bldg].mean()) if bldg.any() else 0.0
    cut = raw.copy()
    cut[near_bldg] = 0.0

    sm = ndimage.gaussian_filter(cut, 1.0)
    cand = (sm >= MIN_H) & (sm == ndimage.maximum_filter(sm, size=3)) & ~near_bldg
    ci, cj = np.nonzero(cand)
    order = np.argsort(-sm[ci, cj], kind="stable")
    taken = np.zeros((h, w), dtype=bool)
    rad = int(math.ceil(MIN_SEP))
    dd = np.hypot(*np.mgrid[-rad : rad + 1, -rad : rad + 1]) < MIN_SEP
    peaks = []
    for k in order:  # greedy NMS, tallest first
        i, j = ci[k], cj[k]
        if taken[i, j]:
            continue
        peaks.append((i, j))
        i0, i1, j0, j1 = max(i - rad, 0), min(i + rad + 1, h), max(j - rad, 0), min(j + rad + 1, w)
        taken[i0:i1, j0:j1] |= dd[i0 - i + rad : i1 - i + rad, j0 - j + rad : j1 - j + rad]
    peaks = np.array(peaks, dtype=int).reshape(-1, 2)

    # Crown radius from a nearest-peak (Voronoi) split of canopy cells; a cell only counts toward a
    # crown if it is at least half that tree's peak height (drops the low 2-3 m halo/shrub fringe),
    # and a crown never reaches past the nearest footprint.
    canopy = cut >= CANOPY_H
    area = np.zeros(len(peaks))
    bdist = ndimage.distance_transform_edt(~bldg)
    if len(peaks):
        peak_h = sm[peaks[:, 0], peaks[:, 1]]
        ki, kj = np.nonzero(canopy)
        dist, idx = cKDTree(peaks).query(np.c_[ki, kj], distance_upper_bound=MAX_R)
        hit = np.isfinite(dist)
        ki, kj, idx = ki[hit], kj[hit], idx[hit]
        crown = cut[ki, kj] >= CROWN_FRAC * peak_h[idx]
        np.add.at(area, idx[crown], 1.0)
    radius = np.clip(np.sqrt(area / math.pi), R_MIN, R_MAX)
    if len(peaks):
        radius = np.maximum(np.minimum(radius, bdist[peaks[:, 0], peaks[:, 1]]), 1.0)

    trees = []
    for (i, j), r in zip(peaks, radius):
        x, z = x0 + j + 0.5, z0 + i + 0.5
        if bx[0] <= x <= bx[1] and bz[0] <= z <= bz[1]:
            # height from the raw CHM max in a 3x3 around the smoothed peak (smoothing lowers tops)
            hh = float(cut[max(i - 1, 0) : i + 2, max(j - 1, 0) : j + 2].max())
            trees.append([round(x, 1), round(z, 1), round(hh, 1), round(float(r), 1)])

    inner = (slice(int(PAD), int(PAD) + int(bz[1] - bz[0])), slice(int(PAD), int(PAD) + int(bx[1] - bx[0])))
    cover = float((raw[inner] >= CANOPY_H).mean())
    cover_ex = float((cut[inner] >= CANOPY_H).mean())
    hs = np.array([t[2] for t in trees]) if trees else np.zeros(1)
    out = {
        "source": "Meta & WRI High Resolution Canopy Height Maps v1 (alsgedi_global_v6_float), "
        f"tile {QUADKEY}, s3://dataforgood-fb-data/forests/v1/ (Tolan et al. 2024)",
        "license": "CC BY 4.0",
        "notes": f"ML-estimated ~1 m canopy height (integer metres) from satellite imagery (acquisition-date raster reads "
        f"~18.9 here, plausibly late 2018). Peaks: Gaussian sigma 1 m, height >= {MIN_H:g} m, greedy NMS {MIN_SEP:g} m, "
        f"dropped inside/within {BLDG_BUF:g} m of vignette footprints. Crown radius = sqrt(area/pi) of cells >= {CROWN_FRAC:g} x peak height "
        f"assigned to the nearest peak (<= {MAX_R:g} m), clamped {R_MIN:g}-{R_MAX:g} m and capped at distance to nearest footprint. "
        "Urban canopy is likely under-detected. Columns: x, z (scene m), height m, crown radius m.",
        "trees": trees,
    }
    dest = os.path.join(ROOT, "web", "public", "data", "scene", name, "trees.json")
    with open(dest, "w") as fh:
        json.dump(out, fh, separators=(",", ":"))

    print(f"{name}: {len(trees)} trees -> {os.path.relpath(dest, ROOT)} ({os.path.getsize(dest) / 1024:.1f} KB)")
    print(f"  height m: min {hs.min():.0f}  p25 {np.percentile(hs, 25):.0f}  median {np.median(hs):.0f}  "
          f"p75 {np.percentile(hs, 75):.0f}  max {hs.max():.0f}")
    rs = np.array([t[3] for t in trees]) if trees else np.zeros(1)
    print(f"  crown radius m: min {rs.min():.1f}  median {np.median(rs):.1f}  max {rs.max():.1f}")
    print(f"  canopy cover (>= {CANOPY_H:g} m): {cover * 100:.1f}% raw, {cover_ex * 100:.1f}% after removing footprints+buffer")
    print(f"  cloud-masked cells in patch: {(~ok[inner]).sum()}; mean raw CHM on footprints: {roof_h:.2f} m")

    if debug_png:
        from PIL import Image, ImageDraw

        v = np.clip(raw / 30.0 * 255, 0, 255).astype(np.uint8)
        img = Image.fromarray(np.dstack([v, v, v])).resize((w * 2, h * 2), Image.NEAREST)
        dr = ImageDraw.Draw(img)
        for bd in vig["buildings"]:
            dr.polygon([((px - x0) * 2, (pz - z0) * 2) for px, pz in bd["rings"][0]], outline=(255, 60, 60))
        for road in vig["roads"]:
            if road["cls"] in ("motorway", "trunk"):
                dr.line([((px - x0) * 2, (pz - z0) * 2) for px, pz in road["pts"]], fill=(60, 120, 255), width=2)
        for t in trees:
            cx, cz = (t[0] - x0) * 2, (t[1] - z0) * 2
            dr.ellipse([cx - t[3] * 2, cz - t[3] * 2, cx + t[3] * 2, cz + t[3] * 2], outline=(40, 220, 40))
        dr.rectangle([PAD * 2, PAD * 2, (w - PAD) * 2, (h - PAD) * 2], outline=(255, 200, 0))
        img.save(debug_png)
        print(f"  debug image -> {debug_png}")
    return out, dict(raw=raw, cut=cut, bldg=bldg, x0=x0, z0=z0)


if __name__ == "__main__":
    args = sys.argv[1:]
    dbg = None
    if "--debug" in args:
        k = args.index("--debug")
        dbg = args[k + 1]
        del args[k : k + 2]
    main(args[0] if args else "vignette-east", dbg)
