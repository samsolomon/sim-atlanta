import { localLandmarkShell } from './landmark-shell';
import type { VBuilding } from '../vignette/world';
import type { P2 } from '../vignette/geom';
import sites from './fixtures/midtown-culture/tech.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;
export const techIds = new Set(Object.values(sites).map((s) => s.id));

function tower(s: Shell) {
  const brick = '#a75c4c',
    trim = '#e2d9c6',
    slate = '#535654';
  const { body, lights } = s;
  s.prism(s.ring, s.base, 12.6, brick, slate);
  const plan = [...s.ring];
  if (
    plan.reduce((sum, [x, z], i) => {
      const b = plan[(i + 1) % plan.length];
      return sum + x * b[1] - z * b[0];
    }, 0) < 0
  )
    plan.reverse();
  for (let i = 0; i < plan.length; i++) {
    const a = plan[i],
      b = plan[(i + 1) % plan.length];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 3)
      s.facade(a, b, 1, 12, 3, 2.75, 0.56, 0.61, ['#667075', '#47535b'], 0.19);
  }
  function gable(x: number, z: number, w: number, d: number, h: number, across: boolean) {
    const pt = (u: number, y: number, v: number) => [x + (across ? v : u), y, z + (across ? u : v)];
    for (const sign of [-1, 1]) {
      body.quad(
        pt((sign * w) / 2, 12.65, -d / 2),
        pt(0, h, -d / 2),
        pt(0, h, d / 2),
        pt((sign * w) / 2, 12.65, d / 2),
        slate,
      );
      body.tri(
        pt(-w / 2, 12.65, (sign * d) / 2),
        pt(w / 2, 12.65, (sign * d) / 2),
        pt(0, h, (sign * d) / 2),
        brick,
      );
    }
  }
  gable(-1, -12, 14, 28, 19, false);
  gable(-2, -1, 17, 31, 18.7, true);
  const x = -1,
    z = 5,
    w = 8.2;
  body.box(w, 15, w, x, 20, z, brick);
  for (const y of [17.2, 23.1, 26.5, 27.4]) body.box(w + 0.42, 0.32, w + 0.42, x, y, z, trim);
  for (const sign of [-1, 1])
    for (const offset of [-1.5, 0, 1.5]) {
      body.box(1.1, 3, 0.12, x + offset, 21.5, z + sign * 4.14, '#49545a');
      body.box(0.12, 3, 1.1, x + sign * 4.14, 21.5, z + offset, '#49545a');
    }
  const square: P2[] = [
    [-4.5, -4.5],
    [4.5, -4.5],
    [4.5, 4.5],
    [-4.5, 4.5],
  ];
  for (let i = 0; i < 4; i++) {
    const [u, v] = square[i],
      [a, b] = square[(i + 1) % 4];
    body.tri([x + u, 27.6, z + v], [x, 38, z], [x + a, 27.6, z + b], '#637675');
    body.box(0.5, 1.4, 0.5, x + u * 0.88, 27.8, z + v * 0.88, trim);
  }
  body.box(0.17, 1.6, 0.17, x, 38.6, z, '#bf9c57');
  // Brick gablets break the base of the pyramidal cap on all four faces.
  for (const sign of [-1, 1]) {
    body.tri([x - 2.5, 27.7, z + sign * 4.48], [x, 31, z + sign * 4.48], [x + 2.5, 27.7, z + sign * 4.48], brick);
    body.tri([x + sign * 4.48, 27.7, z - 2.5], [x + sign * 4.48, 31, z], [x + sign * 4.48, 27.7, z + 2.5], brick);
  }
  for (let i = 0; i < 5; i++) body.box(4.5, 0.28 * (5 - i), 0.55, x, 0.14 * (5 - i), 12 + i * 0.55, '#b4a99a');
  body.box(2.5, 3.6, 0.25, x, 3, 12.05, '#483b32');
  // Four five-foot TECH signs in block lettering, around the tower below its spire.
  const letters = ['11110100010001000100', '11111000111010001111', '11111000100010001111', '10011001111110011001'];
  for (let side = 0; side < 4; side++)
    for (let k = 0; k < 4; k++)
      for (let i = 0; i < 20; i++) {
        if (letters[k][i] !== '1') continue;
        const u = (k - 1.5) * 1.62 + ((i % 4) - 1.5) * 0.31,
          y = 28.65 - Math.floor(i / 4) * 0.31;
        const sign = side < 2 ? 1 : -1;
        lights.box(
          side % 2 ? 0.12 : 0.32,
          0.32,
          side % 2 ? 0.32 : 0.12,
          x + (side % 2 ? sign * 4.65 : u * sign),
          y,
          z + (side % 2 ? -u * sign : sign * 4.65),
          '#ffeac6',
        );
      }
}

function stands(s: Shell, west: boolean, fieldY: number) {
  const { body, lights } = s;
  // A pair of parallel seating edges can also fan around the north-west corner.
  function tier(frontA: P2, frontB: P2, backA: P2, backB: P2, low: number, high: number, rows: number) {
    const at = (a: P2, b: P2, t: number, y: number) => [a[0] + (b[0] - a[0]) * t, y, a[1] + (b[1] - a[1]) * t];
    for (let i = 0; i < rows; i++) {
      const t = i / rows,
        n = (i + 1) / rows,
        y = low + (high - low) * t,
        top = low + (high - low) * n;
      const a = at(frontA, backA, t, y),
        b = at(frontB, backB, t, y),
        c = at(frontB, backB, n, y),
        d = at(frontA, backA, n, y);
      body.quad(a, b, c, d, '#c7c5bb');
      body.quad(d, c, at(frontB, backB, n, top), at(frontA, backA, n, top), '#898d8d');
      for (const [p, q] of [
        [a, d],
        [b, c],
      ])
        body.quad(p, q, [q[0], s.base, q[2]], [p[0], s.base, p[2]], '#aaa89c');
    }
    // Aisles divide the banks of bleachers and lead to dark concourse portals.
    const sections = Math.max(2, Math.round(Math.hypot(backB[0] - backA[0], backB[1] - backA[1]) / 15));
    for (let j = 1; j < sections; j++) {
      const start = at(frontA, frontB, j / sections, low + 0.12),
        end = at(backA, backB, j / sections, high + 0.12);
      const dx = backB[0] - backA[0],
        dz = backB[1] - backA[1],
        len = Math.hypot(dx, dz);
      const edge = (p: number[], sign: number) => [
        p[0] + (sign * 0.85 * dx) / len,
        p[1],
        p[2] + (sign * 0.85 * dz) / len,
      ];
      body.quad(edge(start, -1), edge(start, 1), edge(end, 1), edge(end, -1), '#e2d9b6');
      const t = 0.54;
      body.box(
        Math.abs(dx / len) * 2.9 + 1,
        1.7,
        Math.abs(dz / len) * 2.9 + 1,
        start[0] * (1 - t) + end[0] * t,
        low + (high - low) * t,
        start[2] * (1 - t) + end[2] * t,
        '#484e4e',
      );
    }
    body.quad(
      at(frontA, backA, 1, high),
      at(frontB, backB, 1, high),
      at(frontB, backB, 1, s.base),
      at(frontA, backA, 1, s.base),
      '#a6a294',
    );
  }
  if (west) {
    tier([-35, -62], [-35, 62], [-61, -63], [-61, 63], 2, 14, 22);
    tier([-58, -63], [-58, 63], [-87, -65], [-87, 66], 15, 34, 23);
    body.box(5.2, 5.1, 50, -84, 35, -2, '#ddd4bf');
    lights.box(0.25, 2.4, 48, -81.3, 35, -2, '#74818a');
  } else {
    tier([35, 54], [35, -58], [71, 62], [71, -59], 2, 20, 30);
    tier([-29, -60], [28, -60], [-46, -125], [25, -125], 2, 33, 34);
    tier([-39, -68], [-30, -64], [-79, -105], [-46, -125], 5, 31, 28);
    tier([-30, 59], [30, 59], [-34, 75], [35, 75], 1.8, 8.6, 12);
    body.box(31, 9, 1.3, 0, 15, 73, '#253237');
    for (const u of [-12, 12]) body.box(0.9, 9, 0.9, u, 5.2, 73, '#7c7c72');
    const turf = '#477249',
      chalk = '#eee9d7',
      paintY = fieldY + 0.04;
    body.box(49, 0.24, 109.8, 0, fieldY - 0.12, 0, turf);
    for (let stripe = -5; stripe <= 5; stripe++) body.box(48.8, 0.04, 0.16, 0, paintY, stripe * 9.144, chalk);
    for (let yard = -49; yard <= 49; yard++) {
      for (const u of [-6.1, 6.1]) body.box(0.72, 0.04, 0.13, u, paintY, yard * 0.9144, chalk);
    }
    for (const sign of [-1, 1]) {
      body.box(0.18, 0.04, 109.8, sign * 24.2, paintY, 0, chalk);
      body.box(48.7, 0.05, 9.1, 0, paintY, sign * 50.27, '#a49461');
      body.box(0.21, 3.05, 0.21, 0, fieldY + 1.525, sign * 55, '#d7b760');
      body.box(5.64, 0.15, 0.15, 0, fieldY + 3.05, sign * 55, '#d7b760');
      for (const u of [-2.82, 2.82]) body.box(0.13, 5, 0.13, u, fieldY + 5.5, sign * 55, '#d7b760');
    }
  }
  for (const v of [-54, 0, 54]) {
    const x = west ? -85 : 70,
      y = west ? 34 : 20;
    body.box(0.45, 7, 0.45, x, y + 3.5, v, '#818681');
    lights.box(1, 1.2, 5.6, x, y + 7, v, '#c9d6dc');
  }
}

export function createTechLandmark(
  buildings: VBuilding[],
  site: VBuilding,
  base: number | null,
  groundAt: (x: number, z: number) => number | null,
) {
  const f = Object.values(sites).find((f) => f.id === site.id);
  if (!f || base === null || site.rings.length !== 1) return null;
  const [x, z] = f.origin,
    grade = groundAt(x, z);
  if (grade === null) return null;
  const shell = localLandmarkShell(
    buildings,
    site,
    f.name,
    [x, z],
    [1, 0],
    f.probes.map(([a, b]) => [a, b]),
    base - grade - 0.3,
    grade,
  );
  if (!shell) return null;
  if (f === sites.tower) tower(shell);
  else {
    // Keep a level playing surface above the highest terrain triangle within the turf.
    let top = grade;
    for (let u = -25; u <= 25; u += 5)
      for (let v = -55; v <= 55; v += 5) {
        const y = groundAt(x + u, z + v);
        if (y === null) return null;
        top = Math.max(top, y);
      }
    stands(shell, f === sites.west, top - grade + 0.1);
  }
  return shell.finish(f === sites.tower ? '#ffd9a3' : '#e5e8e1', 0.8);
}
