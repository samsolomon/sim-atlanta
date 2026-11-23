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
  if (site.id === 'osm:way:235006952' || site.id === 'osm:way:235006968')
    return midtownEntrance(buildings, site, ground);
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

// Midtown's principal pavilion is archived as a station way, and therefore
// omitted by the row's generic building extractor. Its two 10th Street stair
// houses are ordinary building ways. Attach the pavilion once with the east stair.
function midtownEntrance(buildings: VBuilding[], site: VBuilding, ground: Ground) {
  const east = site.id === 'osm:way:235006952';
  const cx = east ? 499.5 : 468;
  const shell = localLandmarkShell(
    buildings,
    site,
    'Midtown station ' + (east ? 'east' : 'west') + ' entrance',
    [0, 0],
    [1, 0],
    [[cx, -3085]],
    0,
    0,
  );
  const y = ground(cx, -3085);
  if (!shell || y === null) return null;
  const { body, lights, prism } = shell;
  prism(shell.ring, y + 2.97, y + 3.55, '#c8c0ac', '#cfcbba');
  for (const z of [-3088, -3081.8]) {
    body.box(10, 3, 0.32, cx, y + 1.5, z, '#b1ab9b');
    lights.box(8, 0.18, 0.36, cx, y + 2.72, z, '#efead2');
  }
  body.box(4.3, 1.65, 0.3, cx + 1, y + 0.86, -3085, '#777e79');
  if (east) {
    const ring = plazas['230593407'] as P2[];
    const grades = ring.map(([x, z]) => ground(x, z));
    if (grades.every((g): g is number => g !== null)) {
      const soffit = Math.max(...grades) + 4.35;
      // Cast coffered slab, with the exposed transverse ribs continuing across
      // the open passenger approaches on Peachtree Place and 10th Street.
      body.box(64, 0.65, 36, 477.8, soffit + 0.35, -3026.2, '#c5c0ae');
      for (let i = 0; i < 17; i++) body.box(1.15, 1.35, 43.2, 445.8 + i * 4, soffit - 0.15, -3026.2, '#ccc5b3');
      for (let i = 0; i < 10; i++) body.box(66.1, 0.85, 0.79, 477.8, soffit - 0.58, -3045.2 + i * 4.2, '#a9a392');
      for (const z of [-3043, -3009])
        for (const x of [449, 478, 505]) {
          const base = ground(x, z);
          if (base === null) continue;
          body.box(3.6, soffit - base, 3, x, (base + soffit) / 2, z, '#92937d');
          // Abstract foliage colors recall the artist's Dogwood and Magnolia piers.
          for (let k = 0; k < 6; k++)
            body.box(
              0.54,
              1.35,
              0.12,
              x - 1.35 + k * 0.54,
              base + 2 + (k % 2) * 0.6,
              z + 1.53,
              ['#628d69', '#c87971', '#47998b'][k % 3],
            );
          lights.box(1, 0.2, 1, x + 3.2, soffit - 0.94, z, '#fff1d7');
        }
      const lobby = ground(478, -3026);
      if (lobby !== null) body.box(20, soffit - lobby, 12, 478, (soffit + lobby) / 2, -3026, '#566563');
      for (const id of ['1283640597', '1283640598'] as const) paving(shell, plazas[id], ground);
      for (const z of [-3053, -2999])
        for (const x of [452, 468, 493, 504]) {
          const base = ground(x, z);
          if (base === null) continue;
          body.box(4, 0.28, 1.3, x, base + 0.25, z, '#7d9669');
          body.box(2.8, 0.3, 0.58, x, base + 0.47, z + 1.5, '#936d52');
        }
    }
  }
  return shell.finish('#ffefd4', 0.72);
}
