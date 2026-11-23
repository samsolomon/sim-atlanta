import * as THREE from 'three';
import { addSection, bounds, connect, joins, type Area, type Board, type Direction, type TrafficArea } from '../square-board/sections';
import type { TerrainQuality } from '../terrain/surface';
import { PAL } from '../vignette/world';

type Rect = Area['bounds'];
type Point = { x: number; z: number };
export const summitDowntown = '30306c74-51c3-4ae2-9a93-11f9341f87ee';
export const summitNorth = 'osm:way:39449002';

function inside(b: Rect, x: number, z: number, pad = 0) {
  return x >= b.minX - pad && x <= b.maxX + pad && z >= b.minZ - pad && z <= b.maxZ + pad;
}

export function nearSection(direction: Direction, x: number, z: number) {
  return inside(bounds[`${direction}-band`], x, z, 100) ||
    inside(bounds[`${direction}-corner`], x, z, 100);
}

export function nearestPoint(rects: Iterable<Rect>, x: number, z: number): Point {
  let best = { x, z }, distance = Infinity;
  for (const b of rects) {
    if (inside(b, x, z)) return { x, z };
    const px = THREE.MathUtils.clamp(x, b.minX, b.maxX), pz = THREE.MathUtils.clamp(z, b.minZ, b.maxZ);
    const d = (px - x) ** 2 + (pz - z) ** 2;
    if (d < distance) { distance = d; best = { x: px, z: pz }; }
  }
  return best;
}

// Every horizontal slice of the mounted footprint touches the west side of downtown.
// Trace the right edge where its width changes; the lip follows the actual mounted tiles.
export function mosaicPlinth(rects: Rect[], bottom: number) {
  const lip = 8;
  const west = Math.min(...rects.map(b => b.minX)) - lip;
  const levels = [...new Set(rects.flatMap(b => [b.minZ - lip, b.maxZ + lip]))].sort((a, b) => a - b);
  const shape = new THREE.Shape();
  shape.moveTo(west, -levels[0]);
  let lastEast = west;
  for (let i = 1; i < levels.length; i++) {
    const mid = (levels[i - 1] + levels[i]) / 2;
    const east = Math.max(...rects.filter(b => mid >= b.minZ - lip && mid <= b.maxZ + lip).map(b => b.maxX)) + lip;
    if (east !== lastEast) shape.lineTo(east, -levels[i - 1]);
    shape.lineTo(east, -levels[i]);
    lastEast = east;
  }
  shape.lineTo(west, -levels[levels.length - 1]); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  const base = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: PAL.walnut }));
  base.position.y = bottom - 6; base.receiveShadow = true;
  return base;
}

export class SquareMosaic {
  constructor(private readonly dataRoot: string) {}
  readonly areas = new Map<Board, Area>();
  readonly patches = new Map<Board, TrafficArea>();
  readonly joins = joins;
  private loading = new Set<Direction>();
  private failed = new Set<Direction>();
  private wanted?: Point;

  mount(id: 'king' | 'auburn', area: TrafficArea) {
    try { connect(this.areas, new Map([[id, area]])); }
    catch (error) { area.dispose(); throw error; }
  }

  point(x: number, z: number) {
    return nearestPoint(Array.from(this.areas.values(), a => a.bounds), x, z);
  }

  remember(x: number, z: number) {
    this.wanted = undefined;
    for (const d of ['north', 'south'] as const) {
      if (!this.patches.has(`${d}-band`) && (inside(bounds[`${d}-band`], x, z) || inside(bounds[`${d}-corner`], x, z))) {
        this.wanted = { x, z }; break;
      }
    }
  }
  retry() { this.failed.clear(); }
  cancelTarget() { this.wanted = undefined; }

  approach(x: number, z: number, quality: TerrainQuality, signal: AbortSignal,
    mounted: (areas: Map<Board, TrafficArea>, target?: Point) => void, failure: (d: Direction) => void) {
    for (const direction of ['north', 'south'] as const) {
      if (!nearSection(direction, x, z)) { this.failed.delete(direction); continue; }
      if (this.patches.has(`${direction}-band`) || this.loading.has(direction) || this.failed.has(direction) || signal.aborted) continue;
      this.loading.add(direction);
      void addSection(direction, this.areas, quality, signal, { northBuilding: summitNorth, dataRoot: this.dataRoot }).then(added => {
        if (signal.aborted) { for (const area of added.values()) area.dispose(); return; }
        for (const [id, area] of added) this.patches.set(id, area);
        const p = this.wanted;
        const reached = p && [...added.values()].some(a => inside(a.bounds, p.x, p.z));
        if (reached) this.wanted = undefined;
        mounted(added, reached ? p : undefined);
      }).catch(error => {
        if (!signal.aborted) {
          this.failed.add(direction);
          failure(direction);
          console.warn(direction + ' City terrain unavailable', error);
        }
      }).finally(() => this.loading.delete(direction));
    }
  }
  dispose() {
    for (const a of this.patches.values()) a.dispose();
    this.patches.clear(); this.areas.clear();
  }
}
