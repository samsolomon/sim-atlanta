import * as THREE from 'three';
import { Builder, Line, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import { roadWidth, type TerrainCity } from './transport-data';
import { triangleHeight } from './tread-height';

type Ground = (x: number, z: number) => number | null;
/** Widest column of an approach cross-section. */
export const JOINT_COLUMN_M = 1.25;
export interface Portal {
  /** Left and right outside corners, as x, z, absolute NAVD88 metres. */
  edge: number[][];
  direction: number[];
  curbs: number[];
  slope?: number;
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
  function tri(a: number[], b: number[], c: number[]) {
    const i = top.pos.length / 3;
    // The two banks of a bridge have opposite outward normals.
    if ((b[2] - a[2]) * (c[0] - a[0]) < (b[0] - a[0]) * (c[2] - a[2])) [b, c] = [c, b];
    top.tri(a, b, c, '#ffffff');
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
  } of portals) {
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
      } else if (s >= 40 && ys.every((y, i) => Math.abs(y! - deck(bands[i]) - slope * s) <= 0.35 + 0.025 * s))
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
      const pieces = Math.max(1, Math.ceil(((bands[k + 1] - bands[k]) * width) / JOINT_COLUMN_M));
      const columns = Array.from({ length: pieces + 1 }, (_, i) => bands[k] + ((bands[k + 1] - bands[k]) * i) / pieces);
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
            walls.quad(u, v, [v[0], bare(v[0], v[2])!, v[2]], [u[0], bare(u[0], u[2])!, u[2]], '#9c9384');
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
  // Ground links may join the upper street on the land side of the abutment.
  // A shared source vertex distinguishes a real merge from a lower ramp that
  // merely passes through the footprint in plan.
  const connected = new Set<P2[]>();
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
      const h = sample(bankPositions, ...p),
        terrain = bare(...p);
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
      const bank = [-half, half].map(
        (off) => sample(bankPositions, start.x + off * start.nx, start.z + off * start.nz) ?? h,
      );
      const row = (s: number) => {
        const v = line.at(s);
        return [-half, half].map((off, side) => {
          const x = v.x + off * v.nx,
            z = v.z + off * v.nz;
          const ground = bare(x, z) ?? toe;
          return [
            x,
            Math.max(
              ground,
              sample(bankPositions, x, z) ?? ground,
              bank[side] + (toe - bank[side]) * (s / length) ** 2 * (3 - (2 * s) / length),
            ),
            z,
          ];
        });
      };
      let prior = row(0);
      for (let s = 0; s < length; s += 2) {
        const next = row(Math.min(length, s + 2));
        tri(prior[0], prior[1], next[1]);
        tri(prior[0], next[1], next[0]);
        for (const edge of [0, 1]) {
          const a = prior[edge],
            b = next[edge];
          walls.quad(
            a,
            b,
            [b[0], bare(b[0], b[2]) ?? b[1], b[2]],
            [a[0], bare(a[0], a[2]) ?? a[1], a[2]],
            '#9c9384',
          );
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
