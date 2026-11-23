/** Inspect City's models and their poses against a reference photo. */
import './lab.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CAR_GAP, CAR_LENGTH, LINE_COLORS, cq400Geometry, cq400Material, type MartaLine } from '../vignette/cq400';
import { gradeShader } from '../vignette/grade';
import { busGeometry, busMaterial } from '../vignette/xcelsior';
import { FREIGHT_LENGTH, freightGeometry } from '../vignette/freight-stock';
import { stockNames, formation, layout, passengerGeometry, passengerMaterial } from '../vignette/crescent-stock';
import { inkShader } from '../vignette/ink';
import { figureLooks } from '../city/figure-looks';
import { createFigurePreview } from '../city/street-figures';
import { labTrack } from './track';
import { createPlatformScene, type PlatformKind } from './platform-scene';
import { createGinkgos, ginkgoState, type GinkgoTree } from '../city/ginkgo';
import { local } from '../vignette/time';

const el = document.getElementById('stage')!;
const low = new URLSearchParams(location.search).get('q') === 'low';
const renderer = new THREE.WebGLRenderer({ antialias: !low, preserveDrawingBuffer: true });
renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
el.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const bg = new THREE.Color('#e9e5dc');
scene.background = bg;
const hemi = new THREE.HemisphereLight('#eef2f8', '#a08f78', 1.5);
const sun = new THREE.DirectionalLight('#fff3df', 2.6);
sun.position.set(-18, 30, 22);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(low ? 1024 : 2048);
sun.shadow.bias = -0.0005; // without these the models shade themselves in fine stripes (shadow acne)
sun.shadow.normalBias = 0.05;
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 });
scene.add(hemi, sun);
const floorMaterial = new THREE.MeshLambertMaterial({ color: '#d9d3c6' });
const figureShadow = new THREE.ShadowMaterial({ opacity: .22, depthWrite: false });
const ground = new THREE.Mesh<THREE.CircleGeometry, THREE.Material>(new THREE.CircleGeometry(60, 48), floorMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
// A short length of track: ballast, sleepers, rails (see track.ts).
const track = labTrack();
const longTrack = labTrack(240);
scene.add(longTrack);
track.traverse((o) => ((o as THREE.Mesh).receiveShadow = true));
scene.add(track);

const night = { value: 0 };
const role = { value: 1 };
let line: MartaLine = 'gold';
const models = {
  cq400: 'Stadler CQ400',
  xn40: 'New Flyer Xcelsior XN40',
  cm44ac: 'GE/Wabtec CM44AC',
  ...stockNames, crescent: 'Full Crescent consist',
  walker: 'Walker',
  cyclist: 'Cyclist and bicycle',
  ginkgo: 'Ginkgo',
} as const;
type Model = keyof typeof models;
const requested = new URLSearchParams(location.search).get('v');
const aliases: Record<string, Model> = { bus: 'xn40', freight: 'cm44ac', train: 'cq400' };
let model: Model = requested && Object.hasOwn(models, requested)
  ? requested as Model : requested && Object.hasOwn(aliases, requested) ? aliases[requested] : 'cq400';
function isPassengerUnit(id: Model): id is keyof typeof stockNames {
  return Object.hasOwn(stockNames, id);
}
let cars: THREE.Mesh[] = [];
let figure: ReturnType<typeof createFigurePreview> | undefined;
const play = document.querySelector<HTMLButtonElement>('#play')!;
const phase = document.querySelector<HTMLInputElement>('#phase')!;
const lookByModel = { walker: 0, cyclist: 0 };
const nextLook = document.querySelector<HTMLButtonElement>('#next-look')!;
nextLook.addEventListener('click', () => {
  if (model !== 'walker' && model !== 'cyclist') return;
  lookByModel[model] = (lookByModel[model] + 1) % figureLooks.length;
  figure?.setLook(lookByModel[model]);
});
let cycle = 0;
let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
function setPlaying(next: boolean) {
  playing = next;
  play.textContent = playing ? 'Pause' : 'Play';
}
setPlaying(playing);
play.addEventListener('click', () => setPlaying(!playing));
phase.addEventListener('input', () => {
  setPlaying(false);
  cycle = phase.valueAsNumber / 100;
  figure?.setPhase(cycle);
});
const platformParam = new URLSearchParams(location.search).get('platform');
let platformKind: PlatformKind | null = platformParam === 'island' || platformParam === 'side' ? platformParam : null;
let station: ReturnType<typeof createPlatformScene> | undefined;
let grove: ReturnType<typeof createGinkgos> = null;
// Trees follow the City clock's date: ?t= as in City, otherwise today in Atlanta.
const clockParam = new URLSearchParams(location.search).get('t');
const clockDate = clockParam && !Number.isNaN(Date.parse(clockParam)) ? new Date(clockParam) : new Date();
let seasonDoy = local(clockDate).doy;
// A broad old specimen and a young street tree, both measured from the photo sources in docs/tree-species.md.
const LAB_GINKGOS: GinkgoTree[] = [
  { x: -6, z: 0, heightM: 20, crownM: 7.5, age: 1, seed: 7 },
  { x: 9, z: 3, heightM: 9, crownM: 2.6, age: 0, seed: 23 },
];
const platformReport = document.getElementById('platform-report')!;
function build() {
  station?.dispose();
  station = undefined;
  platformReport.hidden = true;
  for (const c of cars) {
    scene.remove(c);
    c.geometry.dispose();
    const materials = Array.isArray(c.material) ? c.material : [c.material];
    for (const material of materials) material.dispose();
  }
  cars = [];
  figure?.dispose();
  figure = undefined;
  grove?.dispose();
  grove = null;
  const tree = model === 'ginkgo';
  document.getElementById('season')!.hidden = !tree;
  if (tree) {
    grove = createGinkgos(LAB_GINKGOS, low ? 'low' : 'high', () => 0);
    if (grove) scene.add(grove.group);
    showSeason();
    ground.material = floorMaterial;
    for (const id of ['lines', 'roles', 'platforms', 'motion']) document.getElementById(id)!.hidden = true;
    nextLook.hidden = true;
    track.visible = longTrack.visible = false;
    ground.scale.setScalar(1);
    sun.position.set(-18, 30, 22).multiplyScalar(1.6);
    sun.shadow.camera.far = 160;
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 });
    sun.shadow.camera.updateProjectionMatrix();
    document.getElementById('title')!.textContent = models[model];
    document.title = models[model] + ' · Model Lab · Sim Atlanta';
    const blurb = document.getElementById('blurb')!;
    blurb.replaceChildren('A broad old specimen and a young street tree. Grey leader and sparse upswept limbs, leaf tufts on spur shoots, butter-yellow in late November and a fast drop to a gold carpet. ');
    const link = document.createElement('a');
    link.href = 'https://github.com/samsolomon/sim-atlanta/blob/main/docs/tree-species.md';
    link.textContent = 'Species notes and reference photos';
    blurb.append(link);
    return;
  }
  const person = model === 'walker' || model === 'cyclist';
  ground.material = person ? figureShadow : floorMaterial;
  const extent = person ? 6 : model === 'crescent' ? 128 : 40;
  sun.position.set(-18,30,22).multiplyScalar(model === 'crescent' ? 4 : 1);
  sun.shadow.camera.far = model === 'crescent' ? 380 : 120;
  Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = person ? .015 : .05;
  const passenger = model === 'crescent' || Object.hasOwn(stockNames, model);
  track.visible = !tree && (model === 'cq400' || model === 'cm44ac' || passenger);
  longTrack.visible = model === 'crescent';
  if (longTrack.visible) track.visible = false;
  ground.scale.setScalar(model === 'crescent' ? 2.25 : 1);
  document.getElementById('lines')!.hidden = model !== 'cq400';
  document.getElementById('roles')!.hidden = model !== 'cq400';
  document.getElementById('platforms')!.hidden = model !== 'cq400';
  document.getElementById('motion')!.hidden = !person;
  nextLook.hidden = !person;
  document.getElementById('title')!.textContent = models[model];
  document.title = models[model] + ' · Model Lab · Sim Atlanta';
  if (model === 'walker' || model === 'cyclist') {
    figure = createFigurePreview(model, lookByModel[model]);
    figure.group.traverse(o => { if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true; });
    scene.add(figure.group);
    cycle = .125;
    phase.value = String(Math.round(cycle * 100));
    figure.setPhase(cycle);
    document.getElementById('blurb')!.textContent = model === 'walker'
      ? 'An illustrative downtown pedestrian with a swinging stride.'
      : 'An illustrative rider from the Westside Beltline Connector, on a city bicycle.';
    return;
  }
  if (model === 'crescent' || isPassengerUnit(model)) {
    const units = model === 'crescent' ? formation : [model];
    cars = layout(units).map(({unit, offset}, i) => {
      const mesh = new THREE.Mesh(passengerGeometry(unit, i === 0, i === units.length - 1), passengerMaterial(night));
      mesh.position.set(0,.125,offset);
      mesh.castShadow = mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    });
    const blurb = document.getElementById('blurb')!;
    blurb.textContent = model === 'crescent'
      ? 'Illustrative formation · two locomotives, three coaches, café, diner, sleeper and baggage-dorm. '
      : 'Illustrative Crescent equipment. ';
    const link = document.createElement('a');
    link.href = 'https://github.com/samsolomon/sim-atlanta/blob/main/docs/crescent-stock.md';
    link.textContent = 'Equipment notes and reference photos';
    blurb.append(link);
    return;
  }
  if (model === 'cm44ac') {
    document.getElementById('blurb')!.textContent = 'CSX 7257, seen at Georgia State, is a modernized GE AC4400CW. This scale study pairs the six-axle locomotive with an illustrative boxcar.';
    cars = (['locomotive', 'boxcar'] as const).map(unit => {
      const mesh = new THREE.Mesh(freightGeometry(unit), new THREE.MeshLambertMaterial({ vertexColors: true }));
      mesh.position.set(0, .125, (unit === 'locomotive' ? 1 : -1) * (FREIGHT_LENGTH[unit] / 2 + .15));
      mesh.castShadow = mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    });
    return;
  }
  document.getElementById('blurb')!.textContent =
    model === 'cq400'
      ? 'One cab car and one middle car of a four-car MARTA set.'
      : 'MARTA’s 40-foot compressed-natural-gas bus. The roof enclosures hold its fuel tanks. The body and wheelbase follow New Flyer’s published dimensions.';
  if (model === 'xn40') {
    const bus = new THREE.Mesh(busGeometry(), busMaterial(night));
    bus.position.z = 0;
    bus.castShadow = bus.receiveShadow = true;
    cars = [bus];
    scene.add(bus);
    return;
  }
  const color = LINE_COLORS[line];
  const cab = new THREE.Mesh(cq400Geometry({ cab: true, u0: 0, u1: 0.25 }, color), cq400Material(color, role, night));
  const mid = new THREE.Mesh(cq400Geometry({ cab: false, u0: 0.25, u1: 0.5 }, color), cq400Material(color, { value: 0 }, night));
  cab.position.z = CAR_LENGTH / 2 + CAR_GAP / 2;
  mid.position.z = -CAR_LENGTH / 2 - CAR_GAP / 2;
  cars = [cab, mid];
  if (platformKind) {
    // Illustrative station: its own two tracks replace the lab track, and the cars stop on T1.
    station = createPlatformScene(platformKind);
    scene.add(station.group);
    track.visible = false;
    for (const c of cars) c.position.x = station.trainX;
    const { gapM, stepM } = station.report;
    platformReport.textContent = `Illustrative ${platformKind === 'island' ? 'island' : 'side platforms'}: `
      + `doors open on the ${station.doorSide}. Gap ${Math.round(gapM * 1000)} mm (limit 76), `
      + `step ${Math.round(stepM * 1000)} mm (limit ±16), ${station.doors.length} door zones marked.`;
    platformReport.hidden = false;
  }
  for (const c of cars) {
    c.castShadow = c.receiveShadow = true;
    scene.add(c);
  }
}

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
type ViewPreset = { pos: [number, number, number]; target: [number, number, number]; fov: number };
const TRAIN_VIEWS: Record<string, ViewPreset> = {
  'Front': { pos: [0, 2.3, 48], target: [0, 2.0, 22], fov: 18 },
  '¾ front': { pos: [-11, 4.2, 36], target: [0, 2.0, 18], fov: 28 },
  'Side': { pos: [-30, 2.6, 16], target: [0, 2.0, 16], fov: 32 },
  'Rear': { pos: [0, 2.3, -60], target: [0, 2.0, -22], fov: 20 },
  'Top': { pos: [0.01, 60, 2], target: [0, 0, 2], fov: 40 },
};
function view(name: string) {
  const v = presets[name];
  if (!v) return;
  camera.position.set(...v.pos);
  controls.target.set(...v.target);
  // Keep the presets centred on the train when a station moves it off the lab's centre line.
  const dx = station?.trainX ?? 0;
  camera.position.x += dx;
  controls.target.x += dx;
  camera.fov = v.fov;
  camera.updateProjectionMatrix();
  controls.update();
  document.querySelectorAll('#views button').forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === name)));
}

const composer = new EffectComposer(renderer, (() => {
  const t = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  t.depthTexture = new THREE.DepthTexture(1, 1);
  return t;
})());
composer.addPass(new RenderPass(scene, camera));
const ink = new ShaderPass(inkShader());
composer.addPass(ink);
composer.addPass(new OutputPass());
const grade = new ShaderPass(gradeShader());
composer.addPass(grade);
let inkOn = true;

function resize() {
  const w = el.clientWidth;
  const h = el.clientHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  const pr = renderer.getPixelRatio();
  ink.uniforms.uTexel.value.set(1 / (w * pr), 1 / (h * pr));
  ink.uniforms.uWidth.value = pr;
  grade.uniforms.uRes.value.set(w * pr, h * pr);
}
new ResizeObserver(resize).observe(el);
resize();

function setNight(on: boolean) {
  night.value = on ? 1 : 0;
  hemi.intensity = on ? 0.5 : 1.5;
  hemi.color.set(on ? '#5d6fa8' : '#eef2f8');
  sun.intensity = on ? 0.15 : 2.6;
  bg.set(on ? '#1f2535' : '#e9e5dc');
  floorMaterial.color.set(on ? '#2a3040' : '#d9d3c6');
}

let lastFrame = 0;
const frame = (t: number) => {
  if (figure && playing) {
    cycle = (cycle + Math.min(t - lastFrame, 100) / 1000 * figure.cyclesPerSecond) % 1;
    figure.setPhase(cycle);
    phase.value = String(Math.round(cycle * 100));
  }
  lastFrame = t;
  controls.update();
  ink.uniforms.tDepth.value = composer.readBuffer.depthTexture;
  ink.uniforms.uNear.value = camera.near;
  ink.uniforms.uFar.value = camera.far;
  ink.uniforms.uStrength.value = inkOn ? 0.9 : 0;
  grade.uniforms.uTime.value = t / 1000;
  composer.render();
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

// ---- UI --------------------------------------------------------------------------------
const mk = (parent: string, label: string, on: () => void, pressed = false) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.setAttribute('aria-pressed', String(pressed));
  b.addEventListener('click', () => {
    document.querySelectorAll(`#${parent} button`).forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    on();
  });
  document.getElementById(parent)!.appendChild(b);
};
for (const l of Object.keys(LINE_COLORS) as MartaLine[]) mk('lines', l[0].toUpperCase() + l.slice(1), () => ((line = l), build()), l === line);
mk('roles', 'Leading', () => (role.value = 1), true);
mk('roles', 'Tail', () => (role.value = -1));
mk('roles', 'Coupled', () => (role.value = 0));
for (const [kind, label] of [[null, 'None'], ['island', 'Island'], ['side', 'Side platforms']] as const) {
  mk('platforms', label, () => {
    platformKind = kind;
    const url = new URL(location.href);
    if (kind) url.searchParams.set('platform', kind); else url.searchParams.delete('platform');
    history.replaceState(null, '', url);
    build();
    view('¾ front');
  }, platformKind === kind);
}
document.getElementById('platforms')!.append(platformReport); // after the buttons
for (const v of Object.keys(TRAIN_VIEWS)) mk('views', v, () => view(v));
const BUS_VIEWS: Record<string, ViewPreset> = {
  'Front': { pos: [0, 1.8, 30], target: [0, 1.6, 6], fov: 13 },
  '¾ front': { pos: [-12, 4.0, 19], target: [0, 1.5, 1.5], fov: 30 },
  'Side': { pos: [-34, 1.7, 0], target: [0, 1.7, 0], fov: 26 },
  'Rear': { pos: [0, 1.8, -30], target: [0, 1.6, -6], fov: 13 },
  'Top': { pos: [0.01, 34, 0], target: [0, 0, 0], fov: 30 },
};
const FIGURE_VIEWS: Record<string, ViewPreset> = {
  Front: { pos: [0, 1.03, 4.5], target: [0, .88, 0], fov: 30 },
  '¾ front': { pos: [-3.3, 1.7, 3.4], target: [0, .87, 0], fov: 30 },
  Side: { pos: [-4.7, 1.05, 0], target: [0, .87, 0], fov: 30 },
  Rear: { pos: [0, 1.14, -4.5], target: [0, .87, 0], fov: 30 },
  Top: { pos: [0, 5.0, .01], target: [0, 0, 0], fov: 32 },
};
const TREE_VIEWS: Record<string, ViewPreset> = {
  Front: { pos: [1, 9, 62], target: [1, 9, 0], fov: 30 },
  '¾ front': { pos: [-34, 14, 46], target: [1, 8, 1], fov: 32 },
  Side: { pos: [-62, 9, 1], target: [0, 9, 1], fov: 30 },
  Rear: { pos: [1, 9, -62], target: [1, 9, 0], fov: 30 },
  Top: { pos: [0.01, 70, 1], target: [0, 0, 1], fov: 34 },
};
const FREIGHT_VIEWS = { ...TRAIN_VIEWS, '¾ front': { pos: [-32, 12, 36], target: [0, 2, 1], fov: 41 } } satisfies Record<string, ViewPreset>;
let presets: Record<string, ViewPreset>;
const modelSelect = document.querySelector<HTMLSelectElement>('#model-select')!;
function setModel(id: Model) {
  model = id;
  const passengerViews: Record<string, ViewPreset> = {
    Front: { pos: [0,2.7,27], target: [0,2.3,10], fov: 28 },
    Rear: { pos: [0,2.7,-27], target: [0,2.3,-10], fov: 28 },
    Side: { pos: [-38,3,0], target: [0,2,0], fov: 39 },
    Top: { pos: [.01,49,0], target: [0,0,0], fov: 36 },
    '¾ front': { pos: [-19,6.8,18], target: [0,2,0], fov: 38 },
  };
  if (id === 'crescent') {
    for (const preset of Object.values(passengerViews)) {
      const scale = 8.65 / Math.min(1, camera.aspect);
      preset.pos = preset.pos.map(n => n * scale) as ViewPreset['pos'];
      preset.target[2] *= 8.65;
    }
  }
  camera.far = id === 'crescent' ? 1800 : 400;
  presets = id === 'crescent' || isPassengerUnit(id) ? passengerViews : { cq400: TRAIN_VIEWS, xn40: BUS_VIEWS, cm44ac: FREIGHT_VIEWS, walker: FIGURE_VIEWS, cyclist: FIGURE_VIEWS, ginkgo: TREE_VIEWS }[id];
  modelSelect.value = id;
  document.querySelectorAll<HTMLButtonElement>('[data-model]').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.model === id)));
  build();
  view('¾ front');
}
function selectModel(id: Model) {
  const url = new URL(location.href);
  url.searchParams.set('v', id);
  history.replaceState(null, '', url);
  setModel(id);
}
for (const [group, ids] of [['vehicles', ['cq400', 'xn40', 'cm44ac', ...Object.keys(stockNames) as (keyof typeof stockNames)[], 'crescent']], ['people', ['walker', 'cyclist']], ['trees', ['ginkgo']]] as const) {
  const list = document.getElementById(group)!;
  const options = document.createElement('optgroup');
  options.label = list.querySelector('h2')!.textContent!;
  for (const id of ids) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.model = id;
    button.textContent = models[id];
    button.addEventListener('click', () => selectModel(id));
    list.append(button);
    options.append(new Option(models[id], id));
  }
  modelSelect.append(options);
}
// Season presets for Atlanta ginkgos (non-leap day of year); the first button is the clock's date.
const seasonReport = document.getElementById('season-report')!;
const STAGE_NAMES = { bare: 'bare grey branches', leafout: 'leafing out', green: 'summer green', turning: 'turning', gold: 'butter-yellow', dropping: 'dropping its leaves', carpet: 'bare over a gold carpet' };
function showSeason() {
  grove?.setSeason(seasonDoy);
  const date = new Date(Date.UTC(2026, 0, seasonDoy));
  const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  seasonReport.textContent = `${label}: ${STAGE_NAMES[ginkgoState(seasonDoy).stage]}. Change the date with ?t= as in City.`;
}
const clockDoy = seasonDoy;
for (const [label, doy] of [['Clock date', clockDoy], ['Jul 1', 182], ['Nov 8', 312], ['Nov 22', 326], ['Nov 28', 332], ['Dec 3', 337], ['Jan 15', 15]] as const) {
  mk('season', label, () => { seasonDoy = doy; showSeason(); }, label === 'Clock date');
}
document.getElementById('season')!.append(seasonReport);
modelSelect.addEventListener('change', () => selectModel(modelSelect.value as Model));
setModel(model);
const nightBtn = document.getElementById('night')!;
if (new URLSearchParams(location.search).get('night') === '1') {
  setNight(true);
  nightBtn.setAttribute('aria-pressed', 'true');
}
nightBtn.addEventListener('click', () => {
  const on = nightBtn.getAttribute('aria-pressed') !== 'true';
  nightBtn.setAttribute('aria-pressed', String(on));
  setNight(on);
  const url = new URL(location.href);
  if (on) url.searchParams.set('night', '1'); else url.searchParams.delete('night');
  history.replaceState(null, '', url);
});
const inkBtn = document.getElementById('ink')!;
inkBtn.addEventListener('click', () => {
  inkOn = !inkOn;
  inkBtn.setAttribute('aria-pressed', String(inkOn));
});
const ref = document.getElementById('ref') as HTMLImageElement;
const file = document.querySelector<HTMLInputElement>('#file')!;
const opacity = document.querySelector<HTMLInputElement>('#opacity')!;
const clearPhoto = document.getElementById('clear-photo')!;
function setPhoto(photo?: File) {
  if (ref.hasAttribute('src')) URL.revokeObjectURL(ref.src);
  if (photo) ref.src = URL.createObjectURL(photo);
  else ref.removeAttribute('src');
  ref.hidden = !photo;
  opacity.disabled = !photo;
  clearPhoto.hidden = !photo;
}
file.addEventListener('change', () => { if (file.files?.[0]) setPhoto(file.files[0]); });
clearPhoto.addEventListener('click', () => { setPhoto(); file.value = ''; });
opacity.addEventListener('input', () => { ref.style.opacity = opacity.value; });
Object.assign(window, { __lab: { view, setNight, role, scene, camera, controls, station: () => station } });
