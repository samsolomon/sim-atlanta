import survey from '../../../pipeline/prototypes/connector-footprint/street-bridges.json';
import { Builder, segDist, type P2 } from '../vignette/geom';
import { PAL } from '../vignette/world';
import type { TerrainCity, TransportRun } from './transport-data';

type Point = [number, number, number]; // x, scene y, z
type Box = TerrainCity['bounds'];
type Deck = (typeof survey)[number];
type Ground = (x: number, z: number) => number | null;
const mix = (a: number, b: number, t: number) => a + t * (b - a);
const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Both edges of a skew abutment reach land on the same row. Row coordinates
// are (x,z,NAVD88) for each edge, followed by two curbs and the road centre.
function position(row: number[], fraction: number): P2 {
  return [mix(row[0], row[3], fraction), mix(row[1], row[4], fraction)];
}

function overlaps(deck: Deck, b: Box) {
  return deck.rows.some(
    (r) =>
      Math.max(r[0], r[3]) >= b.minX &&
      Math.min(r[0], r[3]) <= b.maxX &&
      Math.max(r[1], r[4]) >= b.minZ &&
      Math.min(r[1], r[4]) <= b.maxZ,
  );
}

// A scoped run may be split at a way or board boundary. Match the actual
// line, including its interior, never a nearby or crossing pedestrian bridge.
function follows(points: P2[], lines: number[][][]) {
  const on = (p: P2) =>
    lines.some((line) =>
      line.some((b, i) => i > 0 && segDist(p[0], p[1], line[i - 1] as P2, b as P2) < 0.09),
    );
  return (
    points.every(on) &&
    points.slice(1).every((b, i) => on([(points[i][0] + b[0]) / 2, (points[i][1] + b[1]) / 2]))
  );
}

type MountedDeck = { deck: Deck; streets: TransportRun[]; walks: TransportRun[][] };
const byCity = new WeakMap<TerrainCity, MountedDeck[]>();
function mountedDecks(city: TerrainCity) {
  const cached = byCity.get(city);
  if (cached) return cached;
  const result: MountedDeck[] = [];
  const runs = city.terrainTransport?.roads.filter((r) => r.kind === 'bridge' && r.pts.length >= 2) ?? [];
  for (const deck of survey) {
    if (!overlaps(deck, city.bounds)) continue;
    const streets = runs.filter(
      (r) => ['secondary', 'tertiary'].includes(r.cls) && follows(r.pts, deck.roads),
    );
    if (!streets.length) continue;
    const walks = deck.walks.map((lines) =>
      runs.filter((r) => r.cls === 'footway' && follows(r.pts, lines)),
    );
    result.push({ deck, streets, walks });
  }
  byCity.set(city, result);
  return result;
}

function clip(face: Point[], bounds: Box) {
  for (const [axis, edge, sign] of [
    [0, bounds.minX, 1],
    [0, bounds.maxX, -1],
    [2, bounds.minZ, 1],
    [2, bounds.maxZ, -1],
  ] as const) {
    if (!face.length) break;
    if (face.every((p) => sign * (p[axis] - edge) >= 0)) continue;
    const next: Point[] = [];
    let a = face.at(-1)!;
    for (const b of face) {
      const inside = sign * (b[axis] - edge) >= 0;
      if (inside !== sign * (a[axis] - edge) >= 0) {
        const t = (edge - a[axis]) / (b[axis] - a[axis]);
        next.push([mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]);
      }
      if (inside) next.push(b);
      a = b;
    }
    face = next;
  }
  return face;
}

export function drawStreetBridges(
  city: TerrainCity,
  zero: number,
  ground: Ground,
  builder: Builder,
  treads: Map<TransportRun, number[]>,
) {
  const replaced = new Set<TransportRun>();
  for (const { deck, streets, walks } of mountedDecks(city)) {
    for (const r of [...streets, ...walks.flat()]) replaced.add(r);
    function face(points: Point[], color: string, owners: TransportRun[] = []) {
      const polygon = clip(points, city.bounds);
      for (let i = 1; i + 1 < polygon.length; i++) {
        const start = builder.pos.length / 3;
        builder.tri(polygon[0], polygon[i], polygon[i + 1], color);
        for (const r of owners) {
          const indices = treads.get(r) ?? [];
          indices.push(start);
          treads.set(r, indices);
        }
      }
    }
    const { rows } = deck;
    function point(i: number, f: number, lift: number): Point {
      const row = rows[i],
        [x, z] = position(row, f);
      const edge = Math.min(
        distance(position(rows[0], f), [x, z]),
        distance(position(rows.at(-1)!, f), [x, z]),
      );
      let y = mix(row[2], row[5], f) - zero;
      if (edge < 7) {
        const approach = ground(x, z);
        if (approach !== null) y = mix(approach, y, edge / 7);
      }
      return [x, y + lift, z];
    }
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1],
        b = rows[i];
      function strip(
        leftA: number,
        rightA: number,
        leftB: number,
        rightB: number,
        height: number,
        color: string,
        owners?: TransportRun[],
      ) {
        face(
          [
            point(i - 1, leftA, height),
            point(i, leftB, height),
            point(i, rightB, height),
            point(i - 1, rightA, height),
          ],
          color,
          owners,
        );
      }
      function wall(fa: number, fb: number, base: number, top: number, color: string) {
        face([point(i - 1, fa, base), point(i, fb, base), point(i, fb, top), point(i - 1, fa, top)], color);
      }
      const pavement = 0.12,
        sidewalk = 0.27;
      strip(a[6], a[8], b[6], b[8], pavement, PAL.asphalt, streets);
      strip(0, a[6], 0, b[6], sidewalk, PAL.sidewalk, walks[0]);
      strip(a[8], 1, b[8], 1, sidewalk, PAL.sidewalk, walks[1]);
      wall(a[6], b[6], pavement, sidewalk, PAL.concrete);
      wall(a[8], b[8], pavement, sidewalk, PAL.concrete);
      const da = 0.12 / distance(position(a, 0), position(a, 1)),
        db = 0.12 / distance(position(b, 0), position(b, 1));
      strip(a[7] - da, a[7] + da, b[7] - db, b[7] + db, pavement + 0.016, PAL.lineYellow);
      for (const side of [0, 1]) {
        const sign = side ? -1 : 1;
        const fa = side + sign * da * 2.2,
          fb = side + sign * db * 2.2;
        wall(side, side, -0.8, 1.0, PAL.concreteDark);
        wall(fa, fb, sidewalk, 1.0, PAL.concrete);
        strip(
          Math.min(fa, side),
          Math.max(fa, side),
          Math.min(fb, side),
          Math.max(fb, side),
          1.0,
          PAL.concrete,
        );
      }
    }
  }
  return replaced;
}

// The visible bridge ends can be oblique by more than a sidewalk width. Bring
// each curb back to its own mapped ground path and the asphalt back to the
// width of the adjoining City street. The ground painter adds crosswalks last.
export function paintStreetBridgeApproaches(ctx: CanvasRenderingContext2D, city: TerrainCity) {
  function path(points: number[][]) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const [x, z] of points.slice(1)) ctx.lineTo(x, z);
  }
  for (const { deck } of mountedDecks(city)) {
    for (const approach of deck.approaches) {
      ctx.fillStyle = PAL.asphalt;
      path(approach.pavement);
      ctx.fill();
      ctx.fillStyle = PAL.sidewalk;
      for (const walk of approach.walks) {
        path(walk);
        ctx.fill();
      }
      ctx.strokeStyle = PAL.lineYellow;
      ctx.lineWidth = 0.24;
      path(approach.centre);
      ctx.stroke();
    }
  }
}
