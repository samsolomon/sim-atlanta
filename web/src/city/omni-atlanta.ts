import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

// The 2018 lidar separates the podium, room slab and raised roof blades.
const deck: P2[] = [
  [3.0, 10.0],
  [5.0, 3.0],
  [58.0, 3.0],
  [65.5, 12.0],
  [66.0, 29.0],
  [62.4, 43.0],
  [56.0, 43.0],
  [54.0, 48.0],
  [3.0, 48.0],
];
const tower: P2[] = [
  [-4.9, 41.61],
  [-4.75, 40.29],
  [15.8, 40.0],
  [21.8, 43.3],
  [53.0, 43.5],
  [58.0, 40.5],
  [61.0, 40.0],
  [63.0, 42.0],
  [63.0, 46.3],
  [60.5, 53.0],
  [58.63, 61.3],
  [-0.61, 62.5],
  [-9.56, 61.61],
  [-8.42, 50.55],
];
const upper: P2[] = [
  [-6.41, 45.46],
  [-5.33, 42.69],
  [16.18, 40.21],
  [21.8, 43.3],
  [53.0, 43.5],
  [54.84, 42.39],
  [58.0, 42.6],
  [60.0, 44.5],
  [59.6, 50.7],
  [53.7, 52.1],
  [-2.0, 52.3],
];
const service: P2[] = [
  [16.2, 62.5],
  [1.5, 62.5],
  [1.5, 40.2],
  [16.2, 40.22],
];
const southMain: P2[] = [
  [-14.67, 88.71],
  [3.98, 89.49],
  [13.4, 91.45],
  [13.4, 99.0],
  [18.1, 117.2],
  [33.21, 118.21],
  [32.92, 145.3],
  [14.21, 145.88],
  [14.22, 164.49],
  [-4.72, 165.44],
  [-22.22, 146.97],
  [-23.08, 120.76],
  [-22.1, 107.8],
  [-14.26, 99.55],
];
const southCrown: P2[] = [
  [-22.1, 107.8],
  [7.0, 133.0],
  [14.0, 143.0],
  [14.0, 164.5],
  [-4.72, 165.44],
  [-22.22, 146.97],
  [-23.08, 120.76],
];
export function createOmniAtlanta(buildings: VBuilding[], grid: GroundGrid) {
  const model = landmarkShell(
    buildings,
    grid,
    '74fe6c27-9599-458a-bf46-94111160bd53',
    'Omni Atlanta Hotel at Centennial Park',
    [-356.62, -583.56],
    [50, -47],
    [
      [10, 18],
      [6, 76],
      [2, 137],
    ],
  );
  if (!model) return null;
  const { base, ring, prism, facade, body } = model;
  // Find the surveyed bridge mouths even if a bake adds vertices or reverses the ring.
  const corners: P2[] = [
    [3.5, 62.9],
    [4.0, 89.5],
    [13.3, 91.5],
    [14.3, 62.6],
  ];
  function cornerIndices(plan: P2[]) {
    return corners.map(([x, z]) => plan.findIndex(([u, v]) => Math.hypot(x - u, z - v) < 0.7));
  }
  const start = cornerIndices(ring)[0];
  if (start < 0) return null;
  const rotated = [...ring.slice(start), ...ring.slice(0, start)];
  const order = cornerIndices(rotated);
  if (order.includes(-1)) return null;
  const plan = order[1] < order[3] ? rotated : [rotated[0], ...rotated.slice(1).reverse()];
  const [, southLeft, southRight, northRight] = cornerIndices(plan);
  if (!(southLeft < southRight && southRight < northRight)) return null;
  const south = plan.slice(southLeft, southRight + 1),
    north = [plan[0], ...plan.slice(northRight)];
  const bridge = [plan[0], plan[northRight], plan[southRight], plan[southLeft]];
  const limestone = '#d6c7ad',
    iron = '#6b777a',
    blue = ['#54727e', '#667f89', '#485e67'];
  prism(north, base, 333.9, '#bbab97', '#aca693');
  prism(deck, 333.9, 336.9, '#d7cec0', '#b7b4a5');
  prism(south, base, 334.2, '#b5a995', '#9e9c90');
  prism(southMain, 334.2, 375.4, '#c2b19b', '#969389');
  prism(southCrown, 375.4, 382.62, '#404d53', '#777673');
  prism(bridge, 327.35, 332.0, iron, '#b4b4ab');
  for (const [a, b] of [
    [bridge[1], bridge[2]],
    [bridge[3], bridge[0]],
  ])
    facade(a, b, 327.75, 331.2, 1, 2.4, 0.89, 0.9, blue, 0.32);
  for (let i = 0; i < southMain.length; i++) {
    const a = southMain[i],
      b = southMain[(i + 1) % southMain.length];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 8)
      facade(a, b, 335, 374.8, 12, 4.7, 0.88, 0.68, ['#555f60', '#4e5b60'], 0.13);
  }
  prism(tower, 327.5, 402.1, limestone, '#a19e98');
  prism(upper, 402.1, 407.4, '#50646e', '#9e9f9b');
  prism(service, 402.1, 409.2, '#a9aba5', '#a6a59c');
  for (const [plan, lo, hi, rows] of [
    [tower, 331.2, 401.65, 21],
    [upper, 402.2, 406.8, 2],
  ] as const) {
    for (let i = 0; i < plan.length; i++) {
      const a = plan[i],
        b = plan[(i + 1) % plan.length],
        length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const curtain = Math.abs(b[0] - a[0]) < length * 0.65 || Math.min(a[0], b[0]) > 51;
      facade(
        a,
        b,
        lo,
        hi,
        rows,
        curtain ? 2.05 : 3.45,
        curtain ? 0.98 : 0.77,
        curtain ? 0.94 : 0.69,
        blue,
        curtain ? 0.06 : 0.15,
      );
    }
  }
  // A lighter vertical fin and a stack of glazed corner bays mark the park end.
  for (const [u, v] of [
    [58.8, 42.7],
    [58.8, 52.9],
  ])
    body.box(0.62, 73, 1.0, u, 365.8, v, '#dae0d9');
  for (let i = 0; i < north.length; i++) {
    const a = north[i],
      b = north[(i + 1) % north.length];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 12) {
      // The baked northern ring runs clockwise in the local plane.
      facade(b, a, 318.3, 332.9, 3, 3.8, 0.8, 0.75, blue, 0.32);
    }
  }
  return model.finish();
}
