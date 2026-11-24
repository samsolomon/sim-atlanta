import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const hanoverMidtownId = 'osm:way:505421514';
const origin: P2 = [308, -3796];
// The podium ring has courtyard holes under the tower; its outer ring is enough here.
const towerIds = ['osm:way:1451518626', 'osm:way:1451518625'];
const podiumId = 'osm:way:1451518623';
const cabanaIds = ['osm:way:1451518616', 'osm:way:1451518617', 'osm:way:1451518618'];
const lobbyId = 'osm:way:1451518624';
// The amenity deck's pool, estimated from the aerial and pool-deck photographs.
const pool: P2[] = [[-24, 4], [-8, 4], [-8, 14], [-24, 14]];

export function createHanoverMidtown(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const parts = site.parts ?? [];
  const towers = towerIds.map(id => parts.find(p => p.id === id));
  const podiumPart = parts.find(p => p.id === podiumId);
  if (towers.some(t => t?.rings.length !== 1) || !podiumPart?.rings.length) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'Hanover Midtown', origin, [1, 0], [[0, 0], [15, -20], [-20, 25]]);
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
  const datum = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const deck = datum + podiumPart.h;
  const glassWall = '#4b7178', fin = '#e3e5e1', roofColor = '#7d8281';
  const glass = ['#5f949b', '#689ca2'];
  const solids = parts.map(p => ({ ring: local(p.rings[0]), top: datum + p.h }));
  const inside = (x: number, z: number, ring: P2[]) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, zi] = ring[i], [xj, zj] = ring[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
    }
    return hit;
  };
  // A face starts above any taller neighbour it touches, so shared walls stay hidden.
  const covered = (a: P2, b: P2, length: number, floor: number) => {
    const mx = (a[0] + b[0]) / 2 + 0.6 * (b[1] - a[1]) / length;
    const mz = (a[1] + b[1]) / 2 - 0.6 * (b[0] - a[0]) / length;
    return Math.max(floor, ...solids.filter(s => inside(mx, mz, s.ring)).map(s => s.top));
  };

  // Podium: parking behind dark screens under the amenity deck.
  const podium = local(podiumPart.rings[0]);
  shell.prism(podium, shell.base, deck, '#7c807f', '#cbc3b0');
  faces(podium, (a, b, length) => {
    const lo = covered(a, b, length, datum);
    if (deck - lo < 1) return;
    shell.facade(a, b, datum + 0.4, Math.min(datum + 5, deck), 1, 3.4, 0.82, 0.8, glass, 0.3);
    shell.facade(a, b, datum + 5.4, deck - 0.6, 6, 3.2, 0.92, 0.5, ['#3b4245'], 0);
  });
  shell.prism(pool, deck, deck + 0.05, '#5aa8c4', '#5aa8c4');
  shell.prism([[-27, -34], [-4, -34], [-4, -22], [-27, -22]], deck, deck + 0.35, '#5f7a50', '#6f8a58');
  for (const id of cabanaIds) {
    const part = parts.find(p => p.id === id);
    if (part?.rings.length === 1) shell.prism(local(part.rings[0]), deck, deck + 3.2, '#8a6a4c', '#7a5c40');
  }
  const lobby = parts.find(p => p.id === lobbyId);
  if (lobby?.rings.length === 1) {
    const ring = local(lobby.rings[0]);
    shell.prism(ring, shell.base, datum + 4.6, '#cfd2cf', '#8e918f');
    faces(ring, (a, b) => shell.facade(a, b, datum + 0.3, datum + 4.2, 1, 3, 0.85, 0.85, glass, 0.4));
  }

  // The L-shaped tower: blue-green glass with slender white fins about every 8.5 m.
  for (const part of towers) {
    const ring = local(part!.rings[0]);
    const top = datum + part!.h;
    // Tower parts stand on grade where the podium doesn't wrap them.
    shell.prism(ring, shell.base, top, glassWall, roofColor);
    faces(ring, (a, b, length) => {
      const lo = covered(a, b, length, datum);
      if (top - lo < 1) return;
      const floors = Math.max(1, Math.round((top - 2.5 - lo) / 3.3));
      shell.facade(a, b, lo + 0.2, top - 2.5, floors, 2.9, 0.96, 0.8, glass, 0.32);
      const out = (t: number, y: number): [number, number, number] =>
        [a[0] + t * (b[0] - a[0]) + 0.16 * (b[1] - a[1]) / length, y, a[1] + t * (b[1] - a[1]) - 0.16 * (b[0] - a[0]) / length];
      const count = Math.max(1, Math.round(length / 8.5));
      for (let i = 0; i <= count; i++) {
        const t = i / count, w = 0.22 / length;
        const l = Math.max(0, t - w), r = Math.min(1, t + w);
        shell.body.quad(out(l, lo), out(l, top), out(r, top), out(r, lo), fin);
      }
      shell.body.quad(out(0, top - 1.2), out(0, top), out(1, top), out(1, top - 1.2), fin);
    });
  }
  return shell.finish('#f4d9a8', 0.62);
}
