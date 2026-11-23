import { DoubleSide, Group, Mesh, MeshLambertMaterial } from 'three';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';
import type { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';

const towerId = '7300fd12-c904-4654-8263-cf47f751fd64';
const campusId = '5a5f7fc1-6865-42bf-89e6-dde9ceb2d789';
const angle = Math.atan2(55.22, 83.75);
const origin: P2 = [-198.84, -43.13];
const world = (u: number, v: number): P2 => [
  origin[0] + u * Math.cos(angle) - v * Math.sin(angle),
  origin[1] + u * Math.sin(angle) + v * Math.cos(angle),
];
const granite = '#c9b9a7',
  trim = '#e3dacf',
  glass = '#536d78',
  shadow = '#384853';

export function createSamNunn(buildings: VBuilding[], grid: GroundGrid) {
  const tower = buildings.find((b) => b.id === towerId),
    campus = buildings.find((b) => b.id === campusId);
  if (!tower || !campus || tower.rings.length !== 1 || campus.rings.length !== 1) return null;
  // The compound lower outline also passes under part of the tower.
  for (const [lot, probes] of [
    [
      tower,
      [
        [2, 2],
        [36, 97],
      ],
    ],
    [
      campus,
      [
        [150, 0],
        [150, 99],
        [60, 82],
      ],
    ],
  ] as const) {
    if (!probes.every(([u, v]) => pointInRing(...world(u, v), lot.rings[0]))) return null;
  }
  const heights = [...tower.rings[0], ...campus.rings[0]].map(([x, z]) => grid.sample(x, z));
  if (!heights.every((y): y is number => y !== null && Number.isFinite(y))) return null;
  const base = Math.min(...heights) - 0.4,
    stone = new Builder(),
    lamps = new Builder(),
    random = rng(1997);
  function block(u: number, v: number, w: number, d: number, lo: number, hi: number, color: string) {
    stone.box(w, hi - lo, d, u + w / 2, (hi + lo) / 2, v + d / 2, color);
  }
  // Each elevation runs along an axis of the street grid. Panes are batched with the shell.
  function glazing(
    alongV: boolean,
    face: number,
    start: number,
    end: number,
    bottom: number,
    top: number,
    rows: number,
    bay: number,
    side: number,
    punched = false,
  ) {
    const n = Math.max(1, Math.round((end - start) / bay)),
      pitch = (top - bottom) / rows,
      step = (end - start) / n;
    const f = face + side * 0.06;
    const pt = (s: number, y: number) => (alongV ? [f, y, s] : [s, y, f]);
    for (let row = 0; row < rows; row++)
      for (let j = 0; j < n; j++) {
        const l = start + (j + (punched ? 0.19 : 0.025)) * step,
          r = start + (j + (punched ? 0.81 : 0.975)) * step;
        const low = bottom + (row + (punched ? 0.17 : 0.08)) * pitch,
          high = bottom + (row + (punched ? 0.86 : 0.92)) * pitch;
        const value = random(),
          batch = value < 0.093 ? lamps : stone;
        batch.quad(
          pt(l, low),
          pt(r, low),
          pt(r, high),
          pt(l, high),
          value < 0.38 ? '#556e7a' : value < 0.78 ? glass : shadow,
        );
      }
  }
  // Plaza wing and shallow western plinth. Forsyth stays open beneath the suspended link.
  block(-10.4, 0, 49, 106, base, 337.25, granite);
  block(38.4, 72, 63.7, 34.5, base, 331.3, granite);
  block(38.4, 72, 63.2, 23.4, 331.3, 356.15, trim);
  block(101.6, 74.0, 27.8, 17.7, 331.3, 356.15, trim);
  for (const [v, side] of [
    [74, -1],
    [91.7, 1],
  ])
    glazing(false, v, 101.8, 129.2, 332, 355.7, 6, 2.5, side);
  for (const [v, side] of [
    [72, -1],
    [95.4, 1],
  ])
    glazing(false, v, 38.8, 101.3, 332, 355.7, 6, 2.5, side);
  block(77, 77, 13, 12, 356.15, 360.9, '#969995');
  // The dark fields on both broad elevations are divided into three frames.
  block(0, 0, 38.4, 100.3, 337.25, 423.2, granite);
  for (const [u, side] of [
    [0, -1],
    [38.4, 1],
  ]) {
    for (const [lo, hi, rows] of [
      [337.5, 367.7, 7],
      [371.0, 396.9, 6],
      [400.3, 421.95, 5],
    ]) {
      glazing(true, u, 2.1, 98.1, lo, hi, rows, 2.7, side);
    }
    for (const y of [368.3, 397.6, 422.2]) glazing(true, u, 2.3, 97.9, y, y + 1.6, 1, 6.2, side);
  }
  // Narrow end elevations have a recessed dark slot between the two stone blades.
  for (const [v, side] of [
    [0, -1],
    [100.3, 1],
  ]) {
    glazing(false, v, 1.3, 12.8, 339, 422.5, 21, 15, side);
    block(14.2, v + (side < 0 ? -0.16 : 0), 5.0, 0.17, 338, 422.9, shadow);
    glazing(false, v, 21, 37, 338, 422.5, 20, 17, side);
  }
  block(2.6, 2.6, 7.4, 30, 423.2, 429.9, '#ada79c');
  block(15, 51, 9.8, 17.4, 423.2, 430.5, '#a5a39c');
  block(9.4, 77.2, 13.2, 17, 423.2, 427.8, '#8e928c');
  for (const v of [0, 98.2]) block(0.2, v, 15.2, 1.9, 423.2, 432.5, granite);
  for (const u of [0, 37.7]) block(u, 0, 0.7, 100.2, 423.2, 425.0, trim);
  // Rich's pale 1924 street wall and the later glass mid-rise occupy opposite ends of the same block.
  block(123, -11.4, 52.7, 62.7, base, 351.25, '#cdc2af');
  for (const [u, side] of [
    [123, -1],
    [175.7, 1],
  ])
    glazing(true, u, -10.9, 50.9, 322.1, 350.1, 6, 4.6, side, true);
  glazing(false, -11.4, 123.5, 175.2, 322.1, 350.1, 6, 4.65, -1, true);
  for (const y of [329.2, 347.6, 350.6]) block(122.8, -11.6, 53.1, 63.1, y, y + 0.36, trim);
  block(141.4, 4.8, 15.9, 17.5, 351.25, 355.1, '#a6a39c');
  block(129.3, 51.3, 46.4, 48.5, base, 364.9, trim);
  block(141.2, 99.8, 34.5, 11.3, base, 364.9, trim);
  for (const [u, side] of [
    [129.3, -1],
    [175.7, 1],
  ])
    glazing(true, u, 51.5, u > 140 ? 110.8 : 99.6, 325, 364.2, 10, 2.45, side);
  glazing(false, 111.1, 141.4, 175.5, 325, 364.2, 10, 2.45, 1);
  glazing(false, 51.3, 129.6, 175.5, 351.4, 364.2, 3, 2.45, -1);
  block(147.4, 58, 11.3, 11.9, 364.9, 371.95, '#9b9d96');
  const group = new Group();
  group.name = 'Sam Nunn Atlanta Federal Center';
  group.position.set(origin[0], -grid.manifest.vertical.sceneZeroNavd88M, origin[1]);
  group.rotation.y = -angle;
  const shell = new Mesh(stone.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  shell.castShadow = shell.receiveShadow = true;
  group.add(shell);
  const panes = new Mesh(
    lamps.geometry(),
    new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, emissive: '#e3c48c', emissiveIntensity: 0 }),
  );
  group.add(panes);
  return {
    group,
    buildings: buildings.filter((b) => b !== tower && b !== campus),
    setNight(night: number) {
      panes.material.emissiveIntensity = night * 0.59;
    },
  };
}
