import { AdditiveBlending, DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

const site = '07fa5c03-884f-4bb1-baff-b0d858f13699';
type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const marble = '#e0ddd0',
  sill = '#c7c5b9',
  roof = '#b1b2a8';
const glass = ['#4b6577', '#526e80', '#647d8b', '#5c717a'];
function rect(u: number, v: number, x: number, z: number): P2[] {
  return [
    [u, v],
    [x, v],
    [x, z],
    [u, z],
  ];
}
function ribbon(
  m: Shell,
  plan: P2[],
  lo: number,
  hi: number,
  rows: number,
  bay: number,
  fill: number,
  colors: readonly string[],
  lit: number,
) {
  plan.forEach((a, i) => m.facade(a, plan[(i + 1) % plan.length], lo, hi, rows, bay, fill, 0.87, colors, lit));
}
function bankTower(m: Shell, wash: Builder) {
  const plan = rect(0.28, 0.3, 25.1, 57.52);
  // The public lobby is set behind marble piers. The office skin projects above it.
  const lobby = rect(1.8, 1.9, 23.65, 55.75);
  m.prism(lobby, m.base, 326.6, '#48535a', roof);
  ribbon(m, lobby, 319.05, 326.45, 1, 2.35, 0.93, glass, 0.2);
  for (const u of [0.95, 24.4])
    for (let k = 0; k <= 6; k++) {
      m.body.box(1.52, 326.7 - m.base, 1.7, u, (326.7 + m.base) / 2, 1.15 + k * 9.19, marble);
    }
  for (const v of [1.15, 56.29])
    for (const u of [8.75, 16.65]) {
      m.body.box(1.48, 326.7 - m.base, 1.65, u, (326.7 + m.base) / 2, v, marble);
    }
  m.prism(plan, 326.5, 431.8, marble, roof);
  plan.forEach((a, i) => {
    const b = plan[(i + 1) % plan.length],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    const p = (s: number, h: number, d: number) => [a[0] + (dx * s + dz * d) / len, h, a[1] + (dz * s - dx * d) / len];
    const bays = i % 2 === 0 ? 14 : 34,
      step = len / bays;
    m.facade(a, b, 327.1, 425.55, 25, step, 0.87, 0.84, glass, 0.065);
    // Projecting fins narrow at each sill, so the coloured glass reads differently on approach.
    for (let j = 0; j <= bays; j++) {
      const s = j * step,
        w = 0.105;
      for (let f = 0; f < 25; f++) {
        const y = 327.1 + (f * (425.55 - 327.1)) / 25,
          top = 327.1 + ((f + 1) * (425.55 - 327.1)) / 25;
        m.body.quad(
          p(s - w, y, 0.09),
          p(s - w, top - 0.18, 0.1),
          p(s, top - 0.22, 0.91),
          p(s, y + 0.28, 0.61),
          '#e6e2d5',
        );
        m.body.quad(
          p(s, y + 0.28, 0.61),
          p(s, top - 0.22, 0.91),
          p(s + w, top - 0.18, 0.1),
          p(s + w, y, 0.09),
          '#b9b7a8',
        );
      }
      // One batched mesh carries the warm pools seen on the pale exterior ribs at night.
      const level = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.cos(s * 0.23 + i * 0.6), 2);
      const tint =
        Math.round(120 + 105 * level) * 65536 + Math.round(86 + 72 * level) * 256 + Math.round(61 + 48 * level);
      wash.quad(p(s - w, 327.3, 0.12), p(s - w, 425.3, 0.12), p(s, 425.3, 0.94), p(s, 327.3, 0.94), tint);
      wash.quad(p(s, 327.3, 0.94), p(s, 425.3, 0.94), p(s + w, 425.3, 0.12), p(s + w, 327.3, 0.12), tint);
      // Between the fins, the wash sits behind the opaque panes, lighting only the spandrels.
      if (j < bays)
        wash.quad(p(s, 327.1, 0.024), p(s, 425.55, 0.024), p(s + step, 425.55, 0.024), p(s + step, 327.1, 0.024), tint);
    }
    // The tall dark slots in the mechanical crown have about half the office bay pitch.
    for (let j = 0; j < 2 * bays; j++) {
      const s = ((j + 0.5) * step) / 2,
        w = step * 0.132;
      m.body.quad(
        p(s - w, 426.22, 0.035),
        p(s - w, 431.38, 0.035),
        p(s + w, 431.38, 0.035),
        p(s + w, 426.22, 0.035),
        '#566160',
      );
    }
    const rim = 0.36;
    const edge: P2[] = [p(0, 0, rim), p(len, 0, rim), p(len, 0, -rim), p(0, 0, -rim)].map(([u, , v]) => [u, v]);
    m.prism(edge, 431.72, 432.88, marble, '#d4d3c5');
  });
}
function mediaPavilion(m: Shell) {
  const lower = rect(-26.2, 69.9, 22.95, 96.6);
  const lobby = rect(-24.7, 71, 21.9, 95.35);
  m.prism(lobby, m.base, 326.5, '#485761', roof);
  ribbon(m, lobby, 318.2, 326.25, 1, 2.1, 0.95, glass, 0.15);
  for (const v of [70.7, 95.6])
    for (const u of [-25.2, -15.8, -6.4, 3, 12.4, 22]) {
      m.body.box(1.1, 326.6 - m.base, 1.2, u, (326.6 + m.base) / 2, v, marble);
    }
  m.prism(lower, 326.45, 331.85, marble, roof);
  ribbon(m, lower, 328.0, 331.4, 1, 1.72, 0.54, ['#566974', '#71818a'], 0.15);
  // The upper glass floor pulls back from Park Place to leave a roof terrace.
  const upper = rect(-16.35, 72.55, 21.6, 95.45);
  m.prism(upper, 331.85, 336.72, sill, roof);
  ribbon(m, upper, 332.04, 336.25, 1, 2.55, 0.93, glass, 0.42);
  for (const v of [70.15, 96.36]) {
    m.body.box(9.6, 0.08, 0.1, -21.25, 332.96, v, '#7e8d8a');
    for (let j = 0; j <= 4; j++) m.body.box(0.07, 1.12, 0.07, -25.95 + j * 2.35, 332.4, v, '#87928f');
  }
  m.body.box(0.1, 0.09, 26.2, -26, 332.96, 83.23, '#7e8d8a');
  for (let j = 0; j <= 11; j++) m.body.box(0.07, 1.12, 0.07, -26, 332.4, 70.2 + j * 2.36, '#87928f');
  m.prism(rect(15.9, 75.6, 22.0, 92.5), 336.72, 337.92, '#9da5a4', '#b4b9b2');
  m.prism(rect(-3.1, 75.95, 9.9, 80.1), 336.72, 340.12, '#a4aaa6', '#b4b9b0');
  // The low neck joins the buildings behind the plaza.
  const link = rect(4.0, 56.4, 20.7, 70.45);
  m.prism(link, m.base, 331.83, marble, roof);
  ribbon(m, link, 318.05, 331.45, 3, 2.0, 0.67, glass, 0.12);
}
export function createParkPlaceTower(buildings: VBuilding[], grid: GroundGrid) {
  const shell = landmarkShell(
    buildings,
    grid,
    site,
    '25 Park Place',
    [341.49, -175.59],
    [24.7, -0.08],
    [
      [2, 2],
      [23, 55],
      [9, 63],
      [-24, 94],
      [22, 72],
    ],
  );
  if (!shell) return null;
  const wash = new Builder();
  bankTower(shell, wash);
  mediaPavilion(shell);
  const result = shell.finish('#edd8b0');
  const material = new MeshBasicMaterial({
    vertexColors: true,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    opacity: 0,
  });
  const ribs = new Mesh(wash.geometry(), material);
  ribs.visible = false;
  result.group.add(ribs);
  return {
    ...result,
    setNight(night: number) {
      result.setNight(night);
      material.opacity = 0.37 * night;
      ribs.visible = night > 0.001;
    },
  };
}
