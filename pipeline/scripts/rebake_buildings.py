"""Re-extract the building lists of every OSM board in the rectangle from its archived map.

Only `buildings` is rewritten; terrain, roads, ground cover and sources are left as
committed. Run after changing `king_memorial_context.extract_context`:

    .venv/bin/python pipeline/scripts/rebake_buildings.py [--check]

`--check` exits non-zero when any committed context would change.
"""
import gzip
import json
import sys
from pathlib import Path

from king_memorial_context import extract_context
from vignette import MIDTOWN_ROWS, ROOT

PROTO = Path(ROOT) / "pipeline/prototypes"
SQUARE = PROTO / "square-board"


def boards():
    for name in ["north-band", "north-corner", "south-band", "south-corner", *MIDTOWN_ROWS]:
        station = dict(station_building="osm:way:265350477", named_deck=38978515) if name == "brookwood-station" else {}
        yield name, SQUARE / name / "context.json", SQUARE / "source" / f"{name}.json.gz", station
    yield "sweet-auburn", PROTO / "sweet-auburn/context.json", PROTO / "sweet-auburn/source/osm-map.json.gz", {}
    yield "king-memorial", PROTO / "king-memorial/context.json", PROTO / "expanded-canopy/source/king-map.json.gz", dict(king=True)


def rebake(check=False):
    changed = []
    for name, path, source, kwargs in boards():
        text = path.read_text()
        context = json.loads(text)
        raw = gzip.decompress(source.read_bytes())
        context["buildings"], _, _ = extract_context(raw, context["bounds"], **kwargs)
        out = json.dumps(context, separators=(",", ":")) + "\n"
        if out != text:
            changed.append(name)
            if not check:
                path.write_text(out)
        print(name, len(context["buildings"]), "buildings", "changed" if out != text else "unchanged")
    return changed


if __name__ == "__main__":
    check = "--check" in sys.argv
    changed = rebake(check)
    if check and changed:
        sys.exit(f"would change: {', '.join(changed)}")
