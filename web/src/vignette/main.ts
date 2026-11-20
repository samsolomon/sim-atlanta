/**
 * Look-dev vignette: one block of Atlanta (the MARTA east portal) built as a low-poly
 * model-railway diorama. Separate page so art experiments never touch the map app.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js';
import type { RoutesFile } from '../model/types';
import { elevationAt, makeProjector, type SceneManifest } from '../scene3d/scene-data';
import { Line, type P2 } from './geom';
import { SimClock, leafState, local, sunPosition } from './time';
import { Traffic, type TrafficData } from './traffic';
import { fetchLive, PRESETS, Rain, type Weather, type WeatherKind } from './weather';
import { Train } from './train';
import { World, type Alignment, type VData } from './world';

const params = new URLSearchParams(location.search);
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const DATA = params.get('data') ?? `${BASE}/data`;
const MARTA_BLUE = '#0b6fd1';
const MARTA_GREEN = '#2fa84f';

async function main() {
  const [vd, manifest, rf, td] = await Promise.all([
    fetch(`${DATA}/scene/vignette-east/vignette.json`).then((r) => r.json()) as Promise<VData>,
    fetch(`${DATA}/scene/downtown/scene.json`).then((r) => r.json()) as Promise<SceneManifest>,
    fetch(`${DATA}/ga/routes.json`).then((r) => r.json()) as Promise<RoutesFile>,
    fetch(`${DATA}/scene/vignette-east/traffic.json`).then((r) => r.json()) as Promise<TrafficData>,
  ]);
  const b = vd.bounds;
  const al = alignment(rf, manifest, b, 'marta:path:155177');

  const world = new World(vd, al);
  // Real tree positions, if the canopy extract has been built.
  const trees = await fetch(`${DATA}/scene/vignette-east/trees.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (trees?.trees?.length && !params.has('scatter')) world.realTrees = trees.trees;
  world.buildBoard();
  world.buildStreets();
  world.buildMarta();
  world.buildFreight();
  world.buildBuildings();
  world.buildTrees();
  world.buildLights();

  // ---- renderer -------------------------------------------------------------------------
  const el = document.getElementById('stage')!;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e7e2d8');
  scene.fog = new THREE.Fog('#e7e2d8', 3200, 7000);
  scene.add(world.group);
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;

  // Studio table under the diorama.
  const table = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshLambertMaterial({ color: '#d8d2c6' }));
  table.rotation.x = -Math.PI / 2;
  table.position.set(cx, -24.05, cz);
  table.receiveShadow = true;
  scene.add(table);

  const hemi = new THREE.HemisphereLight('#e4ecf7', '#a48d72', 1.5);
  const sun = new THREE.DirectionalLight('#fff1da', 2.8);
  sun.position.set(cx - 700, 900, cz + 450);
  sun.target.position.set(cx, 0, cz);
  sun.castShadow = true;
  const sc = sun.shadow.camera;
  sc.left = -560;
  sc.right = 560;
  sc.top = 560;
  sc.bottom = -560;
  sc.near = 100;
  sc.far = 3000;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0016;
  sun.shadow.normalBias = 1.2;
  scene.add(hemi, sun, sun.target);

  // ---- trains (illustrative loop) -----------------------------------------------------
  const clip = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -b.minX),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), b.maxX),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -b.minZ),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), b.maxZ),
  ];
  const east = new Train(al, 2.1, MARTA_BLUE, clip, b);
  const west = new Train(al, -2.1, MARTA_GREEN, clip, b);
  scene.add(east.group, west.group);
  const traffic = new Traffic(world, td);
  scene.add(traffic.group);
  const clock = new SimClock(params.get('at'), Number(params.get('speed') ?? 1));
  const runLen = al.line.length + east.length;
  const SPEED = 16; // m/s, about 36 mph
  const period = runLen / SPEED + 14;

  // ---- camera ---------------------------------------------------------------------------
  const camera = new THREE.PerspectiveCamera(22, 1, 20, 12000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(cx - 40, 0, cz);
  controls.minPolarAngle = THREE.MathUtils.degToRad(20);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(72);
  controls.minDistance = 150;
  controls.maxDistance = 4200;
  controls.screenSpacePanning = false;
  setView(-28, 52, 2300);

  function setView(azDeg: number, polarDeg: number, dist: number, tx = controls.target.x, tz = controls.target.z) {
    controls.target.set(tx, 0, tz);
    const az = THREE.MathUtils.degToRad(azDeg);
    const po = THREE.MathUtils.degToRad(polarDeg);
    camera.position.set(tx + dist * Math.sin(po) * Math.sin(az), dist * Math.cos(po), tz + dist * Math.sin(po) * Math.cos(az));
    controls.update();
  }

  // ---- post: ambient occlusion + tilt-shift ---------------------------------------------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.updateGtaoMaterial({ radius: 6, distanceExponent: 1.5, thickness: 4, scale: 1.2 });
  gtao.blendIntensity = 0.9;
  composer.addPass(gtao);
  const hts = new ShaderPass(HorizontalTiltShiftShader);
  const vts = new ShaderPass(VerticalTiltShiftShader);
  composer.addPass(hts);
  composer.addPass(vts);
  composer.addPass(new OutputPass());
  let tilt = Number(params.get('tilt') ?? 2.2);

  function resize() {
    const w = el.clientWidth;
    const h = el.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    hts.uniforms.h.value = tilt / w;
    vts.uniforms.v.value = tilt / h;
    hts.uniforms.r.value = vts.uniforms.r.value = 0.5;
  }
  new ResizeObserver(resize).observe(el);
  resize();

  // ---- loop -----------------------------------------------------------------------------
  let t = Number(params.get('t') ?? 9);
  let paused = params.has('paused');
  let snapTraffic = true;

  // ---- sun, sky and season from the Atlanta clock ---------------------------------------
  const C = (x: string) => new THREE.Color(x);
  const pal = {
    skyDay: C('#e4ecf7'), skyNight: C('#6f86c8'),
    gndDay: C('#a48d72'), gndNight: C('#2c3346'),
    bgDay: C('#e7e2d8'), bgDusk: C('#e2b998'), bgNight: C('#232a3f'),
    tableDay: C('#d8d2c6'), tableNight: C('#2b3142'),
    sunHigh: C('#fff1da'), sunLow: C('#ffa45c'),
  };
  const bg = scene.background as THREE.Color;
  const tableMat = table.material as THREE.MeshLambertMaterial;
  const sm = (a: number, b2: number, x: number) => {
    const k = Math.min(1, Math.max(0, (x - a) / (b2 - a)));
    return k * k * (3 - 2 * k);
  };
  let sunEl = 0;
  // ---- weather ------------------------------------------------------------------------
  let weather: Weather = PRESETS.clear;
  let weatherMode: 'live' | WeatherKind = (params.get('weather') as WeatherKind | null) ?? 'live';
  let liveOk = false;
  const rain = new Rain();
  scene.add(rain.mesh);
  const wx = { cloud: 0, rain: 0, fog: 0 }; // eased toward the target weather
  let flash = 0;
  async function pollWeather() {
    if (weatherMode !== 'live') return;
    const w = await fetchLive();
    liveOk = !!w;
    weather = w ?? { ...PRESETS.clear, label: 'live weather unavailable here' };
  }
  function setWeather(mode: 'live' | WeatherKind) {
    weatherMode = mode;
    if (mode === 'live') void pollWeather();
    else weather = PRESETS[mode];
  }
  setWeather(weatherMode);
  setInterval(() => void pollWeather(), 10 * 60_000);
  const grey = { sky: C('#cfd4da'), bg: C('#c6c8c9'), bgNight: C('#1e2229'), sun: C('#e8ecf0') };

  function environment(now: Date, doy: number) {
    const sp = sunPosition(now);
    sunEl = sp.elevation;
    const el = sp.elevation;
    const day = sm(-6, 10, el);
    const gold = (1 - sm(3, 28, el)) * sm(-3, 2, el);
    const elDir = Math.max(el, 4) * (Math.PI / 180);
    const az = sp.azimuth * (Math.PI / 180);
    sun.position.set(cx + Math.sin(az) * Math.cos(elDir) * 2000, Math.sin(elDir) * 2000, cz - Math.cos(az) * Math.cos(elDir) * 2000);
    sun.intensity = 2.9 * sm(-1, 7, el);
    sun.color.copy(pal.sunHigh).lerp(pal.sunLow, gold);
    hemi.color.copy(pal.skyNight).lerp(pal.skyDay, day);
    hemi.groundColor.copy(pal.gndNight).lerp(pal.gndDay, day);
    hemi.intensity = 1.05 + 0.45 * day;
    bg.copy(pal.bgNight).lerp(pal.bgDay, day).lerp(pal.bgDusk, gold * 0.7);
    (scene.fog as THREE.Fog).color.copy(bg);
    tableMat.color.copy(pal.tableNight).lerp(pal.tableDay, day);
    const night = 1 - sm(-5, 4, el);
    world.setNight(night);
    traffic.night.value = night;
    east.night.value = west.night.value = night;
    world.setSeason(doy);

    // Weather on top of the sun: clouds flatten light, rain wets surfaces, fog hazes distance.
    const ease = 0.03;
    wx.cloud += (weather.cloud - wx.cloud) * ease;
    wx.rain += (weather.rain - wx.rain) * ease;
    wx.fog += (weather.fog - wx.fog) * ease;
    const cl = wx.cloud;
    sun.intensity *= 1 - 0.85 * cl;
    sun.color.lerp(grey.sun, cl * 0.6);
    hemi.color.lerp(grey.sky, cl * 0.6 * day);
    hemi.intensity += 0.25 * cl * day;
    bg.lerp(day > 0.5 ? grey.bg : grey.bgNight, cl * 0.75);
    world.setWet(wx.rain);
    const dist = camera.position.distanceTo(controls.target);
    const f = Math.max(wx.fog, wx.rain * 0.5);
    const fog = scene.fog as THREE.Fog;
    fog.color.copy(bg);
    fog.near = dist * (1.5 - 0.65 * f);
    fog.far = dist * (3.0 - 1.25 * f);
    rain.update(performance.now() / 1000, controls.target, wx.rain);
    if (weather.kind === 'storm' && Math.random() < 0.004) flash = 1;
    if (flash > 0.01) {
      hemi.intensity += flash * 3;
      flash *= 0.82;
    }
  }

  const out = document.getElementById('readout');
  let lastText = '';
  function readout(now: Date) {
    if (!out) return;
    const loc = local(now);
    const time = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });
    const leaves = (() => {
      const st = leafState(loc.doy, 0).stage;
      return { bare: 'bare branches', spring: 'new leaves', summer: 'full green', turning: 'leaves turning', dropping: 'leaves falling' }[st];
    })();
    const s = traffic.stats;
    const light = sunEl > 6 ? 'daylight' : sunEl > -6 ? (local(now).hour < 12 ? 'dawn' : 'dusk') : 'night';
    const wlabel = weather.tempF != null ? `${weather.label}, ${Math.round(weather.tempF)}°F` : weather.label;
    const text = `${loc.weekday} ${date}, ${time} · ${light} · ${wlabel} · ${leaves}|Connector: ~${Math.round(s.connectorFlow).toLocaleString()} vehicles per lane per hour at ${Math.round(s.connectorMph)} mph`;
    if (text === lastText) return;
    lastText = text;
    const [a, c2] = text.split('|');
    out.innerHTML = `<b>${a}</b><span>${c2}</span><small>Traffic is typical for this hour (FHWA road counts), not live. Trains are illustrative.</small>`;
  }
  let last = performance.now();
  const frame = (ts: number) => {
    const dt = Math.min(0.1, (ts - last) / 1000);
    last = ts;
    if (!paused) t += dt;
    const now = clock.now();
    const loc = local(now);
    environment(now, loc.doy);
    traffic.update(paused ? 0 : dt, loc.hour, loc.weekend, snapTraffic);
    snapTraffic = false;
    readout(now);
    const ph = t % period;
    east.place(Math.min(ph * SPEED, runLen), 1);
    const pw = (t + period / 2) % period;
    west.place(al.line.length - Math.min(pw * SPEED, runLen), -1);
    controls.update();
    composer.render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  Object.assign(window, {
    __v: {
      setView,
      setTime: (x: number) => (t = x),
      /** Jump the Atlanta clock (ISO string or Date). */
      setClock: (d: string | Date) => {
        clock.set(new Date(d));
        snapTraffic = true;
      },
      setSpeed: (x: number) => clock.setSpeed(x),
      setWeather,
      weather: () => ({ mode: weatherMode, liveOk, ...weather }),
      now: () => clock.now(),
      pause: (p = true) => (paused = p),
      setTilt: (x: number) => {
        tilt = x;
        resize();
      },
      ao: (on: boolean) => (gtao.enabled = on),
      camera,
      controls,
      scene,
      period,
      east,
      west,
    },
  });
  document.body.classList.add('ready');
}

/** MARTA east-west line through the vignette in scene metres, with its baked elevation profile. */
function alignment(rf: RoutesFile, manifest: SceneManifest, b: VData['bounds'], pathId: string): Alignment {
  const path = rf.paths.find((p) => p.id === pathId);
  if (!path) throw new Error(`missing ${pathId}`);
  const project = makeProjector(manifest.origin);
  const prof = manifest.profiles[pathId];
  const pad = 260;
  const pts: P2[] = [];
  const sAt: number[] = [];
  for (let i = 0; i < path.cum.length; i++) {
    const [x, z] = project(path.coords[2 * i], path.coords[2 * i + 1]);
    if (x < b.minX - pad || x > b.maxX + pad || z < b.minZ - pad || z > b.maxZ + pad) continue;
    pts.push([x, z]);
    sAt.push(path.cum[i]);
  }
  // The GTFS shape is rounded to ~1 m with uneven spacing; resample every 2 m and smooth
  // (a ±24 m moving average, twice) so cars don't twitch at every vertex.
  const raw = new Line(pts);
  const s0 = sAt[0];
  const STEP = 2;
  const n = Math.floor(raw.length / STEP) + 1;
  let xs = new Float64Array(n);
  let zs = new Float64Array(n);
  let es = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = raw.at(i * STEP);
    xs[i] = p.x;
    zs[i] = p.z;
    es[i] = elevationAt(prof, s0 + i * STEP);
  }
  const smooth = (a: Float64Array, half: number) => {
    const out = new Float64Array(a.length);
    for (let i = 0; i < a.length; i++) {
      // Shrink the window near the ends so endpoints stay put.
      const h = Math.min(half, i, a.length - 1 - i);
      let sum = 0;
      for (let k = i - h; k <= i + h; k++) sum += a[k];
      out[i] = sum / (2 * h + 1);
    }
    return out;
  };
  for (let pass = 0; pass < 2; pass++) {
    xs = smooth(xs, 12);
    zs = smooth(zs, 12);
    es = smooth(es, 10);
  }
  const line = new Line(Array.from(xs, (x, i) => [x, zs[i]] as P2));
  // Elevation indexed by distance along the smoothed line.
  const scale = (n - 1) / line.length;
  return {
    line,
    elev: (s: number) => {
      const f = Math.min(Math.max(s * scale, 0), n - 1);
      const i = Math.floor(f);
      const t = f - i;
      return es[i] + (es[Math.min(i + 1, n - 1)] - es[i]) * t;
    },
  };
}

main().catch((e) => {
  document.getElementById('stage')!.textContent = `Couldn't build the diorama: ${e.message}`;
  console.error(e);
});
