import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshLambertMaterial,
  ShapeUtils,
  SRGBColorSpace,
  Vector2,
} from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
type Height = (x: number, z: number) => number;
const nickel = '#bfcbd0',
  steel = '#9faeb6',
  navy = '#254975';
const rect = (x: number, z: number, X: number, Z: number): P2[] => [
  [x, z],
  [X, z],
  [X, Z],
  [x, Z],
];
const level =
  (y: number): Height =>
  () =>
    y;

// The main gallery roofs rise toward the north. Their skylights sit on the same sloping planes.
function roofPlate(m: Shell, ring: P2[], lo: number, height: Height, wall: string | null, top: string, subdivisions = 1) {
  const point = ([x, z]: P2) => [x, height(x, z), z];
  function triangle(a: P2, b: P2, c: P2, steps: number) {
    if (steps === 1) {
      m.body.tri(point(a), point(c), point(b), top);
      return;
    }
    const mid = ([x, z]: P2, [X, Z]: P2): P2 => [(x + X) / 2, (z + Z) / 2];
    const ab = mid(a, b),
      bc = mid(b, c),
      ca = mid(c, a);
    triangle(a, ab, ca, steps / 2);
    triangle(ab, b, bc, steps / 2);
    triangle(ca, bc, c, steps / 2);
    triangle(ab, bc, ca, steps / 2);
  }
  for (const [a, b, c] of ShapeUtils.triangulateShape(
    ring.map(([x, z]) => new Vector2(x, z)),
    [],
  ))
    triangle(ring[a], ring[b], ring[c], subdivisions);
  if (wall)
    ring.forEach(([x, z], i) => {
      const [X, Z] = ring[(i + 1) % ring.length];
      for (let k = 0; k < subdivisions; k++) {
        const p = (j: number): P2 => [x + ((X - x) * j) / subdivisions, z + ((Z - z) * j) / subdivisions];
        const a = p(k),
          b = p(k + 1);
        m.body.quad([a[0], lo, a[1]], point(a), point(b), [b[0], lo, b[1]], wall);
      }
    });
}

function skylight(
  m: Shell,
  origin: P2,
  width: number,
  length: number,
  angle: number,
  height: Height,
  cols: number,
  rows: number,
) {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  function panel(u: number, v: number, U: number, V: number, rise: number, color: string) {
    const at = (a: number, b: number) => {
      const x = origin[0] + a * c - b * s,
        z = origin[1] + a * s + b * c;
      return [x, height(x, z) + rise, z];
    };
    m.body.quad(at(u, v), at(u, V), at(U, V), at(U, v), color);
  }
  panel(0, 0, width, length, 0.38, steel);
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      panel(
        (i * width) / cols + 0.1,
        (j * length) / rows + 0.11,
        ((i + 1) * width) / cols - 0.1,
        ((j + 1) * length) / rows - 0.11,
        0.42,
        (i + 2 * j) % 3 === 0 ? '#65818a' : '#576f78',
      );
    }
}

function halls(m: Shell) {
  const outer = m.ring;
  // The northern service roof meets the independent garage in an L.
  const north: P2[] = [...outer.slice(3, 15), [74.7, 103.5], [125.6, 103.5], [128, 89.6], [128, 41]];
  roofPlate(m, north, m.base, level(318.05), '#b8b9b6', '#cfcbc3');
  const rear: P2[] = [[128, 41], outer[4], outer[3], outer[2], [196.6, 128.2], [179.1, 66.8], [128, 89.6]];
  roofPlate(m, rear, m.base, level(323.25), '#c3c6c4', '#d6d1c7');
  m.prism(rect(158.7, 24.5, 165.6, 42.2), m.base, 328.5, steel, nickel);
  const westHigh: P2[] = [...outer.slice(14, 21), [42.4, 157.4], [84.7, 157.4], [81.1, 112.9]];
  const high: Height = (_x, z) => 331.6 - (z - 113) * 0.019;
  roofPlate(m, westHigh, m.base, high, navy, '#d6d1c8');
  const broad: P2[] = [
    [74.7, 103.5],
    [125.6, 103.5],
    [124.9, 210.9],
    outer[22],
    outer[21],
    ...outer.slice(18, 21).reverse(),
    [35, 151],
    [44, 157],
    [84.7, 157.4],
    [81.1, 113.0],
    [74.7, 113.1],
  ];
  const barrel: Height = (x, z) => 324.3 - 0.00054 * (z - 113) ** 2 - 0.00034 * (x - 83) ** 2;
  roofPlate(m, broad, m.base, barrel, '#a2acaf', '#d8d4cd', 8);
  // Lower returns connect the broad roof to the lantern and to the new Baker street wing.
  m.prism(
    [
      [124.9, 165],
      [138, 192.6],
      [138.4, 194],
      [124.9, 212.4],
    ],
    m.base,
    317.86,
    '#a6aca7',
    '#c6c4b9',
  );
  m.prism([outer[22], [125, 209.8], [125.2, 213.1], [92.2, 217.5]], m.base, 317.94, '#9ca6a6', '#cacbc1');
  skylight(m, [99.2, 110.6], 13.6, 19.2, 0, barrel, 5, 7);
  for (let i = 0; i < 3; i++) skylight(m, [63.6 + 6.0 * i, 166.7 + 9.1 * i], 8.8, 8.5, 0, barrel, 3, 3);
  const mid: P2[] = [
    [125.6, 103.5],
    [128, 89.6],
    [177.2, 179.1],
    [137.3, 193.7],
    [125.0, 168.4],
  ];
  roofPlate(m, mid, m.base, level(322.12), '#acb0ac', '#cecac0');
  for (const [x, z, w, d] of [
    [139, 147, 5, 8],
    [144, 150, 4, 7],
    [147, 160, 10, 4],
    [146, 171, 14, 4],
    [153, 176, 8, 3],
    [134, 137, 5, 6],
    [100, 51, 12, 6],
  ]) {
    const y = z < 60 ? 318.05 : 322.12;
    m.prism(rect(x, z, x + w, z + d), y, y + 0.85, '#adb0a7', '#d9d7ca');
  }
  const east: P2[] = [[128, 89.6], [179.1, 66.8], outer[2], outer[1], [181, 186.6]];
  const wave: Height = (x, z) => 326.45 - 0.00062 * (z - 89) ** 2 - 0.00024 * (x - 140) ** 2;
  roofPlate(m, east, m.base, wave, '#a5b4ba', '#dfded6', 8);
  skylight(m, [155.3, 109.7], 15.3, 16.6, -0.4, wave, 5, 5);
  skylight(m, [164.4, 148.1], 18, 24.8, -0.4, wave, 5, 7);
  // A low circular lantern sits between the two roof runs.
  const circle: P2[] = Array.from({ length: 28 }, (_, i) => [
    137 + 7.5 * Math.cos((2 * Math.PI * i) / 28),
    125.7 + 8.4 * Math.sin((2 * Math.PI * i) / 28),
  ]);
  m.prism(circle, 322.12, 326.0, steel, '#759299');
  for (let j = 0; j < 5; j++) {
    const x = 134 + j * 1.5;
    m.body.box(0.09, 0.12, 13.3, x, 326.09, 125.7, nickel);
  }
  return barrel;
}

type Point = (t: number, y: number, offset?: number) => number[];
// Distance along each photographic elevation, with a positive offset toward the plaza or street.
function face(plan: P2[]): Point {
  const lengths = [0];
  for (let i = 1; i < plan.length; i++)
    lengths.push(lengths[i - 1] + Math.hypot(plan[i][0] - plan[i - 1][0], plan[i][1] - plan[i - 1][1]));
  return (t, y, offset = 0) => {
    const d = Math.max(0, Math.min(1, t)) * lengths[lengths.length - 1];
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < d) i++;
    const L = lengths[i] - lengths[i - 1],
      f = (d - lengths[i - 1]) / L,
      [x, z] = plan[i - 1],
      dx = plan[i][0] - x,
      dz = plan[i][1] - z;
    return [x + dx * f - (offset * dz) / L, y, z + dz * f + (offset * dx) / L];
  };
}

function band(
  m: Shell,
  p: Point,
  start: number,
  end: number,
  bottom: number | ((t: number) => number),
  top: number | ((t: number) => number),
  offset: number,
  color: string,
  lit = false,
) {
  const y = (h: number | ((t: number) => number), t: number) => (typeof h === 'number' ? h : h(t));
  const batch = lit ? m.lights : m.body,
    n = Math.max(1, Math.ceil((end - start) * 60));
  for (let i = 0; i < n; i++) {
    const a = start + ((end - start) * i) / n,
      b = start + ((end - start) * (i + 1)) / n;
    batch.quad(
      p(a, y(bottom, a), offset),
      p(a, y(top, a), offset),
      p(b, y(top, b), offset),
      p(b, y(bottom, b), offset),
      color,
    );
  }
}

function publicFront(m: Shell, grid: GroundGrid) {
  // The 2020 wing wraps the surviving high glass prow and carries its own lower blue bow.
  const curve: P2[] = [...m.ring.slice(34), m.ring[0], m.ring[1]];
  const entry = face(curve);
  const lip = (t: number) => 322.75 - 4.55 * t;
  const sill = (t: number) => 311.6 + 1.55 * Math.sin(t * Math.PI);
  const slope = (t: number, y: number) => Math.max(0, (y - 311.6) / 12) * (1.2 + 1.55 * (1 - t));
  const bow: Point = (t, y, d = 0) => entry(t, y, slope(t, y) + d);
  const back: P2[] = [
    [174, 178],
    [137, 193.7],
    [125, 210.8],
    [93.4, 214.3],
  ];
  const basePlan = m.ring.slice(23, 35),
    roof = m.ring.slice(23, 35);
  const inset = (t: number) => -2.3 * Math.min(1, t * 10, (1 - t) * 10);
  const lobby: Point = (t, y, d = 0) => entry(t, y, inset(t) + d);
  for (let i = 0; i <= 60; i++) {
    const t = i / 60,
      [x, , z] = bow(t, lip(t)),
      [u, , v] = lobby(t, 311.6);
    roof.push([x, z]);
    basePlan.push([u, v]);
  }
  m.prism([...basePlan, ...back], m.base, 311.6, '#909a9e', '#b1b6b7');
  const openEdgeStart = m.ring.slice(23, 35).length;
  const openEdgeEnd = roof.length - 1;
  roof.push(...back);
  const cap: Height = (_x, z) => 318.32 + Math.max(0, Math.min(1, (z - 171.6) / 60.8)) * 4.43;
  roofPlate(m, roof, 311.6, cap, null, '#e0e0d8');
  roof.forEach(([x, z], i) => {
    if (i >= openEdgeStart && i < openEdgeEnd) return;
    const [X, Z] = roof[(i + 1) % roof.length];
    m.body.quad([x, 311.6, z], [x, cap(x, z), z], [X, cap(X, Z), Z], [X, 311.6, Z], '#b3bfca');
  });
  // Exposed soffit and fascia surround the recessed glass doors.
  for (let i = 0; i < 60; i++) {
    const a = i / 60,
      b = (i + 1) / 60;
    m.body.quad(bow(a, sill(a)), bow(b, sill(b)), lobby(b, 311.6), lobby(a, 311.6), nickel);
  }

  // Match the coping plane to the facade, including the small forward cant at the tip.
  for (let i = 0; i < 60; i++) {
    const a = i / 60,
      b = (i + 1) / 60,
      pa = bow(a, lip(a)),
      pb = bow(b, lip(b));
    m.body.quad([pa[0], cap(pa[0], pa[2]), pa[2]], pa, pb, [pb[0], cap(pb[0], pb[2]), pb[2]], nickel);
  }
  band(m, bow, 0, 1, sill, lip, 0.04, navy);
  band(m, bow, 0, 1, (t) => lip(t) - 0.55, lip, 0.14, nickel);
  band(m, bow, 0, 1, (t) => sill(t) - 0.55, sill, 0.14, nickel);
  const scallop = (t: number) => sill(t) + 0.95 + 3.15 * Math.sin((Math.PI * (t - 0.015)) / 0.49);
  band(m, bow, 0.015, 0.505, sill, scallop, 0.12, '#a8b7bc');
  // Broken highlights suggest the kinetic silver flappers without animating a wind field.
  for (let i = 1; i < 42; i++)
    for (let j = 0; j < 8; j++) {
      const t = 0.017 + i * 0.0114,
        y = sill(t) + 0.25 + j * 0.45;
      if (y + 0.23 < scallop(t))
        m.body.quad(
          bow(t, y, 0.16),
          bow(t, y + 0.23, 0.16),
          bow(t + 0.007, y + 0.23, 0.16),
          bow(t + 0.007, y, 0.16),
          (i + 3 * j) % 4 === 0 ? '#d4d9d6' : '#8e9fa5',
        );
    }
  band(m, bow, 0.57, 0.93, sill, (t) => sill(t) + 3.55, 0.16, '#638998');
  for (let i = 0; i <= 18; i++)
    band(m, bow, 0.57 + i * 0.0195, 0.572 + i * 0.0195, sill, (t) => sill(t) + 3.55, 0.18, nickel);
  band(
    m,
    bow,
    0.57,
    0.93,
    (t) => sill(t) + 1.7,
    (t) => sill(t) + 1.79,
    0.18,
    nickel,
  );
  band(m, lobby, 0.54, 0.97, 304.25, 310.85, 0.13, '#42616b');
  for (let i = 0; i < 15; i++) {
    const t = 0.55 + i * 0.028;
    band(m, lobby, t, t + 0.018, 304.7, 309.5, 0.18, i % 3 === 0 ? '#719297' : '#537887', i % 4 === 1);
  }
  for (let i = 0; i < 7; i++) {
    const [x, , z] = entry(0.54 + i * 0.068, 0, 1.05);
    m.body.box(0.5, 8.7, 0.53, x, 307.38, z, steel);
  }
  // Pale concrete follows the entrance up to the landscaped paths at Pemberton Place.
  for (let i = 0; i < 48; i++) {
    const a = i / 48,
      b = (i + 1) / 48;
    const p = (t: number, d: number) => {
      const [x, , z] = entry(t, 0, d);
      return [x, (grid.sample(x - 440, z - 1178) ?? m.base + 0.35) + 0.09, z];
    };
    const width = (t: number) => 3.6 + 3.6 * Math.sin(t * Math.PI);
    m.body.quad(p(a, -1.7), p(a, width(a)), p(b, width(b)), p(b, -1.7), '#c3bbaa');
  }
  // The pale street wing and its upper glazing return behind the screen on Baker.
  const street = face(m.ring.slice(28, 35));
  band(m, street, 0.36, 0.96, 313.2, 320.65, 0.12, '#d0d2cb');
  band(m, street, 0.45, 0.91, 316.45, 319.1, 0.2, '#637c86');
  for (let i = 0; i < 17; i++) band(m, street, 0.45 + i * 0.027, 0.452 + i * 0.027, 316.45, 319.1, 0.23, nickel);
  // The Baker/Luckie screen turns over the angled corner, above a granite base.
  const baker = face([m.ring[23], m.ring[24], m.ring[27], m.ring[28], [130, 233.0]]);
  band(m, baker, 0, 1, 307.75, 322.65, 0.18, '#245477');
  band(m, baker, 0.17, 0.9, 316.7, 320.25, 0.24, '#326eac', true);
  for (let i = 0; i < 5; i++) {
    const t = 0.27 + i * 0.115,
      y = 317.6 + 0.48 * (i % 3);
    m.body.tri(baker(t, y, 0.27), baker(t + 0.091, y + 0.18, 0.27), baker(t + 0.054, y + 0.53, 0.27), '#74b6ca');
    m.body.tri(
      baker(t + 0.02, y + 0.12, 0.27),
      baker(t - 0.009, y + 0.55, 0.27),
      baker(t + 0.007, y - 0.22, 0.27),
      '#83bfc9',
    );
  }
  return bow;
}

function prow(m: Shell) {
  // The older lantern has a slender plan, coming to a point above the southeast corner.
  const west: P2[] = [
    [125.9, 161.2],
    [127.3, 178.2],
    [133.8, 192.6],
    [143.1, 202.0],
    [155.8, 209.6],
    [169.7, 215.0],
    [185.85, 219.1],
  ];
  const east: P2[] = [
    [185.85, 219.1],
    [185.5, 212.2],
    [184.2, 204.5],
    [182.5, 197.6],
    [179.9, 190.2],
    [176.0, 181.4],
    [172.7, 175],
  ];
  const ring = [...west, ...east.slice(1)];
  m.prism(ring, 315.5, 326.72, '#47748b', '#b8b7ae');
  const p = face(east);
  const top = (t: number) => 332.8 - 6.0 * t;
  band(m, p, 0, 1, 321.3, top, 0.18, '#426c8b', true);
  band(m, p, 0, 1, (t) => top(t) - 0.25, top, 0.23, nickel);
  for (let i = 0; i < 15; i++) band(m, p, i / 15, (i + 0.048) / 15, 321.3, top, 0.24, steel);
  for (let y = 322.1; y < 332; y += 1.48) band(m, p, 0, Math.min(1, (332.8 - y) / 6), y, y + 0.07, 0.25, nickel);
  const w = face(west);
  band(m, w, 0, 1, 321.7, (t) => 326.7 + 6.1 * t, 0.16, '#356184');
  band(
    m,
    w,
    0,
    1,
    (t) => 326.55 + 6.1 * t,
    (t) => 326.8 + 6.1 * t,
    0.22,
    nickel,
  );
  const [x, z] = east[0];
  m.body.quad(
    [x - 0.55, 320.2, z - 0.1],
    [x + 0.7, 320.2, z + 0.12],
    [x + 1.55, 337.0, z + 1.65],
    [x + 0.77, 337.35, z + 1.85],
    nickel,
  );
  return p;
}

// A thin curved sign follows the cladding so its letters stay on the facade at oblique angles.
function graphic(
  group: Group,
  p: Point,
  a: number,
  b: number,
  lo: number,
  hi: number,
  draw: (c: CanvasRenderingContext2D) => void,
  light: number,
  segments = 32,
  offset = 0.38,
) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  draw(ctx);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  const mat = new MeshLambertMaterial({
    map,
    emissiveMap: map,
    emissive: '#ffffff',
    emissiveIntensity: 0,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    forceSinglePass: true,
  });
  mat.addEventListener('dispose', () => map.dispose());
  const position: number[] = [],
    uv: number[] = [];
  for (let i = 0; i < segments; i++)
    for (const [j, v] of [
      [i, 0],
      [i, 1],
      [i + 1, 1],
      [i, 0],
      [i + 1, 1],
      [i + 1, 0],
    ]) {
      const f = j / segments;
      position.push(...p(a + (b - a) * f, lo + (hi - lo) * v, offset));
      uv.push(f, v);
    }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(position, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  group.add(new Mesh(g, mat));
  return (n: number) => {
    mat.emissiveIntensity = n * light;
  };
}
function fishG(c: CanvasRenderingContext2D, color = '#cadbe0') {
  c.save();
  c.scale(1024 / 200, 160 / 100);
  c.fillStyle = color;
  c.font = 'bold 111px Arial';
  c.fillText('G', 61, 88, 128);
  c.beginPath();
  c.moveTo(76, 45);
  c.quadraticCurveTo(49, 51, 25, 31);
  c.quadraticCurveTo(39, 49, 43, 57);
  c.quadraticCurveTo(37, 67, 24, 84);
  c.quadraticCurveTo(57, 64, 80, 70);
  c.fill();
  c.restore();
}
function wordmark(c: CanvasRenderingContext2D) {
  c.fillStyle = '#ecf0ed';
  c.textAlign = 'center';
  c.font = 'bold 105px Arial';
  c.fillText('G E O R G I A   A Q U A R I U M', 512, 119, 1000);
}

export function createGeorgiaAquarium(buildings: VBuilding[], grid: GroundGrid) {
  const shell = landmarkShell(
    buildings,
    grid,
    'bb792e0e-9fe2-4c92-8ee9-dd3c60fa4dbb',
    'Georgia Aquarium',
    [-440, -1178],
    [1, 0],
    [
      [40, 141],
      [81, 60],
      [188, 80],
      [205, 211],
      [101, 229],
    ],
  );
  if (!shell || shell.ring.length !== 47) return null;
  // Match the surveyed corner sequence even if a bake reverses or rotates the closed outline.
  const ring = shell.ring,
    near = (a: P2, x: number, z: number) => Math.hypot(a[0] - x, a[1] - z) < 1.8;
  const first = ring.findIndex((p) => near(p, 202, 175.2));
  if (first < 0) return null;
  const n = ring.length,
    step = near(ring[(first + 1) % n], 196.7, 171.6) ? 1 : -1;
  const oriented = ring.map((_, i) => ring[(first + step * i + n) % n]);
  if (!near(oriented[1], 196.7, 171.6) || !near(oriented[14], 74.6, 113.4) || !near(oriented[34], 204.8, 232.4)) return null;
  const m = { ...shell, ring: oriented };
  const barrel = halls(m);
  const bow = publicFront(m, grid);
  const lantern = prow(m);
  // Tall blue Luckie frontage, with the large curved window and portholes in the dark plinth.
  const luckie = face(m.ring.slice(15, 22));
  band(m, luckie, 0, 0.76, 307.7, 311.35, 0.07, '#7d8486');
  band(m, luckie, 0.22, 0.54, 311.65, 327.0, 0.1, '#5e808e');
  for (let i = 0; i < 10; i++) band(m, luckie, 0.22 + i * 0.033, 0.222 + i * 0.033, 311.65, 327.05, 0.15, nickel);
  for (let y = 312; y < 327; y += 2.6) band(m, luckie, 0.22, 0.54, y, y + 0.09, 0.15, nickel);
  for (let i = 0; i < 10; i++) {
    const t = 0.045 + 0.065 * i,
      y = 309.25 + (i % 3) * 0.45;
    for (let j = 0; j < 12; j++) {
      const a = (j * Math.PI) / 6,
        b = ((j + 1) * Math.PI) / 6;
      const at = (k: number, r: number) => luckie(t + r * 0.006 * Math.cos(k), y + r * 0.58 * Math.sin(k), 0.17);
      m.body.quad(at(a, 1), at(b, 1), at(b, 0.76), at(a, 0.76), nickel);
      m.body.tri(luckie(t, y, 0.17), at(a, 0.76), at(b, 0.76), '#43565d');
    }
  }
  const result = m.finish('#b3d2ef');
  // Start beyond the folded corner and follow the same 19 panels as the blue fascia.
  const name = graphic(result.group, bow, 6 / 60, 25 / 60, 319.1, 320.8, wordmark, 0.62, 19, 0.08);
  const emblem = graphic(result.group, lantern, 0.1, 0.35, 328.45, 331.55, fishG, 0.88);
  const roofMark: Point = (t, y, d = 0) => {
    const x = 111 - (y - 310) * 1.85,
      z = 194.3 - t * 58.8;
    return [x, barrel(x, z) + 0.07 + d * 0.012, z];
  };
  graphic(
    result.group,
    roofMark,
    0,
    1,
    310,
    325,
    (c) => {
      fishG(c, '#4a6978');
    },
    0,
  );
  const roofName: Point = (t, y) => {
    const x = 121.1 - (y - 310) * 0.88,
      z = 206 - t * 82;
    return [x, barrel(x, z) + 0.1, z];
  };
  graphic(
    result.group,
    roofName,
    0,
    1,
    310,
    315,
    (c) => {
      c.fillStyle = '#64717a';
      c.font = 'bold 112px Arial';
      c.textAlign = 'center';
      c.fillText('G E O R G I A  A Q U A R I U M', 512, 123, 1000);
    },
    0,
  );
  return {
    ...result,
    setNight(night: number) {
      result.setNight(night);
      name(night);
      emblem(night);
    },
  };
}
