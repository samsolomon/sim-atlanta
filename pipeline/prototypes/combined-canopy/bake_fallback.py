"""Bake only private R16. Arguments are UTCMosaic2023.tif, verified r16 OSM gzip,
nr-path.json, approved detailed square-board directory, output JSON and audit JSON."""
import gzip, hashlib, json, math, sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.windows import from_bounds
from scipy.ndimage import distance_transform_edt
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import polygonize, unary_union
from shapely import make_valid

utc, osm, guide, boards, output, audit = map(Path, sys.argv[1:])
repo = Path(__file__).resolve().parents[3]
def read(p): return json.loads(p.read_bytes())
digest=hashlib.sha256(utc.read_bytes()).hexdigest()
assert digest=='2da149ea8b5c8f24ef69ef18cb15a1e08c1e29cd564687c8b82bef2a3407af0f'
scale=math.pi/180*6371008.8
kx=scale*math.cos(math.radians(33.7539))
def xy(n): return ((n['lon']+84.3916)*kx,(33.7539-n['lat'])*scale)
xmin,zmin,xmax,zmax=-1000,-6500,1800,-5700
extent=box(xmin,zmin,xmax,zmax)
# Sample source class at every local metre centre; distance controls crown footprint.
with rasterio.open(utc) as src:
    tr=Transformer.from_crs(4326,src.crs,always_xy=True)
    xs,zs=np.meshgrid(np.arange(xmin,xmax)+.5,np.arange(zmin,zmax)+.5)
    mx,my=tr.transform(-84.3916+xs/kx,33.7539-zs/scale)
    window=from_bounds(mx.min()-3,my.min()-3,mx.max()+3,my.max()+3,src.transform).round_offsets().round_lengths()
    image=src.read(1,window=window); t=src.window_transform(window)
    cover=image[np.floor((my-t.f)/t.e).astype(int),np.floor((mx-t.c)/t.a).astype(int)]==1
clearance=distance_transform_edt(np.pad(cover,1))[1:-1,1:-1]
shapes=defaultdict(list)
def mask(kind,g):
    if not g.is_empty and g.intersects(extent): shapes[kind].append(g)
elements=json.loads(gzip.decompress(osm.read_bytes()))['elements']
nodes={e['id']:xy(e) for e in elements if e['type']=='node'}
ways={w['id']:w for w in elements if w['type']=='way'}
def line(w): return LineString([nodes[i] for i in w['nodes']])
for w in ways.values():
    tags=w.get('tags',{})
    if tags.get('waterway'): mask('water',line(w).buffer(4))
    if tags.get('railway') in ('rail','subway','light_rail'):mask('rail',line(w).buffer(9))
    if w['nodes'][0]==w['nodes'][-1] and len(w['nodes'])>=4:
        g=make_valid(Polygon(line(w).coords))
        if tags.get('landuse') in ('residential','commercial','industrial'):mask('parcel',g)
        if tags.get('natural')=='water':mask('water',g.buffer(2))
for rel in elements:
    if rel['type']!='relation' or rel.get('tags',{}).get('landuse')!='residential':continue
    def loops(role):
        return list(polygonize([line(ways[m['ref']]) for m in rel['members'] if m['role']==role and m['ref'] in ways]))
    holes=loops('inner')
    for pg in loops('outer'): mask('parcel',make_valid(Polygon(pg.exterior,[p.exterior for p in holes if pg.covers(p)])))
for row in ['r16','brookwood-station']:
    data=read(boards/row/'context.json')
    for b in data['buildings']:
        mask('building/yard',make_valid(Polygon(b['rings'][0])).buffer(15))
    for rd in data['roads']:
        c=rd['cls']
        distance={'motorway':17,'trunk':14,'primary':11,'secondary':10,'tertiary':8,'residential':7,'cycleway':5,'footway':4,'path':4}.get(c,6)
        mask('road/path',LineString(rd['pts']).buffer(distance))
    for g in data['ground']:
        pg=make_valid(Polygon(g['rings'][0],g['rings'][1:]))
        if g['kind'].startswith('golf_') or g['kind'] in ('pitch','parking','playground','swimming_pool','water','pedestrian'):
            mask('playing/water/managed',pg.buffer(1.5))
proto=repo/'pipeline/prototypes'
for rd in read(proto/'highway-four/east-ways.json').values():
    mask('highway sightline',LineString(rd['pts']).buffer(max(15,rd['lanes']*2.1+7)))
for w in read(proto/'northeast-trail/axis.json')['ways']:
    mask('trail sightline',LineString(w['axis']).buffer(12))
for run in read(proto/'combined-canopy/source/norcross-north-study.json')['rail']:
    mask('rail',LineString(run['pts']).buffer(10))
mask('rail',LineString([p[:2] for p in read(guide)['axis']]).buffer(12))
for x,z,h,r in read(boards/'brookwood-station/context.json')['trees']:
    if z<zmax+18:mask('seam',Point(x,z).buffer(1.3*r+1))
from shapely.strtree import STRtree
indices={k:STRtree(v) for k,v in shapes.items()}
accepted=[]; reasons=Counter()
# One deterministic proposal per 20 m cell. Inferred height scales with estimated crown radius.
for z in range(zmin,zmax,20):
    for x in range(xmin,xmax,20):
        seed=hashlib.blake2s(f'{x}/{z}'.encode(),digest_size=4).digest()
        px=x+5+seed[0]%10+.5;pz=z+5+seed[1]%10+.5
        r=min(5.4,3.4+seed[2]%21/10,math.floor(clearance[int(pz-zmin),int(px-xmin)]/1.3*10)/10)
        if r<2.8:reasons['outside canopy/interior too narrow']+=1;continue
        p=Point(px,pz)
        if min(px-xmin,xmax-px,pz-zmin,zmax-pz)<1.3*r:reasons['edge']+=1;continue
        blocker=next((k for k,index in indices.items() if len(index.query(p,predicate='dwithin',distance=r*1.3))),None)
        if blocker:reasons[blocker]+=1;continue
        accepted.append([px,pz,round(2*r+2+seed[3]%3,1),r])
ranked=sorted(accepted,key=lambda v:(-v[3],-v[2],v[1],v[0]))
cells=set();low=[];rest=[]
for v in ranked:
    cell=(math.floor(v[0]/40),math.floor(v[1]/40))
    (rest if cell in cells else low).append(v);cells.add(cell)
output.write_text(json.dumps(dict(trees=low+rest,treeLowCount=len(low)),separators=(',',':')))
audit.write_text(json.dumps(dict(utcSHA=digest,proposals=5600,rejections=reasons,high=len(ranked),low=len(low),classifiedCover=float(cover.mean())),indent=2)+'\n')
