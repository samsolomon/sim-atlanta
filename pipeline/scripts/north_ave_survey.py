"""Read-only North Avenue 3DEP survey; no City data or geometry changes.
Run with numpy, laspy[lazrs], pyproj and matplotlib available. Reuses the EPT
reader/cache from king_memorial_corridor. USGS points are public domain.
"""
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from king_memorial_corridor import ept_points

ROOT = Path(__file__).resolve().parents[2]
BOX = (-84.4022, 33.7700, -84.3990, 33.7716)
ORIGIN = np.array([-761.16, -1885.765])
AXIS = np.array([-.873, .4877]); AXIS /= np.linalg.norm(AXIS)
CROSS = np.array([-AXIS[1], AXIS[0]])
x, z, h, cls, gps = ept_points(BOX)
s = (x - ORIGIN[0]) * AXIS[0] + (z - ORIGIN[1]) * AXIS[1]
t = (x - ORIGIN[0]) * CROSS[0] + (z - ORIGIN[1]) * CROSS[1]
# Selection windows are analyst picks, not automatic structural boundaries.
windows = [('Marietta', -2, 19), ('Active-rail cover', 23, 87),
           ('Disused east strip', 98, 111), ('Disused middle strip', 114, 132),
           ('Disused west strip', 136, 154)]
summary = {'source': 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json',
           'bbox': BOX, 'origin': ORIGIN.tolist(), 'axis': AXIS.tolist(),
           'points': len(x), 'classes': {str(k): int(v) for k,v in zip(*np.unique(cls, return_counts=True))},
           'adjustedGpsTimeRange': [float(gps.min()), float(gps.max())], 'groups': []}
for name, lo, hi in windows:
    m = (s > lo) & (s < hi) & (abs(t) < 2) & (cls == 17)
    full = (s > lo) & (s < hi) & (cls == 17)
    summary['groups'].append({'name':name, 'selectionWindow': [lo, hi],
        'axisP01P99M': np.percentile(s[m], [1,99]).round(2).tolist(),
        'elevationP10P50P90Navd88M': np.percentile(h[m], [10,50,90]).round(2).tolist(),
        'crossP01P99M': np.percentile(t[full],[1,99]).round(2).tolist(), 'class17Points': int(full.sum())})
fig, axes = plt.subplots(3, 1, figsize=(14, 12))
for ax, mask, title in [(axes[0], np.ones(len(x), bool), 'All returns: elevation'),
                         (axes[1], cls == 17, 'Class 17: bridge-deck returns')]:
    im = ax.scatter(s[mask], t[mask], c=h[mask], s=1, cmap='terrain', vmin=296, vmax=305)
    ax.set(xlim=(-20,170), ylim=(-30,30), title=title, xlabel='Metres west along straight reference axis', ylabel='Cross-axis metres')
    ax.grid(alpha=.3); fig.colorbar(im, ax=ax, label='Elevation, metres NAVD88')
for code, color, label in [(2,'#2078b4','Class 2 ground'), (17,'#be4136','Class 17 deck'), (1,'#999999','Class 1 unclassified')]:
    m = (abs(t)<6) & (cls==code)
    axes[2].scatter(s[m],h[m],s=2,c=color,label=label)
axes[2].set(xlim=(-20,170), ylim=(295,306), title='Corridor section, within 6 m of reference axis', xlabel='Metres west along straight reference axis', ylabel='Elevation, metres NAVD88')
axes[2].grid(alpha=.3); axes[2].legend(markerscale=4)
fig.suptitle('North Avenue — USGS 3DEP point cloud, acquired 22 April 2019\nDeck groups are interpreted; top returns do not measure soffit clearance')
fig.tight_layout()
fig.savefig(ROOT/'docs/log/north-ave/lidar-survey.png', dpi=140)
(ROOT/'pipeline/prototypes/north-ave/lidar-summary.json').write_text(json.dumps(summary, indent=2)+'\n')
print(json.dumps(summary, indent=2))
