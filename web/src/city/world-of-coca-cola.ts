import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshLambertMaterial,
  ShapeUtils,
  SRGBColorSpace,
  CanvasTexture,
  Vector2,
  type Group,
} from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import etchedOutline from './coca-cola-etch-path.txt?raw';

const museumId = '238d116b-be0d-4143-8430-7dce06763b88';
type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const roof = '#dfdfd7',
  zinc = '#bdbcb4',
  brick = '#9b6854',
  coping = '#eeeae4';

// The public elevation follows the plaza arc. The independent cantilever narrows to zero at Baker.
const arc: P2[] = [
  [-155.1, -1026.84],
  [-157.7, -1021.78],
  [-159.89, -1016.38],
  [-161.2, -1010.22],
  [-161.92, -1003.84],
  [-161.56, -996.54],
  [-160.27, -989.63],
  [-158.56, -984.27],
  [-156.16, -979.07],
  [-153.15, -974.41],
  [-148.68, -972.87],
  [-147.02, -969.89],
  [-143.91, -965.01],
  [-140.67, -961.16],
  [-137.04, -957.52],
];
function outerX(z: number) {
  const i = arc.findIndex((p) => p[1] >= z);
  if (i === 0) return arc[0][0];
  if (i < 0) return arc[arc.length - 1][0];
  const [x0, z0] = arc[i - 1],
    [x1, z1] = arc[i];
  return x0 + ((x1 - x0) * (z - z0)) / (z1 - z0);
}
function wallX(z: number) {
  return outerX(z) + Math.min(7.1, Math.max(0, (-z - 959.5) * 0.23));
}
const eave = (z: number) => 310.64 - (z + 1003.8) * 0.123;
const meshTop = (z: number) => 316.45 - (z + 1004) * 0.137;

function lid(body: Builder, plan: P2[], height: (x: number, z: number) => number, color: string) {
  for (const [a, b, c] of ShapeUtils.triangulateShape(
    plan.map(([x, z]) => new Vector2(x, z)),
    [],
  )) {
    const pt = (i: number) => [plan[i][0], height(...plan[i]), plan[i][1]];
    body.tri(pt(a), pt(c), pt(b), color);
  }
}
function slopedWing(m: Shell, plan: P2[], height: (x: number, z: number) => number, wall: string) {
  plan.forEach(([x, z], i) => {
    const [u, v] = plan[(i + 1) % plan.length];
    m.body.quad([x, m.base, z], [x, height(x, z), z], [u, height(u, v), v], [u, m.base, v], wall);
  });
  lid(m.body, plan, height, roof);
}

// Use surveyed corners for the internal partitions in either traversal order.
function surveyRing(ring: P2[]) {
  const near = ([x, z]: P2, a: number, b: number) => Math.hypot(x - a, z - b) < 1.4;
  const start = ring.findIndex((p) => near(p, -140.67, -961.16));
  if (start < 0 || ring.length !== 66) return null;
  const step = near(ring[(start + 1) % 66], -137.04, -957.52) ? 1 : -1;
  const points = ring.map((_, i) => ring[(start + i * step + 66) % 66]);
  return near(points[13], -53.6, -972.66) && near(points[43], -144.25, -1015.69) ? points : null;
}
function exhibitRoofs(m: Shell, r: P2[]) {
  const junction: P2 = [-122.33, -995.72];
  // Broad lower service roof, raised southeast plant room, and Baker Street gallery.
  m.prism([r[9], ...r.slice(10, 32), ...r.slice(32, 39)], m.base, 309.72, brick, roof);
  m.prism([[-95.7, -1000.8], [-53.72, -1000.8], r[13], r[12], r[11], r[10], r[9]], 309.65, 315.91, '#d0c9bb', roof);
  m.prism([r[2], r[3], r[4], r[5], r[9], junction], m.base, 313.3, '#c1b9aa', roof);
  // The drum is a half-disc with its straight chord visible from the rear court.
  const drum: P2[] = [
    ...r.slice(30, 39),
    [-121.4, -989.4],
    [-119.5, -983.7],
    [-116, -978.5],
    [-111.4, -974.2],
    [-105.9, -971.4],
    [-99.8, -970.1],
    [-93.6, -970.8],
    [-85.5, -974.7],
  ];
  slopedWing(m, drum, (x) => 318.08 - (x + 105) * 0.036, '#b8b9ad');
  const a = drum[0],
    b = drum[drum.length - 1];
  m.prism([a, b, [b[0] + 0.62, b[1]], [a[0] + 0.62, a[1]]], 317.7, 320.05, '#cbc9be', coping);
  // North ticket wing sits across the open wedge from the rear wing.
  const north: P2[] = [...r.slice(43, 53), [-150.5, -1021], [-142, -1013], r[40]];
  m.prism(north, m.base, 307.16, '#a69b8d', roof);
  const wall: P2[] = arc.map(([, z]) => [wallX(z), z]);
  const lobby = [...wall, r[2], junction, ...r.slice(39, 44)];
  m.prism(lobby, m.base, 309.66, '#c3beb1', roof);
  m.prism(
    [
      [-144, -999.4],
      [-136.1, -1007.5],
      [-127, -998.9],
      [-135.1, -990.7],
    ],
    309.6,
    315.9,
    zinc,
    roof,
  );
  // Diagonal upper wall behind the high end of the entrance canopy.
  m.prism(
    [
      [-154.2, -1024.1],
      [-152.7, -1025.5],
      [-124.3, -997.3],
      [-125.8, -996],
    ],
    307,
    315.65,
    '#c5bca8',
    roof,
  );
  for (const [x, z, w, l, h] of [
    [-62, -989, 4, 8, 2.2],
    [-70, -978, 3.4, 4.5, 1.9],
    [-56, -1031, 3, 3, 1.2],
  ]) {
    const base = z < -1001 ? 309.72 : 315.91;
    m.body.box(w, h, l, x, base + h / 2, z, '#a8a79e');
    m.body.box(w * 0.82, 0.1, l * 0.8, x, base + h + 0.05, z, '#858b87');
  }
  // The rear approach has masonry bands, a loading shutter and a red glazed poster bay.
  const east = (z: number, y: number) => [-53.43, y, z];
  for (const y of [297.2, 301.1, 305.35, 308.95]) {
    m.body.quad(east(-1028.9, y), east(-1028.9, y + 0.18), east(-973.0, y + 0.18), east(-973.0, y), '#c6b6a2');
  }
  for (const [lo, hi, col] of [
    [-997, -982, '#878d90'],
    [-1006, -998, '#bb443f'],
  ] as const) {
    const p = (z: number, y: number) => [-53.34, y, z];
    m.body.quad(p(lo, 296.1), p(lo, 304.8), p(hi, 304.8), p(hi, 296.1), col);
    if (col === '#878d90') {
      for (let y = 297; y < 304.8; y += 1.35)
        m.body.quad(p(lo, y), p(lo, y + 0.07), [-53.3, y + 0.07, hi], [-53.3, y, hi], '#697172');
    } else {
      // White bear medallion on the red service-front glazing, photographed April 2026.
      const poster = (v: number, y: number) => [-53.27, y, v];
      const cz = (lo + hi) / 2,
        cy = 301.5;
      for (let j = 0; j < 24; j++) {
        const edge = (angle: number) => poster(cz + 2.42 * Math.cos(angle), cy + 2.42 * Math.sin(angle));
        m.body.tri(poster(cz, cy), edge((j * Math.PI) / 12), edge(((j + 1) * Math.PI) / 12), '#4b5558');
      }
      const bear: P2[] = [
        [-1.23, -1.83],
        [-0.99, -0.67],
        [-1.38, 0.07],
        [-1.12, 0.83],
        [-0.94, 1.26],
        [-0.7, 1.38],
        [-0.5, 1.22],
        [-0.02, 1.52],
        [0.37, 1.5],
        [0.49, 1.62],
        [0.72, 1.6],
        [0.86, 1.31],
        [1.47, 1.12],
        [1.55, 0.92],
        [1.12, 0.73],
        [0.67, 0.63],
        [0.41, 0.26],
        [0.44, -0.26],
        [1.18, -1.77],
        [0.5, -2.13],
        [-0.43, -2.14],
      ];
      for (const [u, v, w] of ShapeUtils.triangulateShape(
        bear.map(([x, y]) => new Vector2(x, y)),
        [],
      )) {
        const pt = (i: number) => [-53.25, cy + bear[i][1], cz - bear[i][0]];
        m.body.tri(pt(u), pt(v), pt(w), '#ece5d5');
      }
      for (let z = lo; z <= hi; z += 2) m.body.box(0.12, 8.8, 0.09, -53.23, 300.45, z, '#e4ddd0');
    }
  }
}

function forecourt(m: Shell, grid: GroundGrid) {
  // In the 2024 orthophoto, a paved walk skirts the planted edge of the lawn.
  const width = (z: number) => 5.3 + 1.9 * Math.cos((z + 1002) / 24);
  for (let i = 0; i < arc.length - 1; i++) {
    const [a, b] = [arc[i][1], arc[i + 1][1]];
    const p = (z: number, offset: number) => {
      const x = outerX(z) + offset;
      return [x, (grid.sample(x, z) ?? 301.6) + 0.19, z];
    };
    m.body.quad(p(a, -width(a)), p(b, -width(b)), p(b, 7.4), p(a, 7.4), '#c9bcaa');
    m.body.quad(p(a, -width(a) - 0.26), p(b, -width(b) - 0.26), p(b, -width(b)), p(a, -width(a)), '#dfd7c7');
  }
}

function plazaFront(m: Shell) {
  const ends = arc.map((p) => p[1]);
  // Real truss and soffit cross the ticket glazing, independently of the curved etched screen.
  const canopy = ends.filter((z) => z <= -974.4);
  for (let i = 0; i < canopy.length - 1; i++) {
    const a = canopy[i],
      b = canopy[i + 1];
    const p = (z: number, inner: boolean, down: number) => [inner ? wallX(z) + 0.7 : outerX(z) - 0.22, eave(z) - down, z];
    m.body.quad(p(a, false, 0), p(b, false, 0), p(b, true, 0.31), p(a, true, 0.31), coping);
    m.body.quad(p(a, false, 0.54), p(a, true, 0.85), p(b, true, 0.85), p(b, false, 0.54), '#b6a994');
    m.body.quad(p(a, false, 0), p(a, false, 0.54), p(b, false, 0.54), p(b, false, 0), zinc);
  }
  for (const z of [canopy[0], canopy[canopy.length - 1]]) {
    m.body.quad(
      [outerX(z) - 0.22, eave(z), z],
      [wallX(z) + 0.7, eave(z) - 0.31, z],
      [wallX(z) + 0.7, eave(z) - 0.85, z],
      [outerX(z) - 0.22, eave(z) - 0.54, z],
      zinc,
    );
  }

  // Sweep the silver panels and recessed lobby on the same arc as their etched artwork.
  const seams = [-1005, ...ends.filter((z) => z > -1005)];
  const panels: P2[] = [];
  for (let i = 1; i < seams.length; i++) {
    const n = Math.ceil((seams[i] - seams[i - 1]) / 2.45);
    for (let j = 0; j < n; j++) {
      const a = seams[i - 1] + ((seams[i] - seams[i - 1]) * j) / n,
        b = seams[i - 1] + ((seams[i] - seams[i - 1]) * (j + 1)) / n;
      panels.push([a, b]);
      const pt = (z: number, y: number, d = 0) => [wallX(z) - d, y, z];
      const glazed = a < -981.5,
        sill = glazed ? Math.min(309.1, eave(a) - 0.55) : 301.4;
      const sillB = glazed ? Math.min(309.1, eave(b) - 0.55) : 301.4;
      const silver = ['#d3d0c6', '#c7c6bd', '#d8d6ca'][(i + j) % 3];
      m.body.quad(pt(a, sill, 0.12), pt(a, meshTop(a), 0.12), pt(b, meshTop(b), 0.12), pt(b, sillB, 0.12), silver);
      m.body.quad(pt(a, meshTop(a), 0.12), pt(a, meshTop(a), -1), pt(b, meshTop(b), -1), pt(b, meshTop(b), 0.12), coping);
      m.body.quad(pt(a, meshTop(a), -1), pt(a, 309.64, -1), pt(b, 309.64, -1), pt(b, meshTop(b), -1), zinc);
      if (glazed) {
        m.lights.quad(
          pt(a, 301.55, 0.14),
          pt(a, sill, 0.14),
          pt(b, sillB, 0.14),
          pt(b, 301.55, 0.14),
          j % 2 ? '#647b7c' : '#7c8e8d',
        );
        for (const y of [302.1, 305.75])
          m.body.quad(pt(a, y, 0.19), pt(a, y + 0.09, 0.19), pt(b, y + 0.09, 0.19), pt(b, y, 0.19), '#b6b5a9');
        m.body.quad(pt(a, 301.55, 0.19), pt(a, sill, 0.19), pt(a + 0.09, sill, 0.19), pt(a + 0.09, 301.55, 0.19), '#e0d9c9');
      }
    }
  }
  // The higher canopy opens over the ticket counter to the north of the tower.
  for (let z = -1022; z < -1005.1; z += 2) {
    const p = (t: number, y: number) => [wallX(t) - 0.1, y, t],
      top = Math.min(309.5, eave(z) - 0.66);
    m.body.quad(p(z + 0.13, 301.65), p(z + 0.13, top), p(z + 1.9, top), p(z + 1.9, 301.65), '#637d7e');
    m.body.quad(p(z + 0.13, 305.25), p(z + 0.13, 305.36), p(z + 1.9, 305.36), p(z + 1.9, 305.25), '#dad5c6');
  }
  return panels;
}
function etchedScript(group: Group, panels: P2[]) {
  const pos: number[] = [],
    uv: number[] = [];
  for (const [a, b] of panels) {
    for (const [z, top] of [
      [a, 0],
      [a, 1],
      [b, 1],
      [a, 0],
      [b, 1],
      [b, 0],
    ]) {
      const y = top ? meshTop(z) : 301.62;
      pos.push(wallX(z) - 0.205, y, z);
      // The real script is enlarged and cropped by both the sloping coping and the pavement.
      uv.push((z + 1005) / 48, (y - 299.8) / 17.1);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const sheet = document.createElement('canvas');
  sheet.width = 1024;
  sheet.height = 320;
  const ink = sheet.getContext('2d');
  if (!ink) {
    geo.dispose();
    return;
  }
  ink.scale(sheet.width / 615.08, sheet.height / 192.94);
  ink.fillStyle = '#59524c';
  ink.fill(new Path2D(etchedOutline));
  const map = new CanvasTexture(sheet);
  map.colorSpace = SRGBColorSpace;
  const mat = new MeshLambertMaterial({
    map,
    transparent: true,
    opacity: 0.86,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    depthWrite: false,
    side: DoubleSide,
  });
  mat.addEventListener('dispose', () => map.dispose());
  group.add(new Mesh(geo, mat));
}

function identityTower(m: Shell) {
  const x = -153.68,
    z = -1002.25,
    w = 7.35,
    d = 4.65,
    top = 329.1;
  const square: P2[] = [
    [x - w / 2, z - d / 2],
    [x + w / 2, z - d / 2],
    [x + w / 2, z + d / 2],
    [x - w / 2, z + d / 2],
  ];
  m.prism(square, m.base, 315.05, '#c8dfd9', '#d8e8e1');
  const bottle = new Builder(),
    frost = new Builder();
  for (let j = 0; j < 4; j++) {
    const [ax, az] = square[j],
      [bx, bz] = square[(j + 1) % 4];
    const point = (u: number, v: number, y: number) => [x + (u - x) * 1.009, y, z + (v - z) * 1.009];
    frost.quad(point(ax, az, 301.65), point(ax, az, 315.06), point(bx, bz, 315.06), point(bx, bz, 301.65), '#d8ece7');
  }
  const profile = [
    [315.7, 0.76],
    [315.88, 1.1],
    [316.23, 1.19],
    [317.35, 1.22],
    [318.9, 1.01],
    [319.8, 0.98],
    [321.45, 1.24],
    [322.63, 1.34],
    [323.45, 1.27],
    [324.55, 0.98],
    [325.4, 0.56],
    [326.12, 0.46],
    [326.36, 0.5],
    [326.55, 0.44],
    [326.6, 0.03],
  ];
  for (let i = 0; i < profile.length - 1; i++) {
    for (let j = 0; j < 16; j++) {
      const p = (k: number, t: number) => [
        x + profile[k][1] * Math.cos((t * Math.PI) / 8),
        profile[k][0],
        z + profile[k][1] * Math.sin((t * Math.PI) / 8),
      ];
      bottle.quad(p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1), ['#4fa987', '#75bf9b', '#38927e', '#5eb392'][j % 4]);
    }
  }
  // Point-supported, fritted glazing lightens toward the clear crown.
  for (let j = 0; j < 4; j++) {
    const [ax, az] = square[j],
      [bx, bz] = square[(j + 1) % 4];
    for (let y = 315.05; y < top - 0.01; y += 2) {
      const hi = Math.min(y + 2, top);
      frost.quad([ax, y, az], [ax, hi, az], [bx, hi, bz], [bx, y, bz], y < 319 ? '#e4f5ee' : '#adcfc8');
      m.body.quad([ax, y, az], [ax, y + 0.045, az], [bx, y + 0.045, bz], [bx, y, bz], '#b7d0c8');
    }
    m.body.box(0.065, top - 315, 0.065, ax, (top + 315) / 2, az, '#aec4bd');
    m.body.quad([ax, top, az], [ax, top - 0.15, az], [bx, top - 0.15, bz], [bx, top, bz], '#c3d2c8');
  }
  lid(frost, square, () => top, '#c7ded6');
  for (const dx of [-2.8, 2.8]) {
    m.body.box(0.075, 13.45, 0.075, x + dx, 322.25, z, '#b9c8c2');
    for (let y = 316; y < 329; y += 2) m.body.box(0.09, 0.055, d - 0.18, x + dx, y, z, '#c3d8d0');
  }
  for (const dz of [-0.28, 0.28]) m.body.box(0.035, 2.5, 0.035, x, 327.8, z + dz, '#9ba9a0');
  const bottleMat = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, emissive: '#40e3a6' });
  const frostMat = new MeshLambertMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: DoubleSide,
    emissive: '#8fcbd4',
  });
  return {
    bottle: new Mesh(bottle.geometry(), bottleMat),
    glass: new Mesh(frost.geometry(), frostMat),
    setNight(n: number) {
      bottleMat.emissiveIntensity = n * 0.86;
      frostMat.emissiveIntensity = n * 0.47;
    },
  };
}

export function createWorldOfCocaCola(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(
    buildings,
    grid,
    museumId,
    'world-of-coca-cola',
    [0, 0],
    [1, 0],
    [
      [-153, -1002],
      [-110, -991],
      [-75, -1020],
    ],
  );
  if (!m) return null;
  const ring = surveyRing(m.ring);
  if (!ring) return null;
  forecourt(m, grid);
  exhibitRoofs(m, ring);
  const panels = plazaFront(m),
    tower = identityTower(m),
    result = m.finish('#ff914a');
  etchedScript(result.group, panels);
  result.group.add(tower.bottle, tower.glass);
  return {
    ...result,
    setNight(night: number) {
      result.setNight(night);
      tower.setNight(night);
    },
  };
}
