"""Measure Wheat Street Towers from USGS 3DEP returns and plot the footprint check."""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from shapely.geometry import Polygon
from shapely import contains_xy

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'pipeline/scripts'))
from king_memorial_corridor import K, LAT0, LON0, R, ept_points


def lonlat(x, z):
    return LON0 + math.degrees(x / (R * K)), LAT0 - math.degrees(z / R)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--figure', type=Path, help='optional north-up PNG output')
    args = parser.parse_args()
    context = json.loads((ROOT / 'pipeline/prototypes/sweet-auburn/context.json').read_text())
    ring = next(b['rings'][0] for b in context['buildings'] if b['id'] == 'osm:way:270493846')
    x, z, h, cls, _ = ept_points((*lonlat(1486, -112), *lonlat(1538, -176)))
    inside = contains_xy(Polygon(ring).buffer(-1), x, z) & (cls == 6)
    print(f'Roof inside 1 m inset: {inside.sum()} class-6 returns; median {np.median(h[inside]):.2f} m NAVD88')
    elbow = (x > 1505) & (x < 1529) & (z > -141) & (z < -118) & (cls == 6)
    for lo, hi in [(345.90, 346.35), (348.62, 348.92)]:
        band = elbow & (h > lo) & (h < hi)
        print(f'Elbow {lo:.2f}–{hi:.2f}: {band.sum()} class-6 returns; median {np.median(h[band]):.2f} m NAVD88')
    if not args.figure:
        return
    im = Image.new('RGB', (500, 600), '#f6f3ea')
    draw = ImageDraw.Draw(im)
    def pixel(x, z):
        return round(36 + (x-1486)*8), round(44 + (z+176)*8)
    draw.text((20, 12), 'Wheat Street Towers | USGS building returns | north up', fill='#252a2c')
    for px, pz, elevation in zip(x[cls==6], z[cls==6], h[cls==6]):
        u, v = pixel(px,pz)
        color = '#234b68' if elevation < 345 else '#d48c36' if elevation < 347 else '#ab453d'
        draw.ellipse((u-2,v-2,u+2,v+2), fill=color)
    draw.line([pixel(*v) for v in ring+[ring[0]]], fill='#38332f', width=2)
    draw.text((20,567),'Blue below 345 m  |  Ochre 345–347 m  |  Red 347 m and above',fill='#252a2c')
    draw.text((20,583),'NAVD88 metres. Outline from OpenStreetMap contributors.',fill='#252a2c')
    im.save(args.figure)


if __name__ == '__main__':
    main()
