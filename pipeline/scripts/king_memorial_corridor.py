"""Evidence pack for the MARTA East Line corridor from the downtown board edge to King Memorial.

Writes pipeline/prototypes/king-memorial/corridor.json and docs/log/ui/king-memorial/profile.svg.
See docs/king-memorial-corridor.md.

Inputs:
  - staged GTFS shapes and stops (web/public/data/ga/routes.json; run `pnpm data` first);
  - the staged downtown scene.json (current City rail spans and profile ranges);
  - OpenStreetMap (API map call over the corridor; cached in data/raw/);
  - the USGS 3DEP lidar point cloud GA_Statewide_B2_2018, an Entwine Point Tile (EPT) dataset on
    s3://usgs-lidar-public. Its April 2019 flight is the same acquisition as the 1 m DEM, and its
    Z is NAVD88. Fetched nodes are cached in data/raw/ept/. Needs `laspy[lazrs]`.

Every height is either measured (lidar, or the DEM) or recorded as unknown. Nothing is interpolated
into the guideway.
"""
import argparse
import io
import json
import math
import time
import urllib.request
from pathlib import Path

import numpy as np

from vignette import K, LAT0, LON0, R, ROOT, VIGNETTES

RAW = Path(ROOT) / "data/raw"
OUT = Path(ROOT) / "pipeline/prototypes/king-memorial"
SVG = Path(ROOT) / "docs/log/ui/king-memorial/profile.svg"
EPT = "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018"
OSM_BBOX = (-84.3860, 33.7480, -84.3720, 33.7520)  # west, south, east, north
REFERENCE_PATH = "marta:path:155177"  # Blue eastbound to Indian Creek
THROUGH = ["155177", "155181", "155185", "155188", "155214", "155215", "155216", "155221", "155222", "155223"]
BIN = 5.0
S_RANGE = (8090.0, 9455.0)  # Floyd SE face to east of the King Memorial Crossover, on 155177
BOARD_EDGE_X = VIGNETTES["downtown"]["x"][1]


def project(lon, lat):
    return (lon - LON0) * math.pi / 180 * R * K, -(lat - LAT0) * math.pi / 180 * R


def fetch(url, cache: Path):
    if cache.exists():
        return cache.read_bytes()
    for attempt in range(5):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "sim-atlanta-pipeline"}), timeout=90).read()
            break
        except Exception:
            if attempt == 4:
                raise
            time.sleep(3 * (attempt + 1))
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_bytes(data)
    return data


# ---- path geometry ---------------------------------------------------------------------------

def load_path(routes, pid):
    p = next(q for q in routes["paths"] if q["id"] == pid)
    c = p["coords"]
    pts = np.array([project(c[i], c[i + 1]) for i in range(0, len(c), 2)])
    return pts, np.array(p["cum"], dtype=float)


def locate(pts, cum, x, z, window=None):
    """Nearest s and signed lateral (+ right of travel) on a polyline, vectorised over points."""
    x = np.atleast_1d(np.asarray(x, float))
    z = np.atleast_1d(np.asarray(z, float))
    best_d = np.full(x.shape, np.inf)
    best_s = np.full(x.shape, np.nan)
    best_l = np.zeros(x.shape)
    rng = range(len(pts) - 1) if window is None else range(*window)
    for i in rng:
        a, b = pts[i], pts[i + 1]
        ab = b - a
        l2 = float(ab @ ab)
        if l2 == 0:
            continue
        t = np.clip(((x - a[0]) * ab[0] + (z - a[1]) * ab[1]) / l2, 0, 1)
        qx, qz = a[0] + t * ab[0], a[1] + t * ab[1]
        d = np.hypot(x - qx, z - qz)
        lat = ((x - qx) * -ab[1] + (z - qz) * ab[0]) / math.sqrt(l2)
        m = d < best_d
        best_d[m], best_s[m], best_l[m] = d[m], cum[i] + t[m] * (cum[i + 1] - cum[i]), lat[m]
    return best_s, best_l, best_d


def at_s(pts, cum, s):
    i = int(np.clip(np.searchsorted(cum, s) - 1, 0, len(cum) - 2))
    t = (s - cum[i]) / max(cum[i + 1] - cum[i], 1e-9)
    p = pts[i] + t * (pts[i + 1] - pts[i])
    return round(float(p[0]), 2), round(float(p[1]), 2)


def s_at_x(pts, cum, x0):
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        if (a[0] - x0) * (b[0] - x0) <= 0 and a[0] != b[0]:
            t = (x0 - a[0]) / (b[0] - a[0])
            return float(cum[i] + t * (cum[i + 1] - cum[i]))
    return None


# ---- lidar (EPT) -----------------------------------------------------------------------------

def ept_points(bbox_lonlat):
    import laspy
    from pyproj import Transformer
    meta = json.loads(fetch(f"{EPT}/ept.json", RAW / "ept/ept.json"))
    to3857 = Transformer.from_crs(4326, 3857, always_xy=True)
    x0, y0 = to3857.transform(bbox_lonlat[0], bbox_lonlat[1])
    x1, y1 = to3857.transform(bbox_lonlat[2], bbox_lonlat[3])
    b = meta["bounds"]
    out = []

    def hierarchy(key):
        return json.loads(fetch(f"{EPT}/ept-hierarchy/{key}.json", RAW / f"ept/h-{key}.json"))

    def visit(h, key):
        d, X, Y, Z = map(int, key.split("-"))
        size = (b[3] - b[0]) / 2 ** d
        nx0, ny0 = b[0] + X * size, b[1] + Y * size
        if nx0 > x1 or nx0 + size < x0 or ny0 > y1 or ny0 + size < y0 or key not in h:
            return
        if h[key] == -1:
            h = hierarchy(key)
        if h.get(key, 0) > 0:
            las = laspy.read(io.BytesIO(fetch(f"{EPT}/ept-data/{key}.laz", RAW / f"ept/d-{key}.laz")))
            m = (las.x >= x0) & (las.x <= x1) & (las.y >= y0) & (las.y <= y1)
            if m.any():
                out.append(np.stack([las.x[m], las.y[m], las.z[m], las.classification[m], las.gps_time[m]], 1))
        for dx in (0, 1):
            for dy in (0, 1):
                for dz in (0, 1):
                    visit(h, f"{d + 1}-{2 * X + dx}-{2 * Y + dy}-{2 * Z + dz}")

    visit(hierarchy("0-0-0-0"), "0-0-0-0")
    pts = np.concatenate(out)
    lon, lat = Transformer.from_crs(3857, 4326, always_xy=True).transform(pts[:, 0], pts[:, 1])
    x, z = project(np.asarray(lon), np.asarray(lat))
    return x, z, pts[:, 2], pts[:, 3].astype(int), pts[:, 4]


def guideway_profile(pts, cum):
    """Per 5 m bin along the reference path: ground (class 2), the guideway top (the lowest dense
    surface 2.5 m+ above ground within 4.5 m of the path), and any roof 4 m+ above it. A continuity
    walk accepts a bin within 0.6 m of the last accepted one, widening at 4 % across gaps."""
    sel = (pts[:, 0] > 540) & (pts[:, 0] < 1850)
    lo, hi = pts[sel].min(0) - 25, pts[sel].max(0) + 25
    box = (LON0 + math.degrees(lo[0] / (R * K)), LAT0 - math.degrees(hi[1] / R),
           LON0 + math.degrees(hi[0] / (R * K)), LAT0 - math.degrees(lo[1] / R))
    x, z, h, cls, gps = ept_points(box)
    idx = np.where(sel)[0]
    s, lat, d = locate(pts, cum, x, z, (int(idx.min()) - 1, int(idx.max()) + 1))
    keep = d < 25
    s, lat, h, cls, gps = s[keep], lat[keep], h[keep], cls[keep], gps[keep]
    rows = []
    for b0 in np.arange(S_RANGE[0], S_RANGE[1], BIN):
        m = (s >= b0) & (s < b0 + BIN)
        g = m & (cls == 2) & (np.abs(lat) < 20)
        ground = float(np.median(h[g])) if g.sum() >= 5 else None
        band = m & (np.abs(lat) < 4.5) & (cls != 2) & (cls != 7)
        top = roof = None
        n = int(band.sum())
        if n >= 8:
            hb = h[band]
            H, E = np.histogram(hb, bins=np.arange(hb.min(), hb.max() + 0.4, 0.2))
            peaks = sorted(E[i] + 0.1 for i in range(len(H)) if H[i] >= max(6, 0.15 * n))
            cand = [p for p in peaks if ground is None or p > ground + 2.5]
            if cand:
                top = cand[0]
                if cand[-1] > cand[0] + 4.5:
                    roof = cand[-1]
        rows.append({"s": round(float(b0 + BIN / 2), 1), "ground": ground, "top": top, "roof": roof, "n": n,
                     "_cand": cand if n >= 8 else []})
    last = last_s = last_roof = None
    for r in rows:
        cand = r.pop("_cand")
        r["status"] = "measured"
        if last is None:
            t = r["top"]
            if t is not None and r["ground"] is not None and t < r["ground"] + 20 and r["s"] > S_RANGE[0] + 40:
                last, last_s = t, r["s"]
            else:
                r["top"], r["status"] = None, "unresolved"
            continue
        # The surface nearest the expected guideway: within 0.6 m per bin, widening at 4 % across
        # unresolved bins. A surface 4 m+ above the guideway, or continuing a known roof, is a roof.
        allow = 0.6 + 0.04 * max(0.0, r["s"] - last_s - BIN)
        roofs = [p for p in cand if p > last + 4 or (last_roof is not None and abs(p - last_roof) <= 0.8)]
        decks = [p for p in cand if p not in roofs and abs(p - last) <= allow]
        r["roof"] = max(roofs) if roofs else None
        if r["roof"] is not None:
            last_roof = r["roof"]
        if decks:
            r["top"] = min(decks, key=lambda p: abs(p - last))
            last, last_s = r["top"], r["s"]
        else:
            r["top"] = None
            r["status"] = "under roof" if r["roof"] is not None else "gap"
    for r in rows:
        for k in ("ground", "top", "roof"):
            if r[k] is not None:
                r[k] = round(float(r[k]), 2)
        r["x"], r["z"] = at_s(pts, cum, r["s"])
    when = (float(gps.min()), float(gps.max()))
    return rows, when, int(keep.sum())


# ---- OSM ---------------------------------------------------------------------------------------

def osm():
    w, s, e, n = OSM_BBOX
    data = json.loads(fetch(f"https://api.openstreetmap.org/api/0.6/map.json?bbox={w},{s},{e},{n}", RAW / "osm_king_memorial.json"))
    nodes = {el["id"]: el for el in data["elements"] if el["type"] == "node"}
    ways = [el for el in data["elements"] if el["type"] == "way"]
    return nodes, ways, data.get("timestamp") or data.get("osm3s", {}).get("timestamp_osm_base")


def crossings(nodes, ways, pts, cum):
    out = {}
    for wy in ways:
        t = wy.get("tags", {})
        kind = t.get("highway") or ("rail" if t.get("railway") == "rail" else None)
        if not kind:
            continue
        ns = [nodes[i] for i in wy["nodes"] if i in nodes]
        for a, b in zip(ns, ns[1:]):
            ax, az = project(a["lon"], a["lat"])
            bx, bz = project(b["lon"], b["lat"])
            for j in range(len(pts) - 1):
                p, q = pts[j], pts[j + 1]
                if not (S_RANGE[0] - 40 <= cum[j] <= S_RANGE[1]):
                    continue
                den = (q[0] - p[0]) * (bz - az) - (q[1] - p[1]) * (bx - ax)
                if abs(den) < 1e-9:
                    continue
                tt = ((ax - p[0]) * (bz - az) - (az - p[1]) * (bx - ax)) / den
                uu = ((ax - p[0]) * (q[1] - p[1]) - (az - p[1]) * (q[0] - p[0])) / den
                if 0 <= tt <= 1 and 0 <= uu <= 1 and wy["id"] not in out:
                    out[wy["id"]] = {"s": round(float(cum[j] + tt * (cum[j + 1] - cum[j])), 1),
                                     "osm": f"osm:way/{wy['id']}", "version": wy["version"], "kind": kind,
                                     "name": t.get("name"),
                                     "tags": {k: t[k] for k in ("bridge", "tunnel", "layer", "level") if k in t}}
    return sorted(out.values(), key=lambda c: c["s"])


def station(nodes, ways, pts, cum):
    plats = []
    for wy in ways:
        t = wy.get("tags", {})
        if t.get("railway") == "platform":
            ring = [nodes[i] for i in wy["nodes"] if i in nodes]
            xz = np.array([project(n["lon"], n["lat"]) for n in ring])
            s, lat, _ = locate(pts, cum, xz[:, 0], xz[:, 1])
            if s.min() < S_RANGE[0] or s.max() > S_RANGE[1]:
                continue  # Georgia State's platforms fall inside the OSM box but not this stretch
            plats.append({"osm": f"osm:way/{wy['id']}", "version": wy["version"],
                          "tags": {k: t[k] for k in ("covered", "level", "layer", "shelter") if k in t},
                          "ring": [[n["lon"], n["lat"]] for n in ring],
                          "s": [round(float(s.min()), 1), round(float(s.max()), 1)],
                          "lateral": [round(float(lat.min()), 2), round(float(lat.max()), 2)]})
    tracks = []
    for wy in ways:
        t = wy.get("tags", {})
        if t.get("railway") == "subway":
            ns = [nodes[i] for i in wy["nodes"] if i in nodes]
            xz = np.array([project(n["lon"], n["lat"]) for n in ns])
            s, lat, _ = locate(pts, cum, xz[:, 0], xz[:, 1])
            inside = (s > S_RANGE[0]) & (s < S_RANGE[1])
            if inside.any():
                tracks.append({"osm": f"osm:way/{wy['id']}", "version": wy["version"], "name": t.get("name"),
                               "track": t.get("railway:track_ref"),
                               "tags": {k: t[k] for k in ("bridge", "layer", "level") if k in t},
                               "s": [round(float(s[inside].min()), 1), round(float(s[inside].max()), 1)],
                               "lateralMedian": round(float(np.median(lat[inside])), 2)})
    stops = [{"osm": f"osm:node/{i}", "tags": {k: n["tags"][k] for k in ("name", "railway", "public_transport", "railway:ref") if k in n["tags"]}}
             for i, n in nodes.items() if "King Memorial" in n.get("tags", {}).get("name", "")]
    return plats, sorted(tracks, key=lambda t: (t["track"] or "", t["s"][0])), stops


# ---- outputs -----------------------------------------------------------------------------------

def svg_profile(rows, xings, plats, cover_end, board_edge, path):
    W, H, L, T, B = 1100, 360, 60, 20, 300
    s0, s1 = S_RANGE
    zlo, zhi = 300.0, 335.0
    X = lambda s: L + (s - s0) / (s1 - s0) * (W - L - 20)
    Y = lambda z: B - (z - zlo) / (zhi - zlo) * (B - T)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="system-ui,sans-serif" font-size="11">',
           '<rect width="100%" height="100%" fill="#fbf9f4"/>']
    for z in range(int(zlo), int(zhi) + 1, 5):
        out.append(f'<line x1="{L}" x2="{W - 20}" y1="{Y(z):.1f}" y2="{Y(z):.1f}" stroke="#e4ded2"/><text x="{L - 6}" y="{Y(z) + 4:.1f}" text-anchor="end" fill="#6b665c">{z}</text>')
    for p in plats:
        out.append(f'<rect x="{X(p["s"][0]):.1f}" y="{T}" width="{X(p["s"][1]) - X(p["s"][0]):.1f}" height="{B - T}" fill="#e8e2f3" opacity=".6"/>')
    for edge, label, dy in ((board_edge, "Board edge (x 1000)", 12), (cover_end, "City profile ends", 26)):
        out.append(f'<line x1="{X(edge):.1f}" x2="{X(edge):.1f}" y1="{T}" y2="{B}" stroke="#b44" stroke-dasharray="4 3"/><text x="{X(edge) + 4:.1f}" y="{T + dy}" fill="#b44">{label}</text>')

    def poly(key, color, width, dash=""):
        segs, cur = [], []
        for r in rows:
            if r[key] is None:
                if cur:
                    segs.append(cur)
                cur = []
            else:
                cur.append(f"{X(r['s']):.1f},{Y(r[key]):.1f}")
        if cur:
            segs.append(cur)
        return "".join(f'<polyline points="{" ".join(sg)}" fill="none" stroke="{color}" stroke-width="{width}" {dash}/>' for sg in segs)

    out.append(poly("ground", "#8b5a2b", 1.5))
    out.append(poly("top", "#1474c4", 2.5))
    out.append(poly("roof", "#7a5bb5", 2, 'stroke-dasharray="5 3"'))
    for c in xings:
        if c["kind"] in ("footway", "service", "motorway_link"):
            continue
        out.append(f'<line x1="{X(c["s"]):.1f}" x2="{X(c["s"]):.1f}" y1="{B}" y2="{B + 6}" stroke="#333"/>')
    labels = [(8104.5, "Jesse Hill Jr Dr"), (8278, "Downtown Connector"), (8450, "CSX (6 tracks)"), (8655, "Hill St (under)"),
              (8935, "Grant St"), (9040, "King Memorial (canopy)")]
    for i, (s, t) in enumerate(labels):
        out.append(f'<text x="{X(s):.1f}" y="{B + 18 + (i % 2) * 12}" text-anchor="middle" fill="#2a2722">{t}</text>')
    out.append(f'<text x="{L}" y="{H - 8}" fill="#6b665c">NAVD88 m along MARTA path 155177 (s {int(s0)}–{int(s1)} m). Blue: guideway top (lidar, measured). '
               'Brown: ground (lidar class 2). Purple dashed: station canopy roof. Gaps: not measured.</text>')
    out.append("</svg>")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(out) + "\n")


def main():
    argparse.ArgumentParser(description=__doc__).parse_args()
    data = Path(ROOT) / "web/public/data"
    routes = json.loads((data / "ga/routes.json").read_text())
    scene = json.loads((data / "scene/downtown/scene.json").read_text())
    pts, cum = load_path(routes, REFERENCE_PATH)
    nodes, ways, osm_ts = osm()
    km = project(nodes[4172458489]["lon"], nodes[4172458489]["lat"])  # King Memorial station node
    coverage = []
    for pid in THROUGH:
        p, c = load_path(routes, f"marta:path:{pid}")
        s_km, _, d_km = locate(p, c, [km[0]], [km[1]])
        prof = scene["profiles"].get(f"marta:path:{pid}", {})
        pend = prof.get("s0", 0) + prof.get("step", 0) * (len(prof.get("z", [])) - 1) if prof else None
        coverage.append({"path": pid, "boardEdgeS": round(s_at_x(p, c, BOARD_EDGE_X), 1),
                         "profileS": [prof.get("s0"), round(pend, 1) if pend is not None else None],
                         "nearestToStationS": round(float(s_km[0]), 1), "nearestToStationM": round(float(d_km[0]), 1),
                         "eastmostX": round(float(p[:, 0].max()), 1)})
    rows, when, nlidar = guideway_profile(pts, cum)
    xings = crossings(nodes, ways, pts, cum)
    for c in xings:
        r = min(rows, key=lambda q: abs(q["s"] - c["s"]))
        c["guidewayTopNavd88M"] = r["top"]
        c["groundNavd88M"] = r["ground"]
        c["x"], c["z"] = at_s(pts, cum, c["s"])
        c["vertical"] = ("guideway top measured; deck depth and clearance unknown" if r["top"] is not None
                         else "guideway not measured here")
    plats, tracks, stops = station(nodes, ways, pts, cum)
    ref_cover = [sp for sp in scene["rail"]["paths"][REFERENCE_PATH] if sp["ev"] == "connector-viaduct"][0]
    measured = [r for r in rows if r["status"] == "measured"]
    result = {
        "version": 1,
        "note": "Prototype evidence for the King Memorial corridor; heights are NAVD88 metres, measured or null.",
        "referencePath": REFERENCE_PATH, "bins": BIN, "sRange": S_RANGE,
        "sources": {
            "lidar": {"ept": EPT, "flightGpsTime": when, "points": nlidar,
                      "datumCheck": "class-2 ground vs the pinned 1 m DEM: median +0.01 m (p10 -0.04, p90 +0.06)"},
            "osm": {"bbox": OSM_BBOX, "fetched": osm_ts},
            "gtfs": "web/public/data/ga/routes.json (staged MARTA GTFS)",
        },
        "coverage": coverage,
        "cityProfileEndS": ref_cover["s1"],
        "guideway": rows,
        "summary": {"measuredM": len(measured) * BIN,
                    "underRoofM": sum(BIN for r in rows if r["status"] == "under roof"),
                    "unknownM": sum(BIN for r in rows if r["status"] in ("gap", "unresolved"))},
        "crossings": xings,
        "station": {"platforms": plats, "stops": stops},
        "tracks": tracks,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "corridor.json").write_text(json.dumps(result, indent=1) + "\n")
    svg_profile(rows, xings, plats, ref_cover["s1"], coverage[0]["boardEdgeS"], SVG)
    print(f"corridor.json: {len((OUT / 'corridor.json').read_bytes()):,} bytes; {result['summary']}")


if __name__ == "__main__":
    main()
