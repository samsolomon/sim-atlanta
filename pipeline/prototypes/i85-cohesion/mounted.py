"""Reduce Phone's actual City triangle exports against the pinned lower road and wall."""
import json, math, sys
from collections import defaultdict
from pathlib import Path

spec, columns, wall = (json.loads(Path(f).read_text()) for f in sys.argv[1:4])
floor = defaultdict(list)
lining = defaultdict(list)
land = defaultdict(list)
for i, obj, _, y, facing, _ in columns['hits']:
    path = columns['objects'][obj]['path']
    if path.endswith('GA 13 to I-85 southbound ramp tread'):
        floor[i].append(y)
    elif path.endswith('Inferred ramp lining, soffit and headers'):
        lining[i].append(y)
    elif path.split('/')[-1]=='Mesh[0]':
        land[i].append(y)
stations = []
for i,r in enumerate(spec):
    if r['type']=='lower' and abs(r['u'])<=.80:
        stations.append(i)
interior=[i for i in stations if 5<spec[i]['s']<132]
headrooms=[min(y-min(floor[i]) for y in lining[i] if y-min(floor[i])>2) for i in interior
           if floor[i] and any(y-min(floor[i])>2 for y in lining[i])]
intrusions=[i for i in interior if floor[i] and any(.04<y-min(floor[i])<5.5 for y in land[i])]
# The first mesh quads are wall panels and the last 28 are the two short slab fascias.
xyz=list(zip(wall[::3],wall[1::3],wall[2::3]))
cut=[p for p in xyz if abs(p[2]+5700)<1e-5]
print(json.dumps({'wheelAndCentre':len(stations),'hits':sum(bool(floor[i]) for i in stations),
 'interior':len(interior),'pairedSoffit':len(headrooms),
 'minHeadroom':min(headrooms,default=None),'maxHeadroom':max(headrooms,default=None),
 'terrainIntrusions':len(intrusions),'firstIntrusions':[spec[i] for i in intrusions[:2]],
 'wallFacets':len(xyz)//6,'seamX':sorted(set(p[0] for p in cut)),
 'seamY':sorted(set(p[1] for p in cut))},indent=2))
