"""Movement and elevation register for the two Connector interchanges left after
B2: Capitol Gateway (D) and I-20 (E). Docs only; nothing here changes the City.

Ways come from the pinned south-band Overpass source (every highway way, walks
included, that runs at least 8 m inside an area). Each way's OWN surface is
tracked along its centre line in the 2019 USGS cloud exactly as ramp-register.py
does (5 m stations, class-2 and class-17 clusters, a continuous walk seeded at
the drawn ground). The register then records, per way:

- the drawn ground beneath it (south-band and downtown grids, underpass edits);
- for I-20, the class-17 profile south-connector-decks.ts already draws, and how
  far it sits from the tracked surface;
- shared-endpoint joints between profiled ways, and crossings ordered by
  tracked height with the clearance the drawn profiles leave.

For Capitol Gateway it also fits the cover top (class 2 inside the mapped deck
outline 1451206624) with one plane and with two, to size the "one asymmetric
slab" the bridge plan proposes.

Run from the repository root with the pipeline venv; writes
interchange-register.json beside this file.
"""
import gzip
import importlib.util
import json
import math
import re
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree
from shapely.geometry import LineString, Polygon, box

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
spec = importlib.util.spec_from_file_location("ramp_register", HERE / "ramp-register.py")
rr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rr)

AREAS = {
    "capitol-gateway": box(230, 690, 520, 880),
    "i20": box(-60, 880, 330, 1100),
}
ROADS = {"motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link", "secondary",
         "secondary_link", "tertiary", "tertiary_link", "residential", "unclassified", "service",
         "footway", "path", "pedestrian", "cycleway", "steps"}
CAP_OUTLINE = 1451206624


def overpass():
    src = ROOT / "pipeline/prototypes/square-board/source/south-band.json.gz"
    elements = json.load(gzip.open(src))["elements"]
    scale = math.pi / 180 * rr.R
    nodes = {e["id"]: (round((e["lon"] - rr.LON0) * scale * rr.K, 2), round((rr.LAT0 - e["lat"]) * scale, 2))
             for e in elements if e["type"] == "node"}
    return {e["id"]: ([nodes[n] for n in e["nodes"]], e.get("tags", {}))
            for e in elements if e["type"] == "way" and all(n in nodes for n in e["nodes"])}


def south_profiles():
    """The class-17 profiles south-connector-decks.ts draws, keyed by OSM way."""
    text = (ROOT / "web/src/square-board/south-connector-decks.ts").read_text()
    out = {}
    for m in re.finditer(r"'([-\d.]+),([-\d.]+)/([-\d.]+),([-\d.]+)': (\[\[.*?\]\]), // (\d+)", text):
        out[int(m.group(6))] = {"start": [float(m.group(1)), float(m.group(2))],
                                "end": [float(m.group(3)), float(m.group(4))], "samples": json.loads(m.group(5))}
    return out


def grids():
    base = rr.drawn_grids()
    patches = json.loads((HERE / "underpass-floors.json").read_text())
    d = ROOT / "pipeline/prototypes/square-board/south-band"
    m = json.loads((d / "ground.json").read_text())
    a = np.fromfile(d / "ground.i16", dtype="<i2").astype(float)
    for i, v in patches.get(m["sha256"], []):
        a[i] = v * 10
    return [(m, (a * m["scaleM"] + m["offsetM"]).reshape(m["rows"], m["cols"]))] + base


def profile_at(samples, s):
    s0, s1 = samples[0][0], samples[-1][0]
    if s < s0 - 1e-6 or s > s1 + 1e-6:
        return None
    return float(np.interp(s, [a for a, _ in samples], [b for _, b in samples]))


def main():
    ways, profiles, gr = overpass(), south_profiles(), grids()
    register = []
    for area, poly in AREAS.items():
        b = poly.bounds
        x, z, h, c, _ = rr.ept_points((*rr.lonlat(b[0] - 10, b[3] + 10), *rr.lonlat(b[2] + 10, b[1] - 10)))
        keep = (c == 2) | (c == 17)
        tree, hh = cKDTree(np.column_stack((x[keep], z[keep]))), h[keep]
        if area == "capitol-gateway":
            cap_pts, _ = ways[CAP_OUTLINE]
            cap = Polygon(cap_pts)
            inside = np.array([cap.contains_properly(LineString([p, p]).centroid) for p in zip(x, z)]) & (c == 2)
            P = np.column_stack((x[inside], z[inside], np.ones(inside.sum())))
            plane, *_ = np.linalg.lstsq(P, h[inside], rcond=None)
            res = h[inside] - P @ plane
            # Two planes: split along the cover's long axis at its centroid.
            cx, cz = cap.centroid.x, cap.centroid.y
            u = (x[inside] - cx) * (cap_pts[1][0] - cap_pts[0][0]) + (z[inside] - cz) * (cap_pts[1][1] - cap_pts[0][1])
            two = []
            for side in (u < 0, u >= 0):
                pl, *_ = np.linalg.lstsq(P[side], h[inside][side], rcond=None)
                two.append((pl, h[inside][side] - P[side] @ pl))
            cover = {"outline": CAP_OUTLINE, "returns": int(inside.sum()),
                     "onePlane": {"gradeX": round(float(plane[0]), 4), "gradeZ": round(float(plane[1]), 4),
                                  "rmsM": round(float(np.sqrt(np.mean(res ** 2))), 3),
                                  "p95M": round(float(np.percentile(abs(res), 95)), 3)},
                     "twoPlanes": [{"gradeX": round(float(pl[0]), 4), "gradeZ": round(float(pl[1]), 4),
                                    "rmsM": round(float(np.sqrt(np.mean(r ** 2))), 3)} for pl, r in two]}
        for wid, (pts, tags) in ways.items():
            if tags.get("highway") not in ROADS or len(pts) < 2:
                continue
            line = LineString(pts)
            if not line.intersects(poly) or line.intersection(poly).length < 8:
                continue
            if any(r["way"] == wid for r in register):
                continue
            stations, ground = [], []
            for s in np.arange(0, line.length + 1e-6, rr.STEP):
                p = line.interpolate(s)
                near = tree.query_ball_point([p.x, p.y], rr.RADIUS)
                stations.append({"s": round(float(s), 1), "xz": [round(p.x, 2), round(p.y, 2)],
                                 "levels": [round(v, 2) for v in rr.clusters(hh[near])]})
                ground.append(rr.ground_at(gr, p.x, p.y))
            path = rr.track(stations, ground)
            prof = profiles.get(wid)
            for k, st in enumerate(stations):
                st["own"] = path.get(k)
                st["ground"] = None if ground[k] is None else round(ground[k], 2)
                if prof:
                    # Profiles are keyed by the board's clipped way; the clip
                    # starts where the full way crosses the board edge.
                    off = line.project(LineString([prof["start"], prof["start"]]).centroid)
                    v = profile_at(prof["samples"], st["s"] - off)
                    st["drawn"] = None if v is None else round(v, 2)
            above = [st["own"] - st["ground"] for st in stations if st["own"] is not None and st["ground"] is not None]
            off_profile = [abs(st["drawn"] - st["own"]) for st in stations
                           if st.get("drawn") is not None and st["own"] is not None]
            register.append({
                "area": area, "way": wid, "highway": tags.get("highway"), "name": tags.get("name"),
                "bridge": tags.get("bridge"), "layer": tags.get("layer"), "covered": tags.get("covered"),
                "tunnel": tags.get("tunnel"), "lanes": tags.get("lanes"), "oneway": tags.get("oneway"),
                "lengthM": round(line.length, 1), "start": list(pts[0]), "end": list(pts[-1]),
                "drawnToday": "class-17 profile (south-connector-decks.ts)" if prof else
                              "clearance-inferred bridge" if tags.get("bridge") == "yes" else
                              "concealed" if tags.get("covered") == "yes" or tags.get("tunnel") else "on the board",
                "maxAboveDrawnGroundM": round(max(above), 2) if above else None,
                "maxProfileOffOwnM": round(max(off_profile), 2) if off_profile else None,
                "trackedShare": round(sum(1 for st in stations if st["own"] is not None) / len(stations), 2),
                "stations": stations,
            })
    # Joints between ways that share an endpoint and both carry a drawn profile.
    joints = []
    for a in register:
        for b2 in register:
            if a is b2 or math.dist(a["end"], b2["start"]) > .05:
                continue
            ha = next((st.get("drawn") for st in reversed(a["stations"]) if st.get("drawn") is not None), None)
            hb = next((st.get("drawn") for st in b2["stations"] if st.get("drawn") is not None), None)
            if ha is not None and hb is not None and a["stations"][-1].get("drawn") is not None and b2["stations"][0].get("drawn") is not None:
                joints.append({"from": a["way"], "to": b2["way"], "xz": a["end"], "stepM": round(hb - ha, 3)})
    # Crossings ordered by tracked height; the drawn gap where both are profiled.
    crossings = []
    for i, a in enumerate(register):
        for b2 in register[i + 1:]:
            if a["area"] != b2["area"]:
                continue
            la, lb = LineString([st["xz"] for st in a["stations"]] or [a["start"], a["end"]]), \
                     LineString([st["xz"] for st in b2["stations"]] or [b2["start"], b2["end"]])
            hit = la.intersection(lb)
            if hit.is_empty or hit.geom_type != "Point":
                continue
            if any(math.dist([hit.x, hit.y], p) < 1 for p in (a["start"], a["end"], b2["start"], b2["end"])):
                continue
            def at(r, line, key):
                s = line.project(hit)
                near = [st for st in r["stations"] if st.get(key) is not None and abs(st["s"] - s) <= 7.5]
                return round(float(np.interp(s, [st["s"] for st in near], [st[key] for st in near])), 2) if near else None
            ha, hb = at(a, la, "own"), at(b2, lb, "own")
            da, db = at(a, la, "drawn"), at(b2, lb, "drawn")
            upper = None if None in (ha, hb) else (a if ha > hb else b2)
            crossings.append({"area": a["area"], "xz": [round(hit.x, 2), round(hit.y, 2)], "ways": [a["way"], b2["way"]],
                              "own": [ha, hb], "drawn": [da, db],
                              "upper": upper["way"] if upper else None,
                              "ownGapM": None if None in (ha, hb) else round(abs(ha - hb), 2),
                              "drawnGapM": None if None in (da, db) else round(abs(da - db), 2)})
    out = {"cover": cover, "ways": register, "joints": joints, "crossings": crossings}
    (HERE / "interchange-register.json").write_text(json.dumps(out, indent=1) + "\n")
    for area in AREAS:
        rows = [r for r in register if r["area"] == area]
        print(area, len(rows), "ways;", sum(1 for c in crossings if c["area"] == area), "crossings")
    print("cover", json.dumps(cover))
    print("joints over 2 cm", [j for j in joints if abs(j["stepM"]) > .02])


if __name__ == "__main__":
    main()
