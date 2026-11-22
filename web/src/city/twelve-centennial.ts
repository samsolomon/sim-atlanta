import { DoubleSide, Group, Mesh, MeshLambertMaterial, ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, hashStr, pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const id = 'ff0016db-34f2-44b2-9f28-30bfc6c26b9c';
// Clockwise looking down the survey plan (City x east, z south). The north
// tip and the projecting east podium have very different heights.
const shaft: P2[] = [
  [296.1, -1223.8],
  [349.7, -1223.8],
  [349.7, -1246.4],
  [340.6, -1246.4],
  [324.1, -1263.3],
  [322.0, -1263.3],
  [305.4, -1246.6],
  [296.1, -1246.6],
];
const roof = 429.15,
  slab = '#d2cbbd',
  shadow = '#857f77',
  silver = '#bfc3bf';
const pos = (p: P2, y: number) => [p[0], y, p[1]];

export function createTwelveCentennial(buildings: VBuilding[], grid: GroundGrid) {
  const building = buildings.find((b) => b.id === id);
  if (!building || building.rings.length !== 1) return null;
  const lot = building.rings[0];
  if (
    ![
      [298, -1226],
      [354, -1237],
      [323, -1262],
      [306, -1245],
    ].every(([x, z]) => pointInRing(x, z, lot))
  )
    return null;
  const grades = lot.map(([x, z]) => grid.sample(x, z));
  if (!grades.every((y): y is number => y !== null && Number.isFinite(y))) return null;
  const solid = new Builder(),
    lit = new Builder();
  function prism(ring: P2[], bottom: number, top: number, wall: string, deck: string) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i],
        b = ring[(i + 1) % ring.length];
      solid.quad(pos(a, bottom), pos(b, bottom), pos(b, top), pos(a, top), wall);
    }
    for (const [a, b, c] of ShapeUtils.triangulateShape(
      ring.map(([x, z]) => new Vector2(x, z)),
      []
    ))
      solid.tri(pos(ring[a], top), pos(ring[c], top), pos(ring[b], top), deck);
  }
  const base = Math.min(...grades) - 0.35;
  prism(lot, base, 314.6, '#baaf9c', '#c3bdaf');
  // Glazed retail fronts and two parking openings at the base of the tower.
  for (let i = 0; i < lot.length; i++) {
    const [x, z] = lot[i],
      [ex, ez] = lot[(i + 1) % lot.length];
    const len = Math.hypot(ex - x, ez - z);
    if (len < 6) continue;
    const dx = (ex - x) / len,
      dz = (ez - z) / len;
    // Orient the tiny glazing offset to the exterior in either ring winding.
    const sign = pointInRing((x + ex) / 2 - dz * 0.25, (z + ez) / 2 + dx * 0.25, lot) ? -1 : 1;
    const p = (s: number, y: number) => [x + dx * s - dz * 0.07 * sign, y, z + dz * s + dx * 0.07 * sign];
    const n = Math.floor(len / 3.5);
    for (let k = 0; k < n; k++) {
      const l = (k * len) / n + 0.22,
        r = ((k + 1) * len) / n - 0.22;
      const grade = grid.sample(p((l + r) / 2, 0)[0], p((l + r) / 2, 0)[2]) ?? base;
      solid.quad(
        p(l, grade + 0.35),
        p(r, grade + 0.35),
        p(r, Math.min(grade + 4, 312.7)),
        p(l, Math.min(grade + 4, 312.7)),
        '#48585c'
      );
      if (grade + 4 < 312) solid.quad(p(l, 312.1), p(r, 312.1), p(r, 313.6), p(l, 313.6), '#676a64');
    }
  }
  prism(shaft, 314.6, roof, '#a9b1ae', '#b4b7b0');
  const levels = 36,
    pitch = (roof - 314.6) / levels;
  for (let side = 0; side < shaft.length; side++) {
    const [x, z] = shaft[side],
      [u, v] = shaft[(side + 1) % shaft.length];
    const width = Math.hypot(u - x, v - z),
      dx = (u - x) / width,
      dz = (v - z) / width;
    const p = (s: number, y: number, d: number) => [x + dx * s - dz * d, y, z + dz * s + dx * d];
    const panel = (l: number, r: number, lo: number, hi: number, d: number, c: string, b = solid) =>
      b.quad(p(l, lo, d), p(r, lo, d), p(r, hi, d), p(l, hi, d), c);
    const bays = Math.max(1, Math.round(width / 4.8));
    for (let k = 0; k < bays; k++) {
      const l = (k * width) / bays,
        r = ((k + 1) * width) / bays;
      for (let f = 0; f < levels; f++) {
        const y = 314.6 + f * pitch;
        const hash = hashStr(side + '/' + k + '/' + f);
        const glass = ['#859ca8', '#859fac', '#8da6af', '#829ba6'][hash % 4];
        panel(l + 0.17, r - 0.17, y + 0.2, y + pitch - 0.2, 0.06, glass, hash % 13 === 0 ? lit : solid);
        panel((l + r) / 2 - 0.043, (l + r) / 2 + 0.043, y + 0.2, y + pitch - 0.2, 0.09, silver);
        const balcony = side !== 4 && (side === 0 ? k % 3 !== 1 : side === 3 || side === 5 ? k % 4 !== 0 : k % 2 === 0);
        if (!balcony) continue;
        // The front rail follows the shallow, faceted bow of each separate balcony.
        const a = l + 0.2,
          b = r - 0.2,
          deep = 1.52;
        const nodes = [
          [a, 0.12],
          [a + (b - a) * 0.25, deep],
          [a + (b - a) * 0.75, deep],
          [b, 0.12],
        ];
        for (let j = 1; j < nodes.length; j++) {
          const [s, d] = nodes[j - 1],
            [t, e] = nodes[j];
          solid.quad(p(s, y, 0.08), p(t, y, 0.08), p(t, y, e), p(s, y, d), shadow);
          solid.quad(p(s, y - 0.24, d), p(t, y - 0.24, e), p(t, y, e), p(s, y, d), slab);
          solid.quad(p(s, y + 0.17, d), p(t, y + 0.17, e), p(t, y + 0.82, e), p(s, y + 0.82, d), '#78929a');
          solid.quad(p(s, y + 0.82, d), p(t, y + 0.82, e), p(t, y + 0.9, e), p(s, y + 0.9, d), silver);
        }
      }
      panel(l, l + (k % 3 === 0 ? 0.48 : 0.18), 314.6, roof + 0.65, 0.14, slab);
    }
    panel(0, width, roof - 0.3, roof + 0.65, 0.15, slab);
  }
  solid.box(9.8, 6.35, 11.2, 323.0, roof + 3.175, -1238.3, '#aba99f');
  prism(
    [
      [318.2, -1258.0],
      [328.3, -1258.0],
      [324.8, -1263.3],
      [321.2, -1263.3],
    ],
    roof,
    437.5,
    slab,
    '#bdbcb1'
  );
  prism(
    [
      [320.7, -1261.2],
      [325.1, -1261.2],
      [324.0, -1264.0],
      [322.0, -1264.0],
    ],
    437.5,
    445.1,
    slab,
    '#bcbbb4'
  );
  // Open ladder frame and one slender needle on the pointed north elevation.
  for (const x of [321.7, 324.1]) solid.box(0.3, 14.4, 0.32, x, 444.1, -1264.0, silver);
  for (let i = 0; i < 5; i++) solid.box(2.4, 0.18, 0.28, 322.9, 438 + i * 2.9, -1264.0, silver);
  solid.box(0.27, 8.4, 0.27, 321.7, 453.3, -1264.0, silver);
  const group = new Group();
  group.name = 'Twelve Centennial Park Tower I';
  group.position.y = -grid.manifest.vertical.sceneZeroNavd88M;
  const mesh = new Mesh(solid.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  mesh.castShadow = mesh.receiveShadow = true;
  const lights = new MeshLambertMaterial({
    vertexColors: true,
    side: DoubleSide,
    emissive: '#e6bd84',
    emissiveIntensity: 0,
  });
  const panes = new Mesh(lit.geometry(), lights);
  panes.receiveShadow = true;
  group.add(mesh, panes);
  return {
    group,
    buildings: buildings.filter((b) => b !== building),
    setNight(night: number) {
      lights.emissiveIntensity = 0.53 * night;
    },
  };
}
