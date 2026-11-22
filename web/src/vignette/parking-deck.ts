import * as THREE from 'three';
import { Builder, pointInRing, rng, segDist, type P2 } from './geom';
import { appendParkedSedan } from './parked-sedan';
import type { VBuilding } from './world';

interface Deck {
  levels: number;
  colour: string;
  flat: string;
  occupancy: number;
  elevationAboveFoundation?: number;
  facade?: 'market' | 'hackney' | 'piedmont' | 'm';
  rampCenters?: number[];
  // Roof-local centre, width, depth and height of visible curbs or stair heads.
  fittings?: [number, number, number, number, number][];
  acrossRows?: boolean;
}

const decks = new Map<string, Deck>([
  [
    '72f23ef4-84a0-4567-9af7-4478de81418f',
    {
      levels: 4,
      colour: '#d1bfa5',
      flat: '#aaa49b',
      occupancy: 0.29,
      facade: 'market',
    },
  ],
  [
    '8f620b71-89f0-439f-8edd-d03cee0fe93f',
    {
      levels: 6,
      colour: '#cecac0',
      flat: '#95958d',
      occupancy: 0.1,
      facade: 'hackney',
      rampCenters: [-16, 24],
    },
  ],
  [
    '725df320-8835-4d58-8bac-b2deca3b5fdc',
    {
      levels: 10,
      elevationAboveFoundation: 28,
      facade: 'piedmont',
      colour: '#c8b898',
      flat: '#9e9380',
      occupancy: 0.14,
      acrossRows: true,
      fittings: [
        [17, -4, 0.55, 35, 0.65],
        [33, -22, 5, 10, 2.1],
      ],
    },
  ],
  [
    '1cb420c3-3cc0-4bad-9909-235620d77f61',
    {
      levels: 7,
      elevationAboveFoundation: 22,
      facade: 'm',
      colour: '#ded8c7',
      flat: '#aaa9a2',
      occupancy: 0.026,
      fittings: [
        [4, -3, 0.55, 54, 0.8],
        [-12, -24, 0.55, 11, 0.55],
        [-12, 20, 0.55, 11, 0.55],
      ],
    },
  ],
]);

type EdgeFace = (start: number, end: number, low: number, high: number, colour: string, inset?: number) => void;

// Piedmont encloses its ten levels behind five taller structural bays. The
// Armstrong elevation has metal screens extending down to the brick plinth.
function piedmontWall(
  face: EdgeFace,
  length: number,
  foot: number,
  base: number,
  crown: number,
  armstrong: boolean,
  entrance: boolean
) {
  const count = Math.max(1, Math.round(length / 8));
  const width = length / count;
  const pitch = (crown - base) / 5;

  for (let bay = 0; bay < count; bay++) {
    const start = bay * width,
      end = start + width;
    const brick = !armstrong && (bay < 2 || bay >= count - 2);
    const opening = entrance && !brick;
    const low = opening ? base + 2.75 : base + 1.45;
    face(start, end, foot, low, opening ? '#464848' : '#94755d', opening ? 0.6 : 0);
    face(start, end, low, crown, brick ? '#a5866c' : '#93968e', 0.24);
    face(start, start + 0.64, foot, crown, '#c7bba3');
    if (!brick) {
      const mid = start + width / 2;
      face(mid - .22, mid, low, crown, '#c6c8b9', .10);
      face(mid, mid + .16, low, crown, '#828984', .12);
      for (let level = 1; level < 10; level++) {
        const y = base + (level * pitch) / 2;
        face(start + 0.64, end, y - .55, y + .12, '#6e756e', .16);
      }
    }
  }
  for (let level = 1; level <= 5; level++) {
    const y = base + level * pitch;
    face(0, length, y - 0.36, y, '#cbbfa9', 0.04);
  }
}

/** Append to the ordinary building batch, using the caller's foundation. Height corrections are documented in docs/campus-decks.md. */
export function appendParkingDeck(b: Builder, building: VBuilding, foot: number, base: number, bakedRoof: number) {
  const deck = decks.get(building.id);
  if (!deck || building.cls !== 'parking' || !(bakedRoof > base + 5) || building.rings.length !== 1) return false;
  const outer = building.rings[0];
  if (outer.length < 3) return false;
  const roof = deck.elevationAboveFoundation === undefined ? bakedRoof : base + deck.elevationAboveFoundation;
  const area = THREE.ShapeUtils.area(outer.map(([x, z]) => new THREE.Vector2(x, z)));
  const pitch = (roof - base) / (deck.levels - 1);
  const rail = 1.1,
    slab = 0.36;
  const crown = roof + rail;
  const axis = (41 * Math.PI) / 180,
    c = Math.cos(axis),
    s = Math.sin(axis);
  // Roof striping is parallel to Jesse Hill. Work around the footprint's bounding
  // box centre so roof fittings and stripes keep the survey orientation.
  const xs = outer.map((p) => p[0]),
    zs = outer.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2,
    cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const uv = (x: number, z: number): P2 => [(x - cx) * c + (z - cz) * s, -(x - cx) * s + (z - cz) * c];
  const world = (u: number, v: number): P2 => [cx + c * u - s * v, cz + s * u + c * v];
  const pos = (p: P2, y: number) => [p[0], y, p[1]];
  const innerSign = Math.sign(area);
  for (let i = 0; i < outer.length; i++) {
    const [x, z] = outer[i],
      [ex, ez] = outer[(i + 1) % outer.length];
    const length = Math.hypot(ex - x, ez - z);
    if (length < 0.01) continue;
    const tx = (ex - x) / length,
      tz = (ez - z) / length;
    const p = (t: number, y: number, inset = 0) => [
      x + tx * t - innerSign * tz * inset,
      y,
      z + tz * t + innerSign * tx * inset,
    ];
    const face = (a: number, end: number, low: number, high: number, colour: string, inset = 0) =>
      b.quad(p(a, low, inset), p(end, low, inset), p(end, high, inset), p(a, high, inset), colour);
    if (deck.facade === 'piedmont') {
      const [u, v] = uv((x + ex) / 2, (z + ez) / 2);
      piedmontWall(face, length, foot, base, crown, v < -20, u < -30);
      // A cap and a shallow inner face read from the open parking roof.
      b.quad(p(0, crown), p(length, crown), p(length, crown, 0.28), p(0, crown, 0.28), '#dbd0b7');
      face(0, length, roof, crown, deck.colour, 0.28);
      continue;
    }
    const bays = Math.max(1, Math.round(length / (deck.facade === 'm' ? 13 : 8.4))),
      width = length / bays;
    // Slab noses and upstands follow the full perimeter, including the clipped Pratt corner.
    face(0, length, foot, base + rail, deck.colour);
    for (let level = 1; level < deck.levels; level++) {
      const y = base + level * pitch;
      face(0, length, y - slab, y + rail, deck.colour);
      b.quad(p(0, y - slab), p(length, y - slab), p(length, y - slab, 1.2), p(0, y - slab, 1.2), '#8d897d');
      if (level === deck.levels - 1) {
        b.quad(p(0, crown), p(length, crown), p(length, crown, 0.28), p(0, crown, 0.28), '#dfd9c8');
        face(0, length, roof, crown, deck.colour, 0.28);
      }
    }
    for (let bay = 0; bay < bays; bay++) {
      const a = bay * width,
        end = a + width,
        mid = (a + end) / 2;
      const [u, v] = uv(x + tx * mid, z + tz * mid);
      const glazedCore =
        (deck.facade === 'hackney' && u < -38 && (v < -27 || v > 32)) ||
        (deck.facade === 'm' && u > 16 && Math.abs(v) > 29);
      const market = deck.facade === 'market' && u < -32 && v < -35;
      const pier = Math.min(width / 2, deck.facade === 'm' ? 1.45 : 0.84);
      for (let level = 0; level < deck.levels - 1; level++) {
        const low = base + level * pitch + rail,
          high = base + (level + 1) * pitch - slab;
        const glazing = glazedCore || (market && level === 0);
        const inset = glazing ? 0.12 : 1.2;
        const pane = glazing ? '#677f83' : bay % 4 === 1 ? '#525650' : '#494c48';
        face(a, end, low, high, pane, inset);
        b.quad(p(a, low), p(end, low), p(end, low, inset), p(a, low, inset), '#b9b3a6');
        face(a, a + pier, low, high, bay % 3 === 0 ? '#b9b2a3' : deck.colour);
        b.quad(p(a + pier, low), p(a + pier, high), p(a + pier, high, inset), p(a + pier, low, inset), '#918c80');
        if (glazing) face(mid, mid + 0.12, low, high, '#b8bcb4', 0.07);
      }
    }
  }

  const local = outer.map(([x, z]) => uv(x, z));
  const rectangle = (u: number, v: number, w: number, d: number): P2[] => [
    [u - w / 2, v - d / 2],
    [u + w / 2, v - d / 2],
    [u + w / 2, v + d / 2],
    [u - w / 2, v + d / 2],
  ];
  // Two ramp openings are visible in the Hackney aerial. Their low ends disappear
  // beneath the roof. Butler has uninterrupted pale pavement across its top level.
  const holes = (deck.rampCenters ?? [])
    .map((u) => rectangle(u, 0, 5.2, 21))
    .filter((r) => r.every(([u, v]) => pointInRing(u, v, local)));
  const rings = [local, ...holes].map((r) => r.map(([u, v]) => new THREE.Vector2(u, v)));
  const vertices = rings.flat();
  for (const tri of THREE.ShapeUtils.triangulateShape(rings[0], rings.slice(1))) {
    const [a, d, e] = tri.map((i) => pos(world(vertices[i].x, vertices[i].y), roof));
    b.tri(a, e, d, deck.flat);
  }
  for (const hole of holes) {
    const [a, d, e, f] = hole.map(([u, v]) => world(u, v));
    b.quad(pos(a, roof - pitch), pos(d, roof - pitch), pos(e, roof), pos(f, roof), '#777971');
    b.quad(pos(a, roof), pos(d, roof), pos(d, roof - pitch), pos(a, roof - pitch), '#454943');
    b.tri(pos(a, roof), pos(f, roof), pos(a, roof - pitch), '#696961');
    b.tri(pos(d, roof), pos(d, roof - pitch), pos(e, roof), '#696961');
  }

  const exclusions = [...holes];
  for (const [u, v, w, d, height] of deck.fittings ?? []) {
    const box = rectangle(u, v, w, d);
    if (!box.every(([x, z]) => pointInRing(x, z, local))) continue;
    exclusions.push(box);
    const bottom = box.map(([x, z]) => pos(world(x, z), roof));
    const top = box.map(([x, z]) => pos(world(x, z), roof + height));
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      b.quad(bottom[i], bottom[j], top[j], top[i], deck.colour);
    }
    b.quad(top[0], top[1], top[2], top[3], '#ccc8b8');
  }

  // Draw parking lines and a few illustrative parked cars directly into this batch.
  // Keep their entire rectangles clear of parapets and ramp openings.
  const rowPoint = ([u, v]: P2): P2 => (deck.acrossRows ? [v, -u] : [u, v]);
  const pavement = (u: number, v: number) => (deck.acrossRows ? world(-v, u) : world(u, v));
  const perimeter = local.map(rowPoint);
  const keepClear = exclusions.map((box) => {
    const points = box.map(rowPoint);
    return [
      Math.min(...points.map((p) => p[0])),
      Math.max(...points.map((p) => p[0])),
      Math.min(...points.map((p) => p[1])),
      Math.max(...points.map((p) => p[1])),
    ];
  });
  const us = perimeter.map((p) => p[0]),
    vs = perimeter.map((p) => p[1]);
  const random = rng(41);
  for (let u = Math.ceil(Math.min(...us) / 16) * 16; u < Math.max(...us); u += 16) {
    for (let v = Math.min(...vs) + 4; v < Math.max(...vs); v += 2.7) {
      for (const side of [-1, 1]) {
        const center = u + side * 2.6;
        const ring = rectangle(center, v, 5.1, 2.6);
        if (!ring.every(([x, z]) => pointInRing(x, z, perimeter))) continue;
        if (perimeter.some((p, i) => segDist(center, v, p, perimeter[(i + 1) % perimeter.length]) < 3.3)) continue;
        if (
          keepClear.some(
            ([minU, maxU, minV, maxV]) =>
              center + 2.55 >= minU && center - 2.55 <= maxU && v + 1.3 >= minV && v - 1.3 <= maxV
          )
        )
          continue;
        const mark = rectangle(center, v - 1.25, 5.1, 0.14).map(([x, z]) => pos(pavement(x, z), roof + 0.035));
        b.quad(mark[0], mark[1], mark[2], mark[3], '#dfdccc');
        if (random() > deck.occupancy) continue;
        const paint = ['#a0abad', '#d4c9b6', '#a66f59', '#667a88'][Math.floor(random() * 4)];
        appendParkedSedan(
          b,
          pavement(center, v),
          roof,
          side * (deck.acrossRows ? -s : c),
          side * (deck.acrossRows ? c : s),
          paint
        );
      }
    }
  }
  return true;
}
