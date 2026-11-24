/**
 * Streaming prototype (?stream=1): decides each streamed area's ring from the camera and swaps
 * what draws. The streamed areas are the square board's north and south bands with their corners
 * and the Midtown and Brookwood rows; downtown, King Memorial and Sweet Auburn always draw.
 *
 * Full areas still load at boot exactly as today. A full build is one long main-thread job, so
 * rebuilding one while the camera pans would hitch; until builds are sliced, the rings only change
 * visibility:
 *
 *   near      the full area draws, its LOD is hidden
 *   mid       the full area is hidden, a cheap LOD draws (coarse ground, building blocks, forest
 *             mass: three batched meshes on a shader program City already has)
 *   unloaded  neither draws, and the LOD's buffers are freed
 *
 * LODs load and unload freely: a Worker fetches and builds them from the shipped files, and their
 * uploads run as load-budget jobs (ground, then blocks, then forest). A full area stays visible
 * until its LOD is ready, so a swap never leaves a hole.
 */
import * as THREE from 'three';
import { loadBudget, type LoadStage } from '../../core/load-budget';
import { perf } from '../../core/perf';
import type { Board } from '../../square-board/sections';
import { bounds as boardBounds } from '../../square-board/sections';
import { boxDistance, nextRing, type Ring, type RingConfig } from './rings';
import { forestTint, LodWorker, lodMaterials, lodMeshes, type LodArea } from './lod';

/** The areas the rings swap. */
export const STREAMED: readonly Board[] = ['south-band', 'south-corner', 'north-band', 'north-corner',
  'midtown-south', 'midtown-central', 'midtown-upper', 'brookwood-south', 'brookwood-station'];

interface Unit {
  id: Board;
  ring: Ring;
  since: number;
  offscreenSince: number | null;
  lod?: LodArea;
  lodLoading: boolean;
  lodAbort?: AbortController;
  neededUntil: number;
  distance: number;
  fullShown: boolean | null;
  /** The full area's first frames: it draws unculled once, so hiding it never defers its upload. */
  warmFrames: number;
  warmed: THREE.Object3D | null;
}

/** What City lends the manager: its mounted full areas, and a note when what draws changes. */
export interface StreamHooks {
  full(id: Board): { group: THREE.Object3D } | undefined;
  /** A full area was shown or hidden (City redraws shadows and hides attached roots). */
  changed(id: Board, fullShown: boolean): void;
}

export interface StreamStats {
  rings: Record<string, Ring>;
  /** Streamed full areas drawing now. */
  full: string[];
  /** Streamed full areas mounted but hidden. */
  hidden: string[];
  lod: string[];
  lodTriangles: number;
  lodBytes: number;
  lodLoads: number;
  lodDrops: number;
  swaps: number;
}

export class StreamManager {
  private units: Unit[];
  private worker = new LodWorker();
  readonly materials = lodMaterials();
  readonly group = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m = new THREE.Matrix4();
  private box = new THREE.Box3();
  private lastTick = -Infinity;
  private counts = { lodLoads: 0, lodDrops: 0, lodBytes: 0, swaps: 0 };
  private tint = new THREE.Color();
  private disposed = false;

  constructor(private readonly cfg: RingConfig, private readonly low: boolean, private readonly bottomY: number,
    private readonly dataRoot: string, private readonly hooks: StreamHooks) {
    this.group.name = 'stream LOD';
    this.units = STREAMED.map(id => ({ id, ring: 'unloaded' as Ring, since: 0, offscreenSince: null,
      lodLoading: false, neededUntil: 0, distance: Infinity, fullShown: null, warmFrames: 0, warmed: null }));
    loadBudget.frameMs = low ? 4 : 8;
  }

  /** A camera link, search result or followed vehicle points at (x, z): draw something there now. */
  need(x: number, z: number, ms = 15000) {
    const now = performance.now();
    for (const u of this.units) if (inside(boardBounds[u.id], x, z, 150)) u.neededUntil = now + ms;
    this.lastTick = -Infinity;
  }

  /**
   * A full area just mounted. Before a ring may hide it, it draws once with frustum culling off,
   * so its buffers upload and its shaders compile during boot's load, not on the frame it first
   * comes near (that would be the same stall as a rebuild, in a new place).
   */
  mounted() {
    this.lastTick = -Infinity;
    for (const u of this.units) {
      const full = this.hooks.full(u.id);
      if (!full || u.warmed === full.group) continue;
      u.warmed = full.group;
      u.fullShown = null;
      const culled: THREE.Object3D[] = [];
      full.group.traverse(o => { if (o.frustumCulled) { o.frustumCulled = false; culled.push(o); } });
      u.warmFrames = 3;
      const restore = () => { if (--u.warmFrames > 0) requestAnimationFrame(restore); else for (const o of culled) o.frustumCulled = true; };
      requestAnimationFrame(restore);
      full.group.visible = true;
    }
  }

  /** Night: the blocks glow faintly warm, standing in for the near ring's lit windows. */
  setNight(factor: number) { this.materials.blocks.emissive.setRGB(0.20, 0.15, 0.08).multiplyScalar(factor); }

  groundAt(x: number, z: number) {
    for (const u of this.units) {
      const y = u.lod?.groundAt(x, z);
      if (y != null) return y;
    }
    return null;
  }

  /** LOD grounds drawing now, for picks on the board. */
  grounds() { return this.units.flatMap(u => u.lod?.group.visible ? [u.lod.ground] : []); }

  setSeason(doy: number) { this.materials.forest.color.copy(forestTint(doy, this.tint)); }

  update(camera: THREE.Camera, target: THREE.Vector3, fogFar: number, now = performance.now()) {
    if (this.disposed || now - this.lastTick < 200) return;
    this.lastTick = now;
    const groundY = target.y;
    this.m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.m);
    const p = camera.position;
    for (const u of this.units) {
      const b = boardBounds[u.id];
      const d = boxDistance(b, p.x, p.y, p.z, groundY);
      this.box.min.set(b.minX, groundY - 80, b.minZ);
      this.box.max.set(b.maxX, groundY + 320, b.maxZ);
      const visible = this.frustum.intersectsBox(this.box);
      u.distance = d;
      if (visible) u.offscreenSince = null;
      else u.offscreenSince ??= now;
      const next = nextRing(u.ring, {
        distance: d, fogFar, visible, offscreenFor: u.offscreenSince === null ? 0 : now - u.offscreenSince,
        inRingFor: now - u.since, needed: u.neededUntil > now,
        atTarget: inside(b, target.x, target.z, 250),
      }, this.cfg);
      if (next !== u.ring) {
        u.ring = next;
        u.since = now;
        perf.ring(u.id, next);
      }
      this.apply(u);
      if (u.lodLoading) loadBudget.reprioritize('lod:' + u.id, d);
    }
  }

  private apply(u: Unit) {
    if (u.ring === 'mid') this.ensureLod(u);
    const lodReady = !!u.lod && !u.lodLoading;
    // A full area draws when near, and as a stand-in until its LOD is ready.
    const showFull = u.warmFrames > 0 || u.ring === 'near' || (u.ring === 'mid' && !lodReady);
    const showLod = u.ring === 'mid' && lodReady;
    if (u.lod) u.lod.group.visible = showLod;
    const full = this.hooks.full(u.id);
    if (full && u.fullShown !== showFull) {
      full.group.visible = showFull;
      if (u.fullShown !== null) this.counts.swaps++;
      u.fullShown = showFull;
      this.hooks.changed(u.id, showFull);
    }
    // Free an LOD that nothing will draw soon: unloaded, or near for a while.
    if (u.ring === 'unloaded' || (u.ring === 'near' && performance.now() - u.since > 20000)) this.dropLod(u);
  }

  private ensureLod(u: Unit) {
    if (u.lod || u.lodLoading) return;
    u.lodLoading = true;
    const abort = u.lodAbort = new AbortController();
    void (async () => {
      const { result, bytes } = await this.worker.build(`${this.dataRoot}/scene/square-board/${u.id}`,
        { groundStepM: this.low ? 20 : 10, forestCellM: this.low ? 40 : 30, bottomY: this.bottomY });
      if (abort.signal.aborted) return;
      this.counts.lodBytes += bytes;
      const { area, parts } = lodMeshes(u.id, result, boardBounds[u.id], this.materials);
      area.bytes = bytes;
      area.group.visible = false;
      this.group.add(area.group);
      u.lod = area;
      // Upload one part per frame job, ground first.
      await Promise.all(parts.map(([stage, mesh]) => loadBudget.enqueue('lod:' + u.id, stage as LoadStage, () => {
        mesh.updateMatrix();
        area.group.add(mesh);
      }, { signal: abort.signal, priority: u.distance })));
      if (abort.signal.aborted) return;
      this.counts.lodLoads++;
      u.lodLoading = false;
      this.apply(u);
    })().catch(error => {
      if (!abort.signal.aborted && (error as Error)?.name !== 'AbortError') console.warn('stream LOD failed', u.id, error);
      // The full area keeps drawing; a later approach retries.
      if (u.lodAbort === abort) { u.lodLoading = false; u.lod?.dispose(); u.lod = undefined; }
    });
  }

  private dropLod(u: Unit) {
    if (!u.lod && !u.lodLoading) return;
    u.lodAbort?.abort();
    u.lodAbort = undefined;
    u.lodLoading = false;
    if (u.lod) { u.lod.dispose(); u.lod = undefined; this.counts.lodDrops++; }
  }

  /** Every area is in its ring, with its LOD ready where one draws. */
  get settled() { return this.units.every(u => !u.lodLoading && (u.ring !== 'mid' || !!u.lod)); }

  stats(): StreamStats {
    const rings: Record<string, Ring> = {};
    for (const u of this.units) rings[u.id] = u.ring;
    const mounted = this.units.filter(u => this.hooks.full(u.id));
    return {
      rings,
      full: mounted.filter(u => u.fullShown).map(u => u.id),
      hidden: mounted.filter(u => u.fullShown === false).map(u => u.id),
      lod: this.units.filter(u => u.lod?.group.visible).map(u => u.id),
      lodTriangles: this.units.reduce((n, u) => n + (u.lod?.triangles ?? 0), 0),
      lodBytes: this.counts.lodBytes, lodLoads: this.counts.lodLoads, lodDrops: this.counts.lodDrops, swaps: this.counts.swaps,
    };
  }

  dispose() {
    this.disposed = true;
    for (const u of this.units) this.dropLod(u);
    this.worker.dispose();
    this.group.removeFromParent();
    for (const m of Object.values(this.materials)) m.dispose();
  }
}

function inside(b: { minX: number; maxX: number; minZ: number; maxZ: number }, x: number, z: number, pad = 0) {
  return x >= b.minX - pad && x <= b.maxX + pad && z >= b.minZ - pad && z <= b.maxZ + pad;
}

/** Every board of the square, mounted or not. */
export function allBoardRects() { return Object.values(boardBounds); }
export { ringConfig } from './rings';
