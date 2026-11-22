import { DoubleSide, Group, Mesh, MeshLambertMaterial, ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, hashStr, pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const towerId = 'e1dec5e7-426b-4dcc-b118-319a02735c18';
const stationSideId = '375da932-0e7e-4297-b010-f39110f1538c';
const dx = 0.83265749,
  dz = 0.55378833;
const position = (u: number, v: number, y: number) => [80.03 + dx * u - dz * v, y, -54.75 + dz * u + dx * v];
const silver = '#cfcec3',
  side = '#999c96',
  sill = '#a2a6a1',
  spandrel = '#737c7d';
const roof = 483.85,
  rim = 485.08;
const front = 1.5,
  back = 33.6,
  end = 65.35;

// All y coordinates in the builders are absolute metres NAVD88. Translate
// the batches once using the same vertical datum as City's ground mesh.
export function createTwoPeachtree(buildings: VBuilding[], grid: GroundGrid) {
  const tower = buildings.find((b) => b.id === towerId),
    low = buildings.find((b) => b.id === stationSideId);
  if (!tower || !low || tower.rings.length !== 1 || low.rings.length !== 1) return null;
  const contains = (lot: VBuilding, u: number, v: number) => {
    const [x, , z] = position(u, v, 0);
    return pointInRing(x, z, lot.rings[0]);
  };
  if (
    ![
      [2, 3],
      [60, 3],
      [60, 29],
      [2, 29],
    ].every(([u, v]) => contains(tower, u, v)) ||
    ![
      [-17, 35],
      [57, 36],
      [52, 61],
      [-18, 61],
    ].every(([u, v]) => contains(low, u, v))
  )
    return null;
  const terrain = [...tower.rings[0], ...low.rings[0]].map(([x, z]) => grid.sample(x, z));
  if (terrain.some((h) => h === null || !Number.isFinite(h))) return null;
  const bottom = Math.min(...(terrain as number[])) - 0.5;
  const shell = new Builder(),
    occupied = new Builder();
  const rect = (u: number, v: number, w: number, d: number): P2[] => [
    [u, v],
    [u + w, v],
    [u + w, v + d],
    [u, v + d],
  ];
  const slab = (ring: P2[], lo: number, hi: number, wall: string, top: string) => {
    const pts = ring.map(([u, v]) => position(u, v, hi));
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        b = pts[(i + 1) % pts.length];
      shell.quad([a[0], lo, a[2]], [b[0], lo, b[2]], b, a, wall);
    }
    for (const [a, b, c] of ShapeUtils.triangulateShape(
      pts.map((q) => new Vector2(q[0], q[2])),
      []
    ))
      shell.tri(pts[a], pts[c], pts[b], top);
  };
  // The two nearly level roofs within the eight-point record meet at u≈22.
  const apron = low.rings[0].map(([x, z]): P2 => [
    (x - 80.03) * dx + (z + 54.75) * dz,
    -(x - 80.03) * dz + (z + 54.75) * dx,
  ]);
  slab(apron, bottom, 328.05, '#c0bcb2', '#b9bab2');
  const eastern: P2[] = [];
  for (let i = 0; i < apron.length; i++) {
    const a = apron[i],
      b = apron[(i + 1) % apron.length];
    if (a[0] >= 22) eastern.push(a);
    if (a[0] >= 22 !== b[0] >= 22) eastern.push([22, a[1] + ((b[1] - a[1]) * (22 - a[0])) / (b[0] - a[0])]);
  }
  slab(eastern, 328.05, 329.9, '#c9c7bb', '#d2d0c4');
  for (const [u, v] of [
    [-12, 45],
    [-8, 46],
    [27, 39],
    [35, 56],
    [51, 44],
  ])
    slab(rect(u, v, 2.3, 1.5), u < 22 ? 328.05 : 329.9, u < 22 ? 328.7 : 330.55, side, '#a7aaa4');
  // Broad Street frontage: stone piers, shadowed glazing, horizontal canopy.
  const entry = (l: number, r: number, lo: number, hi: number, v: number, c: string, b = shell) =>
    b.quad(position(l, v, lo), position(r, v, lo), position(r, v, hi), position(l, v, hi), c);
  for (let bay = 0; bay < 11; bay++) {
    const l = -20 + bay * 7,
      r = l + 7,
      v = 63.93 + (l + 20) * 0.005;
    const [x, , z] = position((l + r) / 2, v, 0);
    const grade = grid.sample(x, z) ?? 322;
    entry(
      l + 0.6,
      r - 0.6,
      grade + 0.3,
      Math.min(grade + 3.85, 327.1),
      v + 0.22,
      '#424e51',
      bay === 3 ? occupied : shell
    );
    entry(l + 3.42, l + 3.56, grade + 0.3, Math.min(grade + 3.85, 327.1), v + 0.25, silver);
    if (bay === 3 || bay === 4) slab(rect(l, v - 0.24, 7, 1.1), 326.4, 326.74, '#5b5b56', '#aca99d');
  }
  // Closed shaft below the roof. The roof itself has a recessed plant court
  // at its northwest end, visible in the owner's aerial and lidar samples.
  const deck = '#b9b9b0',
    recess = '#686e6d';
  slab(rect(0, front, end, back - front), bottom, 478.6, spandrel, '#a1a29a');
  for (const [u, v, w, d] of [
    [0, front, 5.7, back - front],
    [20.5, front, end - 20.5, back - front],
    [5.7, front, 14.8, 4.4],
    [5.7, 29, 14.8, back - 29],
  ])
    slab(rect(u, v, w, d), 478.6, roof, recess, deck);
  for (const [u, v, w, d, h] of [
    [8, 8, 6, 5, 482],
    [8, 18, 6, 5, 482],
    [8, 25, 6, 3, 481.5],
    [25, 12, 6.6, 4, 486.2],
    [45, 14, 4, 4.6, 486.8],
    [56, 12, 3.6, 3.4, 486.1],
  ])
    slab(rect(u, v, w, d), u < 20 ? 478.6 : roof, h, '#a1a49e', '#d1d0c5');
  const facade = (span: number, bays: number, pt: (t: number, h: number, d: number) => number[], seed: number) => {
    const panel = (l: number, r: number, lo: number, hi: number, d: number, c: string, b = shell) =>
      b.quad(pt(l, lo, d), pt(r, lo, d), pt(r, hi, d), pt(l, hi, d), c);
    const band = (y: number, hi: number, offset: number, c: string) => panel(0, span, y, hi, offset, c);
    const bayWidth = span / bays;
    const glazing = ['#53646c', '#52616a', '#68767a', '#647075', '#747979', '#475860'];
    for (let b = 0; b < bays; b++) {
      const l = b * bayWidth,
        r = l + bayWidth;
      panel(l, r, bottom, 332, 0.05, '#bdbbb1');
      const groundPt = pt((l + r) / 2, 0, 0),
        grade = grid.sample(groundPt[0], groundPt[2]) ?? 321;
      panel(l + 0.42, r - 0.42, grade + 0.38, 330.45, 0.11, '#44565c');
      for (let j = 1; j < 3; j++)
        panel(l + (j * bayWidth) / 3 - 0.09, l + (j * bayWidth) / 3 + 0.09, grade + 0.38, 330.45, 0.14, silver);
      // The dark mechanical belt interrupts the window grid below mid-height.
      for (const [lo, hi, count] of [
        [332, 367.8, 10],
        [374.6, 476.55, 28],
      ]) {
        const pitch = (hi - lo) / count;
        for (let f = 0; f < count; f++) {
          const y = lo + f * pitch;
          for (let j = 0; j < 3; j++) {
            const a = l + 0.2 + (j * (bayWidth - 0.4)) / 3,
              z = a + (bayWidth - 0.4) / 3;
            const h = hashStr(seed + '/' + b + '/' + lo + '/' + f + '/' + j);
            panel(
              a + 0.042,
              z - 0.042,
              y + 0.37,
              y + pitch - 0.55,
              0.09,
              glazing[h % glazing.length],
              h % 97 === 0 ? occupied : shell
            );
          }
          panel(l + 0.16, r - 0.16, y + 0.26, y + 0.37, 0.115, sill);
        }
      }
      // A solid, slender blade, readable edge-on from the rail approach.
      const t = l + 0.02,
        half = 0.23;
      for (const [s, d, s2, d2, c] of [
        [t - half, 0.08, t - half, 0.64, side],
        [t - half, 0.64, t + half, 0.64, silver],
        [t + half, 0.64, t + half, 0.08, side],
      ] as const)
        shell.quad(pt(s, bottom, d), pt(s2, bottom, d2), pt(s2, rim + 0.12, d2), pt(s, rim + 0.12, d), c);
    }
    band(367.8, 374.6, 0.078, '#4a5558');
    band(368, 368.2, 0.11, side);
    band(374.38, 374.6, 0.11, sill);
    for (let i = 0; i < 9; i++) band(368.45 + i * 0.66, 368.62 + i * 0.66, 0.105, '#697273');
    band(476.55, rim, 0.065, '#667072');
    for (let i = 0; i < 16; i++) band(476.8 + i * 0.48, 476.93 + i * 0.48, 0.105, '#808788');
    band(rim - 0.18, rim + 0.06, 0.21, silver);
    shell.quad(
      pt(0, rim + 0.06, 0.21),
      pt(span, rim + 0.06, 0.21),
      pt(span, rim + 0.06, -0.36),
      pt(0, rim + 0.06, -0.36),
      silver
    );
    panel(0, span, roof, rim + 0.06, -0.36, '#9a9e98');
  };
  facade(end, 11, (t, h, d) => position(t, front - d, h), 1);
  facade(back - front, 5, (t, h, d) => position(end + d, front + t, h), 2);
  facade(end, 11, (t, h, d) => position(end - t, back + d, h), 3);
  facade(back - front, 5, (t, h, d) => position(-d, back - t, h), 4);
  const solid = new Mesh(shell.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  solid.castShadow = solid.receiveShadow = true;
  const light = new MeshLambertMaterial({
    vertexColors: true,
    side: DoubleSide,
    emissive: '#d0b590',
    emissiveIntensity: 0,
  });
  const panes = new Mesh(occupied.geometry(), light);
  panes.receiveShadow = true;
  const group = new Group();
  group.name = 'Two Peachtree';
  group.position.y = -grid.manifest.vertical.sceneZeroNavd88M;
  group.add(solid, panes);
  return {
    group,
    buildings: buildings.filter((b) => b !== tower && b !== low),
    setNight(dark: number) {
      light.emissiveIntensity = 0.23 * dark;
    },
  };
}
