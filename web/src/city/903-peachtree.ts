import type { GroundGrid } from '../terrain/grid';
import { rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const peachtree903Id = 'osm:way:1284487937';
const origin: P2 = [732, -2823];
// The three adjoining mapped tower parts share a shaft. Keep the two shallow end recesses.
const tower: P2[] = [
  [-37.8, -17.2], [-13.95, -17.13], [-13.93, -18.86], [44.75, -18.46],
  [44.77, -7.73], [41.79, -7.63], [41.7, -5.18], [43.64, -5.25], [43.76, -0.97],
  [4.06, -0.99], [4.05, 1.07], [-37.27, 0.84], [-37.22, -4.41], [-35.55, -4.39],
  [-35.54, -7.64], [-37.69, -7.57],
];

// The parking base stops at the one-storey southern retail strip.
const deck: P2[] = [
  [-39.66, 18.9], [-37.69, -7.57], [-37.8, -17.2], [-28.79, -17.21],
  [-28.84, -18.99], [44.75, -18.46], [49.8, -18.4], [48.02, 8.76],
  [16.65, 6.2], [14.37, 7.85], [13.34, 19.36],
];

function faces(ring: P2[], draw: (a: P2, b: P2, length: number) => void) {
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > 0.5) draw(a, b, length);
  });
}

export function create903Peachtree(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const plant = site.parts?.find(part => part.id === 'osm:way:1284487943');
  if (plant?.rings.length !== 1) return null;
  const shell = landmarkShell(buildings, grid, site.id, '903 Peachtree', origin, [1, 0], [[0, 0], [-36, -12], [45, -7]]);
  if (!shell) return null;
  const siteFloor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const deckTop = siteFloor + 24.4, storefrontTop = siteFloor + 4.6, shaftTop = siteFloor + 104.5;
  const plan = [...shell.ring].reverse();
  const stone = '#bdb09b', dark = '#45535a', metal = '#a9b4b6';
  const glass = ['#527482', '#60808d', '#4a6875', '#597989'];
  const panelColors = ['#615e5f', '#77716d', '#81766b', '#6d6969', '#514f53'];
  const random = rng(903);

  shell.prism(plan, shell.base, storefrontTop, stone, '#777773');
  shell.prism(deck, storefrontTop, deckTop, stone, '#7c827b');
  faces(plan, (a, b) =>
    shell.facade(a, b, siteFloor + 0.2, storefrontTop - 0.25, 1, 3.25, 0.78, 0.88, glass, 0.45));
  faces(deck, (a, b, length) => {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const midpointZ = (a[1] + b[1]) / 2;
    const midpointX = (a[0] + b[0]) / 2;
    const point = (u: number, y: number, offset = 0): [number, number, number] =>
      [a[0] + dx * u + dz * offset / length, y, a[1] + dz * u - dx * offset / length];
    const panel = (l: number, r: number, lo: number, hi: number, offset: number, color: string) =>
      shell.body.quad(point(l, lo, offset), point(l, hi, offset), point(r, hi, offset), point(r, lo, offset), color);

    if (midpointZ < -15) {
      // The 8th Street elevation reads as glass even where the garage sits behind it.
      panel(0, 1, storefrontTop, deckTop, 0.035, dark);
      shell.facade(a, b, storefrontTop, deckTop, 6, 2.65, 0.96, 0.8, glass, 0);
    } else if (length > 15 && midpointZ > -12) {
      // Stagger the bronze and charcoal panels inside a continuous aluminum frame.
      const lo = storefrontTop + 2.05, hi = deckTop - 2.15;
      const margin = Math.min(0.1, 1.6 / length);
      panel(margin, 1 - margin, lo - 0.23, hi + 0.23, 0.12, metal);
      const count = Math.round((length - 3.2) / 1.35);
      const width = (1 - 2 * margin - 0.6 / length) / count;
      for (let i = 0; i < count; i++) {
        const l = margin + 0.3 / length + i * width;
        const split = (hi - lo) * (0.39 + random() * 0.25) + lo;
        const r = l + width - 0.04 / length;
        panel(l, r, lo, split, 0.16, panelColors[Math.floor(random() * panelColors.length)]);
        panel(l, r, split, hi, 0.16, panelColors[Math.floor(random() * panelColors.length)]);
      }
      if (midpointX > 30) panel(0, 1, storefrontTop, storefrontTop + 0.32, 0.12, metal);
    }
  });

  // The broad south roof of the garage carries the open eighth-floor terrace.
  shell.prism([[-35, 2.8], [12.6, 3.2], [11.7, 17.5], [-36.1, 17.1]],
    deckTop, deckTop + 0.18, '#8f8b80', '#aaa18d');
  shell.prism([[-28, 6], [9.1, 6.3], [8.7, 14.8], [-28.5, 14.5]],
    deckTop + 0.18, deckTop + 0.22, '#6c7560', '#7d865e');
  // Warm low lighting along the terrace's glass balustrade, as in the twilight aerial.
  const terrace: P2[] = [[-35, 2.8], [12.6, 3.2], [11.7, 17.5], [-36.1, 17.1]];
  terrace.forEach(([x, z], i) => {
    const [nx, nz] = terrace[(i + 1) % terrace.length];
    shell.lights.quad([x, deckTop + 0.18, z], [x, deckTop + 1.05, z], [nx, deckTop + 1.05, nz], [nx, deckTop + 0.18, nz], '#e8c995');
  });

  shell.prism(tower, deckTop, shaftTop, dark, '#6a777c');
  // Apartments, not offices: at 23:00 roughly a third of the units are still lit.
  faces(tower, (a, b, length) => {
    shell.facade(a, b, deckTop + 0.55, shaftTop - 0.85, 25, length > 15 ? 3.35 : 2.8, 0.95, 0.82, glass, 0.32);
  });
  const cap = plant.rings[0].map(([x, z]): P2 => [x - origin[0], z - origin[1]]).reverse();
  shell.prism(cap, shaftTop, siteFloor + plant.h, '#647478', '#939b99');
  return shell.finish();
}
