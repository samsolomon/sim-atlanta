/**
 * The downtown diorama: a fixed-angle orthographic view of a real-time miniature
 * Atlanta. Loaded on demand (dynamic import) so the 2D map never pays for Three.js.
 */
import * as THREE from 'three';
import type { RoutesFile } from '../model/types';
import type { Schedule } from '../sched/engine';
import { buildRails } from './rails';
import { loadScene, makeProjector } from './scene-data';
import { Trains3D } from './trains3d';
import type { TrainState } from '../model/types';

const TILT = THREE.MathUtils.degToRad(38); // camera elevation above the horizon
const VIEW_HEIGHT = 1400; // metres visible vertically at zoom 1

export interface Diorama {
  update(trains: TrainState[]): void;
  rotate(dir: 1 | -1): void;
  /** Centre the view on scene metres (x east, z −north) at a zoom level. */
  lookAt(x: number, z: number, zoom?: number): void;
  dispose(): void;
  /** Called with a train id (or null) when the user taps the scene. */
  onPick: (id: string | null) => void;
  stats(): { drawCalls: number; triangles: number; frameMs: number; surfaceCars: number; undergroundCars: number };
}

export async function createDiorama(container: HTMLElement, rf: RoutesFile, schedule: Schedule): Promise<Diorama> {
  const { manifest, geoms } = await loadScene('/data/scene/downtown');
  const project = makeProjector(manifest.origin);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0xe9e6df);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x8a8478, 1.6));
  const sun = new THREE.DirectionalLight(0xfff3dd, 1.6);
  sun.position.set(-600, 900, 400); // from the southwest, mid-afternoon-ish
  scene.add(sun);

  // Ground slab
  const b = manifest.bounds;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(b.maxX - b.minX + 400, b.maxZ - b.minZ + 400),
    new THREE.MeshLambertMaterial({ color: 0xe2ddd2 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((b.minX + b.maxX) / 2, -0.05, (b.minZ + b.maxZ) / 2);
  ground.renderOrder = 0;
  scene.add(ground);

  // Double-sided: Overture rings come in both windings, so some roofs/walls would otherwise be culled.
  const cityMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const roads = new THREE.Mesh(geoms.roads, new THREE.MeshLambertMaterial({ vertexColors: true }));
  roads.renderOrder = 1;
  const track = new THREE.Mesh(geoms.track, new THREE.MeshLambertMaterial({ vertexColors: true }));
  track.renderOrder = 1;
  const buildings = new THREE.Mesh(geoms.buildings, cityMat);
  buildings.renderOrder = 4;
  scene.add(roads, track, buildings, buildRails(rf, manifest, project));

  const trains = new Trains3D(schedule, manifest, project);
  scene.add(trains.group);

  // ---- camera: orthographic, fixed tilt, 90° rotation steps -------------------------
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 10000);
  const target = new THREE.Vector3(0, 0, 0); // Five Points
  let azimuth = THREE.MathUtils.degToRad(-30); // looking roughly north-northeast
  let azimuthGoal = azimuth;
  let zoom = 1.2;

  function placeCamera() {
    const d = 3000;
    camera.position.set(
      target.x + d * Math.cos(TILT) * Math.sin(azimuth),
      target.y + d * Math.sin(TILT),
      target.z + d * Math.cos(TILT) * Math.cos(azimuth),
    );
    camera.lookAt(target);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    const aspect = w / Math.max(1, h);
    camera.left = (-VIEW_HEIGHT * aspect) / 2;
    camera.right = (VIEW_HEIGHT * aspect) / 2;
    camera.top = VIEW_HEIGHT / 2;
    camera.bottom = -VIEW_HEIGHT / 2;
    placeCamera();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ---- input: drag to pan, wheel/pinch to zoom, tap to pick ------------------------
  const el = renderer.domElement;
  el.style.touchAction = 'none';
  const pointers = new Map<number, { x: number; y: number }>();
  let downAt = { x: 0, y: 0, t: 0 };
  let pinchDist = 0;
  const clampTarget = () => {
    target.x = THREE.MathUtils.clamp(target.x, b.minX, b.maxX);
    target.z = THREE.MathUtils.clamp(target.z, b.minZ, b.maxZ);
  };
  el.addEventListener('pointerdown', (e) => {
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already-released pointer: capture is a nicety, not required */
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (pointers.size === 2) {
      const [a, c] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - c.x, a.y - c.y);
    }
  });
  el.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, c] = [...pointers.values()];
      const d = Math.hypot(a.x - c.x, a.y - c.y);
      if (pinchDist > 0) zoom = THREE.MathUtils.clamp(zoom * (d / pinchDist), 0.6, 14);
      pinchDist = d;
      placeCamera();
      return;
    }
    // Pan on the ground plane: screen dx/dy → world metres.
    const mpp = VIEW_HEIGHT / zoom / el.clientHeight;
    const dx = (e.clientX - prev.x) * mpp;
    const dy = ((e.clientY - prev.y) * mpp) / Math.sin(TILT);
    target.x -= dx * Math.cos(azimuth) + dy * Math.sin(azimuth);
    target.z -= -dx * Math.sin(azimuth) + dy * Math.cos(azimuth);
    clampTarget();
    placeCamera();
  });
  const end = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    pinchDist = 0;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    if (e.type === 'pointerup' && moved < 6 && performance.now() - downAt.t < 400) pick(e);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoom = THREE.MathUtils.clamp(zoom * Math.exp(-e.deltaY * 0.0015), 0.6, 14);
      placeCamera();
    },
    { passive: false },
  );

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const diorama: Diorama = {
    onPick: () => {},
    // Trains are drawn up to 3× wide/tall when zoomed out (Mini Tokyo 3D does the same).
    update: (list) => trains.update(list, THREE.MathUtils.clamp(4.5 / zoom, 1, 3)),
    rotate(dir) {
      azimuthGoal += (dir * Math.PI) / 2;
    },
    lookAt(x, z, z0) {
      target.set(x, 0, z);
      clampTarget();
      if (z0) zoom = THREE.MathUtils.clamp(z0, 0.6, 14);
      placeCamera();
    },
    stats: () => ({ drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, frameMs, ...trains.counts() }),
    dispose() {
      running = false;
      ro.disconnect();
      renderer.dispose();
      el.remove();
    },
  };
  function pick(e: PointerEvent) {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    diorama.onPick(trains.pick(raycaster));
  }

  if (import.meta.env.DEV) Object.assign(window, { __scene: scene, __camera: camera });

  // ---- render loop (paused when the tab is hidden) ----------------------------------
  let running = true;
  let frameMs = 0;
  const loop = () => {
    if (!running) return;
    if (!document.hidden) {
      const t0 = performance.now();
      if (Math.abs(azimuthGoal - azimuth) > 1e-3) {
        azimuth += (azimuthGoal - azimuth) * 0.18;
        placeCamera();
      }
      renderer.render(scene, camera);
      frameMs = frameMs * 0.9 + (performance.now() - t0) * 0.1;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return diorama;
}
