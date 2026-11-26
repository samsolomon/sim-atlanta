"""Bake the simple street bridges over the Connector corridor from OSM and USGS lidar.

The five Connector spans read the corridor OSM API snapshot. Jackson Street over
Freedom Parkway reads the pinned north-corner Overpass source (--source, --only)
and replaces only its own entry, leaving the others as baked."""
import argparse
import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "scripts"))
from king_memorial_corridor import K, LAT0, LON0, R, ept_points

# Outline, opposing outer edges (in travel order), road ways, sidewalk ways,
# and approximate curb-to-parapet widths measured independently on each side.
SPANS = [
    (863050887, [2,3,4,5], [0,11,10,9,8,7], [38945249], [[1388408192,1388408193],[1388420285]], [3.4,3.0]),
    (1278959968, [11,0], [6,5,4], [38945251,755543581], [[1278959974],[800880536]], [2.4,3.1]),
    (1450884819, [13,14,15,16,0], [9,8,7,6,5,4,3], [38974973], [[635796672],[635796675]], [3.4,3.5]),
    (1450884817, [0,9], [4,5], [38976112], [[637321699],[635570944]], [2.6,2.6]),
    (1451206619, [4,5], [0,9], [181272928,1451206620], [[853927445],[853927450]], [3.4,2.9]),
    # Jackson Street NE over Freedom Parkway (NBI 000000012104290): one 18.9 m deck,
    # a 13.4 m roadway and 2.4 m raised sidewalks with ~0.35 m parapets each side.
    (1451196894, [9,0], [5,4], [43520078], [[637636159],[1389424703]], [2.75,2.75]),
]


def read_ways(path):
    root = ET.parse(path).getroot()
    scale = math.pi/180 * R
    nodes = {n.get("id"): (round((float(n.get("lon"))-LON0)*scale*K, 2),
                           round((LAT0-float(n.get("lat")))*scale, 2)) for n in root.findall("node")}
    return {int(w.get("id")): ([nodes[n.get("ref")] for n in w.findall("nd")],
                               {t.get("k"): t.get("v") for t in w.findall("tag")}) for w in root.findall("way")}


def read_overpass(path):
    import gzip
    elements = json.load(gzip.open(path))["elements"]
    scale = math.pi/180 * R
    nodes = {e["id"]: (round((e["lon"]-LON0)*scale*K, 2), round((LAT0-e["lat"])*scale, 2))
             for e in elements if e["type"] == "node"}
    return {e["id"]: ([nodes[n] for n in e["nodes"]], e.get("tags", {}))
            for e in elements if e["type"] == "way" and all(n in nodes for n in e["nodes"])}


def lengths(points):
    return np.r_[0, np.cumsum(np.linalg.norm(np.diff(points, axis=0), axis=1))]


def sample(points, stations, s):
    return np.array([np.interp(s, stations, points[:,i]) for i in range(2)])


def normal(delta):
    return np.array([-delta[1],delta[0]]) / np.linalg.norm(delta)


def nearest_station(points, stations, xy):
    delta = np.diff(points,axis=0)
    t = np.clip(np.sum((xy-points[:-1])*delta,axis=1)/np.sum(delta*delta,axis=1),0,1)
    index = np.argmin(np.linalg.norm(points[:-1]+t[:,None]*delta-xy,axis=1))
    return stations[index]+t[index]*(stations[index+1]-stations[index])


def road_fraction(a, delta, road):
    cross = lambda u,v: u[0]*v[1]-u[1]*v[0]
    for p,q in zip(road,road[1:]):
        direction = q-p
        det = cross(delta,direction)
        if abs(det) < .00001:
            continue
        t = cross(p-a,direction)/det
        s = cross(p-a,delta)/det
        if 0 <= t <= 1 and -.01 <= s <= 1.01:
            return t
    return .5


def height_sampler(ring):
    x,z = np.array(ring).T
    lon = lambda v: LON0+math.degrees(v/(R*K))
    lat = lambda v: LAT0-math.degrees(v/R)
    px,pz,h,cls,_ = ept_points((lon(min(x)-8),lat(max(z)+8),lon(max(x)+8),lat(min(z)-8)))

    def height(xy):
        distance2 = (px-xy[0])**2+(pz-xy[1])**2
        for category,radius in ((17,2.2),(17,3.5),(2,2.4)):
            returns = h[(distance2 <= radius**2) & (cls == category)]
            if len(returns) >= 4:
                return round(float(np.median(returns)),2)
        raise ValueError(f"No supported pavement height at {xy}")
    return height


def cross_sections(ring, edges, road, widths):
    traces = [np.array([ring[i] for i in indices]) for indices in edges]
    fractions = [lengths(trace)/lengths(trace)[-1] for trace in traces]
    def at(side,t):
        return sample(traces[side],fractions[side],t)
    height = height_sampler(ring)
    rows = []
    for t in sorted(set([*fractions[0],*fractions[1],*np.linspace(0,1,13)])):
        a,b = at(0,t),at(1,t)
        delta = b-a
        forward = sum(at(i,min(1,t+.005))-at(i,max(0,t-.005)) for i in (0,1))
        width = abs(np.dot(normal(forward),delta))
        # Sample inside the two curbs, clear of parapets. Extrapolate the crossfall to the edges.
        ha,hb = height(.82*a+.18*b),height(.18*a+.82*b)
        rise = (hb-ha)/.64
        row = [*a,ha-.18*rise,*b,hb+.18*rise,widths[0]/width,road_fraction(a,delta,road),1-widths[1]/width]
        rows.append([round(float(v),2 if i<6 else 4) for i,v in enumerate(row)])
    return rows


def outward(ways, ids, near, walking):
    chain = list(ways[ids[0]][0])
    for identifier in ids[1:]:
        q = ways[identifier][0]
        if chain[-1] == q[0]: chain.extend(q[1:])
        elif chain[-1] == q[-1]: chain.extend(q[-2::-1])
        elif chain[0] == q[-1]: chain = q[:-1]+chain
        elif chain[0] == q[0]: chain = q[:0:-1]+chain
        else: raise ValueError(f"Disconnected source way {identifier}")
    if math.dist(chain[0],near) < math.dist(chain[-1],near):
        chain.reverse()
    options = []
    for identifier,(q,tags) in ways.items():
        if identifier in ids or chain[-1] not in (q[0],q[-1]):
            continue
        if walking and tags.get("footway") != "sidewalk": continue
        if not walking and tags.get("highway") != ways[ids[0]][1]["highway"]: continue
        options.append(q if q[0]==chain[-1] else q[::-1])
    continuation = max(options,key=len)
    return np.array(chain+continuation[1:] if walking else continuation)


def approach(ways, row, roads, walks):
    a,b = np.array(row[:2]),np.array(row[3:5])
    delta = b-a
    ca,centre,cb = [a+delta*f for f in row[6:9]]
    pts = outward(ways,roads,centre,False)
    dist = lengths(pts)
    end = min(16,dist[-1])
    mid = sample(pts,dist,end)
    n = normal(mid-sample(pts,dist,end-1))
    if np.dot(n,delta)<0: n=-n
    half = 4.5 if ways[roads[0]][1]["highway"]=="tertiary" else 5.5
    rounded = lambda pts: np.round(pts,2).tolist()
    result = dict(pavement=rounded([ca,cb,mid+half*n,mid-half*n]),centre=rounded([centre,mid]),walks=[])
    for ids,edge,inner in zip(walks,(a,b),(ca,cb)):
        pts = outward(ways,ids,(edge+inner)*.5,True)
        dist = lengths(pts)
        start = nearest_station(pts,dist,(edge+inner)*.5)
        end = min(start+13,dist[-1])
        outer,curb = edge,inner
        for s in sorted({end,*[d for d in dist if start+.15<d<end-.15]}):
            mid = sample(pts,dist,s)
            n = normal(sample(pts,dist,min(s+.3,dist[-1]))-sample(pts,dist,s-.3))
            if np.dot(n,inner-edge)<0: n=-n
            width = 1+(1-min(1,(s-start)/7))*(np.linalg.norm(inner-edge)/2-1)
            next_outer,next_curb = mid-n*width,mid+n*width
            result["walks"].append(rounded([outer,curb,next_curb,next_outer]))
            outer,curb = next_outer,next_curb
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("osm",type=Path,nargs="?",help="The XML map used by extract-ways.py")
    parser.add_argument("--source",type=Path,help="A pinned Overpass JSON (square-board/source/*.json.gz)")
    parser.add_argument("--only",type=int,action="append",help="Re-bake only these outlines in place")
    args = parser.parse_args()
    ways = read_overpass(args.source) if args.source else read_ways(args.osm)
    output = HERE/"street-bridges.json"
    spans = json.loads(output.read_text()) if args.only else []
    for outline,edge_a,edge_b,roads,walks,widths in SPANS:
        if args.only and outline not in args.only:
            continue
        road = [ways[i][0] for i in roads]
        rows = cross_sections(ways[outline][0],(edge_a,edge_b),np.array(sum(road,[])),widths)
        # The south abutment of Capitol Avenue is outside the source/board.
        ends = [rows[0]] if outline == 1451206619 else [rows[0],rows[-1]]
        entry = dict(name=ways[roads[0]][1]["name"],outline=outline,sideWidthsM=widths,roads=road,
                     walks=[[ways[i][0] for i in side] for side in walks],rows=rows,
                     approaches=[approach(ways,row,roads,walks) for row in ends])
        spans = [d for d in spans if d["outline"] != outline] + [entry]
    output.write_text("[\n"+",\n".join("  "+json.dumps(d,separators=(",",":")) for d in spans)+"\n]\n")


if __name__ == "__main__":
    main()
