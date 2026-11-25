"""Intersect two drawn, piecewise planar meshes inside a registered plan mask.

A linear height difference on a clipped triangle pair takes its extrema at
the polygon's corners. Vertical faces have zero plan area and are excluded.
"""
from shapely.geometry import LineString
from shapely.ops import unary_union


def height(layer, index, x, z):
    a, dx, dz = layer.planes[index]
    return a[1]+dx*(x-a[0])+dz*(z-a[2])


def clearance(top, bottom, mask):
    low = high = None
    patches = []
    for i in top.tree.query(mask,predicate='intersects'):
        region=top.tree.geometries[i].intersection(mask)
        for j in bottom.tree.query(region,predicate='intersects'):
            poly=region.intersection(bottom.tree.geometries[j])
            if poly.area<1e-8:continue
            patches.append(poly)
            for part in getattr(poly,'geoms',[poly]):
                if part.geom_type!='Polygon':continue
                for x,z in part.exterior.coords:
                    gap=height(top,i,x,z)-height(bottom,j,x,z)
                    if low is None or gap<low[0]:low=[gap,x,z]
                    if high is None or gap>high[0]:high=[gap,x,z]
    return dict(minimum=low,maximum=high,areaM2=unary_union(patches).area)


def open_intervals(layer, a, b):
    trace=LineString([a,b])
    faces=[layer.tree.geometries[i] for i in layer.tree.query(trace,predicate='intersects')]
    missing=trace.difference(unary_union(faces))
    spans=[]
    for part in getattr(missing,'geoms',[missing]):
        if part.length:
            from shapely.geometry import Point
            spans.append(sorted([trace.project(Point(part.coords[k])) for k in (0,-1)]))
    return sorted(spans)
