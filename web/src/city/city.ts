/**
 * City: downtown Atlanta as a model-railway diorama, in the same style as the East Portal
 * vignette (ink lines, colour grade, tilt-shift) and built by the same engine (`vignette/world`).
 * Loaded on demand from the main app, so the Map never pays for Three.js.
 *
 * The board is about ten times East Portal's area, so it is built lighter: a flat board, MARTA
 * drawn only where it is open to the sky, and quality tiers decided once from the device.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { Atmosphere } from '../core/atmosphere';
import type { GroundCamera } from '../core/camera';
import type { RoutesFile } from '../model/types';
import type { SceneManifest } from '../core/scene-data';
import { alignment } from '../vignette/alignment';
import { Line } from '../vignette/geom';
import { gradeShader } from '../vignette/grade';
import { inkShader } from '../vignette/ink';
import { local } from '../vignette/time';
import { tiltShiftShader } from '../vignette/tiltshift';
import { Rain } from '../vignette/weather';
import { World, type Alignment, type VData } from '../vignette/world';
import { Snow } from './snow';

export type Quality = 'low' | 'high';

export interface CityView {
  bounds: VData['bounds'];
  /** Centre the view on scene metres (x east, z −north). */
  lookAt(x: number, z: number, camera?: GroundCamera & { tilt?: number }): void;
  target(): { x: number; z: number };
  camera(): GroundCamera & { tilt: number };
  /** Pan by a screen offset in CSS pixels (keyboard movement). */
  pan(dxPx: number, dyPx: number): void;
  /** Turn the view by degrees (Q/E). */
  rotate(degrees: number): void;
  /** Zoom a step in (+1) or out (−1). */
  zoom(dir: 1 | -1): void;
  /** Sun, darkness and weather from the shared atmosphere; the date sets the season. */
  setAtmosphere(a: Atmosphere, now: Date): void;
  quality: Quality;
  stats(): { fps: number; drawCalls: number; triangles: number; buildMs: number; stages: Record<string, number> };
  dispose(): void;
}

/** Phones and small touch screens get the light tier; `?q=low|high` overrides. */
export function pickQuality(): Quality {
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'low' || q === 'high') return q;
  const touch = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 820;
  return touch && small ? 'low' : 'high';
}

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export async function createCity(container: HTMLElement, rf: RoutesFile, quality = pickQuality(), loading: {
  signal?: AbortSignal;
  progress?: (label: string) => void;
} = {}): Promise<CityView> {
  const DATA = `${BASE}/data`;
  const low = quality === 'low';
  const [vd, manifest, trees] = await Promise.all([
    fetch(`${DATA}/scene/downtown/vignette.json`, { signal: loading.signal }).then((r) => {
      if (!r.ok) throw new Error(`city data ${r.status}`);
      return r.json();
    }) as Promise<VData>,
    fetch(`${DATA}/scene/downtown/scene.json`, { signal: loading.signal }).then((r) => {
      if (!r.ok) throw new Error(`city profiles ${r.status}`);
      return r.json();
    }) as Promise<SceneManifest>,
    fetch(`${DATA}/scene/downtown/trees.json`, { signal: loading.signal }).then((r) => {
      if (!r.ok) throw new Error(`city trees ${r.status}`);
      return r.json();
    }),
  ]);
  const b = vd.bounds;

  // ---- the board ----------------------------------------------------------------------
  const t0 = performance.now();
  const stages: Record<string, number> = {};
  const build = async (name: string, fn: () => void) => {
    loading.progress?.(`Building ${name}…`);
    // Let the loading plate paint and a Map click cancel between construction stages.
    await new Promise((resolve) => setTimeout(resolve, 0));
    loading.signal?.throwIfAborted();
    const start = performance.now();
    fn();
    stages[name] = Math.round(performance.now() - start);
  };
  const world = new World(vd, null, { terrain: 'flat', clumps: low ? 4 : 8, lightMapMax: 2048 });
  if (trees?.trees?.length) world.realTrees = trees.trees;
  let marta: Alignment[] = [];
  try {
    await build('board', () => {
      marta = martaAlignments(rf, manifest, b);
      world.setOpenCuts(marta); // the flat board leaves a slot over each open cut
      world.buildBoard();
    });
    await build('streets', () => world.buildStreets());
    await build('ground', () => world.buildGround());
    await build('rail', () => { for (const al of marta) world.buildMarta(al); world.buildFreight(); world.buildTram(); });
    await build('buildings', () => world.buildBuildings());
    await build('trees', () => world.buildTrees());
    await build('lights', () => world.buildLights());
  } catch (err) {
    world.dispose();
    throw err;
  }
  const buildMs = Object.values(stages).reduce((sum, ms) => sum + ms, 0);
  loading.progress?.('Drawing downtown…');

  // ---- renderer -------------------------------------------------------------------------
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !low, powerPreference: 'high-performance' });
  } catch (err) {
    world.dispose();
    throw err;
  }
  renderer.info.autoReset = false;
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = low ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';

  const scene = new THREE.Scene();
  const bg = new THREE.Color('#e7e2d8');
  scene.background = bg;
  scene.fog = new THREE.Fog('#e7e2d8', 5000, 12000);
  scene.add(world.group);
  // Trim content to the board, retaining the ground, cut edge and walnut lip.
  const edges = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -b.minX),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), b.maxX),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -b.minZ),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), b.maxZ),
  ];
  for (const child of world.group.children.slice(3)) child.traverse((o) => {
    const material = (o as THREE.Mesh).material;
    for (const mat of Array.isArray(material) ? material : material ? [material] : []) {
      mat.clippingPlanes = edges;
      mat.clipShadows = true;
    }
  });
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;

  // The studio table under the diorama.
  const tableMat = new THREE.MeshLambertMaterial({ color: '#d8d2c6' });
  const table = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), tableMat);
  table.rotation.x = -Math.PI / 2;
  table.position.set(cx, -24.05, cz);
  table.receiveShadow = true;
  scene.add(table);

  const hemi = new THREE.HemisphereLight('#e4ecf7', '#a48d72', 1.5);
  const sun = new THREE.DirectionalLight('#fff1da', 2.8);
  sun.castShadow = true;
  // The shadow box follows the camera's target, so shadows stay sharp wherever you look.
  const SH = low ? 520 : 700;
  const sc = sun.shadow.camera;
  sc.left = -SH;
  sc.right = SH;
  sc.top = SH;
  sc.bottom = -SH;
  sc.near = 100;
  sc.far = 4000;
  sun.shadow.mapSize.set(low ? 2048 : 4096, low ? 2048 : 4096);
  sun.shadow.bias = -0.0016;
  sun.shadow.normalBias = 1.2;
  scene.add(hemi, sun, sun.target);

  const rain = new Rain(low ? 4000 : 9000, 2400, 450);
  const snow = new Snow(low ? 2500 : 6000);
  scene.add(rain.mesh, snow.mesh);

  // ---- camera ---------------------------------------------------------------------------
  const camera = new THREE.PerspectiveCamera(22, 1, 20, 20000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minPolarAngle = THREE.MathUtils.degToRad(20);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(72);
  controls.minDistance = 150;
  controls.maxDistance = 6500;
  controls.screenSpacePanning = false;
  controls.keys = { LEFT: '', UP: '', RIGHT: '', BOTTOM: '' }; // the shell owns the keyboard
  const clampTarget = () => {
    const t = controls.target;
    const dx = THREE.MathUtils.clamp(t.x, b.minX, b.maxX) - t.x;
    const dz = THREE.MathUtils.clamp(t.z, b.minZ, b.maxZ) - t.z;
    if (dx || dz) {
      t.x += dx;
      t.z += dz;
      camera.position.x += dx;
      camera.position.z += dz;
    }
  };
  controls.addEventListener('change', clampTarget);

  function setView(azDeg: number, polarDeg: number, dist: number, tx = controls.target.x, tz = controls.target.z) {
    controls.target.set(tx, 0, tz);
    const az = THREE.MathUtils.degToRad(azDeg);
    const po = THREE.MathUtils.degToRad(polarDeg);
    camera.position.set(tx + dist * Math.sin(po) * Math.sin(az), dist * Math.cos(po), tz + dist * Math.sin(po) * Math.cos(az));
    controls.update();
  }
  // Opening view: downtown at a glance from the southwest — the Gulch in front, Five Points,
  // and the Peachtree Center towers behind.
  setView(-28, 57, 5500, -40, -260);

  // ---- post: ink, ambient occlusion, bloom, tilt-shift, grade ------------------------------
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  sceneTarget.depthTexture = new THREE.DepthTexture(1, 1);
  const composer = new EffectComposer(renderer, sceneTarget);
  composer.addPass(new RenderPass(scene, camera));
  const ink = new ShaderPass(inkShader());
  composer.addPass(ink);
  const gtao = low ? null : new GTAOPass(scene, camera, 1, 1);
  if (gtao) {
    gtao.updateGtaoMaterial({ radius: 6, distanceExponent: 1.5, thickness: 4, scale: 1.2 });
    gtao.blendIntensity = 0.9;
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0, 0.55, 0.82);
  composer.addPass(bloom);
  const hts = new ShaderPass(tiltShiftShader([1, 0]));
  const vts = new ShaderPass(tiltShiftShader([0, 1]));
  composer.addPass(hts);
  composer.addPass(vts);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(gradeShader());
  composer.addPass(grade);
  const tilt = Number(new URLSearchParams(location.search).get('tilt') ?? 0.65);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const pr = renderer.getPixelRatio();
    ink.uniforms.uTexel.value.set(1 / (w * pr), 1 / (h * pr));
    ink.uniforms.uWidth.value = Math.max(1, pr);
    grade.uniforms.uRes.value.set(w * pr, h * pr);
    for (const p of [hts, vts]) {
      p.uniforms.uTexel.value.set(1 / w, 1 / h);
      p.uniforms.uStrength.value = tilt;
      p.enabled = tilt > 0.01;
    }
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // Double-click glides to the spot on the ground plane (no raycast through the big meshes).
  let glideTo: THREE.Vector3 | null = null;
  const ndc = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const onDbl = (ev: MouseEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(groundPlane, hit) && world.inBounds(hit.x, hit.z)) glideTo = hit;
  };
  renderer.domElement.addEventListener('dblclick', onDbl);

  // ---- sun, sky, weather --------------------------------------------------------------
  const C = (x: string) => new THREE.Color(x);
  const pal = {
    skyDay: C('#e4ecf7'), skyNight: C('#6f86c8'),
    gndDay: C('#a48d72'), gndNight: C('#2c3346'),
    bgDay: C('#e7e2d8'), bgDusk: C('#e2b998'), bgNight: C('#232a3f'),
    tableDay: C('#d8d2c6'), tableNight: C('#2b3142'),
    sunHigh: C('#fff1da'), sunLow: C('#ffa45c'),
    greySky: C('#cfd4da'), greyBg: C('#c6c8c9'), greyBgNight: C('#1e2229'), greySun: C('#e8ecf0'),
    snowBg: C('#eef0f2'),
  };
  const sm = (a: number, c: number, x: number) => {
    const k = Math.min(1, Math.max(0, (x - a) / (c - a)));
    return k * k * (3 - 2 * k);
  };
  let atm: Atmosphere = { sunElev: 40, sunAz: 180, dark: 0, cloud: 0, rain: 0, snow: 0, fog: 0 };
  const wx = { cloud: 0, rain: 0, snow: 0, fog: 0 }; // eased toward the atmosphere's weather
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shadowTarget = new THREE.Vector3(Infinity, 0, Infinity);
  let shadowElev = Infinity;
  let shadowAz = Infinity;

  function environment(dt: number) {
    const el = atm.sunElev;
    const day = sm(-6, 10, el);
    const gold = (1 - sm(3, 28, el)) * sm(-3, 2, el);
    const elDir = Math.max(el, 4) * (Math.PI / 180);
    const az = atm.sunAz * (Math.PI / 180);
    const t = controls.target;
    if (t.distanceToSquared(shadowTarget) > 1 || Math.abs(el - shadowElev) > 0.1 || Math.abs(atm.sunAz - shadowAz) > 0.1) {
      renderer.shadowMap.needsUpdate = true;
      shadowTarget.copy(t);
      shadowElev = el;
      shadowAz = atm.sunAz;
    }
    sun.position.set(t.x + Math.sin(az) * Math.cos(elDir) * 2000, Math.sin(elDir) * 2000, t.z - Math.cos(az) * Math.cos(elDir) * 2000);
    sun.target.position.set(t.x, 0, t.z);
    sun.intensity = 2.9 * sm(-1, 7, el);
    sun.color.copy(pal.sunHigh).lerp(pal.sunLow, gold);
    hemi.color.copy(pal.skyNight).lerp(pal.skyDay, day);
    hemi.groundColor.copy(pal.gndNight).lerp(pal.gndDay, day);
    hemi.intensity = 1.05 + 0.45 * day;
    bg.copy(pal.bgNight).lerp(pal.bgDay, day).lerp(pal.bgDusk, gold * 0.7);
    tableMat.color.copy(pal.tableNight).lerp(pal.tableDay, day);
    const night = atm.dark;
    world.setNight(night);
    bloom.strength = 0.55 * night;
    bloom.enabled = !low && night > 0.02;

    const ease = 1 - Math.exp(-dt * 2);
    wx.cloud += (atm.cloud - wx.cloud) * ease;
    wx.rain += (atm.rain - wx.rain) * ease;
    wx.snow += (atm.snow - wx.snow) * ease;
    wx.fog += (atm.fog - wx.fog) * ease;
    const cl = wx.cloud;
    sun.intensity *= 1 - 0.85 * cl;
    sun.color.lerp(pal.greySun, cl * 0.6);
    hemi.color.lerp(pal.greySky, cl * 0.6 * day);
    hemi.intensity += 0.25 * cl * day;
    bg.lerp(day > 0.5 ? pal.greyBg : pal.greyBgNight, cl * 0.75);
    bg.lerp(pal.snowBg, wx.snow * day * 0.4);
    world.setWet(wx.rain);
    const dist = camera.position.distanceTo(controls.target);
    const f = Math.max(wx.fog, wx.rain * 0.5);
    const fog = scene.fog as THREE.Fog;
    fog.color.copy(bg);
    fog.near = dist * (1.5 - 0.65 * f);
    fog.far = dist * (3.0 - 1.25 * f);
    rain.update(reduceMotion ? 0 : performance.now() / 1000, controls.target, reduceMotion ? 0 : wx.rain);
    snow.update(performance.now() / 1000, controls.target, reduceMotion ? 0 : wx.snow, renderer.getPixelRatio());
    // Keep the centre readable while fog softens the edges, matching the Map atmosphere.
    for (const pass of [hts, vts]) {
      pass.uniforms.uStrength.value = tilt + wx.fog * 4;
      pass.enabled = tilt + wx.fog * 4 > 0.01;
    }
  }

  // ---- loop -----------------------------------------------------------------------------
  let raf = 0;
  let frames = 0;
  let fpsT = performance.now();
  let fps = 0;
  let lastFrame = performance.now();
  const frame = (ts: number) => {
    raf = requestAnimationFrame(frame);
    environment(Math.min(1, Math.max(0, (ts - lastFrame) / 1000)));
    lastFrame = ts;
    if (glideTo) {
      const step = glideTo.clone().sub(controls.target).multiplyScalar(reduceMotion ? 1 : 0.12);
      controls.target.add(step);
      camera.position.add(step);
      if (step.length() < 0.05) glideTo = null;
    }
    controls.update();
    ink.uniforms.tDepth.value = composer.readBuffer.depthTexture;
    ink.uniforms.uNear.value = camera.near;
    ink.uniforms.uFar.value = camera.far;
    ink.uniforms.uStrength.value = 0.9;
    grade.uniforms.uAmount.value = 1;
    grade.uniforms.uTime.value = ts / 1000;
    renderer.info.reset();
    composer.render();
    frames++;
    if (ts - fpsT > 1000) {
      fps = (frames * 1000) / (ts - fpsT);
      frames = 0;
      fpsT = ts;
    }
  };
  raf = requestAnimationFrame(frame);

  const panPx = (dxPx: number, dyPx: number) => {
    glideTo = null;
    // Metres per pixel at the target, from the camera distance and vertical field of view.
    const dist = camera.position.distanceTo(controls.target);
    const mpp = (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / Math.max(1, container.clientHeight);
    const fwd = new THREE.Vector3().subVectors(controls.target, camera.position).setY(0).normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const move = right.multiplyScalar(dxPx * mpp).addScaledVector(fwd, -dyPx * mpp * 1.3);
    controls.target.add(move);
    camera.position.add(move);
    clampTarget();
  };

  console.info(`City: built in ${Math.round(buildMs)} ms (${Math.round(performance.now() - t0)} ms including yields), quality ${quality}`);
  console.info('City build stages (ms)', stages);
  return {
    bounds: b,
    quality,
    lookAt(x, z, view) {
      glideTo = null;
      if (view) {
        const dist = view.metresPerPixel * Math.max(1, container.clientHeight) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
        const tilt = THREE.MathUtils.clamp(view.tilt ?? THREE.MathUtils.radToDeg(controls.getPolarAngle()),
          THREE.MathUtils.radToDeg(controls.minPolarAngle), THREE.MathUtils.radToDeg(controls.maxPolarAngle));
        setView(-view.bearing, tilt, THREE.MathUtils.clamp(dist, controls.minDistance, controls.maxDistance),
          THREE.MathUtils.clamp(x, b.minX, b.maxX), THREE.MathUtils.clamp(z, b.minZ, b.maxZ));
        return;
      }
      const off = new THREE.Vector3().subVectors(camera.position, controls.target);
      controls.target.set(x, 0, z);
      clampTarget();
      camera.position.copy(controls.target).add(off);
      controls.update();
    },
    target: () => ({ x: controls.target.x, z: controls.target.z }),
    camera: () => ({
      bearing: -THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()),
      tilt: THREE.MathUtils.radToDeg(controls.getPolarAngle()),
      metresPerPixel: 2 * camera.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, container.clientHeight),
    }),
    pan: panPx,
    rotate(degrees) {
      glideTo = null;
      const off = new THREE.Vector3().subVectors(camera.position, controls.target);
      off.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(degrees));
      camera.position.copy(controls.target).add(off);
      controls.update();
    },
    zoom(dir) {
      glideTo = null;
      const off = new THREE.Vector3().subVectors(camera.position, controls.target);
      const d = THREE.MathUtils.clamp(off.length() * (dir > 0 ? 0.8 : 1.25), controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(off.setLength(d));
      controls.update();
    },
    setAtmosphere(a, now) {
      atm = a;
      world.setSeason(local(now).doy);
    },
    stats: () => ({ fps, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, buildMs, stages }),
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('dblclick', onDbl);
      controls.dispose();
      sun.shadow.dispose();
      world.dispose();
      scene.remove(world.group);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) mat.dispose();
      });
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
      sceneTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/**
 * Every heavy-rail MARTA path that crosses the board, one per corridor: the two directions
 * (and lines sharing track) are near-identical centrelines, so a path that runs within a few
 * metres of one already kept is skipped. Tunnels aren't drawn; buildMarta shows open track only.
 */
function martaAlignments(rf: RoutesFile, manifest: SceneManifest, b: VData['bounds']): Alignment[] {
  const kept: Alignment[] = [];
  for (const id of Object.keys(manifest.profiles)) {
    let al: Alignment;
    try {
      al = alignment(rf, manifest, b, id);
    } catch {
      continue;
    }
    if (al.line.length < 20) continue;
    let near = 0;
    let total = 0;
    for (let s = 0; s < al.line.length; s += 25) {
      const p = al.line.at(s);
      if (p.x < b.minX || p.x > b.maxX || p.z < b.minZ || p.z > b.maxZ) continue;
      total++;
      if (kept.some((k) => distToLine(k.line, p.x, p.z) < 6)) near++;
    }
    if (total && near / total < 0.9) kept.push(al);
  }
  return kept;
}

function distToLine(line: Line, x: number, z: number) {
  let best = Infinity;
  const pts = line.pts;
  for (let i = 1; i < pts.length; i += 1) {
    const [ax, az] = pts[i - 1];
    const [bx, bz] = pts[i];
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z));
  }
  return best;
}
