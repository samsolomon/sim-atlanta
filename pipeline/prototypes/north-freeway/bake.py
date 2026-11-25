"""Build cross sections from classified surface returns in the source-way frame."""
import gzip
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ways = json.loads((ROOT / 'web/src/city/fixtures/midtown-connector/ways.json').read_text())
obs = json.loads((HERE / 'windows.json').read_text())
inventory = json.loads(gzip.decompress((HERE.parent / 'north-row-transport/inventory.json.gz').read_bytes()))
for route in inventory['ways']:
    if route['id'] == 369529886:
        ways[str(route['id'])] = dict(version=route['version'], lanes=5, pts=route['pieces'][0]['xz'])
data = []
for way, stations in [(28038801, (1010, 1100)), (1416312985, (0, 114)), (369529900, (0, 376)), (369529886, (0, 40))]:
    source = ways[str(way)]
    groups = {}
    for key, s, returns in obs:
        owner, side = key.split('/')
        if int(owner) != way or not stations[0] <= s <= stations[1]:
            continue
        for cls in (17, 2):
            picks = [v for v in returns if v[0] == cls and v[3] <= 0.5]
            if len(picks) == 1:
                groups.setdefault(s, {})[float(side)] = picks[0][2]
                break
    rows = []
    for s, heights in sorted(groups.items()):
        if len(heights) < 3:
            continue
        rows.append([s, heights[-.36], heights[0.], heights[.36]])
    data.append(dict(way=way, version=source['version'], lanes=source['lanes'], axis=source['pts'], rows=rows))
(HERE / 'sections.json').write_text(json.dumps(data, separators=(',', ':')) + '\n')
