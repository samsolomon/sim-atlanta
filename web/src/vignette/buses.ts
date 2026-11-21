/**
 * Real MARTA buses on the diorama (tier: live). Positions come from /api/marta/bus (the
 * Worker's normalised GTFS-Realtime feed, polled every 30 s). Each fix is snapped to the
 * nearest street within 25 m, turned to the street direction closest to the reported bearing,
 * and glides to the next fix. Shown only when the clock is the real present.
 */
import * as THREE from 'three';
import { LiveBuses } from '../live/buses';
import type { LiveBus } from '../model/types';
import { makeProjector } from '../scene3d/scene-data';
import { segDist, type P2 } from './geom';
import { vehicleGeometry, vehicleMaterial } from './vehicles';
import type { World } from './world';

const MAX = 24;
const GLIDE_MS = 8000;
const STREETS = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'trunk']);

interface Shown {
  id: string;
  route: string;
  from: { x: number; z: number; a: number };
  to: { x: number; z: number; a: number };
  t0: number;
  at: number;
}

export class DioramaBuses {
  readonly mesh: THREE.InstancedMesh;
  private feed = new LiveBuses();
  private shown = new Map<string, Shown>();
  private project: (lon: number, lat: number) => [number, number];
  private obj = new THREE.Object3D();
  readonly night = { value: 0 };

  constructor(
    private world: World,
    origin: { lon: number; lat: number },
  ) {
    this.project = makeProjector(origin);
    this.mesh = new THREE.InstancedMesh(vehicleGeometry('bus'), vehicleMaterial(this.night), MAX);
    this.mesh.count = 0;
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    const white = new THREE.Color('#f4f4f2');
    for (let i = 0; i < MAX; i++) this.mesh.setColorAt(i, white);
  }

  /** Snap a fix onto the nearest street, facing the street direction nearest its bearing. */
  private snap(b: LiveBus): { x: number; z: number; a: number } | null {
    const [x, z] = this.project(b.position.value.lon, b.position.value.lat);
    if (!this.world.inBounds(x, z, 4)) return null;
    let best: { d: number; a: P2; c: P2 } | null = null;
    for (const r of this.world.data.roads) {
      if (!STREETS.has(r.cls)) continue;
      for (let i = 1; i < r.pts.length; i++) {
        const d = segDist(x, z, r.pts[i - 1], r.pts[i]);
        if (!best || d < best.d) best = { d, a: r.pts[i - 1], c: r.pts[i] };
      }
    }
    if (!best || best.d > 25) return null;
    const [ax, az] = best.a;
    const [cx, cz] = best.c;
    const l2 = (cx - ax) ** 2 + (cz - az) ** 2 || 1;
    const t = Math.min(1, Math.max(0, ((x - ax) * (cx - ax) + (z - az) * (cz - az)) / l2));
    let a = Math.atan2(cx - ax, cz - az);
    // GTFS bearing is degrees clockwise from north; in scene terms north is −z.
    if (b.bearing) {
      const want = Math.atan2(Math.sin((b.bearing.value * Math.PI) / 180), -Math.cos((b.bearing.value * Math.PI) / 180));
      if (Math.cos(want - a) < 0) a += Math.PI;
    }
    // Keep to the right-hand lane: offset 2.5 m right of travel.
    const px = ax + (cx - ax) * t - Math.cos(a) * 2.5;
    const pz = az + (cz - az) * t + Math.sin(a) * 2.5;
    return { x: px, z: pz, a };
  }

  /** Call every frame. `live` is false when the clock isn't the real present. */
  update(live: boolean) {
    if (!live) {
      this.mesh.count = 0;
      return;
    }
    void this.feed.poll();
    const now = performance.now();
    const seen = new Set<string>();
    for (const b of this.feed.current()) {
      const p = this.snap(b);
      if (!p) continue;
      seen.add(b.id);
      const prev = this.shown.get(b.id);
      if (!prev) this.shown.set(b.id, { id: b.id, route: b.routeId?.value ?? '', from: p, to: p, t0: now, at: b.at ?? 0 });
      else if ((b.at ?? 0) !== prev.at) {
        const cur = this.lerp(prev, now);
        this.shown.set(b.id, { ...prev, from: cur, to: p, t0: now, at: b.at ?? 0 });
      }
    }
    for (const id of [...this.shown.keys()]) if (!seen.has(id)) this.shown.delete(id);
    let i = 0;
    for (const s of this.shown.values()) {
      if (i >= MAX) break;
      const p = this.lerp(s, now);
      this.obj.position.set(p.x, this.world.ground(p.x, p.z) + 0.2, p.z);
      this.obj.rotation.set(0, p.a, 0);
      this.obj.updateMatrix();
      this.mesh.setMatrixAt(i++, this.obj.matrix);
    }
    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private lerp(s: Shown, now: number) {
    const t = Math.min(1, (now - s.t0) / GLIDE_MS);
    const e = t * t * (3 - 2 * t);
    let da = s.to.a - s.from.a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    return { x: s.from.x + (s.to.x - s.from.x) * e, z: s.from.z + (s.to.z - s.from.z) * e, a: s.from.a + da * e };
  }

  /** For the readout: live buses on the board and the freshest report age (s). */
  summary() {
    const now = this.feed.observationNow();
    const ages = [...this.shown.values()].map((s) => (now - s.at) / 1000);
    return { count: this.shown.size, freshest: ages.length ? Math.round(Math.min(...ages)) : null, unavailable: this.feed.unavailable };
  }
}
