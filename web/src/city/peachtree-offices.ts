import { Group } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
// Local metres east and south from the northwest corner of the Baker Street site.
const origin: P2 = [285, -921];
const coastalId = '2a1d8e6b-2b13-4c6a-8a27-d7520cd38bec';
const powerId = '312f9110-8d45-4b1a-8082-bb3720a51340';

function rectangle(l: number, t: number, r: number, b: number): P2[] {
  return [
    [l, t],
    [r, t],
    [r, b],
    [l, b],
  ];
}

function sides(plan: P2[], face: (a: P2, b: P2, length: number) => void) {
  const twiceArea = plan.reduce(
    (sum, [x, z], i) => sum + x * plan[(i + 1) % plan.length][1] - z * plan[(i + 1) % plan.length][0],
    0,
  );
  const points = twiceArea < 0 ? [...plan].reverse() : plan;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length],
      length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > 0.8) face(a, b, length);
  }
}

function coastalStates(m: Shell) {
  const stone = '#c9bfaa',
    glass = ['#486775', '#4e6e7a', '#587781', '#4b6875'];
  // The polished glass shaft projects over a recessed two-storey lobby.
  const plan: P2[] = [
    [38.6, 61.1],
    [76.23, 61.24],
    [76.1, 91.67],
    [38.45, 91.51],
  ];
  const lobby = rectangle(40.4, 63.1, 73.6, 89.5);
  m.prism(lobby, m.base, 329.25, '#616c6b', stone);
  sides(lobby, (a, b) => m.facade(a, b, m.base + 0.55, 329.12, 2, 2.15, 0.91, 0.93, ['#536667', '#657b7d'], 0.16));
  sides(plan, (a, b, len) => {
    const n = Math.max(2, Math.round(len / 7));
    for (let i = 0; i < n; i++) {
      const t = i / n,
        u = a[0] + t * (b[0] - a[0]),
        v = a[1] + t * (b[1] - a[1]);
      m.body.box(0.85, 329.3 - m.base, 0.85, u, (m.base + 329.3) / 2, v, stone);
    }
    m.body.tri([a[0], 329.25, a[1]], [b[0], 329.25, b[1]], [57.3, 329.25, 76.4], stone);
  });
  m.prism(plan, 329.25, 330.6, stone, '#999e98');
  m.prism(plan, 330.6, 429.6, '#354f5b', '#a9afaa');
  sides(plan, (a, b) => {
    m.facade(a, b, 330.65, 429.25, 25, 1.45, 0.94, 0.94, glass, 0.075);
  });
  m.prism(rectangle(46.1, 68.5, 65.1, 86.1), 429.6, 435.8, '#969d98', '#b7b7ad');
}

function georgiaPower(m: Shell) {
  const stone = '#d5cebb',
    shade = '#a49e90',
    glass = ['#60727a', '#536870', '#5b6c76'];
  // The baked outline includes the low parking and service wing fronting Baker.
  m.prism(m.ring, m.base, 328.3, '#b2a996', '#a6a69b');
  sides(m.ring, (a, b) => m.facade(a, b, m.base + 0.75, 327.7, 2, 4.8, 0.74, 0.58, ['#5e625e', '#73766e'], 0.026));
  const tower: P2[] = [
    [44.15, 11],
    [68.2, 11.08],
    [67.93, 52.91],
    [41.87, 52.73],
    [38.48, 52.74],
    [38.5, 47],
    [33.3, 47],
    [33.45, 18.5],
    [44.15, 18.5],
  ];
  m.prism(tower, 328.3, 405.5, stone, '#b4afa3');
  sides(tower, (a, b, len) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1];
    const bays = Math.max(1, Math.round(len / 7.8));
    const point = (t: number): P2 => [a[0] + dx * t, a[1] + t * dz];
    for (let i = 0; i < bays; i++) {
      // Continuous pale piers frame several floors of narrow, metal-divided glazing.
      const l = point((i + 0.085) / bays),
        r = point((i + 0.915) / bays);
      for (let j = 0; j < 4; j++) {
        const bottom = 331.1 + j * 18.22,
          top = bottom + 17.49;
        m.facade(l, r, bottom, top, 5, 1.53, 0.937, 0.94, glass, 0.1);
      }
    }
  });
  // North-west plant block is visible as a separate roof return at 412.6–413.1.
  m.prism(rectangle(33.7, 19.3, 55.8, 45.9), 405.5, 413.1, shade, '#b5b1a7');
  sides(rectangle(33.7, 19.3, 55.8, 45.9), (a, b) => m.facade(a, b, 406.4, 412.1, 4, 3.4, 0.84, 0.36, ['#73766f'], 0));
}

export function createPeachtreeOffices(buildings: VBuilding[], grid: GroundGrid) {
  const coastal = landmarkShell(
    buildings,
    grid,
    coastalId,
    '260 Peachtree · Coastal States',
    origin,
    [1, 0],
    [
      [40, 63],
      [74, 89],
    ],
  );
  const power = landmarkShell(
    buildings,
    grid,
    powerId,
    '270 Peachtree · Georgia Power',
    origin,
    [1, 0],
    [
      [6, 9],
      [66, 15],
      [39, 49],
    ],
  );
  if (!coastal || !power) return null;
  coastalStates(coastal);
  georgiaPower(power);
  const parts = [coastal.finish('#ecd9ac'), power.finish('#ecd9ac')],
    group = new Group();
  group.name = '260 and 270 Peachtree';
  group.add(...parts.map((p) => p.group));
  return {
    group,
    buildings: buildings.filter((b) => b.id !== coastalId && b.id !== powerId),
    setNight(night: number) {
      for (const part of parts) part.setNight(night);
    },
  };
}
