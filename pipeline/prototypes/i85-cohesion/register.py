"""Register reported 2025 structure records in scene coordinates. Input is FHWA GA25.txt."""
import csv, json, math, sys
from pathlib import Path
from shapely.geometry import LineString, Point

here = Path(__file__).resolve().parent
model = json.loads((here/"../north-freeway/sections.json").read_text())
ways = json.loads((here/"../../../web/src/city/fixtures/midtown-connector/ways.json").read_text())
raw = {w["id"]: w for w in json.loads((here/"ways.json").read_text())}
line = lambda ident: LineString(ways[str(ident)]["pts"])
upstream, creek, approach = map(line, [1416312985,484857197,369529900])
bore = LineString(raw[38981788]["axis"])
p = bore.intersection(approach)
ids = ["012105500","012105620","012102060","012105900","012106700","012105570"]
keep = "STRUCTURE_NUMBER_008 FACILITY_CARRIED_007 FEATURES_DESC_006A MAIN_UNIT_SPANS_045 MAX_SPAN_LEN_MT_048 STRUCTURE_LEN_MT_049 DECK_WIDTH_MT_052 VERT_CLR_UND_REF_054A VERT_CLR_UND_054B LAT_016 LONG_017 YEAR_BUILT_027 STRUCTURE_KIND_043A STRUCTURE_TYPE_043B".split()
def degrees(s):
    n = int(s)
    return n//1000000+n//10000%100/60+n%10000/360000
def xy(r):
    scale = math.pi/180*6371008.8
    return Point((-degrees(r["LONG_017"])+84.3916)*scale*math.cos(math.radians(33.7539)),(33.7539-degrees(r["LAT_016"]))*scale)
full=LineString([*upstream.coords,*list(creek.coords)[1:],*list(approach.coords)[1:]])
records=[]
for r in csv.DictReader(open(sys.argv[1])):
    if r["STRUCTURE_NUMBER_008"].lstrip("0").zfill(9) not in ids:continue
    pt=xy(r)
    records.append({"fields":{k:r[k].strip("'") for k in keep},"sceneXZ":[pt.x,pt.y],
                    "nearestNBStation":full.project(pt)-upstream.length,"lateralDistance":full.distance(pt)})
s=creek.length+approach.project(p)
print(json.dumps(dict(origin="south end of 484857197; increases NB",NBI=records,
    clearCreek=[0,creek.length],seam=creek.length+approach.project(approach.intersection(LineString([(-1000,-5700),(1800,-5700)]))),
    rampCrossing=s,modeledRampInterval=[s-7,s+7],rampCrossingXZ=[p.x,p.y],lowerStation=bore.project(p),
    split=creek.length+approach.length,terminal=creek.length+approach.length+40),indent=2))
