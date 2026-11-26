import lids from '../../../pipeline/prototypes/connector-footprint/lids.json';
import type { P2 } from '../vignette/geom';
import type { TerrainCity, TransportRun } from './transport-data';

/**
 * Freeway lids whose top is the board (lids.py). The 2019 classifier labels the
 * Capitol Gateway lid top as ground, so the board already draws it, and OSM's
 * bridge-tagged streets and walks on it track that surface within 0.1 m
 * (docs/connector-interchanges.md). Drawn as decks over the concealed freeway
 * they floated 1-6 m above the lid. Here they become board pavement.
 */
const rings = lids.map(l => l.ring as P2[]);

function inside([x, z]: P2, ring: P2[]) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}
/** True on a lid, or within `margin` metres of one (mapped streets end on its outline). */
export function onLid(p: P2, margin = .5) {
  return rings.some(ring => inside(p, ring) || ring.some((a, i) => {
    const b = ring[(i + 1) % ring.length], dx = b[0]-a[0], dz = b[1]-a[1], l2 = dx*dx + dz*dz;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0]-a[0])*dx + (p[1]-a[1])*dz) / l2)) : 0;
    return Math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dz) <= margin;
  }));
}

/** Split a polyline where it crosses a lid outline; each piece is wholly on or off a lid. */
function splitAtLids(pts: P2[]): { pts: P2[]; lid: boolean }[] {
  const cuts: P2[] = [pts[0]];
  for (let k = 1; k < pts.length; k++) {
    const [a, b] = [pts[k-1], pts[k]], ts: number[] = [];
    for (const ring of rings) for (let i = 0; i < ring.length; i++) {
      const [c, d] = [ring[i], ring[(i + 1) % ring.length]];
      const den = (b[0]-a[0])*(d[1]-c[1]) - (b[1]-a[1])*(d[0]-c[0]);
      if (!den) continue;
      const t = ((c[0]-a[0])*(d[1]-c[1]) - (c[1]-a[1])*(d[0]-c[0])) / den;
      const u = ((c[0]-a[0])*(b[1]-a[1]) - (c[1]-a[1])*(b[0]-a[0])) / den;
      if (t > 1e-6 && t < 1 - 1e-6 && u >= 0 && u <= 1) ts.push(t);
    }
    for (const t of ts.sort((x, y) => x - y)) cuts.push([a[0] + t*(b[0]-a[0]), a[1] + t*(b[1]-a[1])]);
    cuts.push(b);
  }
  const pieces: { pts: P2[]; lid: boolean }[] = [];
  for (let k = 1; k < cuts.length; k++) {
    const mid: P2 = [(cuts[k-1][0] + cuts[k][0]) / 2, (cuts[k-1][1] + cuts[k][1]) / 2];
    const lid = rings.some(ring => inside(mid, ring));
    const last = pieces.at(-1);
    if (last && last.lid === lid) last.pts.push(cuts[k]);
    else pieces.push({ pts: [cuts[k-1], cuts[k]], lid });
  }
  return pieces;
}

/** Bridge-tagged roads that lie wholly on a lid are drawn on the board (south band). */
export function lidRoads<T extends TerrainCity>(city: T): T {
  return { ...city, roads: city.roads.map(road => road.bridge && road.pts.every(p => onLid(p)) ? { ...road, bridge: false } : road) };
}

/** Baked bridge runs (downtown vignette.json) are cut at a lid outline; the
 * pieces on the lid become ground runs. In place, like applyRampDecks. */
export function applyLids<T extends TerrainCity>(city: T): T {
  const data = city.terrainTransport;
  if (!data) return city;
  const roads: TransportRun[] = [];
  for (const run of data.roads) {
    const pieces = run.kind === 'bridge' && !run.deckNavd88M ? splitAtLids(run.pts) : [];
    if (!pieces.some(p => p.lid)) { roads.push(run); continue; }
    for (const piece of pieces) roads.push({ ...run, pts: piece.pts, kind: piece.lid ? 'ground' : 'bridge' });
  }
  data.roads = roads;
  return city;
}
