"""Bake the private northern arterial extension from two mounted contexts and their preclip OSM extracts.

Usage: .venv/bin/python build.py BOARD_DIR HPMS_JSON OUTPUT_DIR
BOARD_DIR holds <row>/context.json and source/<row>.json.gz. HPMS uses the existing
midtown-arterials/build.py cache format and includes the entire northern extent.
"""
import gzip
import hashlib
import json
import sys
from pathlib import Path

from shapely.geometry import LineString, Point

repo = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(repo / "pipeline/scripts"))
import arterials as A

def bake(boards, hpms_file, dest):
    data = json.loads(hpms_file.read_text())
    segments = data["segments"]
    lines = [(i, [A.project(*p) for p in s["lonlat"]]) for i,s in enumerate(segments) if s.get("AADT")]
    old = json.loads((repo/"web/src/city/fixtures/midtown-arterials.json").read_text())
    def key(p): return tuple(round(v*2)/2 for v in p)
    ends = {key(r[p]):r[k] for r in old["runs"] for p,k in [("a","from"),("b","to")]}
    def end(p): return ends.setdefault(key(p),f'north-{key(p)[0]},{key(p)[1]}')
    runs,observations,excluded,signals,hashes = [],[],[],{},{}
    for row in ["brookwood-station","r16"]:
        file=boards/"source"/(row+".json.gz")
        hashes[row]=hashlib.sha256(file.read_bytes()).hexdigest()
        archive=json.load(gzip.open(file))["elements"]
        nodes={e["id"]:A.project(e["lon"],e["lat"]) for e in archive if e["type"]=="node"}
        for e in archive:
            if e["type"]=="node" and e.get("tags",{}).get("highway")=="traffic_signals":
                signals[e["id"]]=[round(v,2) for v in nodes[e["id"]]]
        ways=[(e,LineString([nodes[n] for n in e["nodes"]])) for e in archive if e["type"]=="way"
              and e.get("tags",{}).get("highway") in {"trunk","primary","secondary","tertiary"} and all(n in nodes for n in e["nodes"])]
        ctx=json.loads((boards/row/"context.json").read_text())
        for road in ctx["roads"]:
            name=road.get("name"); pt=road["pts"]
            if not name or road["cls"] not in {"trunk","primary","secondary","tertiary"} or road.get("tunnel"):continue
            evidence={"row":row,"name":name,"a":pt[0],"b":pt[-1]}
            candidates=[(e,g) for e,g in ways if e["tags"].get("name")==name and all(g.distance(Point(p))<.05 for p in pt)]
            if len(candidates)!=1: excluded.append({**evidence,"reason":"ambiguous source geometry"});continue
            way,axis=candidates[0];t=way["tags"]
            votes={}; samples=A.samples(pt)
            for p,heading,w in samples:
                hit=A.best_line(p,heading,lines,A.MAX_D)
                if hit:votes[hit[0]]=votes.get(hit[0],0)+w
            if not votes:excluded.append({**evidence,"reason":"no matching HPMS geometry"});continue
            s=segments[max(votes,key=votes.get)];route=s["ROUTE_ID"]
            cover=sum(v for i,v in votes.items() if segments[i]["ROUTE_ID"]==route)/sum(w for _,_,w in samples)
            us19=s["RouteSigning"]==3 and str(s["RouteNumber"])=="19" and "US 19" in t.get("ref","").split(";")
            named=A.norm(name) in {A.norm(n) for n in (s["RouteName"] or "").split(";")}
            note={**evidence,"osm":way["id"],"version":way["version"],"osmRef":t.get("ref"),"oneway":t.get("oneway"),
                  "hpmsRoute":route,"hpmsName":s["RouteName"],"fSystem":s["F_SYSTEM"],"facility":s["FACILITY_TYPE"],
                  "coverage":round(cover,4),"year":s["DATA_YEAR"],"volumeDate":s.get("AADT_VD"),"aadt":s["AADT"]}
            # This pilot connects the two-way arterial. A different facility needs its own directed match.
            if s["F_SYSTEM"] not in (3,4) or s["FACILITY_TYPE"]!=2 or not (named or us19) or cover<A.MIN_COVER or t.get("oneway","no") not in ("no","false","0") or any(k.startswith("oneway:conditional") for k in t):
                excluded.append({**note,"reason":"functional class, identity, coverage or direction"});continue
            n=int(s["AADT"]);truck=(s.get("AADT_SINGLE_UNIT") or 0)+(s.get("AADT_COMBINATION") or 0)
            runs.append({**evidence,"from":end(pt[0]),"to":end(pt[-1]),"allow":"both","aadt":{"forward":n//2,"reverse":n-n//2},
                         "speedMph":s.get("SPEED_LIMIT") or None,"truckShare":round(min(.5,truck/n),3)})
            observations.append(note)
    dest.mkdir(parents=True,exist_ok=True)
    (dest/"runs.json").write_text(json.dumps({"runs":runs,"signals":list(signals.values())},separators=(",",":"))+"\n")
    (dest/"source.json").write_text(json.dumps({"service":data["service"],"meta":data["meta"],"hpmsSha256":hashlib.sha256(hpms_file.read_bytes()).hexdigest(),"osmArchiveHashes":hashes,"runs":observations,"excluded":excluded},indent=1)+"\n")

if __name__=="__main__":bake(*map(Path,sys.argv[1:]))
