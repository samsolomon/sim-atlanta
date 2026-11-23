"""Bake visible OSM track outside the hand-built Brookwood alignment into the web bundle."""
import gzip
import json
from pathlib import Path

from terrain_transport import clip_runs
from vignette import MIDTOWN_ROWS, ROOT, project

pack = Path(ROOT) / "pipeline/prototypes/square-board"
fixtures = Path(ROOT) / "web/src/city/fixtures"
brookwood = json.loads((fixtures / "brookwood.json").read_text())
# These archived OSM ways supply the four station alignments. Keep their
# continuation beyond the model's two clipping planes.
station_tracks = {
    "main1": [38978867, 38978865, 1043756765, 144485854],
    "main2": [28978838, 874902950, 1043756764, 874902949],
    "steelLead": [874902959], "siding": [874902960, 874902961],
}
owned = {way: sorted([brookwood[key][0][0], brookwood[key][-1][0]])
         for key, ways in station_tracks.items() for way in ways}
rows = {}
for row in MIDTOWN_ROWS:
    with gzip.open(pack / "source" / (row + ".json.gz")) as source:
        elements = json.load(source)["elements"]
    nodes = {e["id"]: project(e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
    bounds = json.loads((pack / row / "ground.json").read_text())["bounds"]
    runs = []
    for way in elements:
        tags = way.get("tags", {})
        kind = tags.get("railway")
        if way["type"] != "way" or kind not in ("subway", "rail") or tags.get("tunnel", "no") != "no":
            continue
        clips = [bounds]
        if way["id"] in owned:
            lo, hi = owned[way["id"]]
            clips = [dict(bounds, maxX=lo), dict(bounds, minX=hi)]
        for clip in clips:
            for points in clip_runs([nodes[i] for i in way["nodes"]], clip):
                runs.append(dict(kind="ground" if tags.get("bridge", "no") == "no" else "bridge",
                                 cls="subway" if kind == "subway" else "standard_gauge",
                                 name=tags.get("name"), pts=points))
    rows[row] = runs
(fixtures / "midtown-rail.json").write_text(json.dumps(rows, separators=(",", ":")) + "\n")
