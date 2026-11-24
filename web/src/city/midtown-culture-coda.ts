import { ShapeUtils, Vector2 } from 'three';
import { surfaces } from '../materials';
import { type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';

const tower = 'osm:way:714119667';
const historic = 'osm:way:42792936';
const computing = 'osm:way:791413998';
export const codaIds = new Set([tower, historic, computing]);
type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

function rect(x: number, z: number, width: number, depth: number): P2[] {
  return [
    [x, z],
    [x + width, z],
    [x + width, z + depth],
    [x, z + depth],
  ];
}

function windows(s: Shell, ring: P2[], lo: number, hi: number, rows: number, bay: number, occupancy: number) {
  const area = ring.reduce((sum, [x, z], i) => {
    const [a, b] = ring[(i + 1) % ring.length];
    return sum + x * b - a * z;
  }, 0);
  const face = area < 0 ? [...ring].reverse() : ring;
  for (let i = 0; i < face.length; i++)
    s.facade(
      face[i],
      face[(i + 1) % face.length],
      lo,
      hi,
      rows,
      bay,
      0.88,
      0.79,
      ['#54717c', '#526976', '#69838c'],
      occupancy,
    );
}

function office(s: Shell, height: number) {
  const glass = surfaces.curtainGlass({ tint: 'blue', mullion: 1.45, floor: 4.6 });
  const glazed = (plan: P2[], lo: number, hi: number) =>
    s.prism(plan, lo, hi, '#557380', '#737f83', { wall: glass, roof: surfaces.asphaltRoof() });

  // The west podium stops short of the bridge. Its soffit spans a walkable arcade.
  const podium = rect(-47, 13, 72, 16);
  glazed(podium, s.base, 19.2);
  windows(s, podium, 0.8, 19, 3, 3.8, 0.12);
  glazed(rect(34, -31, 18, 61), s.base, 19.2);
  for (const x of [-50, -21, 8]) {
    s.body.box(1.2, 19.2 - s.base, 1.2, x, (19.2 + s.base) / 2, 11.5, '#dddcd6');
    s.lights.box(20, 0.12, 0.18, x + 7, 19.17, 12, '#e9eff2');
  }
  glazed(s.ring, 19.2, height - 16);
  // A pedestrian can look up anywhere beneath the L-shaped overhang.
  const soffit = (i: number) => [s.ring[i][0], 19.2, s.ring[i][1]];
  for (const [a, b, c] of ShapeUtils.triangulateShape(
    s.ring.map(([x, z]) => new Vector2(x, z)),
    [],
  ))
    s.body.tri(soffit(a), soffit(b), soffit(c), '#c7caca');
  windows(s, s.ring, 20, height - 16, 15, 3.2, 0.055);
  const cap = rect(-54, 10.4, 106, 19.8);
  glazed(cap, height - 12, height);
  s.body.quad(...(cap.map(([x, z]) => [x, height - 12, z]) as [number[], number[], number[], number[]]), '#9ca6a8');
  windows(s, cap, height - 11.8, height, 2, 3.2, 0.04);
  glazed(rect(-43, 12, 93, 16), height - 16, height - 12);
  for (const y of [6, 18.8]) s.body.box(72.4, 0.45, 16.4, -11, y, 21, '#c6cccb');
  const core: P2[] = Array.from({ length: 18 }, (_, i) => {
    const a = (2 * Math.PI * i) / 18;
    return [20 + 6 * Math.cos(a), 8 + 6 * Math.sin(a)];
  });
  glazed(core, s.base, height - 10);
  windows(s, core, 1, height - 10, 20, 3, 0.08);
}

function crumForster(s: Shell) {
  s.prism(s.ring, s.base, 11.5, '#965d4d', '#aaa08d', { wall: surfaces.brick() });
  const roof = surfaces.terracottaTile();
  s.paint(roof, () => {
    const p = s.body;
    p.quad([-7, 11.5, -12.4], [-7, 11.5, 12.4], [0, 15, 6], [0, 15, -6], roof.colour);
    p.quad([7, 11.5, 12.4], [7, 11.5, -12.4], [0, 15, -6], [0, 15, 6], roof.colour);
    for (const sign of [-1, 1]) p.tri([-7, 11.5, sign * 12.4], [7, 11.5, sign * 12.4], [0, 15, sign * 6], roof.colour);
  });
  for (const y of [0.75, 8.4, 11.4]) s.body.box(0.7, 0.35, 24.5, -6.65, y, 0, '#d6c8b0');
  for (const z of [-9, -6, -3, 0, 3, 6, 9]) s.body.box(0.25, 1.6, 1.2, -6.9, 9.9, z, '#455556');
  for (const z of [-4.3, 0, 4.3]) {
    s.body.box(0.36, 4.6, 3.5, -6.95, 2.8, z, '#43413c');
    for (const side of [-1, 1]) s.body.box(0.8, 4.6, 0.42, -7.05, 2.8, z + side * 1.85, '#d7c6ab');
    for (let i = 0; i < 10; i++) {
      const point = (r: number, j: number) => [
        -7.48,
        5.1 + r * Math.sin((j * Math.PI) / 10),
        z + r * Math.cos((j * Math.PI) / 10),
      ];
      s.body.quad(point(1.65, i), point(2.1, i), point(2.1, i + 1), point(1.65, i + 1), '#dccdb6');
      s.body.tri([-7.42, 5.1, z], point(1.65, i), point(1.65, i + 1), '#474540');
    }
  }
  for (const z of [-9.2, 9.2]) {
    s.body.box(0.45, 3, 1.9, -6.95, 3.6, z, '#d4c5aa');
    s.body.box(0.5, 2.55, 1.5, -7, 3.6, z, '#576365');
  }
}

export function createCoda(
  buildings: VBuilding[],
  site: VBuilding,
  base: number | null,
  groundAt: (x: number, z: number) => number | null,
) {
  if (!codaIds.has(site.id) || base === null || site.rings.length !== 1) return null;
  const origin: P2 = site.id === tower ? [326, -2402] : site.id === historic ? [281, -2425] : [328, -2424];
  const probe: P2 = site.id === tower ? [0, 20] : [0, 0];
  const grade = groundAt(origin[0] + probe[0], origin[1] + probe[1]);
  if (grade === null) return null;
  const s = localLandmarkShell(
    buildings,
    site,
    site.id === historic
      ? 'Crum and Forster Building'
      : site.id === computing
        ? 'High Performance Computing Center'
        : 'Coda',
    origin,
    [1, 0],
    [probe],
    base - grade,
    grade,
  );
  if (!s) return null;
  if (site.id === tower) office(s, site.h ?? 118.9);
  else if (site.id === historic) crumForster(s);
  else {
    const height = site.h ?? 23.33;
    s.prism(s.ring, s.base, height, '#bcc1c0', '#899494', { wall: surfaces.precast({ width: 4, height: 3 }) });
    for (let x = -26; x <= 26; x += 4) s.body.box(2.9, 4, 0.3, x, height - 3, -11.94, '#697879');
    for (const x of [-19, -5, 9, 23]) s.body.box(9, 1.8, 6, x, height + 0.9, 2, '#a3aeae');
  }
  return s.finish('#d8e6e9', 0.44);
}
