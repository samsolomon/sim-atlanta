"""Attach Overture building parts to the staged downtown buildings.

Runs after the vignette steps in `pnpm data:city`. Reads
data/raw/overture_downtown_building_parts.geojson and adds a `parts` list to
each staged building in web/public/data/scene/downtown/vignette.json whose
Overture id has mapped parts, using the same podium and tier rules as the OSM
boards. Parent ids, rings, heights and floors are left unchanged.
"""
import json
import os
from pathlib import Path

from shapely.geometry import Polygon

from king_memorial_context import LEVEL_M, PART_FALLBACK_M, masses_to_parts
from vignette import RAW, ROOT, project

STAGED = Path(ROOT) / "web/public/data/scene/downtown/vignette.json"
SOURCE = Path(RAW) / "overture_downtown_building_parts.geojson"


def polygons(geometry):
    coords = geometry["coordinates"]
    return [coords] if geometry["type"] == "Polygon" else coords if geometry["type"] == "MultiPolygon" else []


def heights(props, parent, tallest, taken):
    """(top, bottom, tier): a height is reported; floors alone are inferred."""
    per_level = LEVEL_M
    ph, pf = parent.get("h"), parent.get("floors")
    most = max(tallest or 0, pf or 0)
    if ph and most and not taken and 2.5 <= ph / most <= 5:
        per_level = ph / most
    elif pf and not ph:
        per_level = 3.6
    top, tier = props.get("height"), "reported"
    if not top and props.get("num_floors"):
        top, tier = props["num_floors"] * per_level, "inferred"
    if not top and (ph or pf):
        # A part with no data of its own takes the parent's mapped height.
        top, tier = ph or pf * 3.6, "inferred"
    if not top:
        top, tier = PART_FALLBACK_M, "illustrative"
    bottom = props.get("min_height") or ((props.get("min_floor") or 0) * per_level)
    return top, min(bottom, top - .1), tier


def attach(vignette, features):
    by_parent = {}
    for f in features:
        by_parent.setdefault(f["properties"]["building_id"], []).append(f)
    changed = 0
    for b in vignette["buildings"]:
        mine = by_parent.get(b["id"])
        if not mine or not b["rings"] or len(b["rings"][0]) < 3:
            continue
        piece = Polygon(b["rings"][0], b["rings"][1:]).buffer(0)
        tallest = max((f["properties"].get("num_floors") or 0 for f in mine if not f["properties"].get("height")), default=0)
        taken = bool(b.get("h")) and any((f["properties"].get("height") or 0) >= b["h"] - .5 for f in mine)
        masses = []
        for f in mine:
            top, bottom, tier = heights(f["properties"], b, tallest, taken)
            for poly in polygons(f["geometry"]):
                shape = Polygon([project(*c) for c in poly[0][:-1]], [[project(*c) for c in r[:-1]] for r in poly[1:]]).buffer(0)
                masses.append(dict(id="overture:" + f["properties"]["id"], top=top, bottom=bottom, tier=tier,
                                   shape=shape.intersection(piece), canopy=False))
        parts = masses_to_parts(b, piece, masses)
        if parts:
            b["parts"] = parts
            changed += 1
    return changed


if __name__ == "__main__":
    if not SOURCE.exists():
        raise SystemExit(f"{SOURCE} is missing. Run extract_overture.py building_parts first.")
    vignette = json.loads(STAGED.read_text())
    if any("parts" in b for b in vignette["buildings"]):
        raise SystemExit(f"{STAGED} already has parts. Re-run the vignette steps first.")
    n = attach(vignette, json.loads(SOURCE.read_text())["features"])
    STAGED.write_text(json.dumps(vignette, separators=(",", ":")))
    print(n, "downtown buildings drawn from their Overture parts")
