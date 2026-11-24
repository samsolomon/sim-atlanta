import { type Build } from '../core/slice';
import * as THREE from 'three';
import { GroundGrid } from './grid';
import { type OpenSlot } from './openings';
import { farSurface, farSurfaceSteps, vertexNormalsSteps, nodeHeights, tessellate, yieldPlanes, type GroundYield, type SurfaceSpec, type TerrainJoins, type TerrainQuality } from './surface-build';

export { joinList, type GroundYield, type JoiningEdge, type TerrainJoins, type TerrainQuality } from './surface-build';

/** A surface built elsewhere (terrain/surface-worker.ts) from the same pure code. */
export interface BuiltSurface {
  heights: Float32Array; minY: number;
  pos: Float32Array; uv: Float32Array; normal: Float32Array; index: Uint32Array | Uint16Array;
  starts: Uint32Array; blockCols: number;
  far?: { errorM: number; lower?: boolean; pos: Float32Array; uv: Float32Array; normal: Float32Array; index: Uint32Array | Uint16Array };
}

export function surfaceSpec(grid: GroundGrid): SurfaceSpec {
  const m = grid.manifest;
  return { rows: m.rows, cols: m.cols, stepM: m.stepM, bounds: m.bounds, sha256: m.sha256, sceneZeroNavd88M: m.vertical.sceneZeroNavd88M };
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

  /** Only the far mesh is kept from a prebuilt surface: a carve replaces the near arrays. */
  private prebuiltFar?: BuiltSurface['far'];
  constructor(readonly grid: GroundGrid, private readonly quality: TerrainQuality,
    private readonly openings: readonly OpenSlot[] = [], private readonly join?: TerrainJoins, built?: BuiltSurface) {
    if (built) this.adopt(built);
    else this.build();
  }

  /** Take a mesh built off the main thread; a later carve rebuilds here as usual. */
  private adopt(b: BuiltSurface) {
    this.prebuiltFar = b.far;
    this.minY = b.minY;
    this.heights = b.heights;
    this.starts = b.starts;
    this.blockCols = b.blockCols;
    this.geometry.setAttribute('position', new THREE.BufferAttribute(b.pos, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(b.uv, 2));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(b.normal, 3));
    this.geometry.setIndex(new THREE.BufferAttribute(b.index, 1));
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
    const spec = surfaceSpec(this.grid);
    if (!this.heights) {
      const { heights, minY } = nodeHeights(spec, (r, c) => this.grid.node(r, c));
      this.heights = heights;
      this.minY = minY;
    }
    const { pos, uv, indices, starts, blockCols } = tessellate(spec, this.heights, this.quality, this.openings, this.join, this.yields);
    this.starts = starts;
    this.blockCols = blockCols;
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
  /** farGeometry as a build that yields while it works (core/slice.ts): a far level built in the
   * background must never hold a frame for a whole board. */
  *farGeometrySteps(errorM: number, maxCellM = 160, lower = false): Build<THREE.BufferGeometry> {
    const { pos, uv, indices } = yield* farSurfaceSteps(surfaceSpec(this.grid), this.heights, this.openings, errorM, maxCellM, lower);
    yield 'far arrays';
    const position = new Float32Array(pos);
    yield 'far arrays';
    const index = indices.length && pos.length / 3 > 65535 ? Uint32Array.from(indices) : Uint16Array.from(indices);
    yield 'far normals';
    const normal = yield* vertexNormalsSteps(position, index);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    return geometry;
  }

  farGeometry(errorM: number, maxCellM = 160, lower = false) {
    const far = this.prebuiltFar;
    this.prebuiltFar = undefined;
    if (far && far.errorM === errorM && maxCellM === 160 && !!far.lower === lower) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(far.pos, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(far.uv, 2));
      g.setAttribute('normal', new THREE.BufferAttribute(far.normal, 3));
      g.setIndex(new THREE.BufferAttribute(far.index, 1));
      return g;
    }
    const { pos, uv, indices } = farSurface(surfaceSpec(this.grid), this.heights, this.openings, errorM, maxCellM, lower);
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
