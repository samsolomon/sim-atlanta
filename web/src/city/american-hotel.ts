import { surfaces } from '../materials';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litFacade, seedOf, wound } from './skin-kit';

const id = 'f546e179-3711-43b8-a9c8-44b423eb5d46';
const stone = '#c3b9a6';
const trim = '#d1ccc0';
const pier = '#b3ab9d';
const infill = '#8b847a';
const glass = ['#a2a9ae', '#a4a8a9'];

// The 344.7 m lidar roof follows two wings around a lower, west-facing terrace.
const guestWings: P2[] = [
  [118, -638.8], [152.8, -639.5], [174.6, -613.1], [170.1, -609.2],
  [175.8, -602.3], [171.9, -595.4], [135.3, -564.1], [123.6, -577.5],
  [150.1, -599], [140.7, -614.8], [136, -620.9], [118, -620.9],
];

function roundPlan(x: number, z: number, radius: number, steps: number): P2[] {
  return Array.from({ length: steps }, (_, i) => {
    const angle = (i / steps) * 2 * Math.PI;
    return [x + radius * Math.cos(angle), z + radius * Math.sin(angle)];
  });
}

export function createAmericanHotel(buildings: VBuilding[], grid: GroundGrid) {
  const shell = landmarkShell(buildings, grid, id, 'American Hotel', [0, 0], [1, 0],
    [[110, -628], [135, -626], [136, -572], [169, -602]]);
  if (!shell) return null;

  const { body, lights } = shell;
  const seed = seedOf(id);
  const roof = surfaces.asphaltRoof();
  const limestone = surfaces.limestone({ course: 0.32 });
  const base = wound([...shell.ring.slice(0, 12), ...shell.ring.slice(17)], 1);
  shell.prism(base, shell.base, 325.9, stone, '#a18f77', { wall: limestone, roof });

  faces(base, (a, b, length, face) => {
    if (length < 5) return;
    litFacade(shell, seed, face, a, b, 319.05, 325.1, 2, 5.2, 0.52, 0.58, glass, 0.26);
  });

  const wings = wound(guestWings, 1);
  shell.prism(wings, 325.85, 344.7, infill, '#696963', { roof });
  faces(wings, (a, b, length, face) => {
    function panel(lo: number, hi: number, start: number, end: number, depth: number, color: string) {
      const [x, z] = along(a, b, length, start, depth);
      const [x1, z1] = along(a, b, length, end, depth);
      body.quad([x, lo, z], [x, hi, z], [x1, hi, z1], [x1, lo, z1], color);
    }
    panel(325.87, 326.65, 0, length, 0.12, trim);
    panel(341.29, 342.12, 0, length, 0.12, trim);
    panel(344.25, 344.7, 0, length, 0.12, trim);
    if (length < 6) return;
    const bays = Math.round(length / 3.15);
    const pitch = length / bays;
    for (let i = 0; i < bays; i++) {
      const start = i * pitch;
      panel(326.65, 341.29, start, start + pitch * 0.19, 0.16, pier);
      panel(342.12, 344.25, start, start + pitch * 0.22, 0.16, trim);
    }
    litFacade(shell, seed, face + 32, a, b, 326.65, 341.29, 6, pitch, 0.55, 0.49, glass, 0.25);
    litFacade(shell, seed, face + 64, a, b, 342.12, 344.25, 1, pitch, 0.62, 0.55, glass, 0.23);
  });

  // The circular upper room meets the square clock turret at the street corner.
  const drum = roundPlan(166.9, -602.2, 7.05, 16);
  shell.prism(drum, 344.65, 349.05, pier, '#77726b', { roof });
  faces(drum, (a, b, _length, face) => {
    litFacade(shell, seed, face + 96, a, b, 345.15, 348.65, 1, 3, 0.79, 0.68, glass, 0.16);
  });
  const clock: P2[] = [[170.3, -604], [174.5, -599.4], [170.7, -595.9], [166.6, -600.5]];
  shell.prism(clock, 344.63, 354.1, trim, '#777a76');
  faces(clock, (a, b, length, face) => {
    litFacade(shell, seed, face + 112, a, b, 349.15, 351.4, 1, 4, 0.8, 0.7, glass, 0);
    const pt = (angle: number) => {
      const [x, z] = along(a, b, length, length / 2 + 0.54 * Math.cos(angle), 0.12);
      return [x, 352.1 + 0.54 * Math.sin(angle), z];
    };
    const [x, z] = along(a, b, length, length / 2, 0.12);
    for (let i = 0; i < 12; i++) {
      body.tri([x, 352.1, z], pt((i + 1) * Math.PI / 6), pt(i * Math.PI / 6), '#e1dac7');
    }
  });
  const peak = [170.55, 356.3, -599.95];
  faces(clock, (a, b) => {
    body.tri([a[0], 354.1, a[1]], peak, [b[0], 354.1, b[1]], '#8c9391');
  });
  const plant: P2[] = [[150, -607], [155.6, -611.7], [163.6, -602.3], [158, -597.6]];
  shell.prism(plant, 344.65, 353.85, '#817b70', '#77746c', { roof });

  // The photographed entrance canopy covers an open drive. Its edge and piers
  // stay inside the mapped extension instead of extruding that extension as a wall.
  const canopy: P2[] = [[170.2, -605.45], [182.45, -604.9], [181.9, -597.3],
    [180.9, -594.65], [172.3, -595.3]];
  shell.prism(canopy, 321.25, 322, trim, '#aaa498');
  const canopyPoint = ([x, z]: P2) => [x, 321.25, z];
  for (let i = 1; i < canopy.length - 1; i++) {
    body.tri(canopyPoint(canopy[0]), canopyPoint(canopy[i]), canopyPoint(canopy[i + 1]), trim);
  }
  for (const [x, z] of [[178.9, -602.9], [178.45, -596.9]]) {
    const column = roundPlan(x, z, 0.4, 8);
    shell.prism(column, shell.base, 321.29, trim, trim);
    const downlight = roundPlan(x - 1.3, z - 0.5, 0.21, 8);
    for (let i = 1; i < downlight.length - 1; i++) {
      const point = ([px, pz]: P2) => [px, 321.21, pz];
      lights.tri(point(downlight[0]), point(downlight[i]), point(downlight[i + 1]), '#d9cdb5');
    }
  }
  return shell.finish('#f2d0a2', 0.52);
}
