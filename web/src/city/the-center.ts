import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

// Street-frame outlines traced from the 2018 roof returns and clipped to The CTR parcel.
const office: P2[] = [
  [86.97, 8.69],
  [85.89, 21.65],
  [84.59, 27.87],
  [85.51, 30.15],
  [85.03, 39.26],
  [86.24, 47.31],
  [103.94, 66.45],
  [122.89, 65.63],
  [123.12, 46.45],
  [131.9, 46.44],
  [131.97, 74.6],
  [122.66, 74.07],
  [122.42, 83.1],
  [95.98, 84.98],
  [95.04, 101.84],
  [39.73, 101.87],
  [39.28, 92.92],
  [30.85, 84.77],
  [22.4, 92.93],
  [-33.16, 92.29],
  [-33.44, 83.26],
  [-31.7, 81.32],
  [-35.34, 77.36],
  [-37.0, 79.09],
  [-37.0, 64.0],
  [-15.0, 64.0],
  [3.0, 46.0],
  [3.0, 0.01],
  [85.63, 0.26],
];
const atrium: P2[] = [
  [86.57, 47.87],
  [91.0, 52.61],
  [91.0, 70.0],
  [84.0, 70.0],
  [84.0, 72.8],
  [39.0, 72.8],
  [39.0, 63.7],
  [-12.7, 63.7],
  [20.0, 31.0],
  [40.0, 31.0],
  [40.0, 18.0],
  [47.0, 18.0],
  [47.0, 31.0],
  [77.0, 31.0],
  [77.0, 17.0],
  [86.32, 17.0],
  [84.59, 27.87],
  [85.51, 30.15],
  [85.03, 39.26],
];
const terraces: { roof: number; plan: P2[] }[] = [
  {
    roof: 340.8,
    plan: [
      [3.0, 2.0],
      [3.0, 6.9],
      [-64.17, 74.07],
      [-66.58, 71.58],
    ],
  },
  {
    roof: 345.4,
    plan: [
      [3.0, 6.9],
      [3.0, 11.8],
      [-61.76, 76.56],
      [-64.17, 74.07],
    ],
  },
  {
    roof: 350.0,
    plan: [
      [3.0, 11.8],
      [3.0, 16.7],
      [-59.35, 79.05],
      [-61.76, 76.56],
    ],
  },
  {
    roof: 354.7,
    plan: [
      [3.0, 16.7],
      [3.0, 21.6],
      [-56.94, 81.54],
      [-59.35, 79.05],
    ],
  },
  {
    roof: 359.3,
    plan: [
      [-37.0, 64.0],
      [-37.0, 66.5],
      [-54.53, 84.03],
      [-56.94, 81.54],
      [3.0, 21.6],
      [3.0, 26.5],
      [-34.5, 64.0],
    ],
  },
  {
    roof: 363.9,
    plan: [
      [-37.0, 66.5],
      [-37.0, 71.4],
      [-52.12, 86.52],
      [-54.53, 84.03],
    ],
  },
  {
    roof: 363.9,
    plan: [
      [3.0, 26.5],
      [3.0, 31.4],
      [-29.6, 64.0],
      [-34.5, 64.0],
    ],
  },
  {
    roof: 368.5,
    plan: [
      [-37.0, 71.4],
      [-37.0, 76.3],
      [-49.71, 89.01],
      [-52.12, 86.52],
    ],
  },
  {
    roof: 368.5,
    plan: [
      [3.0, 31.4],
      [3.0, 36.3],
      [-24.7, 64.0],
      [-29.6, 64.0],
    ],
  },
  {
    roof: 373.1,
    plan: [
      [-37.0, 79.09],
      [-48.09, 90.69],
      [-49.71, 89.01],
      [-37.0, 76.3],
    ],
  },
  {
    roof: 373.1,
    plan: [
      [3.0, 36.3],
      [3.0, 41.2],
      [-19.8, 64.0],
      [-24.7, 64.0],
    ],
  },
  {
    roof: 377.8,
    plan: [
      [3.0, 46.0],
      [-15.0, 64.0],
      [-19.8, 64.0],
      [3.0, 41.2],
    ],
  },
];
export function createTheCenter(buildings: VBuilding[], grid: GroundGrid) {
  const model = landmarkShell(
    buildings,
    grid,
    '20a8be94-7717-42fd-a6e7-75c22214f4aa',
    'The Center',
    [-367.84, -436.17],
    [64, -61],
    [
      [20, 10],
      [55, 80],
      [-43, 64],
    ],
  );
  if (!model) return null;
  const { base, ring, prism, facade, body } = model;
  const stone = '#bfaf9a',
    parapet = '#a29785',
    windows = ['#485963', '#626867', '#454d52'];
  prism(ring, base, 334.2, stone, parapet);
  prism(office, 334.2, 375.4, stone, '#999489');
  for (const { plan, roof } of terraces) prism(plan, 334.2, roof, '#c5bbaa', '#a69d8b');
  for (let i = 0; i < office.length; i++) {
    const a = office[i],
      b = office[(i + 1) % office.length],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    if (len < 13) continue;
    const bays = Math.max(1, Math.round(len / 8.3));
    for (let j = 0; j < bays; j++) {
      const pt = (f: number): P2 => [a[0] + f * dx, a[1] + f * dz];
      facade(pt((j + 0.07) / bays), pt((j + 0.93) / bays), 334.45, 374.55, 12, 2.7, 0.95, 0.7, windows, 0.11);
    }
  }
  // The atrium has a dark raised roof with slanted clerestory glazing along its perimeter.
  prism(atrium, 375.4, 382.62, '#37444a', '#767472');
  for (let i = 0; i < atrium.length; i++) {
    const a = atrium[i],
      b = atrium[(i + 1) % atrium.length],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    if (len < 8 || (a[0] > 83 && b[0] > 83)) continue;
    const count = Math.max(1, Math.round(len / 3.3));
    const point = (f: number, y: number, e: number) => [
      a[0] + dx * f + (e * dz) / len,
      y,
      a[1] + dz * f - (e * dx) / len,
    ];
    for (let j = 0; j < count; j++)
      body.quad(
        point((j + 0.035) / count, 376.0, 1.65),
        point((j + 0.035) / count, 381.9, 0.05),
        point((j + 0.965) / count, 381.9, 0.05),
        point((j + 0.965) / count, 376.0, 1.65),
        '#819095',
      );
  }
  for (const [u, v, w, d, h] of [
    [9, 68, 11, 7, 3],
    [26, 4, 16, 12, 4],
    [52, 85, 14, 6, 3.1],
  ])
    body.box(w, h, d, u + w / 2, 375.4 + h / 2, v + d / 2, '#938c7c');
  // A low shopfront anchors the two long Marietta and park-side elevations.
  for (const [a, b] of [
    [office[14], office[15]],
    [office[18], office[19]],
  ])
    facade(a, b, 322.7, 332.9, 2, 3.3, 0.88, 0.88, ['#455962', '#536771'], 0.38);
  return model.finish();
}
