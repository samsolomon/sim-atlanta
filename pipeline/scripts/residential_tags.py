"""Collect the OSM roof shape, wall material and build date tagged on residential buildings across the board sources."""
import gzip
import json
from pathlib import Path

from vignette import ROOT

PACK = Path(ROOT) / "pipeline/prototypes"
HOMES = {"house", "detached", "semidetached_house", "bungalow", "terrace", "residential"}


def bake():
    tags = {}
    sources = [*sorted((PACK / "square-board/source").glob("*.json.gz")),
               PACK / "sweet-auburn/source/osm-map.json.gz", PACK / "expanded-canopy/source/king-map.json.gz"]
    for source in sources:
        for e in json.loads(gzip.decompress(source.read_bytes()))["elements"]:
            t = e.get("tags", {})
            if e["type"] not in ("way", "relation") or t.get("building") not in HOMES:
                continue
            entry = [t.get("roof:shape"), t.get("building:material"), t.get("start_date")]
            if any(entry):
                tags[f"osm:{e['type']}:{e['id']}"] = entry
    out = PACK / "residential"
    out.mkdir(exist_ok=True)
    (out / "tags.json").write_text(json.dumps(dict(sorted(tags.items())), separators=(",", ":")) + "\n")
    return tags


if __name__ == "__main__":
    tags = bake()
    print(len(tags), "tagged residential buildings")
