"""Infer the freeway pavement under the Fifth Street park deck from exposed class-2 returns at
its two portals.

The bare-earth DEM bridges the 68 m deck's hole by interpolating from its abutments, so under the
deck the Connector's outer lanes climb from about 284 m to 291 m, within a metre of the deck's
girders. Just outside the deck, both portals show the real pavement: flat at 284-285 m across the
valley. Each grid node under the deck takes the pavement height interpolated across the deck
between the two portals, at the same distance along it (or the lower portal's, where the other
is a wall); only nodes the DEM raised are lowered.

Writes landbridge-floors.json: {ground sha256: [[node index, NAVD88 m], ...]}, applied with the
Connector underpass floors in web/src/terrain/surface-build.ts.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "scripts"))
from king_memorial_corridor import K, LAT0, LON0, R, ept_points

FIXTURES = HERE.parents[2] / "web/src/city/fixtures/midtown-connector"
BOARD = HERE.parent / "square-board" / "midtown-central"
# The deck's lidar edges (fifth-street-park.ts FIFTH_PARK), north positive from the centreline.
NORTH, SOUTH = 36.6, -31.4
# Exposed pavement strips beyond each portal, and the cover zone (the deck plus a margin the DEM's
# interpolation also reaches).
STRIP = 3.0, 14.0
MARGIN = 4.0

deck = json.loads((FIXTURES / "landbridges.json").read_text())[0]
east, west = np.array(deck["pts"][0]), np.array(deck["pts"][-1])
length = float(np.linalg.norm(west - east))
T = (west - east) / length
N = np.array([-T[1], T[0]])

lon = lambda x: LON0 + math.degrees(x / (R * K))
lat = lambda z: LAT0 - math.degrees(z / R)
corners = [east + T * s + N * t for s in (-20, length + 20) for t in (SOUTH - 20, NORTH + 20)]
xs, zs = [c[0] for c in corners], [c[1] for c in corners]
x, z, h, c, _ = ept_points((lon(min(xs)), lat(max(zs)), lon(max(xs)), lat(min(zs))))
ground = c == 2
s = (x - east[0]) * T[0] + (z - east[1]) * T[1]
t = (x - east[0]) * N[0] + (z - east[1]) * N[1]

BIN = 2.0
bins = np.arange(-6, length + 6 + BIN, BIN)


def portal(lo, hi):
    """Median exposed pavement height in each 2 m bin along the deck, between offsets lo and hi."""
    use = ground & (t > lo) & (t < hi)
    out = np.full(len(bins), np.nan)
    for i, b in enumerate(bins):
        k = use & (abs(s - b) < BIN)
        if k.sum() >= 6:
            out[i] = np.median(h[k])
    return out


north = portal(NORTH + STRIP[0], NORTH + STRIP[1])
south = portal(SOUTH - STRIP[1], SOUTH - STRIP[0])
tn, ts = NORTH + sum(STRIP) / 2, SOUTH - sum(STRIP) / 2
ok = np.isfinite(north) & np.isfinite(south)
print(f"portal bins: north {np.isfinite(north).sum()}, south {np.isfinite(south).sum()}, both {ok.sum()} of {len(bins)}")
assert ok.sum() > 0.8 * len(bins), "too few exposed pavement returns at the portals"
north = np.interp(bins, bins[ok], north[ok])
south = np.interp(bins, bins[ok], south[ok])

m = json.loads((BOARD / "ground.json").read_text())
raw = np.fromfile(BOARD / "ground.i16", dtype="<i2").reshape(m["rows"], m["cols"])
old = raw * m["scaleM"] + m["offsetM"]
j, i = np.indices(old.shape)
gx = m["bounds"]["minX"] + i * m["stepM"]
gz = m["bounds"]["minZ"] + j * m["stepM"]
gs = (gx - east[0]) * T[0] + (gz - east[1]) * T[1]
gt = (gx - east[0]) * N[0] + (gz - east[1]) * N[1]
inside = (gs > -MARGIN) & (gs < length + MARGIN) & (gt > SOUTH - MARGIN) & (gt < NORTH + MARGIN) & (raw != m["noData"])
f = np.clip((gt - ts) / (tn - ts), 0, 1)
fn, fs = np.interp(gs, bins, north), np.interp(gs, bins, south)
# Where one portal shows a retaining wall at street grade (north of the deck the valley ends near
# x 97; south of it the lanes run on to the Williams Street ramp), the lanes under the deck keep
# the open portal's pavement: the wall stands at the deck's edge, not in the lanes.
covered = (gt > SOUTH) & (gt < NORTH)
floor = np.where(covered & (abs(fn - fs) > 1.5), np.minimum(fn, fs), fs * (1 - f) + fn * f)
lowered = inside & (floor < old - 0.05)
q = np.round(np.where(lowered, floor, old), 2)
indices = np.flatnonzero(lowered)
print(f"{len(indices)} nodes lowered; most {np.max(old[lowered] - floor[lowered]):.2f} m; floor {floor[lowered].min():.2f}..{floor[lowered].max():.2f} m")
(HERE / "landbridge-floors.json").write_text(
    json.dumps({m["sha256"]: [[int(k), float(q.flat[k])] for k in indices]}, separators=(",", ":")) + "\n"
)
