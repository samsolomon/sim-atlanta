import { GroundGrid, type GroundManifest } from '../terrain/grid';
import type { TerrainCity } from '../terrain/transport-data';
import { auburnTransport } from '../city/sweet-auburn-transport';
import northBandFloors from '../../../pipeline/prototypes/connector-footprint/north-band-floors.json';

// Connector pavement floors where the north-band DEM keeps Civic Center deck and
// station-roof returns. The same file feeds underpass-floors.py, which bakes the
// covered pavement over these floored nodes; see north-band-floors.json.
const floors = northBandFloors.floors.map(f => [f.start, f.end, f.halfWidthM, f.crossfall] as const);

export function northConnectorGround(m: GroundManifest, bytes: ArrayBuffer) {
  if (m.sha256 !== northBandFloors.groundSha256)
    return new GroundGrid(m, bytes);
  const copy = bytes.slice(0), data = new DataView(copy), source = new DataView(bytes);
  for (const [[x0,z0,h0],[x1,z1,h1],width,crossfall] of floors) {
    const dx = x1-x0, dz = z1-z0, length = Math.hypot(dx,dz), pad = width + m.stepM;
    const row0 = Math.max(1, Math.floor((Math.min(z0,z1)-pad-m.bounds.minZ)/m.stepM));
    const row1 = Math.min(m.rows-2, Math.ceil((Math.max(z0,z1)+pad-m.bounds.minZ)/m.stepM));
    const col0 = Math.max(1, Math.floor((Math.min(x0,x1)-pad-m.bounds.minX)/m.stepM));
    const col1 = Math.min(m.cols-2, Math.ceil((Math.max(x0,x1)+pad-m.bounds.minX)/m.stepM));
    for (let row = row0; row <= row1; row++) for (let col = col0; col <= col1; col++) {
      const x = m.bounds.minX+col*m.stepM-x0, z = m.bounds.minZ+row*m.stepM-z0;
      const t = (x*dx+z*dz)/(length*length), side = (z*dx-x*dz)/length;
      if (t < 0 || t > 1 || Math.abs(side) >= pad) continue;
      const index = 2*(row*m.cols+col);
      const raw = source.getInt16(index,true);
      if (raw === m.noData) continue;
      const old = m.offsetM + m.scaleM*raw, floor = h0 + (h1-h0)*t + crossfall*side;
      // Retain ordinary measured differences in pavement crown and banking.
      if (old-floor < .45) continue;
      const weight = Math.min(1, (pad-Math.abs(side))/m.stepM);
      const lower = Math.round((old-weight*(old-floor)-m.offsetM)/m.scaleM);
      data.setInt16(index, Math.min(data.getInt16(index,true),lower),true);
    }
  }
  // Where two floors share an endpoint, the outside of the bend lies beyond both
  // segments' ends. Give those nodes the joint's floor, or one raw node is left
  // standing 1.9 m above the feeder lanes below Spring/Techwood.
  for (const [i, a] of floors.entries()) for (const b of floors.slice(i+1)) {
    const joint = [a[0], a[1]].find(p => [b[0], b[1]].some(q => q[0] === p[0] && q[1] === p[1]));
    if (!joint) continue;
    const [jx, jz, jh] = joint, pad = Math.min(a[2], b[2]) + m.stepM;
    for (let row = Math.max(1, Math.floor((jz-pad-m.bounds.minZ)/m.stepM)); row <= Math.min(m.rows-2, Math.ceil((jz+pad-m.bounds.minZ)/m.stepM)); row++)
      for (let col = Math.max(1, Math.floor((jx-pad-m.bounds.minX)/m.stepM)); col <= Math.min(m.cols-2, Math.ceil((jx+pad-m.bounds.minX)/m.stepM)); col++) {
        const x = m.bounds.minX+col*m.stepM, z = m.bounds.minZ+row*m.stepM, distance = Math.hypot(x-jx, z-jz);
        if (distance >= pad || floors.some(f => covers(f, x, z, m.stepM))) continue;
        const index = 2*(row*m.cols+col), raw = source.getInt16(index,true);
        if (raw === m.noData) continue;
        const old = m.offsetM + m.scaleM*raw;
        if (old-jh < .45) continue;
        const weight = Math.min(1, (pad-distance)/m.stepM);
        data.setInt16(index, Math.min(data.getInt16(index,true), Math.round((old-weight*(old-jh)-m.offsetM)/m.scaleM)), true);
      }
  }
  return new GroundGrid(m, copy);
}

function covers([[x0,z0],[x1,z1],width]: typeof floors[number], x: number, z: number, step: number) {
  const dx = x1-x0, dz = z1-z0, length = Math.hypot(dx,dz);
  const t = ((x-x0)*dx+(z-z0)*dz)/(length*length), side = ((z-z0)*dx-(x-x0)*dz)/length;
  return t >= 0 && t <= 1 && Math.abs(side) < width + step;
}

type Road = TerrainCity['roads'][number];
// Full-precision end keys distinguish the two branches of the overpass. The
// profile follows source vertices through adjoining OSM ways to exposed pavement.
type Deck = { first: number; heights: number[]; split?: number };
const decks: Record<string, Deck> = {
  '250.44,-1700/248.57,-1620.48': { split: 1.88, first: 2, heights: [302.70,302.87] },
  '248.57,-1620.48/245.92,-1572.02': { first: 0, heights: [302.87,303.19,303.61] },
  '245.92,-1572.02/246.03,-1566.67': { first: 0, heights: [303.61,303.64] },
  '246.03,-1566.67/234.7,-1444.28': { first: 0, heights: [303.64,303.55,302.25,301.18,299.94,299.09] },
  '246.03,-1566.67/251.24,-1442.89': { first: 0, heights: [303.64,303.66,303.31,302.12,301.23,300.22] },
  '251.24,-1442.89/229.28,-1300': { first: 0, heights: [300.22,299.30] },
  '234.7,-1444.28/159.52,-1324.34': { split: .28, first: 0, heights: [299.09,298.24] },
  '248.57,-1620.48/264.58,-1576.21': { first: 0, heights: [302.87,303.23,303.31,303.58] },
  '264.58,-1576.21/309.18,-1524.57': { split: .5, first: 0, heights: [303.58,303.82] },
};

export function northConnectorTransport(context: TerrainCity) {
  const heightsByPoints = new Map<Road['pts'], number[]>();
  const roads = context.roads.flatMap(road => {
    let pts = road.pts;
    const deck = decks[pts[0] + '/' + pts.at(-1)];
    if (!deck) return [road];
    // Abutments inside long source edges land on the exposed class-2 pavement.
    if (deck.split !== undefined) {
      const i = Math.floor(deck.split), t = deck.split-i, a = pts[i], b = pts[i+1];
      pts = [...pts];
      pts.splice(i+1, 0, [a[0]+t*(b[0]-a[0]), a[1]+t*(b[1]-a[1])]);
    }
    const { first, heights } = deck, last = first+heights.length-1;
    const tread = pts.slice(first,last+1);
    heightsByPoints.set(tread,heights);
    const parts: Road[] = [];
    if (first) parts.push({ ...road, pts: pts.slice(0,first+1) });
    parts.push({ ...road, bridge: true, pts: tread });
    if (last < pts.length-1) parts.push({ ...road, pts: pts.slice(last) });
    return parts;
  });
  const city = auburnTransport({ ...context, roads });
  for (const part of city.terrainTransport!.roads) {
    const profile = heightsByPoints.get(part.pts);
    if (profile) part.deckNavd88M = profile;
  }
  return city;
}
