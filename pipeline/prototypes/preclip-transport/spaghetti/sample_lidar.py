"""Extract small station windows from USGS EPT. The fixture ships the observations."""

from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import io, json, math, sys, urllib.request
import laspy
import numpy as np
from pyproj import Transformer
from scipy.spatial import cKDTree
from shapely.geometry import LineString

DIR = Path(__file__).resolve().parent
BASE = "https://usgs-lidar-public.s3.amazonaws.com/GA_Statewide_B3_2018/"
CACHE = Path(sys.argv[1])
src = json.loads((DIR / "source.json").read_text())
route = LineString(
    [p for i, w in enumerate(src["route"]) for p in w["xz"][int(i > 0) :]]
)
stations = []
for label, line in [("route", route)] + [
    (str(w["crossingWay"]), LineString(w["xz"])) for w in src["crossings"]
]:
    for s in sorted({*range(0, math.ceil(line.length), 10), line.length}):
        x, z = line.interpolate(s).coords[0]
        stations.append((label, s, x, z))


def read(path):
    file = CACHE / path
    if not file.exists():
        file.parent.mkdir(parents=True, exist_ok=True)
        data = urllib.request.urlopen(BASE + path, timeout=30).read()
        file.write_bytes(data)
    return file.read_bytes()


meta = json.loads(read("ept.json"))
tf = Transformer.from_crs(4326, 3857, always_xy=True)
factor = 111195 * math.cos(math.radians(33.89))
x, z = np.array([v[2:] for v in stations]).T
xs, ys = tf.transform(x / factor - 84.26, 33.89 - z / 111195)
tree = cKDTree(np.column_stack([xs, ys]))
box = meta["bounds"]


def visit(key, h):
    d, i, j, k = map(int, key.split("-"))
    width = (box[3] - box[0]) / 2**d
    if key not in h or d > 10:
        return
    a, b = box[0] + i * width, box[1] + j * width
    if not np.any(
        (xs >= a - 5) & (xs <= a + width + 5) & (ys >= b - 5) & (ys <= b + width + 5)
    ):
        return
    if h[key] == -1:
        h = json.loads(read(f"ept-hierarchy/{key}.json"))
    if h.get(key, 0) > 0:
        yield key
    for di in (0, 1):
        for dj in (0, 1):
            for dk in (0, 1):
                yield from visit(f"{d + 1}-{2 * i + di}-{2 * j + dj}-{2 * k + dk}", h)


def points(key):
    cloud = laspy.read(io.BytesIO(read(f"ept-data/{key}.laz")))
    dist, idx = tree.query(np.column_stack([cloud.x, cloud.y]), distance_upper_bound=4)
    valid = np.isfinite(dist)
    return (
        np.array(cloud.x)[valid],
        np.array(cloud.y)[valid],
        np.array(cloud.z)[valid],
        np.array(cloud.classification)[valid],
    )


keys = list(visit("0-0-0-0", json.loads(read("ept-hierarchy/0-0-0-0.json"))))
with ThreadPoolExecutor(4) as pool:
    blocks = list(pool.map(points, keys))
px, py, h, cls = [np.concatenate(a) for a in zip(*blocks)]
cloud = cKDTree(np.column_stack([px, py]))
out = []
for (label, s, _, _), ids in zip(
    stations, cloud.query_ball_point(np.column_stack([xs, ys]), 4)
):
    groups = []
    for c in (2, 17):
        values = np.sort(h[ids][cls[ids] == c])
        for group in np.split(values, np.where(np.diff(values) > 1.0)[0] + 1):
            if len(group) >= 3:
                groups.append(
                    [
                        c,
                        len(group),
                        round(float(np.median(group)), 2),
                        round(float(np.ptp(group)), 2),
                    ]
                )
    out.append([label, round(s, 4), groups])
print(json.dumps(out, separators=(",", ":")))
