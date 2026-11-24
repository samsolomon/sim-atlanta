import { DoubleSide, IcosahedronGeometry, Mesh, MeshLambertMaterial, ShapeUtils, Vector2 } from 'three';
import { surfaces } from '../materials';
import { Builder, type P2 } from '../vignette/geom';
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
      0.93,
      0.88,
      ['#a3b4c0', '#aec0cb', '#a7b9c6'],
      occupancy,
    );
}

function office(s: Shell, height: number) {
  const glass = surfaces.curtainGlass({ tint: 'silver', mullion: 1.45, floor: 4.6 });
  const glazed = (plan: P2[], lo: number, hi: number) =>
    s.prism(plan, lo, hi, '#d2d8db', '#a2a9aa', { wall: glass, roof: surfaces.asphaltRoof() });

  // The west podium stops short of the bridge. Its soffit spans a walkable arcade.
  const podium = rect(-47, 13, 72, 16);
  glazed(podium, s.base, 19.2);
  windows(s, podium, 6.2, 19, 2, 3.8, 0.12);
  glazed(rect(34, -31, 18, 61), s.base, 19.2);
  for (const x of [-50, -21, 8]) {
    s.body.box(1.2, 19.2 - s.base, 1.2, x, (19.2 + s.base) / 2, 11.5, '#dddcd6');
    s.lights.box(20, 0.12, 0.18, x + 7, 19.17, 12, '#e9eff2');
  }
  glazed(s.ring, 19.2, height - 38);
  // A pedestrian can look up anywhere beneath the L-shaped overhang.
  const soffit = (i: number) => [s.ring[i][0], 19.2, s.ring[i][1]];
  for (const [a, b, c] of ShapeUtils.triangulateShape(
    s.ring.map(([x, z]) => new Vector2(x, z)),
    [],
  ))
    s.body.tri(soffit(a), soffit(b), soffit(c), '#c7caca');
  windows(s, s.ring, 20, height - 38, 12, 3.2, 0.055);
  // Two office wings step back independently above the main floor plates.
  const westWing = rect(-51, 10.6, 103, 19.8);
  glazed(westWing, height - 38, height - 16);
  windows(s, westWing, height - 38, height - 16, 4, 3.2, 0.05);
  const eastWing = rect(34, -30, 17.5, 39);
  glazed(eastWing, height - 38, height - 24);
  windows(s, eastWing, height - 38, height - 24, 3, 3.2, 0.05);
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
  // A glazed gallery links the rear of Crum & Forster to the west podium.
  // Narrow roof panes and perimeter columns leave the piazza open underneath.
  const gallery = new Builder();
  const glazing = '#b5d0d8';
  for (const x of [-43, -37.5]) {
    gallery.quad([x, 2.5, -12], [x, 8.9, -12], [x, 8.9, 13.2], [x, 2.5, 13.2], glazing);
    s.body.box(0.16, 0.18, 25.2, x, 8.95, 0.6, '#b6c2c8');
    s.body.box(0.12, 0.12, 25.2, x, 2.5, 0.6, '#b6c2c8');
  }
  gallery.quad([-43, 9, -12], [-37.5, 9, -12], [-37.5, 9, 13.2], [-43, 9, 13.2], glazing);
  for (const z of [-10, -4, 2, 8, 12]) {
    s.body.box(0.35, 8 - s.base, 0.35, -42.7, (8 + s.base) / 2, z, '#bdc6ca');
    s.body.box(5.5, 0.22, 0.22, -40.25, 9.1, z, '#d5dadd');
  }
  s.facade([-47, 13], [25, 13], 0.8, 6, 1, 3, 0.84, 0.88, ['#dcd9bd', '#cfdedb'], 0.56);
  s.facade([-47, 29], [-47, 13], 0.8, 6, 1, 2.8, 0.88, 0.90, ['#e2ddc5', '#cbd9d5'], 0.78);
  s.lights.box(0.18, 0.16, 25.2, -43.12, 8.78, 0.6, '#f4eedb');
  s.lights.box(0.18, 0.16, 25.2, -37.38, 8.78, 0.6, '#f4eedb');
  for (const x of [-31, -19, -7, 5]) {
    for (const z of [-4, 4]) {
      const y = z < 0 ? 10.5 : 13;
      const globe = new IcosahedronGeometry(0.52, 1).translate(x, y, z);
      s.lights.addGeometry(globe, '#fff3d5');
      globe.dispose();
      s.body.box(0.06, 19.2 - y, 0.06, x, (19.2 + y) / 2, z, '#939b9e');
    }
  }
  // Cables between the two piazza elevations carry the pendant globes.
  for (const x of [-31, -19, -7, 5]) s.body.box(0.09, 0.09, 23, x, 19.2, 1, '#969da0');
  glazed(core, s.base, height - 10);
  windows(s, core, 1, height - 10, 20, 3, 0.08);
  return new Mesh(
    gallery.geometry(),
    new MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: DoubleSide,
      forceSinglePass: true,
    }),
  );
}

function crumForster(s: Shell) {
  s.prism(s.ring, s.base, 11.5, '#965d4d', '#aaa08d', { wall: surfaces.brick() });
  const roof = surfaces.terracottaTile();
  s.paint(roof, () => {
    const p = s.body;
    p.quad([-7, 11.5, -12.4], [-7, 11.5, 12.4], [0, 15, 6], [0, 15, -6], '#8f6559');
    p.quad([7, 11.5, 12.4], [7, 11.5, -12.4], [0, 15, -6], [0, 15, 6], '#8f6559');
    for (const sign of [-1, 1]) p.tri([-7, 11.5, sign * 12.4], [7, 11.5, sign * 12.4], [0, 15, sign * 6], '#8f6559');
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
  if (site.id === tower) {
    const gallery = office(s, site.h ?? 118.9);
    const model = s.finish('#d8e6e9', 0.44);
    model.group.add(gallery);
    return model;
  } else if (site.id === historic) crumForster(s);
  else {
    const height = site.h ?? 23.33;
    s.prism(s.ring, s.base, height, '#bcc1c0', '#899494', { wall: surfaces.precast({ width: 4, height: 3 }) });
    for (let x = -26; x <= 26; x += 4) s.body.box(2.9, 4, 0.3, x, height - 3, -11.94, '#697879');
    for (const x of [-19, -5, 9, 23]) s.body.box(9, 1.8, 6, x, height + 0.9, 2, '#a3aeae');
  }
  return s.finish('#d8e6e9', 0.44);
}
