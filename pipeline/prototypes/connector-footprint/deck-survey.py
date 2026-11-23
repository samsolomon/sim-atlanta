"""Bake visible Sweet Auburn Connector road-deck elevations from 2019 USGS lidar."""
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'scripts'))
from king_memorial_corridor import K, LAT0, LON0, R, ept_points

context = json.loads((HERE.parent / 'sweet-auburn/context.json').read_text())


def lonlat(x, z):
    return LON0 + math.degrees(x / (R * K)), LAT0 - math.degrees(z / R)


def bake(x, z, elevation, cls):
    tree = cKDTree(np.column_stack((x, z)))
    profiles = []
    underpass = next(r for r in context['roads'] if r['name'] == 'Leonard Tate Street Southeast'
                     and r['pts'][0] == [1095.9, 134.0])['pts']
    def near_underpass(p):
        for a, b in zip(np.array(underpass), np.array(underpass)[1:]):
            v = b-a
            t = np.clip(np.dot(p-a, v) / np.dot(v, v), 0, 1)
            if np.linalg.norm(p - (a+t*v)) < 24:
                return True
        return False

    for road in context['roads']:
        if road['cls'] != 'motorway' or road['tunnel']:
            continue
        # These three ground ramps pass under a different class-17 structure.
        # Its returns are 7–10 m above the approach with no connecting grade.
        # Starts from the clipped raw ways 9235920, 28686579 and 905997415.
        if tuple(road['pts'][0]) in {(1062.04, -520), (1264.96, -426.24), (1180.44, -59.54)}:
            continue
        pts = np.array(road['pts'])
        cum = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
        # At Leonard Tate the classifier labels the freeway top as bare earth.
        # Include its shoulders and the ends of adjacent mapped ways over the portals.
        s = np.linspace(0, cum[-1], math.ceil(cum[-1] / 10) + 1)
        xy = np.column_stack([np.interp(s, cum, pts[:, i]) for i in (0, 1)])
        heights = np.full(len(s), np.nan)
        for i, nearby in enumerate(tree.query_ball_point(xy, 3)):
            ids = np.asarray(nearby, dtype=int)
            # The SB entrance (38974039) descends under a 314 m flyover.
            # A 301 m class-2 return on the far side anchors its hidden portion.
            lower_ramp = road['pts'][0] == [1088.74, -498.42] and s[i] >= 20
            selected = elevation[ids[cls[ids] == (2 if lower_ramp or near_underpass(xy[i]) else 17)]]
            if len(selected) < 5:
                continue
            # At flyover intersections with a second surface, leave the crossing
            # sample open; only adjacent samples on this road can fill the gap.
            if np.ptp(np.percentile(selected, [10, 90])) <= 1.1:
                heights[i] = np.median(selected)
        if road['pts'][0] == [1088.74, -498.42]:
            measured = np.where(np.isfinite(heights))[0]
            heights = np.interp(s, s[measured], heights[measured])
        for i in range(1, len(s)-1):
            if np.isnan(heights[i]) and abs(heights[i+1] - heights[i-1]) < .10*(s[i+1]-s[i-1]):
                heights[i] = np.interp(s[i], s[[i-1,i+1]], heights[[i-1,i+1]])
        measured = np.isfinite(heights)
        spans = []
        for start in np.where(measured & ~np.r_[False, measured[:-1]])[0]:
            end = start
            while end+1 < len(s) and measured[end+1]:
                end += 1
            if end == start:
                continue
            # Tie the last measured deck to the neighboring ground sample at the
            # approach, unless it is another elevated surface at a flyover.
            for adjacent, edge in [(start-1, start), (end+1, end)]:
                if adjacent < 0 or adjacent >= len(s):
                    continue
                ids = np.array(tree.query_ball_point(xy[adjacent], 3), dtype=int)
                ground = elevation[ids[cls[ids] == 2]]
                if len(ground) >= 5 and abs(np.median(ground)-heights[edge]) < 1.2:
                    heights[adjacent] = np.median(ground)
                    start, end = min(start, adjacent), max(end, adjacent)
            spans.append([[round(float(s[i]), 3), round(float(heights[i]), 2)] for i in range(start, end+1)])
        if spans:
            profiles.append({'start': road['pts'][0], 'end': road['pts'][-1], 'spans': spans})
    return profiles


def underpass_grid(x, z, elevation, cls):
    # Through Leonard Tate, the DEM follows the freeway roof. Grade between
    # the two visible street ends; class-2 returns inside are 7–10 m higher.
    folder = HERE.parent / 'sweet-auburn/ground'
    manifest = json.loads((folder / 'ground.json').read_text())
    nodes = np.fromfile(folder / 'ground.i16', dtype='<i2').reshape(manifest['rows'], manifest['cols'])
    road = next(r for r in context['roads'] if r['name'] == 'Leonard Tate Street Southeast'
                and r['pts'][0] == [1095.9, 134.0])
    pts = np.array(road['pts'])
    v = np.diff(pts, axis=0)
    lengths = np.linalg.norm(v, axis=1)
    cum = np.r_[0, np.cumsum(lengths)]
    anchors = [round(float(np.median(elevation[(np.hypot(x-px, z-pz) < 2.5) & (cls == 2)])), 1)
               for px, pz in pts[[0, -1]]]
    edits = []
    for row, col in np.ndindex(nodes.shape):
        p = np.array([manifest['bounds']['minX'] + col*5, manifest['bounds']['minZ'] + row*5])
        if ((p < pts.min(0)-25) | (p > pts.max(0)+25)).any():
            continue
        fractions = np.clip(((p-pts[:-1])*v).sum(1)/(lengths**2), 0, 1)
        distances = np.linalg.norm(p-pts[:-1]-fractions[:,None]*v, axis=1)
        i = distances.argmin()
        if distances[i] >= 25:
            continue
        floor = np.interp(cum[i]+fractions[i]*lengths[i], cum[[0, -1]], anchors)
        original = nodes[row, col]
        target = min(original, (floor-manifest['offsetM'])/manifest['scaleM'])
        weight = min(1, (25-distances[i])/5)
        value = round(original+weight*(target-original))
        if value != original:
            edits.append([row*manifest['cols']+col, value])
    return {'groundSha256':manifest['sha256'], 'portalNavd88M':anchors, 'nodes':edits}


if __name__ == '__main__':
    points = ept_points((*lonlat(915, 380), *lonlat(1300, -555)))
    profiles = bake(*points[:4])
    output = HERE / 'sweet-auburn-decks.json'
    rows = ',\n'.join('    ' + json.dumps(p, separators=(',', ':')) for p in profiles)
    ground = json.dumps(underpass_grid(*points[:4]), separators=(',', ':'))
    output.write_text('{\n  "roads": [\n' + rows + '\n  ],\n  "underpass": ' + ground + '\n}\n')
    print(f'{len(profiles)} profiled road ways → {output}')
