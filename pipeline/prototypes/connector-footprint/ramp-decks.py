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
}
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
            if spans:
                out.append({"step": step, "way": wid, "pts": pts, "lengthM": round(length, 2), "spans": spans})
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
    (HERE / "ramp-decks.json").write_text(json.dumps({"ways": out}, separators=(",", ":")) + "\n")
    for e in out:
        print(e["step"], e["way"], [(sp[0][0], sp[-1][0], sp[0][1], sp[-1][1]) for sp in e["spans"]])


if __name__ == "__main__":
    main()
