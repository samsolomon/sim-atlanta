import { CanvasTexture, CylinderGeometry, Mesh, MeshLambertMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const granite = '#a47d6e',
  darkStone = '#80655e',
  roof = '#ad9d90';
const panes = ['#554f48', '#615e57', '#77746a', '#6e6a62', '#50555a', '#797871'];
const roomBase = 334.9,
  mainRoof = 397.05;
function rect(x: number, z: number, x1: number, z1: number): P2[] {
  return [
    [x, z],
    [x1, z],
    [x1, z1],
    [x, z1],
  ];
}

// In plan each bank of room windows projects from the wall and turns back on two short facets.
function bayFront(a: P2, b: P2, count: number): P2[] {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    len = Math.hypot(dx, dz);
  const point = (fraction: number, depth: number): P2 => [
    a[0] + dx * fraction + (dz * depth) / len,
    a[1] + dz * fraction - (dx * depth) / len,
  ];
  const line: P2[] = [a];
  for (let i = 0; i < count; i++) {
    line.push(point((i + 0.2) / count, 0.72), point((i + 0.8) / count, 0.72), point((i + 1) / count, 0));
  }
  return line;
}

function guestRooms(m: Shell) {
  const ellis = bayFront([55.05, 29.45], [9.45, 29.45], 11);
  const peachtree = bayFront([1.25, 24.1], [1.25, 2.0], 5);
  const plan: P2[] = [
    [1.25, 2],
    [14.6, 2],
    [14.6, 10.65],
    [55.05, 10.65],
    ...ellis,
    [9.45, 24.1],
    ...peachtree.slice(0, -1),
  ];
  m.prism(plan, roomBase, mainRoof, granite, roof);
  for (const front of [ellis, peachtree]) {
    for (let i = 1; i < front.length; i++) {
      m.facade(front[i - 1], front[i], roomBase + 0.55, 391.94, 19, 1.65, 0.977, 0.57, panes, 0.24);
      m.facade(front[i - 1], front[i], 392.05, 395.45, 1, 1.55, 0.97, 0.89, panes, 0.29);
    }
  }
  // The outer corners and returns are broad stone blades; the back has flatter ribbons.
  for (const [a, b] of [
    [
      [2, 2],
      [13.8, 2],
    ],
    [
      [15.2, 10.65],
      [54.3, 10.65],
    ],
    [
      [55.05, 12.3],
      [55.05, 27.4],
    ],
  ] as [P2, P2][]) {
    m.facade(a, b, roomBase + 1.0, 394.9, 20, 2.6, 0.85, 0.55, panes, 0.15);
  }
  // Carry the soffit out to the folds visible from below on both sidewalks.
  for (const front of [ellis, peachtree]) {
    const inner = (p: P2) => (front === ellis ? [p[0], roomBase, 21.8] : [1.25, roomBase, p[1]]);
    for (let i = 1; i < front.length; i++) {
      const a = front[i - 1],
        b = front[i];
      m.body.quad([a[0], roomBase, a[1]], [b[0], roomBase, b[1]], inner(b), inner(a), darkStone);
    }
  }
}

function roofscape(m: Shell) {
  const housing: P2[] = [
    [11.75, 10.8],
    [27.5, 10.8],
    [27.5, 16.2],
    [30.9, 16.2],
    [30.9, 24.4],
    [11.75, 24.4],
  ];
  m.prism(housing, mainRoof, 402.9, '#957f71', '#b3a397');
  for (let i = 0; i < housing.length; i++) {
    const [x, z] = housing[i],
      [u, v] = housing[(i + 1) % housing.length];
    m.body.box(Math.abs(x - u) + 0.24, 0.52, Math.abs(z - v) + 0.24, (x + u) / 2, 403.14, (z + v) / 2, '#bdafa0');
  }
  m.prism(rect(38.7, 18.7, 46.7, 23.45), mainRoof, 401.45, '#817e77', '#a6a59a');
  for (const x of [40.8, 44.7]) {
    m.body.addGeometry(new CylinderGeometry(1.65, 1.5, 1.0, 12).translate(x, 401.95, 21.1), '#aaa99e');
    m.body.addGeometry(new CylinderGeometry(1.25, 1.25, 0.14, 12).translate(x, 402.5, 21.1), '#605f59');
  }
  // A low rear return under the L-shaped tower meets the neighboring atrium.
  m.prism(
    [
      [14.6, 0],
      [46.85, 0],
      [46.85, 6.75],
      [41.85, 6.75],
      [41.85, 10.65],
      [14.6, 10.65],
    ],
    m.base,
    357.65,
    '#917e73',
    '#a1978d',
  );
}

// Ellis drops eastward. Sample the paving at intervals along the driveway.
function driveway(m: Shell, grid: GroundGrid) {
  const len = Math.hypot(1, 0.009);
  const point = (u: number, v: number) => {
    const grade = grid.sample(380 + (u - 0.009 * v) / len, -544 + (0.009 * u + v) / len);
    return [u, (grade ?? m.base + 0.35) + 0.14, v];
  };
  for (let u = 9.45; u < 55.05; u += 2) {
    const end = Math.min(55.05, u + 2);
    for (const [back, front] of [
      [21.8, 26],
      [26, 30.3],
      [30.3, 32.2],
    ]) {
      m.body.quad(point(u, back), point(u, front), point(end, front), point(end, back), '#a29a8e');
    }
  }
}

function entrances(m: Shell) {
  // The hotel rooms span the driveway. Stone piers frame the recess on Ellis.
  const back: P2[] = [
    [1.25, 2],
    [14.6, 2],
    [14.6, 10.65],
    [55.05, 10.65],
    [55.05, 21.8],
    [9.45, 21.8],
    [9.45, 24.1],
    [1.25, 24.1],
  ];
  m.prism(back, m.base, roomBase, granite, roof);
  m.facade([54.7, 21.8], [10.3, 21.8], 326.2, 332.35, 1, 2.25, 0.91, 0.91, panes, 0.72);
  for (const [x, w] of [
    [10.3, 1.7],
    [25.1, 1.2],
    [44.7, 1.4],
    [54.25, 1.6],
  ]) {
    m.body.box(w, roomBase - m.base, 6.8, x, (roomBase + m.base) / 2, 26.0, darkStone);
  }
  m.body.box(17.8, 0.75, 2.0, 35.1, 332.9, 29.4, '#4c4240');
  m.lights.box(17.3, 0.11, 0.24, 35.1, 332.54, 30.28, '#d8b98b');
  for (const x of [16, 22.8, 29.4, 36.0, 42.6, 49.3]) {
    m.lights.box(0.34, 0.1, 0.34, x, roomBase - 0.09, 26.65, '#edd6a7');
  }

  // Peachtree has an upper dining terrace and a small round-headed entry at the corner.
  m.prism(rect(0.68, 23.9, 9.45, 29.45), m.base, 337.1, granite, roof);
  m.facade([0.68, 28.95], [0.68, 24.05], 329.05, 332.45, 1, 1.35, 0.93, 0.94, panes, 0.55);
  m.facade([1.25, 23.75], [1.25, 2.4], 329.05, 334.7, 1, 1.6, 0.87, 0.93, panes, 0.55);
  for (const y of [330.0, 333.6]) m.body.box(3.25, 0.32, 18.45, -0.23, y, 12.75, darkStone);
  m.body.box(3.35, 0.38, 18.65, -0.24, 336.7, 12.75, '#514a46');
  for (const z of [3.8, 9.65, 15.65, 21.7]) m.body.box(0.16, 3.08, 0.16, -1.71, 335.12, z, '#453e39');
  for (const y of [333.96, 334.63]) m.body.box(0.12, 0.1, 18.25, -1.72, y, 12.75, '#524941');
  for (const z of [6.2, 12.45, 18.5]) {
    m.body.box(0.64, 0.46, 3, -1.29, 333.98, z, '#9e7a65');
    m.body.box(0.53, 0.32, 2.8, -1.29, 334.34, z, '#626549');
  }
  const cy = 332.25,
    cz = 26.7,
    r = 1.92;
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 10,
      b = ((i + 1) * Math.PI) / 10;
    const edge = (u: number, t: number) => [u, cy + r * Math.sin(t), cz + r * Math.cos(t)];
    m.body.quad(edge(-1.75, a), edge(0.7, a), edge(0.7, b), edge(-1.75, b), '#343536');
    m.body.tri([-1.75, cy, cz], edge(-1.75, b), edge(-1.75, a), '#393a39');
  }
}

export function createRitzCarlton(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(
    buildings,
    grid,
    '74911c46-8821-4b61-95d0-c571563d795d',
    'The Ritz-Carlton, Atlanta',
    [380, -544],
    [1, 0.009],
    [
      [3, 4],
      [12, 28],
      [53, 28],
      [51, 13],
    ],
  );
  if (!m) return null;
  driveway(m, grid);
  entrances(m);
  guestRooms(m);
  roofscape(m);
  const result = m.finish('#f7d19b');
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#403937';
      ctx.fillRect(0, 0, 512, 48);
      ctx.fillStyle = '#ead8b2';
      ctx.font = '32px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE RITZ-CARLTON', 256, 35);
      const map = new CanvasTexture(canvas);
      map.colorSpace = SRGBColorSpace;
      const material = new MeshLambertMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0 });
      material.addEventListener('dispose', () => map.dispose());
      const face = new Mesh(new PlaneGeometry(12.5, 0.69), material);
      face.position.set(35.1, 332.9, 30.42);
      result.group.add(face);
      return {
        ...result,
        setNight(night: number) {
          result.setNight(night);
          material.emissiveIntensity = night * 0.78;
        },
      };
    }
  }
  return result;
}
