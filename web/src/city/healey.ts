import { DoubleSide, Group, Mesh, MeshLambertMaterial, ShapeUtils, Vector2 } from 'three';
import { Builder, hashStr, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const id = 'eeb07e5a-dbed-4900-9314-e478769493ca';
const stone = '#dedbd0',
  trim = '#eee8d9',
  shade = '#aea99b',
  dark = '#494b49';
// Projected metres along Forsyth from Poplar to Walton, then toward Broad.
// The facade and lift house use the surveyed tall strip within the larger lot.
const length = 62.56,
  depth = 19.3,
  base = 10.4,
  cap = 62.9,
  roof = 63.6;
const origin: P2 = [178.21, -269.57];
const dx = -47.52 / length,
  dz = 40.69 / length;
const at = (u: number, v: number, y: number) => [origin[0] + dx * u + dz * v, y, origin[1] + dz * u - dx * v];

export function createHealey(buildings: VBuilding[], groundAt: (x: number, z: number) => number | null) {
  const lot = buildings.find((b) => b.id === id);
  if (!lot || lot.rings.length !== 1 || lot.rings[0].length < 3) return null;
  const ring = lot.rings[0],
    grades = ring.map(([x, z]) => groundAt(x, z));
  if (grades.some((h) => h === null || !Number.isFinite(h))) return null;
  const masonry = new Builder(),
    rooms = new Builder();
  const wall = (a: number[], b: number[], low: number, high: number, color: string) =>
    masonry.quad([a[0], low, a[2]], [b[0], low, b[2]], [b[0], high, b[2]], [a[0], high, a[2]], color);

  // The eastern half contains low roofs around the rotunda. Their heights
  // are visible in the point cloud even though the bake supplies one parcel.
  const local = ring.map(([x, z]): P2 => [
    (x - origin[0]) * dx + (z - origin[1]) * dz,
    (x - origin[0]) * dz - (z - origin[1]) * dx,
  ]);
  const slab = (path: P2[], low: number, high: number, face: string, top: string) => {
    const pts = path.map(([u, v]) => at(u, v, high));
    for (let i = 0; i < pts.length; i++) wall(pts[i], pts[(i + 1) % pts.length], low, high, face);
    for (const [a, b, c] of ShapeUtils.triangulateShape(
      pts.map((p) => new Vector2(p[0], p[2])),
      []
    ))
      masonry.tri(pts[a], pts[c], pts[b], top);
  };
  slab(local, -0.5, 6.75, '#c9c3af', '#858481');
  const rect = (u: number, v: number, w: number, d: number): P2[] => [
    [u, v],
    [u + w, v],
    [u + w, v + d],
    [u, v + d],
  ];
  slab(rect(0.05, 18.4, 15.5, 18.9), 6.75, 10.95, stone, '#a4a29a');
  slab(rect(47.2, 18.3, 14.2, 16.4), 6.75, 10.9, stone, '#a4a29a');
  const rotunda: P2[] = Array.from({ length: 16 }, (_, i) => [
    31.2 + 7.5 * Math.cos((i * Math.PI) / 8),
    27.4 + 7.5 * Math.sin((i * Math.PI) / 8),
  ]);
  slab(rotunda, 6.75, 11.05, '#cac6b9', '#9e9d97');

  // Four single-window bays at either end frame ten paired central bays.
  // Both long fronts step slightly inward; the narrow ends stay planar.
  const w = length / 18,
    inward = 0.66;
  const outline: P2[] = [
    [0, 0],
    [4 * w, 0],
    [4 * w, inward],
    [14 * w, inward],
    [14 * w, 0],
    [length, 0],
    [length, depth],
    [14 * w, depth],
    [14 * w, depth - inward],
    [4 * w, depth - inward],
    [4 * w, depth],
    [0, depth],
  ];
  slab(outline, 6.75, roof, stone, '#aaa9a1');
  const glass = ['#78868b', '#929b9a', '#aeb1aa', '#7d898c', '#a6a8a1'];
  const elevation = (
    span: number,
    bays: number,
    point: (t: number, y: number, offset: number) => number[],
    side: number
  ) => {
    const long = bays === 18,
      width = span / bays;
    const quad = (l: number, r: number, lo: number, hi: number, d: number, c: string, batch = masonry) =>
      batch.quad(point(l, lo, d), point(r, lo, d), point(r, hi, d), point(l, hi, d), c);
    const course = (l: number, r: number, y: number, y2: number, inner: number, outer: number, c: string) =>
      masonry.quad(point(l, y, inner), point(r, y, inner), point(r, y2, outer), point(l, y2, outer), c);
    for (let bay = 0; bay < bays; bay++) {
      const l = bay * width,
        r = l + width,
        center = (l + r) / 2;
      const paired = long && bay >= 4 && bay < 14;
      const facade = paired ? -inward : 0;
      const lo = base,
        pitch = (cap - base) / 14;
      const half = width * (paired ? 0.417 : 0.345);
      const left = center - half,
        right = center + half;
      // Each vertical pier has a faceted nose. Sloping shoulders near the
      // crown flare into capitals, leaving the window heads in shadow.
      for (const [t, sign] of [
        [l, 1],
        [r, -1],
      ]) {
        const pier = (y: number, half: number, projection: number) => [
          point(t, y, facade + projection),
          point(t + sign * half * 0.53, y, facade + projection * 0.9),
          point(t + sign * half, y, facade + 0.03),
        ];
        let prev = pier(base, 0.32, 0.37);
        for (const [y, rad, d] of [
          [cap - 1.35, 0.32, 0.37],
          [cap - 0.78, 0.48, 0.52],
          [cap - 0.5, 0.54, 0.54],
          [cap - 0.32, 0.36, 0.34],
        ]) {
          const next = pier(y, rad, d);
          for (let j = 0; j < 2; j++) masonry.quad(prev[j], prev[j + 1], next[j + 1], next[j], j ? stone : trim);
          prev = next;
        }
      }
      for (let floor = 0; floor < 14; floor++) {
        const y = lo + floor * pitch,
          sill = y + 0.63,
          head = y + pitch - 0.37;
        const d = facade + 0.045;
        const seed = hashStr(side + '/' + bay + '/' + floor);
        quad(left, right, sill, head, d, glass[seed % glass.length], seed % 7 === 0 ? rooms : masonry);
        quad(left, right, sill + (head - sill) * 0.52, sill + (head - sill) * 0.52 + 0.075, d + 0.025, '#cbcac1');
        if (paired) quad(center - 0.105, center + 0.105, sill, head, d + 0.085, trim);
        course(left - 0.12, right + 0.12, sill - 0.16, sill - 0.06, d, 0.25 + facade, shade);
        course(left - 0.12, right + 0.12, sill - 0.06, sill + 0.03, 0.25 + facade, d, trim);
        if (floor === 13) {
          const count = paired ? 2 : 1;
          for (let j = 0; j < count; j++) {
            const cx = left + ((right - left) * (j + 0.5)) / count,
              radius = (right - left) / count / 2;
            for (let k = 0; k < 8; k++) {
              const arch = (i: number, outer: boolean) => {
                const angle = (i * Math.PI) / 8;
                return point(
                  cx + (radius + (outer ? 0.09 : 0)) * Math.cos(angle),
                  head - 0.4 + (0.65 + (outer ? 0.14 : 0)) * Math.sin(angle),
                  facade + (outer ? 0.22 : 0.14)
                );
              };
              masonry.quad(arch(k, false), arch(k + 1, false), arch(k + 1, true), arch(k, true), trim);
            }
          }
        }
      }
      course(l, r, cap - 0.45, cap - 0.27, facade + 0.04, facade + 0.58, shade);
      course(l, r, cap - 0.27, cap - 0.02, facade + 0.58, facade + 0.83, stone);
      quad(l, r, cap - 0.02, roof + 0.36, facade + 0.83, trim);
      course(l, r, roof + 0.36, roof + 0.36, facade + 0.83, facade - 0.08, stone);
      // One corbel per pier under the projecting fascia.
      quad(l + 0.12, l + 0.48, cap - 0.05, roof + 0.07, facade + 0.88, shade);
    }
    // Two-story shopfronts sit between paneled piers, with a curved fanlight
    // and brass-framed entrance at the middle of the Forsyth frontage.
    if (side === 1) return;
    const shops = long ? 9 : 3;
    for (let i = 0; i < shops; i++) {
      const l = (i * span) / shops,
        r = ((i + 1) * span) / shops,
        mid = (l + r) / 2,
        door = side === 0 && i === 4;
      const a = l + 0.51,
        b = r - 0.51;
      // The base wall follows the street line even below the inset shaft.
      quad(l, r, -0.45, base, 0.02, stone);
      quad(a, b, 0.62, 4.6, 0.12, door ? '#4f5859' : '#657376', door ? rooms : masonry);
      if (!door) quad(a, b, 5.54, 8.55, 0.12, '#788184');
      quad(a, b, 3.52, 3.68, 0.15, '#afa895');
      for (const x of [a + 0.14, mid, b - 0.14])
        quad(x - 0.055, x + 0.055, 0.67, door ? 4.6 : 8.24, 0.16, door ? '#b69b65' : '#a4a398');
      if (door) {
        const radius = (b - a) / 2;
        for (let k = 0; k < 12; k++) {
          const arc = (i: number, frame: boolean) => {
            const angle = (i * Math.PI) / 12;
            return point(
              mid + (radius + (frame ? 0.13 : 0)) * Math.cos(angle),
              7.16 + (1.72 + (frame ? 0.18 : 0)) * Math.sin(angle),
              frame ? 0.27 : 0.21
            );
          };
          masonry.tri(point(mid, 7.16, 0.21), arc(k, false), arc(k + 1, false), '#646e70');
          masonry.quad(arc(k, false), arc(k + 1, false), arc(k + 1, true), arc(k, true), trim);
        }
        quad(a, b, 5.82, 7.16, 0.21, '#646e70');
        for (let k = 1; k < 6; k++) {
          const x = a + ((b - a) * k) / 6;
          const archY = 7.16 + 1.72 * Math.sqrt(1 - ((x - mid) / radius) ** 2);
          quad(x - 0.075, x + 0.075, 5.82, archY, 0.24, dark);
        }
        quad(a, b, 4.68, 5.76, 0.25, '#d7cdb6');
      } else {
        const lip = 0.56;
        quad(a + 0.26, b - 0.26, 5.33, 8.22, lip, '#899393');
        for (const [x, other] of [
          [a, a + 0.26],
          [b, b - 0.26],
        ])
          masonry.quad(
            point(x, 5.33, 0.13),
            point(other, 5.33, lip),
            point(other, 8.22, lip),
            point(x, 8.22, 0.13),
            '#768082'
          );
        for (const x of [mid - 0.87, mid + 0.87]) quad(x - 0.065, x + 0.065, 5.33, 8.22, lip + 0.018, dark);
        course(a, b, 5.15, 5.33, 0.15, lip, shade);
        course(a, b, 8.22, 8.52, lip, 0.12, trim);
      }
      // Cut stone at the shopfront corners stands ahead of the display glass.
      for (const [edge, sign] of [
        [l, 1],
        [r, -1],
      ]) {
        let previous = [
          point(edge, 0.15, 0.52),
          point(edge + sign * 0.42, 0.15, 0.52),
          point(edge + sign * 0.51, 0.15, 0.04),
        ];
        for (const [y, w, d] of [
          [0.7, 0.42, 0.52],
          [0.85, 0.34, 0.37],
          [8.78, 0.34, 0.37],
          [9.36, 0.48, 0.56],
          [9.82, 0.48, 0.56],
        ]) {
          const next = [point(edge, y, d), point(edge + sign * w, y, d), point(edge + sign * (w + 0.09), y, 0.04)];
          for (let j = 0; j < 2; j++)
            masonry.quad(previous[j], previous[j + 1], next[j + 1], next[j], j ? shade : trim);
          previous = next;
        }
      }
      course(l, r, base - 0.55, base - 0.34, 0.03, 0.49, shade);
      quad(l, r, base - 0.34, base - 0.05, 0.49, trim);
      course(l, r, base - 0.05, base, 0.49, 0.02, trim);
    }
  };
  elevation(length, 18, (t, y, d) => at(t, -d, y), 0);
  elevation(length, 18, (t, y, d) => at(t, depth + d, y), 1);
  elevation(depth, 5, (t, y, d) => at(-d, t, y), 2);
  elevation(depth, 5, (t, y, d) => at(length + d, t, y), 3);
  // The central lift house meets the eastern cornice. Its flanking stacks
  // appear above the tower from Woodruff Park. The other roof plant sits back.
  slab(rect(24.7, 10.4, 14.2, 8.55), roof, 70.65, stone, '#a09e96');
  for (let i = 0; i < 7; i++) {
    const u = 25.22 + i * 1.92;
    const a = at(u, 18.99, 65),
      b = at(u + 1.35, 18.99, 65);
    wall(a, b, 65.15, 69.65, '#c0beb1');
    wall(at(u + 0.23, 19.04, 65), at(u + 1.12, 19.04, 65), 65.48, 69.33, '#d4d0c1');
  }
  slab(rect(24.5, 10.2, 14.6, 8.92), 70.58, 70.98, trim, '#b3b1a6');
  // The shallow gable between the stacks is visible from the east.
  const ridge = at(31.8, 19.14, 71.88),
    leftGable = at(24.5, 19.14, 70.9),
    rightGable = at(39.1, 19.14, 70.9);
  masonry.tri(leftGable, rightGable, ridge, trim);
  masonry.quad(leftGable, ridge, at(31.8, 17.9, 71.88), at(24.5, 17.9, 70.9), '#c5c2b6');
  masonry.quad(ridge, rightGable, at(39.1, 17.9, 70.9), at(31.8, 17.9, 71.88), '#c5c2b6');
  masonry.tri(at(24.5, 17.9, 70.9), at(31.8, 17.9, 71.88), at(39.1, 17.9, 70.9), stone);
  for (const u of [24.35, 38.02]) {
    slab(rect(u, 17.6, 1.25, 1.55), roof, 72.1, trim, '#aaa79d');
    slab(rect(u - 0.07, 17.53, 1.39, 1.69), 72.1, 72.48, '#70716c', '#535652');
  }
  slab(rect(42.6, 6.3, 11.9, 5.95), roof, 67.9, '#c3c1b4', '#a6a69d');
  const material = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
  const solid = new Mesh(masonry.geometry(), material);
  solid.castShadow = solid.receiveShadow = true;
  const glow = new MeshLambertMaterial({
    vertexColors: true,
    side: DoubleSide,
    emissive: '#e5c795',
    emissiveIntensity: 0,
  });
  const windows = new Mesh(rooms.geometry(), glow);
  windows.receiveShadow = true;
  const group = new Group();
  group.name = 'Healey Building';
  group.position.y = Math.min(...(grades as number[]));
  group.add(solid, windows);
  return {
    group,
    buildings: buildings.filter((b) => b !== lot),
    setNight(dark: number) {
      glow.emissiveIntensity = 0.33 * dark;
    },
  };
}
