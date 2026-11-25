"""Compare named terrain and structure triangle heights in two matched column exports."""
import json, sys
from collections import defaultdict
from pathlib import Path

spec, before, after = [json.loads(Path(f).read_text()) for f in sys.argv[1:4]]
def samples(export):
    by_probe = defaultdict(lambda: defaultdict(list))
    for i, j, _, h, facing, _ in export["hits"]:
        if spec[i]["type"] != "road" or facing != 1:
            continue
        path = export["objects"][j]["path"]
        if path.endswith("/Decks and embedded rails"):
            kind = "tread"
        elif path.endswith("/Mesh[0]"):
            kind = "terrain"
        else:
            continue
        by_probe[i][kind].append(h)
    return by_probe
a, b = samples(before), samples(after)
stats = {}
for i, kinds in a.items():
    for kind, values in kinds.items():
        pair = (spec[i]["way"], kind)
        acc = stats.setdefault(pair, {"way":pair[0],"surface":kind,"hits":0,"lost":[],"maxDifference":0})
        for old in values:
            if b[i][kind]:
                acc["hits"] += 1
                acc["maxDifference"] = max(acc["maxDifference"],min(abs(old-v) for v in b[i][kind]))
            else:
                acc["lost"].append(spec[i]["s"])
print(json.dumps(list(stats.values()),indent=2))
