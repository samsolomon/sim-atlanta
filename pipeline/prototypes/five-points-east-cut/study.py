"""Rebuild the Five Points east-cut transects from pinned OSM and USGS bare-earth data."""
import csv
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import rasterio

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / 'pipeline/scripts'))
from downtown_terrain import TILE, project, read_ground, interpolate, K, R, LON0, LAT0

NAMES = {'702258817': 'ER', '1453238814': 'X', '702258818': 'EL', '54032236': 'CSX'}
STATIONS = [15, 35, 55, 75, 90]


def main():
    source = json.loads((HERE / 'osm-ways.json').read_text())
    xy = {name: np.array([project(*c) for c in source[key]['coordinates']]) for key, name in NAMES.items()}
    origin = xy['CSX'][0]
    along = xy['CSX'][-1] - origin
    along /= np.linalg.norm(along)
    across = np.array([along[1], -along[0]])
    tracks = {name: sorted(((pts - origin) @ np.array([along, across]).T).tolist()) for name, pts in xy.items()}
    ground = np.fromfile(ROOT/'pipeline/prototypes/downtown-ground/ground.i16', dtype='<i2').reshape(401,401)
    rows = []
    with rasterio.open(ROOT / f'data/raw/terrain/{TILE}.tif') as dem:
        for s in STATIONS:
            for name in ['SW flank', *tracks, 'NE flank']:
                if name in tracks:
                    us, vs = np.array(tracks[name]).T
                    assert min(us) <= s <= max(us)
                    u = np.interp(s, us, vs)
                else:
                    u = -34 if name == 'SW flank' else 8
                x, z = origin + along*s + across*u
                lon, lat = LON0 + np.degrees(x / (R*K)), LAT0 - np.degrees(z/R)
                native = read_ground(dem, np.array([x]), np.array([z]))[0]
                rows.append([s, name, round(u,2), round(x,2), round(z,2), round(lon,7), round(lat,7),
                             round(float(native),2), round(interpolate(ground,x,z),2)])
        fig, (plan, profile) = plt.subplots(2, 1, figsize=(10, 6.8), layout='constrained',
                                             gridspec_kw={'height_ratios': [1, 1.5]})
        colors = {'ER':'#24568b', 'X':'#7a588c', 'EL':'#247b89', 'CSX':'#ab5535'}
        for name, track in tracks.items():
            sv, uv = np.array(track).T
            plan.plot(sv,uv,label=name,color=colors[name],lw=2.8)
            plan.scatter([sv[0],sv[-1]], [uv[0],uv[-1]],s=18,color=colors[name])
        for st in STATIONS:
            plan.axvline(st,color='#bdbbb4',lw=.7,zorder=0)
        plan.set(xlim=(-12,122),ylim=(-20,4),ylabel='Across (m, NE +)',xlabel='Along the CSX chord (m, eastward)')
        plan.set_title('Mapped open ways between Pryor and Central',loc='left',weight='bold')
        plan.legend(ncol=4,loc='lower right',frameon=False)
        offset = np.arange(-34, 8.1, .25)
        for st in STATIONS:
            x, z = (origin + st*along + offset[:,None]*across).T
            heights = read_ground(dem,x,z)
            profile.plot(offset,heights,color='#3f6057' if st==55 else '#a9b8af',
                         lw=2 if st==55 else 1, zorder=2 if st==55 else 1)
        for st,name,u,x,z,lon,lat,h,g in rows:
            if st==55 and name in tracks:
                profile.scatter(u,h,c=colors[name],zorder=4)
                profile.annotate(name,(u,h),xytext=(0,-14 if name=='X' else 8),
                                 textcoords='offset points',ha='center',color=colors[name],weight='bold')
        bed = round(float(np.median([r[-2] for r in rows if r[1] == 'EL'])), 1)
        profile.axhline(bed,color='#766453',ls='--',lw=1,label='Prototype support plane')
        profile.set(xlabel='Across the trench (m from CSX chord, northeast positive)',
                    ylabel='Native bare earth (m NAVD88)',ylim=(307.7,321))
        profile.set_title('Five terrain sections · station 55 m in dark green',loc='left',weight='bold')
        profile.legend(frameon=False,loc='upper center')
        fig.suptitle('Five Points east cut',fontsize=18,weight='bold')
        fig.savefig(ROOT/'docs/log/rail/2026-11-21-east-trench-sections.png',dpi=145)
        plt.close(fig)
    with (HERE/'transects.csv').open('w',newline='') as f:
        writer = csv.writer(f,lineterminator='\n')
        writer.writerow(['station_m','location','ne_offset_m','city_x_m','city_z_m','lon','lat','dem_1m_navd88_m','grid_5m_navd88_m'])
        writer.writerows(rows)
    # A single declared display plane for the comparison. This is not a railhead observation.
    model = {'origin': origin.tolist(), 'along': along.tolist(), 'across': across.tolist(),
             'illustrativeBedNavd88M': bed,
             'tracks': {k: np.round(v,3).tolist() for k,v in tracks.items()}}
    (HERE/'model.json').write_text(json.dumps(model,indent=2)+'\n')
    print('Illustrative bed NAVD88 m',bed)
    for k,v in tracks.items(): print(k, 'length m', round(np.linalg.norm(np.diff(v,axis=0),axis=1).sum(),2),
                                     'west/east stations',np.round([v[0][0],v[-1][0]],2))


if __name__ == '__main__':
    main()
