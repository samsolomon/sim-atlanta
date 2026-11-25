"""Vertical intersections with the actual, world-space City face export."""
import json
from collections import defaultdict
from pathlib import Path

import numpy as np
from shapely.geometry import Point, Polygon
from shapely.strtree import STRtree


class Layer:
    def __init__(self, triangles):
        self.planes = []
        polygons = []
        for tri in triangles:
            a, b, c = tri
            u, v = b-a, c-a
            det = u[0]*v[2]-u[2]*v[0]
            if abs(det) < 1e-10:
                continue
            self.planes.append((a, (u[1]*v[2]-v[1]*u[2])/det, (u[0]*v[1]-v[0]*u[1])/det))
            polygons.append(Polygon(tri[:, [0, 2]]))
        self.tree = STRtree(polygons)

    def hits(self, point):
        x, z = point
        indices = self.tree.query(Point(x, z), predicate='intersects')
        return sorted({a[1]+dx*(x-a[0])+dz*(z-a[2]) for a, dx, dz in (self.planes[i] for i in indices)})


class Scene:
    def __init__(self, path):
        self.groups = defaultdict(list)
        for mesh in json.loads(Path(path).read_text())['meshes']:
            verts = np.array(mesh['vertices'])
            for a, b, c, _, color in mesh['faces']:
                self.groups[(mesh['label'], bool(mesh['board']), color)].append(verts[[a,b,c]])

    def layer(self, *, name='', colors=(), board=False):
        faces = [tri for (label,is_board,color),tris in self.groups.items()
                 if is_board == board and name in label and (not colors or color in colors)
                 for tri in tris]
        if not faces:
            raise ValueError(f'Empty mounted selection: {name}, {colors}, board={board}')
        return Layer(faces)
