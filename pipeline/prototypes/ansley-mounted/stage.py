"""Stage the three private row contexts from the accepted board and pinned pilot."""
import argparse
import gzip
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path

from shapely import constrained_delaunay_triangles, make_valid, union_all
from shapely.geometry import Polygon, LineString, Point, box

parser = argparse.ArgumentParser()
for name in ('baseline','dest','pilot','osm','proof'):
    parser.add_argument(name,type=Path)
a = parser.parse_args()
pack = Path(__file__).resolve().parents[1]
load = lambda p: json.loads(p.read_bytes())
pilot = load(a.pilot)
assert hashlib.sha256(a.osm.read_bytes()).hexdigest() == pilot['mapSHA256']
osm = load(a.osm)['elements']
nodes = {e['id']:e for e in osm if e['type']=='node'}
groups = defaultdict(list)
greens = {}
for f in pilot['features']:
    kind = f['kind']
    if kind in ('road','path','cartpath','stream'):
        geom = LineString(f['rings'][0]['points']).buffer({'road':3,'path':1,'cartpath':1.2,'stream':1.8}[kind])
    else:
        geom = make_valid(Polygon(next(r['points'] for r in f['rings'] if r['role']=='outer'),
                                  [r['points'] for r in f['rings'] if r['role']=='inner']))
    groups[kind].append(geom)
    if kind=='green':
        greens[f['osm']] = geom
zones = {k:union_all(v) for k,v in groups.items()}
course = zones['course']
blocked = union_all([zones[k] for k in ('wood','water','building','stream','road','path','cartpath')])
turf = course.difference(blocked)
play = union_all([zones[k] for k in ('green','fairway','tee','bunker')])
cuts = {'fringe':zones['fairway'].buffer(2.8),
        'collar':zones['green'].buffer(1.05), 'lip':zones['bunker'].buffer(.45),
        **{k:zones[k] for k in ('fairway','tee','green','bunker')}}
pins = {}
for hole in (e for e in osm if e.get('tags',{}).get('golf')=='hole'):
    n = nodes[hole['nodes'][-1]]
    assert n['tags']['golf']=='pin'
    scale = math.radians(1)*6371008.8
    p = Point((n['lon']+84.3916)*scale*math.cos(math.radians(33.7539)),(33.7539-n['lat'])*scale)
    green, = [id for id,g in greens.items() if g.contains(p)]
    pins[int(hole['tags']['ref'])] = (p,green)
assert set(pins)==set(range(1,10)) and len({g for _,g in pins.values()})==9

def polygons(geom):
    if geom.is_empty:
        return
    if geom.geom_type=='Polygon':
        yield geom
    elif hasattr(geom,'geoms'):
        for part in geom.geoms:
            yield from polygons(part)

def node_xy(ref):
    n = nodes[ref]
    return Point((n['lon']+84.3916)*scale*math.cos(math.radians(33.7539)), (33.7539-n['lat'])*scale)

# An inferred transverse pair. Nearby mapped hole starts supply the playing axis.
starts = []
for h in (e for e in osm if e.get('tags',{}).get('golf')=='hole'):
    origin = node_xy(h['nodes'][0])
    onward = next(p for ref in h['nodes'][1:] if (p:=node_xy(ref)).distance(origin)>5)
    starts.append((origin,onward))
markers = []
for tee in groups['tee']:
    centre = tee.representative_point()
    start,target = min(starts,key=lambda pair:pair[0].distance(centre))
    if start.distance(centre) <= 55:
        dx,dz = target.x-start.x,target.y-start.y
    else:
        rect = list(tee.minimum_rotated_rectangle.exterior.coords)
        dx,dz = max(((b[0]-a[0],b[1]-a[1]) for a,b in zip(rect,rect[1:])),key=lambda d:math.hypot(*d))
    length = math.hypot(dx,dz)
    nx,nz = -dz/length,dx/length
    width = min(2.0,centre.distance(tee.boundary)*.72)
    pair=[(round(centre.x+side*nx*width,2),round(centre.y+side*nz*width,2)) for side in [-1,1]]
    assert all(tee.contains(Point(*p)) and turf.contains(Point(*p)) for p in pair)
    markers.append(pair)

def bowl_faces(pg):
    edge=pg.simplify(.28,preserve_topology=True)
    core=edge.buffer(-1.4,quad_segs=2).simplify(.2,preserve_topology=True).intersection(edge)
    for layer in [edge.difference(core),core]:
        for tri in constrained_delaunay_triangles(layer).geoms:
            face=[[round(x,3),round(z,3),round(min(.48,edge.boundary.distance(Point(x,z))*.34),3)]
                  for x,z in list(tri.exterior.coords)[:3]]
            if max(v[2] for v in face)>0 and Polygon([v[:2] for v in face]).area>1e-5:
                yield face

crowns = load(pack/'midtown-landscape/crowns.json')
report = {'holes':{h:[g,round(p.x,2),round(p.y,2)] for h,(p,g) in pins.items()},'rows':{}}
proof = load(a.proof)
for row,which in [('brookwood-south',None),('brookwood-station','baseline'),('r16','candidate')]:
    rel = Path('scene/square-board')/row
    if which:
        for name,spec in proof[which].items():
            assert hashlib.sha256((a.baseline/rel/name).read_bytes()).hexdigest()==spec['sha256']
    raw = (a.baseline/rel/'context.json').read_bytes()
    data = json.loads(raw)
    b = data['bounds']
    tile = box(b['minX'],b['minZ'],b['maxX'],b['maxZ'])
    stats = dict(courseSqM=round(tile.intersection(course).area),originalTrees=len(data['trees']))
    for k,g in cuts.items():
        for pg in polygons(g.intersection(turf).intersection(tile).simplify(.12,preserve_topology=True)):
            data['ground'].append(dict(kind='golf_'+k,sub='inferred' if k in ('fringe','collar','lip') else 'reported',name=None,
                rings=[[[round(x,2),round(z,2)] for x,z in ring.coords[:-1]] for ring in [pg.exterior,*pg.interiors]]))
    # Paths and creek follow surveyed centerlines. Widths and paint are inferred.
    for k in ['cartpath','stream']:
        for pg in polygons(zones[k].intersection(course).intersection(tile)):
            data['ground'].append(dict(kind='golf_'+k,sub='inferred',name=None,
                rings=[[[round(x,2),round(z,2)] for x,z in ring.coords[:-1]] for ring in [pg.exterior,*pg.interiors]]))
    data.setdefault('points',{})['golfFlags']=[[round(p.x,2),round(p.y,2)] for p,g in pins.values() if tile.contains(p)]
    data['points']['golfMarkers']=[p for pair in markers for p in pair if tile.contains(Point(*p))]
    data['golfBowls']=[face for bunker in groups['bunker'] for pg in polygons(bunker.intersection(turf).intersection(tile)) for face in bowl_faces(pg)]
    if row in crowns:
        source=crowns[row]
        protected=play.union(zones['cartpath']).union(zones['stream']).union(zones['path']).intersection(course)
        trees=[]
        low=0
        for i,(x,z,h,r) in enumerate(source['trees']):
            if protected.distance(Point(x,z))<=1.3*r:
                continue
            trees.append([x,z,h,r])
            low+=i<source['lowCount']
        assert len({(x,z) for x,z,_,_ in trees})==len(trees)
        data.update(trees=trees,treeLowCount=low,treeSource='Atlanta 2023 UTC and Meta/WRI canopy heights; centers, radii and heights inferred.')
        stats.update(sourceHigh=len(source['trees']),sourceLow=source['lowCount'],high=len(trees),low=low)
    dest=a.dest/rel/'context.json'
    assert dest.resolve()!=(a.baseline/rel/'context.json').resolve()
    encoded=(json.dumps(data,separators=(',',':'))+'\n').encode()
    dest.write_bytes(encoded)
    stats.update(rawDelta=len(encoded)-len(raw),gzipDelta=len(gzip.compress(encoded))-len(gzip.compress(raw)),flags=len(data['points']['golfFlags']))
    report['rows'][row]=stats
print(json.dumps(report,indent=2))
