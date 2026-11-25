"""Add illustrative tee grading to a private copy of the 7d57f34c data."""
import argparse
import hashlib
import json
import math
import struct
from pathlib import Path

from shapely import constrained_delaunay_triangles, get_parts, union_all
from shapely.geometry import LineString, Point, Polygon, box

p = argparse.ArgumentParser(description=__doc__)
for arg in ('source', 'destination', 'pilot', 'osm'):
    p.add_argument(arg, type=Path)
args = p.parse_args()
load = lambda path: json.loads(path.read_bytes())
pilot = load(args.pilot)
assert hashlib.sha256(args.osm.read_bytes()).hexdigest() == pilot['mapSHA256']
elements = load(args.osm)['elements']
nodes = {n['id']: n for n in elements if n['type'] == 'node'}
scale = math.radians(1) * 6371008.8
def point(ref):
    n = nodes[ref]
    return Point((n['lon'] + 84.3916) * scale * math.cos(math.radians(33.7539)), (33.7539 - n['lat']) * scale)

starts = []
for hole in (e for e in elements if e.get('tags', {}).get('golf') == 'hole'):
    origin = point(hole['nodes'][0])
    onward = next(p for ref in hole['nodes'][1:] if (p := point(ref)).distance(origin) > 5)
    axis = LineString([point(ref) for ref in hole['nodes']])
    distance = origin.distance(onward)
    back = (origin.x-30*(onward.x-origin.x)/distance, origin.y-30*(onward.y-origin.y)/distance)
    corridor = LineString([back, origin, axis.interpolate(120)])
    starts.append((origin, onward, int(hole['tags']['ref']), corridor))
rows = {}
for row in ['brookwood-south', 'brookwood-station', 'r16']:
    rel = Path('scene/square-board') / row
    source = args.source / rel
    d = load(source / 'context.json')
    b = d['bounds']
    tile = box(b['minX'], b['minZ'], b['maxX'], b['maxZ'])
    cuts = [Polygon(g['rings'][0], g['rings'][1:]) for g in d['ground'] if g['kind'] == 'golf_tee']
    d['golfTees'] = []
    d['points']['golfMarkers'] = []
    rows[row] = (d, tile, union_all(cuts), source, rel)
tees = [f for f in pilot['features'] if f['kind']=='tee']
assert len(tees) == 35
for f in tees:
    shape = Polygon(f['rings'][0]['points'])
    footprint = union_all([cuts.intersection(shape.buffer(.03)) for _, _, cuts, _, _ in rows.values()])
    # Published cuts were rounded at 1 cm. Remove digitisation slivers before grading.
    footprint = footprint.simplify(.04, preserve_topology=True)
    inner = footprint.buffer(-.8, join_style='mitre').simplify(.04)
    center = inner.representative_point()
    start, onward, hole, _ = min(starts, key=lambda s: (s[3].distance(center),s[0].distance(center)))
    dx, dz = onward.x-start.x, onward.y-start.y
    length = math.hypot(dx,dz)
    side = min(2.4, center.distance(inner.boundary)*.72)
    pair = [[round(center.x-sign*dz/length*side,3),round(center.y+sign*dx/length*side,3)] for sign in [-1,1]]
    assert all(inner.covers(Point(m)) for m in pair)
    owner = next(r for r in rows.values() if r[1].covers(center))
    manifest = load(owner[3]/'ground.json')
    raw = (owner[3]/'ground.i16').read_bytes()
    x=(center.x-manifest['bounds']['minX'])/5
    z=(center.y-manifest['bounds']['minZ'])/5
    ix,iz=math.floor(x),math.floor(z)
    h=sum(struct.unpack_from('<h',raw,2*((iz+j)*manifest['cols']+ix+i))[0]*.1*(x-ix if i else 1-x+ix)*(z-iz if j else 1-z+iz)
          for i in range(2) for j in range(2))-manifest['vertical']['sceneZeroNavd88M']
    split = sum(tile.intersection(footprint).area>.01 for _,tile,_,_,_ in rows.values()) > 1
    for d,tile,_,_,_ in rows.values():
        faces=[]
        for region,cap in [(inner,True),(footprint.difference(inner),False)]:
            for poly in get_parts(region.intersection(tile)):
                if poly.geom_type!='Polygon' or poly.area < .001: continue
                for tri in constrained_delaunay_triangles(poly).geoms:
                    face=[[round(x,4),round(z,4),1 if cap else round(min(1,footprint.boundary.distance(Point(x,z))/.8),5)] for x,z in list(tri.exterior.coords)[:3]]
                    if Polygon([v[:2] for v in face]).area>.0001:
                        faces.append(face)
        if faces:
            d['golfTees'].append(dict(id=f['osm'],hole=hole,anchor=[center.x,center.y],sharedDatum=round(h,4) if split else None,faces=faces))
        d['points']['golfMarkers'].extend(p for p in pair if tile.contains(Point(p)))
for d,tile,_,source,rel in rows.values():
    dest=args.destination/rel/'context.json'
    assert dest.resolve()!=(source/'context.json').resolve()
    d['golfPresentation']='Illustrative level tees, raised 0.45 m at their reference point; graded edges, enlarged markers and 4.8 m flagsticks. Marker axes inferred from mapped opening lines of play.'
    dest.write_text(json.dumps(d,separators=(',',':'))+'\n')
    print(d['name'],len(d['golfTees']),len(d['points']['golfMarkers']),sum(len(t['faces']) for t in d['golfTees']))
