import * as THREE from 'three';
import { Builder, pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const libraryId = '9578af9e-4715-40b8-822a-047b4cf16d9a';
// Origin at the Williams end of the Forsyth elevation; u runs toward Carnegie.
const origin: P2 = [281.06, -391.71];
const angle = Math.atan2(39.17, 46.06);
const cos = Math.cos(angle),
  sin = Math.sin(angle);
const concrete = '#c2bbae',
  reveals = '#9d988d',
  glass = '#536e70',
  roof = '#b0afa4';
const panels = ['#cfc6b6', '#c9c1b3', '#d1c8b8', '#cac2b5'];

export function createCentralLibrary(
  buildings: VBuilding[],
  groundAt: (x: number, z: number) => number | null,
) {
  const library = buildings.find((b) => b.id === libraryId);
  if (!library || library.rings.length !== 1) return null;
  const ring = library.rings[0].map(([x, z]): P2 => {
    const dx = x - origin[0],
      dz = z - origin[1];
    return [dx * cos - dz * sin, dx * sin + dz * cos];
  });
  if (
    ![
      [1, -1],
      [59, -1],
      [1, -38],
      [59, -38],
      [9, -48],
      [51, -48],
    ].every(([u, v]) => pointInRing(u, v, ring))
  )
    return null;
  // Take the level at the center of the Forsyth entrance. The Williams end of the site is lower.
  const datum = groundAt(origin[0] + 30*cos, origin[1] - 30*sin),
    grades = library.rings[0].map(([x, z]) => groundAt(x, z));
  if (datum === null || !Number.isFinite(datum) || grades.some((h) => h === null || !Number.isFinite(h)))
    return null;
  const bottom = Math.min(...(grades as number[])) - datum - 0.5;
  const shell = new Builder(),
    panes = new Builder();
  function block(u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, color: string) {
    shell.box(u1 - u0, y1 - y0, v1 - v0, (u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2, color);
  }
  function glazing(u0: number, u1: number, v: number, y0: number, y1: number) {
    panes.quad([u0, y0, v], [u1, y0, v], [u1, y1, v], [u0, y1, v], glass);
    const bays = Math.max(1, Math.round((u1 - u0) / 2.3));
    for (let i = 0; i <= bays; i++) {
      const u = u0 + ((u1 - u0) * i) / bays;
      block(u - 0.075, u + 0.075, v - 0.05, v + 0.09, y0, y1, '#384948');
    }
    block(u0, u1, v - 0.05, v + 0.1, y0 + 0.24, y0 + 0.46, '#485752');
  }
  // Fairlie's staggered service wing and the two upper floors set back from Forsyth.
  block(0.2, 60.2, -38.7, -15.4, bottom, 26.8, concrete);
  block(5.3, 55.1, -46.2, -38.7, bottom, 25.6, concrete);
  block(7.8, 52.6, -49.3, -46.2, bottom, 25.6, concrete);
  block(6.2, 54.1, -44.7, -38.7, 25.6, 26.8, concrete);
  block(6.2, 54.1, -44.7, -17.2, 26.8, 32.4, concrete);
  block(6, 54.3, -44.9, -17.0, 32.4, 32.7, roof);
  for (const u of [12, 22.6, 33.2, 43.8]) {
    block(u, u + 8.3, -49.39, -49.3, 0.4, 4.2, '#686963');
  }
  // The aerial resolves a long glazed rooflight and a smaller service enclosure.
  block(27, 38, -26.4, -19.2, 32.7, 33.4, '#698486');
  for (let u = 27; u <= 38; u += 1.5) block(u, u + 0.13, -26.4, -19.2, 33.4, 33.49, '#bebfb6');
  block(40.3, 47.8, -41.4, -33.9, 32.7, 35.2, '#a6a69d');

  // Recessed lobby and a shaded entry stair under the Forsyth cantilever.
  block(0.2, 60.2, -15.4, -4.8, bottom, 4.7, reveals);
  glazing(12.5, 55.8, -4.72, 0.9, 4.6);
  // Raised plaza and broad paver steps visible in the renovated elevation. The
  // western sunken corner stays open; the outer tread stops before the mapped sidewalk.
  block(9,59,-4.8,5.8,bottom,1.02,'#c0bbae');
  for (let i=0;i<5;i++) block(9,59,5.8+i*.58,6.38+i*.58,bottom,.84-.16*i,'#b9b4a9');

  // The design team's frontal photograph gives the panel rhythm and the unequal
  // new openings. At the fifth-floor terrace, the slot through the screen is open sky.
  const rowHeight = 4.44,
    width = 60.4,
    count = 14,
    bay = width / count;
  for (let row = 0; row < 5; row++) {
    const lo = 4.7 + row * rowHeight,
      hi = lo + rowHeight;
    for (let col = 0; col < count; col++) {
      const l = col * bay,
        r = l + bay;
      const court = col >= 5 && col <= 8 && row >= 3;
      // The court floor is at the fifth storey. The rear wall stands 15 m behind the screen.
      const back = court ? -1.15 : -15.4;
      const terraceSlot = col === 7 && row >= 3;
      if (terraceSlot) {
        if (row === 4) block(l, r, back, 0, hi - 0.85, hi, concrete);
        if (row === 3) block(l, r, back, 0, lo, lo + 0.5, concrete);
        continue;
      }
      const window =
        (row === 0 && (col < 3 || col >= 5)) ||
        (row === 1 && ((col >= 5 && col <= 8) || col >= 11)) ||
        (row === 2 && col === 11);
      const plane = window ? (row === 0 ? -3.6 : -1.3) : row === 0 ? -1.6 : row === 1 ? -0.7 : 0;
      const sideOpening = col === 13 && row === 1;
      const start = sideOpening ? -7.8 : back;
      block(l, r, start, plane - 0.18, lo, hi, window ? reveals : concrete);
      if (sideOpening) {
        block(l, r - 2.3, back, start, lo, hi, concrete);
        panes.quad(
          [r - 2.22, lo, back],
          [r - 2.22, lo, start],
          [r - 2.22, hi, start],
          [r - 2.22, hi, back],
          glass,
        );
      }
      if (window) glazing(l + 0.13, r - 0.13, plane - 0.1, lo + 0.28, hi - 0.28);
      else
        block(
          l + 0.025,
          r - 0.025,
          plane - 0.18,
          plane,
          lo + 0.027,
          hi - 0.027,
          panels[(row * 3 + col) % panels.length],
        );
    }
  }
  // A continuous lip and three-sided parapet above the shaded outdoor reading terrace.
  const top = 4.7 + 5 * rowHeight,
    left = 5 * bay,
    right = 9 * bay;
  block(0, width, -1.15, 0, top, top + 0.17, concrete);
  block(left, right, -15.4, -1.15, 4.7 + 3 * rowHeight, 4.7 + 3 * rowHeight + 0.14, '#b7aea0');
  for (const side of [left, right]) block(side - 0.12, side + 0.12, -15.4, -1.15, top, top + 0.19, concrete);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(shell.geometry(), mat);
  mesh.castShadow = mesh.receiveShadow = true;
  const windows = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    emissive: '#d4c799',
    emissiveIntensity: 0,
  });
  const glazingMesh = new THREE.Mesh(panes.geometry(), windows);
  glazingMesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'Atlanta Central Library';
  group.position.set(origin[0], datum, origin[1]);
  group.rotation.y = angle;
  group.add(mesh, glazingMesh);
  return {
    group,
    buildings: buildings.filter((b) => b !== library),
    setNight(dark: number) {
      windows.emissiveIntensity = 0.19 * dark;
    },
  };
}
