"""Bake USGS bare-earth heights on the downtown City board. See docs/downtown-ground.md."""
import argparse
import csv
import gzip
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.windows import Window

from vignette import K, LAT0, LON0, R, ROOT, VIGNETTES, project

PROJECT = "GA_Statewide_2018_B18_DRRA"
TILE = f"USGS_1M_16_x74y374_{PROJECT}"
BASE_URL = f"https://prd-tnm.s3.us-west-2.amazonaws.com/StagedProducts/Elevation/1m/Projects/{PROJECT}"
TILE_SHA256 = "a75e0cd22d4c673b9bf2f93caa714065b16a2f9695065c28714881d436f64140"
STEP = 5
NODATA = -32768
SCALE = 0.1
BOX = VIGNETTES["downtown"]
X0, X1 = BOX["x"]
Z0, Z1 = BOX["z"]

# Selected common vertices of MARTA GTFS Blue 155177 and Green 155214, west to east.
# Freeze the horizontal probe locations so a new timetable cannot move the experiment.
PROBES = [
    (-84.40187, 33.75670), (-84.40022, 33.75663), (-84.39806, 33.75630),
    (-84.39596, 33.75598), (-84.39429, 33.75549), (-84.39263, 33.75455),
    (-84.39155, 33.75392), (-84.38945, 33.75251), (-84.38725, 33.75112),
    (-84.38614, 33.75033), (-84.38539, 33.74979), (-84.38454, 33.74923),
    (-84.38379, 33.74894), (-84.38324, 33.74884), (-84.38270, 33.74882),
    (-84.38210, 33.74885), (-84.38144, 33.74889), (-84.38112, 33.74890),
]


def read_ground(src, x, z):
    """Get the containing native 1 m pixel for each City coordinate, preserving voids."""
    lon = LON0 + np.degrees(x / (R * K))
    lat = LAT0 - np.degrees(z / R)
    # City lon/lat treated as NAD83 at this scale. Pin the projection, independent of
    # locally installed datum-shift grids. Heights never enter this 2D transform.
    utm = Transformer.from_crs(4269, src.crs, always_xy=True)
    east, north = utm.transform(lon, lat)
    col, row = ~src.transform * (east, north)
    col, row = np.floor(col).astype(int), np.floor(row).astype(int)
    left, top = col.min(), row.min()
    window = Window(left, top, col.max() - left + 1, row.max() - top + 1)
    block = src.read(1, window=window, boundless=True, masked=True)
    return block[row - top, col - left].filled(np.nan)


def pack(heights):
    # Absolute NAVD88 decimetres. Keeping the vertical reference in the data lets
    # two independent boards join without each having to recover the other's offset.
    valid = np.isfinite(heights)
    dm = np.rint(heights[valid].astype(float) / SCALE)
    if np.any((dm <= NODATA) | (dm > 32767)):
        raise ValueError("Elevation outside the int16 decimetre encoding")
    grid = np.full(heights.shape, NODATA, dtype="<i2")
    grid[valid] = dm.astype("<i2")
    return grid


def interpolate(grid, x, z, step=STEP):
    """Consumer reference: return absolute metres, or None outside coverage / at a void."""
    u, v = (x - X0) / step, (z - Z0) / step
    rows, cols = grid.shape
    if not (0 <= u <= cols - 1 and 0 <= v <= rows - 1):
        return None
    i, j = math.floor(u), math.floor(v)
    du, dv = u - i, v - j
    total = 0.
    for row, wy in ((j, 1 - dv), (j + 1, dv)):
        for col, wx in ((i, 1 - du), (i + 1, du)):
            if wx * wy == 0:
                continue
            value = grid[row, col]
            if value == NODATA:
                return None
            total += int(value) * SCALE * wx * wy
    return total


def write_probes(out, src, grid):
    coords = [project(lon, lat) for lon, lat in PROBES]
    x, z = np.array(coords).T
    native = read_ground(src, x, z)
    with (out / "samples.csv").open("w", newline="") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(["lon", "lat", "x_m", "z_m", "dem_1m_navd88_m", "grid_navd88_m",
                         "grid_50m_north_navd88_m", "grid_50m_south_navd88_m"])
        for (lon, lat), (x, z), h in zip(PROBES, coords, native):
            values = [h] + [interpolate(grid, x, z + dz) for dz in (0, -50, 50)]
            writer.writerow([lon, lat, x, z] + [
                f"{v:.2f}" if v is not None and math.isfinite(v) else "" for v in values
            ])


def compare_spacing(src, grid):
    """Sample the 100 m north-south section across the depression east of Five Points."""
    x, z = project(-84.38945, 33.75251)
    section_z = z + np.arange(-50, 51)
    native = read_ground(src, np.full(section_z.shape, x), section_z)
    for stride in (1, 2, 4):
        step = STEP * stride
        coarse = grid[::stride, ::stride]
        sampled = np.array([interpolate(coarse, x, sz, step) for sz in section_z], dtype=float)
        errors = np.abs(sampled - native)
        valid = errors[np.isfinite(errors)]
        if valid.size:
            print(f"{step:2d} m section: {valid.size} comparisons, mean |error| {valid.mean():.2f} m,"
                  f" max {valid.max():.2f} m; grid {len(gzip.compress(coarse.tobytes(), mtime=0)):,} B gzip")


def bake(source, out):
    sha = hashlib.sha256()
    with source.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            sha.update(chunk)
    if sha.hexdigest() != TILE_SHA256:
        raise ValueError(f"USGS tile checksum mismatch: {source}")

    x, z = np.meshgrid(np.arange(X0, X1 + 1, STEP), np.arange(Z0, Z1 + 1, STEP))
    with rasterio.open(source) as src:
        grid = pack(read_ground(src, x, z))
        origin_height = interpolate(grid, 0, 0)
        if origin_height is None:
            raise ValueError("Unknown Five Points height for scene y origin")
        binary = grid.tobytes()
        manifest = {
            "version": 1, "file": "ground.i16", "sha256": hashlib.sha256(binary).hexdigest(),
            "attribute": "bare-earth ground elevation", "tier": "inferred",
            "source": {"name": "USGS 3DEP 1 m DEM", "url": f"{BASE_URL}/TIFF/{TILE}.tif",
                       "metadata": f"{BASE_URL}/metadata/{TILE}.xml", "sha256": TILE_SHA256,
                       "tileTimeRange": ["2018-11-27", "2019-04-24"], "published": "2022-05-31",
                       "horizontal": "EPSG:26916", "resolutionM": 1, "noData": src.nodata},
            "horizontal": {"originLon": LON0, "originLat": LAT0, "lonLatCrs": "OGC:CRS84",
                           "radiusM": R, "axes": "x east, z south; local equirectangular metres"},
            "vertical": {"datum": "NAVD88", "crs": "EPSG:5703", "units": "metres",
                         "sceneZeroNavd88M": round(origin_height, 1)},
            "bounds": {"minX": X0, "maxX": X1, "minZ": Z0, "maxZ": Z1},
            "stepM": STEP, "rows": grid.shape[0], "cols": grid.shape[1],
            "layout": "inclusive nodes, row-major from minZ and minX; x varies fastest",
            "encoding": "signed int16 little-endian", "scaleM": SCALE, "offsetM": 0,
            "noData": NODATA, "noDataCount": int(np.count_nonzero(grid == NODATA)),
            "sampling": "nearest native pixel at node; bilinear between valid nodes",
        }
        out.mkdir(parents=True, exist_ok=True)
        (out / "ground.i16").write_bytes(binary)
        (out / "ground.json").write_text(json.dumps(manifest, indent=2) + "\n")
        write_probes(out, src, grid)
        compare_spacing(src, grid)
    for name in ("ground.i16", "ground.json"):
        data = (out / name).read_bytes()
        print(f"{name}: {len(data):,} bytes, {len(gzip.compress(data, mtime=0)):,} gzip -9")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Pinned USGS 1 m GeoTIFF")
    parser.add_argument("--out", type=Path, default=Path(ROOT) / "pipeline/prototypes/downtown-ground")
    args = parser.parse_args()
    bake(args.source, args.out)
