"""Summarize USGS 3DEP returns over the two Sweet Auburn sanctuary roofs."""
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from king_memorial_corridor import K, LAT0, LON0, R, ept_points


def lonlat(x, z):
    return LON0 + math.degrees(x / (R * K)), LAT0 - math.degrees(z / R)


# City x and z in metres, and LAS classification (None includes all classes).
SITES = {
    'Ebenezer': [
        ('Nave ridge strip', 1608, -156, 1609, -140, 6),
        ('East wing', 1621, -160, 1629, -133, 6),
        ('West front tower', 1600.7, -167.7, 1605.5, -160.8, 6),
    ],
    'Big Bethel': [
        ('Nave ridge strip', 1026.8, -232, 1027.6, -226, 6),
        ('Round turret', 1015, -201.5, 1020, -195, 6),
        ('Belfry and spire', 1028, -203.3, 1034.6, -195.5, 6),
        ('Spire tip', 1031, -199.3, 1032.5, -197.8, None),
    ],
}


def main():
    for name, probes in SITES.items():
        west = min(p[1] for p in probes)
        south = max(p[4] for p in probes)
        east = max(p[3] for p in probes)
        north = min(p[2] for p in probes)
        # Add a metre around the envelope so no candidate is lost at the query boundary.
        x, z, h, cls, _ = ept_points((*lonlat(west-1, south+1), *lonlat(east+1, north-1)))
        print(f'{name} — count, median, 90th percentile, maximum (m NAVD88)')
        for label, x0, z0, x1, z1, kind in probes:
            mask = (x > x0) & (x < x1) & (z > z0) & (z < z1)
            if kind is not None:
                mask &= cls == kind
            values = h[mask]
            if not values.size:
                raise ValueError(f'No source returns for {name}, {label}')
            print(f'{label:20s} {values.size:4} {np.median(values):8.2f}'
                  f' {np.percentile(values, 90):8.2f} {values.max():8.2f}')


if __name__ == '__main__':
    main()
