import * as THREE from 'three';
import sites from '../../../pipeline/prototypes/connector-footprint/junction-decks.json';
import { Builder, segDist, pointInRing, type P2 } from '../vignette/geom';
import { PAL } from '../vignette/world';
import { follows } from './street-bridges';
import type { TerrainCity, TransportRun } from './transport-data';

const concrete = '#b4aaa0',
  sidewalk = '#c9c0af',
  park = '#bab1a1';
type Site = (typeof sites)[number];
// A transport run may concatenate a bridge sidewalk and its adjoining land way.
function outsideWalk(points: P2[], ring: P2[]) {
  const pieces: P2[][] = [];
  let active: P2[] | undefined;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      cuts = [0, 1];
    for (let j = 0; j < ring.length; j++) {
      const c = ring[j],
        d = ring[(j + 1) % ring.length],
        ex = d[0] - c[0],
        ez = d[1] - c[1],
        det = dx * ez - dz * ex;
      if (Math.abs(det) < 1e-8) continue;
      const t = ((c[0] - a[0]) * ez - (c[1] - a[1]) * ex) / det;
      const u = ((c[0] - a[0]) * dz - (c[1] - a[1]) * dx) / det;
      if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
    }
    cuts.sort((a, b) => a - b);
    const xy = (t: number): P2 => [a[0] + t * dx, a[1] + t * dz];
    for (let j = 1; j < cuts.length; j++) {
      if (pointInRing(...xy((cuts[j - 1] + cuts[j]) / 2), ring)) {
        active = undefined;
        continue;
      }
      if (!active) {
        active = [xy(cuts[j - 1])];
        pieces.push(active);
      }
      active.push(xy(cuts[j]));
    }
  }
  return pieces;
}
type Member = { site: Site; roads: TransportRun[]; walks: TransportRun[] };
const mounted = new WeakMap<TerrainCity, Member[]>();
function junctions(city: TerrainCity) {
  const cached = mounted.get(city);
  if (cached) return cached;
  const runs = city.terrainTransport?.roads.filter((r) => r.kind === 'bridge' && r.pts.length >= 2) ?? [];
  const result: Member[] = [];
  for (const site of sites) {
    const [xmin, zmin, xmax, zmax] = site.bounds;
    const near = runs.filter((r) =>
      r.pts.every(([x, z]) => x >= xmin - 0.15 && x <= xmax + 0.15 && z >= zmin - 0.15 && z <= zmax + 0.15),
    );
    const roads = near.filter(
      (r) => r.cls === 'secondary' && site.roads.some((line) => follows(r.pts, [line])),
    );
    if (!roads.length) continue;
    const walks = runs.filter(
      (r) =>
        (r.cls === 'footway' || r.cls === 'path') &&
        r.pts.some(([x, z]) => x >= xmin - 0.2 && x <= xmax + 0.2 && z >= zmin - 0.2 && z <= zmax + 0.2) &&
        r.pts.some(
          (p) =>
            pointInRing(...p, site.outline as P2[]) &&
            site.walks.some((line) => line.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.09)),
        ),
    );
    result.push({ site, roads, walks });
  }
  mounted.set(city, result);
  return result;
}

export function onJunction(city: TerrainCity, x: number, z: number) {
  return junctions(city).some(({ site }) => pointInRing(x, z, site.outline as P2[]));
}

export function junctionPortals(city: TerrainCity) {
  return junctions(city).flatMap(({ site }) =>
    site.portals.map((p) => {
      const [a, b] = p.edge,
        [dx, dz] = p.direction;
      const width = Math.abs((b[0] - a[0]) * dz - (b[1] - a[1]) * dx);
      const side = (1 - p.pavedWidth / width) / 2;
      return { ...p, slope: dx * site.plane[0] + dz * site.plane[1], curbs: [side, 1 - side] };
    }),
  );
}

// Carry the concrete pavement to the adjoining painted City street. Crosswalks
// in the common ground painter remain the last coat on the approach.
export function paintJunctionApproaches(ctx: CanvasRenderingContext2D, city: TerrainCity) {
  for (const p of junctionPortals(city)) {
    const [a, b] = p.edge,
      [dx, dz] = p.direction;
    const mx = (a[0] + b[0]) / 2,
      mz = (a[1] + b[1]) / 2;
    const sign = Math.sign((b[0] - a[0]) * -dz + (b[1] - a[1]) * dx);
    for (const [f, color, half] of [
      [0, sidewalk, 8],
      [p.curbs[0], concrete, 5.5],
    ] as const) {
      const shade = ctx.createLinearGradient(mx, mz, mx + dx * 30, mz + dz * 30);
      shade.addColorStop(0, color);
      shade.addColorStop(0.4, color);
      shade.addColorStop(1, f === 0 ? PAL.sidewalk : PAL.asphalt);
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.moveTo(a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]));
      ctx.lineTo(b[0] - f * (b[0] - a[0]), b[1] - f * (b[1] - a[1]));
      for (const s of [sign, -sign]) ctx.lineTo(mx + 30 * dx - s * dz * half, mz + 30 * dz + s * dx * half);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export function drawJunctionDecks(
  city: TerrainCity,
  zero: number,
  batch: Builder,
  treads: Map<TransportRun, number[]>,
  limits = new Map<TransportRun, number>(),
  landWalks = new Map<TransportRun, P2[][]>(),
) {
  return junctions(city).flatMap((member) => {
    for (const run of member.roads) {
      const i = member.site.roads.findIndex((line) => follows(run.pts, [line]));
      limits.set(run, member.site.roadWidths[i] / 2);
    }
    for (const run of member.walks) {
      limits.set(run, 2.5);
      const outside = outsideWalk(run.pts, member.site.outline as P2[]);
      if (outside.length) landWalks.set(run, outside);
    }
    return drawJunction(member, zero, batch, treads);
  });
}
function drawJunction(
  { site, roads, walks }: Member,
  zero: number,
  batch: Builder,
  treads: Map<TransportRun, number[]>,
) {
  const grade = (x: number, z: number) =>
    site.plane[2] + site.plane[0] * (x - site.origin[0]) + site.plane[1] * (z - site.origin[1]);
  type Pt = [number, number, number];
  const point = ([x, z]: number[], lift: number): Pt => [x, grade(x, z) - zero + lift, z];
  function surface(polygons: number[][][][], lift: number, color: string, runs: TransportRun[] = []) {
    for (const rings of polygons) {
      const vertices = rings.flat();
      const vectors = rings.map((r) => r.map(([x, z]) => new THREE.Vector2(x, z)));
      for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(vectors[0], vectors.slice(1))) {
        const start = batch.pos.length / 3;
        batch.tri(point(vertices[i], lift), point(vertices[k], lift), point(vertices[j], lift), color);
        for (const run of runs) {
          const indices = treads.get(run) ?? [];
          indices.push(start);
          treads.set(run, indices);
        }
      }
    }
  }
  const all = [...roads, ...walks];
  surface(site.pavement, 0.12, concrete, all);
  surface(site.sidewalk, 0.27, sidewalk, walks);
  surface(site.parks, 0.28, park);
  surface(site.quiltBase, 0.3, '#e6e2d6');
  surface(site.quilt, 0.32, '#45464a');
  surface(site.markings, 0.14, '#e5dfce');
  // Walls around the sidewalk create the curb reveal on the roadway.
  for (const rings of site.sidewalk)
    for (const ring of rings)
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i],
          b = ring[(i + 1) % ring.length];
        batch.quad(point(a, 0.12), point(b, 0.12), point(b, 0.27), point(a, 0.27), '#a69d91');
      }
  const outline = site.outline;
  // Split each perimeter edge at the road mouths before drawing the parapet.
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i] as P2,
      b = outline[(i + 1) % outline.length] as P2;
    batch.quad(point(a, -0.85), point(b, -0.85), point(b, 0.12), point(a, 0.12), '#827d75');
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.ceil(len / 1.5);
    for (let j = 0; j < n; j++) {
      const at = (t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const mid = at((j + 0.5) / n);
      if (site.portals.some(({ edge: [a, b] }) => segDist(...mid, [a[0], a[1]], [b[0], b[1]]) < 1)) continue;
      const u = at(j / n),
        v = at((j + 1) / n);
      batch.quad(point(u, 0.12), point(v, 0.12), point(v, 1.05), point(u, 1.05), '#9e978b');
    }
  }
  // Narrow steel rails and posts stand on the exposed diagonal park edges.
  function rail(a: number[], b: number[]) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]),
      n = Math.ceil(length / 2.7);
    for (let j = 0; j <= n; j++) {
      const f = j / n,
        x = a[0] + (b[0] - a[0]) * f,
        z = a[1] + (b[1] - a[1]) * f;
      batch.box(0.11, 0.8, 0.11, x, grade(x, z) - zero + 1.32, z, '#6b7271');
    }
    batch.quad(point(a, 1.64), point(b, 1.64), point(b, 1.76), point(a, 1.76), '#777d7b');
  }
  for (const rings of site.parks) {
    const ring = rings[0];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i],
        b = ring[(i + 1) % ring.length],
        mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (
        outline.some(
          (p, j) => segDist(mid[0], mid[1], p as P2, outline[(j + 1) % outline.length] as P2) < 2.2,
        )
      )
        rail(a, b);
    }
  }
  if (site.outlineId !== 953207661) return all;
  // Quilt Tradition: open steel canopy, seating blocks and the red arcade.
  // Heights and furniture spacing are estimated from the street-level view.
  const box = (x: number, z: number, w: number, h: number, d: number, bottom: number, color: string) =>
    batch.box(w, h, d, x, grade(x, z) - zero + 0.31 + bottom + h / 2, z, color);
  for (const x of [852.8, 858.8]) for (const z of [-946.5, -940.5]) box(x, z, 0.43, 3.9, 0.43, 0, '#32383c');
  for (let i = 0; i <= 5; i++) {
    box(855.8, -947.2 + i * 1.5, 8, 0.31, 0.24, 3.9, '#3c4245');
    box(852.1 + i * 1.5, -943.5, 0.24, 0.3, 8, 3.7, '#41474b');
  }
  for (const [x, z] of [
    [838, -937],
    [843, -937],
    [848, -938],
    [855, -936],
    [861, -937],
    [861, -944],
    [861, -951],
    [856, -950],
  ]) {
    box(x, z, 1.5, 0.63, 1.5, 0, '#656462');
  }
  for (let j = 0; j < 6; j++) {
    box(858.3, -968 - j * 3, 1, 3.9, 0.78, 0, '#b95545');
    box(858.83, -968 - j * 3, 0.08, 0.35, 0.27, 2.9, '#d5c9a8');
  }
  box(858.3, -975.5, 0.85, 0.7, 15.75, 3.55, '#c16450');
  return all;
}

export function junctionSoffits(city: TerrainCity, zero: number, out: Builder) {
  for (const { site } of junctions(city)) {
    const poly = site.outline.map(([x, z]) => new THREE.Vector2(x, z));
    const vertices = site.outline.map(([x, z]) => [
      x,
      site.plane[2] -
        zero -
        0.85 +
        (x - site.origin[0]) * site.plane[0] +
        (z - site.origin[1]) * site.plane[1],
      z,
    ]);
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(poly, []))
      out.tri(vertices[i], vertices[j], vertices[k], '#928b7d');
  }
}
