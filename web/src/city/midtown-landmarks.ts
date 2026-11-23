import { CylinderGeometry, Vector3 } from 'three';
import { type Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';

export const midtownLandmarkIds = new Set(['osm:way:39449840', 'osm:way:208355446']);

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;
type Point = [number, number, number];
const bank = 'osm:way:39449840';

function rod(batch: Builder, a: Point, b: Point, radius: number, color: string) {
  const delta = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const mesh = new CylinderGeometry(radius, radius, delta.length(), 4);
  mesh.rotateX(Math.PI / 2);
  mesh.lookAt(delta);
  mesh.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  batch.addGeometry(mesh, color);
}

function tower(shell: Shell) {
  const { ring, prism, lights, facade } = shell;
  const copper = '#985e4f',
    shadow = '#513e43';
  // The survey picks up the four stair-stepped wings at 45 degrees to North Avenue.
  const plan = [...ring];
  const signed = plan.reduce((sum, [x, z], i) => {
    const next = plan[(i + 1) % plan.length];
    return sum + x * next[1] - z * next[0];
  }, 0);
  if (signed < 0) plan.reverse();
  prism(plan, shell.base, 8, '#63545a', shadow);
  for (const [lo, hi, scale, floors] of [
    [8, 153, 1, 33],
    [153, 216, 0.96, 14],
    [216, 240, 0.91, 6],
  ]) {
    const outline: P2[] = plan.map(([x, z]) => [x * scale, z * scale]);
    prism(outline, lo, hi, copper, shadow);
    outline.forEach((a, i) => {
      const b = outline[(i + 1) % outline.length];
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        length = Math.hypot(dx, dz);
      // Paired projecting piers frame the broad window banks of each wing.
      if (length > 17) {
        for (const t of [0.06, 0.94]) {
          const x = a[0] + t * dx,
            z = a[1] + t * dz;
          shell.body.box(
            1.3,
            hi - lo,
            1.3,
            x + (0.48 * dz) / length,
            (hi + lo) / 2,
            z - (0.48 * dx) / length,
            '#b07b65',
          );
        }
      }
      facade(
        a,
        outline[(i + 1) % outline.length],
        lo,
        hi,
        floors,
        2.8,
        0.78,
        0.89,
        ['#413d48', '#504450', '#56474e'],
        0.075,
      );
    });
  }
  // Open, tiered steel lattice. Horizontal ties and diagonal braces remain visible through it.
  const tiers = [
    [240, 20],
    [246, 19],
    [259, 14.6],
    [274, 8.8],
    [286, 4.4],
  ];
  const face = (side: number, t: number, y: number, r: number): Point => {
    const k = (2 * t - 1) * r;
    return [
      [k, y, -r],
      [r, y, k],
      [-k, y, r],
      [-r, y, -k],
    ][side] as Point;
  };
  for (let i = 1; i < tiers.length; i++) {
    const [lo, r] = tiers[i - 1],
      [hi, s] = tiers[i];
    for (let side = 0; side < 4; side++) {
      for (let j = 0; j < 5; j++) {
        rod(lights, face(side, j / 5, lo, r), face(side, j / 5, hi, s), 0.52, '#c29954');
        rod(lights, face(side, j / 5, lo, r), face(side, (j + 1) / 5, hi, s), 0.27, '#bc8e4a');
      }
      for (let j = 0; j < 4; j++) {
        const h = lo + ((hi - lo) * j) / 4,
          w = r + ((s - r) * j) / 4;
        rod(lights, face(side, 0, h, w), face(side, 1, h, w), j === 0 ? 0.6 : 0.3, '#d4a75f');
      }
    }
  }
  const spire = new CylinderGeometry(0.22, 3.8, 25.8, 4);
  spire.translate(0, 298.9, 0);
  lights.addGeometry(spire, '#d9ad66');
  return shell.finish('#ffb742', 1.25);
}

function theatre(shell: Shell) {
  const { prism, body, lights } = shell;
  const buff = '#beaa85',
    cream = '#e8d4b3',
    shadow = '#574f4b';
  prism(shell.ring, shell.base, 9, buff, '#91887a');
  function block(x: number, z: number, w: number, d: number, lo: number, hi: number, wall: string, roof = cream) {
    prism(
      [
        [x - w / 2, z - d / 2],
        [x + w / 2, z - d / 2],
        [x + w / 2, z + d / 2],
        [x - w / 2, z + d / 2],
      ],
      lo,
      hi,
      wall,
      roof,
    );
  }
  function drum(x: number, z: number, y: number, r: number, profile: number[][], color: string) {
    for (let i = 1; i < profile.length; i++) {
      const [lo, a] = profile[i - 1],
        [hi, b] = profile[i];
      const piece = new CylinderGeometry(r * b, r * a, hi - lo, 12);
      piece.translate(x, y + (lo + hi) / 2, z);
      body.addGeometry(piece, color);
    }
  }
  // Thin alternating brick courses wrap the irregular retail frontage.
  const coursing = (a: P2, b: P2, lo: number, hi: number, pitch: number) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    const outward = (x: number, z: number, y: number) => [x + (0.07 * dz) / len, y, z - (0.07 * dx) / len];
    for (let y = lo; y < hi; y += pitch)
      body.quad(outward(...a, y), outward(...b, y), outward(...b, y + 0.23), outward(...a, y + 0.23), '#dcc7a1');
  };
  const area = shell.ring.reduce((n, a, i) => {
    const b = shell.ring[(i + 1) % shell.ring.length];
    return n + a[0] * b[1] - a[1] * b[0];
  }, 0);
  const outline = area > 0 ? shell.ring : [...shell.ring].reverse();
  outline.forEach((a, i) => coursing(a, outline[(i + 1) % outline.length], 1, 9, 1.15));
  // The auditorium and fly tower step up behind the low shops and entrance corridor.
  block(-22, -6, 61, 34, 8.9, 21, '#ab987d', '#807c74');
  block(-43, -5, 19, 36, 20.9, 27, buff, '#746e68');
  block(-18, 21, 29, 16, 8.9, 17.4, buff);
  for (const x of [-28, -8])
    drum(
      x,
      22,
      17.4,
      3.5,
      [
        [0, 1],
        [1, 1],
        [3, 0.7],
        [3.8, 0.15],
      ],
      '#a4bcb0',
    );
  drum(
    -18,
    22,
    17.4,
    6.7,
    [
      [0, 0.78],
      [1, 0.95],
      [3, 1],
      [5.6, 0.85],
      [8, 0.47],
      [9.5, 0.15],
      [10.6, 0.04],
    ],
    '#9ab7ac',
  );
  // Shallow roof lanterns and vent housings visible behind the Ponce entrance.
  for (const x of [2, 17, 32]) {
    block(x, 15, 7, 2.4, 9, 9.85, '#9e9b90', '#b2afa1');
    block(x + 1.9, 15, 1.7, 1.7, 9.85, 10.35, '#979b97');
  }
  block(19, -3, 9, 6, 9, 9.8, cream);
  for (let x = 15; x <= 23; x += 1.6) block(x, -3, 1.47, 5.7, 9.8, 10.1, '#709293', '#62898c');
  for (const x of [-48, -36]) block(x, -7, 5, 3, 27, 28, '#aaa497', '#bcb7a8');
  // Slim contrasting ribs curve across the glazed onion dome.
  const profile = [
    [0, 0.78],
    [1, 0.95],
    [3, 1],
    [5.6, 0.85],
    [8, 0.47],
    [9.5, 0.15],
    [10.6, 0.04],
  ];
  for (let j = 0; j < 12; j++) {
    const p = (h: number, r: number, twist: number): Point => [
      -18 + Math.cos((j * Math.PI) / 6 + twist) * 6.8 * r,
      17.4 + h,
      22 + Math.sin((j * Math.PI) / 6 + twist) * 6.8 * r,
    ];
    for (let i = 1; i < profile.length; i++) {
      const [lo, a] = profile[i - 1],
        [hi, b] = profile[i];
      for (const d of [-1, 1]) rod(body, p(lo, a, (i - 1) * d * 0.08), p(hi, b, i * d * 0.08), 0.09, '#826e65');
    }
  }
  coursing([8.5, 11], [-52, 11], 10, 21, 1.6);
  for (const x of [-42, -31, -20, -9, 2]) block(x, 10.9, 1.1, 0.65, 9, 21, '#c9b797');
  for (let i = 0; i < 4; i++) block(-18, 28.94, 29, 0.18, 10 + i * 1.8, 10.32 + i * 1.8, cream);
  // Recessed pointed portal on Ponce. The lower part is flush with the sloping frontage.
  const arch = (x: number, z: number, width: number, sill: number, spring: number, tip: number) => {
    body.quad(
      [x - width / 2, sill, z],
      [x - width / 2, spring, z],
      [x + width / 2, spring, z],
      [x + width / 2, sill, z],
      shadow,
    );
    body.tri([x - width / 2, spring, z], [x, tip, z], [x + width / 2, spring, z], shadow);
  };
  block(-18, 29.3, 13, 4.6, shell.base, 17, buff);
  arch(-18, 31.62, 8, 0, 10, 14.5);
  for (const x of [-29, -7]) {
    block(x, 28.9, 5, 2, shell.base, 17, buff);
    arch(x, 29.93, 2.5, 3, 6, 8);
    arch(x, 29.93, 2, 10, 12.6, 13.7);
  }
  for (const x of [1, 10, 19, 28, 37, 46]) {
    const z = 29.9 - (x + 1) * 0.083;
    arch(x, z + 0.15, 6, 1, 5.4, 7.3);
  }
  // Peachtree arcade occupies the eastward jog in the survey ring.
  block(51, -8, 12, 12, 8.9, 14, buff);
  block(55.1, -8.45, 5.7, 11.6, shell.base, 5, '#5d4a3e');
  for (const z of [-12.6, -10.5, -8.4, -6.3, -4.2]) {
    body.box(0.18, 3.9, 1.68, 58.02, 2.25, z, '#443d39');
    body.box(0.24, 0.19, 1.68, 58.05, 3.8, z, cream);
  }
  for (let z = -13; z < -2; z += 1.85) block(56.8, z, 0.55, 0.8, 14, 14.6, buff);
  for (const z of [-13.4, -2.9]) {
    drum(
      55,
      z,
      13.9,
      1.35,
      [
        [0, 1],
        [4.3, 0.72],
        [4.5, 1.15],
        [5.1, 1.15],
        [5.2, 0.72],
        [6.6, 0.72],
        [7.7, 0.12],
      ],
      cream,
    );
  }
  block(59, -8.5, 7.8, 11.8, 4.7, 6.2, '#9d302f', '#933d36');
  for (const z of [-14.46, -2.54]) lights.box(7.3, 0.85, 0.04, 59, 5.45, z, cream);
  lights.box(0.06, 0.85, 11.2, 62.92, 5.45, -8.5, cream);
  lights.box(7.9, 0.26, 11.9, 59, 4.85, -8.5, '#ffe6b2');
  lights.box(7.9, 0.19, 11.9, 59, 6.03, -8.5, '#ffe6b2');
  block(57.6, -8.5, 2.8, 0.62, 6.2, 19.7, '#ab2929', '#dfaf77');
  // Gold tube border around the vertical sign and warm transoms under the canopy.
  for (const z of [-8.84, -8.16]) {
    for (const x of [56.32, 58.88]) lights.box(0.12, 13.2, 0.07, x, 13, z, cream);
    for (const y of [6.45, 19.55]) lights.box(2.62, 0.15, 0.07, 57.6, y, z, cream);
  }
  for (const z of [-12.6, -10.5, -8.4, -6.3, -4.2]) lights.box(0.2, 0.55, 1.56, 58.08, 3.45, z, cream);
  // Twin-sided vertical lettering formed from strokes, visible along Peachtree.
  for (const z of [-8.85, -8.15]) {
    const stroke = (x: number, y: number, w: number, h: number) => lights.box(w, h, 0.05, x, y, z, '#ffe7ad');
    stroke(57, 16.9, 0.25, 2.1);
    stroke(57.6, 17.85, 1.4, 0.23);
    stroke(57.5, 17, 1.15, 0.22);
    for (const x of [57, 58.1]) stroke(x, 14.5, 0.22, 2.1);
    for (const y of [13.55, 15.45]) stroke(57.55, y, 1.26, 0.22);
    for (const d of [-1, 1]) rod(lights, [57.55 - d * 0.6, 10.8, z], [57.55 + d * 0.6, 12.8, z], 0.16, '#ffe7ad');
  }
  return shell.finish('#ffde9b', 1.15);
}

export function createMidtownLandmark(
  buildings: VBuilding[],
  site: VBuilding,
  base: number | null,
  groundAt: (x: number, z: number) => number | null,
) {
  if (!midtownLandmarkIds.has(site.id) || site.rings.length !== 1 || base === null) return null;
  const isBank = site.id === bank;
  const origin: P2 = isBank ? [504.6, -1886] : [556, -2080];
  const elevation = isBank ? groundAt(...origin) : groundAt(612, -2084);
  if (elevation === null || !Number.isFinite(elevation)) return null;
  const angle = isBank ? 0.804 : 0.074;
  const probes: P2[] = isBank
    ? [
        [-23, 0],
        [23, 0],
        [0, -24],
        [0, 23],
      ]
    : [
        [-52, 26],
        [-51, -22],
        [32, -30],
        [53, 23],
        [57, -8],
      ];
  const shell = localLandmarkShell(
    buildings,
    site,
    isBank ? 'Bank of America Plaza' : 'Fox Theatre',
    origin,
    [Math.cos(angle), Math.sin(angle)],
    probes,
    base - elevation - 0.35,
    elevation,
  );
  return shell && (isBank ? tower(shell) : theatre(shell));
}
