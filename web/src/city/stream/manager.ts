/**
 * Streaming prototype (?stream=1): decides each square-board section's ring from the camera and
 * loads, swaps and frees it. Downtown, King Memorial and Sweet Auburn stay mounted (the root board
 * and its rail wiring); the streamed sections are the north and south bands with their corners and
 * the Midtown and Brookwood rows.
 *
 * Loads are staged through core/load-budget.ts: an area's LOD arrives first (ground, then blocks,
 * then forest, each its own frame job; the fetch and parse run in a Worker), and the full area
 * follows as one 'props' job, nearest first, one at a time. A full area replaces its LOD only once
 * it is mounted, and a demoted area keeps its full build until its LOD is on screen, so nothing
 * blinks out during a swap.
 */
import * as THREE from 'three';
import { loadBudget, type LoadStage } from '../../core/load-budget';
import { perf } from '../../core/perf';
import type { Board, Section, TrafficArea } from '../../square-board/sections';
import { bounds as boardBounds } from '../../square-board/sections';
import { SquareMosaic } from '../square-mosaic';
import type { TerrainQuality } from '../../terrain/surface';
import { boxDistance, nextRing, type Ring, type RingConfig } from './rings';
import { forestTint, LodWorker, lodMaterials, lodMeshes, type LodArea } from './lod';

interface Unit {
  section: Section;
  boards: Board[];
  ring: Ring;
  since: number;
  offscreenSince: number | null;
  full: 'none' | 'loading' | 'mounted';
  fullAbort?: AbortController;
  lods: Map<Board, LodArea>;
  lodLoading: boolean;
  lodAbort?: AbortController;
  neededUntil: number;
  distance: number;
}

export interface StreamHooks {
  /** Full areas mounted into the mosaic; City wires rail, traffic and scenery to them. */
  mounted(added: Map<Board, TrafficArea>): void;
  /** Full areas unmounted and disposed; City drops its references. */
  unmounted(removed: Map<Board, TrafficArea>): void;
  /** Full loads wait for this (the white model's reveal). */
  held(): boolean;
  failed(section: Section, error: unknown): void;
}

export interface StreamStats {
  rings: Record<string, Ring>;
  full: string[];
  lod: string[];
  lodTriangles: number;
  lodBytes: number;
  fullLoads: number;
  lodLoads: number;
  unmounts: number;
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
  private fullBusy = false;
  private counts = { fullLoads: 0, lodLoads: 0, unmounts: 0, lodBytes: 0 };
  private tint = new THREE.Color();
  private disposed = false;
  /** Full builds are one long main-thread job: start them only once the camera rests. */
  private lastEye = new THREE.Vector3(NaN, NaN, NaN);
  private movedAt = -Infinity;
  static readonly REST_MS = 400;
  static readonly MAX_WAIT_MS = 2500;

  constructor(private readonly mosaic: SquareMosaic, private readonly quality: TerrainQuality,
    private readonly cfg: RingConfig, private readonly low: boolean, private readonly bottomY: number,
    private readonly dataRoot: string, private readonly hooks: StreamHooks) {
    this.group.name = 'stream LOD';
    this.units = mosaic.sections.map(section => ({
      section, boards: SquareMosaic.boards(section), ring: 'unloaded' as Ring, since: 0, offscreenSince: null,
      full: 'none' as const, lods: new Map(), lodLoading: false, neededUntil: 0, distance: Infinity,
    }));
    loadBudget.frameMs = low ? 4 : 8;
  }

  /** Every streamed board, mounted or not: the extent the camera may roam. */
  get boards(): Board[] { return this.units.flatMap(u => u.boards); }

  /** A camera link, search result or followed vehicle needs full detail at (x, z) now. */
  need(x: number, z: number, ms = 15000) {
    const now = performance.now();
    for (const u of this.units) if (u.boards.some(id => inside(boardBounds[id], x, z, 150))) u.neededUntil = now + ms;
    this.lastTick = -Infinity;
  }

  groundAt(x: number, z: number) {
    for (const u of this.units) for (const lod of u.lods.values()) {
      const y = lod.groundAt(x, z);
      if (y !== null) return y;
    }
    return null;
  }

  /** LOD grounds, for picks on the board. */
  grounds() { return this.units.flatMap(u => u.full === 'mounted' ? [] : [...u.lods.values()].map(l => l.ground)); }

  setSeason(doy: number) { this.materials.forest.color.copy(forestTint(doy, this.tint)); }

  update(camera: THREE.Camera, groundY: number, fogFar: number, now = performance.now()) {
    if (this.disposed) return;
    if (this.lastEye.distanceToSquared(camera.position) > 0.01 || Number.isNaN(this.lastEye.x)) { this.lastEye.copy(camera.position); this.movedAt = now; }
    if (now - this.lastTick < 250) return;
    const dt = now - this.lastTick;
    this.lastTick = now;
    this.m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.m);
    const p = camera.position;
    for (const u of this.units) {
      let d = Infinity, visible = false;
      for (const id of u.boards) {
        const b = boardBounds[id];
        d = Math.min(d, boxDistance(b, p.x, p.y, p.z, groundY));
        this.box.min.set(b.minX, groundY - 80, b.minZ);
        this.box.max.set(b.maxX, groundY + 320, b.maxZ);
        visible ||= this.frustum.intersectsBox(this.box);
      }
      u.distance = d;
      if (visible) u.offscreenSince = null;
      else u.offscreenSince ??= now;
      const next = nextRing(u.ring, {
        distance: d, fogFar, visible, offscreenFor: u.offscreenSince === null ? 0 : now - u.offscreenSince,
        inRingFor: now - u.since, needed: u.neededUntil > now && u.full !== 'mounted',
      }, this.cfg);
      if (next !== u.ring) {
        u.ring = next;
        u.since = now;
        for (const id of u.boards) perf.ring(id, next);
      }
      void dt;
      this.apply(u);
    }
    for (const u of this.units) {
      if (u.fullAbort) loadBudget.reprioritize(u.section, u.distance);
      if (u.lodLoading) loadBudget.reprioritize('lod:' + u.section, u.distance);
    }
    this.pumpFull();
  }

  private apply(u: Unit) {
    if (u.ring === 'unloaded') {
      this.dropFull(u);
      this.dropLod(u);
      return;
    }
    this.ensureLod(u);
    if (u.ring === 'mid' && u.full !== 'none' && (u.lods.size === u.boards.length || u.full === 'loading')) this.dropFull(u);
    this.showLod(u);
  }

  private showLod(u: Unit) {
    const visible = u.full !== 'mounted';
    for (const lod of u.lods.values()) lod.group.visible = visible;
  }

  private ensureLod(u: Unit) {
    if (u.lods.size || u.lodLoading) return;
    u.lodLoading = true;
    const abort = u.lodAbort = new AbortController();
    const step = this.low ? 20 : 10;
    const jobs = u.boards.map(async id => {
      const { result, bytes } = await this.worker.build(`${this.dataRoot}/scene/square-board/${id}`,
        { groundStepM: step, forestCellM: this.low ? 40 : 30, bottomY: this.bottomY });
      if (abort.signal.aborted) return;
      this.counts.lodBytes += bytes;
      const { area, parts } = lodMeshes(id, result, boardBounds[id], this.materials);
      area.bytes = bytes;
      area.group.visible = false;
      this.group.add(area.group);
      u.lods.set(id, area);
      // Upload one part per frame job, ground first.
      await Promise.all(parts.map(([stage, mesh]) => loadBudget.enqueue('lod:' + u.section, stage as LoadStage, () => {
        mesh.updateMatrix();
        area.group.add(mesh);
      }, { signal: abort.signal, priority: u.distance })));
    });
    void Promise.all(jobs).then(() => {
      if (abort.signal.aborted) return;
      this.counts.lodLoads++;
      this.showLod(u);
      this.apply(u);
    }).catch(error => {
      if (!abort.signal.aborted) { console.warn('stream LOD failed', u.section, error); this.hooks.failed(u.section, error); }
    }).finally(() => { if (u.lodAbort === abort) u.lodLoading = false; });
  }

  private dropLod(u: Unit) {
    u.lodAbort?.abort();
    u.lodAbort = undefined;
    u.lodLoading = false;
    for (const lod of u.lods.values()) lod.dispose();
    u.lods.clear();
  }

  /** One full build at a time, nearest wanted section first. */
  private pumpFull() {
    if (this.fullBusy || this.hooks.held()) return;
    const want = this.units.filter(u => u.ring === 'near' && u.full === 'none').sort((a, b) => a.distance - b.distance)[0];
    if (!want) return;
    // A followed vehicle keeps the camera moving: a near section waits at most MAX_WAIT_MS.
    const now = performance.now();
    if (now - this.movedAt < StreamManager.REST_MS && now - want.since < StreamManager.MAX_WAIT_MS) return;
    this.fullBusy = true;
    want.full = 'loading';
    const abort = want.fullAbort = new AbortController();
    void loadBudget.enqueue(want.section, 'props', async () => {
      const added = await this.mosaic.load(want.section, this.quality, abort.signal);
      if (!added) return;
      // mosaic.load already frees a build aborted before it returned; this covers any abort after.
      if (abort.signal.aborted) { this.mosaic.unmount(want.section, added); return; }
      if (want.ring !== 'near') { this.mosaic.unmount(want.section, added); want.full = 'none'; return; }
      want.full = 'mounted';
      this.counts.fullLoads++;
      this.showLod(want);
      this.hooks.mounted(added);
    }, { signal: abort.signal, priority: want.distance }).catch(error => {
      if (!abort.signal.aborted && (error as Error)?.name !== 'AbortError') {
        console.warn('stream full load failed', want.section, error);
        this.hooks.failed(want.section, error);
        // Stay on the LOD; a later approach retries after the dwell.
        want.ring = 'mid'; want.since = performance.now();
      }
    }).finally(() => {
      if (want.fullAbort === abort) { want.fullAbort = undefined; if (want.full === 'loading') want.full = 'none'; }
      this.fullBusy = false;
      this.lastTick = -Infinity;
    });
  }

  private dropFull(u: Unit) {
    if (u.full === 'loading') { u.fullAbort?.abort(); return; }
    if (u.full !== 'mounted') return;
    u.full = 'none';
    // Show the LOD (if any) first, so the swap has no empty frame.
    this.showLod(u);
    const removed = this.mosaic.unmount(u.section);
    this.counts.unmounts++;
    this.hooks.unmounted(removed);
  }

  /** Has every section reached its ring with nothing loading? */
  get settled() {
    return !this.fullBusy && this.units.every(u => !u.lodLoading &&
      (u.ring !== 'near' || u.full === 'mounted') && (u.ring === 'unloaded' || u.lods.size === u.boards.length));
  }

  stats(): StreamStats {
    const rings: Record<string, Ring> = {};
    for (const u of this.units) for (const id of u.boards) rings[id] = u.ring;
    let lodTriangles = 0;
    for (const u of this.units) for (const l of u.lods.values()) lodTriangles += l.triangles;
    return {
      rings,
      full: this.units.filter(u => u.full === 'mounted').flatMap(u => u.boards),
      lod: this.units.flatMap(u => [...u.lods.keys()]),
      lodTriangles, lodBytes: this.counts.lodBytes,
      fullLoads: this.counts.fullLoads, lodLoads: this.counts.lodLoads, unmounts: this.counts.unmounts,
    };
  }

  dispose() {
    this.disposed = true;
    for (const u of this.units) { u.fullAbort?.abort(); this.dropLod(u); }
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
