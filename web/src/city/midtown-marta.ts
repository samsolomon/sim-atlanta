import { DoubleSide, Mesh, MeshBasicMaterial, ShapeUtils, Vector2 } from 'three';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';
import plazas from './fixtures/midtown-marta.json';
import { createElectricSaturation, ELECTRIC_SATURATION_ID } from './midtown-marta-vents';

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
  if (site.id === ELECTRIC_SATURATION_ID) return createElectricSaturation(buildings, site, ground);
  if (site.id === 'osm:way:269637571') return artsBusCanopy(buildings, site, ground);
  if (site.id === 'osm:way:269637886') return artsCenter(buildings, site, ground);
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
      // Backlit entrance headers sit below the coffer edge, visible from each plaza.
      for (const z of [-3046.7, -3005.6]) {
        const base = ground(482, z);
        if (base === null) continue;
        const sign = base + 2.95;
        for (const x of [477.5, 486.5]) body.box(0.36, 3.2, 0.48, x, base + 1.6, z, '#b3b2a3');
        body.box(9.4, 0.54, 0.48, 482, sign, z, '#52616a');
        lights.box(8.8, 0.26, 0.51, 482, sign + 0.04, z, '#d9e6df');
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

function artsCenter(buildings: VBuilding[], site: VBuilding, ground: Ground) {
  const shell = localLandmarkShell(
    buildings,
    site,
    'Arts Center station',
    [0, 0],
    [1, 0],
    [
      [427, -3910],
      [420, -3950],
    ],
    0,
    0,
  );
  if (!shell) return null;
  const { body, lights, prism } = shell;
  // This long western slope serves the bus loop at its lower level. The entrance
  // projecting east meets the higher Arts Center Way plaza.
  const entry = ground(450, -3931);
  if (entry === null) return null;
  // Paved boarding areas below the canopies rest on the same ground mesh as buses.
  paving(shell, shell.ring, ground);
  const soffit = entry + 3.6;
  prism(shell.ring, soffit, soffit + 0.96, '#c7bcaa', '#bdb5a9');
  for (let i = 0; i < 10; i++) {
    const z = -3894 - i * 10.5,
      x = 430.4 - i * 1.68;
    for (const side of [-6.1, 5.1]) {
      const base = ground(x + side, z);
      if (base === null) continue;
      body.box(1.2, soffit - base, 1.4, x + side, (base + soffit) / 2, z, '#a6a197');
      lights.box(0.66, 0.16, 1.1, x + side + 1.4, soffit - 0.12, z, '#f0edd9');
    }
  }
  // The projecting east entrance meets the mezzanine, above the bus-level bays.
  const wing: P2[] = [
    [430.8, -3920.8],
    [452.61, -3924.42],
    [450.38, -3938.14],
    [428.5, -3934.5],
  ];
  prism(wing, entry - 0.65, entry + 0.08, '#ada69b', '#bcaf98');
  for (const [x, z] of [
    [451.3, -3925.8],
    [449.5, -3936.6],
  ])
    body.box(0.7, 3.8, 0.8, x, entry + 1.8, z, '#c6bdab');
  const lobby: P2[] = [
    [425, -3910],
    [433, -3911.25],
    [426.8, -3951.25],
    [418.8, -3950],
  ];
  prism(lobby, entry - 0.65, entry + 0.08, '#bcb1a1', '#bcb1a1');
  prism(lobby, entry + 0.08, soffit - 0.12, '#55676b', '#92938a');
  for (let bay = 0; bay < 9; bay++) {
    const z = -3911.3 - bay * 4.6,
      x = 433 - bay * 0.71;
    body.box(0.28, 3.45, 0.2, x, entry + 1.82, z, '#a9aaa1');
  }
  for (let j = 0; j < 6; j++) body.box(0.8, 0.12, 0.48, 448.6 + j * 0.26, soffit - 0.12, -3935 + j * 1.8, '#efecd2');
  // Passenger wayfinding pylon and low railing at the upper-level entrance.
  const pylon = ground(461, -3930);
  if (pylon !== null) {
    body.box(0.85, 4.1, 0.42, 461, pylon + 2.05, -3930, '#465462');
    lights.box(0.88, 0.5, 0.44, 461, pylon + 3.8, -3930, '#d0e4e1');
  }
  paving(shell, plazas['1035248909'], ground);
  // Tiered seating and geometric color panels face the pedestrian approach.
  for (let i = 0; i < 3; i++) {
    const x = 453.4 + i * 1.35,
      z = -3930,
      base = ground(x, z);
    if (base === null) continue;
    const h = 0.4 * (3 - i);
    body.box(1.35, h, 10, x, base + h / 2, z, '#7f9d4a');
    lights.box(0.14, 0.19, 9.95, x + 0.68, base + h - 0.11, z, '#e7edb7');
  }
  const palette = ['#2d85ab', '#f2bc49', '#cb6753', '#efdbac', '#4aa8a4'];
  const mural = new Builder();
  const art = (u: number, h: number) => [451.2 + (u - 5.1) * 0.16, entry + 0.9 + h, -3936 + u];
  for (let i = 0; i < 6; i++) {
    const l = i * 1.7,
      r = l + 1.7,
      top = 2.45;
    mural.tri(art(l, 0), art(r, top), art(r, 0), palette[i % palette.length]);
    mural.tri(art(l, 0), art(l, top), art(r, top), palette[(i + 2) % palette.length]);
  }
  const result = shell.finish('#f7ebcd', 0.85);
  const material = new MeshBasicMaterial({ vertexColors: true, side: DoubleSide });
  result.group.add(new Mesh(mural.geometry(), material));
  return {
    ...result,
    setNight(night: number) {
      result.setNight(night);
      material.color.setScalar(1 - 0.22 * night);
    },
  };
}

function artsBusCanopy(buildings: VBuilding[], site: VBuilding, ground: Ground) {
  const shell = localLandmarkShell(
    buildings,
    site,
    'Arts Center bus canopy',
    [0, 0],
    [1, 0],
    [
      [391, -3920],
      [384, -3980],
    ],
    0,
    0,
  );
  if (!shell) return null;
  const grades = shell.ring.map(([x, z]) => ground(x, z));
  if (!grades.every((y): y is number => y !== null)) return null;
  paving(shell, shell.ring, ground);
  const soffit = Math.max(...grades) + 4.2;
  shell.prism(shell.ring, soffit, soffit + 0.68, '#b5ac9b', '#b8b2a4');
  for (let bay = 0; bay < 11; bay++) {
    const z = -3880 - bay * 10.5,
      x = 401 - bay * 1.66;
    const base = ground(x, z);
    if (base === null) continue;
    shell.body.box(1.25, soffit - base, 1.3, x, (base + soffit) / 2, z, '#a89f91');
    shell.body.box(12, 0.42, 0.7, x, soffit - 0.19, z, '#aca699');
    shell.lights.box(1.5, 0.13, 0.5, x + 3, soffit - 0.48, z, '#f1e9ce');
  }
  return shell.finish('#f5e8cb', 0.72);
}
