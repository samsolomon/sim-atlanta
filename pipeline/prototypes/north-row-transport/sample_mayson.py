"""Source acquisition only. The offline greybox reads the committed summaries."""
import json, math, sys
from pathlib import Path
import numpy as np

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parents[1]/'scripts'))
import king_memorial_corridor as ept
from shapely.geometry import LineString
import gzip
source=json.load(gzip.open(HERE/'osm.json.gz'))['elements']
nodes={f['id']:ept.project(f['lon'],f['lat']) for f in source if f['type']=='node'}
ways={f['id']:LineString([nodes[n] for n in f['nodes']]) for f in source if f['type']=='way' and f['id'] in [81137860,319512612,9270932,429349499,144485857]}
ept.RAW=Path(sys.argv[1])
km=math.pi/180*ept.R
X=1290;Z=-6203
def lon(x):return ept.LON0+x/(km*ept.K)
def lat(z):return ept.LAT0-z/km
x,z,h,classes,_=ept.ept_points((lon(X-55),lat(Z+55),lon(X+55),lat(Z-55)))
out={}
for upper,lower in ((81137860,9270932),(319512612,429349499),(144485857,9270932)):
    point=ways[upper].intersection(ways[lower])
    for key in (upper,lower):
        line=ways[key]; at=line.project(point)
        for offset in range(-40,41,5):
            s=at+offset
            if s<0 or s>line.length:continue
            q=line.interpolate(s)
            valid=np.hypot(x-q.x,z-q.y)<1.8
            groups={}
            for cls in (2,17):
                v=h[valid&(classes==cls)]
                if len(v):groups[cls]=[len(v),*[round(float(a),3) for a in np.quantile(v,[.1,.5,.9])]]
            out[(key,round(s,3))]=[key,round(s,3),round(q.x,3),round(q.y,3),groups]
print(json.dumps(sorted(out.values()),separators=(',',':')))
