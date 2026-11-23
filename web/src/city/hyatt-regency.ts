import { DoubleSide, Group, Mesh, MeshLambertMaterial, ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const id = '0feb6547-009b-487f-954b-3a4f2a864df6';
const cream = '#d9cdb8',
  lip = '#eee3cf',
  glass = '#58646a',
  concrete = '#b7aa97';
const rect = (x: number, z: number, w: number, d: number): P2[] => [
  [x, z],
  [x + w, z],
  [x + w, z + d],
  [x, z + d],
];

export function createHyattRegency(buildings: VBuilding[], grid: GroundGrid) {
  const hotel = buildings.find((b) => b.id === id);
  if (!hotel || hotel.rings.length !== 1) return null;
  const lot = hotel.rings[0];
  // The original atrium, International slab and Radius drum share this baked lot.
  if (
    ![
      [443, -844],
      [399, -810],
      [455, -807],
      [490, -904],
    ].every(([x, z]) => pointInRing(x, z, lot))
  )
    return null;
  const grades = lot.map(([x, z]) => grid.sample(x, z));
  if (!grades.every((h): h is number => h !== null && Number.isFinite(h))) return null;
  const base = Math.min(...grades) - 0.4;
  const stone = new Builder(),
    occupied = new Builder(),
    blue = new Builder();
  const random = rng(1967);
  function mass(poly: P2[], bottom: number, top: number, wall: string, roof: string) {
    const at = (i: number, y: number) => [poly[i][0], y, poly[i][1]];
    for (let i = 0; i < poly.length; i++) {
      const j = (i + 1) % poly.length;
      stone.quad(at(i, bottom), at(j, bottom), at(j, top), at(i, top), wall);
    }
    for (const [a, b, c] of ShapeUtils.triangulateShape(
      poly.map(([x, z]) => new Vector2(x, z)),
      []
    ))
      stone.tri(at(a, top), at(c, top), at(b, top), roof);
  }
  function slab(x: number, z: number, w: number, d: number, top: number, floors: number, longFace: 'x' | 'z') {
    const poly = rect(x, z, w, d);
    mass(poly, 326.1, top, cream, '#c3bcae');
    for (let face = 0; face < 4; face++) {
      if ((face % 2 === 0) !== (longFace === 'x')) continue;
      const [a, b] = poly[face],
        [c, e] = poly[(face + 1) % 4],
        len = Math.hypot(c - a, e - b);
      const ux = (c - a) / len,
        uz = (e - b) / len;
      const p = (s: number, y: number, off: number) => [a + ux * s + uz * off, y, b + uz * s - ux * off];
      const panel = (l: number, r: number, y: number, t: number, off: number, col: string, bld = stone) =>
        bld.quad(p(l, y, off), p(r, y, off), p(r, t, off), p(l, t, off), col);
      const count = Math.max(4, Math.round(len / 3.75)),
        pitch = (len - 2) / count,
        step = (top - 327.4) / floors;
      for (let f = 0; f < floors; f++) {
        const y = 327.4 + f * step;
        for (let j = 0; j < count; j++) {
          const l = 1 + j * pitch;
          panel(
            l + 0.16,
            l + pitch - 0.16,
            y + 0.53,
            y + step - 0.32,
            0.055,
            glass,
            random() < 0.14 ? occupied : stone
          );
        }
        // Projecting precast balcony rails cast a thin shadow on the glazing.
        panel(0.55, len - 0.55, y + 0.17, y + 0.69, 0.52, lip);
        stone.quad(
          p(0.55, y + 0.69, 0.03),
          p(len - 0.55, y + 0.69, 0.03),
          p(len - 0.55, y + 0.69, 0.52),
          p(0.55, y + 0.69, 0.52),
          concrete
        );
      }
    }
  }
  // Rotating profiles are in radius and absolute elevation about the surveyed axis.
  function drum(x: number, z: number, profile: number[][], color: string, builder = stone, segments = 48) {
    const point = (i: number, r: number, y: number) => [
      x + r * Math.cos((i * 2 * Math.PI) / segments),
      y,
      z + r * Math.sin((i * 2 * Math.PI) / segments),
    ];
    for (let k = 1; k < profile.length; k++) {
      const [r0, y0] = profile[k - 1],
        [r1, y1] = profile[k];
      for (let i = 0; i < segments; i++) {
        if (r1 === 0) builder.tri(point(i, r0, y0), point(i + 1, r0, y0), [x, y1, z], color);
        else builder.quad(point(i, r0, y0), point(i + 1, r0, y0), point(i + 1, r1, y1), point(i, r1, y1), color);
      }
    }
  }

  mass(lot, base, 326.1, '#c1b8a6', '#b1aa99');
  mass(rect(409.2, -916, 95.4, 32.5), 326.1, 332, '#c6bca9', '#c3b8a3');
  // The pinwheel's four projecting bars wrap a raised, daylit atrium.
  slab(412.4, -883.0, 10.8, 44.5, 386.7, 19, 'z');
  slab(422.9, -881.0, 50.6, 10.4, 386.7, 19, 'x');
  slab(463.1, -870.2, 10.7, 42.5, 386.7, 19, 'z');
  slab(411.7, -838.8, 51.2, 11.2, 386.7, 19, 'x');
  mass(rect(422.4, -871.3, 41.3, 33.2), 326.2, 393.9, '#b7aa91', '#d5cbb5');
  // Narrow skylights read between the raised mechanical beams.
  for (let x = 424; x < 463; x += 3.15)
    for (let z = -869.7; z < -838.8; z += 3.15) stone.box(1.65, 0.23, 1.6, x, 394.02, z, '#9dacae');
  for (const x of [422.0, 463.3]) stone.box(0.98, 1.08, 45.5, x, 393.9, -852.8, lip);

  // International Tower to the southwest, and its distinct dark cylindrical neighbor.
  slab(385.5, -827.7, 29.5, 31.1, 392.8, 20, 'x');
  mass(rect(386.9, -820.8, 25.8, 14.8), 392.8, 398.15, '#bcad95', '#d4cbb9');
  const rx = 454.8,
    rz = -806.6;
  drum(
    rx,
    rz,
    [
      [10.2, 326.2],
      [10.2, 395.3],
      [0, 395.3],
    ],
    '#544e48'
  );
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24,
      b = ((i + 1) * Math.PI) / 24;
    const point = (theta: number, y: number) => [rx + 10.24 * Math.cos(theta), y, rz + 10.24 * Math.sin(theta)];
    for (let row = 0; row < 21; row++) {
      const y = 326.8 + row * 3.25;
      const panes = random() < 0.07 ? occupied : stone;
      panes.quad(
        point(a + 0.005, y + 0.28),
        point(b - 0.005, y + 0.28),
        point(b - 0.005, y + 3.1),
        point(a + 0.005, y + 3.1),
        ['#514d4a', '#635955', '#524e4b', '#5a514c'][Math.floor(i / 4) % 4]
      );
    }
  }
  for (let i = 0; i < 21; i++) {
    const y = 326.8 + i * 3.25;
    drum(
      rx,
      rz,
      [
        [10.27, y],
        [10.27, y + 0.22],
      ],
      '#9a8d7c'
    );
  }
  drum(
    rx,
    rz,
    [
      [10.5, 393.9],
      [10.5, 395.6],
      [9.6, 395.6],
      [9.6, 395.35],
    ],
    '#b3aca1'
  );
  // The pool occupies the lower east terrace, behind the original slab.
  stone.box(9.8, 0.35, 18, 483, 326.29, -848.5, '#c8c2ae');
  stone.box(6.9, 0.14, 14.8, 483, 326.52, -848.5, '#77b3bd');

  const cx = 443.0,
    cz = -844.1;
  drum(
    cx,
    cz,
    [
      [4.65, 393.9],
      [4.65, 405.8],
    ],
    '#6d7776'
  );
  for (let i = 0; i < 10; i++) {
    const theta = (i * 2 * Math.PI) / 10;
    stone.box(0.53, 10.4, 0.53, cx + 4.7 * Math.cos(theta), 399.55, cz + 4.7 * Math.sin(theta), cream);
  }
  drum(
    cx,
    cz,
    [
      [4.7, 404.1],
      [13.8, 405.6],
      [13.85, 406.15],
      [12.55, 406.3],
    ],
    lip
  );
  drum(
    cx,
    cz,
    [
      [12.55, 406.14],
      [12.55, 408.25],
    ],
    '#435461'
  );
  drum(
    cx,
    cz,
    [
      [12.55, 408.17],
      [13.8, 408.48],
      [13.4, 409.2],
      [10.35, 410.35],
      [9.25, 410.45],
    ],
    cream
  );
  const radius = 9.3,
    rise = 6.78,
    spring = 410.43;
  const arc = (angle: number) => [radius * Math.cos(angle), spring + rise * Math.sin(angle)];
  const dome = Array.from({ length: 9 }, (_, i) => arc((i * Math.PI) / 16));
  dome[8] = [0, spring + rise];
  drum(cx, cz, dome, '#2e6592', blue);
  for (let i = 1; i < 7; i++) {
    const theta = (i * Math.PI) / 16;
    const a = arc(theta - 0.012),
      b = arc(theta + 0.012);
    drum(
      cx,
      cz,
      [
        [a[0] + 0.04, a[1]],
        [b[0] + 0.04, b[1]],
      ],
      '#afd5e6',
      blue
    );
  }
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI) / 12;
    const point = (r: number, y: number, a: number) => [
      cx + (r + 0.045) * Math.cos(a),
      y + 0.035,
      cz + (r + 0.045) * Math.sin(a),
    ];
    for (let k = 1; k < 8; k++) {
      const [r0, y0] = dome[k - 1],
        [r1, y1] = dome[k];
      stone.quad(
        point(r0, y0, angle - 0.007),
        point(r0, y0, angle + 0.007),
        point(r1, y1, angle + 0.007),
        point(r1, y1, angle - 0.007),
        '#536477'
      );
    }
  }
  const group = new Group();
  group.name = 'Hyatt Regency Atlanta and Polaris';
  group.position.y = -grid.manifest.vertical.sceneZeroNavd88M;
  const material = (emissive: string) =>
    new MeshLambertMaterial({ side: DoubleSide, vertexColors: true, emissive, emissiveIntensity: 0 });
  const bulk = new Mesh(stone.geometry(), material('#000000'));
  bulk.castShadow = bulk.receiveShadow = true;
  const lit = material('#f2d69d'),
    beacon = material('#297ed9');
  group.add(bulk, new Mesh(occupied.geometry(), lit), new Mesh(blue.geometry(), beacon));
  return {
    group,
    buildings: buildings.filter((b) => b !== hotel),
    setNight(dark: number) {
      lit.emissiveIntensity = dark * 0.55;
      beacon.emissiveIntensity = dark * 1.65;
    },
  };
}
