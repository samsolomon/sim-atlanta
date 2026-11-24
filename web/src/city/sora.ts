import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const soraId = 'osm:way:1300604915';
const origin: P2 = [175, -3115];
// The mapped parts, by role in the photographs: the main glazed shaft with balcony
// stacks, the dark glass blade that climbs from the base, the north glazed block,
// the white punched-window wing, and the podium.
const shaftId = 'osm:way:1431380393';
const bladeId = 'osm:way:1456782063';
const northId = 'osm:way:1456782064';
const wingId = 'osm:way:1456782062';
const podiumId = 'osm:way:1456782061';

export function createSora(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const parts = site.parts ?? [];
  const get = (id: string) => parts.find(p => p.id === id && p.rings.length >= 1);
  const [shaft, blade, north, wing, podiumPart] = [shaftId, bladeId, northId, wingId, podiumId].map(get);
  if (!shaft || !blade || !north || !wing || !podiumPart) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'Sora at Spring Quarter', origin, [1, 0], [[0, 0], [20, 0], [-20, -10]]);
  if (!shell) return null;
  const local = (ring: P2[]): P2[] => {
    const points = ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
    const area = points.reduce((sum, [x, z], i) => {
      const [nx, nz] = points[(i + 1) % points.length];
      return sum + x * nz - nx * z;
    }, 0);
    return area < 0 ? points.reverse() : points;
  };
  const faces = (ring: P2[], draw: (a: P2, b: P2, length: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > 0.6) draw(a, b, length);
    });
  const inside = (x: number, z: number, ring: P2[]) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, zi] = ring[i], [xj, zj] = ring[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
    }
    return hit;
  };
  const datum = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const solids = parts.map(p => ({ ring: local(p.rings[0]), top: datum + p.h }));
  // A face starts above any taller neighbour it touches, so shared walls stay hidden.
  const covered = (a: P2, b: P2, length: number, floor: number) => {
    const mx = (a[0] + b[0]) / 2 + 0.6 * (b[1] - a[1]) / length;
    const mz = (a[1] + b[1]) / 2 - 0.6 * (b[0] - a[0]) / length;
    return Math.max(floor, ...solids.filter(s => inside(mx, mz, s.ring)).map(s => s.top));
  };
  const deck = datum + podiumPart.h;
  const white = '#ecebe5', roofColor = '#8c8f8c';
  const glass = ['#4f7e86', '#578790'];
  const dark = ['#2f4a55', '#35505b'];
  const punched = ['#3f5660', '#465d67'];

  // Podium: cream precast with tall dark storefront glass along the street.
  const podium = local(podiumPart.rings[0]);
  shell.prism(podium, shell.base, deck, '#d9d1c1', '#a19c90');
  faces(podium, (a, b, length) => {
    const lo = covered(a, b, length, datum);
    if (deck - lo < 1) return;
    shell.facade(a, b, datum + 0.4, datum + 5.2, 1, 3.4, 0.86, 0.86, dark, 0.3);
    shell.facade(a, b, datum + 5.6, deck - 0.5, 8, 3.2, 0.62, 0.6, punched, 0.18);
  });

  const tower = (part: typeof shaft, wall: string, draw: (a: P2, b: P2, lo: number, hi: number, floors: number) => void) => {
    const ring = local(part.rings[0]);
    const top = datum + part.h;
    shell.prism(ring, deck, top, wall, roofColor);
    faces(ring, (a, b, length) => {
      const lo = covered(a, b, length, deck);
      if (top - lo < 1) return;
      draw(a, b, lo, top - 1.2, Math.max(1, Math.round((top - 1.2 - lo) / 3.2)));
    });
  };
  // Glazed shaft and north block: blue-green glass in a white frame.
  for (const part of [shaft, north]) {
    tower(part, white, (a, b, lo, hi, floors) => shell.facade(a, b, lo + 0.2, hi, floors, 2.6, 0.82, 0.8, glass, 0.32));
  }
  // The dark glass blade.
  tower(blade, '#2c3f48', (a, b, lo, hi, floors) => shell.facade(a, b, lo + 0.2, hi, floors, 2.4, 0.96, 0.9, dark, 0.32));
  // The white wing with punched windows.
  tower(wing, white, (a, b, lo, hi, floors) => shell.facade(a, b, lo + 0.2, hi, floors, 3.1, 0.46, 0.56, punched, 0.32));

  // Balconies stacked on the shaft's two eastern corners.
  const ring = local(shaft.rings[0]);
  const east = Math.max(...ring.map(([x]) => x));
  const zs = ring.map(([, z]) => z), south = Math.min(...zs), northEdge = Math.max(...zs);
  for (let y = deck + 3.2; y < datum + shaft.h - 3; y += 3.2) {
    for (const z of [south + 1, northEdge - 5]) {
      shell.prism([[east, z], [east + 1.7, z], [east + 1.7, z + 4], [east, z + 4]], y - 0.2, y, '#e2e2dd', '#cfcfca');
    }
  }
  return shell.finish('#f4d9a8', 0.62);
}
