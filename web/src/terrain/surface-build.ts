import { gradeSouthboundBoard } from '../../../pipeline/prototypes/highway-four-ground/grade';
import { runSync, type Build } from '../core/slice';
/**
 * The ground surface's geometry as pure functions over typed arrays: no DOM, no three.js objects,
 * so it runs in a Worker (terrain/surface-worker.ts) and later at build time in the pipeline.
 * GroundSurface (surface.ts) calls the same code, so both paths draw the same triangles.
 */
import underpassFloors from '../../../pipeline/prototypes/connector-footprint/underpass-floors.json';
import { conformCutEdges } from './conform-cut-edges';
import { slotPlanes, splitConvex, subtractSlot, type OpenSlot } from './openings';

export type JoiningEdge = { x: number; minZ: number; maxZ: number } | { z: number; minX: number; maxX: number };
export type TerrainJoins = JoiningEdge | JoiningEdge[];
export const joinList = (join?: TerrainJoins): JoiningEdge[] => Array.isArray(join) ? join : join ? [join] : [];
export type TerrainQuality = 'low' | 'high';

/**
 * A hard surface the drawn terrain must yield to, such as a stair run cut into a
 * slope. Inside the convex `ring` the terrain is lowered, never raised, to at most
 * `floor(x, z)`. A vertical skirt closes the step at the ring. The floor must be
 * linear (or concave) over the ring, so the drawn triangles stay below it between
 * vertices too, at both tiers.
 */
export interface GroundYield {
  conformEdges?: boolean;
  ring: readonly (readonly [number, number])[];
  floor(x: number, z: number): number;
}

/** The plain numbers of a ground manifest the mesh needs. */
export interface SurfaceSpec {
  rows: number; cols: number; stepM: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  sha256: string; sceneZeroNavd88M: number;
}

export function yieldPlanes(y: GroundYield) {
  const ring = y.ring;
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
    area += ax * bz - bx * az;
  }
  if (ring.length < 3 || !Number.isFinite(area) || Math.abs(area) < 1e-6) throw new Error('Invalid ground yield ring');
  const sign = area > 0 ? 1 : -1;
  const planes = ring.map(([ax, az], i) => {
    const [bx, bz] = ring[(i + 1) % ring.length], len = Math.hypot(bx - ax, bz - az);
    return (x: number, _y: number, z: number) => sign * ((bx - ax) * (z - az) - (bz - az) * (x - ax)) / len;
  });
  const xs = ring.map(p => p[0]), zs = ring.map(p => p[1]);
  return { planes, conformEdges:y.conformEdges, floor: y.floor, minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}


/** Scene heights per grid node (NaN in voids), with the inferred underpass pavement applied. */
export function nodeHeights(spec: SurfaceSpec, node: (row: number, col: number) => number | null) {
  const { rows, cols, sceneZeroNavd88M } = spec;
  const heights = new Float32Array(rows * cols);
  let minY = Infinity;
  for (let i = 0; i < heights.length; i++) {
    const h = node(Math.floor(i / cols), i % cols);
    heights[i] = h === null ? NaN : h - sceneZeroNavd88M;
    if (h !== null) minY = Math.min(minY, heights[i]);
  }
  // Occluded freeway pavement is inferred from class-2 returns at its portals.
  // Apply the exposed-pavement interpolation before tessellation at either quality.
  const patches: Record<string, number[][]> = underpassFloors;
  for (const [i, navd] of patches[spec.sha256] ?? []) heights[i] = navd - sceneZeroNavd88M;
  if (!Number.isFinite(minY)) throw new Error('Ground grid is empty');
  return { heights, minY };
}

// Each block is at most 2 × 2 source cells. High keeps all four; low merges flat
// blocks and stitches their shared edges to any neighbour that needs 5 m detail.
export function tessellate(spec: SurfaceSpec, heights: Float32Array, quality: TerrainQuality,
  openings: readonly OpenSlot[] = [], join?: TerrainJoins, yieldList: readonly GroundYield[] = []) {
  return runSync(tessellateSteps(spec, heights, quality, openings, join, yieldList));
}

/** tessellate as a build that yields every 8 block rows (core/slice.ts); same triangles, same order. */
export function* tessellateSteps(spec: SurfaceSpec, heights: Float32Array, quality: TerrainQuality,
  openings: readonly OpenSlot[] = [], join?: TerrainJoins, yieldList: readonly GroundYield[] = []) {
    const { rows, cols, stepM, bounds } = spec;
    const blockCols = Math.ceil((cols - 1) / 2);
    const blockRows = Math.ceil((rows - 1) / 2);
    const detail = new Uint8Array(blockRows * blockCols);
    const starts = new Uint32Array(detail.length + 1);
    const joins = joinList(join);
    for (let k = 0; k < detail.length; k++) {
      const x = 2 * (k % blockCols), z = 2 * Math.floor(k / blockCols);
      const bx = bounds.minX + x * stepM, bz = bounds.minZ + z * stepM, size = 2 * stepM;
      const onJoin = joins.some(edge => 'x' in edge
        ? (bx === edge.x || bx + size === edge.x) && bz < edge.maxZ && bz + size > edge.minZ
        : (bz === edge.z || bz + size === edge.z) && bx < edge.maxX && bx + size > edge.minX);
      if (quality === 'high' || onJoin || x + 2 >= cols || z + 2 >= rows) {
        detail[k] = 1;
        continue;
      }
      const nw = z * cols + x, ne = nw + 2, sw = nw + 2 * cols, se = sw + 2;
      // Check all five omitted nodes against the candidate pair of coarse triangles.
      const close = (a: number, b: number) =>
        Math.abs(heights[(a + b) / 2] - (heights[a] + heights[b]) / 2) <= 0.20;
      if (!(close(nw, ne) && close(nw, sw) && close(ne, sw) && close(ne, se) && close(sw, se))) detail[k] = 1;
    }
    const pos: number[] = [], uv: number[] = [], indices: number[] = [];
    const remap = new Int32Array(heights.length).fill(-1);
    const add = (x: number, y: number, z: number) => {
      const i = pos.length / 3;
      pos.push(x, y, z);
      uv.push((x - bounds.minX) / (bounds.maxX - bounds.minX), (bounds.maxZ - z) / (bounds.maxZ - bounds.minZ));
      return i;
    };
    // Restrict polygon clipping to blocks touched by an explicitly supplied opening.
    const slots = new Map<number, ReturnType<typeof slotPlanes>[]>();
    for (const slot of openings.map(slotPlanes)) {
      const col = (x: number) => Math.floor((x - bounds.minX) / (2 * stepM));
      const row = (z: number) => Math.floor((z - bounds.minZ) / (2 * stepM));
      for (let r = Math.max(0, row(slot.minZ)); r <= Math.min(blockRows - 1, row(slot.maxZ)); r++) {
        for (let c = Math.max(0, col(slot.minX)); c <= Math.min(blockCols - 1, col(slot.maxX)); c++) {
          const key = r * blockCols + c;
          if (!slots.has(key)) slots.set(key, []);
          slots.get(key)!.push(slot);
        }
      }
    }
    const vertex = (i: number) => {
      if (remap[i] < 0) {
        const x = i % cols, z = Math.floor(i / cols);
        remap[i] = add(bounds.minX + x * stepM, heights[i], bounds.minZ + z * stepM);
      }
      return remap[i];
    };
    // Hard-surface yields, indexed by block like the openings.
    const yieldBlocks = new Map<number, ReturnType<typeof yieldPlanes>[]>();
    for (const y of yieldList.map(yieldPlanes)) {
      const col = (x: number) => Math.floor((x - bounds.minX) / (2 * stepM));
      const row = (z: number) => Math.floor((z - bounds.minZ) / (2 * stepM));
      for (let r = Math.max(0, row(y.minZ)); r <= Math.min(blockRows - 1, row(y.maxZ)); r++) {
        for (let c = Math.max(0, col(y.minX)); c <= Math.min(blockCols - 1, col(y.maxX)); c++) {
          const key = r * blockCols + c;
          if (!yieldBlocks.has(key)) yieldBlocks.set(key, []);
          yieldBlocks.get(key)!.push(y);
        }
      }
    }
    // Yields may abut or overlap (a run of graded-cutting triangles). A vertex takes the
    // lowest floor of every yield that contains it, so faces of neighbouring yields meet
    // at the same height, and a skirt is drawn only where no yield lies beyond the edge.
    const nearYields = (x: number, z: number) => {
      const c = Math.floor((x - bounds.minX) / (2 * stepM)), r = Math.floor((z - bounds.minZ) / (2 * stepM));
      const out = new Set<ReturnType<typeof yieldPlanes>>();
      for (let rr = r - 1; rr <= r + 1; rr++) for (let cc = c - 1; cc <= c + 1; cc++)
        if (rr >= 0 && cc >= 0 && rr < blockRows && cc < blockCols) for (const y of yieldBlocks.get(rr * blockCols + cc) ?? []) out.add(y);
      return out;
    };
    const contains = (y: ReturnType<typeof yieldPlanes>, x: number, z: number, eps: number) =>
      y.planes.every(plane => plane(x, 0, z) >= -eps);
    const lowered = new Map<number, number>();
    const lower = (i: number) => {
      const x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2];
      let f = Infinity;
      for (const yd of nearYields(x, z)) if (contains(yd, x, z, 1e-6)) f = Math.min(f, yd.floor(x, z));
      if (!(y > f)) return i;
      let j = lowered.get(i);
      if (j === undefined) lowered.set(i, j = add(x, f, z));
      return j;
    };
    const emit = (f: number[]) => { for (let j = 1; j + 1 < f.length; j++) indices.push(f[0], f[j], f[j + 1]); };
    let blockSlots: ReturnType<typeof slotPlanes>[] | undefined;
    let blockYields: ReturnType<typeof yieldPlanes>[] | undefined;
    const tri = (a: number, b: number, c: number) => {
      const ia = vertex(a), ib = vertex(b), ic = vertex(c);
      if (!blockSlots && !blockYields) {
        indices.push(ia, ib, ic);
        return;
      }
      let faces = [[ia, ib, ic]];
      for (const slot of blockSlots ?? []) faces = faces.flatMap(f => subtractSlot(f, slot.planes, pos, add));
      for (const y of blockYields ?? []) {
        faces = faces.flatMap(f => {
          const { inside, outside } = splitConvex(f, y.planes, pos, add);
          if (!inside) return outside;
          const low = inside.map(lower);
          if (low.every((j, k) => j === inside[k])) return [...outside, inside];
          emit(low);
          // Skirt each footprint edge where the inside dropped, seen from either side.
          for (let k = 0; k < inside.length; k++) {
            const n = (k + 1) % inside.length, p = inside[k], q = inside[n];
            if (low[k] === p && low[n] === q) continue;
            const edge = y.planes.findIndex(plane =>
              Math.abs(plane(pos[3*p], 0, pos[3*p+2])) < 1e-6 && Math.abs(plane(pos[3*q], 0, pos[3*q+2])) < 1e-6);
            if (edge < 0) continue;
            // Just beyond the edge's midpoint, away from the piece's centre.
            const cx = inside.reduce((t, i) => t + pos[3*i], 0) / inside.length, cz = inside.reduce((t, i) => t + pos[3*i+2], 0) / inside.length;
            const mx = (pos[3*p] + pos[3*q]) / 2, mz = (pos[3*p+2] + pos[3*q+2]) / 2, d = Math.hypot(mx - cx, mz - cz) || 1;
            const bx = mx + (mx - cx) / d * 1e-3, bz = mz + (mz - cz) / d * 1e-3;
            if ([...nearYields(bx, bz)].some(other => other !== y && contains(other, bx, bz, 0))) continue;
            emit([p, q, low[n], low[k]].filter((v, i, all) => all.indexOf(v) === i));
            emit([low[k], low[n], q, p].filter((v, i, all) => all.indexOf(v) === i));
          }
          return outside;
        });
      }
      for (const f of faces) emit(f);
    };
    for (let k = 0; k < detail.length; k++) {
      if (k % (8 * blockCols) === 8 * blockCols - 1) yield 'ground rows';
      starts[k] = indices.length;
      blockSlots = slots.get(k);
      blockYields = yieldBlocks.get(k);
      const bx = k % blockCols, bz = Math.floor(k / blockCols);
      const x = 2 * bx, z = 2 * bz;
      if (detail[k]) {
        for (let r = z; r < Math.min(z + 2, rows - 1); r++) {
          for (let c = x; c < Math.min(x + 2, cols - 1); c++) {
            const a = r * cols + c, b = a + cols;
            // Never bridge a void with a coarse face. Omit the entire invalid source cell.
            if (!Number.isFinite(heights[a] + heights[a + 1] + heights[b] + heights[b + 1])) continue;
            tri(a, b, a + 1);
            tri(b, b + 1, a + 1);
          }
        }
        continue;
      }
      const nw = z * cols + x, ne = nw + 2, sw = nw + 2 * cols, se = sw + 2;
      const ring = [nw];
      if (bx && detail[k - 1]) ring.push(nw + cols);
      ring.push(sw);
      if (bz + 1 < blockRows && detail[k + blockCols]) ring.push(sw + 1);
      ring.push(se);
      if (bx + 1 < blockCols && detail[k + 1]) ring.push(ne + cols);
      ring.push(ne);
      if (bz && detail[k - blockCols]) ring.push(nw + 1);
      if (ring.length === 4) {
        tri(nw, sw, ne);
        tri(sw, se, ne);
      } else {
        for (let i = 0; i < ring.length; i++) tri(nw + cols + 1, ring[i], ring[(i + 1) % ring.length]);
      }
    }
    starts[detail.length] = indices.length;
    const result = { pos, uv, indices, starts, blockCols };
    if (yieldList.some(y=>y.conformEdges)) {
      const blocks = new Set<number>();
      for (const [k,ys] of yieldBlocks) if (ys.some(y=>y.conformEdges)) blocks.add(k);
      conformCutEdges(result, blocks, (x,z)=>{
        let floor=Infinity;
        for (const y of nearYields(x,z)) if (y.conformEdges && contains(y,x,z,1e-6)) {
          floor=Math.min(floor,y.floor(x,z));
        }
        return floor;
      });
    }
    return gradeSouthboundBoard(result, spec.bounds);
}

/**
 * A far-view mesh: a quadtree of square cells (5 m up to `maxCellM`), each the two triangles on
 * the sw–ne diagonal, accepted when every DEM node inside lies within `errorM` of them. See
 * GroundSurface.farGeometry.
 */
/** `lower`: drop interior vertices by the most any of their cells' planes rise above the DEM,
 * so nothing drawn on the ground (roads, ballast, building bases, trees) is buried by the
 * coarser surface; rim nodes stay exact for the seams and side walls. */
export function farSurface(spec: SurfaceSpec, heights: Float32Array, openings: readonly OpenSlot[], errorM: number, maxCellM = 160, lower = false) {
  return runSync(farSurfaceSteps(spec, heights, openings, errorM, maxCellM, lower));
}

/** farSurface as a build that yields every few dozen cells, leaves and triangles (core/slice.ts). */
export function* farSurfaceSteps(spec: SurfaceSpec, heights: Float32Array, openings: readonly OpenSlot[], errorM: number, maxCellM = 160, lower = false): Build<{ pos: number[]; uv: number[]; indices: number[] }> {
    const { rows, cols, stepM, bounds } = spec;
    const cellsX = cols - 1, cellsZ = rows - 1;
    const maxSize = 2 ** Math.floor(Math.log2(Math.max(1, maxCellM / stepM)));
    const slots = openings.map(slotPlanes);
    const slotCell = new Uint8Array(cellsX * cellsZ);
    for (const sl of slots) {
      const c0 = Math.max(0, Math.floor((sl.minX - bounds.minX) / stepM) - 1), c1 = Math.min(cellsX - 1, Math.floor((sl.maxX - bounds.minX) / stepM) + 1);
      const r0 = Math.max(0, Math.floor((sl.minZ - bounds.minZ) / stepM) - 1), r1 = Math.min(cellsZ - 1, Math.floor((sl.maxZ - bounds.minZ) / stepM) + 1);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) slotCell[r * cellsX + c] = 1;
    }
    // Leaves: origin (cell units) and size; `leafAt` maps each 5 m cell to its leaf (-1: void).
    const lx: number[] = [], lz: number[] = [], ls: number[] = [];
    const leafAt = new Int32Array(cellsX * cellsZ).fill(-1);
    const node = (c: number, r: number) => r * cols + c;
    let excess = 0;
    const le: number[] = [];
    const accept = (cx: number, cz: number, s: number) => {
      excess = 0;
      const nw = heights[node(cx, cz)], ne = heights[node(cx + s, cz)], sw = heights[node(cx, cz + s)], se = heights[node(cx + s, cz + s)];
      for (let r = 0; r <= s; r++) for (let c = 0; c <= s; c++) {
        const h = heights[node(cx + c, cz + r)];
        if (!Number.isFinite(h)) return false;
        const plane = c + r <= s ? nw + (ne - nw) * c / s + (sw - nw) * r / s : se + (sw - se) * (s - c) / s + (ne - se) * (s - r) / s;
        if (Math.abs(h - plane) > errorM) return false;
        if (plane - h > excess) excess = plane - h;
      }
      for (let r = cz; r < cz + s; r++) for (let c = cx; c < cx + s; c++) if (slotCell[r * cellsX + c]) return false;
      return true;
    };
    const place = (cx: number, cz: number, s: number) => {
      const id = ls.length; lx.push(cx); lz.push(cz); ls.push(s); le.push(s > 1 ? excess : 0);
      for (let r = cz; r < cz + s; r++) for (let c = cx; c < cx + s; c++) leafAt[r * cellsX + c] = id;
    };
    let work = 0;
    function* split(cx: number, cz: number, s: number): Generator<string, void, void> {
      if (cx >= cellsX || cz >= cellsZ) return;
      if (s === 1) {
        const h = [node(cx, cz), node(cx + 1, cz), node(cx, cz + 1), node(cx + 1, cz + 1)].map(i => heights[i]);
        if (h.every(Number.isFinite)) place(cx, cz, 1);
        return;
      }
      // accept() scans (s+1)² nodes: count that work and hand back control every few thousand.
      work += (s + 1) * (s + 1);
      if (work > 512) { work = 0; yield 'far cells'; }
      if (cx + s <= cellsX && cz + s <= cellsZ && accept(cx, cz, s)) { place(cx, cz, s); return; }
      const h = s / 2;
      yield* split(cx, cz, h); yield* split(cx + h, cz, h); yield* split(cx, cz + h, h); yield* split(cx + h, cz + h, h);
    }
    for (let cz = 0; cz < cellsZ; cz += maxSize) for (let cx = 0; cx < cellsX; cx += maxSize) yield* split(cx, cz, maxSize);
    const pos: number[] = [], uv: number[] = [], indices: number[] = [];
    const remap = new Map<number, number>();
    const add = (x: number, y: number, z: number) => {
      const i = pos.length / 3;
      pos.push(x, y, z);
      uv.push((x - bounds.minX) / (bounds.maxX - bounds.minX), (bounds.maxZ - z) / (bounds.maxZ - bounds.minZ));
      return i;
    };
    const drop = new Float32Array(lower ? rows * cols : 0);
    let dropWork = 0;
    if (lower) for (let id = 0; id < ls.length; id++) {
      const e = le[id];
      if (!(e > 0)) continue;
      const cx = lx[id], cz = lz[id], s = ls[id];
      dropWork += (s + 1) * (s + 1);
      if (dropWork > 1024) { dropWork = 0; yield 'far drop'; }
      for (let r = 0; r <= s; r++) for (let c = 0; c <= s; c++) {
        const C = cx + c, R = cz + r;
        if (C === 0 || R === 0 || C === cols - 1 || R === rows - 1) continue;
        const n = node(C, R);
        if (drop[n] < e) drop[n] = e;
      }
    }
    const vertex = (n: number) => {
      let v = remap.get(n);
      if (v === undefined) remap.set(n, v = add(bounds.minX + (n % cols) * stepM, heights[n] - (lower ? drop[n] : 0), bounds.minZ + Math.floor(n / cols) * stepM));
      return v;
    };
    // A node strictly inside a leaf edge is kept when the cell across the edge is a void,
    // off the board, or a finer leaf with a corner there.
    const keep = (c: number, r: number, across: [number, number][]) => across.some(([ac, ar]) => {
      if (ac < 0 || ar < 0 || ac >= cellsX || ar >= cellsZ) return true;
      const id = leafAt[ar * cellsX + ac];
      if (id < 0) return true;
      return (c - lx[id]) % ls[id] === 0 && (r - lz[id]) % ls[id] === 0;
    });
    let clip = false, near: typeof slots = [];
    const emit = (a: number, b: number, c: number) => {
      const face = [vertex(a), vertex(b), vertex(c)];
      let faces = [face];
      // Only the slots whose box meets this 5 m cell can cut it (downtown has dozens).
      if (clip) for (const sl of near) faces = faces.flatMap(f => subtractSlot(f, sl.planes, pos, add));
      for (const f of faces) for (let j = 1; j + 1 < f.length; j++) indices.push(f[0], f[j], f[j + 1]);
    };
    yield 'far emit';
    let clipWork = 0;
    for (let id = 0; id < ls.length; id++) {
      if (id % 64 === 63) yield 'far leaves';
      const cx = lx[id], cz = lz[id], s = ls[id];
      clip = s === 1 && slotCell[cz * cellsX + cx] === 1;
      if (clip) {
        const x0 = bounds.minX + cx * stepM, z0 = bounds.minZ + cz * stepM;
        near = slots.filter(sl => sl.maxX >= x0 && sl.minX <= x0 + stepM && sl.maxZ >= z0 && sl.minZ <= z0 + stepM);
        clipWork += 2 * near.length;
        if (clipWork > 64) { clipWork = 0; yield 'far clips'; }
      }
      const nw = node(cx, cz), ne = node(cx + s, cz), sw = node(cx, cz + s), se = node(cx + s, cz + s);
      const ring = [nw];
      for (let t = 1; t < s; t++) if (keep(cx, cz + t, [[cx - 1, cz + t - 1], [cx - 1, cz + t]])) ring.push(node(cx, cz + t));
      ring.push(sw);
      for (let t = 1; t < s; t++) if (keep(cx + t, cz + s, [[cx + t - 1, cz + s], [cx + t, cz + s]])) ring.push(node(cx + t, cz + s));
      ring.push(se);
      for (let t = s - 1; t > 0; t--) if (keep(cx + s, cz + t, [[cx + s, cz + t - 1], [cx + s, cz + t]])) ring.push(node(cx + s, cz + t));
      ring.push(ne);
      for (let t = s - 1; t > 0; t--) if (keep(cx + t, cz, [[cx + t - 1, cz - 1], [cx + t, cz - 1]])) ring.push(node(cx + t, cz));
      if (ring.length === 4) { emit(nw, sw, ne); emit(sw, se, ne); continue; }
      const centre = node(cx + s / 2, cz + s / 2);
      for (let i = 0; i < ring.length; i++) emit(centre, ring[i], ring[(i + 1) % ring.length]);
    }
    if (lower) yield* settleBelow(pos, indices, remap, heights, spec, 2 * errorM);
    return gradeSouthboundBoard({pos, uv, indices}, spec.bounds);
}

/**
 * Lower interior far vertices until no drawn triangle stands above a DEM node under it.
 * Rim nodes (seams, side walls) and clipped slot vertices stay put; a few passes settle the
 * shared vertices, since lowering one triangle's corner also lowers its neighbours. No vertex
 * drops more than `limit` (twice the error) below its own node, so a cell against the rim may
 * keep a residue (up to about 4 m within 165 m of a seam on the current boards).
 */
function* settleBelow(pos: number[], indices: number[], remap: Map<number, number>, heights: Float32Array, spec: SurfaceSpec, limit: number): Generator<string, void, void> {
  const { rows, cols, stepM, bounds } = spec;
  const nodeOf = new Int32Array(pos.length / 3).fill(-1);
  for (const [n, v] of remap) nodeOf[v] = n;
  const movable = (v: number) => {
    const n = nodeOf[v];
    if (n < 0) return false;
    const c = n % cols, r = Math.floor(n / cols);
    return c > 0 && r > 0 && c < cols - 1 && r < rows - 1;
  };
  let settleWork = 0;
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (let t = 0; t < indices.length; t += 3) {
      const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]];
      const ax = pos[3 * a], ay = pos[3 * a + 1], az = pos[3 * a + 2];
      const bx = pos[3 * b], by = pos[3 * b + 1], bz = pos[3 * b + 2];
      const cx = pos[3 * c], cy = pos[3 * c + 1], cz = pos[3 * c + 2];
      const dx = bx - ax, dz = bz - az, ex = cx - ax, ez = cz - az, det = dx * ez - dz * ex;
      if (Math.abs(det) < 1e-9) continue;
      const c0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - bounds.minX) / stepM - 1e-9));
      const c1 = Math.min(cols - 1, Math.floor((Math.max(ax, bx, cx) - bounds.minX) / stepM + 1e-9));
      const r0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) - bounds.minZ) / stepM - 1e-9));
      const r1 = Math.min(rows - 1, Math.floor((Math.max(az, bz, cz) - bounds.minZ) / stepM + 1e-9));
      // Count the node checks; a 160 m cell alone scans ~1,000.
      settleWork += 8 + (r1 - r0 + 1) * (c1 - c0 + 1);
      if (settleWork > 512) { settleWork = 0; yield 'far settle'; }
      const ma = movable(a), mb = movable(b), mc = movable(c);
      if (!ma && !mb && !mc) continue;
      // The drop at the movable corners that clears the worst node: its excess over the
      // share of the plane those corners carry there.
      let need = 0;
      for (let r = r0; r <= r1; r++) for (let col = c0; col <= c1; col++) {
        const h = heights[r * cols + col];
        if (!Number.isFinite(h)) continue;
        const x = bounds.minX + col * stepM, z = bounds.minZ + r * stepM;
        const wb = ((x - ax) * ez - (z - az) * ex) / det, wc = (dx * (z - az) - dz * (x - ax)) / det, wa = 1 - wb - wc;
        if (Math.min(wa, wb, wc) < -1e-6) continue;
        const over = wa * ay + wb * by + wc * cy - h;
        const share = (ma ? wa : 0) + (mb ? wb : 0) + (mc ? wc : 0);
        if (over > 1e-3 && share > 1e-6) need = Math.max(need, over / share);
      }
      if (need <= 1e-3) continue;
      for (const v of [a, b, c]) if (movable(v)) {
        const n = nodeOf[v], floor = heights[n] - limit;
        const y = Math.max(floor, pos[3 * v + 1] - need);
        if (y < pos[3 * v + 1]) { pos[3 * v + 1] = y; moved = true; }
      }
    }
    if (!moved) break;
  }
}

/**
 * Smooth vertex normals of an indexed triangle list, by the same steps as three.js's
 * BufferGeometry.computeVertexNormals (face normal (c − b) × (a − b) summed per vertex, then
 * normalised), so a Worker-built mesh shades exactly like one built on the main thread.
 */
export function vertexNormals(pos: ArrayLike<number>, indices: ArrayLike<number>) {
  const n = new Float32Array(pos.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    // Float32 round trips mirror three's Vector3.fromBufferAttribute reads.
    const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
    const bx = pos[b], by = pos[b + 1], bz = pos[b + 2];
    const cx = pos[c], cy = pos[c + 1], cz = pos[c + 2];
    const ux = cx - bx, uy = cy - by, uz = cz - bz, vx = ax - bx, vy = ay - by, vz = az - bz;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz; }
  }
  for (let k = 0; k < n.length; k += 3) {
    // Vector3.normalize: divideScalar(length || 1) multiplies by the reciprocal.
    const inv = 1 / (Math.sqrt(n[k] * n[k] + n[k + 1] * n[k + 1] + n[k + 2] * n[k + 2]) || 1);
    n[k] *= inv; n[k + 1] *= inv; n[k + 2] *= inv;
  }
  return n;
}

/** A typed copy of a large number[] in chunks, yielding between them. */
export function* typedSteps<T extends Float32Array | Uint16Array | Uint32Array>(out: T, from: ArrayLike<number>): Build<T> {
  for (let i = 0; i < from.length; i += 8192) {
    const end = Math.min(from.length, i + 8192);
    for (let k = i; k < end; k++) out[k] = from[k];
    yield 'far arrays';
  }
  return out;
}

/** vertexNormals as a build that yields every few thousand triangles (same result). */
export function* vertexNormalsSteps(pos: ArrayLike<number>, indices: ArrayLike<number>): Build<Float32Array> {
  const n = new Float32Array(pos.length);
  for (let i = 0; i < indices.length; i += 3) {
    if (i % 3072 === 3069) yield 'far normals';
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
    const bx = pos[b], by = pos[b + 1], bz = pos[b + 2];
    const cx = pos[c], cy = pos[c + 1], cz = pos[c + 2];
    const ux = cx - bx, uy = cy - by, uz = cz - bz, vx = ax - bx, vy = ay - by, vz = az - bz;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz; }
  }
  yield 'far normals';
  for (let k = 0; k < n.length; k += 3) {
    const inv = 1 / (Math.sqrt(n[k] * n[k] + n[k + 1] * n[k + 1] + n[k + 2] * n[k + 2]) || 1);
    n[k] *= inv; n[k + 1] *= inv; n[k + 2] *= inv;
  }
  return n;
}

/** 16- or 32-bit indices, as BufferGeometry.setIndex(number[]) picks them. */
function indexOf(indices: number[], vertexCount: number) {
  return vertexCount > 65535 ? Uint32Array.from(indices) : Uint16Array.from(indices);
}

/**
 * The whole near (and optionally far) surface as typed arrays, ready to transfer. Carving
 * (GroundYield) still happens on the main thread: yields carry floor functions.
 */
export function buildSurfaceArrays(input: { spec: SurfaceSpec; heights: Float32Array; minY: number; quality: TerrainQuality;
  openings?: readonly OpenSlot[]; join?: TerrainJoins; farErrorM?: number; farLower?: boolean }) {
  const { spec, heights, minY, quality, openings = [], join, farErrorM, farLower = false } = input;
  const t = tessellate(spec, heights, quality, openings, join);
  const pos = new Float32Array(t.pos);
  const near = { pos, uv: new Float32Array(t.uv), normal: vertexNormals(pos, t.indices), index: indexOf(t.indices, pos.length / 3) };
  let far;
  if (farErrorM !== undefined) {
    const f = farSurface(spec, heights, openings, farErrorM, 160, farLower);
    const fp = new Float32Array(f.pos);
    far = { errorM: farErrorM, lower: farLower, pos: fp, uv: new Float32Array(f.uv), normal: vertexNormals(fp, f.indices), index: indexOf(f.indices, fp.length / 3) };
  }
  return { heights, minY, ...near, starts: t.starts, blockCols: t.blockCols, far };
}
