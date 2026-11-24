import * as THREE from 'three';
import { Builder, Line, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import { roadWidth, type TerrainCity } from './transport-data';
import { triangleHeight } from './tread-height';

type Ground = (x: number, z: number) => number | null;
/** Finest column of an approach cross-section, and how far the drawn surface may
 * stray from the board's own height before another column is kept. */
export const JOINT_COLUMN_M = 1.25, JOINT_TOLERANCE_M = 0.12;

/** Keep only the candidate columns needed to hold every row within tolerance of a
 * straight line between kept columns (Douglas-Peucker across all rows at once). */
export function keepColumns(xs: readonly number[], rows: readonly (readonly number[])[], tolerance = JOINT_TOLERANCE_M) {
  const keep = new Set([0, xs.length - 1]);
  const split = (i0: number, i1: number) => {
    let worst = tolerance, at = -1;
    for (let i = i0 + 1; i < i1; i++) {
      const f = (xs[i] - xs[i0]) / (xs[i1] - xs[i0]);
      for (const h of rows) {
        const e = Math.abs(h[i] - (h[i0] + f * (h[i1] - h[i0])));
        if (e > worst) { worst = e; at = i; }
      }
    }
    if (at < 0) return;
    keep.add(at);
    split(i0, at);
    split(at, i1);
  };
  split(0, xs.length - 1);
  return [...keep].sort((a, b) => a - b);
}
export interface Portal {
  /** Left and right outside corners, as x, z, absolute NAVD88 metres. */
  edge: number[][];
  direction: number[];
  curbs: number[];
  slope?: number;
  /** An inferred landing (transport.ts landingPortals): no link ramp starts on it. */
  landing?: boolean;
  /** The deck a landing approach continues: it samples the approach, even as a motorway. */
  road?: P2[];
}

// The gridded bare earth may continue at freeway level several cells beyond
// an abutment. Carry the approach out to a land cross-section, then tie into
// the drawn terrain there. A separate retaining face leaves the cut open.
export function bridgeApproaches(
  portals: Portal[],
  zero: number,
  bare: Ground,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  roads: TerrainCity['roads'] = [],
) {
  const top = new Builder(),
    walls = new Builder(),
    uv: number[] = [];
  const index = new PlacementIndex<number>(16);
  /** Where each approach meets the board: point(u, d) is u ∈ [0, 1] across the toe,
   * d metres back from the toe toward the structure. */
  const joints: { name: string; length: number; point(u: number, d: number): P2 }[] = [];
  /** A side wall from the approach edge down to the board. Where the board rises to
   * the edge, the wall stops there rather than folding inside out (a dark notch). */
  function skirt(u: number[], v: number[]) {
    const foot = (p: number[]) => Math.min(p[1], bare(p[0], p[2]) ?? p[1]);
    const [fu, fv] = [foot(u), foot(v)];
    if (u[1] - fu < 0.03 && v[1] - fv < 0.03) return;
    walls.quad(u, v, [v[0], fv, v[2]], [u[0], fu, u[2]], '#9c9384');
  }
  // Outer side walls wait until every approach top exists: where a neighbouring
  // approach already covers the ground beside a wall, the wall would only show as a
  // dark slot between the two surfaces from above.
  const sideWalls: { u: number[]; v: number[]; out: number[]; owner: number }[] = [];
  const owners: number[] = [];
  let portalIndex = -1;
  const landingOwners = new Set(portals.flatMap((portal, i) => (portal.landing ? [i] : [])));
  function tri(a: number[], b: number[], c: number[]) {
    const i = top.pos.length / 3;
    // The two banks of a bridge have opposite outward normals.
    if ((b[2] - a[2]) * (c[0] - a[0]) < (b[0] - a[0]) * (c[2] - a[2])) [b, c] = [c, b];
    top.tri(a, b, c, '#ffffff');
    owners.push(portalIndex);
    index.add(
      i,
      [a, b, c].map((p) => [p[0], p[2]]),
    );
    for (const [x, , z] of [a, b, c])
      uv.push(
        (x - bounds.minX) / (bounds.maxX - bounds.minX),
        (bounds.maxZ - z) / (bounds.maxZ - bounds.minZ),
      );
  }
  for (const {
    edge: [a, b],
    direction: [dx, dz],
    curbs,
    slope,
    landing,
  } of portals) {
    portalIndex++;
    const xy = (f: number, s: number): P2 => [
      a[0] + (b[0] - a[0]) * f + dx * s,
      a[1] + (b[1] - a[1]) * f + dz * s,
    ];
    const deck = (f: number) => a[2] + (b[2] - a[2]) * f - zero;
    const bands = [0, curbs[0], 0.5, curbs[1], 1];
    if (bands.some((f) => bare(...xy(f, 0)) === null)) continue;
    let length = 0;
    for (let s = 4; s <= (slope === undefined ? 72 : 100); s += 4) {
      const ys = bands.map((f) => bare(...xy(f, s)));
      if (ys.some((y) => y === null)) break;
      length = s;
      if (slope === undefined) {
        if (s >= 12 && ys.every((y, i) => Math.abs(y! - deck(bands[i])) <= 0.55 + 0.035 * s)) break;
      } else if (s >= (landing ? 12 : 40) && ys.every((y, i) => Math.abs(y! - deck(bands[i]) - slope * s) <= 0.35 + 0.025 * s))
        break;
    }
    if (length === 0) continue;
    joints.push({ name: 'deck ' + a.slice(0, 2).map(Math.round).join(','), length, point: (u, d) => xy(u, length - d) });
    // The toe row follows the board at every column, so the approach meets it flush.
    // Columns are at most JOINT_COLUMN_M apart; the board's own faces are 5 m.
    const width = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const toeAt = (f: number) => bare(...xy(f, length));
    // Hermite vertical curves meet the deck tangent and the land-side street
    // tangent. Estimate the latter over several DEM cells to suppress quantization.
    const toeSlopeAt = (f: number, toe: number) => {
      const far = bare(...xy(f, length + 10));
      return far === null ? (toe - (bare(...xy(f, length - 4)) ?? toe)) / 4 : (far - toe) / 10;
    };
    const step = 4;
    const profiles = new Map<number, number[]>();
    const profile = (f: number) => {
      const cached = profiles.get(f);
      if (cached) return cached;
      const toe = toeAt(f) ?? deck(f),
        toeSlope = toeSlopeAt(f, toe);
      const heights = Array.from({ length: length / step + 1 }, (_, j) => {
        const t = (j * step) / length;
        const blend = t * t * (3 - 2 * t);
        const tangent =
          (1 - t) * Math.max(-0.11, Math.min(0.11, slope ?? 0)) -
          t * Math.max(-0.11, Math.min(0.11, toeSlope));
        const curve =
          slope === undefined
            ? deck(f) + (toe - deck(f)) * t
            : deck(f) + (toe - deck(f)) * blend + length * t * (1 - t) * tangent;
        return slope === undefined || j === 0 ? curve : Math.max(curve, bare(...xy(f, j * step)) ?? curve);
      });
      // Fair the upper envelope of the road and existing terrain. Keep both
      // endpoints fixed while easing short DEM ridges into neighbouring rows.
      if (slope !== undefined)
        for (let pass = 0; pass < 28; pass++) {
          for (let j = 1; j < heights.length - 1; j++)
            heights[j] = Math.max(heights[j], (heights[j - 1] + heights[j + 1]) / 2 - 0.004);
        }
      profiles.set(f, heights);
      return heights;
    };
    function vertex(f: number, s: number, lift: number): [number, number, number] {
      const [x, z] = xy(f, s),
        t = s / length;
      const remaining = slope === undefined ? 1 - t : 1 - t * t * (3 - 2 * t);
      return [
        x,
        Math.max(profile(f)[s / step] + lift * remaining, (bare(x, z) ?? -Infinity) + 0.003 * (1 - t)),
        z,
      ];
    }
    for (let k = 0; k < bands.length - 1; k++) {
      const lift = k === 0 || k === 3 ? 0.27 : 0.12;
      const fine = Math.max(1, Math.ceil(((bands[k + 1] - bands[k]) * width) / JOINT_COLUMN_M));
      const candidates = Array.from({ length: fine + 1 }, (_, i) => bands[k] + ((bands[k + 1] - bands[k]) * i) / fine);
      const rows = Array.from({ length: length / 4 + 1 }, (_, j) => candidates.map((f) => vertex(f, j * 4, lift)[1]));
      const columns = keepColumns(candidates.map((f) => f * width), rows).map((i) => candidates[i]);
      const pieces = columns.length - 1;
      for (let s = 0; s < length; s += 4)
        for (let i = 0; i < pieces; i++) {
          const p = vertex(columns[i], s, lift),
            q = vertex(columns[i + 1], s, lift);
          const r = vertex(columns[i + 1], s + 4, lift),
            t = vertex(columns[i], s + 4, lift);
          tri(p, q, r);
          tri(p, r, t);
          if ((k === 0 && i === 0) || (k === 3 && i === pieces - 1)) {
            const [u, v] = k === 0 ? [p, t] : [q, r];
            const away = k === 0 ? -1 : 1;
            sideWalls.push({ u, v, out: [(away * (b[0] - a[0])) / width, (away * (b[1] - a[1])) / width], owner: portalIndex });
          }
          if ((k === 0 && i === pieces - 1) || (k === 3 && i === 0)) {
            const [c, d] = k === 0 ? [q, r] : [p, t];
            walls.quad(
              c,
              d,
              [d[0], d[1] - 0.15 * (1 - (s + 4) / length), d[2]],
              [c[0], c[1] - 0.15 * (1 - s / length), c[2]],
              '#b3aa9a',
            );
          }
        }
    }
  }
  {
    const tops = new THREE.Float32BufferAttribute(top.pos, 3);
    const other = (x: number, z: number, owner: number) => {
      let y: number | null = null;
      for (const i of index.at(x, z)) {
        if (owners[i / 3] === owner) continue;
        const h = triangleHeight(tops, i, x, z);
        if (h !== null) y = y === null ? h : Math.max(y, h);
      }
      return y;
    };
    for (const { u, v, out, owner } of sideWalls) {
      const mx = (u[0] + v[0]) / 2 + out[0] * 0.6, mz = (u[2] + v[2]) / 2 + out[1] * 0.6;
      const beside = other(mx, mz, owner);
      if (beside !== null && beside >= Math.min(u[1], v[1]) - 0.3) continue;
      if (landingOwners.has(owner)) {
        // A landing is a low fill, not a structure: grade its sides down to the board
        // at 1:2 on the board's own paint, so no wall face or ink edge stands out.
        portalIndex = owner;
        const foot = (p: number[]) => {
          const rise = Math.max(0, p[1] - (bare(p[0], p[2]) ?? p[1]));
          const x = p[0] + out[0] * 2 * rise, z = p[2] + out[1] * 2 * rise;
          return [x, bare(x, z) ?? p[1] - rise, z];
        };
        const [fu, fv] = [foot(u), foot(v)];
        if (fu[0] !== u[0] || fv[0] !== v[0] || fu[2] !== u[2] || fv[2] !== v[2]) {
          tri(u, v, fv);
          tri(u, fv, fu);
        }
        continue;
      }
      skirt(u, v);
    }
  }
  portalIndex = -1;
  // Ground links may join the upper street on the land side of the abutment.
  // A shared source vertex distinguishes a real merge from a lower ramp that
  // merely passes through the footprint in plan.
  const connected = new Set<P2[]>(portals.flatMap((portal) => (portal.road ? [portal.road] : [])));
  const streetNodes = new Set(
    roads
      .filter((r) => ['secondary', 'tertiary'].includes(r.cls))
      .flatMap((r) => r.pts.map((p) => p.join(','))),
  );
  const bankPositions = new THREE.Float32BufferAttribute(top.pos, 3);
  function sample(positions: THREE.BufferAttribute, x: number, z: number) {
    let y = bare(x, z);
    for (const i of index.at(x, z)) {
      if (i >= positions.count) continue;
      const h = triangleHeight(positions, i, x, z);
      if (h !== null) y = y === null ? h : Math.max(y, h);
    }
    return y;
  }
  for (const road of roads) {
    if (road.cls !== 'motorway' || road.sub !== 'link' || road.bridge || road.tunnel) continue;
    for (const reverse of [false, true]) {
      const pts = reverse ? [...road.pts].reverse() : road.pts;
      const p = pts[0];
      if (!streetNodes.has(p.join(',')) || !index.at(...p).length) continue;
      // Only surveyed approaches raise a street node enough to need a link ramp.
      let h = bare(...p);
      for (const i of index.at(...p)) {
        if (i >= bankPositions.count || landingOwners.has(owners[i / 3])) continue;
        const y = triangleHeight(bankPositions, i, ...p);
        if (y !== null) h = h === null ? y : Math.max(h, y);
      }
      const terrain = bare(...p);
      if (h === null || terrain === null || h - terrain < 0.15) continue;
      connected.add(road.pts);
      const line = new Line(pts),
        half = roadWidth(road) / 2;
      const length = Math.min(line.length, 72, Math.max(24, 14 * (h - terrain)));
      const end = line.at(length),
        toe = bare(end.x, end.z);
      if (toe === null || !length) continue;
      joints.push({
        name: 'link ' + [p[0], p[1]].map(Math.round).join(','),
        length,
        point: (u, d) => {
          const v = line.at(Math.max(0, length - d)),
            off = (2 * u - 1) * half;
          return [v.x + off * v.nx, v.z + off * v.nz];
        },
      });
      const start = line.at(0);
      // Columns across, so the toe follows the board like the portal approaches.
      const fine = Math.max(1, Math.ceil((2 * half) / JOINT_COLUMN_M));
      let offsets = Array.from({ length: fine + 1 }, (_, i) => -half + (2 * half * i) / fine);
      let bank = offsets.map(
        (off) => sample(bankPositions, start.x + off * start.nx, start.z + off * start.nz) ?? h,
      );
      let toes = offsets.map((off) => bare(end.x + off * end.nx, end.z + off * end.nz) ?? toe);
      const row = (s: number) => {
        const v = line.at(s);
        return offsets.map((off, side) => {
          const x = v.x + off * v.nx,
            z = v.z + off * v.nz;
          const ground = bare(x, z) ?? toe;
          return [
            x,
            Math.max(
              ground,
              sample(bankPositions, x, z) ?? ground,
              bank[side] + (toes[side] - bank[side]) * (s / length) ** 2 * (3 - (2 * s) / length),
            ),
            z,
          ];
        });
      };
      // The sampled rows use every candidate; keep only the columns they need.
      const sampled = Array.from({ length: Math.ceil(length / 2) + 1 }, (_, j) => row(Math.min(length, j * 2)).map((p) => p[1]));
      const kept = keepColumns(offsets, sampled);
      offsets = kept.map((i) => offsets[i]);
      bank = kept.map((i) => bank[i]);
      toes = kept.map((i) => toes[i]);
      const pieces = offsets.length - 1;
      let prior = row(0);
      for (let s = 0; s < length; s += 2) {
        const next = row(Math.min(length, s + 2));
        for (let i = 0; i < pieces; i++) {
          tri(prior[i], prior[i + 1], next[i + 1]);
          tri(prior[i], next[i + 1], next[i]);
        }
        for (const edge of [0, pieces]) {
          const a = prior[edge],
            b = next[edge];
          skirt(a, b);
        }
        prior = next;
      }
    }
  }
  const geometry = top.geometry();
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  return {
    geometry,
    walls: walls.geometry(),
    joints,
    groundAt(x: number, z: number, road?: { cls: string; pts: P2[] }) {
      if (road?.cls === 'motorway' && !connected.has(road.pts)) return bare(x, z);
      return sample(positions, x, z);
    },
  };
}
