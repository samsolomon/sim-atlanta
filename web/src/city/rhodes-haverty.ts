import { CanvasTexture, Mesh, MeshLambertMaterial, PlaneGeometry, SRGBColorSpace, type Group } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { type P2, rng } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const towerId = '85e6fb90-92d5-4178-acb4-40ed503833d4';
const shopId = '419a1c3b-0973-40f3-b073-9344422c5e34';
const origin: P2 = [297.36, -372.48],
  axis: P2 = [17.34, -13.5];
const brick = '#c6ac89',
  stone = '#c1bbb0',
  tile = '#ae855f',
  trim = '#decbb0',
  glass = '#546168';
const roof = 392.1;

// A street elevation measured from its left corner, with positive depth toward the sidewalk.
function elevation(m: Shell, a: P2, b: P2) {
  const width = Math.hypot(b[0] - a[0], b[1] - a[1]),
    dx = (b[0] - a[0]) / width,
    dz = (b[1] - a[1]) / width;
  const plan = (x: number, d: number): P2 => [a[0] + dx * x + dz * d, a[1] + dz * x - dx * d];
  const point = (x: number, y: number, d: number) => {
    const [u, v] = plan(x, d);
    return [u, y, v];
  };
  function panel(l: number, r: number, lo: number, hi: number, d: number, color: string, lit = false) {
    (lit ? m.lights : m.body).quad(point(l, lo, d), point(l, hi, d), point(r, hi, d), point(r, lo, d), color);
  }
  function ledge(l: number, r: number, lo: number, hi: number, d: number, color: string, back = -0.06) {
    const p = [plan(l, d), plan(r, d), plan(r, back), plan(l, back)];
    m.prism(p, lo, hi, color, color);
    m.body.quad(point(l, lo, back), point(r, lo, back), point(r, lo, d), point(l, lo, d), color);
  }
  function slope(l: number, r: number, yl: number, yr: number, h: number, d: number, color: string, lit = false) {
    (lit ? m.lights : m.body).quad(point(l, yl, d), point(l, yl + h, d), point(r, yr + h, d), point(r, yr, d), color);
  }
  function lightTrim(l: number, r: number, yl: number, yr: number, depth: number) {
    slope(l, r, yl, yr, 0.36, depth, trim, true);
    m.lights.quad(
      point(l, yl, depth),
      point(r, yr, depth),
      point(r, yr, depth - 0.48),
      point(l, yl, depth - 0.48),
      trim,
    );
  }
  // The masonry ring has a reveal between the outer arch and its recessed glazing.
  function arch(x: number, y: number, r: number, sill: number, d: number) {
    panel(x - r, x + r, sill, y, d, glass);
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 10,
        next = ((i + 1) * Math.PI) / 10;
      const at = (ang: number, rad: number, depth: number) =>
        point(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, depth);
      m.body.tri(point(x, y, d), at(angle, r, d), at(next, r, d), glass);
      m.body.quad(at(angle, r, d), at(next, r, d), at(next, r, d + 0.24), at(angle, r, d + 0.24), tile);
      m.body.quad(
        at(angle, r, d + 0.24),
        at(next, r, d + 0.24),
        at(next, r + 0.26, d + 0.24),
        at(angle, r + 0.26, d + 0.24),
        i % 2 ? trim : tile,
      );
    }
    panel(x - 0.07, x + 0.07, sill, y + r - 0.04, d + 0.04, trim);
    panel(x - r, x + r, y - 1.75, y - 1.62, d + 0.05, trim);
  }
  return { width, point, panel, ledge, slope, arch, lightTrim };
}
type Front = ReturnType<typeof elevation>;

function entrance(m: Shell, f: Front, center: number, canopy: boolean) {
  const { ledge, panel, point } = f,
    half = canopy ? 2.45 : 1.45;
  ledge(center - half - 0.28, center + half + 0.28, m.base + 0.18, 328.08, 0.27, stone);
  panel(center - half, center + half, m.base + 0.18, 327.8, 0.31, '#6b5640');
  for (const side of [-1, 1]) {
    const x = center + side * half * 0.46;
    panel(x - half * 0.41, x + half * 0.41, m.base + 0.45, 327.46, 0.36, '#48595e');
  }
  if (canopy) {
    ledge(center - half - 0.45, center + half + 0.45, 327.93, 328.28, 1.57, '#807057');
    panel(center - half - 0.45, center + half + 0.45, 328.08, 328.22, 1.59, '#d4bd8a');
  } else {
    m.body.tri(
      point(center - half - 0.46, 327.97, 0.38),
      point(center, 329.36, 0.38),
      point(center + half + 0.46, 327.97, 0.38),
      trim,
    );
    f.slope(center - half - 0.48, center, 328.0, 329.35, 0.2, 0.47, stone);
    f.slope(center, center + half + 0.48, 329.35, 328.0, 0.2, 0.47, stone);
  }
}

function graniteBase(m: Shell, f: Front, street: string) {
  const { width: w, ledge, panel } = f;
  for (const h of [329.9, 334.9]) ledge(0.12, w - 0.12, h, h + 0.24, h === 334.9 ? 0.48 : 0.18, stone);
  const bays = street === 'peachtree' ? 4 : 5;
  for (let i = 0; i < bays; i++) {
    const l = (w * (i + 0.1)) / bays,
      r = (w * (i + 0.9)) / bays,
      c = (l + r) / 2;
    panel(l, r, 329.43, 332.14, 0.22, glass);
    for (const t of [0.28, 0.57, 0.83])
      panel(l + (r - l) * t - 0.063, l + (r - l) * t + 0.063, 329.43, 332.14, 0.28, '#7a766f');
    panel(l, r, 331.45, 331.55, 0.29, '#7a766f');
    for (const x of [c - (r - l) * 0.23, c + (r - l) * 0.23]) panel(x - 0.57, x + 0.57, 332.82, 334.68, 0.09, glass);
    if (street === 'peachtree' && (i === 0 || i === 2)) {
      entrance(m, f, c, i === 0);
    } else if (street === 'williams' && i === 2) {
      entrance(m, f, c, false);
    } else {
      panel(l + 0.3, r - 0.3, m.base + 0.58, 327.68, 0.09, '#736351');
      panel(l + 0.49, r - 0.49, m.base + 0.95, 327.36, 0.14, glass);
      panel(c - 0.07, c + 0.07, m.base + 0.95, 327.36, 0.18, '#867969');
    }
  }
}

function streetFront(m: Shell, f: Front, street: string) {
  const { width: w, ledge, panel, slope, point } = f,
    l = w * 0.183,
    r = w - l,
    pitch = (r - l) / 4;
  const rand = rng(Math.round(w * 100));
  graniteBase(m, f, street);
  // The four central bays form one projecting pavilion between flatter outside shoulders.
  ledge(l - 0.34, r + 0.34, 335.13, 392.65, 0.24, brick);
  for (let i = 0; i <= 4; i++) {
    const x = l + i * pitch;
    ledge(x - 0.25, x + 0.25, 335.16, 391.97, 0.51, trim);
  }
  for (let i = 0; i < 4; i++) {
    const x = l + (i + 0.5) * pitch,
      half = pitch * 0.39;
    for (let row = 0; row < 15; row++) {
      const y = 336.05 + row * 2.9;
      for (const offset of [-half * 0.5, half * 0.5]) {
        const c = x + offset;
        panel(c - half * 0.43, c + half * 0.43, y, y + 1.76, 0.28, rand() < 0.4 ? '#706c60' : glass, rand() < 0.13);
      }
      panel(x - half, x + half, y - 0.15, y + 0.02, 0.32, trim);
      // Buff raised chevrons across the darker brick spandrels.
      slope(x - half, x, y + 2.13, y + 2.47, 0.13, 0.29, tile);
      slope(x, x + half, y + 2.47, y + 2.13, 0.13, 0.29, tile);
    }
    f.arch(x, 388.88, half, 381.95, 0.28);
    ledge(x - half, x + half, 384.34, 384.9, 0.37, tile);
  }
  for (const x of [w * 0.066, w * 0.128, w * 0.872, w * 0.934]) {
    for (let j = 0; j < 19; j++) {
      const y = 335.9 + j * 2.91;
      panel(x - 0.47, x + 0.47, y, y + 1.72, 0.07, glass, rand() < 0.1);
    }
  }
  ledge(0.03, w - 0.03, 380.1, 380.7, 0.59, tile);
  f.lightTrim(0.1, w - 0.1, 380.52, 380.52, 0.68);
  // The three gables are street parapets in front of a flat roof.
  ledge(0, w, 392.05, 392.87, 0.39, trim, -0.38);
  const mid = w / 2,
    shoulder = 392.84,
    peak = 395.65;
  for (const d of [0.36, -0.35]) m.body.tri(point(l, shoulder, d), point(mid, peak, d), point(r, shoulder, d), brick);
  for (const [a, b, ya, yb] of [
    [l, mid, shoulder, peak],
    [mid, r, peak, shoulder],
  ]) {
    m.body.quad(point(a, ya, 0.36), point(b, yb, 0.36), point(b, yb, -0.35), point(a, ya, -0.35), trim);
    f.lightTrim(a, b, ya - 0.28, yb - 0.28, 0.48);
    slope(a, b, ya - 0.69, yb - 0.69, 0.17, 0.39, tile);
  }
}

function northWall(m: Shell, f: Front) {
  const { width: w, panel, ledge } = f;
  for (const side of [0.1, 0.9]) {
    const c = w * side;
    for (let i = 0; i < 18; i++)
      panel(
        c - 0.66,
        c + 0.66,
        336 + i * 3.08,
        337.62 + i * 3.08,
        0.09,
        glass,
        side === 0.1 ? i % 5 === 1 : i % 4 !== 2,
      );
    const edge = side === 0.1 ? 0.13 : w - 0.53;
    panel(edge, edge + 0.4, 380.36, 392.82, 0.3, trim, true);
  }
  ledge(0.05, w - 0.05, 392.05, 392.82, 0.28, trim, -0.28);
  f.lightTrim(0.08, w - 0.08, 392.47, 392.47, 0.54);
  for (const y of [380.4, 386.38]) {
    ledge(0.12, w - 0.12, y - 0.36, y + 0.22, 0.38, tile);
    f.lightTrim(0.13, w - 0.13, y, y, 0.58);
  }
  ledge(w / 2 - 5.995, w / 2 + 5.995, 348.83, 379.54, 0.29, '#78624f');
}

// A static illustrative travel print on the floodlit cloth panel. The transparent margin
// below the print lets the small hotel sign sit directly on the brick in the same draw call.
function wallscape(group: Group, f: Front) {
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const printH = (canvas.width * 30.43) / 11.71;
  ctx.fillStyle = '#efe0b6';
  ctx.fillRect(0, 0, 256, printH);
  ctx.fillStyle = '#dc915e';
  ctx.beginPath();
  ctx.arc(165, 201, 51, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#4b7175';
  ctx.beginPath();
  ctx.moveTo(0, printH * 0.66);
  ctx.lineTo(75, 340);
  ctx.lineTo(129, 379);
  ctx.lineTo(218, 285);
  ctx.lineTo(256, 310);
  ctx.lineTo(256, printH);
  ctx.lineTo(0, printH);
  ctx.fill();
  ctx.fillStyle = '#30535e';
  ctx.beginPath();
  ctx.moveTo(0, 466);
  ctx.lineTo(68, 485);
  ctx.lineTo(172, 419);
  ctx.lineTo(210, 439);
  ctx.lineTo(256, 395);
  ctx.lineTo(256, printH);
  ctx.lineTo(0, printH);
  ctx.fill();
  ctx.fillStyle = '#f5e8cc';
  ctx.textAlign = 'center';
  ctx.font = '26px Georgia';
  ctx.fillText('ATLANTA', 128, printH - 42);
  ctx.fillStyle = '#f0e9d8';
  ctx.font = 'bold 27px Georgia';
  ctx.fillText('Residence Inn', 128, 750);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  const material = new MeshLambertMaterial({
    map,
    emissiveMap: map,
    emissive: 0xffffff,
    emissiveIntensity: 0,
    alphaTest: 0.25,
  });
  material.addEventListener('dispose', () => map.dispose());
  const height = (11.71 * canvas.height) / canvas.width;
  const mesh = new Mesh(new PlaneGeometry(11.71, height), material);
  const [x, y, z] = f.point(f.width / 2, 379.4 - height / 2, 0.38),
    normal = f.point(f.width / 2, y, 1.38);
  mesh.position.set(x, y, z);
  mesh.rotation.y = Math.atan2(normal[0] - x, normal[2] - z);
  group.add(mesh);
  return material;
}

export function createRhodesHaverty(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(buildings, grid, towerId, 'Rhodes-Haverty Building', origin, axis, [
    [2, 2],
    [20, 2],
    [20, 18],
    [3, 25],
  ]);
  if (!m || m.ring.length !== 4) return null;
  const nearest = (ring: P2[], u: number, v: number) =>
    ring.reduce((a, b) => (Math.hypot(a[0] - u, a[1] - v) < Math.hypot(b[0] - u, b[1] - v) ? a : b));
  const [d, c, b, a] = [
    [0, 0],
    [22, 0],
    [24, 19],
    [1, 30],
  ].map(([u, v]) => nearest(m.ring, u, v));
  if (new Set([d, c, b, a]).size !== 4) return null;
  m.prism(m.ring, m.base, 335.14, stone, stone);
  m.prism(m.ring, 335.14, roof, brick, '#a7a49a');
  streetFront(m, elevation(m, d, c), 'forsyth');
  streetFront(m, elevation(m, b, a), 'peachtree');
  streetFront(m, elevation(m, a, d), 'williams');
  const north = elevation(m, c, b);
  northWall(m, north);
  // The high return aligns with the north wall, whose top two openings are visible from the square.
  const at = (v: number): P2 => [c[0] + ((b[0] - c[0]) * (v - c[1])) / (b[1] - c[1]), v];
  const n0 = at(4.3),
    n1 = at(16.4);
  m.prism([[10.4, 4.3], n0, n1, [10.4, 16.4]], roof, 396.7, brick, '#a5a296');
  const attic = elevation(m, n0, n1);
  for (const x of [attic.width * 0.28, attic.width * 0.72]) attic.arch(x, 394.57, 1.18, 392.91, 0.09);
  const mid = attic.width / 2;
  m.body.tri(attic.point(0, 396.65, 0.1), attic.point(mid, 397.23, 0.1), attic.point(attic.width, 396.65, 0.1), brick);
  attic.lightTrim(0, mid, 396.38, 396.96, 0.34);
  attic.lightTrim(mid, attic.width, 396.96, 396.38, 0.34);
  m.prism(
    [
      [3.4, 7],
      [5.7, 7],
      [5.7, 16.7],
      [3.4, 16.7],
    ],
    roof,
    394.65,
    '#9b9688',
    '#b5b1a5',
  );
  const shop = landmarkShell(buildings, grid, shopId, 'Peachtree storefront', origin, axis, [
    [26, 3],
    [28, 12],
  ]);
  const buildShop = shop && shop.ring.length === 4;
  if (buildShop) {
    // The adjacent bake assigns this one-storey shop a tower height. Its own roof is visible in lidar.
    m.prism(shop.ring, shop.base, 329.1, '#4a6373', '#929898');
    const front = elevation(m, nearest(shop.ring, 31, 16), nearest(shop.ring, 24, 19));
    front.ledge(0.06, front.width - 0.06, 328.58, 329.16, 0.2, '#4b667d');
    for (let i = 0; i < 3; i++)
      front.panel(
        ((i + 0.1) * front.width) / 3,
        ((i + 0.9) * front.width) / 3,
        shop.base + 0.5,
        327.82,
        0.08,
        '#657983',
      );
  }
  const result = m.finish('#ffe2a8');
  const material = wallscape(result.group, north);
  return {
    ...result,
    buildings: buildShop ? result.buildings.filter((b) => b.id !== shopId) : result.buildings,
    setNight(night: number) {
      result.setNight(night);
      if (material) material.emissiveIntensity = 0.7 * night;
    },
  };
}
