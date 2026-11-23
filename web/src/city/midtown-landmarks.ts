import { CylinderGeometry, DoubleSide, Mesh, MeshLambertMaterial, Vector3 } from 'three';
import { Builder, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';

export const midtownLandmarkIds = new Set(['osm:way:39449840', 'osm:way:208355446']);

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;
type Point = [number, number, number];
const bank = 'osm:way:39449840';

function rod(batch: Builder, a: Point, b: Point, radius: number, color: string) {
  const delta = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const mesh = new CylinderGeometry(radius, radius, delta.length(), 4);
  mesh.rotateX(Math.PI / 2);
  mesh.lookAt(delta);
  mesh.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  batch.addGeometry(mesh, color);
}

function tower(shell: Shell) {
  const { body, lights, prism } = shell;
  const rose = '#b58070',
    pier = '#c58d79',
    glass = '#505061';
  const plan = [...shell.ring];
  const signed = plan.reduce((sum, [x, z], i) => {
    const next = plan[(i + 1) % plan.length];
    return sum + x * next[1] - z * next[0];
  }, 0);
  if (signed < 0) plan.reverse();
  const outline = (scale: number): P2[] =>
    plan.map(([x, z]) => {
      // The broad central wings run to the roof. Only the intermediate shoulders step inward.
      return Math.max(Math.abs(x), Math.abs(z)) > 21 ? [x, z] : [scale * x, scale * z];
    });
  prism(plan, shell.base, 8, '#68595b', '#71615d');
  const random = rng(1992);
  for (const [lo, hi, scale, rows] of [
    [8, 151, 1, 33],
    [151, 216, 0.94, 15],
    [216, 238, 0.89, 5],
  ]) {
    const walls = outline(scale);
    prism(walls, lo, hi, rose, '#8e6c62');
    walls.forEach((a, i) => {
      const b = walls[(i + 1) % walls.length],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz);
      const pt = (u: number, y: number, depth: number): Point => [
        a[0] + (dx * u + depth * dz) / len,
        y,
        a[1] + (dz * u - depth * dx) / len,
      ];
      function panel(batch: Builder, u: number, v: number, y: number, top: number, depth: number, color: string) {
        batch.quad(pt(u, y, depth), pt(v, y, depth), pt(v, top, depth), pt(u, top, depth), color);
      }
      if (len > 15) {
        // One uninterrupted glass ribbon per bay. Projecting jambs shade its edges.
        const count = 8,
          margin = 1.15,
          pitch = (len - 2 * margin) / count;
        for (let bay = 0; bay < count; bay++) {
          const u = margin + bay * pitch,
            v = u + pitch - 0.48;
          panel(body, u, v, lo, hi, 0.07, glass);
          panel(body, v, u + pitch, lo, hi, 0.48, pier);
          body.quad(pt(v, lo, 0.07), pt(v, hi, 0.07), pt(v, hi, 0.48), pt(v, lo, 0.48), '#805a54');
          body.quad(
            pt(u + pitch, lo, 0.48),
            pt(u + pitch, hi, 0.48),
            pt(u + pitch, hi, 0.07),
            pt(u + pitch, lo, 0.07),
            '#93675e',
          );
          for (let floor = 0; floor < rows; floor++) {
            if (random() > 0.065) continue;
            const y = lo + ((floor + 0.16) * (hi - lo)) / rows;
            panel(lights, u + 0.1, v - 0.1, y, y + 2.4, 0.09, glass);
          }
        }
      } else if (
        Math.abs(dx * (a[0] + b[0]) + dz * (a[1] + b[1])) > Math.abs(dz * (a[0] + b[0]) - dx * (a[1] + b[1]))
      ) {
        // Narrow glass slots rise between successive punched masonry piers.
        panel(body, 0.58, len - 0.58, lo, hi, 0.07, glass);
        for (let floor = 0; floor < rows; floor++) {
          if (random() > 0.09) continue;
          const y = lo + ((floor + 0.18) * (hi - lo)) / rows;
          panel(lights, 0.72, len - 0.72, y, y + 2.1, 0.09, glass);
        }
      } else {
        // A single square punched opening on each short return separates the window banks.
        const half = Math.min(1.13, len * 0.22);
        for (let floor = 0; floor < rows; floor++) {
          const y = lo + ((floor + 0.22) * (hi - lo)) / rows;
          panel(random() < 0.09 ? lights : body, len / 2 - half, len / 2 + half, y, y + 2 * half, 0.07, '#50444b');
        }
      }
    });
  }

  // A dark roof and a short open bearing frame keep the cage visibly above the occupied shaft.
  const roof = outline(0.89);
  prism(roof, 238, 238.65, '#875f58', '#55464a');
  const steel = new Builder(),
    finial = new Builder();
  for (const [x, z] of roof) rod(steel, [x * 0.97, 238.65, z * 0.97], [x * 0.97, 242.4, z * 0.97], 0.48, rose);
  // The projecting ledges at each break follow all twenty reentrant corners of the footprint.
  for (let i = 0; i < roof.length; i++) {
    const a = roof[i],
      b = roof[(i + 1) % roof.length];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 15) continue;
    for (const t of [0.14, 0.86]) {
      const x = a[0] + (b[0] - a[0]) * t,
        z = a[1] + (b[1] - a[1]) * t;
      const foot = t < 0.5 ? a : b;
      rod(steel, [foot[0] * 0.97, 238.94, foot[1] * 0.97], [x * 0.98, 242.4, z * 0.98], 0.36, rose);
    }
  }
  const profile = [
    [242.4, 0.98],
    [251, 0.83],
    [265, 0.585],
    [277, 0.345],
    [285.2, 0.168],
  ];
  for (let tier = 1; tier < profile.length; tier++) {
    const [lo, s0] = profile[tier - 1],
      [hi, s1] = profile[tier];
    for (let side = 0; side < roof.length; side++) {
      const a = roof[side],
        b = roof[(side + 1) % roof.length];
      const point = (t: number, s: number, y: number): Point => [
        (a[0] + (b[0] - a[0]) * t) * s,
        y,
        (a[1] + (b[1] - a[1]) * t) * s,
      ];
      const bays = Math.max(1, Math.round((Math.hypot(b[0] - a[0], b[1] - a[1]) * s0) / 4.6));
      rod(steel, point(0, s0 + 0.012, lo), point(1, s0 + 0.012, lo), 0.64, '#c79684');
      for (let bay = 0; bay < bays; bay++) {
        const u = bay / bays,
          v = (bay + 1) / bays;
        rod(steel, point(u, s0, lo), point(u, s1, hi), 0.3, '#bc8d82');
        rod(steel, point(u, s0, lo), point(v, s1, hi), 0.19, '#af847d');
      }
      const courses = Math.ceil((hi - lo) / 1.25);
      for (let course = 1; course <= courses; course++) {
        const t = course / courses,
          y = lo + t * (hi - lo),
          s = s0 + t * (s1 - s0);
        rod(steel, point(0, s, y), point(1, s, y), 0.27, '#ceaaa0');
      }
    }
  }
  // Square-to-diamond transitions form the shoulders and folded highlights of the obelisk.
  const stations = [
    [285.2, 3.2, 0],
    [288.8, 3.0, 0],
    [292.5, 2.18, Math.PI / 4],
    [296.2, 1.72, 0],
    [308.6, 1.45, 0],
    [311.8, 0.04, 0],
  ];
  const corner = (side: number, [y, r, turn]: number[]): Point => [
    Math.cos((side * Math.PI) / 2 + Math.PI / 4 + turn) * r,
    y,
    Math.sin((side * Math.PI) / 2 + Math.PI / 4 + turn) * r,
  ];
  for (let i = 1; i < stations.length; i++)
    for (let side = 0; side < 4; side++) {
      const a = corner(side, stations[i - 1]),
        b = corner(side + 1, stations[i - 1]),
        c = corner(side + 1, stations[i]),
        d = corner(side, stations[i]);
      finial.tri(a, b, c, '#d1c1ab');
      finial.tri(a, c, d, i === 2 || i === 3 ? '#b8a48f' : '#d1c1ab');
    }
  const model = shell.finish('#ffe2b6', 0.75);
  function glowing(builder: Builder, name: string, emissive: string) {
    const material = new MeshLambertMaterial({
      vertexColors: true,
      side: DoubleSide,
      emissive,
      emissiveIntensity: 0,
    });
    const mesh = new Mesh(builder.geometry(), material);
    mesh.name = name;
    mesh.castShadow = true;
    model.group.add(mesh);
    return material;
  }
  const crown = glowing(steel, 'Terraced rose steel', '#ffae41');
  const obelisk = glowing(finial, 'Faceted obelisk', '#ffebba');
  return {
    ...model,
    setNight(night: number) {
      model.setNight(night);
      crown.emissiveIntensity = night * 1.45;
      obelisk.emissiveIntensity = night * 1.2;
    },
  };
}

function theatre(shell: Shell) {
  const { prism, body, lights } = shell;
  const buff = '#beaa85',
    cream = '#e8d4b3',
    shadow = '#574f4b';
  prism(shell.ring, shell.base, 9, buff, '#91887a');
  function block(x: number, z: number, w: number, d: number, lo: number, hi: number, wall: string, roof = cream) {
    prism(
      [
        [x - w / 2, z - d / 2],
        [x + w / 2, z - d / 2],
        [x + w / 2, z + d / 2],
        [x - w / 2, z + d / 2],
      ],
      lo,
      hi,
      wall,
      roof,
    );
  }
  function drum(x: number, z: number, y: number, r: number, profile: number[][], color: string) {
    for (let i = 1; i < profile.length; i++) {
      const [lo, a] = profile[i - 1],
        [hi, b] = profile[i];
      const piece = new CylinderGeometry(r * b, r * a, hi - lo, 12);
      piece.translate(x, y + (lo + hi) / 2, z);
      body.addGeometry(piece, color);
    }
  }
  // Thin alternating brick courses wrap the irregular retail frontage.
  const coursing = (a: P2, b: P2, lo: number, hi: number, pitch: number) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    const outward = (x: number, z: number, y: number) => [x + (0.07 * dz) / len, y, z - (0.07 * dx) / len];
    for (let y = lo; y < hi; y += pitch)
      body.quad(outward(...a, y), outward(...b, y), outward(...b, y + 0.23), outward(...a, y + 0.23), '#dcc7a1');
  };
  const area = shell.ring.reduce((n, a, i) => {
    const b = shell.ring[(i + 1) % shell.ring.length];
    return n + a[0] * b[1] - a[1] * b[0];
  }, 0);
  const outline = area > 0 ? shell.ring : [...shell.ring].reverse();
  outline.forEach((a, i) => coursing(a, outline[(i + 1) % outline.length], 1, 9, 1.15));
  // The auditorium and fly tower step up behind the low shops and entrance corridor.
  block(-22, -6, 61, 34, 8.9, 21, '#ab987d', '#807c74');
  block(-43, -5, 19, 36, 20.9, 27, buff, '#746e68');
  block(-18, 21, 29, 16, 8.9, 17.4, buff);
  for (const x of [-28, -8])
    drum(
      x,
      22,
      17.4,
      3.5,
      [
        [0, 1],
        [1, 1],
        [3, 0.7],
        [3.8, 0.15],
      ],
      '#a4bcb0',
    );
  drum(
    -18,
    22,
    17.4,
    6.7,
    [
      [0, 0.78],
      [1, 0.95],
      [3, 1],
      [5.6, 0.85],
      [8, 0.47],
      [9.5, 0.15],
      [10.6, 0.04],
    ],
    '#9ab7ac',
  );
  // Shallow roof lanterns and vent housings visible behind the Ponce entrance.
  for (const x of [2, 17, 32]) {
    block(x, 15, 7, 2.4, 9, 9.85, '#9e9b90', '#b2afa1');
    block(x + 1.9, 15, 1.7, 1.7, 9.85, 10.35, '#979b97');
  }
  block(19, -3, 9, 6, 9, 9.8, cream);
  for (let x = 15; x <= 23; x += 1.6) block(x, -3, 1.47, 5.7, 9.8, 10.1, '#709293', '#62898c');
  for (const x of [-48, -36]) block(x, -7, 5, 3, 27, 28, '#aaa497', '#bcb7a8');
  // Slim contrasting ribs curve across the glazed onion dome.
  const profile = [
    [0, 0.78],
    [1, 0.95],
    [3, 1],
    [5.6, 0.85],
    [8, 0.47],
    [9.5, 0.15],
    [10.6, 0.04],
  ];
  for (let j = 0; j < 12; j++) {
    const p = (h: number, r: number, twist: number): Point => [
      -18 + Math.cos((j * Math.PI) / 6 + twist) * 6.8 * r,
      17.4 + h,
      22 + Math.sin((j * Math.PI) / 6 + twist) * 6.8 * r,
    ];
    for (let i = 1; i < profile.length; i++) {
      const [lo, a] = profile[i - 1],
        [hi, b] = profile[i];
      for (const d of [-1, 1]) rod(body, p(lo, a, (i - 1) * d * 0.08), p(hi, b, i * d * 0.08), 0.09, '#826e65');
    }
  }
  coursing([8.5, 11], [-52, 11], 10, 21, 1.6);
  for (const x of [-42, -31, -20, -9, 2]) block(x, 10.9, 1.1, 0.65, 9, 21, '#c9b797');
  for (let i = 0; i < 4; i++) block(-18, 28.94, 29, 0.18, 10 + i * 1.8, 10.32 + i * 1.8, cream);
  // Recessed pointed portal on Ponce. The lower part is flush with the sloping frontage.
  const arch = (x: number, z: number, width: number, sill: number, spring: number, tip: number) => {
    body.quad(
      [x - width / 2, sill, z],
      [x - width / 2, spring, z],
      [x + width / 2, spring, z],
      [x + width / 2, sill, z],
      shadow,
    );
    body.tri([x - width / 2, spring, z], [x, tip, z], [x + width / 2, spring, z], shadow);
  };
  block(-18, 29.3, 13, 4.6, shell.base, 17, buff);
  arch(-18, 31.62, 8, 0, 10, 14.5);
  for (const x of [-29, -7]) {
    block(x, 28.9, 5, 2, shell.base, 17, buff);
    arch(x, 29.93, 2.5, 3, 6, 8);
    arch(x, 29.93, 2, 10, 12.6, 13.7);
  }
  for (const x of [1, 10, 19, 28, 37, 46]) {
    const z = 29.9 - (x + 1) * 0.083;
    arch(x, z + 0.15, 6, 1, 5.4, 7.3);
  }
  // Peachtree arcade occupies the eastward jog in the survey ring.
  block(51, -8, 12, 12, 8.9, 14, buff);
  block(55.1, -8.45, 5.7, 11.6, shell.base, 5, '#5d4a3e');
  for (const z of [-12.6, -10.5, -8.4, -6.3, -4.2]) {
    body.box(0.18, 3.9, 1.68, 58.02, 2.25, z, '#443d39');
    body.box(0.24, 0.19, 1.68, 58.05, 3.8, z, cream);
  }
  for (let z = -13; z < -2; z += 1.85) block(56.8, z, 0.55, 0.8, 14, 14.6, buff);
  for (const z of [-13.4, -2.9]) {
    drum(
      55,
      z,
      13.9,
      1.35,
      [
        [0, 1],
        [4.3, 0.72],
        [4.5, 1.15],
        [5.1, 1.15],
        [5.2, 0.72],
        [6.6, 0.72],
        [7.7, 0.12],
      ],
      cream,
    );
  }
  block(59, -8.5, 7.8, 11.8, 4.7, 6.2, '#9d302f', '#933d36');
  for (const z of [-14.46, -2.54]) lights.box(7.3, 0.85, 0.04, 59, 5.45, z, cream);
  lights.box(0.06, 0.85, 11.2, 62.92, 5.45, -8.5, cream);
  lights.box(7.9, 0.26, 11.9, 59, 4.85, -8.5, '#ffe6b2');
  lights.box(7.9, 0.19, 11.9, 59, 6.03, -8.5, '#ffe6b2');
  block(57.6, -8.5, 2.8, 0.62, 6.2, 19.7, '#ab2929', '#dfaf77');
  // Gold tube border around the vertical sign and warm transoms under the canopy.
  for (const z of [-8.84, -8.16]) {
    for (const x of [56.32, 58.88]) lights.box(0.12, 13.2, 0.07, x, 13, z, cream);
    for (const y of [6.45, 19.55]) lights.box(2.62, 0.15, 0.07, 57.6, y, z, cream);
  }
  for (const z of [-12.6, -10.5, -8.4, -6.3, -4.2]) lights.box(0.2, 0.55, 1.56, 58.08, 3.45, z, cream);
  // Twin-sided vertical lettering formed from strokes, visible along Peachtree.
  for (const z of [-8.85, -8.15]) {
    const stroke = (x: number, y: number, w: number, h: number) => lights.box(w, h, 0.05, x, y, z, '#ffe7ad');
    stroke(57, 16.9, 0.25, 2.1);
    stroke(57.6, 17.85, 1.4, 0.23);
    stroke(57.5, 17, 1.15, 0.22);
    for (const x of [57, 58.1]) stroke(x, 14.5, 0.22, 2.1);
    for (const y of [13.55, 15.45]) stroke(57.55, y, 1.26, 0.22);
    for (const d of [-1, 1]) rod(lights, [57.55 - d * 0.6, 10.8, z], [57.55 + d * 0.6, 12.8, z], 0.16, '#ffe7ad');
  }
  return shell.finish('#ffde9b', 1.15);
}

export function createMidtownLandmark(
  buildings: VBuilding[],
  site: VBuilding,
  base: number | null,
  groundAt: (x: number, z: number) => number | null,
) {
  if (!midtownLandmarkIds.has(site.id) || site.rings.length !== 1 || base === null) return null;
  const isBank = site.id === bank;
  const origin: P2 = isBank ? [504.6, -1886] : [556, -2080];
  const elevation = isBank ? groundAt(...origin) : groundAt(612, -2084);
  if (elevation === null || !Number.isFinite(elevation)) return null;
  const angle = isBank ? 0.804 : 0.074;
  const probes: P2[] = isBank
    ? [
        [-23, 0],
        [23, 0],
        [0, -24],
        [0, 23],
      ]
    : [
        [-52, 26],
        [-51, -22],
        [32, -30],
        [53, 23],
        [57, -8],
      ];
  const shell = localLandmarkShell(
    buildings,
    site,
    isBank ? 'Bank of America Plaza' : 'Fox Theatre',
    origin,
    [Math.cos(angle), Math.sin(angle)],
    probes,
    base - elevation - 0.35,
    elevation,
  );
  return shell && (isBank ? tower(shell) : theatre(shell));
}
