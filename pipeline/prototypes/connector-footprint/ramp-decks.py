"""Deck spans for the stacked Connector ramps, from ramp-register.json.

Each listed way gets spans wherever its tracked own surface stands more than
0.5 m above the drawn ground, extended one station each side and tied there to
the drawn ground (as deck-survey.py ties abutments). Hidden stations are
interpolated along the way. Where two listed ways share an endpoint, both
spans end at the same height. Stations are metres along the full OSM way in
ways.json; web/src/terrain/ramp-decks.ts slices each board's runs from them.
Writes ramp-decks.json beside this file.
"""
import json
import math
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent

# Build order (docs/connector-stacked-ramps.md). Each step is reviewed on its own.
STEPS = {
    "baker": [38974028, 38974034, 38974051, 1450884828, 1450884829, 38974031, 39169033],
    # 38970413 belongs here, not step 4: lifting 38974058 alone leaves 1.0 m under
    # its clearance-inferred deck at the three-level stack (1115.8, -591.0).
    "stack": [9235707, 38974058, 38974043, 38970413],
    # The MLK SB ramps climb to the MLK deck on their own structure, over ground
    # the covered-pavement taper lowers (connector-repairs.md, taper follow-up).
    "mlk": [436808889, 755543582, 44698161, 436808888, 755543580, 755543583],
}
# Only these stations of a way are drawn here (clipped, not just filtered).
# The MLK street bridge's west approach (street-bridges.json, streetPortals)
# draws 755543583 at about 313.2 m; the ramp runs 2.5 m under its diagonal
# edge so no wedge of air opens beside it.
CLIP = {755543583: (0, 2.5)}
# Span rows pinned to a structure drawn from another survey: way -> [(station,
# NAVD88 profile height)]. Other rows within EASE metres move by a share of the
# pin's offset, so the ramp eases onto it. Profiled decks draw their tread
# 0.12 m above the profile: 313.08 keeps the tread 3 cm under the approach's
# 313.23 m (City probe, b2-mlk/evidence), so the approach stays on top.
MEETS = {755543580: [(11.6, 313.08)], 755543583: [(0.0, 313.08), (2.5, 313.08)]}
EASE = 10.0
# Only these stretches of longer ways belong to a step (station window, metres).
# 38974051 from 75 m on is the Baker junction deck's own approach
# (junction-decks.json, drawn by junctionPortals): a span there would double it.
WINDOWS = {38974031: (0, 60), 39169033: (300, 1e9), 38974051: (0, 60)}
ABOVE, TIE = 0.5, 1


def spans_for(way, length):
    st = [s for s in way["stations"] if s["ground"] is not None]
    s = np.array([x["s"] for x in st])
    ground = np.array([x["ground"] for x in st])
    known = np.array([x["own"] is not None for x in st])
    if known.sum() < 2:
        return []
    own = np.interp(s, s[known], np.array([x["own"] for x in st if x["own"] is not None]))
    elevated = own - ground > ABOVE
    spans, i = [], 0
    while i < len(s):
        if not elevated[i]:
            i += 1
            continue
        j = i
        while j + 1 < len(s) and elevated[j + 1]:
            j += 1
        lo, hi = max(0, i - TIE), min(len(s) - 1, j + TIE)
        rows = []
        for k in range(lo, hi + 1):
            tied = (k == lo and lo < i) or (k == hi and hi > j)
            # A third value of 1 marks a tie: the City meets its own drawn
            # terrain there (deckWeight 0), not this sample of it.
            rows.append([round(float(s[k]), 2), round(float(ground[k]), 2), 1] if tied else
                        [round(float(s[k]), 2), round(float(own[k]), 2)])
        # Blend onto the terrain within 0.25 m of a tie: the ground beside a
        # ramp often falls away toward the freeway, and a blend over a full
        # 5 m station would sag the tread with it.
        # The far end first, so the near end's insert cannot shift its index.
        for at, toward in ((len(rows) - 1, -1), (0, 1)):
            if len(rows[at]) > 2 and len(rows) > 1:
                a, b = rows[at], rows[at + toward]
                f = 0.25 / abs(b[0] - a[0])
                rows.insert(at + (toward > 0), [round(a[0] + f * (b[0] - a[0]), 2), round(a[1] + f * (b[1] - a[1]), 2)])
        # An elevated end of the way runs to the way's own endpoint.
        if i == 0 and rows[0][0] > 0:
            rows.insert(0, [0.0, round(float(own[0]), 2)])
        if j == len(s) - 1 and rows[-1][0] < length:
            rows.append([round(length, 2), round(float(own[-1]), 2)])
        spans.append(rows)
        i = j + 1
    return spans


_AUBURN = {}


def clip(span, lo, hi):
    """The part of a span between stations lo and hi, with interpolated ends."""
    def at(s):
        for a, b in zip(span, span[1:]):
            if a[0] <= s <= b[0]:
                return round(a[1] + (b[1] - a[1]) * (s - a[0]) / ((b[0] - a[0]) or 1), 2)
        return span[0][1] if s < span[0][0] else span[-1][1]
    lo, hi = max(lo, span[0][0]), min(hi, span[-1][0])
    inner = [r for r in span if lo < r[0] < hi]
    return [[lo, at(lo)], *inner, [hi, at(hi)]]


def road_length(road):
    """Length of a surveyed road, from its polyline on the Sweet Auburn board."""
    if not _AUBURN:
        context = json.loads((HERE.parent / "sweet-auburn" / "context.json").read_text())
        for r in context["roads"]:
            _AUBURN[(tuple(r["pts"][0]), tuple(r["pts"][-1]))] = sum(math.dist(a, b) for a, b in zip(r["pts"], r["pts"][1:]))
    return _AUBURN.get((tuple(road["start"]), tuple(road["end"])), math.inf)


def station_on(pts, p, tol=0.05):
    """Metres along pts to the point p, or None when p is off the polyline."""
    run = 0.0
    for a, b in zip(pts, pts[1:]):
        dx, dz = b[0] - a[0], b[1] - a[1]
        l2 = dx * dx + dz * dz
        if l2:
            t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2))
            if math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz) < tol:
                return run + t * math.sqrt(l2)
        run += math.sqrt(l2)
    return None


def main():
    register = json.loads((HERE / "ramp-register.json").read_text())
    ways = json.loads((HERE / "ways.json").read_text())
    by_id = {w["way"]: w for w in register["ways"]}
    out = []
    for step, ids in STEPS.items():
        for wid in ids:
            pts = ways[str(wid)]["pts"]
            length = float(sum(math.dist(a, b) for a, b in zip(pts, pts[1:])))
            lo, hi = WINDOWS.get(wid, (0, 1e9))
            spans = [sp for sp in spans_for(by_id[wid], length) if sp[-1][0] >= lo and sp[0][0] <= hi]
            if wid in CLIP:
                c0, c1 = CLIP[wid]
                spans = [clip(sp, c0, c1) for sp in spans if sp[-1][0] > c0 and sp[0][0] < c1]
            if spans:
                out.append({"step": step, "way": wid, "pts": pts, "lengthM": round(length, 2), "spans": spans})
    for e in out:
        for at, h in MEETS.get(e["way"], []):
            for sp in e["spans"]:
                end = next((r for r in sp if abs(r[0] - at) < 0.05), None)
                if end is None:
                    continue
                offset = h - end[1]
                for r in sp:
                    share = 1 - abs(at - r[0]) / EASE
                    if share > 0 and len(r) < 3:
                        r[1] = round(r[1] + share * offset, 2)
    # Shared endpoints between listed ways land at one height.
    ends = {}
    for e in out:
        for sp in e["spans"]:
            for row, at in ((sp[0], e["pts"][0]), (sp[-1], e["pts"][-1])):
                if row[0] in (0.0, e["lengthM"]):
                    ends.setdefault(tuple(at if row[0] == 0.0 else e["pts"][-1]), []).append(row)
    for rows in ends.values():
        if len(rows) > 1:
            h = round(sum(r[1] for r in rows) / len(rows), 2)
            for r in rows:
                r[1] = h
    # Where a Sweet Auburn surveyed road ends on a listed way (the auburn board's
    # seam), that survey owns the height: the ramp span passes through it exactly.
    surveyed = json.loads((HERE / "sweet-auburn-decks.json").read_text())["roads"]
    for e in out:
        for road in surveyed:
            if not road["spans"]:
                continue
            first, last = road["spans"][0][0], road["spans"][-1][-1]
            # A surveyed span that reaches the road's own end (stations in mm).
            ends = [(road["start"], first)] if first[0] == 0 else []
            if abs(last[0] - road_length(road)) < 0.01:
                ends.append((road["end"], last))
            for end, row in ends:
                at = station_on(e["pts"], end)
                if at is None:
                    continue
                for sp in e["spans"]:
                    if sp[0][0] < at < sp[-1][0]:
                        sp[:] = [r for r in sp if abs(r[0] - at) > 0.5 or len(r) > 2]
                        sp.append([round(at, 2), row[1]])
                        sp.sort(key=lambda r: r[0])
    (HERE / "ramp-decks.json").write_text(json.dumps({"ways": out}, separators=(",", ":")) + "\n")
    for e in out:
        print(e["step"], e["way"], [(sp[0][0], sp[-1][0], sp[0][1], sp[-1][1]) for sp in e["spans"]])


if __name__ == "__main__":
    main()
