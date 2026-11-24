import * as THREE from 'three';
import underpassFloors from '../../../pipeline/prototypes/connector-footprint/underpass-floors.json';
import { GroundGrid } from './grid';
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
  ring: readonly (readonly [number, number])[];
  floor(x: number, z: number): number;
}

function yieldPlanes(y: GroundYield) {
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
  return { planes, floor: y.floor, minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

// Each block is at most 2 × 2 source cells. High keeps all four; low merges flat
// blocks and stitches their shared edges to any neighbour that needs 5 m detail.
export class GroundSurface {
  readonly geometry = new THREE.BufferGeometry();
  minY!: number;
  private starts!: Uint32Array;
  private blockCols!: number;
  private yields: GroundYield[] = [];
  /** Low tier draws a far mesh for distant boards (terrain/model.ts). `?ground=old` turns it off for A/B runs. */
  static farLow = true;
  /** Scene heights per grid node, as drawn (NaN in voids). */
  private heights!: Float32Array;

  constructor(readonly grid: GroundGrid, private readonly quality: TerrainQuality,
    private readonly openings: readonly OpenSlot[] = [], private readonly join?: TerrainJoins) {
    this.build();
  }

  /**
   * Lower the drawn terrain under hard-surface footprints and rebuild the mesh.
   * Call before the first render: earlier `sampleScene` results inside a footprint
   * are superseded. Board edges never move, so a yield must stay inside the board.
   */
  carve(yields: readonly GroundYield[]) {
    const { bounds, stepM } = this.grid.manifest;
    // Seams must match the neighbouring board node for node, so a yield near an edge is
    // skipped (the stair still draws, uncarved) rather than failing the whole board.
    const inside = yields.filter(y => {
      const { minX, maxX, minZ, maxZ } = yieldPlanes(y);
      const ok = minX > bounds.minX + stepM && maxX < bounds.maxX - stepM && minZ > bounds.minZ + stepM && maxZ < bounds.maxZ - stepM;
      if (!ok) console.warn('Ground yield skipped: within a cell of the board edge', y.ring);
      return ok;
    });
    if (!inside.length) return;
    this.yields = [...this.yields, ...inside];
    this.build();
  }

  private build() {
    const { grid, quality, openings, join } = this;
    const { rows, cols, stepM, bounds, vertical } = grid.manifest;
    const blockCols = this.blockCols = Math.ceil((cols - 1) / 2);
    const blockRows = Math.ceil((rows - 1) / 2);
    const detail = new Uint8Array(blockRows * blockCols);
    const starts = this.starts = new Uint32Array(detail.length + 1);
    const heights = new Float32Array(rows * cols);
    let minY = Infinity;
    for (let i = 0; i < heights.length; i++) {
      const h = grid.node(Math.floor(i / cols), i % cols);
      heights[i] = h === null ? NaN : h - vertical.sceneZeroNavd88M;
      if (h !== null) minY = Math.min(minY, heights[i]);
    }
    // Occluded freeway pavement is inferred from class-2 returns at its portals.
    // Apply the exposed-pavement interpolation before tessellation at either quality.
    const patches:Record<string,number[][]> = underpassFloors;
    for (const [i,navd] of patches[grid.manifest.sha256] ?? []) heights[i]=navd-vertical.sceneZeroNavd88M;
    if (!Number.isFinite(minY)) throw new Error('Ground grid is empty');
    this.minY = minY;
    this.heights = heights;
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
    for (const y of this.yields.map(yieldPlanes)) {
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
    // A rebuild (carve) changes the vertex count. computeVertexNormals would reuse a
    // stale normal attribute of the old length, and cached bounds would be stale too.
    this.geometry.deleteAttribute('normal');
    this.geometry.boundingBox = this.geometry.boundingSphere = null;
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    this.geometry.setIndex(indices);
    this.geometry.computeVertexNormals();
  }

  /**
   * A far-view mesh for this board: a quadtree of square cells (5 m up to `maxCellM`),
   * each the two triangles on the sw–ne diagonal, accepted when every DEM node inside lies
   * within `errorM` of them. Render-only: placement keeps sampling the near triangles.
   * Every node on the board rim is kept, so seams and side walls meet the near mesh of
   * either neighbour exactly; cells over an opening are 5 m and clipped like the near mesh.
   * A cell whose edge borders finer cells fans from its centre node to keep them crack-free.
   */
  farGeometry(errorM: number, maxCellM = 160) {
    const { rows, cols, stepM, bounds } = this.grid.manifest, heights = this.heights;
    const cellsX = cols - 1, cellsZ = rows - 1;
    const maxSize = 2 ** Math.floor(Math.log2(Math.max(1, maxCellM / stepM)));
    const slots = this.openings.map(slotPlanes);
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
    const accept = (cx: number, cz: number, s: number) => {
      const nw = heights[node(cx, cz)], ne = heights[node(cx + s, cz)], sw = heights[node(cx, cz + s)], se = heights[node(cx + s, cz + s)];
      for (let r = 0; r <= s; r++) for (let c = 0; c <= s; c++) {
        const h = heights[node(cx + c, cz + r)];
        if (!Number.isFinite(h)) return false;
        const plane = c + r <= s ? nw + (ne - nw) * c / s + (sw - nw) * r / s : se + (sw - se) * (s - c) / s + (ne - se) * (s - r) / s;
        if (Math.abs(h - plane) > errorM) return false;
      }
      for (let r = cz; r < cz + s; r++) for (let c = cx; c < cx + s; c++) if (slotCell[r * cellsX + c]) return false;
      return true;
    };
    const place = (cx: number, cz: number, s: number) => {
      const id = ls.length; lx.push(cx); lz.push(cz); ls.push(s);
      for (let r = cz; r < cz + s; r++) for (let c = cx; c < cx + s; c++) leafAt[r * cellsX + c] = id;
    };
    const split = (cx: number, cz: number, s: number): void => {
      if (cx >= cellsX || cz >= cellsZ) return;
      if (s === 1) {
        const h = [node(cx, cz), node(cx + 1, cz), node(cx, cz + 1), node(cx + 1, cz + 1)].map(i => heights[i]);
        if (h.every(Number.isFinite)) place(cx, cz, 1);
        return;
      }
      if (cx + s <= cellsX && cz + s <= cellsZ && accept(cx, cz, s)) { place(cx, cz, s); return; }
      const h = s / 2;
      split(cx, cz, h); split(cx + h, cz, h); split(cx, cz + h, h); split(cx + h, cz + h, h);
    };
    for (let cz = 0; cz < cellsZ; cz += maxSize) for (let cx = 0; cx < cellsX; cx += maxSize) split(cx, cz, maxSize);
    const pos: number[] = [], uv: number[] = [], indices: number[] = [];
    const remap = new Map<number, number>();
    const add = (x: number, y: number, z: number) => {
      const i = pos.length / 3;
      pos.push(x, y, z);
      uv.push((x - bounds.minX) / (bounds.maxX - bounds.minX), (bounds.maxZ - z) / (bounds.maxZ - bounds.minZ));
      return i;
    };
    const vertex = (n: number) => {
      let v = remap.get(n);
      if (v === undefined) remap.set(n, v = add(bounds.minX + (n % cols) * stepM, heights[n], bounds.minZ + Math.floor(n / cols) * stepM));
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
    let clip = false;
    const emit = (a: number, b: number, c: number) => {
      const face = [vertex(a), vertex(b), vertex(c)];
      let faces = [face];
      if (clip) for (const sl of slots) faces = faces.flatMap(f => subtractSlot(f, sl.planes, pos, add));
      for (const f of faces) for (let j = 1; j + 1 < f.length; j++) indices.push(f[0], f[j], f[j + 1]);
    };
    for (let id = 0; id < ls.length; id++) {
      const cx = lx[id], cz = lz[id], s = ls[id];
      clip = s === 1 && slotCell[cz * cellsX + cx] === 1;
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
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  /** Draw-time patches such as light pools must follow the original triangles,
   * including voids and the low-quality terrain tessellation. */
  trianglesNear(x: number,z: number,radius:number, visit:(a:number,b:number,c:number)=>void) {
    const {bounds,stepM}=this.grid.manifest, size=2*stepM;
    const index=this.geometry.index!;
    const rows=(this.starts.length-1)/this.blockCols;
    for(let j=Math.max(0,Math.floor((z-radius-bounds.minZ)/size));j<Math.floor(rows) && j<=Math.floor((z+radius-bounds.minZ)/size);j++)
      for(let i=Math.max(0,Math.floor((x-radius-bounds.minX)/size));i<this.blockCols && i<=Math.floor((x+radius-bounds.minX)/size);i++) {
        const k=j*this.blockCols+i;
        for(let n=this.starts[k];n<this.starts[k+1];n+=3) visit(index.getX(n),index.getX(n+1),index.getX(n+2));
      }
  }

  /** Drawn triangles whose block overlaps the box (see terrain/drape.ts). */
  trianglesIn(minX: number, maxX: number, minZ: number, maxZ: number,
    visit: (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number) => void) {
    const { bounds, stepM } = this.grid.manifest, size = 2 * stepM;
    const index = this.geometry.index!, p = this.geometry.getAttribute('position');
    const rows = (this.starts.length - 1) / this.blockCols;
    const j0 = Math.max(0, Math.floor((minZ - bounds.minZ) / size)), j1 = Math.min(rows - 1, Math.floor((maxZ - bounds.minZ) / size));
    const i0 = Math.max(0, Math.floor((minX - bounds.minX) / size)), i1 = Math.min(this.blockCols - 1, Math.floor((maxX - bounds.minX) / size));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * this.blockCols + i;
      for (let n = this.starts[k]; n < this.starts[k + 1]; n += 3) {
        const a = index.getX(n), b = index.getX(n + 1), c = index.getX(n + 2);
        visit(p.getX(a), p.getY(a), p.getZ(a), p.getX(b), p.getY(b), p.getZ(b), p.getX(c), p.getY(c), p.getZ(c));
      }
    }
  }

  /** Scene y on the actual drawn triangle, for placement at this quality. */
  sampleScene(x: number, z: number): number | null {
    const { bounds, stepM, rows, cols } = this.grid.manifest;
    if (!(x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ)) return null;
    const u = (x - bounds.minX) / stepM / 2, v = (z - bounds.minZ) / stepM / 2;
    const lastX = Math.ceil((cols - 1) / 2) - 1, lastZ = Math.ceil((rows - 1) / 2) - 1;
    const pos = this.geometry.getAttribute('position'), idx = this.geometry.index!;
    // A point exactly on a block boundary may belong to the valid side of a hole.
    for (let bz = Math.min(Math.floor(v), lastZ); bz >= Math.max(0, Math.ceil(v) - 1); bz--) {
      for (let bx = Math.min(Math.floor(u), lastX); bx >= Math.max(0, Math.ceil(u) - 1); bx--) {
        const k = bz * this.blockCols + bx;
        for (let i = this.starts[k]; i < this.starts[k + 1]; i += 3) {
          const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
          const ax = pos.getX(a), az = pos.getZ(a);
          const dx = pos.getX(b) - ax, dz = pos.getZ(b) - az;
          const ex = pos.getX(c) - ax, ez = pos.getZ(c) - az;
          const det = dx * ez - dz * ex;
          // Vertical faces (yield skirts) have no plan area.
          if (Math.abs(det) < 1e-9) continue;
          const wb = ((x - ax) * ez - (z - az) * ex) / det;
          const wc = (dx * (z - az) - dz * (x - ax)) / det;
          const wa = 1 - wb - wc;
          if (Math.min(wa, wb, wc) >= -1e-9) return wa * pos.getY(a) + wb * pos.getY(b) + wc * pos.getY(c);
        }
      }
    }
    return null;
  }
}
