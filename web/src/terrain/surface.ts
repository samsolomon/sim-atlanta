import * as THREE from 'three';
import underpassFloors from '../../../pipeline/prototypes/connector-footprint/underpass-floors.json';
import { GroundGrid } from './grid';
import { slotPlanes, subtractSlot, type OpenSlot } from './openings';

export type JoiningEdge = { x: number; minZ: number; maxZ: number } | { z: number; minX: number; maxX: number };
export type TerrainJoins = JoiningEdge | JoiningEdge[];
export const joinList = (join?: TerrainJoins): JoiningEdge[] => Array.isArray(join) ? join : join ? [join] : [];

export type TerrainQuality = 'low' | 'high';

// Each block is at most 2 × 2 source cells. High keeps all four; low merges flat
// blocks and stitches their shared edges to any neighbour that needs 5 m detail.
export class GroundSurface {
  readonly geometry = new THREE.BufferGeometry();
  readonly minY: number;
  private readonly starts: Uint32Array;
  private readonly blockCols: number;

  constructor(readonly grid: GroundGrid, quality: TerrainQuality, openings: readonly OpenSlot[] = [], join?: TerrainJoins) {
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
    let blockSlots: ReturnType<typeof slotPlanes>[] | undefined;
    const tri = (a: number, b: number, c: number) => {
      const ia = vertex(a), ib = vertex(b), ic = vertex(c);
      if (!blockSlots) {
        indices.push(ia, ib, ic);
        return;
      }
      let faces = [[ia, ib, ic]];
      for (const slot of blockSlots) faces = faces.flatMap(f => subtractSlot(f, slot.planes, pos, add));
      for (const f of faces) for (let j = 1; j + 1 < f.length; j++) indices.push(f[0], f[j], f[j + 1]);
    };
    for (let k = 0; k < detail.length; k++) {
      starts[k] = indices.length;
      blockSlots = slots.get(k);
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
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    this.geometry.setIndex(indices);
    this.geometry.computeVertexNormals();
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
