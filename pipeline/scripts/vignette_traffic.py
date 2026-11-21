"""Traffic inputs for the vignette, from free federal data:

  * HPMS (FHWA Highway Performance Monitoring System, current national map service):
    annual average daily traffic (AADT), truck AADT, lanes and speed limit per road segment.
  * TMAS (FHWA Travel Monitoring Analysis System, 2023 hourly volumes): the hourly shape of
    a day at continuous count station GA 000009, on the Downtown Connector just north of the
    vignette. Weekday and weekend, as the share of daily volume in each hour.

Each Overture road run in vignette.json gets the nearest HPMS segment with a similar bearing.
Output: web/public/data/scene/vignette-east/traffic.json

    python3 pipeline/scripts/vignette_traffic.py
"""
import json
import math
import os
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VDIR = os.path.join(ROOT, "web", "public", "data", "scene", "vignette-east")
LON0, LAT0 = -84.3916, 33.7539
R = 6_371_008.8
K = math.cos(math.radians(LAT0))
HPMS = "https://services.arcgis.com/xOi1kZaI0eWDREZv/ArcGIS/rest/services/HPMS_National_Current/FeatureServer/0/query"
TMAS_2023 = "https://data.transportation.gov/resource/kv7k-jsg5.json"
STATION = "000009"  # GA, Downtown Connector at Freedom Parkway


def project(lon, lat):
    return ((lon - LON0) * math.radians(1) * R * K, -(lat - LAT0) * math.radians(1) * R)


def unproject(x, z):
    return (LON0 + x / (math.radians(1) * R * K), LAT0 - z / (math.radians(1) * R))


def get(url, params):
    req = urllib.request.Request(url + "?" + urllib.parse.urlencode(params), headers={"User-Agent": "sim-atlanta-pipeline"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def hpms_segments(b, pad=60):
    lon0, lat1 = unproject(b["minX"] - pad, b["minZ"] - pad)
    lon1, lat0 = unproject(b["maxX"] + pad, b["maxZ"] + pad)
    out, offset = [], 0
    while True:
        d = get(HPMS, {
            "where": "1=1",
            "geometry": f"{lon0},{lat0},{lon1},{lat1}",
            "geometryType": "esriGeometryEnvelope",
            "inSR": 4326, "outSR": 4326,
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "RouteName,AADT,AADT_SINGLE_UNIT,AADT_COMBINATION,THROUGH_LANES,SPEED_LIMIT,F_SYSTEM,FACILITY_TYPE",
            "resultOffset": offset, "resultRecordCount": 1000, "f": "json",
        })
        feats = d.get("features", [])
        for f in feats:
            a = f["attributes"]
            if not a.get("AADT"):
                continue
            for path in f["geometry"].get("paths", []):
                out.append({**a, "pts": [project(lon, lat) for lon, lat in path]})
        if not d.get("exceededTransferLimit") or not feats:
            return out
        offset += len(feats)


def seg_dist(p, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dz * dz or 1
    t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2))
    return math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz), math.atan2(dz, dx)


def match(run, segs):
    """Nearest HPMS segment to the run's samples, requiring a similar bearing (either way)."""
    pts = run["pts"]
    votes = {}
    for i in range(1, len(pts)):
        a, c = pts[i - 1], pts[i]
        mid = ((a[0] + c[0]) / 2, (a[1] + c[1]) / 2)
        brg = math.atan2(c[1] - a[1], c[0] - a[0])
        best = (18.0, None)
        for k, s in enumerate(segs):
            sp = s["pts"]
            for j in range(1, len(sp)):
                d, sb = seg_dist(mid, sp[j - 1], sp[j])
                if d >= best[0]:
                    continue
                diff = abs((brg - sb + math.pi / 2) % math.pi - math.pi / 2)
                if diff < math.radians(25):
                    best = (d, k)
        if best[1] is not None:
            votes[best[1]] = votes.get(best[1], 0) + math.hypot(c[0] - a[0], c[1] - a[1])
    return max(votes, key=votes.get) if votes else None


def hourly_profile():
    rows = get(TMAS_2023, {
        "$select": "week_day,hours,sum(veh_count) as v",
        "$where": f"state_cd='13' AND station_id='{STATION}'",
        "$group": "week_day,hours", "$limit": 100,
    })
    prof = {}
    for kind in ("Weekday", "Weekend"):
        hrs = {r["hours"]: float(r["v"]) for r in rows if r["week_day"] == kind}
        tot = sum(hrs.values())
        prof[kind.lower()] = [round(hrs.get(f"{h:02d}:00", 0) / tot, 5) for h in range(24)]
    return prof


def main():
    vd = json.load(open(os.path.join(VDIR, "vignette.json")))
    segs = hpms_segments(vd["bounds"])
    print(f"HPMS segments: {len(segs)}")
    roads = []
    matched = 0
    for i, run in enumerate(vd["roads"]):
        if run["cls"] in ("footway", "steps", "cycleway", "pedestrian"):
            continue
        k = match(run, segs)
        if k is None:
            continue
        s = segs[k]
        matched += 1
        trucks = (s.get("AADT_SINGLE_UNIT") or 0) + (s.get("AADT_COMBINATION") or 0)
        roads.append({
            "run": i,
            "name": s.get("RouteName"),
            "aadt": s["AADT"],
            "truckShare": round(min(0.5, trucks / s["AADT"]), 3) if s["AADT"] else 0,
            "lanes": s.get("THROUGH_LANES"),
            "speedMph": s.get("SPEED_LIMIT"),
            "oneWay": s.get("FACILITY_TYPE") == 1,
        })
    prof = hourly_profile()
    out = {
        "sources": {
            "volumes": "FHWA HPMS (current national release): AADT, truck AADT, lanes, speed limit",
            "hourly": f"FHWA TMAS 2023 hourly volumes, Georgia station {STATION} (Downtown Connector)",
        },
        "tier": "inferred",
        "note": "Typical traffic for the hour and day type, not live.",
        "hourly": prof,
        "roads": roads,
    }
    json.dump(out, open(os.path.join(VDIR, "traffic.json"), "w"), separators=(",", ":"))
    drivable = sum(1 for r in vd["roads"] if r["cls"] not in ("footway", "steps", "cycleway", "pedestrian"))
    print(f"matched {matched}/{drivable} drivable runs")
    for r in sorted(roads, key=lambda r: -r["aadt"])[:6]:
        print("  ", r)
    peak = max(range(24), key=lambda h: prof["weekday"][h])
    print(f"weekday peak hour {peak}:00 share {prof['weekday'][peak]}, 3am {prof['weekday'][3]}")


if __name__ == "__main__":
    main()
