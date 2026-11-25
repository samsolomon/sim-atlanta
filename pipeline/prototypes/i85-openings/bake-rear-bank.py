"""Infer the rear-bank nodes using the pinned R16 DEM and local lower structural returns."""
import json
import math
import struct
import sys
from pathlib import Path

here=Path(__file__).resolve().parent
root=Path(sys.argv[1])
manifest=json.loads((root/'ground.json').read_bytes())
if manifest['sha256']!='9421ae7d430022d46e3daeb49777dc7049c4393be8cc8ef317a7d1633c95bf6b':
    raise ValueError('Expected the verified Brookwood R16 DEM')
samples=(root/'ground.i16').read_bytes()
axis=next(r['axis'] for r in json.loads((here.parent/'i85-cohesion/ways.json').read_bytes()) if r['id']==38981788)
(x,z),(ex,ez)=axis[:2]
length=math.hypot(ex-x,ez-z)
dx,dz=(ex-x)/length,(ez-z)/length

def smooth(t):
    t=max(0.,min(1.,t))
    return t*t*(3-2*t)

nodes=[]
for zz in range(-5830,-5775,5):
    for xx in range(940,1010,5):
        s=(xx-x)*dx+(zz-z)*dz
        u=-(xx-x)*dz+(zz-z)*dx
        weight=smooth((s-7)/6)*smooth((40-s)/5)*smooth((11-abs(u))/5)
        if not weight:continue
        i=(xx+1000)//5+(zz+6500)//5*561
        raw=struct.unpack_from('<h',samples,2*i)[0]
        # 259.50 at s8 to 259.75 at s16 on the lower structure. Nearby lower
        # flank returns reach 259.88 at s22. Exclude the 266–267 m I-85 deck.
        target=min(259.87,259.50+.027*(s-8))
        height=round(raw+weight*max(0.,10*target-raw))
        if height>raw:nodes.append([xx,zz,raw,height])
(here/'rear-bank.json').write_text(json.dumps(nodes,separators=(',',':'))+'\n')
