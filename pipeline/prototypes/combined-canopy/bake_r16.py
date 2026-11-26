"""Bake R16 crowns with the standard City canopy bake (pipeline/scripts/expanded_canopy.py).

Arguments are UTCMosaic2023.tif, the verified r16 OSM gzip, nr-path.json, the approved detailed
square-board directory, output JSON and audit JSON. The first run downloads the Meta/WRI canopy
height crops into data/raw/meta_chm; their digests go in the audit.
"""
import gzip, hashlib, json, sys
from pathlib import Path

repo = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(repo / "pipeline/scripts"))
from shapely import make_valid
from shapely.geometry import LineString, Polygon

from expanded_canopy import bake
from vignette import project
from vignette_trees import CACHE

utc, osm, guide, boards, output, audit = map(Path, sys.argv[1:])
proto = repo / "pipeline/prototypes"


def read(path):
    return json.loads(path.read_bytes())


rows = {name: read(boards / name / "context.json") for name in ("r16", "brookwood-station")}
r16 = {**rows["r16"], "trees": []}
blocked = []


def keep_clear(geometry):
    if not geometry.is_empty:
        blocked.append((geometry, 2))


elements = json.loads(gzip.decompress(osm.read_bytes()))["elements"]
nodes = {e["id"]: project(e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
for way in (e for e in elements if e["type"] == "way"):
    tags = way.get("tags", {})
    if len(way["nodes"]) < 2:
        continue
    line = LineString([nodes[i] for i in way["nodes"]])
    if tags.get("waterway"):
        keep_clear(line.buffer(4))
    if tags.get("railway") in ("rail", "subway", "light_rail"):
        keep_clear(line.buffer(9))
# The approved course, parking and playing surfaces.
for feature in r16["ground"]:
    if feature["kind"].startswith("golf_") or feature["kind"] in ("pitch", "parking", "playground", "swimming_pool", "water", "pedestrian"):
        keep_clear(make_valid(Polygon(feature["rings"][0], feature["rings"][1:])).buffer(1.5))
# Approved sightlines: the east highway, the trail, the Norfolk Southern bridge and the red-line portal.
for road in read(proto / "highway-four/east-ways.json").values():
    keep_clear(LineString(road["pts"]).buffer(max(15, road["lanes"] * 2.1 + 7)))
for way in read(proto / "northeast-trail/axis.json")["ways"]:
    keep_clear(LineString(way["axis"]).buffer(12))
for run in read(proto / "combined-canopy/source/norcross-north-study.json")["rail"]:
    keep_clear(LineString(run["pts"]).buffer(10))
keep_clear(LineString([p[:2] for p in read(guide)["axis"]]).buffer(12))

# Station crowns near the seam keep their spacing.
seam = r16["bounds"]["maxZ"]
neighbours = [t for t in rows["brookwood-station"]["trees"] if t[1] < seam + 18]
scratch = output.with_suffix(".crowns.json")
cover, _, pack = bake(utc, ["r16"], scratch, "r16-canopy", None, neighbours,
                      contexts={"r16": r16}, extra_obstacles=blocked)
row = pack["r16"]
output.write_text(json.dumps(dict(trees=row["trees"], treeLowCount=row["lowCount"]), separators=(",", ":")))
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
audit.write_text(json.dumps(dict(
    utcSHA=digest(utc),
    canopyHeightCrops={p.name: digest(p) for p in sorted(Path(CACHE).glob("r16-canopy_*"))},
    high=len(row["trees"]), low=row["lowCount"], classifiedCover=float(cover.mean()),
), indent=2) + "\n")
