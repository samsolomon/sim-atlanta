"""Plot cross-sections against the staged City extract and a public, dated USDA NAIP tile."""
import argparse
import json
import math
from pathlib import Path
from urllib.request import urlopen

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from pyproj import Transformer
import rasterio
from rasterio.windows import Window

ROOT = Path(__file__).resolve().parents[3]
ITEM = "ga_m_3308421_ne_16_060_20231008_20240103"
STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/collections/naip/items/" + ITEM
TOKEN = "https://planetarycomputer.microsoft.com/api/sas/v1/token/naip"
# u increases to the southeast, s to the northeast. Both use the City's horizontal metre.
FOOTPRINT = json.loads(Path(__file__).with_name("sections.json").read_text())
OX, OZ = FOOTPRINT["originXZ"]
UX, UZ = FOOTPRINT["acrossXZ"]
SX, SZ = FOOTPRINT["alongXZ"]
SECTIONS = [
    (section["label"], section["alongM"], section["description"],
     (section["southbound"]["outsideM"], section["southbound"]["insideM"]),
     (section["northbound"]["insideM"], section["northbound"]["outsideM"]))
    for section in FOOTPRINT["sections"]
]
EXTENT = (-64, 49, -103, 153)
PAPER, INK, OBS, CITY, LINK = "#f8f6ef", "#20313a", "#287c69", "#ad452a", "#ba965b"


def lonlat(u, s):
    x, z = OX + UX*u + SX*s, OZ + UZ*u + SZ*s
    deg = math.pi / 180
    return -84.3916 + x / (6371008.8 * deg * math.cos(33.7539 * deg)), 33.7539 - z / (6371008.8 * deg)


def road_cuts(city, s):
    for road in city["roads"]:
        if road["cls"] != "motorway" or road["bridge"] or road["tunnel"]:
            continue
        coords = [(UX*(x-OX)+UZ*(z-OZ), SX*(x-OX)+SZ*(z-OZ)) for x,z in road["pts"]]
        for (a,b),(c,d) in zip(coords, coords[1:]):
            if min(b,d) <= s < max(b,d):
                u = a + (c-a)*(s-b)/(d-b)
                is_link = road.get("sub") == "link"
                if EXTENT[0] < u < EXTENT[1]:
                    # Canvas lineWidth is measured normal to the source segment.
                    half = (6.5 if is_link else 14) * .5 * math.hypot(c-a,d-b) / abs(d-b)
                    yield (u-half, u+half, is_link)


def aerial(tile):
    if tile is None:
        with urlopen(STAC, timeout=60) as response:
            href = json.load(response)["assets"]["image"]["href"]
        with urlopen(TOKEN, timeout=60) as response:
            tile = href + "?" + json.load(response)["token"]
    left,right,bottom,top = EXTENT
    u,s = np.meshgrid(np.arange(left+.125, right, .25), np.arange(top-.125, bottom, -.25))
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"), rasterio.open(tile) as src:
        xy = Transformer.from_crs(4326, src.crs, always_xy=True).transform(*lonlat(u,s))
        cols,rows = (~src.transform) * xy
        i,j = int(cols.min())-2,int(rows.min())-2
        rgb = src.read([1,2,3], window=Window(i,j,int(cols.max())-i+3,int(rows.max())-j+3))
        col,row = cols-i-.5,rows-j-.5
        x,y = np.floor(col).astype(int),np.floor(row).astype(int)
        dx,dy = col-x,row-y
        image = (1-dy)*((1-dx)*rgb[:,y,x]+dx*rgb[:,y,x+1])+dy*((1-dx)*rgb[:,y+1,x]+dx*rgb[:,y+1,x+1])
        return image.astype("uint8").transpose(1,2,0)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tile", help="Local copy of the pinned NAIP GeoTIFF; default reads a remote window")
    parser.add_argument("--city", type=Path, default=ROOT/"web/public/data/scene/downtown/vignette.json")
    parser.add_argument("--out", type=Path, default=ROOT/"docs/log/2026-11-21-connector-footprint.png")
    args = parser.parse_args()
    city = json.loads(args.city.read_text())
    plt.rcParams.update({"font.family":"DejaVu Sans", "text.color":INK, "axes.labelcolor":INK,
                         "xtick.color":INK, "ytick.color":INK, "axes.facecolor":PAPER})
    fig = plt.figure(figsize=(11.6,7.9), facecolor=PAPER)
    fig.text(.045,.946,"The Connector beneath Georgia State",fontsize=24,fontweight="bold")
    fig.text(.045,.906,"Two exposed sections bracket the rail decks. Widths are horizontal metres along each section.",fontsize=11)
    ax = fig.add_axes([.044,.126,.315,.735])
    ax.imshow(aerial(args.tile),extent=EXTENT)
    for label,s,*_ in SECTIONS:
        ax.axhline(s,color="#fff6bb",lw=1.8)
        ax.text(-60,s+4,label,color=INK,fontweight="bold",bbox=dict(fc="#fff6bb",ec="none",pad=2))
    for u,s,label in [(-28,115,"Decatur St"),(0,17,"Freight"),(0,-23,"MARTA")]:
        ax.annotate(label,(u,s),(-60,s+4),fontsize=8,color="white",va="center",
                    bbox=dict(fc=INK,alpha=.83,ec="none",pad=2),
                    arrowprops=dict(arrowstyle="-",color="white",lw=.8))
    ax.text(-60,146,"NE along freeway ↑",color="white",fontsize=8,bbox=dict(fc=INK,alpha=.85,ec="none"))
    ax.axis("off")
    fig.text(.395,.832,"Striped travel area and City paint",fontsize=16,fontweight="bold")
    fig.text(.395,.795,"Green = aerial edge lines     Rust = mainline     Tan = ramp / link",fontsize=10)
    for i,(label,s,title,sb,nb) in enumerate(SECTIONS):
        box = fig.add_axes([.40,.525-i*.276,.55,.173])
        box.set_title(f"{label}    {title}",loc="left",fontsize=12,fontweight="bold",pad=7)
        for a,b in [sb,nb]:
            box.barh(1,b-a,left=a,height=.42,color=OBS)
            box.text((a+b)/2,1,("SB" if a==sb[0] else "NB")+f"  ≈{int(math.floor(b-a+.5))} m",color="white",fontsize=9,
                     fontweight="bold",ha="center",va="center")
        box.axvspan(sb[1],nb[0],ymin=.55,ymax=.88,color="#d6d5c9",zorder=0)
        for a,b,is_link in sorted(road_cuts(city,s),key=lambda r:r[2]):
            box.barh(-.10 if is_link else .13,b-a,left=a,height=.20 if is_link else .33,color=LINK if is_link else CITY)
        box.set(xlim=(-60,46),ylim=(-.45,1.55),yticks=[1,.08],yticklabels=["Aerial","City"],
                xticks=[-50,-25,0,25],xlabel="Section offset (m)  ·  northwest to southeast →")
        box.set_axisbelow(True);box.grid(axis="x",color="#dcdad0",lw=.7)
        box.tick_params(length=0,labelsize=9);box.xaxis.label.set_size(9)
        for spine in box.spines.values():spine.set_visible(False)
    fig.text(.395,.143,"The light gap between the green bars includes both inside shoulders\nand the median barrier. Detached ramp pavement is outside the green bars.",fontsize=10,linespacing=1.45)
    fig.text(.045,.059,"Aerial backdrop: USDA NAIP, 8 Oct 2023, 0.6 m.  Edge picks: Fulton County 2024 orthophoto; allow ±1 m per edge.",fontsize=9)
    fig.text(.045,.035,"City: deployed PR #20 road strokes on the downtown Overture runs. Sections are rotated into the freeway frame.",fontsize=9)
    fig.savefig(args.out,dpi=145)
    plt.close(fig)


if __name__ == "__main__":
    main()
