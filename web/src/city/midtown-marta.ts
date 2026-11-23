import { ShapeUtils, Vector2 } from 'three';
import { type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';
import plazas from './fixtures/midtown-marta.json';

type Ground = (x: number, z: number) => number | null;
type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// The mapped plaza follows sloping terrain. Subdivide long faces before sampling the
// rendered triangles so a single level floor cannot bridge the North Avenue grade.
function paving(shell: Shell, ring: number[][], ground: Ground) {
  const midpoint = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  function face(a: number[], b: number[], c: number[]) {
    if (
      Math.max(
        Math.hypot(a[0] - b[0], a[1] - b[1]),
        Math.hypot(c[0] - a[0], c[1] - a[1]),
        Math.hypot(b[0] - c[0], b[1] - c[1]),
      ) > 5
    ) {
      const ab = midpoint(a, b),
        bc = midpoint(b, c),
        ca = midpoint(c, a);
      face(a, ab, ca);
      face(ab, b, bc);
      face(ca, bc, c);
      face(ab, bc, ca);
      return;
    }
    const points = [a, b, c].map(([x, z]) => [x, (ground(x, z) ?? NaN) + 0.09, z]);
    if (points.every((p) => Number.isFinite(p[1]))) shell.body.tri(points[0], points[2], points[1], '#bcaa97');
  }
  for (const [a, b, c] of ShapeUtils.triangulateShape(
    ring.map(([x, z]) => new Vector2(x, z)),
    [],
  ))
    face(ring[a], ring[b], ring[c]);
}

export function createMidtownMarta(buildings: VBuilding[], site: VBuilding, ground: Ground) {
  if (site.id !== 'osm:way:234939895' || site.rings.length !== 1) return null;
  const grade = ground(419, -1963);
  if (grade === null) return null;
  const shell = localLandmarkShell(
    buildings,
    site,
    'North Avenue station',
    [0, 0],
    [1, 0],
    [
      [419, -1963],
      [420, -1989],
    ],
    0,
    0,
  );
  if (!shell) return null;
  const { body, lights, prism } = shell;
  const roof = grade + 4.65,
    concrete = '#c4bdb1';
  prism(shell.ring, roof - 1.0, roof, concrete, '#c1bbb0');
  // Skewed end faces follow the diagonal cuts of the real street canopy. Keep
  // the approach open between the solid cheek and the inner stair enclosure.
  const wall = (a: P2, b: P2, width: number) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    const nx = (-dz * width) / len,
      nz = (dx * width) / len;
    const lo = Math.min(ground(...a) ?? grade, ground(...b) ?? grade) - 0.4;
    prism([a, b, [b[0] + nx, b[1] + nz], [a[0] + nx, a[1] + nz]], lo, roof - 0.95, concrete, concrete);
  };
  wall([409.6, -1949], [412, -1994], 0.65);
  wall([423.1, -1961], [423.9, -1973], 0.7);
  wall([417.4, -1979], [418.3, -1993], 0.6);
  // Two rows of shallow glazed pyramids recede behind the concrete fascia.
  for (let bay = 0; bay < 6; bay++)
    for (let col = 0; col < 2; col++) {
      const x = 413.7 + col * 6.5 + bay * 0.42,
        z = -1955.5 - col * 5.5 - bay * 6.8;
      const apex = [x, roof + 1.45, z],
        corners = [
          [x - 2.75, roof, z - 0.65],
          [x + 2.75, roof, z - 5.15],
          [x + 2.75, roof, z + 0.65],
          [x - 2.75, roof, z + 5.15],
        ];
      corners.forEach((p, i) => {
        const glazing = bay % 3 === 1 && i === 2 ? lights : body;
        glazing.tri(p, corners[(i + 1) % 4], apex, i % 2 ? '#a8c1bd' : '#839c9a');
      });
      lights.box(0.7, 0.14, 0.35, x, roof - 1.04, z, '#fff2d3');
    }
  paving(shell, plazas['1283692950'], ground);
  for (const [x, z] of [
    [405, -1974],
    [407, -1990],
    [410, -2011],
    [421, -2024],
  ]) {
    const y = ground(x, z);
    if (y === null) continue;
    body.box(3.6, 0.72, 3.6, x, y + 0.38, z, '#966859');
    body.box(3.3, 0.12, 3.3, x, y + 0.8, z, '#65674a');
  }
  // Tower Square's public entrances occupy three faces of its existing building.
  // Each dark glazed pair is drawn just outside the mapped exterior at local grade.
  for (const [x, z, dx, dz] of [
    [411.63, -2175.05, -0.078, 0.997],
    [442.37, -2200.22, -0.997, -0.078],
    [450.61, -2143.23, 0.997, 0.078],
  ]) {
    const y = ground(x, z);
    if (y === null) continue;
    const pt = (u: number, h: number, out: number) => [x + dx * u - dz * out, y + h, z + dz * u + dx * out];
    body.quad(pt(-2.3, 0, 0.23), pt(-2.3, 3, 0.23), pt(2.3, 3, 0.23), pt(2.3, 0, 0.23), '#34474f');
    lights.quad(pt(-2.4, 2.8, 0.28), pt(-2.4, 3.2, 0.28), pt(2.4, 3.2, 0.28), pt(2.4, 2.8, 0.28), '#9eb9be');
    body.quad(pt(-0.08, 0, 0.28), pt(-0.08, 2.8, 0.28), pt(0.08, 2.8, 0.28), pt(0.08, 0, 0.28), '#aaabad');
  }
  // The performance plaza meets the diagonal end of the skylit canopy.
  const palette = ['#4abcc8', '#049da5', '#df426b', '#ff9b45', '#efc844', '#9c336a'];
  for (let i = 0; i < 12; i++) {
    const stripe = (t: number, h: number) => [411.9 + 14.55 * t, roof + h, -1994.45 - 12.42 * t];
    body.quad(
      stripe(i / 12, -0.98),
      stripe(i / 12, 0),
      stripe((i + 1) / 12, 0),
      stripe((i + 1) / 12, -0.98),
      palette[i % palette.length],
    );
  }
  const stageY = ground(413, -2032);
  if (stageY !== null) {
    body.box(11.8, 0.5, 2.6, 413, stageY + 0.3, -2032, '#71596d');
    body.box(11.8, 2.6, 0.15, 413, stageY + 1.65, -2033.2, '#359da6');
    body.box(11.9, 0.2, 2.7, 413, stageY + 3, -2032, '#ecb857');
    for (const x of [407.2, 418.8]) body.box(0.16, 2.6, 2.6, x, stageY + 1.65, -2032, '#c74868');
  }
  const signY = ground(405, -1953);
  if (signY !== null) {
    body.box(1.05, 4.5, 0.38, 405, signY + 2.25, -1953, '#344755');
    lights.box(1.06, 0.6, 0.4, 405, signY + 4.1, -1953, '#cee2e5');
  }
  return shell.finish('#fff1d5', 0.8);
}
