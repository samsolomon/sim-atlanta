"""Resolve a complete transverse edge at every crossing of a rendered facet."""
import numpy as np
from shapely.geometry import LineString, Point
from overlap import open_intervals


def transverse(source, receiver, a, b, outward):
    a,b,outward=np.asarray(a),np.asarray(b),np.asarray(outward)
    direction=(b-a)/np.linalg.norm(b-a)
    # Inset 0.5 mm in plan from the nominal corners, below the 1 mm seam budget.
    a=a+.0005*direction
    b=b-.0005*direction
    q=LineString([a,b]);length=q.length
    eps=.0005
    positions={0.,length}
    gaps=[]
    for layer,shift in [(source,-eps),(receiver,eps)]:
        ray=LineString([a+shift*outward,b+shift*outward])
        gaps.extend(open_intervals(layer,*ray.coords))
        for i in layer.tree.query(ray,predicate='intersects'):
            intersection=ray.intersection(layer.tree.geometries[i])
            for vertex in intersection.coords:
                positions.add(ray.project(Point(vertex)))
    heights=[]
    for x,y in zip(sorted(positions),sorted(positions)[1:]):
        if y-x<1e-7:continue
        for along in [x+1e-8,y-1e-8]:
            mid=a+along*direction
            before=source.hits(mid-eps*outward);after=receiver.hits(mid+eps*outward)
            if before and after:heights.append([max(after)-max(before),*mid])
    return dict(maxOpenWidthM=max((hi-lo for lo,hi in gaps),default=0),
                minStep=min(heights,default=None),maxStep=max(heights,default=None))


def peachtree_terminal(scene,line,road,walk,where):
    board=scene.layer(board=True)
    result=[]
    for end,mid,toe in [(0,[10.64,-4988.6],[32.25,-4966.97]),(line.length,[-69,-5105.52],[-72,-5110])]:
        axis=np.array(line.interpolate(end).coords[0])
        nxt=np.array(line.interpolate(.01 if end==0 else end-.01).coords[0])
        outward=(axis-nxt)/np.linalg.norm(axis-nxt)
        lateral=np.array([-outward[1],outward[0]])
        toe=np.array(toe);last=toe-np.array(mid);last/=np.linalg.norm(last)
        side=np.array([-last[1],last[0]])
        segments=[(-16.55,-13.45,walk),(-13.45,13.45,road),(13.45,16.55,walk)]
        for lo,hi,layer in segments:
            result.append(dict(stationM=end,band=[lo,hi],
                joint=transverse(layer,layer,axis+lo*lateral,axis+hi*lateral,outward),
                groundLanding=transverse(layer,board,toe+lo*side,toe+hi*side,last)))
    return result
