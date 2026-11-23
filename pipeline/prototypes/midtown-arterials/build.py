"""Midtown arterial runs for City traffic, matched the same way as downtown's arterials.json.

Candidates are the drawn row-context roads on Midtown's named arterials (Peachtree, West
Peachtree, Spring, Juniper, Piedmont, 10th, 14th, 17th, North Avenue), at grade or on a
bridge, never in a tunnel. Each run takes its travel direction from the OSM way it was
drawn from (shared vertices, oneway tag), and its volume from the FHWA HPMS record that wins
a length-weighted vote of 5 m samples (within 15 m and 20 degrees), with downtown's tests:
F_SYSTEM 3/4, matching name, >= 60 % coverage, and OSM direction agreeing with HPMS
FACILITY_TYPE (a one-way carriageway of a two-way record carries half, as downtown).

    .venv/bin/python pipeline/prototypes/midtown-arterials/build.py [--refresh]

HPMS is cached to data/raw/hpms_midtown.json. Output: web/src/city/fixtures/midtown-arterials.json.
"""
import gzip
import json
import math
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "scripts"))
import arterials as A  # noqa: E402

BOARD = HERE.parent / "square-board"
OUT = HERE.parents[2] / "web/src/city/fixtures/midtown-arterials.json"
REPORT = HERE / "report.json"
CACHE = Path(A.RAW) / "hpms_midtown.json"
NAMES = re.compile(r"^(?:(?:West )?Peachtree (?:Street|Road)|Spring Street|Juniper Street|Piedmont Avenue|(?:10th|14th|17th) Street|North Avenue)\b")
CLASSES = {"primary", "secondary", "tertiary", "trunk"}
rows = json.loads((BOARD / "midtown-rows.json").read_text())


def hpms(refresh):
    if CACHE.exists() and not refresh:
        return json.loads(CACHE.read_text())
    lon0, lat1 = A.unproject(-1000 - 60, min(r["minZ"] for r in rows.values()) - 60)
    lon1, lat0 = A.unproject(1800 + 60, max(r["maxZ"] for r in rows.values()) + 60)
    out, offset = [], 0
    while True:
        q = {"where": "1=1", "geometry": f"{lon0},{lat0},{lon1},{lat1}", "geometryType": "esriGeometryEnvelope",
             "inSR": 4326, "outSR": 4326, "spatialRel": "esriSpatialRelIntersects", "outFields": A.FIELDS,
             "resultOffset": offset, "resultRecordCount": 1000, "f": "json"}
        req = urllib.request.Request(A.HPMS + "?" + urllib.parse.urlencode(q), headers={"User-Agent": "sim-atlanta-pipeline"})
        d = json.load(urllib.request.urlopen(req, timeout=120))
        if "error" in d or "features" not in d:
            raise RuntimeError(f"HPMS query failed: {d.get('error') or d}")
        for f in d["features"]:
            for path in f["geometry"].get("paths", []):
                out.append({**f["attributes"], "lonlat": path})
        if not d.get("exceededTransferLimit") or not d["features"]:
            break
        offset += len(d["features"])
    if not out:
        raise RuntimeError("HPMS returned no segments for Midtown; not caching an empty result")
    meta = json.load(urllib.request.urlopen(urllib.request.Request(A.HPMS.rsplit("/query", 1)[0] + "?f=json",
                                                                   headers={"User-Agent": "sim-atlanta-pipeline"}), timeout=60))
    data = {"service": A.HPMS, "meta": {"name": meta.get("name"), "dataLastEditDate": (meta.get("editingInfo") or {}).get("dataLastEditDate")}, "segments": out}
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(data))
    return data


def osm_direction(row):
    """Directed OSM edges keyed by projected vertex pair: 'forward' (node order), 'reverse' or 'both'."""
    scale = math.pi * 6371008.8 / 180
    with gzip.open(BOARD / "source" / (row + ".json.gz")) as f:
        els = json.load(f)["elements"]
    nodes = {e["id"]: (round((e["lon"] + 84.3916) * scale * math.cos(math.radians(33.7539)), 2), round((33.7539 - e["lat"]) * scale, 2))
             for e in els if e["type"] == "node"}
    edges = {}
    flip = {"forward": "reverse", "reverse": "forward", "both": "both", "conditional": "conditional"}
    for e in els:
        t = e.get("tags", {})
        if e["type"] != "way" or t.get("highway") not in CLASSES:
            continue
        ow = t.get("oneway")
        # Reversible, alternating and time-conditional one-ways are not plain directions.
        allow = ("conditional" if any(k.startswith("oneway:conditional") for k in t) or ow in ("reversible", "alternating") else
                 "forward" if ow in ("yes", "true", "1") else "reverse" if ow == "-1" else
                 "both" if ow in (None, "no", "false", "0") else "conditional")
        pts = [nodes[n] for n in e["nodes"] if n in nodes]
        for a, b in zip(pts, pts[1:]):
            for key, value in (((a, b), allow), ((b, a), flip[allow])):
                # A vertex pair claimed by two ways with different directions is ambiguous.
                edges[key] = value if edges.get(key, value) == value else "conflict"
    return edges


def names(seg):
    """Every route name on a record: HPMS lists co-signed names separated by ';'."""
    return {A.norm(part) for part in (seg.get("RouteName") or "").split(";") if part.strip()}


def confirmed_routes(segs):
    """ROUTE_IDs whose named records all carry one shared street name. An unnamed piece of
    such a route (e.g. '9SO' beside 'Spring St;9SO') inherits that name; a route signed
    over several streets (SR 9 on Peachtree, 14th and West Peachtree) proves nothing."""
    by = {}
    for s in segs:
        if names(s) and s.get("ROUTE_ID"):
            by.setdefault(s["ROUTE_ID"], []).append(names(s))
    out = {}
    for rid, sets in by.items():
        # Route codes such as '9so' are not street names.
        streets = {n for names_ in sets for n in names_ if not re.match(r"^\d", n)}
        if len(streets) == 1:
            out[rid] = streets.pop()
    return out


def main(refresh=False):
    data = hpms(refresh)
    segs = data["segments"]
    routes = confirmed_routes(segs)
    hp = [(k, [A.project(lon, lat) for lon, lat in s["lonlat"]]) for k, s in enumerate(segs) if s.get("AADT")]
    runs, rejected, nodes = [], [], {}

    def node(pt):
        key = (round(pt[0] * 2) / 2, round(pt[1] * 2) / 2)
        return nodes.setdefault(key, f"m{len(nodes)}")

    for row in rows:
        ctx = json.loads((BOARD / row / "context.json").read_text())
        edges = osm_direction(row)
        for road in ctx["roads"]:
            name = road.get("name") or ""
            if road["cls"] not in CLASSES or road.get("tunnel") or not NAMES.match(name) or len(road["pts"]) < 2:
                continue
            pts = [tuple(p) for p in road["pts"]]
            dirs = {edges[(a, b)] for a, b in zip(pts, pts[1:]) if (a, b) in edges}
            base = {"row": row, "name": name, "a": list(pts[0]), "b": list(pts[-1])}
            if len(dirs) != 1 or dirs & {"conditional", "conflict"}:
                reason = ("no-osm-direction" if not dirs else "conditional-oneway" if dirs == {"conditional"} else "mixed-direction")
                rejected.append({**base, "reason": reason})
                continue
            allow = dirs.pop()
            smp = A.samples(road["pts"])
            total = sum(w for _, _, w in smp) or 1.0
            votes = {}
            for p, d, w in smp:
                hit = A.best_line(p, d, hp, A.MAX_D)
                if hit:
                    votes[hit[0]] = votes.get(hit[0], 0.0) + w
            if not votes:
                rejected.append({**base, "reason": "no-hpms"})
                continue
            hk = max(votes, key=votes.get)
            s = segs[hk]
            rid = s.get("ROUTE_ID")
            cover = max(votes[hk], sum(w for k, w in votes.items() if rid and segs[k].get("ROUTE_ID") == rid)) / total
            hp_oneway = s.get("FACILITY_TYPE") == 1
            reason = (f"f_system-{s.get('F_SYSTEM')}" if s.get("F_SYSTEM") not in (3, 4) else
                      "facility-type" if s.get("FACILITY_TYPE") not in (1, 2) else
                      "name" if A.norm(name) not in names(s) and routes.get(s.get("ROUTE_ID")) != A.norm(name) else
                      "coverage" if cover < A.MIN_COVER else
                      "direction-disagree" if allow == "both" and hp_oneway else None)
            if reason:
                rejected.append({**base, "reason": reason, "hpms": s.get("RouteName")})
                continue
            aadt, lanes = int(s["AADT"]), int(s.get("THROUGH_LANES") or 0)
            if allow == "both":
                per = {"forward": round(aadt / 2), "reverse": aadt - round(aadt / 2)}
                ln = {"forward": (lanes + 1) // 2, "reverse": lanes // 2} if lanes >= 2 else {}
                basis = "two-way-split"
            elif not hp_oneway:
                per, ln, basis = {allow: round(aadt / 2)}, ({allow: lanes // 2} if lanes >= 2 else {}), "carriageway"
            else:
                per, ln, basis = {allow: aadt}, ({allow: lanes} if lanes else {}), "one-way"
            trucks = (s.get("AADT_SINGLE_UNIT") or 0) + (s.get("AADT_COMBINATION") or 0)
            runs.append({**base, "from": node(pts[0]), "to": node(pts[-1]), "allow": allow, "aadt": per, "lanes": ln,
                         "aadtBasis": basis, "truckShare": round(min(0.5, trucks / aadt), 3) if aadt else 0,
                         "speedMph": s.get("SPEED_LIMIT") or None, "fSystem": s.get("F_SYSTEM"),
                         "hpms": {"route": s.get("RouteName"), "year": s.get("DATA_YEAR"), "aadtDate": s.get("AADT_VD")}})
    meta = {"version": 1, "tier": "inferred",
            "note": "Typical traffic (HPMS AADT, shaped by traffic.json's hourly profile), not live. Vehicle positions are illustrative.",
            "sources": {"hpms": f"{data['meta'].get('name')} (data edited {data['meta'].get('dataLastEditDate')})",
                        "osm": "Archived OSM row extracts (oneway), (c) OpenStreetMap contributors, ODbL"}}
    # The client gets only what it reads; provenance and rejections stay in the report.
    keep = ("row", "name", "a", "b", "from", "to", "allow", "aadt", "speedMph", "truckShare")
    OUT.write_text(json.dumps({**meta, "runs": [{k: r[k] for k in keep} for r in runs]}, separators=(",", ":")) + "\n")
    REPORT.write_text(json.dumps({**meta, "runs": runs, "rejected": rejected}, indent=1) + "\n")
    by = {}
    for r in runs:
        by.setdefault(A.norm(r["name"]), []).append(r)
    print(len(runs), "runs matched,", len(rejected), "rejected")
    for k, v in sorted(by.items()):
        print(f"  {k}: {len(v)} runs, AADT {min(sum(r['aadt'].values()) for r in v)}-{max(sum(r['aadt'].values()) for r in v)}, {sorted({r['allow'] for r in v})}")
    reasons = {}
    for r in rejected:
        reasons[(A.norm(r['name']), r['reason'])] = reasons.get((A.norm(r['name']), r['reason']), 0) + 1
    for k, v in sorted(reasons.items()):
        print("  rejected", k, v)


if __name__ == "__main__":
    main("--refresh" in sys.argv)
