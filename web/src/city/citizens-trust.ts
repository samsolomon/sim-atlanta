import { CanvasTexture, Group, Mesh, MeshLambertMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const ivory = '#ded7c3',
  bronze = '#998370',
  recess = '#615d55',
  roof = 354.6;
const west = 2.49,
  east = 21.57,
  north = 5.63,
  south = 73.45;
const rect = (l: number, n: number, r: number, s: number): P2[] => [
  [l, n],
  [r, n],
  [r, s],
  [l, s],
];

function elevation(m: Shell, a: P2, b: P2) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]),
    dx = (b[0] - a[0]) / length,
    dz = (b[1] - a[1]) / length;
  function plan(t: number, d: number): P2 {
    return [a[0] + dx * t + dz * d, a[1] + dz * t - dx * d];
  }
  function point(t: number, y: number, d: number) {
    const [x, z] = plan(t, d);
    return [x, y, z];
  }
  function panel(l: number, r: number, lo: number, hi: number, d: number, color: string, lit = false) {
    (lit ? m.lights : m.body).quad(point(l, lo, d), point(l, hi, d), point(r, hi, d), point(r, lo, d), color);
  }
  function ledge(l: number, r: number, lo: number, hi: number, d: number, D: number, color: string) {
    m.prism([plan(l, d), plan(r, d), plan(r, D), plan(l, D)], lo, hi, color, color);
    m.body.quad(point(l, lo, d), point(r, lo, d), point(r, lo, D), point(l, lo, D), color);
  }
  return { length, point, panel, ledge };
}
type Face = ReturnType<typeof elevation>;

function curtain(f: Face, bays: number, seed: number) {
  const rand = rng(seed),
    pitch = f.length / bays,
    lo = 310.35,
    top = 353.2;
  const glass = ['#4c5054', '#606260', '#50585c', '#6e6c65'];
  f.panel(0, f.length, lo, top, 0, bronze);
  for (let i = 0; i < bays; i++) {
    const l = i * pitch + 0.132,
      r = (i + 1) * pitch - 0.12;
    for (let j = 0; j < 11; j++) {
      const y = lo + ((top - lo) * j) / 11;
      const split = (l + r) / 2;
      for (const [x, X] of [
        [l, split - 0.028],
        [split + 0.028, r],
      ]) {
        f.panel(x, X, y + 0.16, y + 2.12, 0.035, glass[Math.floor(rand() * glass.length)], rand() < 0.115);
      }
      f.panel(l, r, y + 2.1, y + 2.16, 0.051, '#a69c88');
    }
    // The front edge catches light while the darker returns give each marble-colored fin depth.
    f.ledge(Math.max(0, i * pitch - 0.13), i * pitch + 0.13, lo, roof + 0.55, -0.035, 0.22, '#d4cbb7');
  }
  f.ledge(f.length - 0.105, f.length, lo, roof + 0.55, -0.035, 0.22, ivory);
  f.ledge(0, f.length, 353.25, 355.08, -0.1, 0.24, ivory);
}

function endEmblem(m: Shell, f: Face) {
  const x = f.length / 2,
    y = 353.52;
  // Three blue strokes form the simplified flame seen on the two short elevations.
  for (let k = 0; k < 3; k++) {
    const at = (t: number, h: number) => f.point(x + (k - 1) * 0.61 + t, y + h, 0.29);
    const a = at(-0.36, -0.38),
      b = at(0.3, -0.62),
      c = at(0.67, 0.2),
      d = at(-0.12, 1.42),
      e = at(0.15, 0.31);
    m.body.tri(a, b, e, '#24538f');
    m.body.tri(b, c, e, '#28609d');
    m.body.tri(c, d, e, '#326da8');
  }
}

function westSigns(group: Group) {
  function label(text: string, width: number, height: number, x: number, y: number, z: number, serif: boolean) {
    const canvas = document.createElement('canvas');
    canvas.width = serif ? 1536 : 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = serif ? 'bold 46px Georgia' : 'bold 43px Arial';
    ctx.fillStyle = '#344d67';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, 47, canvas.width - 12);
    if (serif) {
      ctx.fillStyle = '#a34a43';
      ctx.fillRect(canvas.width * 0.38, 51, canvas.width * 0.19, 4);
    }
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    const mat = new MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false });
    mat.addEventListener('dispose', () => tex.dispose());
    const sign = new Mesh(new PlaneGeometry(width, height), mat);
    sign.rotation.y = -Math.PI / 2;
    sign.position.set(x, y, z);
    group.add(sign);
  }
  label('G E O R G I A   S T A T E   U N I V E R S I T Y', 60.5, 1.67, west - 0.26, 354.23, (north + south) / 2, true);
  label('75  PIEDMONT', 7.15, 0.77, -3.55, 306.91, 36.2, false);
}

function baseAndEntrance(m: Shell) {
  // The two-story north lobby sits behind a canopy on tall piers along Dobbs.
  m.prism(rect(1.0, 2.15, 24.4, 28.9), m.base, 311.86, recess, '#a49885');
  const northGlass = elevation(m, [1.0, 2.15], [24.4, 2.15]);
  for (let i = 0; i < 7; i++) northGlass.panel(0.3 + i * 3.2, 3.0 + i * 3.2, 303.93, 311.68, 0.055, '#66685e', i === 3);
  const westGlass = elevation(m, [1, 28.9], [1, 2.15]);
  for (let i = 0; i < 7; i++) westGlass.panel(0.26 + i * 3.7, 3.4 + i * 3.7, 304.18, 311.73, 0.055, '#545954', i === 2);
  m.prism(rect(0, 0, 25, 28.91), 311.9, 312.52, ivory, '#bab5a7');
  m.body.quad([0, 311.9, 0], [25, 311.9, 0], [25, 311.9, 28.91], [0, 311.9, 28.91], '#b9b19f');
  for (let i = 0; i < 7; i++)
    m.prism(rect(0.22 + i * 3.97, 0.22, 0.64 + i * 3.97, 0.81), m.base, 311.91, '#c5bda7', ivory);
  for (let i = 1; i < 7; i++) m.prism(rect(0.18, i * 3.98, 0.6, i * 3.98 + 0.48), m.base, 311.91, '#c9bfab', ivory);

  // The rear annex and its small loading projection step down toward the adjoining J Deck.
  m.prism(rect(east, 10.97, 36.98, 42.48), m.base, 312.32, '#967d69', '#b4ac9b');
  m.prism(rect(36.99, 32.9, 47.33, 41.17), m.base, 306.95, '#a09581', '#c1b9a7');
  const loading = elevation(m, [47.33, 32.9], [47.33, 41.17]);
  loading.panel(0.82, 6.98, 300.34, 304.13, 0.045, '#605e56');
  for (let j = 0; j < 8; j++) loading.panel(0.82, 6.98, 300.57 + j * 0.44, 300.62 + j * 0.44, 0.06, '#939185');

  m.prism(rect(west + 1.3, 28.88, east - 1.02, south - 0.95), m.base, 310.38, '#736959', '#918672');
  const lobby = elevation(m, [west + 1.3, south - 0.95], [west + 1.3, 28.88]);
  for (let i = 0; i < 10; i++) {
    const pitch = lobby.length / 10;
    lobby.panel(i * pitch + 0.24, (i + 1) * pitch - 0.24, 303.35, 308.74, 0.045, '#566263', i === 3 || i === 8);
  }
  for (let z = 44.9; z < south; z += 5.25)
    m.prism(rect(west + 0.11, z, west + 0.56, z + 0.55), m.base, 310.4, ivory, ivory);
  for (const x of [west + 0.18, west + 6.2, west + 12.2, east - 0.75])
    m.prism(rect(x, south - 0.55, x + 0.5, south - 0.08), m.base, 310.4, ivory, ivory);
  const southGlass = elevation(m, [east - 1.02, south - 0.95], [west + 1.3, south - 0.95]);
  for (let i = 0; i < 5; i++)
    southGlass.panel(i * 3.25 + 0.25, i * 3.25 + 3.08, 303.33, 308.75, 0.035, '#5b605e', i === 1);
  // A red-brown wall behind the freestanding, lower Piedmont entrance hood.
  m.prism(rect(0.06, 28.9, west + 1.32, 36.4), m.base, 311.88, '#927362', '#ad9987');
  m.prism(rect(-3.46, 28.87, west + 1.32, 43.58), 306.4, 307.38, ivory, '#c8c1af');
  m.body.quad(
    [-3.46, 306.4, 28.87],
    [west + 1.32, 306.4, 28.87],
    [west + 1.32, 306.4, 43.58],
    [-3.46, 306.4, 43.58],
    '#b7ab94',
  );
  for (const z of [29.44, 42.66]) m.prism(rect(-3.14, z, -2.57, z + 0.5), m.base, 306.42, '#b5a58c', ivory);
  const entry = elevation(m, [west + 1.3, 43.64], [west + 1.3, 36.4]);
  entry.panel(0.68, 5.7, 303.44, 306.35, 0.085, '#404f54', true);
  for (const t of [0.68, 2.35, 4.02, 5.7]) entry.panel(t - 0.055, t + 0.055, 303.43, 306.35, 0.11, '#a59f90');
  entry.panel(0.68, 5.7, 305.59, 305.67, 0.12, '#a59f90');
}

function piedmontWalk(m: Shell, grid: GroundGrid) {
  const axis = Math.hypot(25.01, 0.2),
    c = 25.01 / axis,
    s = 0.2 / axis;
  const grade = (u: number, v: number) => grid.sample(879.62 + c * u - s * v, -343.01 + s * u + c * v) ?? m.base + 0.35;
  const landing = 303.47;
  // Keep the curbside paving on the sampled grade along Piedmont.
  for (let v = 0; v < 74; v += 2) {
    const z = Math.min(v + 2, 74),
      p = (x: number, t: number) => [x, grade(x, t) + 0.045, t];
    m.body.quad(p(-7.5, v), p(-4.6, v), p(-4.6, z), p(-7.5, z), '#b3a898');
  }
  m.prism(rect(-4.55, 38.2, west + 1.29, 43.65), m.base, landing, '#a59e90', '#c6beaf');
  const start = grade(-5.8, 40.9) + 0.06;
  for (let i = 0; i < 4; i++) {
    const l = -6.2 + i * 0.415;
    m.prism(rect(l, 38.6, l + 0.415, 42.35), m.base, start + ((landing - start) * (i + 1)) / 5, '#a59d8e', '#c8bfad');
  }
  // The parallel ramp climbs to the same lobby landing as the short Piedmont stair.
  const begin = 20,
    end = 38.25,
    rampStart = grade(-2.35, begin) + 0.065;
  const top = (v: number) => rampStart + ((landing - rampStart) * (v - begin)) / (end - begin);
  const strip = (u: number, U: number, y: number, Y: number, v: number, V: number, color: string) => {
    m.body.quad([u, y, v], [U, y, v], [U, Y, V], [u, Y, V], color);
  };
  strip(-3.28, -1.22, top(begin), top(end), begin, end, '#bdb7ac');
  for (const u of [-3.28, -1.22]) {
    m.body.quad([u, m.base, begin], [u, top(begin), begin], [u, top(end), end], [u, m.base, end], '#9c968c');
    for (let i = 0; i < 7; i++) {
      const v = begin + ((end - begin) * i) / 6;
      m.prism(rect(u - 0.039, v - 0.039, u + 0.039, v + 0.039), top(v), top(v) + 0.91, '#777a74', '#adafa4');
    }
    for (const h of [0.5, 0.91]) {
      strip(u - 0.04, u + 0.04, top(begin) + h, top(end) + h, begin, end, '#a1a397');
      m.body.quad(
        [u - 0.04, top(begin) + h - 0.055, begin],
        [u - 0.04, top(begin) + h, begin],
        [u - 0.04, top(end) + h, end],
        [u - 0.04, top(end) + h - 0.055, end],
        '#83877e',
      );
    }
  }
  // Two low stone beds flank the entrance; leave both access routes open.
  for (const [u, v, U, V] of [
    [-6.3, 28.5, -3.6, 35.6],
    [-5.7, 45.1, -1.0, 54.7],
  ]) {
    const y = Math.max(grade(u, v), grade(U, V)) + 0.39;
    m.prism(rect(u, v, U, V), m.base, y, '#a49e91', '#c4bbab');
    m.prism(rect(u + 0.19, v + 0.19, U - 0.19, V - 0.19), y, y + 0.1, '#707452', '#646d51');
  }
}

export function createCitizensTrust(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(
    buildings,
    grid,
    '4aa2b33a-6a07-4b7b-b274-59c6cb7fa8dd',
    '75 Piedmont · former Citizens Trust Bank',
    [879.62, -343.01],
    [25.01, 0.2],
    [
      [1, 1],
      [23.6, 9.8],
      [-2.5, 35],
      [45.9, 37],
      [20.5, 72.7],
    ],
  );
  if (!m || m.ring.length !== 16) return null;
  baseAndEntrance(m);
  piedmontWalk(m, grid);
  const floor = 350.15;
  m.prism(rect(west, north, east, south), 310.35, floor, '#908071', '#a7a297');
  m.body.quad([west, 310.35, north], [east, 310.35, north], [east, 310.35, south], [west, 310.35, south], '#bbb29e');
  // The recessed mechanical well follows the southwest side of the roof. Its floor is 4.4 m lower.
  const wn = 43.7,
    ws = 72.02,
    wl = 3.72,
    wr = 9.84;
  for (const outline of [
    rect(west, north, east, wn),
    rect(west, wn, wl, ws),
    rect(wr, wn, east, ws),
    rect(west, ws, east, south),
  ])
    m.prism(outline, floor, roof, '#a2998c', '#c4bfb4');
  m.prism(rect(4.3, 50.12, 8.34, 54.12), floor, 354.07, '#a4a196', '#c6c4b8');
  m.prism(rect(9.96, 24.8, 12.85, 31.2), roof, 355.57, '#a5a59c', '#c5c4b8');
  const corners = rect(west, north, east, south);
  for (let i = 0; i < 4; i++) {
    const f = elevation(m, corners[i], corners[(i + 1) % 4]);
    curtain(f, i % 2 === 0 ? 7 : 24, 76 + i);
    if (i % 2 === 0) endEmblem(m, f);
  }
  const result = m.finish('#eddbb5');
  westSigns(result.group);
  return result;
}
