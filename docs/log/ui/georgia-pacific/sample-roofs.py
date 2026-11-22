"""Run with the USGS e1065n1253 LAZ from the gallery and laspy[lazrs], numpy, rasterio."""
import math
import sys

import laspy
import numpy as np
from rasterio.warp import transform


def first_returns(path, legacy=False):
    metres = 6371008.8 * math.pi / 180
    east = metres * math.cos(math.radians(33.7539))
    bounds = (2229360, 2229910, 1366760, 1367100) if legacy else (1065390, 1065610, 1253000, 1253140)
    xmin, xmax, ymin, ymax = bounds
    crs = "EPSG:2885" if legacy else "EPSG:6350"
    scale = 1200 / 3937 if legacy else 1
    with laspy.open(path) as source:
        for chunk in source.chunk_iterator(250_000):
            x, y = np.asarray(chunk.x), np.asarray(chunk.y)
            site = ((x > xmin) & (x < xmax) & (y > ymin) & (y < ymax)
                    & (np.asarray(chunk.return_number) == 1))
            if site.any():
                lon, lat = transform(crs, "EPSG:4326", x[site], y[site])
                yield np.column_stack(((np.array(lon) + 84.3916) * east,
                                       (33.7539 - np.array(lat)) * metres,
                                       np.asarray(chunk.z)[site] * scale))


def sample(cloud, x, z):
    inside = (abs(cloud[:, 0] - x) <= 2) & (abs(cloud[:, 1] - z) <= 2)
    heights = cloud[inside, 2]
    return len(heights), round(np.median(heights), 2) if len(heights) else None


if __name__ == "__main__":
    points = np.concatenate(list(first_returns(sys.argv[1])))
    probes = [(x, -382) for x in (390, 402, 411, 421, 430, 440)]
    probes += [(409, z) for z in (-417, -425, -432)]
    probes += [(480, -405), (372, -380)]
    for x, z in probes:
        print(x, z, *sample(points, x, z))

    if len(sys.argv) > 2:
        old = np.concatenate(list(first_returns(sys.argv[2], legacy=True)))
        # Omit the southern 3 m beside the tall tower wall.
        north = old[(old[:, 0] > 404.62) & (old[:, 0] < 413.78)
                    & (old[:, 1] > -436.0) & (old[:, 1] < -416)]
        print("2006 first returns within the northern footprint, x / z / Z (m)")
        print(np.round(north, 2))
