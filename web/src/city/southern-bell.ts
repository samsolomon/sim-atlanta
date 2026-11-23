import { CylinderGeometry, Mesh, MeshLambertMaterial, Quaternion, Vector3 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
type Face = 'west' | 'south' | 'east' | 'north';
const W = 67.0,
  D = 50.0,
  mainRoof = 381.7;
const stone = '#c4bbaa',
  trim = '#d2caba',
  recess = '#a79987',
  roof = '#aaa495';
const glass = ['#515956', '#63716e', '#77807a', '#606968', '#475450'];

function rect(x: number, z: number, u: number, v: number): P2[] {
  return [
    [x, z],
    [u, z],
    [u, v],
    [x, v],
  ];
}
// Rotate the same bay detail onto each face. s increases east on Auburn and south on Peachtree Center.
function facePoint(face: Face, s: number, y: number, inset: number) {
  switch (face) {
    case 'west':
      return [inset, y, s];
    case 'east':
      return [W - inset, y, s];
    case 'north':
      return [s, y, inset];
    case 'south':
      return [s, y, D - inset];
  }
}
function panel(b: Builder, face: Face, s: number, lo: number, w: number, h: number, inset: number, color: string) {
  b.quad(
    facePoint(face, s - w / 2, lo, inset),
    facePoint(face, s + w / 2, lo, inset),
    facePoint(face, s + w / 2, lo + h, inset),
    facePoint(face, s - w / 2, lo + h, inset),
    color,
  );
}
function shoulder(depth: number): P2[] {
  return [
    [0, 0],
    [22, 0],
    [22, depth],
    [43.8, depth],
    [43.8, 0],
    [W, 0],
    [W, 16.4],
    [W - depth, 16.4],
    [W - depth, 33.2],
    [W, 33.2],
    [W, D],
    [43.8, D],
    [43.8, D - depth],
    [22, D - depth],
    [22, D],
    [0, D],
    [0, 33.2],
    [depth, 33.2],
    [depth, 16.4],
    [0, 16.4],
  ];
}
const tiers = [
  { lo: 326.8, hi: 350.4, depth: 0 },
  { lo: 350.4, hi: 364.3, depth: 1.35 },
  { lo: 364.3, hi: 373.35, depth: 3.05 },
  { lo: 373.35, hi: mainRoof, depth: 5.45 },
];

function windows(m: Shell) {
  const random = rng(1929);
  for (const face of ['west', 'south', 'east', 'north'] as const) {
    const short = face === 'west' || face === 'east';
    // The west wings have a group of three lights between two single lights.
    const columns = short
      ? [2.4, 6.2, 8.4, 10.6, 14.1, 18.35, 21.8, 25, 28.2, 31.25, 35.8, 39.5, 41.7, 43.9, 47.55]
      : [2.65, 6.7, 9.45, 12.2, 16.1, 19.25, 24.3, 28.1, 32.2, 36.3, 40.3, 46.55, 50.5, 53.2, 55.9, 60.1, 64.05];
    for (let floor = 0; floor < 14; floor++) {
      const lo = floor === 0 ? 317.3 : 319.25 + floor * 4.55;
      const hi = floor === 0 ? 322.6 : lo + 2.42;
      const tier = tiers.find((t) => lo >= t.lo && lo < t.hi);
      for (const s of columns) {
        if (face === 'west' && s > 18 && s < 32 && floor < 2) continue;
        const central = short ? s > 16.4 && s < 33.2 : s > 22 && s < 43.8;
        const depth = central ? (tier?.depth ?? 0) : 0;
        const width = floor === 0 ? 1.62 : 1.37;
        panel(m.body, face, s, lo - 0.12, width + 0.27, hi - lo + 0.26, depth - 0.04, recess);
        panel(m.body, face, s, lo, width, hi - lo, depth - 0.065, '#4f504b');
        const b = random() < 0.095 ? m.lights : m.body;
        panel(
          b,
          face,
          s,
          lo + 0.12,
          width - 0.17,
          hi - lo - 0.26,
          depth - 0.075,
          glass[Math.floor(random() * glass.length)],
        );
        panel(m.body, face, s, lo + 0.45 * (hi - lo), width, 0.075, depth - 0.09, '#595d58');
        if (floor === 0 || floor === 13) {
          panel(m.body, face, s, hi + 0.17, width + 0.24, 0.18, depth - 0.1, trim);
          panel(m.body, face, s, hi + 0.39, width * 0.78, 0.11, depth - 0.1, trim);
        }
      }
    }
  }
}

function portal(m: Shell) {
  // Each successive lintel steps in toward the bronze doors. Leave the street opening hollow.
  const mid = 24.8,
    back = 3.05;
  for (const [lo, hi, half] of [
    [m.base, 323.45, 2.72],
    [323.45, 324.7, 2.3],
    [324.7, 325.75, 1.84],
    [325.75, 326.8, 1.42],
  ]) {
    const plan: P2[] = [
      [0, 0],
      [W, 0],
      [W, D],
      [0, D],
      [0, mid + half],
      [back, mid + half],
      [back, mid - half],
      [0, mid - half],
    ];
    m.prism(plan, lo, hi, stone, roof);
    if (hi === 326.8)
      m.body.quad([0, hi, mid - half], [back, hi, mid - half], [back, hi, mid + half], [0, hi, mid + half], '#9f927e');
  }
  // Only cover the two side returns of each ledge. The upper part of the opening stays clear.
  for (const [y, outer, inner] of [
    [323.45, 2.72, 2.3],
    [324.7, 2.3, 1.84],
    [325.75, 1.84, 1.42],
  ]) {
    for (const side of [-1, 1]) {
      const a = mid + side * outer,
        b = mid + side * inner;
      m.body.quad([0, y, a], [back, y, a], [back, y, b], [0, y, b], recess);
    }
  }
  for (const s of [mid - 1.05, mid + 1.05]) {
    panel(m.body, 'west', s, 315.0, 2.05, 6.8, back - 0.04, '#614f3e');
    panel(m.body, 'west', s, 316.15, 1.62, 4.95, back - 0.07, '#554f43');
    for (const y of [317.95, 320.25]) panel(m.body, 'west', s, y, 1.6, 0.09, back - 0.1, '#927f63');
  }
  for (const side of [-1, 1]) {
    for (const [offset, width, height] of [
      [3.14, 0.55, 11.7],
      [3.78, 0.35, 12.5],
      [4.42, 0.29, 13.05],
    ]) {
      const s = mid + side * offset;
      m.body.box(0.28, height, width, -0.08, 315.45 + height / 2, s, trim);
      panel(m.body, 'west', s, 326.1, width * 0.8, 0.6, -0.25, recess);
    }
  }
  for (const s of [19.4, 22.8, 26.7, 30.0]) {
    m.body.box(0.22, 22.9, 0.35, -0.04, 338.55, s, trim);
    m.body.box(0.26, 0.9, 0.73, -0.06, 326.75, s, recess);
  }
  // Shallow angular relief in the limestone flanking the two-storey portal.
  for (const side of [-1, 1]) {
    for (const y of [321.8, 323.35, 324.9]) {
      const s = mid + side * 3.8;
      m.body.quad([-0.26, y, s - 0.37], [-0.26, y + 0.62, s], [-0.26, y, s + 0.37], [-0.26, y - 0.62, s], recess);
    }
  }
}

function roofAndReturn(m: Shell) {
  m.prism(rect(20.6, 10.7, 40.6, 40.3), mainRoof, 385.1, '#afaa9e', '#a6a294');
  m.prism(rect(24.35, 14.6, 39.2, 39.5), 385.1, 389.1, '#a5a396', '#b0aa9d');
  m.prism(rect(48.1, 35.85, 64.55, 46.25), mainRoof, 383.65, '#aaa597', '#a39f91');
  // The baked shape includes this low return beyond the east wall.
  m.prism(
    [
      [W, 17.5],
      [98.2, 17.5],
      [98.2, 28.0],
      [100.0, 28.0],
      [100.0, 34.35],
      [W, 34.35],
    ],
    m.base,
    318.85,
    '#aca798',
    '#aaa492',
  );
  m.prism(rect(90.1, 17.85, 97.9, 28.1), 318.85, 325.65, '#a9a698', '#b1ac9e');
  m.prism(rect(100.0, 28.15, 114.0, 35.3), m.base, 317.5, '#aa9e8e', '#a49c91');
}

function rod(b: Builder, a: number[], c: number[], radius: number, color: string) {
  const start = new Vector3(...a),
    end = new Vector3(...c),
    axis = end.clone().sub(start);
  const shape = new CylinderGeometry(radius, radius, axis.length(), 5);
  shape.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), axis.normalize()));
  shape.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
  b.addGeometry(shape, color);
}

function tower(m: Shell) {
  const u = 12.8,
    v = 39.6,
    side = 10.15,
    cap = 13.55,
    copper = '#675849',
    rib = '#968777';
  m.prism(rect(u - side / 2, v - side / 2, u + side / 2, v + side / 2), mainRoof, 416.85, copper, copper);
  for (const x of [-1, 1])
    for (const z of [-1, 1])
      m.body.box(0.42, 35.15, 0.42, u + x * (side / 2 - 0.12), 399.27, v + z * (side / 2 - 0.12), rib);
  const mark = new Builder();
  for (const [nx, nz] of [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ]) {
    const point = (s: number, y: number, d: number) => [u + nx * d + nz * s, y, v + nz * d - nx * s];
    for (const s of [-3.65, -2.43, -1.21, 0, 1.21, 2.43, 3.65]) {
      m.body.quad(
        point(s - 0.055, 382.1, side / 2 + 0.02),
        point(s + 0.055, 382.1, side / 2 + 0.02),
        point(s + 0.055, 416.85, side / 2 + 0.02),
        point(s - 0.055, 416.85, side / 2 + 0.02),
        '#8c7a65',
      );
    }
    m.body.quad(
      point(-side / 2, 416.85, side / 2),
      point(side / 2, 416.85, side / 2),
      point(cap / 2, 419.45, cap / 2),
      point(-cap / 2, 419.45, cap / 2),
      '#817461',
    );
    // The blue roundel is visible on the north and south shaft faces.
    if (nz !== 0) {
      const r = 2.38;
      for (let j = 0; j < 6; j++) {
        const low = -r + j * ((2 * r) / 6) + 0.08,
          high = low + 0.51;
        const w = (y: number) => Math.sqrt(r * r - y * y);
        mark.quad(
          point(-w(low), 409.4 + low, side / 2 + 0.08),
          point(w(low), 409.4 + low, side / 2 + 0.08),
          point(w(high), 409.4 + high, side / 2 + 0.08),
          point(-w(high), 409.4 + high, side / 2 + 0.08),
          '#77c9ec',
        );
      }
    }
  }
  m.body.box(cap, 0.65, cap, u, 419.65, v, '#aba390');
  m.body.box(6.6, 4.55, 6.6, u, 422.1, v, '#6e6b5d');
  for (const [dx, dz] of [
    [-4.1, -2.55],
    [-1.4, 4.2],
    [3.8, 2.45],
    [2.4, -4.1],
  ]) {
    const dish = new CylinderGeometry(1.52, 1.2, 1.0, 12);
    dish.rotateX(Math.PI / 2);
    dish.rotateY(Math.atan2(dx, dz));
    dish.translate(u + dx, 422.05, v + dz);
    m.body.addGeometry(dish, '#b3b1a4');
  }
  const feet: P2[] = [
    [-1.8, -1.8],
    [1.8, -1.8],
    [1.8, 1.8],
    [-1.8, 1.8],
  ];
  for (let i = 0; i < 4; i++) {
    const [x, z] = feet[i],
      [ex, ez] = feet[(i + 1) % 4];
    rod(m.body, [u + x, 424.35, v + z], [u + x, 440.65, v + z], 0.12, '#bcbdb2');
    for (let tier = 0; tier < 4; tier++) {
      const y = 424.35 + tier * 4.075;
      rod(m.body, [u + x, y, v + z], [u + ex, y, v + ez], 0.095, '#a4a79d');
      rod(m.body, [u + x, y, v + z], [u + ex, y + 4.075, v + ez], 0.095, '#b9bcb1');
    }
    m.body.box(0.49, 3.65, 0.6, u + 1.19 * x, 441.0, v + 1.19 * z, '#bfbdaf');
  }
  m.body.box(4.5, 0.27, 4.5, u, 440.65, v, '#adaea3');
  return mark;
}

export function createSouthernBell(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(
    buildings,
    grid,
    'c39654db-4734-4f65-a65e-8c46ff9e1fb0',
    'Southern Bell Telephone Company Building',
    [517.95, -246.4],
    [1, 0.009],
    [
      [3, 3],
      [63, 4],
      [3, 46],
      [62, 46],
      [78, 25],
    ],
  );
  if (!m) return null;
  portal(m);
  for (const t of tiers) m.prism(t.depth ? shoulder(t.depth) : rect(0, 0, W, D), t.lo, t.hi, stone, roof);
  windows(m);
  roofAndReturn(m);
  const mark = tower(m);
  const result = m.finish('#eed4ac');
  const material = new MeshLambertMaterial({ vertexColors: true, emissive: 0x90d3ff, emissiveIntensity: 0.55 });
  result.group.add(new Mesh(mark.geometry(), material));
  return {
    ...result,
    setNight(night: number) {
      result.setNight(night);
      material.emissiveIntensity = 0.55 + 0.65 * night;
    },
  };
}
