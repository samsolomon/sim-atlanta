import { Group } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { TerrainCity } from '../terrain/transport-data';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

// Street coordinates relative to the northwest of the market, in metres.
const origin: P2 = [105, -920];
const merchandiseId = '154b7076-e18b-49b0-8221-5c90e8bb6d6b';
const giftId = '5b26e4d5-8d9a-4282-b0f0-901a8899210f';
const apparelId = '3ead9055-6c68-4bcc-8ea0-48aabc7892eb';
const tedTurnerIds = [
  '506f9418-6335-42c2-8cd8-0c6f4c433a1c',
  'e266d754-e376-48d7-8074-7da7fcd453c4',
  '80e4242a-2033-4888-8617-9b56d0819b95',
  'dd9d8962-6e29-4780-8428-d7e1bc2ca896',
  '90d44efc-14aa-4b0e-925f-173eb8e813bc',
];
type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
const rect = (l: number, t: number, r: number, b: number): P2[] => [
  [l, t],
  [r, t],
  [r, b],
  [l, b],
];
function outline(plan: P2[]) {
  const area = plan.reduce(
    (a, [x, z], i) => a + x * plan[(i + 1) % plan.length][1] - z * plan[(i + 1) % plan.length][0],
    0,
  );
  return area < 0 ? [...plan].reverse() : plan;
}
function elevations(plan: P2[], face: (a: P2, b: P2, length: number) => void) {
  const ccw = outline(plan);
  for (let i = 0; i < ccw.length; i++) {
    const a = ccw[i],
      b = ccw[(i + 1) % ccw.length],
      length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > 2.5) face(a, b, length);
  }
}
// Both surveyed Gift Mart roof plates end at the same construction joint.
function splitAt(plan: P2[], cut: number, left: boolean): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < plan.length; i++) {
    const a = plan[i],
      b = plan[(i + 1) % plan.length],
      inside = left ? a[0] <= cut : a[0] >= cut;
    if (inside) out.push(a);
    if (inside !== (left ? b[0] <= cut : b[0] >= cut))
      out.push([cut, a[1] + ((b[1] - a[1]) * (cut - a[0])) / (b[0] - a[0])]);
  }
  return out;
}
function merchandise(m: Shell) {
  const stone = '#c5bbaa',
    baseGlass = ['#506269', '#657174'];
  m.prism(m.ring, m.base, 399.25, stone, '#b3aca0');
  const main = splitAt(m.ring, 237.5, true);
  m.prism(main, 399.25, 403.8, stone, '#aaa598');
  // Paired narrow lights flank the repeating concrete ribs.
  elevations(m.ring, (a, b, length) => {
    const n = Math.max(1, Math.round(length / 3.5)),
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      top = Math.max(a[0], b[0]) > 238 ? 398.7 : 403.2;
    const pt = (f: number): P2 => [a[0] + f * dx, a[1] + f * dz];
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n,
        [u, v] = pt(f);
      for (const side of [-1, 1]) {
        const mid = f + (side * 0.12) / n;
        m.facade(pt(mid - 0.068 / n), pt(mid + 0.068 / n), 326.2, top, 22, 20, 0.96, 0.82, baseGlass, 0.067);
      }
      const rib = (s: number, y: number, d: number) => [
        u + (dx * s) / n + (dz * d) / length,
        y,
        v + (dz * s) / n - (dx * d) / length,
      ];
      m.body.quad(
        rib(-0.035, 327, 0.1),
        rib(-0.035, top, 0.1),
        rib(0.035, top, 0.28),
        rib(0.035, 327, 0.28),
        '#e0d6c3',
      );
    }
    m.facade(a, b, 320.9, 325.3, 1, 3.1, 0.81, 0.94, baseGlass, 0.25);
  });
  m.prism(rect(144, 145, 192, 193), 403.8, 408.9, '#aca18d', '#b2afa7');
  m.prism(rect(193, 145, 205, 191), 403.8, 413.4, '#a59c8f', '#b7b3aa');
  for (const [u, v, w, d, h] of [
    [151, 208, 12, 14, 4.9],
    [181, 211, 11, 17, 3.6],
    [209, 151, 14, 9, 4.4],
  ])
    m.body.box(w, h, d, u + w / 2, 403.8 + h / 2, v + d / 2, '#96948c');
  // Barrel canopy projects from the north entrance on John Portman.
  for (let i = 0; i < 10; i++) {
    const edge = (j: number, v: number) => [
      197 + 6.8 * Math.cos((j * Math.PI) / 10),
      324.2 + 4.4 * Math.sin((j * Math.PI) / 10),
      v,
    ];
    m.body.quad(edge(i, 135), edge(i, 141.4), edge(i + 1, 141.4), edge(i + 1, 135), '#e2ded1');
  }
}
function gift(m: Shell) {
  const podium = '#d0cab9',
    glass = ['#446367', '#516d70', '#435b60'];
  // The upper floors project over the Portman sidewalk on freestanding columns.
  const lobby = m.ring.map(([u, v]): P2 => [u, Math.max(149.8, v)]);
  m.prism(lobby, m.base, 336.4, podium, '#afa99c');
  const low = splitAt(m.ring, 59.4, true),
    high = splitAt(m.ring, 59.4, false);
  for (const [plan, roof, rows] of [
    [low, 360.95, 5],
    [high, 389.25, 13],
  ] as const) {
    m.prism(plan, 336.4, roof, '#a8b0a8', '#c3c3b7');
    elevations(plan, (a, b) => {
      // Only the upper part of the taller plate is exposed at the joint.
      const joint = Math.abs(a[0] - 59.4) < 0.01 && Math.abs(b[0] - 59.4) < 0.01;
      if (joint && rows === 5) return;
      const lo = joint ? 360.95 : 336.5;
      m.facade(a, b, lo, roof - 0.42, joint ? 7 : rows, 2.45, 0.974, 0.92, glass, 0.022);
    });
  }
  m.body.quad([0.2, 336.4, 139.6], [121, 336.4, 140.6], [121, 336.4, 149.8], [0.2, 336.4, 149.8], podium);
  elevations(lobby, (a, b) => {
    m.facade(a, b, 316.6, 333.6, 3, 3.9, 0.77, 0.73, ['#7d9290', '#5e777a'], 0.11);
  });
  m.prism(rect(65, 146, 81, 187), 389.25, 394.9, '#b1ae9f', '#d2cab8');
  m.prism(rect(32, 143, 40.8, 186), 360.95, 367.75, '#ada99e', '#c4bfb0');
  for (const [u, v, radius, color] of [
    [3.5, 141.5, 1.24, '#a64333'],
    [117.2, 143, 1.24, '#a64333'],
    [10, 146, 2, podium],
    [111, 146, 2, podium],
  ] as const) {
    const column: P2[] = Array.from({ length: 12 }, (_, i) => [
      u + radius * Math.cos((i * Math.PI) / 6),
      v + radius * Math.sin((i * Math.PI) / 6),
    ]);
    m.prism(column, m.base, 336.4, color, '#bca69a');
  }
}
function apparel(m: Shell) {
  const lower = m.ring.map(([x, z]): P2 => [61 + (x - 61) * 0.956, 60 + (z - 60) * 0.956]);
  m.prism(lower, m.base, 323.4, '#596969', '#b2aca0');
  m.prism(m.ring, 323.4, 370.4, '#c5beb0', '#aca99f');
  elevations(lower, (a, b) => m.facade(a, b, 314, 322.75, 2, 3.3, 0.86, 0.89, ['#566a71', '#52626a'], 0.2));
  elevations(m.ring, (a, b, len) => {
    if (len < 10) return;
    const p = (t: number, y: number) => [
      a[0] + (b[0] - a[0]) * t + ((b[1] - a[1]) * 0.03) / len,
      y,
      a[1] + (b[1] - a[1]) * t - ((b[0] - a[0]) * 0.03) / len,
    ];
    for (let i = 1; i < 11; i++)
      m.body.quad(
        p(0, 323.4 + i * 4.12),
        p(0, 323.56 + i * 4.12),
        p(1, 323.56 + i * 4.12),
        p(1, 323.4 + i * 4.12),
        '#a8a395',
      );
  });
  // Alternating stair flights are visible through slots in all four round corner towers.
  for (const [u, v] of [
    [8.9, 6.6],
    [115.3, 7.6],
    [7.9, 113.0],
    [114.8, 114.0],
  ]) {
    const profile: P2[] = Array.from({ length: 18 }, (_, i) => [
      u + 5.65 * Math.cos((i * Math.PI) / 9),
      v + 5.65 * Math.sin((i * Math.PI) / 9),
    ]);
    m.prism(profile, m.base, 371.35, '#d5cec0', '#aba79c');
    for (let level = 0; level < 13; level++)
      for (let i = 0; i < 18; i++) {
        const edge = (j: number, dy: number) => {
          const phi = (j * Math.PI) / 9;
          return [u + 5.73 * Math.cos(phi), 319.4 + level * 3.9 + 1.15 * Math.cos(phi) + dy, v + 5.73 * Math.sin(phi)];
        };
        m.body.quad(edge(i, 0), edge(i, 1.48), edge(i + 1, 1.48), edge(i + 1, 0), '#585852');
      }
  }
  // The atrium fan and its radial glazing were raised during the vertical addition.
  const fan = (i: number, r: number, h: number) => [
    95 + r * Math.cos(Math.PI + (i * Math.PI) / 44),
    h,
    95 + r * Math.sin(Math.PI + (i * Math.PI) / 44),
  ];
  for (let i = 0; i < 22; i++) {
    const a = fan(i, 69, 375.1),
      b = fan(i + 1, 69, 375.1),
      c = fan(i + 1, 16.5, 373.3),
      d = fan(i, 16.5, 373.3);
    m.body.quad(a, b, c, d, '#a5aba2');
    m.body.quad(fan(i, 69, 370.4), a, b, fan(i + 1, 69, 370.4), '#8b8e82');
    m.body.quad(
      fan(i + 0.23, 64, 375.05),
      fan(i + 0.55, 64, 375.05),
      fan(i + 0.55, 20, 373.66),
      fan(i + 0.23, 20, 373.66),
      '#667c80',
    );
  }
  const theater: P2[] = [
    [78, 97],
    [82, 87],
    [98, 76],
    [105, 78],
    [111, 89],
    [113, 99],
    [111, 107],
    [105, 111],
    [90, 108],
    [79, 103],
  ];
  m.prism(theater, 370.4, 379.4, '#a7a69a', '#d0cfc3');
}
/** A batched, enclosed skywalk; the soffit is a separate face visible from the street. */
function skywalk(m: Shell, from: P2, to: P2, width: number, roof: number, arched = false) {
  const dx = to[0] - from[0],
    dz = to[1] - from[1],
    len = Math.hypot(dx, dz),
    r = width / 2,
    lo = roof - (arched ? 3.25 : 4.0);
  const pt = (t: number, w: number, y: number) => [
    from[0] + dx * t + (dz * w) / len,
    y,
    from[1] + dz * t - (dx * w) / len,
  ];
  m.body.quad(pt(0, -r, lo), pt(1, -r, lo), pt(1, r, lo), pt(0, r, lo), '#a69e8c');
  const eave = arched ? roof - 1.22 : roof;
  for (const side of [-1, 1]) {
    const w = side * r;
    m.body.quad(pt(0, w, lo), pt(0, w, eave), pt(1, w, eave), pt(1, w, lo), '#c8c5b7');
    const n = Math.max(2, Math.round(len / 2.1));
    for (let i = 0; i < n; i++) {
      const l = (i + 0.05) / n,
        h = (i + 0.95) / n,
        glass = w + side * 0.035,
        batch = i % 5 === 1 ? m.lights : m.body;
      batch.quad(
        pt(l, glass, lo + 0.68),
        pt(l, glass, eave - 0.15),
        pt(h, glass, eave - 0.15),
        pt(h, glass, lo + 0.68),
        '#596d71',
      );
    }
  }
  const segments = arched ? 10 : 1;
  for (let i = 0; i < segments; i++) {
    const edge = (j: number, t: number) =>
      pt(t, r * Math.cos((j * Math.PI) / segments), arched ? eave + 1.22 * Math.sin((j * Math.PI) / segments) : roof);
    m.body.quad(edge(i, 0), edge(i + 1, 0), edge(i + 1, 1), edge(i, 1), arched ? '#63757b' : '#b0b0a3');
  }
}
function matchesRun(points: P2[], from: P2, to: P2) {
  const near = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.25;
  const a = points[0],
    b = points[points.length - 1];
  return !!a && !!b && ((near(a, from) && near(b, to)) || (near(b, from) && near(a, to)));
}
const surveyedRuns: [P2, P2][] = [
  [
    [123.37, -799.66],
    [123.5, -780.2],
  ],
  [
    [154.19, -779.89],
    [154.16, -799.21],
  ],
  [
    [188.83, -779.37],
    [189.69, -798.74],
  ],
  [
    [88.1, -824.51],
    [105.61, -824.01],
  ],
];
export function createAmericasMart(buildings: VBuilding[], grid: GroundGrid) {
  const shell = (id: string, name: string, probes: P2[]) =>
    landmarkShell(buildings, grid, id, name, origin, [1, 0], probes);
  const one = shell(merchandiseId, 'Merchandise Mart', [
    [150, 160],
    [246, 171],
    [149, 253],
  ]);
  const two = shell(giftId, 'Gift Mart', [
    [8, 146],
    [109, 250],
  ]);
  const three = shell(apparelId, 'Apparel Mart', [
    [12, 12],
    [107, 107],
  ]);
  if (!one || !two || !three) return null;
  merchandise(one);
  gift(two);
  apparel(three);
  // Coordinates come from the centerlines and exterior survey in the study.
  // Several physically distinct spans have overlapping plan projections.
  for (const [v, top] of [
    [164.6, 333.75],
    [181.5, 371.4],
    [188.6, 346.85],
    [189.4, 357.1],
    [189.4, 367.0],
    [189.9, 388.1],
    [203.2, 329.2],
    [213.4, 381.25],
    [238.0, 343.5],
    [252.6, 349.45],
    [252.8, 377.75],
  ])
    skywalk(one, [119.6, v], [140.8, v + 0.15], 3.65, top);
  for (const [u, top] of [
    [18.4, 360],
    [31.9, 338.35],
    [49.2, 352.8],
    [84.3, 370.6],
    [92.1, 345.35],
  ])
    skywalk(one, [u, 120.0], [u, 141.2], 3.7, top, true);
  // The 1–3 corner bridge divides around the southeast stair tower.
  skywalk(one, [141, 142.2], [124.3, 126.4], 4, 328.0, true);
  skywalk(one, [124.3, 126.4], [111.5, 126.4], 3.65, 328.0, true);
  skywalk(one, [111.5, 126.4], [111.5, 120.3], 3.65, 328.0, true);
  skywalk(one, [124.3, 126.4], [124.3, 112.3], 3.65, 328.0, true);
  skywalk(one, [124.3, 112.3], [121.2, 112.3], 3.65, 328.0, true);
  skywalk(one, [-17.1, 95.5], [1.2, 96.0], 3.7, 324.1);
  const replaced = new Set([merchandiseId, giftId, apparelId, ...tedTurnerIds]);
  // Two named external destinations already have their own models. Replace only the link footprints.
  for (const [id, a, b, width, top] of [
    ['d5ffacff-cb63-4c32-a966-a2d21323f774', [255.2, 189.7], [279.0, 190.0], 3.25, 402.5],
    ['611ec9d1-fe49-476b-8af7-4d38dbe71254', [154.8, 263.6], [155.2, 282.8], 13.1, 334.3],
  ] as const) {
    if (buildings.some((b) => b.id === id)) {
      skywalk(one, [...a], [...b], width, top);
      replaced.add(id);
    }
  }
  const parts = [one.finish(), two.finish(), three.finish()],
    group = new Group();
  group.name = 'AmericasMart';
  group.add(...parts.map((p) => p.group));
  return {
    group,
    buildings: buildings.filter((b) => !replaced.has(b.id)),
    setNight(night: number) {
      for (const p of parts) p.setNight(night);
    },
    surfaceData(city: TerrainCity): TerrainCity {
      const data = city.terrainTransport;
      if (!data) return city;
      return {
        ...city,
        terrainTransport: {
          ...data,
          roads: data.roads.filter(
            (r) =>
              r.kind !== 'bridge' || r.cls !== 'pedestrian' || !surveyedRuns.some(([a, b]) => matchesRun(r.pts, a, b)),
          ),
        },
      };
    },
  };
}
