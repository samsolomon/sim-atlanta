"""Reproduce the isolated two-row incremental proof with the two pinned USGS TIFFs."""
import argparse
import gzip
import hashlib
import json
import shutil
import sys
import tempfile
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "scripts"))
import square_board as board
from square_board_audit import crossings, rect

OLD = "brookwood-station"
NEW = "r16"
FILES = ("ground.json", "ground.i16", "context.json")
BASE = board.PACK / OLD
OSM = "1c4daabb914a6884f532324f8f1a87df18e417e45f6484b8e5ec0bf496740ebf"
PIN = ["043a350ddbe1ab6e2e04a7f976d8456ba7e2ba8ac2cacdea8deb0b4f135331f8",
       "fd11f5a2992dc774dd2eab8d3fa7a8be5a959b528d8b1cae2f60fbf5abb7df82",
       "462e0c1824ec094f77535a209612cef7eedec5c6a3df21b7b1c5f51e79a4cbb6"]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def inventory(row):
    result = {}
    for name in FILES:
        data = (row / name).read_bytes()
        result[name] = dict(sha256=digest(data), bytes=len(data), gzip9=len(gzip.compress(data, compresslevel=9, mtime=0)))
    return result


def proof(sources, pack):
    board.MIDTOWN_ROWS[NEW] = dict(minZ=-6500, maxZ=-5700)
    board.VIGNETTES[NEW] = dict(x=(-1000., 1800.), z=(-6500., -5700.))
    board.PACK = pack
    old, new = pack / OLD, pack / NEW
    shutil.copytree(BASE, old)
    baseline = inventory(old)
    assert [baseline[f]["sha256"] for f in FILES] == PIN
    archive = pack / "source/r16.json.gz"
    archive.parent.mkdir()
    original = gzip.decompress((sources / archive.name).read_bytes())
    assert digest(original) == OSM
    tile, north = (sources / f"x74y{y}.tif" for y in (374, 375))

    # The terrain inputs, pipeline code and Station bytes are fixed throughout this
    # experiment. The only variable dependency is the R16 OSM snapshot.
    previous = None
    def rebuild(raw):
        nonlocal previous
        key = digest(raw)
        if key == previous:
            return []
        archive.write_bytes(gzip.compress(raw, mtime=0))
        board.bake_patch(tile, NEW, north)
        previous = key
        return [NEW]

    assert rebuild(original) == [NEW]
    candidate = inventory(new)
    assert rebuild(original) == []
    previous = None
    assert rebuild(original) == [NEW] and inventory(new) == candidate
    edge = rect(NEW).intersection(rect(OLD))
    def road_hits(row):
        roads = json.loads((row / "context.json").read_bytes())["roads"]
        return {name: sorted(p.x for p in pts) for name, pts in
                crossings([dict(r, name=r["name"] or "(unnamed)") for r in roads], edge).items()}
    seam = {row.name: road_hits(row) for row in (old, new)}
    grid = np.fromfile(new / "ground.i16", dtype="<i2").reshape(161, 561)
    if seam[NEW] != seam[OLD]:
        raise ValueError("Road/path endpoints differ at the Station seam")
    # A one-decimetre error in a single shared node must fail the stock audit.
    mismatch = grid.copy()
    mismatch[-1, 0] += 1
    try:
        board.terrain.verify_shared_edge(mismatch, old)
    except ValueError as err:
        if "1 of 561" not in str(err):
            raise
    else:
        raise ValueError("Shared-edge audit accepted a one-node discontinuity")
    samples = {str((x, z)): round(board.terrain.interpolate(grid, x, z), 4)
               for x, z in [(1291.81, -6202.19), (1288.72, -6203.00)]}

    osm = json.loads(original)
    nodes = {e["id"]: board.project(e["lon"], e["lat"]) for e in osm["elements"] if e["type"] == "node"}
    road = next(e for e in osm["elements"] if e["type"] == "way" and
                e.get("tags", {}).get("highway") == "residential" and e["tags"].get("name") and
                all(-6450 < nodes[n][1] < -5750 and -950 < nodes[n][0] < 1750 for n in e["nodes"]))
    road["tags"]["name"] += " [offline control]"
    assert rebuild(json.dumps(osm).encode()) == [NEW]
    changed = [f for f in FILES if inventory(new)[f] != candidate[f]]
    assert changed == ["context.json"] and road_hits(new) == seam[NEW]
    assert any(r["name"] == road["tags"]["name"] for r in json.loads((new / changed[0]).read_bytes())["roads"])
    assert rebuild(original) == [NEW] and inventory(new) == candidate and inventory(old) == baseline
    context = json.loads((new / "context.json").read_bytes())
    return dict(bounds=context["bounds"], baseline=baseline, candidate=candidate, seamXAtMinus5700=seam,
                counts={k:len(context[k]) for k in ("roads","buildings","ground","rail","trees")},
                maysonBareEarthNAVD88=samples, identicalEdgeNodes=561, changedWay=road["id"],
                changedOutputs=changed, rebuiltRows=[NEW], unchangedNeighbor=OLD)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sources", type=Path)
    parser.add_argument("output", type=Path, help="New offline directory")
    args = parser.parse_args()
    if args.output.exists():
        parser.error("output directory already exists")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=args.output.parent) as scratch:
        pack = Path(scratch) / "fixture"
        report = proof(args.sources, pack)
        (pack / "proof.json").write_text(json.dumps(report, indent=2)+"\n")
        pack.rename(args.output)
