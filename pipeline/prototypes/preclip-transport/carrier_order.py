"""Classify the pinned source intervals before clipping or fitting vertical geometry."""

import json
from itertools import pairwise
from shapely.geometry import LineString, Point
from pilot import DATA, ROOT, osm


def field(value, tier, source):
    return dict(value=value, tier=tier, source=source)


def unknown(reason):
    return field(None, None, reason)


def relation(a, b, xy):
    """Layers describe relative order at a crossing. A shared node has to be here."""
    point = Point(xy)
    common = set(a["nodes"]) & set(b["nodes"])
    for node, coords in zip(a["nodes"], a["pts"]):
        if node in common and point.distance(Point(coords)) < 0.02:
            return field("connected", "reported", f"OSM junction node {node}")
    layers = [int(w["tags"].get("layer", 0)) for w in (a, b)]
    if layers[0] != layers[1] and any(w["tags"].get("bridge") == "yes" for w in (a, b)):
        upper, lower = (a, b) if layers[0] > layers[1] else (b, a)
        return field(
            [upper["id"], lower["id"]],
            "inferred",
            f"OSM bridge and relative layers at this intersection ({layers}); absent layer defaults to zero",
        )
    return unknown("Disjoint axes without decisive relative layer evidence")


def deck_evidence(points, spans, station):
    matches = [
        row
        for row in spans
        if row["start"] == list(points[0]) and row["end"] == list(points[-1])
    ]
    if len(matches) == 1:
        for span in matches[0]["spans"]:
            for (a, y), (b, z) in pairwise(span):
                if a <= station <= b:
                    height = y + (z - y) * (station - a) / (b - a)
                    return field(
                        round(height, 3),
                        "inferred",
                        "Linear interpolation within a matched station span of the 2019 USGS lidar-derived sweet-auburn-decks.json, metres NAVD88",
                    )
    return unknown(
        "No unique matching directed catalog interval with bracketing samples"
    )


def classify():
    north, ellis, midtown = (
        osm(tile) for tile in ("north-band", "north-corner", "midtown-central")
    )
    records = []
    unresolved = unknown("No independently matched road-top measurement at this point")

    def record(ids, carrier, order, height=unresolved, **extra):
        records.append(
            dict(
                ways=ids,
                carrier=carrier,
                order=order,
                treadNavd88M=height,
                physicalClearanceM=unknown(
                    "No matched physical soffit and lower tread survey"
                ),
                **extra,
            )
        )

    for ways, carrier in [(north, 1450813223), (north, 1450813225), (ellis, 115789929)]:
        a = ways[carrier]
        axis = LineString(a["pts"])
        for b in ways.values():
            if b["id"] == carrier or not b.get("tags", {}).get("highway"):
                continue
            hit = axis.intersection(LineString(b["pts"]))
            if hit.is_empty or hit.geom_type != "Point":
                continue
            xy = list(hit.coords[0])
            order = relation(a, b, xy)
            if order["value"] == "connected":
                continue
            extra = {}
            if b["id"] == 39449296:
                extra["inventory"] = field(
                    ["000000012105480", "000000012105660"],
                    "reported",
                    "2025 Georgia NBI records I-75 RAMP over M-9073 SPRING STREET and WILLIAMS STREET over M-9073 TECHWOOD-SPRG C; corridor corroboration only",
                )
            record(
                [carrier, b["id"]],
                field("bridge", "reported", f"OSM {carrier} bridge=yes"),
                order,
                pointXZ=xy,
                **extra,
            )
    record(
        [1450813220],
        unknown("No direct structural observation for the seam control"),
        unknown("An untagged motorway link alone cannot establish vertical order"),
    )
    for ways, ids, node in [
        (ellis, [115789929, 38974057], 69117204),
        (midtown, [48663359, 306157879, 311764287, 629238141], 69616397),
    ]:
        assert all(node in ways[i]["nodes"] for i in ids)
        record(
            ids,
            field("road junction", "reported", "OSM incident ways"),
            field("connected", "reported", f"OSM shared node {node}"),
        )

    key = 9235148
    register = json.loads((DATA / "connector-footprint/ways.json").read_text())[
        str(key)
    ]
    points = register["pts"]
    axis = LineString(points)
    cut = axis.intersection(LineString([(-10000, -300), (10000, -300)]))
    station = axis.project(cut)
    catalog = json.loads(
        (DATA / "connector-footprint/sweet-auburn-decks.json").read_text()
    )["roads"]
    height = deck_evidence(points, catalog, station)
    record(
        [key],
        field(
            "deck-supported" if height["value"] is not None else None,
            "inferred" if height["value"] is not None else None,
            height["source"],
        ),
        unknown(
            "No identified lower way at the frozen split; nearby NBI 000000012107160 spans Irwin farther north"
        ),
        height,
        stationM=station,
        registerClass=field(
            register["kind"], "reported", "connector-footprint/ways.json"
        ),
    )
    # Published Grant windows describe the structure and portals, never individual railheads.
    rail = json.loads((ROOT / "web/src/city/fixtures/king-rail.json").read_text())
    bore = LineString([(1381.41, 488.14), (1382.14, 527.43)])
    for track in rail:
        hit = LineString(track["pts"]).intersection(bore)
        if hit.is_empty or hit.geom_type != "Point":
            continue
        key = int(track["id"].split(":")[-1])
        if key not in {
            144595771,
            539939093,
            905879528,
            539939596,
            539939602,
            539939598,
            539939594,
            539939595,
        }:
            continue
        record(
            [key, 144588627],
            field("rail deck", "reported", "FRA 643081D RR Over"),
            field(
                [key, 144588627],
                "inferred",
                "OSM axis intersects mapped bore; FRA 643081D and Grant south-portal street view establish corridor order",
            ),
            unknown("Class-17 deck returns do not identify railhead elevation"),
            deckMedianNavd88M=field(
                313.67,
                "reported",
                "2019 USGS class 17, 198 returns in Grant deck window",
            ),
            portalMediansNavd88M=field(
                [307.66, 307.86],
                "reported",
                "2019 USGS class 2, 123 north and 99 south returns",
            ),
        )
    return records


if __name__ == "__main__":
    print(json.dumps(classify(), indent=2, allow_nan=False))
