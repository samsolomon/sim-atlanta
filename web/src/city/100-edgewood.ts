import { CylinderGeometry } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const concrete = '#d6d4c7',
  soffit = '#a5a399',
  roof = '#b8b7ac';
const lobby = 310.1,
  officeBase = 317.76,
  tallRow = 370.96,
  roofDeck = 376.3,
  parapet = 377.55;
const rect = (x: number, z: number, X: number, Z: number): P2[] => [
  [x, z],
  [X, z],
  [X, Z],
  [x, Z],
];
const panes = ['#4b6579', '#527184', '#597889', '#476176', '#506b7d', '#647d89'];

function streetFrame(a: P2, b: P2) {
  const width = Math.hypot(b[0] - a[0], b[1] - a[1]),
    dx = (b[0] - a[0]) / width,
    dz = (b[1] - a[1]) / width;
  function plan(s: number, depth: number): P2 {
    return [a[0] + dx * s + dz * depth, a[1] + dz * s - dx * depth];
  }
  function at(s: number, y: number, depth: number) {
    const [u, v] = plan(s, depth);
    return [u, y, v];
  }
  return { width, plan, at };
}

// The painted concrete grid stands ahead of the window wall. The jambs and soffits
// belong to the outer frame, so their depth is visible from below and along Edgewood.
function officeFace(m: Shell, a: P2, b: P2, bays: number, seed: number) {
  const { width: w, plan, at } = streetFrame(a, b),
    pitch = w / bays,
    rand = rng(seed);
  const inner = -0.67;
  const beam = (lo: number, hi: number) => {
    m.body.quad(at(0, lo, 0), at(0, hi, 0), at(w, hi, 0), at(w, lo, 0), concrete);
    m.body.quad(at(0, lo, inner), at(0, lo, 0), at(w, lo, 0), at(w, lo, inner), soffit);
    m.body.quad(at(0, hi, inner), at(w, hi, inner), at(w, hi, 0), at(0, hi, 0), concrete);
  };
  for (let i = 0; i <= bays; i++) {
    const l = Math.max(0, i * pitch - 0.16),
      r = Math.min(w, i * pitch + 0.16);
    m.prism(
      [plan(l, 0), plan(r, 0), plan(r + 0.1, inner), plan(l - 0.1, inner)],
      officeBase,
      parapet,
      concrete,
      concrete,
    );
  }
  beam(officeBase - 0.48, officeBase + 0.43);
  const rowPitch = (tallRow - officeBase) / 15;
  for (let j = 0; j < 16; j++) {
    const y = officeBase + j * rowPitch,
      hi = j === 15 ? parapet : y + rowPitch;
    beam(hi - 0.26, hi);
    for (let i = 0; i < bays; i++) {
      const l = i * pitch + 0.1,
        r = (i + 1) * pitch - 0.1;
      const lit = rand() < 0.13;
      const builder = lit ? m.lights : m.body;
      builder.quad(
        at(l, y, inner),
        at(l, hi, inner),
        at(r, hi, inner),
        at(r, y, inner),
        panes[Math.floor(rand() * panes.length)],
      );
      if (rand() < 0.24) {
        const drop = (hi - y) * (0.18 + rand() * 0.34);
        m.body.quad(
          at(l, hi - drop, inner + 0.018),
          at(l, hi - 0.12, inner + 0.018),
          at(r, hi - 0.12, inner + 0.018),
          at(r, hi - drop, inner + 0.018),
          '#7e8887',
        );
      }
    }
  }
}

function entrance(m: Shell, plan: (u: number, v: number) => P2, grid: GroundGrid) {
  const at = (u: number, v: number, y: number) => {
    const [x, z] = plan(u, v);
    return [x, y, z];
  };
  const patch = (u: number, v: number, U: number, V: number) => [plan(u, v), plan(U, v), plan(U, V), plan(u, V)];
  const paving = '#aa9a89';
  m.prism(patch(-0.003, -0.025, 1.013, 1.0074), m.base, lobby, '#a9a398', paving);
  m.prism(patch(0.065, 0.09, 0.935, 0.852), lobby, officeBase, '#38454b', '#676c69');
  // The glass at the entrance is recessed behind a seven-bay colonnade.
  for (let i = 0; i < 12; i++) {
    const a = 0.19 + i * 0.054,
      b = a + 0.049;
    const batch = i === 6 || i === 8 ? m.lights : m.body;
    batch.quad(
      at(a, 0.854, lobby + 0.22),
      at(a, 0.854, 315.66),
      at(b, 0.854, 315.66),
      at(b, 0.854, lobby + 0.22),
      '#526775',
    );
    m.body.quad(at(a, 0.855, 313.83), at(a, 0.855, 313.93), at(b, 0.855, 313.93), at(b, 0.855, 313.83), '#87918e');
  }
  // The central pair of lobby doors is visible between the piers from the Edgewood steps.
  const doorPanel = (l: number, r: number, lo: number, hi: number, v: number, color: string) => {
    m.body.quad(at(l, v, lo), at(l, v, hi), at(r, v, hi), at(r, v, lo), color);
  };
  doorPanel(0.487, 0.544, lobby + 0.03, lobby + 3.21, 0.858, '#8d948a');
  for (const l of [0.489, 0.5168]) {
    doorPanel(l, l + 0.0255, lobby + 0.14, lobby + 2.42, 0.861, '#43535c');
    doorPanel(l, l + 0.0255, lobby + 2.55, lobby + 3.09, 0.861, '#576b72');
    const pull = l < 0.5 ? l + 0.021 : l + 0.003;
    doorPanel(pull, pull + 0.0015, lobby + 0.8, lobby + 1.35, 0.865, '#b6b2a3');
  }
  for (const v of [0.011, 0.986]) {
    for (let i = 0; i <= 7; i++) {
      const u = 0.009 + (i * 0.982) / 7;
      m.prism(patch(u - 0.0105, v - 0.019, u + 0.0105, v + 0.019), lobby, officeBase - 0.46, concrete, concrete);
    }
  }
  for (const u of [0.009, 0.991]) {
    for (let i = 1; i < 4; i++) {
      const v = 0.011 + (i * 0.975) / 4;
      m.prism(patch(u - 0.0105, v - 0.019, u + 0.0105, v + 0.019), lobby, officeBase - 0.46, concrete, concrete);
    }
  }
  m.body.quad(
    at(0, 0, officeBase - 0.46),
    at(1, 0, officeBase - 0.46),
    at(1, 1, officeBase - 0.46),
    at(0, 1, officeBase - 0.46),
    soffit,
  );
  // Level treads descend to the lower east sidewalk. At the uphill end the
  // pavement covers the last treads, and the handrail ends at the local grade.
  const landing = 1.0074,
    run = 0.0086,
    rise = 0.16,
    steps = 11;
  for (let i = 1; i <= steps; i++) {
    const height = lobby - i * rise;
    if (height > m.base)
      m.prism(patch(0.267, landing + (i - 1) * run, 0.738, landing + i * run), m.base, height, '#b8aea1', paving);
  }
  const length = Math.hypot(58.41, 0.74);
  for (const u of [0.276, 0.475, 0.729]) {
    const [x, z] = plan(u, landing + steps * run);
    const grade = grid.sample(528.03 + (58.41 * x - 0.74 * z) / length, -111.95 + (0.74 * x + 58.41 * z) / length);
    const visible = Math.max(1, Math.min(steps, Math.ceil((lobby - ((grade ?? m.base) + 0.14)) / rise)));
    const end = landing + visible * run,
      bottom = lobby - visible * rise;
    m.body.quad(
      at(u, landing, lobby + 0.87),
      at(u, landing, lobby + 0.96),
      at(u, end, bottom + 0.96),
      at(u, end, bottom + 0.87),
      '#575a55',
    );
    for (const fraction of [0, 0.5, 1]) {
      const v = landing + (end - landing) * fraction,
        y = lobby - visible * rise * fraction;
      m.prism(patch(u - 0.0008, v - 0.001, u + 0.0008, v + 0.001), y - 0.08, y + 0.9, '#5c5d54', '#65665c');
    }
  }
  for (const u of [0.22, 0.49, 0.78])
    m.lights.quad(
      at(u, 0.91, officeBase - 0.49),
      at(u + 0.02, 0.91, officeBase - 0.49),
      at(u + 0.02, 0.92, officeBase - 0.49),
      at(u, 0.92, officeBase - 0.49),
      '#d9d3b9',
    );
}

function roofPlant(m: Shell, outline: P2[]) {
  // The open western equipment bay is below the surrounding flat roof.
  const well = rect(10, 10.4, 17, 25.8);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const p = (a: P2, h: number) => [a[0], h, a[1]];
    m.body.quad(p(outline[i], roofDeck), p(outline[j], roofDeck), p(well[j], roofDeck), p(well[i], roofDeck), roof);
    m.body.quad(p(well[i], 374.8), p(well[j], 374.8), p(well[j], roofDeck), p(well[i], roofDeck), '#9c9e95');
    const { plan, width } = streetFrame(outline[i], outline[j]);
    // The concrete coping returns past the inset glazing on the roof side.
    m.prism([plan(0, 0), plan(width, 0), plan(width, -0.82), plan(0, -0.82)], roofDeck, parapet, concrete, concrete);
  }
  m.prism(rect(17, 10.4, 49.2, 25.8), roofDeck, 381.8, '#adb0a5', '#bebeb1');
  // The louvered west end screens an open well around the fans. Lidar reaches both
  // the well floor and the narrow top edge of the screen in the same metre of plan.
  for (const [l, v, L, V] of [
    [9.8, 10.28, 10.06, 25.98],
    [10.05, 10.28, 17.0, 10.54],
    [10.05, 25.73, 17.0, 25.99],
  ]) {
    m.prism(rect(l, v, L, V), roofDeck, 381.7, '#abb0a6', '#cbcbbf');
  }
  const slats = '#9b9e94';
  for (let x = 17.15; x < 49.2; x += 0.97) m.body.box(0.08, 5.4, 0.11, x, 379.06, 25.84, slats);
  // Three low louver housings and the pair of circular fans appear in the overhead image.
  for (const x of [22.8, 33.0, 43.0]) {
    m.prism(rect(x - 2.65, 20.8, x + 2.65, 24.15), 381.8, 382.52, '#a6a89e', '#c2c3b8');
    for (let u = x - 1.95; u < x + 2.4; u += 0.72) m.body.box(0.12, 0.09, 3.08, u, 382.56, 22.48, '#8e938b');
  }
  m.prism(rect(11.75, 14.5, 16.42, 21.45), 374.8, 380.2, '#a6aca3', '#b8bcb2');
  for (const z of [16.25, 19.72]) {
    m.body.addGeometry(new CylinderGeometry(1.47, 1.57, 1.25, 16).translate(14.08, 380.825, z), '#acb1a7');
    m.body.addGeometry(new CylinderGeometry(1.21, 1.21, 0.08, 16).translate(14.08, 381.49, z), '#747e79');
  }
  for (const x of [22.7, 42.7]) m.prism(rect(x - 0.82, 5.46, x + 0.82, 7.25), roofDeck, 377.32, '#a5a99b', '#c5c7b9');
}

export function createHundredEdgewood(buildings: VBuilding[], grid: GroundGrid) {
  const m = landmarkShell(
    buildings,
    grid,
    'f56ffe3c-cf56-4bc0-9ed3-eefadc1d7e89',
    '100 Edgewood Avenue',
    [528.03, -111.95],
    [58.41, 0.74],
    [
      [2, 2],
      [56, 2],
      [2, 32],
      [56, 32],
    ],
  );
  if (!m || m.ring.length !== 4) return null;
  const corners: P2[] = [
    [0, 0],
    [58.41, 0],
    [58.23, 34.73],
    [-0.18, 34.1],
  ];
  const [nw, ne, se, sw] = corners.map(([x, z]) => m.ring.find((p) => Math.hypot(p[0] - x, p[1] - z) < 1));
  if (!nw || !ne || !se || !sw) return null;
  const plan = (u: number, v: number): P2 => {
    const coord = (i: 0 | 1) => (1 - v) * (nw[i] + u * (ne[i] - nw[i])) + v * (sw[i] + u * (se[i] - sw[i]));
    return [coord(0), coord(1)];
  };
  entrance(m, plan, grid);
  m.prism(
    [plan(0.017, 0.027), plan(0.983, 0.027), plan(0.983, 0.973), plan(0.017, 0.973)],
    officeBase - 0.46,
    374.8,
    '#444f56',
    '#92978f',
  );
  officeFace(m, nw, ne, 21, 419);
  officeFace(m, ne, se, 12, 612);
  officeFace(m, se, sw, 21, 625);
  officeFace(m, sw, nw, 12, 201);
  roofPlant(m, [nw, ne, se, sw]);
  return m.finish('#f3e4c5');
}
