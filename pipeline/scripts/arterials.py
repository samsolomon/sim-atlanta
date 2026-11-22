"""Downtown major arterials for City traffic: HPMS volumes matched to the drawn roads, with
direction from Overture's one-way restrictions.

Inputs (all free, no keys):
  * web/public/data/scene/downtown/vignette.json  (City's drawn roads; run = index in `roads`)
  * data/raw/overture_downtown_roads.geojson      (Overture segments: id, name, class,
                                                  access_restrictions; pipeline/scripts/extract_overture.py roads)
  * FHWA HPMS current national map service       (AADT, trucks, lanes, speed, F_SYSTEM,
                                                  FACILITY_TYPE), cached to data/raw/hpms_downtown.json

A run is a major arterial only when ALL of these hold, otherwise it is listed in coverage.rejected:
  * Overture class primary/secondary/trunk (at grade or bridge, never tunnel);
  * the winning HPMS segment is F_SYSTEM 3 or 4 (principal / minor arterial);
  * names agree after normalisation (Street/St, Northeast/NE, ...);
  * ≥ 60 % of the run's 5 m samples lie ≤ 15 m from it with bearings within 20°;
  * Overture's one-way heading and HPMS FACILITY_TYPE agree (1 = one-way, 2 = two-way).

Output: web/public/data/scene/downtown/arterials.json (contract in web/src/city/arterials.ts).

    .venv/bin/python pipeline/scripts/arterials.py [--refresh]
"""
import json
import math
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCENE = os.path.join(ROOT, "web", "public", "data", "scene", "downtown")
RAW = os.path.join(ROOT, "data", "raw")
LON0, LAT0 = -84.3916, 33.7539
R = 6_371_008.8
K = math.cos(math.radians(LAT0))
HPMS = "https://services.arcgis.com/xOi1kZaI0eWDREZv/ArcGIS/rest/services/HPMS_National_Current/FeatureServer/0/query"
FIELDS = "RouteName,RouteNumber,RouteSigning,ROUTE_ID,DATA_YEAR,AADT,AADT_VD,AADT_SINGLE_UNIT,AADT_COMBINATION,THROUGH_LANES,DIR_THROUGH_LANES,SPEED_LIMIT,F_SYSTEM,FACILITY_TYPE,STRUCTURE_TYPE"
CLASSES = {"primary", "secondary", "trunk"}
MAX_D, MAX_BEARING, MIN_COVER, STEP = 15.0, 20.0, 0.6, 5.0


def project(lon, lat):
    return ((lon - LON0) * math.radians(1) * R * K, -(lat - LAT0) * math.radians(1) * R)


def unproject(x, z):
    return (LON0 + x / (math.radians(1) * R * K), LAT0 - z / (math.radians(1) * R))


def hpms_segments(b, refresh=False, pad=60):
    cache = os.path.join(RAW, "hpms_downtown.json")
    if os.path.exists(cache) and not refresh:
        return json.load(open(cache))["segments"]
    lon0, lat1 = unproject(b["minX"] - pad, b["minZ"] - pad)
    lon1, lat0 = unproject(b["maxX"] + pad, b["maxZ"] + pad)
    out, offset = [], 0
    while True:
        q = {"where": "1=1", "geometry": f"{lon0},{lat0},{lon1},{lat1}", "geometryType": "esriGeometryEnvelope",
             "inSR": 4326, "outSR": 4326, "spatialRel": "esriSpatialRelIntersects", "outFields": FIELDS,
             "resultOffset": offset, "resultRecordCount": 1000, "f": "json"}
        req = urllib.request.Request(HPMS + "?" + urllib.parse.urlencode(q), headers={"User-Agent": "sim-atlanta-pipeline"})
        d = json.load(urllib.request.urlopen(req, timeout=120))
        if "error" in d or "features" not in d:
            # ArcGIS reports failures in a 200 body; never cache those as "no roads".
            raise RuntimeError(f"HPMS query failed: {d.get('error') or d}")
        feats = d["features"]
        for f in feats:
            for path in f["geometry"].get("paths", []):
                out.append({**f["attributes"], "lonlat": path})
        if not d.get("exceededTransferLimit") or not feats:
            break
        offset += len(feats)
    if not out:
        raise RuntimeError("HPMS returned no segments for the downtown board; not caching an empty result")
    os.makedirs(RAW, exist_ok=True)
    meta = json.load(urllib.request.urlopen(urllib.request.Request(HPMS.rsplit("/query", 1)[0] + "?f=json", headers={"User-Agent": "sim-atlanta-pipeline"}), timeout=60))
    json.dump({"service": HPMS, "fields": FIELDS, "meta": {"name": meta.get("name"), "dataLastEditDate": (meta.get("editingInfo") or {}).get("dataLastEditDate")},
               "segments": out}, open(cache, "w"))
    return out


ABBR = {"street": "st", "avenue": "ave", "drive": "dr", "boulevard": "blvd", "road": "rd", "place": "pl",
        "parkway": "pkwy", "circle": "cir", "lane": "ln", "court": "ct", "terrace": "ter", "way": "way",
        "northeast": "ne", "northwest": "nw", "southeast": "se", "southwest": "sw",
        "north": "n", "south": "s", "east": "e", "west": "w", "junior": "jr", "saint": "st",
        "martin": "martin", "luther": "luther", "king": "king"}
DIRS = {"ne", "nw", "se", "sw", "n", "s", "e", "w"}
# Sourced renames only (HPMS 2024 still carries the old name):
#   Central Ave SW (Decatur St SE to Pryor St SW) -> Shirley Clarke Franklin Blvd, Atlanta City
#   Council, adopted 2025-02-03 (citycouncil.atlantaga.gov; ATLDOT "Streets with Stories").
ALIASES = {"shirley clarke franklin blvd": "central ave", "shirley c franklin blvd": "central ave"}
# Unnamed HPMS records identified by route number instead (RouteSigning 3 = U.S. route):
#   US 19 (with US 41) follows Northside Drive through the downtown board.
ROUTE_NAMES = {(3, "19"): "northside dr"}


def hpms_name(seg):
    return norm(seg.get("RouteName")) or ROUTE_NAMES.get((seg.get("RouteSigning"), str(seg.get("RouteNumber") or "")), "")


def norm(name):
    """'Peachtree Street Northeast' and 'Peachtree St NE;' both become 'peachtree st'."""
    if not name:
        return ""
    words = re.sub(r"[^a-z0-9 ]", " ", name.lower().split(";")[0]).split()
    words = [ABBR.get(w, w) for w in words]
    while words and words[-1] in DIRS:
        words.pop()
    out = " ".join(words)
    return ALIASES.get(out, out)


def seg_near(p, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dz * dz or 1.0
    t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2))
    return math.hypot(a[0] + t * dx - p[0], a[1] + t * dz - p[1]), (dx, dz)


def samples(pts, step=STEP):
    out = []
    for i in range(1, len(pts)):
        a, c = pts[i - 1], pts[i]
        L = math.hypot(c[0] - a[0], c[1] - a[1])
        n = max(1, int(L // step))
        for j in range(n):
            t = (j + 0.5) / n
            out.append(((a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t), (c[0] - a[0], c[1] - a[1]), L / n))
    return out


def angle(u, v):
    """Unsigned angle between two directions, degrees (0..180)."""
    cu = math.hypot(*u) * math.hypot(*v) or 1.0
    return math.degrees(math.acos(max(-1.0, min(1.0, (u[0] * v[0] + u[1] * v[1]) / cu))))


def best_line(p, d, lines, max_d):
    """(index, distance, signed alignment) of the nearest line within max_d whose bearing is
    within MAX_BEARING of d (either way). alignment > 0 when it runs the same way as d."""
    best = None
    for k, pts in lines:
        for i in range(1, len(pts)):
            dist, sd = seg_near(p, pts[i - 1], pts[i])
            if dist > max_d or (best and dist >= best[1]):
                continue
            ang = angle(d, sd)
            if min(ang, 180 - ang) > MAX_BEARING:
                continue
            best = (k, dist, 1 if ang < 90 else -1)
    return best


def oneway(props):
    """'forward' / 'reverse' along the Overture geometry, 'both', or None if not resolvable."""
    ar = props.get("access_restrictions")
    if isinstance(ar, str):
        ar = json.loads(ar)
    heading = set()
    for r in ar or []:
        w = r.get("when") or {}
        if r.get("access_type") != "denied" or not w.get("heading"):
            continue
        if r.get("between") or w.get("mode") or w.get("vehicle") or w.get("during") or w.get("using") or w.get("recognized"):
            return None  # partial or conditional restriction: not a plain one-way
        heading.add(w["heading"])
    if not heading:
        return "both"
    if heading == {"backward"}:
        return "forward"
    if heading == {"forward"}:
        return "reverse"
    return None


def main(refresh=False):
    vd = json.load(open(os.path.join(SCENE, "vignette.json")))
    ov = json.load(open(os.path.join(RAW, "overture_downtown_roads.geojson")))
    segs = hpms_segments(vd["bounds"], refresh)
    segs_meta = json.load(open(os.path.join(RAW, "hpms_downtown.json"))).get("meta", {})
    hp = [(k, [project(lon, lat) for lon, lat in s["lonlat"]]) for k, s in enumerate(segs) if s.get("AADT")]
    ovl = []
    for f in ov["features"]:
        p = f["properties"]
        if p.get("class") not in CLASSES:
            continue
        g = f["geometry"]
        for line in (g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]):
            ovl.append((len(ovl), [project(lon, lat) for lon, lat in line], p))
    ov_lines = [(k, pts) for k, pts, _ in ovl]

    corridors, rejected, candidates = {}, [], 0
    nodes = {}

    def node(pt):
        key = (round(pt[0] * 2) / 2, round(pt[1] * 2) / 2)
        if key not in nodes:
            nodes[key] = f"n{len(nodes)}"
        return nodes[key]

    for run, road in enumerate(vd["roads"]):
        if road["cls"] not in CLASSES or road.get("tunnel") or len(road["pts"]) < 2:
            continue
        candidates += 1
        smp = samples(road["pts"])
        total = sum(w for _, _, w in smp) or 1.0
        # Overture segment the run was drawn from (it lies on it), with orientation.
        ovotes = {}
        for p, d, w in smp:
            hit = best_line(p, d, ov_lines, 2.0)
            if hit:
                v = ovotes.setdefault(hit[0], [0.0, 0.0])
                v[0] += w
                v[1] += w * hit[2]
        if not ovotes:
            rejected.append({"run": run, "reason": "no-overture"})
            continue
        ok_, (ow, osign) = max(ovotes.items(), key=lambda kv: kv[1][0])
        oprops = ovl[ok_][2]
        # HPMS segment by length-weighted votes, arterials only.
        hvotes, dists, angs = {}, [], []
        for p, d, w in smp:
            hit = best_line(p, d, hp, MAX_D)
            if hit:
                hvotes[hit[0]] = hvotes.get(hit[0], 0.0) + w
        if not hvotes:
            rejected.append({"run": run, "reason": "no-hpms"})
            continue
        hk = max(hvotes, key=hvotes.get)
        s = segs[hk]
        cover = hvotes[hk] / total
        # Same route name continues across HPMS segment breaks: count its coverage together.
        same = sum(w for k2, w in hvotes.items() if hpms_name(segs[k2]) == hpms_name(s))
        cover = max(cover, same / total)
        reason = None
        if s.get("F_SYSTEM") not in (3, 4):
            reason = f"f_system-{s.get('F_SYSTEM')}"
        elif not hpms_name(s):
            reason = "hpms-unnamed"  # no RouteName and no sourced route-number crosswalk
        elif hpms_name(s) != norm(oprops.get("name") or road.get("name")):
            reason = "name"
        elif cover < MIN_COVER:
            reason = "coverage"
        ow_dir = oneway(oprops)
        hp_oneway = s.get("FACILITY_TYPE") == 1
        if not reason and ow_dir is None:
            reason = "conditional-oneway"
        divided = False
        if not reason and (ow_dir != "both") != hp_oneway:
            if ow_dir != "both" and not hp_oneway:
                divided = True  # one carriageway of a road HPMS inventories once (two-way): paired below
            else:
                reason = "direction-disagree"
        if reason:
            rejected.append({"run": run, "reason": reason, "name": road.get("name"), "hpms": s.get("RouteName")})
            continue
        # Direction relative to the run's own point order.
        same_way = osign >= 0
        allow = "both" if ow_dir == "both" else ("forward" if (ow_dir == "forward") == same_way else "reverse")
        aadt, lanes = int(s["AADT"]), int(s.get("THROUGH_LANES") or 0)
        # Lanes are published only when HPMS supports a count for that direction: a missing
        # THROUGH_LANES, or a single lane shared by two directions, leaves them out (never 0 or a guess).
        if allow == "both":
            per = {"forward": round(aadt / 2), "reverse": aadt - round(aadt / 2)}
            ln = {"forward": (lanes + 1) // 2, "reverse": lanes // 2} if lanes >= 2 else {}
            basis = "two-way-split"
        elif divided:
            # HPMS counts both directions on one record; each carriageway carries one direction's half.
            per = {allow: round(aadt / 2)}
            ln = {allow: lanes // 2} if lanes >= 2 else {}
            basis = "carriageway"
        else:
            per = {allow: aadt}
            ln = {allow: lanes} if lanes >= 1 else {}
            basis = "one-way"
        # Distances and bearings to the chosen HPMS segment, for provenance.
        for p, d, w in smp:
            hit = best_line(p, d, [(hk, hp[[k for k, _ in hp].index(hk)][1])], MAX_D)
            if hit:
                dists.append(hit[1])
        trucks = (s.get("AADT_SINGLE_UNIT") or 0) + (s.get("AADT_COMBINATION") or 0)
        pts = road["pts"]
        L = sum(math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) for i in range(1, len(pts)))
        cid = re.sub(r"[^a-z0-9]+", "-", hpms_name(s)).strip("-")
        label = (s.get("RouteName") or "").split(";")[0].strip() or (oprops.get("name") or road.get("name") or cid)
        c = corridors.setdefault(cid, {"id": cid, "name": label,
                                       "fSystem": s.get("F_SYSTEM"), "class": road["cls"], "runs": []})
        c["runs"].append({
            "run": run, "overture": oprops.get("id"),
            "a": [round(pts[0][0], 2), round(pts[0][1], 2)], "b": [round(pts[-1][0], 2), round(pts[-1][1], 2)],
            "from": node(pts[0]), "to": node(pts[-1]), "lenM": round(L, 1),
            "bridge": bool(road.get("bridge")),
            "allow": allow, "lanes": ln, "aadt": per, "aadtBasis": basis,
            "truckShare": round(min(0.5, trucks / aadt), 3) if aadt else 0,
            "speedMph": s.get("SPEED_LIMIT") or None,
            "_hk": hk,
            "match": {"hpmsDistM": round(sorted(dists)[len(dists) // 2], 1) if dists else None,
                      "name": True, "by": "route-name" if norm(s.get("RouteName")) else "route-number",
                      "coverage": round(cover, 2), "hpmsYear": s.get("DATA_YEAR"), "aadtDate": s.get("AADT_VD"),
                      "hpmsRoute": s.get("ROUTE_ID")},
        })
    # A carriageway is only accepted when the opposite carriageway of the same HPMS record is also
    # drawn; otherwise HPMS's two-way total can't be split defensibly.
    by_seg = {}
    for c in corridors.values():
        for r in c["runs"]:
            if r["aadtBasis"] == "carriageway":
                by_seg.setdefault(r["_hk"], []).append(r)
    for c in corridors.values():
        keep = []
        for r in c["runs"]:
            if r["aadtBasis"] == "carriageway":
                mates = by_seg[r["_hk"]]
                # Opposite travel in scene terms: compare the run's permitted heading vectors.
                def heading(x):
                    sx, sz = x["b"][0] - x["a"][0], x["b"][1] - x["a"][1]
                    return (sx, sz) if x["allow"] == "forward" else (-sx, -sz)
                if not any(m is not r and angle(heading(m), heading(r)) > 120 for m in mates):
                    rejected.append({"run": r["run"], "reason": "unpaired-carriageway", "name": c["name"]})
                    continue
            keep.append(r)
        c["runs"] = keep
    for c in corridors.values():
        for r in c["runs"]:
            r.pop("_hk", None)
    corridors = {k: c for k, c in corridors.items() if c["runs"]}
    import datetime
    stamp = segs_meta.get("dataLastEditDate")
    edited = datetime.datetime.fromtimestamp(stamp / 1000, datetime.timezone.utc).date().isoformat() if stamp else "unknown"
    years = sorted({r["match"]["hpmsYear"] for c in corridors.values() for r in c["runs"] if r["match"]["hpmsYear"]})
    out = {
        "version": 1,
        "tier": "inferred",
        "note": "Typical traffic (HPMS AADT, shaped by traffic.json's TMAS hourly profile), not live.",
        "sources": {
            "hpms": f"FHWA HPMS {segs_meta.get('name', 'HPMS_National_Current')} (DATA_YEAR {', '.join(map(str, years))};"
                    f" AADT value dates {', '.join(sorted({str(r['match']['aadtDate']) for c in corridors.values() for r in c['runs']}))};"
                    f" service data edited {edited}), services.arcgis.com HPMS_National_Current; cached data/raw/hpms_downtown.json",
            "overture": f"Overture Maps {ov.get('release') or '(release unknown)'} transportation segments (name, class, access_restrictions heading)",
            "geometry": "vignette.json roads (run = index)",
        },
        "board": {"roads": len(vd["roads"])},
        "nodes": {v: [k[0], k[1]] for k, v in nodes.items()},
        "corridors": sorted(corridors.values(), key=lambda c: c["id"]),
        "coverage": {"candidates": candidates, "matched": sum(len(c["runs"]) for c in corridors.values()),
                     "rejected": rejected},
    }
    json.dump(out, open(os.path.join(SCENE, "arterials.json"), "w"), separators=(",", ":"))
    from collections import Counter
    print(f"candidates {candidates}, matched {out['coverage']['matched']} in {len(corridors)} corridors")
    print("rejections", Counter(r["reason"] for r in rejected).most_common())
    for c in out["corridors"]:
        al = Counter(r["allow"] for r in c["runs"])
        print(f"  {c['id']:<32} f{c['fSystem']} runs {len(c['runs']):>3} {dict(al)} aadt {sorted(set(sum(r['aadt'].values()) for r in c['runs']))[:4]}")


if __name__ == "__main__":
    main("--refresh" in sys.argv)
