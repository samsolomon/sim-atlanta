/**
 * Trains as instanced low-poly cars. Each car is placed by sampling the train's path at
 * s − i·(carLength + gap), so a six-car MARTA train bends around curves and dips into
 * portals car by car. Cars below ground go into a ghosted mesh drawn through the city.
 */
import * as THREE from 'three';
import { MODE_COLOR } from '../map/layers';
import type { TrainState } from '../model/types';
import { pointAt, type Schedule } from '../sched/engine';
import { depthTint, UNDERGROUND } from './rails';
import { elevationAt, type SceneManifest } from './scene-data';

const MAX_CARS = 800;
const GAP = 1.0;

export class Trains3D {
  readonly group = new THREE.Group();
  private surface: THREE.InstancedMesh;
  private under: THREE.InstancedMesh;
  private ids: { surface: string[]; under: string[] } = { surface: [], under: [] };
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private white = new THREE.Color(0xffffff);
  private tint = new THREE.Color();

  constructor(
    private schedule: Schedule,
    private manifest: SceneManifest,
    private project: (lon: number, lat: number) => [number, number],
  ) {
    // Unit car: 1 m long along +z (scaled per vehicle type), 3 m wide, 3.6 m tall, sitting on y = 0.
    const geo = new THREE.BoxGeometry(3, 3.6, 1);
    geo.translate(0, 1.8, 0);
    this.surface = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), MAX_CARS);
    this.under = new THREE.InstancedMesh(
      geo,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }),
      MAX_CARS,
    );
    this.surface.renderOrder = 3;
    this.under.renderOrder = 11;
    for (const m of [this.surface, this.under]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0;
      m.frustumCulled = false;
      this.group.add(m);
    }
  }

  /** `exaggerate` scales car width/height (not length) so trains read when zoomed out. */
  update(trains: TrainState[], exaggerate = 1) {
    const b = this.manifest.bounds;
    const pad = 200;
    let ns = 0;
    let nu = 0;
    this.ids.surface.length = 0;
    this.ids.under.length = 0;
    for (const t of trains) {
      if (!t.pathId) continue; // unsnapped live fix: no honest place on the track
      const geom = this.schedule.path(t.pathId);
      if (!geom) continue;
      const route = this.schedule.routes.get(t.routeId);
      const vt = this.schedule.vehicleTypes.get(t.vehicleType);
      const carLen = vt?.lengthM ?? 20;
      const cars = Math.max(1, vt?.typicalUnits ?? 1);
      const prof = this.manifest.profiles[t.pathId];
      const live = t.s.tier === 'live';
      this.color.set(MODE_COLOR[route?.mode ?? 'heavy_rail']);
      if (!live) this.color.lerp(this.white, 0.3); // scheduled trains read lighter
      for (let i = 0; i < cars; i++) {
        const sc = t.s.value - carLen / 2 - i * (carLen + GAP);
        if (sc < 0) break;
        const p = pointAt(geom, sc);
        const [x, z] = this.project(p.lon, p.lat);
        if (x < b.minX - pad || x > b.maxX + pad || z < b.minZ - pad || z > b.maxZ + pad) continue;
        const y = elevationAt(prof, sc);
        const ahead = pointAt(geom, sc + 2);
        const [xa, za] = this.project(ahead.lon, ahead.lat);
        const ya = elevationAt(prof, sc + 2);
        this.dummy.position.set(x, y, z);
        this.dummy.lookAt(xa, ya, za);
        this.dummy.scale.set(exaggerate, exaggerate, carLen);
        this.dummy.updateMatrix();
        const underground = y < UNDERGROUND;
        const mesh = underground ? this.under : this.surface;
        const k = underground ? nu++ : ns++;
        if (k >= MAX_CARS) continue;
        mesh.setMatrixAt(k, this.dummy.matrix);
        // Underground cars keep their mode colour but darken with depth, like the tunnels.
        mesh.setColorAt(k, underground ? this.tint.copy(this.color).multiply(depthTint(y, new THREE.Color()).addScalar(0.25)) : this.color);
        (underground ? this.ids.under : this.ids.surface)[k] = t.id;
      }
    }
    this.surface.count = Math.min(ns, MAX_CARS);
    this.under.count = Math.min(nu, MAX_CARS);
    for (const m of [this.surface, this.under]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      // Raycasting culls against a cached bounding sphere; refresh it as trains move.
      m.computeBoundingSphere();
    }
  }

  counts() {
    return { surfaceCars: this.surface.count, undergroundCars: this.under.count };
  }

  /** Train id under the pointer, preferring surface cars. */
  pick(ray: THREE.Raycaster): string | null {
    for (const [mesh, ids] of [
      [this.surface, this.ids.surface],
      [this.under, this.ids.under],
    ] as const) {
      const hit = ray.intersectObject(mesh, false)[0];
      if (hit?.instanceId != null) return ids[hit.instanceId] ?? null;
    }
    return null;
  }
}
