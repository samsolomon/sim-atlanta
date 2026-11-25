"""Registered lower lanes and the footprints of the rendered support shafts."""
import json
from collections import defaultdict
from pathlib import Path

import numpy as np
from shapely.geometry import MultiPoint, Polygon
from shapely.ops import unary_union

from faces import Layer
from overlap import clearance


def road_mask(rows, shoulder=0):
    sections=[]
    for _,a,b in rows:
        a,b=np.array(a),np.array(b)
        n=(b-a)/np.linalg.norm(b-a)
        sections.append([a-shoulder*n,b+shoulder*n])
    return unary_union([Polygon([a,b,d,c]).buffer(0) for (a,b),(c,d) in zip(sections,sections[1:])])


def protection(scene,site,mask):
    roads=json.loads(Path(__file__).with_name('lower-roads.json').read_text())[site]
    board=scene.layer(board=True)
    # Peachtree's continuous steel beams have vertical webs. Use the lower web
    # edge for each longitudinal section; a ray alone misses vertical faces.
    if site=='peachtree':
        steel=[tri for (_,_,color),tris in scene.groups.items() if color==0x585e60 for tri in tris]
        deck=scene.layer(colors=[0x7f817c])
        # Between the web lines use the deck, and at every actual web use its
        # bottom edge. No continuous modeled soffit exists between these webs.
    else:
        deck=scene.layer(name='17th Street Bridge',colors=[0x9e997f,0xd8ac36,0xbc9735])
    motorway=scene.layer(name='Decks and embedded rails',colors=[0x54565d]) if site=='seventeenth' else None
    footprints=[]
    if site=='seventeenth':
        # The frozen 955f5f56 material has side walls and an open bottom.
        # Recover its implicit contact plane only from its four coplanar rim
        # vertices. A closed successor must provide full-area drawn bottom faces.
        for center in json.loads(Path(__file__).with_name('pier-register.json').read_text()):
            x,z=center
            ref=max(board.hits(center))
            rims=set()
            bottoms=[]
            for (label,_,color),tris in scene.groups.items():
                if '17th Street Bridge' not in label or color!=0xbcaf94:continue
                for tri in tris:
                    near=(np.abs(tri[:,0]-x)<.70)&(np.abs(tri[:,2]-z)<.85)&(np.abs(tri[:,1]-ref)<1)
                    if np.all(near):
                        bottoms.append(tri)
                    rims.update(tuple(v) for v in tri[near])
            if len(rims)<4:raise ValueError(f'Missing shaft foot at {center}')
            foot=MultiPoint([(p[0],p[2]) for p in rims]).convex_hull
            if not bottoms:
                if len(rims)!=4 or np.ptp([v[1] for v in rims])>.001:
                    raise ValueError(f'Incomplete open foot at {center}')
                y=next(iter(rims))[1]
                xy=list(foot.exterior.coords)[:-1]
                bottoms=[np.array([[a,y,b] for a,b in (xy[0],xy[i],xy[i+1])]) for i in (1,2)]
            fit=clearance(Layer(bottoms),board,foot)
            footprints.append((foot,dict(xz=center,areaM2=foot.area,seating=fit)))
    controls=[]
    for r in roads:
        lane=road_mask(r['rows']).intersection(mask)
        if lane.area<.01:continue
        margin=road_mask(r['rows'],.7 if r['link'] else 1.8)
        check=clearance(deck,board,lane)
        raised=clearance(deck,motorway,lane) if motorway else None
        if raised and raised['minimum'] and (not check['minimum'] or raised['minimum'][0]<check['minimum'][0]):
            check['minimum']=raised['minimum']
        if site=='peachtree':
            from shapely.geometry import LineString
            from overlap import height
            for tri in steel:
                lowest=tri[tri[:,1]<tri[:,1].max()-.1]
                if len(lowest)!=2:continue
                line=LineString(lowest[:,[0,2]]).intersection(lane)
                for i in board.tree.query(line,predicate='intersects'):
                    seg=line.intersection(board.tree.geometries[i])
                    for x,z in getattr(seg,'coords',[]):
                        gap=float(lowest[0,1])-height(board,i,x,z)
                        if check['minimum'] is None or gap<check['minimum'][0]:check['minimum']=[gap,x,z]
        controls.append(dict(way=r['way'],lanes=r['lanes'],clearance=check,raisedLowerRoad=raised,
                             pierLaneAreaM2=sum(p.intersection(lane).area for p,_ in footprints),
                             pierShoulderAreaM2=sum(p.intersection(margin.difference(lane)).area for p,_ in footprints)))
    return dict(roads=controls,feet=[f for _,f in footprints])
