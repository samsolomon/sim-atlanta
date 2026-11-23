"""Sample the two Odd Fellows footprints and roof surfaces in the USGS EPT."""
import json
import math
import sys
from pathlib import Path

import numpy as np
from shapely import contains_xy
from shapely.geometry import Polygon

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'pipeline/scripts'))
from king_memorial_corridor import K, LAT0, LON0, R, ept_points


def lonlat(x, z):
    return LON0 + math.degrees(x / (K * R)), LAT0 - math.degrees(z / R)


def main():
    x, z, height, cls, _ = ept_points((*lonlat(1057, -189), *lonlat(1122, -224)))
    context = json.loads((ROOT / 'pipeline/prototypes/sweet-auburn/context.json').read_text())
    print('Surface / class-6 count / median NAVD88 m')
    for building in context['buildings']:
        if building['id'] not in ('osm:way:102163024', 'osm:way:841048595'):
            continue
        outer, *holes = building['rings']
        inside = contains_xy(Polygon(outer, holes).buffer(-1), x, z)
        values = height[inside & (cls == 6)]
        print(f"{building['id']}: {len(values)} / {np.median(values):.2f}")
    for label, x0, z0, x1, z1 in [
        ('Storefront', 1060, -197, 1092, -192),
        ('Hall ridge strip', 1079, -211, 1090, -207),
        ('North eave strip', 1077, -221, 1092, -218),
        ('Tower rear', 1105, -221, 1118, -211),
        ('Tower front', 1108, -205, 1117, -193),
        ('Tower upper projection', 1103, -208, 1105, -204),
    ]:
        values = height[(cls == 6) & (x > x0) & (x < x1) & (z > z0) & (z < z1)]
        if not len(values):
            raise ValueError(f'No building returns for {label}')
        print(f'{label}: {len(values)} / {np.median(values):.2f}')


if __name__ == '__main__':
    main()
