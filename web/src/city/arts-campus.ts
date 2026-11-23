import { localLandmarkShell } from './landmark-shell';
import { enamelBox, enamelGrid, entryRamp, type RampSpec } from './midtown-culture-high';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import sites from './fixtures/arts-campus.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;
const porcelain = '#f3f2ed',
  coping = '#e8e6de',
  roof = '#aaa8a1',
  glass = '#668087';
export const artsCampusIds = new Set(Object.values(sites).map((site) => site.id));

function museum(s: Shell, ramp: RampSpec, ground: (u: number, v: number) => number | null) {
  const { body, lights, prism } = s;
  prism(s.ring, s.base, 2.3, '#aca9a0', coping);

  // Wieland and Chambers follow the splayed western service street.
  const pavilions: { plan: P2[]; height: number }[] = [
    {
      plan: [
        [-54, -56],
        [-23, -56],
        [-23, -6],
        [-56, -6],
        [-65, -24],
      ],
      height: 26.6,
    },
    {
      plan: [
        [-67, -1],
        [-57, -1],
        [-56, 36],
        [-69, 40],
        [-80, 40],
      ],
      height: 18.8,
    },
    {
      plan: [
        [-82, 41],
        [-70, 41],
        [-70, 77],
        [-94, 77],
      ],
      height: 21.4,
    },
  ];
  for (const { plan, height } of pavilions) {
    prism(plan, 2.3, height, porcelain, coping);
    for (let i = 0; i < plan.length; i++) {
      const a = plan[i],
        b = plan[(i + 1) % plan.length];
      s.facade(a, b, 2.5, 6.2, 1, 2.7, 0.93, 0.95, [glass], 0.8);
      s.facade(a, b, 6.5, height - 0.2, 1, 2.45, 0.045, 0.98, ['#c2c6c4'], 0);
    }
    // Each north-light hood opens into a shaded reveal beneath a bent white shell.
    for (let u = -94; u < 0; u += 2.45)
      for (let v = -55; v < 78; v += 4.5) {
        if (!pointInRing(u - 1.1, v - 2, plan) || !pointInRing(u + 1.1, v + 2, plan)) continue;
        body.quad(
          [u - 1, height, v + 2],
          [u - 1, height + 1.55, v - 0.8],
          [u + 1, height + 1.55, v - 0.8],
          [u + 1, height, v + 2],
          porcelain,
        );
        body.quad(
          [u - 1, height, v - 1],
          [u + 1, height, v - 1],
          [u + 1, height + 1.55, v - 0.8],
          [u - 1, height + 1.55, v - 0.8],
          '#9faeb0',
        );
      }
  }

  // Stent gallery bars enclose the atrium on the north and west.
  body.box(47, 23, 19, 15, 13.8, -42, porcelain);
  body.box(22, 22, 44, -1, 13.3, -28, porcelain);
  // Meier's square enamel panels, read as joints on every white Meier volume.
  enamelBox(body, 47, 23, 19, 15, 13.8, -42, 2.3);
  enamelBox(body, 22, 22, 44, -1, 13.3, -28, 2.3);
  body.box(44, 0.35, 16, 15, 25.48, -42, roof);
  body.box(20, 0.35, 23, -1, 24.48, -18, roof);
  body.box(15, 4, 4, -17, 15, -34, '#b6c4c4');
  // Punched gallery windows and enamel panel joints on the Peachtree return.
  s.facade([38.6, -51.5], [38.6, -32.5], 3.5, 14.8, 3, 3.4, 0.61, 0.62, ['#5b6771', '#606f76'], 0.18);
  for (let y = 6; y < 24; y += 4) body.box(0.12, 0.09, 19, 38.56, y, -42, '#c7c8c6');
  prism(
    [
      [27, -32.5],
      [38, -32.5],
      [43, -28],
      [45, -23],
      [45, -19],
      [41, -16],
      [35, -16],
      [32, -21],
    ],
    2.3,
    12.8,
    porcelain,
    roof,
  );
  enamelGrid(
    body,
    [
      [27, -32.5],
      [38, -32.5],
      [43, -28],
      [45, -23],
      [45, -19],
      [41, -16],
      [35, -16],
      [32, -21],
    ],
    2.3,
    12.8,
  );
  for (const y of [4.8, 9.3]) {
    prism(
      [
        [37, -31],
        [43.3, -28],
        [45.2, -23],
        [45.2, -19],
        [41, -15.8],
        [35, -15.8],
        [32, -21],
      ],
      y,
      y + 1.35,
      glass,
      glass,
    );
  }
  for (let u = -6; u < 35; u += 7) body.box(4.2, 0.65, 4.2, u, 25.9, -38.5, '#a7b7b4');
  const centre: P2 = [10, -33],
    radius = 23;
  const arc = (angle: number, r: number, y: number) => [
    centre[0] + r * Math.cos(angle),
    y,
    centre[1] + r * Math.sin(angle),
  ];
  // The quarter-round atrium: glass panes set back inside a white frame of
  // mullions and floor bands, under a solid crown with small square windows.
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 32,
      b = ((i + 1) * Math.PI) / 32,
      m = (a + b) / 2;
    lights.quad(
      arc(a, radius - 0.25, 4),
      arc(a, radius - 0.25, 20),
      arc(b, radius - 0.25, 20),
      arc(b, radius - 0.25, 4),
      '#83999e',
    );
    for (const [y, h] of [
      [3.6, 0.9],
      [9.0, 0.8],
      [14.3, 0.8],
      [19.6, 0.9],
    ] as const)
      body.quad(
        arc(a, radius + 0.2, y),
        arc(a, radius + 0.2, y + h),
        arc(b, radius + 0.2, y + h),
        arc(b, radius + 0.2, y),
        porcelain,
      );
    for (const y of [6.6, 11.9, 17.2])
      body.quad(
        arc(a, radius + 0.05, y),
        arc(a, radius + 0.05, y + 0.18),
        arc(b, radius + 0.05, y + 0.18),
        arc(b, radius + 0.05, y),
        porcelain,
      );
    for (const t of [a, m]) {
      const p = arc(t, radius + 0.1, 12),
        wide = t === a && i % 4 === 0;
      const box = (w: number) => body.box(w, 16.4, w, p[0], 12, p[2], porcelain);
      box(wide ? 0.7 : t === a ? 0.42 : 0.2);
    }
    body.quad(
      arc(a, radius + 0.2, 20.5),
      arc(a, radius + 0.2, 22),
      arc(b, radius + 0.2, 22),
      arc(b, radius + 0.2, 20.5),
      porcelain,
    );
    if (i % 2 === 1) {
      const c0 = m - 0.012,
        c1 = m + 0.012;
      body.quad(
        arc(c0, radius + 0.26, 20.85),
        arc(c0, radius + 0.26, 21.65),
        arc(c1, radius + 0.26, 21.65),
        arc(c1, radius + 0.26, 20.85),
        '#5d686b',
      );
    }
    body.tri(arc(a, radius, 22), [10, 26, -33], arc(b, radius, 22), '#69777a');
    body.tri(arc(a, radius, 22.08), [10, 26.1, -33], arc(a + 0.012, radius, 22.08), coping);
  }
  prism(
    [
      [14, -8],
      [21, -12],
      [35, -5],
      [39, 0],
      [31, 10],
      [18, 2],
    ],
    2.3,
    12,
    porcelain,
    roof,
  );
  enamelGrid(
    body,
    [
      [14, -8],
      [21, -12],
      [35, -5],
      [39, 0],
      [31, 10],
      [18, 2],
    ],
    2.3,
    12,
  );
  // The diagonal Peachtree ramp climbs to the 2.3 m entry terrace.
  entryRamp(body, ramp, 2.3, ground);
}

function memorial(s: Shell) {
  s.prism(s.ring, s.base, 1.5, '#adaaa1', '#c7c1b2');
  // The two performance volumes share a low entrance terrace and tall outer colonnade.
  const block = (u: number, v: number, w: number, d: number, h: number, color: string) =>
    s.body.box(w, h - 1.5, d, u, (h + 1.5) / 2, v, color);
  block(-19, 76, 65, 82, 20, '#cac5ba');
  block(-14, 74, 37, 65, 27, '#bbbab4');
  block(35, 80, 50, 75, 18.2, '#afaca4');
  s.body.box(55, 1.25, 80, 35, 19, 80, coping);
  s.body.box(51, 0.28, 76, 35, 19.78, 80, roof);
  for (const v of [42, 118]) {
    for (let x = 10; x < 62; x += 5.4) {
      s.lights.box(4.7, 4.3, 0.35, x, 4, v, '#939394');
      s.body.box(0.67, 16.9, 0.84, x - 2.65, 10, v + (v === 42 ? -1 : 1), porcelain);
    }
  }
  for (let v = 42; v <= 118; v += 5.4) {
    s.lights.box(0.4, 4.3, 4.8, 60.1, 4, v, '#959091');
    s.body.box(0.85, 17, 0.68, 62, 10, v, porcelain);
  }
  s.body.box(8, 0.7, 32, 61, 6.7, 77, coping);
}

export function createArtsCampusLandmark(
  buildings: VBuilding[],
  site: VBuilding,
  base: number | null,
  groundAt: (x: number, z: number) => number | null,
) {
  const fixture = Object.values(sites).find((f) => f.id === site.id);
  if (!fixture || site.rings.length !== 1 || base === null) return null;
  const [x, z] = fixture.entrance,
    grade = groundAt(x, z);
  if (grade === null) return null;
  const shell = localLandmarkShell(
    buildings,
    site,
    fixture.name,
    [550, -3990],
    [0.878, -0.479],
    fixture.probes.map(([u, v]) => [u, v]),
    base - grade - 0.35,
    grade,
  );
  if (!shell) return null;
  if (site.id === sites.museum.id) {
    const local = (x: number, z: number): P2 => [
      (x - 550) * 0.878 + (z + 3990) * -0.479,
      (x - 550) * 0.479 + (z + 3990) * 0.878,
    ];
    const r = sites.museum.ramp;
    const ramp: RampSpec = {
      foot: local(r.foot[0], r.foot[1]),
      head: local(r.head[0], r.head[1]),
      stairTop: local(r.stairTop[0], r.stairTop[1]),
      stairFoot: local(r.stairFoot[0], r.stairFoot[1]),
      width: r.width,
    };
    museum(shell, ramp, (u, v) => {
      const y = groundAt(550 + u * 0.878 - v * -0.479, -3990 + u * -0.479 + v * 0.878);
      return y === null ? null : y - grade;
    });
    // Lay the piazza on the same rendered terrain as both entrances.
    const piazza: P2[] = [
      [-54, 0],
      [-28, 3],
      [-13, -5],
      [12, -5],
      [17, 0],
      [18, 31],
      [-53, 31],
    ];
    const angle = Math.atan2(-0.479, 0.878),
      c = Math.cos(angle),
      sn = Math.sin(angle);
    for (let u = -54; u < 18; u += 2)
      for (let v = -5; v < 31; v += 2) {
        const corners: P2[] = [
          [u, v],
          [u + 2, v],
          [u + 2, v + 2],
          [u, v + 2],
        ];
        if (!pointInRing(u + 1, v + 1, piazza)) continue;
        const points = corners.map(([a, b]) => {
          const y = groundAt(550 + a * c - b * sn, -3990 + a * sn + b * c);
          return y === null ? null : [a, y - grade + 0.16, b];
        });
        if (points.every((p): p is number[] => p !== null))
          shell.body.quad(points[3], points[2], points[1], points[0], '#c3b6a7');
      }
  } else memorial(shell);
  return shell.finish('#ffdab0', 0.68);
}
