import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const crestOnPeachtreeId = 'osm:way:234938416';
const origin: P2 = [584, -2242];
// Heights from the April 2019 lidar (90th-percentile returns on an 8 m grid, ground
// 307.2 m NAVD88), which replace the inferred 64.8–68.4 m parts: the 18-storey slab at
// 58 m with a 64 m centre, two 46 m wings, a 52 m west block, and a 11.5 m garage podium
// to the east whose roof is the residents' deck.
const slabId = 'osm:way:1343480983';
const wingIds = ['osm:way:1343480981', 'osm:way:1343480982'];
const slabCentre: P2[] = [[-33, -10.9], [7, -7.9], [5.6, 9.9], [-33.9, 7.3]];
// Mural look-alike from the deck photograph: big sweeping arcs of blue, magenta-pink and
// coral on the white wall. Four related hues at a narrow value range; extent inferred.
const mural = ['#5b7fb8', '#b9668f', '#cc7f6c', '#cfa064'];

export function createCrestOnPeachtree(buildings: VBuilding[], site: VBuilding, grid: GroundGrid, quality: TerrainQuality) {
  // Low tier groups windows in pairs, halves the mural bands and keeps the street glass coarse.
  const high = quality === 'high';
  const parts = site.parts ?? [];
  const slab = parts.find(p => p.id === slabId);
  const wings = wingIds.map(id => parts.find(p => p.id === id));
  const podiums = parts.filter(p => p.id === 'podium');
  if (!slab || wings.some(w => !w) || podiums.length !== 2) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'Crest on Peachtree', origin, [1, 0], [[0, 0], [-50, -3], [25, 15]]);
  if (!shell) return null;
  const seed = seedOf(site.id);
  let face = 0;
  const ccw = (ring: P2[]): P2[] => {
    const area = ring.reduce((sum, [x, z], i) => {
      const [nx, nz] = ring[(i + 1) % ring.length];
      return sum + x * nz - nx * z;
    }, 0);
    return area < 0 ? [...ring].reverse() : ring;
  };
  const local = (ring: P2[]) => ccw(ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]));
  const inside = (x: number, z: number, ring: P2[]) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, zi] = ring[i], [xj, zj] = ring[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
    }
    return hit;
  };
  const datum = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  // The west podium part is really the slab's 52 m west block; the east one is the garage.
  const [westRing, eastRing] = podiums.map(p => local(p.rings[0])).sort((p, q) => p[0][0] - q[0][0]);
  const masses = [
    { ring: local(slab.rings[0]), top: datum + 58, tower: true },
    ...wings.map(w => ({ ring: local(w!.rings[0]), top: datum + 46, tower: true })),
    { ring: westRing, top: datum + 52, tower: true },
    { ring: eastRing, top: datum + 11.5, tower: false },
  ];
  const covered = (a: P2, b: P2, length: number) => {
    const mx = (a[0] + b[0]) / 2 + 0.6 * (b[1] - a[1]) / length;
    const mz = (a[1] + b[1]) / 2 - 0.6 * (b[0] - a[0]) / length;
    return Math.max(datum, ...masses.filter(m => inside(mx, mz, m.ring)).map(m => m.top));
  };
  const white = '#ecebe6', roofColor = '#8f908c';
  const windows = ['#6f7f88', '#76868f'];
  const storefront = ['#6a7b84', '#6e818a'];
  const deck = datum + 11.5;

  for (const { ring, top, tower } of masses) {
    shell.prism(ring, shell.base, top, tower ? white : '#d6d3cb', tower ? roofColor : '#9c8a74');
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < 0.8) return;
      const lo = covered(a, b, length);
      if (top - lo < 1) return;
      if (!tower) {
        // Garage podium: plain decks, one dark opening band per level, lobby glass at the street.
        litFacade(shell, seed, face++, a, b, datum + 0.4, datum + 4.2, 1, high ? 3.4 : 12, 0.82, 0.84, storefront, 0.35);
        litFacade(shell, seed, face++, a, b, datum + 4.6, top - 0.6, 2, 1e4, 0.96, 0.5, ['#3e4547'], 0);
        return;
      }
      // An east-facing wall above the deck carries the mural behind its windows.
      const nx = (b[1] - a[1]) / length;
      if (nx > 0.7 && lo <= deck + 0.01) {
        // Sweeping arcs, each a curved strip across the wall with white wall showing between.
        const segs = high ? 8 : 4;
        const out = (t: number, y: number): [number, number, number] =>
          [a[0] + t * (b[0] - a[0]) + 0.035 * (b[1] - a[1]) / length, y, a[1] + t * (b[1] - a[1]) - 0.035 * (b[0] - a[0]) / length];
        const span = top - deck - 2;
        const arcs = [
          { base: 0.02, rise: 0.22, thick: 0.30, colour: 0 },
          { base: 0.34, rise: -0.16, thick: 0.24, colour: 1 },
          { base: 0.50, rise: 0.20, thick: 0.22, colour: 2 },
          { base: 0.80, rise: -0.14, thick: 0.18, colour: 3 },
        ];
        arcs.forEach((arc, n) => {
          const colour = mural[(arc.colour + face) % mural.length];
          const y = (t: number) => deck + 1 + span * (arc.base + arc.rise * Math.sin(Math.PI * (t * 0.8 + 0.1 * n)));
          for (let k = 0; k < segs; k++) {
            const l = k / segs, r = (k + 1) / segs;
            const h = span * arc.thick;
            shell.body.quad(out(l, y(l)), out(l, Math.min(top - 0.6, y(l) + h)), out(r, Math.min(top - 0.6, y(r) + h)), out(r, y(r)), colour);
          }
        });
      }
      const from = lo <= datum + 0.01 ? datum + 4.6 : lo + 0.3;
      if (lo <= datum + 0.01) litFacade(shell, seed, face++, a, b, datum + 0.4, datum + 4.2, 1, high ? 3.4 : 12, 0.8, 0.84, storefront, 0.35);
      litFacade(shell, seed, face++, a, b, from, top - 0.8, Math.max(1, Math.round((top - 0.8 - from) / 3)), high ? 2.6 : 5.2, high ? 0.5 : 0.62, 0.56, windows, 0.32);
    });
  }
  // The slab's 64 m centre: penthouse floors and plant over the middle of the slab.
  const centre = ccw(slabCentre);
  shell.prism(centre, datum + 58, datum + 64, white, roofColor);
  centre.forEach((a, i) => {
    const b = centre[(i + 1) % centre.length];
    litFacade(shell, seed, face++, a, b, datum + 58.3, datum + 63.3, 2, high ? 2.6 : 5.2, high ? 0.5 : 0.62, 0.56, windows, 0.32);
  });
  // Residents' deck on the garage roof: paving, cabanas and planters.
  shell.prism(ccw([[14, -20], [34, -18.5], [32, 22], [14, 21]]), deck, deck + 0.15, '#b3a58f', '#b3a58f');
  shell.prism(ccw([[16, 12], [30, 13], [30, 18], [16, 17]]), deck + 0.15, deck + 0.5, '#7a5c40', '#7a5c40');
  return shell.finish('#f4d9a8', 0.62);
}
