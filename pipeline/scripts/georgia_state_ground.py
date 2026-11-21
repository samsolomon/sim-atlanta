"""Sample ground on the pinned eastbound Blue approach. See docs/georgia-state-ground.md."""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import rasterio

from downtown_terrain import ROOT, TILE_SHA256, interpolate, read_ground
from vignette import project

FOLDER = Path(ROOT) / "pipeline/prototypes/downtown-ground"
START = 7367.8  # Five Points stop on path 155177
STOP = 8025.0   # Georgia State stop
END = 8280.0    # tie to the Connector floor section
PATH_ID = "marta:path:155177"


def section(source, output):
    knots = list(csv.DictReader((FOLDER / "georgia-state-path.csv").read_text().splitlines()))
    s = np.array([float(p["path_s_m"]) for p in knots])
    if any(p["path_id"] != PATH_ID for p in knots) or np.any(np.diff(s) <= 0) or not s[0] <= START < END <= s[-1]:
        raise ValueError("Invalid eastbound path slice")
    # Preserve full-path chainage from routes.json. The two station samples fall on
    # their timetable distances; the origin for distance is never reset at Five Points.
    samples = np.unique(np.r_[START, np.arange(math.ceil(START / 5) * 5, END + 1, 5), STOP])
    lon, lat = [np.interp(samples, s, [float(p[key]) for p in knots]) for key in ("lon", "lat")]
    x, z = np.array([project(a, b) for a, b in zip(lon, lat)]).T
    manifest = json.loads((FOLDER / "ground.json").read_text())
    data = (FOLDER / manifest["file"]).read_bytes()
    if hashlib.sha256(data).hexdigest() != manifest["sha256"]:
        raise ValueError("Ground grid checksum mismatch")
    grid = np.frombuffer(data, dtype="<i2").reshape(manifest["rows"], manifest["cols"])
    digest = hashlib.sha256()
    with source.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    if digest.hexdigest() != TILE_SHA256:
        raise ValueError("Native DEM checksum mismatch")
    with rasterio.open(source) as src:
        native = read_ground(src, x, z)
    with output.open("w", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["path_id", "path_s_m", "scene_x_m", "scene_z_m", "ground_5m_navd88_m",
                    "ground_native_navd88_m", "grid_minus_native_m"])
        for distance, px, pz, n in zip(samples, x, z, native):
            coarse = interpolate(grid, px, pz)
            n_ok = np.isfinite(n)
            w.writerow([PATH_ID, f"{distance:.1f}", f"{px:.2f}", f"{pz:.2f}",
                        "" if coarse is None else f"{coarse:.2f}", f"{n:.2f}" if n_ok else "",
                        f"{coarse-n:.2f}" if coarse is not None and n_ok else ""])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tile", type=Path)
    parser.add_argument("--out", type=Path, default=FOLDER / "georgia-state-section.csv")
    args = parser.parse_args()
    section(args.tile, args.out)
