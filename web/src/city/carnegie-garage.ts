import { surfaces } from '../materials';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const carnegieGarageId = '5dd0ec77-d3b8-4168-b01a-9de821a6ee60';

// 150 Carnegie Way NW. u follows Carnegie toward the library, v points into the deck.
// The Southern Exchange approach photos show rounded slot ends and a recessed motor entrance.
// The mapped crossing over the street is a separate building (6a08f0c0).
export function createCarnegieGarage(buildings: VBuilding[], grid: GroundGrid) {
  const shell = landmarkShell(
    buildings,
    grid,
    carnegieGarageId,
    '150 Carnegie Way',
    [244, -482],
    [0.652, 0.758],
    [
      [0, 0],
      [-24, -24],
      [24, 24],
    ],
  );
  if (!shell) return null;
  const concrete = surfaces.concrete();
  const buff = '#bba895';
  const interior = '#403c38';
  // NAVD88 elevations from April 2019 lidar. The outer roof lanes rise toward the
  // library while the middle lane descends and reconnects at the southeast end.
  const plan: P2[] = [...shell.ring];
  if (
    plan.reduce((area, [u, v], i) => {
      const [x, z] = plan[(i + 1) % plan.length];
      return area + u * z - x * v;
    }, 0) < 0
  )
    plan.reverse();
  const lintel = 323.7;
  shell.prism(plan, lintel, 342.5, buff, '#948e84', { wall: concrete });
  const { body } = shell;
  function lane(left: number, right: number, front: number, back: number, start: number, end: number) {
    const a = [left, start, front],
      b = [right, end, front],
      c = [right, end, back],
      d = [left, start, back];
    body.quad(a, d, c, b, '#a8a298');
    for (const [p, q] of [
      ...(front === -30 || front === 18 ? [[a, b]] : []),
      ...(right === 30 ? [[b, c]] : []),
      ...(back === 30 || back === -13 ? [[c, d]] : []),
      ...(left === -30 ? [[d, a]] : []),
    ]) {
      body.quad([p[0], 342.5, p[2]], p, q, [q[0], 342.5, q[2]], buff);
    }
  }
  lane(-30, 20, -30, -13, 344.35, 345.9);
  lane(-30, 20, -13, 18, 344.35, 342.7);
  lane(-30, 20, 18, 30, 344.35, 345.9);
  lane(20, 30, -30, 30, 345.9, 345.9);
  body.quad([20, 342.7, -13], [20, 345.9, -13], [20, 345.9, 18], [20, 342.7, 18], buff);
  shell.prism(
    [
      [-24, -29],
      [-13, -29],
      [-13, -24],
      [-24, -24],
    ],
    344.3,
    352.4,
    buff,
    '#9b938a',
    { wall: concrete },
  );

  for (let i = 0; i < plan.length; i++) {
    const a = plan[i],
      b = plan[(i + 1) % plan.length];
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      length = Math.hypot(dx, dz);
    const carnegieFace = Math.max(a[1], b[1]) < -28;
    // Split the street-level wall at the motor entrance, including when the
    // footprint supplier splits its straight frontage into several short edges.
    const breaks = [0, 1];
    if (carnegieFace) {
      for (const u of [-21.5, -14.5]) {
        const t = (u - a[0]) / dx;
        if (t > 0 && t < 1) breaks.push(t);
      }
    }
    breaks.sort((first, second) => first - second);
    for (let j = 1; j < breaks.length; j++) {
      const lo = breaks[j - 1],
        hi = breaks[j];
      const mid = a[0] + (dx * (lo + hi)) / 2;
      if (carnegieFace && mid > -21.5 && mid < -14.5) continue;
      const corner = (t: number, y: number) => [a[0] + dx * t, y, a[1] + dz * t];
      shell.paint(concrete, () =>
        body.quad(
          corner(lo, shell.base),
          corner(lo, lintel),
          corner(hi, lintel),
          corner(hi, shell.base),
          buff,
        ),
      );
    }
    const bays = Math.round(length / (carnegieFace ? 7.4 : 12.5));
    if (!bays) continue;
    const at = (t: number, h: number, offset = 0.08) => [
      a[0] + dx * t + (dz / length) * offset,
      h,
      a[1] + dz * t - (dx / length) * offset,
    ];
    for (let bay = 0; bay < bays; bay++) {
      const left = (bay + 0.08) / bays,
        right = (bay + 0.92) / bays;
      for (let level = 0; level < 7; level++) {
        const u = a[0] + (dx * (left + right)) / 2;
        if (!level && carnegieFace && u > -25 && u < -11) continue;
        const bottom = 321.1 + 3.1 * level,
          top = bottom + 1.95,
          bevel = 0.5 / length;
        const shoulder = carnegieFace ? top - 0.48 : top;
        shell.body.quad(
          at(left, bottom),
          at(left, shoulder),
          at(right, shoulder),
          at(right, bottom),
          interior,
        );
        if (carnegieFace)
          shell.body.quad(
            at(left, top - 0.48),
            at(left + bevel, top),
            at(right - bevel, top),
            at(right, top - 0.48),
            interior,
          );
        if ((bay + level) % 5 === 0) {
          shell.lights.quad(
            at(left + bevel, top - 0.25, 0.13),
            at(left + bevel, top - 0.12, 0.13),
            at(right - bevel, top - 0.12, 0.13),
            at(right - bevel, top - 0.25, 0.13),
            '#938876',
          );
        }
      }
    }
  }
  // Several nearly collinear Overture edges meet at the landing. Draw the
  // entrance in metres along the whole frontage so it survives that split.
  const frontage = -31.37;
  function panel(left: number, right: number, bottom: number, top: number, colour: string) {
    body.quad(
      [left, bottom, frontage],
      [left, top, frontage],
      [right, top, frontage],
      [right, bottom, frontage],
      colour,
    );
  }
  const portal = [
    [-21.5, -31.2],
    [-21.5, -27],
    [-14.5, -27],
    [-14.5, -31.2],
  ];
  for (let i = 1; i < portal.length; i++) {
    const [x, z] = portal[i - 1],
      [u, v] = portal[i];
    body.quad([x, shell.base, z], [x, lintel, z], [u, lintel, v], [u, shell.base, v], interior);
  }
  body.quad(
    [-21.5, lintel, -31.2],
    [-14.5, lintel, -31.2],
    [-14.5, lintel, -27],
    [-21.5, lintel, -27],
    interior,
  );
  panel(-25, -20, 324, 326.7, '#787a76');
  return shell.finish('#eadcc4', 0.42);
}
