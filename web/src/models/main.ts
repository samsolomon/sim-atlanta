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
import { createTrees, treeDims, treeTriangles, type TreePlacement } from '../trees/render';
import { SIZE_CLASSES, calendarDoy, doyOf, type SizeClass, type Species, type TreeQuality } from '../trees/species';
import { SPECIES as SPECIES_LIST } from '../trees/index';
import { GENERIC_SIZES, createGenericTrees, genericTriangles } from '../trees/generic';
import { LANDSCAPE_KINDS, LANDSCAPE_NOTES, createLandscapeScene, type LandscapeKind } from './landscape-scene';

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
  generic: 'Generic leaf-clump tree',
  ginkgo: 'Ginkgo',
  ...LANDSCAPE_KINDS,
} as const;
// Species in the lab's Trees section; 'generic' is City's current tree, the baseline.
const SPECIES: Partial<Record<string, Species>> = Object.fromEntries(SPECIES_LIST.map(s => [s.id, s]));
const SPECIES_NOTES: Record<string, string> = {
  generic: 'City’s canopy today: every crown from the canopy height map gets this faceted clump tree, coloured by a random kind. It is the baseline, and its triangles per tree are the budget a species must stay within. ',
  ginkgo: 'A gangly single leader when young; the oldest fork low into near-upright stems under a broad crown. Leaf tufts on spur shoots, butter-yellow in November and a drop of a few days to a gold carpet. ',
};
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
let trees: { group: THREE.Object3D; setSeason(doy: number): void; dispose(): void } | null = null;
let scaleFigure: ReturnType<typeof createFigurePreview> | undefined;
// Trees follow the City clock's date: ?t= as in City, otherwise today in Atlanta.
const labParams = new URLSearchParams(location.search);
const clockParam = labParams.get('t');
const clockDate = clockParam && !Number.isNaN(Date.parse(clockParam)) ? new Date(clockParam) : new Date();
const clockDoy = calendarDoy(clockDate);
let seasonDoy = clockDoy;
const sizeParam = labParams.get('size');
let treeSize: SizeClass | 'all' = sizeParam === 'all' || SIZE_CLASSES.includes(sizeParam as SizeClass) ? sizeParam as SizeClass | 'all' : 'all';
let treeQuality: TreeQuality = labParams.get('tier') === 'low' || low ? 'low' : 'high';
const platformReport = document.getElementById('platform-report')!;
const treeReport = document.getElementById('tree-report')!;
const seasonReport = document.getElementById('season-report')!;
const SEASONS = [['Clock date', clockDoy], ['Spring', doyOf(4, 10)], ['Summer', doyOf(7, 1)], ['Fall', doyOf(11, 8)], ['Late fall', doyOf(11, 30)], ['Winter', doyOf(1, 15)]] as const;
/** Trees in a row from smallest to largest, or one class at the origin, plus a person for scale. */
function buildTrees() {
  const sizes = treeSize === 'all' ? SIZE_CLASSES : [treeSize];
  const species = SPECIES[model];
  const spreads = sizes.map(size => species ? species.sizes[size].spreadM : GENERIC_SIZES[size].crownM * 2);
  const heights = sizes.map(size => species ? species.sizes[size].heightM : GENERIC_SIZES[size].heightM);
  const xs: number[] = [];
  let x = 0;
  sizes.forEach((_, i) => { x += (i ? spreads[i - 1] / 2 : 0) + spreads[i] / 2 + (i ? 3 : 0); xs.push(x); });
  const mid = (xs[0] - spreads[0] / 2 + xs[xs.length - 1] + spreads[spreads.length - 1] / 2) / 2;
  const row = sizes.map((size, i) => ({ size, x: xs[i] - mid, z: 0 }));
  if (species) {
    const placements: TreePlacement[] = row.map((r, i) => ({ species, size: r.size, x: r.x, z: r.z, seed: 11 + i * 7,
      heightM: species.sizes[r.size].heightM, spreadM: species.sizes[r.size].spreadM }));
    trees = createTrees(placements, treeQuality, () => 0);
  } else trees = createGenericTrees(row, treeQuality);
  scene.add(trees!.group);
  // A walker beside the smallest tree, facing the camera.
  scaleFigure = createFigurePreview('walker', 0);
  scaleFigure.group.position.set(row[0].x - spreads[0] / 2 - 1.5, 0, 2);
  scaleFigure.group.traverse(o => { if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true; });
  scene.add(scaleFigure.group);
  const personM = new THREE.Box3().setFromObject(scaleFigure.group).getSize(new THREE.Vector3()).y;

  ground.material = floorMaterial;
  for (const id of ['lines', 'roles', 'platforms', 'motion']) document.getElementById(id)!.hidden = true;
  nextLook.hidden = true;
  track.visible = longTrack.visible = false;
  const width = row[row.length - 1].x + spreads[spreads.length - 1] / 2 - (row[0].x - spreads[0] / 2) + 4;
  const tall = Math.max(...heights);
  ground.scale.setScalar(Math.max(1, width / 90));
  const extent = Math.max(width, tall) * 0.7;
  sun.position.set(-18, 30, 22).multiplyScalar(Math.max(1, extent / 20));
  sun.shadow.camera.far = extent * 6;
  sun.shadow.normalBias = 0.05;
  Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent });
  sun.shadow.camera.updateProjectionMatrix();
  const d = Math.max(width * 1.1, tall * 2.2) + 8;
  const cy = tall * 0.45;
  presets = {
    Front: { pos: [0, cy, d], target: [0, cy, 0], fov: 30 },
    '¾ front': { pos: [-d * 0.6, cy + d * 0.2, d * 0.8], target: [0, cy, 0], fov: 30 },
    Side: { pos: [-d, cy, 0.01], target: [0, cy, 0], fov: 30 },
    Rear: { pos: [0, cy, -d], target: [0, cy, 0], fov: 30 },
    Top: { pos: [0.01, d * 1.2, 0], target: [0, 0, 0], fov: 34 },
  };
  camera.far = Math.max(400, d * 4);
  camera.updateProjectionMatrix();

  const per = (q: TreeQuality) => species
    ? sizes.map(size => `${size} ${treeTriangles(species, size, q).total}`).join(', ')
    : `${genericTriangles(q).total} per tree at every size`;
  const budget = genericTriangles(treeQuality);
  const draws = (trees as { draws?: number }).draws ?? budget.draws;
  treeReport.textContent = `${treeQuality === 'high' ? 'High' : 'Low'} detail. Triangles per tree: ${per(treeQuality)}`
    + ` (budget ${budget.total}). ${draws} instanced draws. Person ${personM.toFixed(2)} m.`;
  const dims = species ? sizes.map(size => {
    const dd = treeDims({ species, size, x: 0, z: 0, seed: 0, heightM: species.sizes[size].heightM, spreadM: species.sizes[size].spreadM });
    return `${size}: ${dd.heightM} m tall, ${dd.spreadM} m spread, ${Math.round(dd.calliperM * 100)} cm trunk`;
  }).join('; ') : '';
  document.getElementById('title')!.textContent = models[model];
  document.title = models[model] + ' · Model Lab · Sim Atlanta';
  const blurb = document.getElementById('blurb')!;
  blurb.replaceChildren(SPECIES_NOTES[model] + (dims ? dims + '. ' : ''));
  const link = document.createElement('a');
  link.href = 'https://github.com/samsolomon/sim-atlanta/blob/main/docs/tree-species.md';
  link.textContent = 'Species notes and sources';
  blurb.append(link);
  showSeason();
}
function showSeason() {
  if (isLandscape(model)) buildLandscape();
  trees?.setSeason(seasonDoy);
  const label = new Date(Date.UTC(2026, 0, seasonDoy)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const species = SPECIES[model];
  seasonReport.textContent = `${label}${species ? ': ' + species.foliage(seasonDoy, 0).label : ''}. Clock date from ?t= as in City.`;
}
const isLandscape = (id: string): id is LandscapeKind => Object.hasOwn(LANDSCAPE_KINDS, id);
let landscape: ReturnType<typeof createLandscapeScene> | null = null;
const landscapeReport = document.createElement('p');
landscapeReport.className = 'platform-report';
/** A primitive (or the whole garden) on a sloped test plot, with draw and triangle counts for both tiers. */
function buildLandscape() {
  landscape?.dispose();
  landscape?.group.removeFromParent();
  landscape = createLandscapeScene(model as LandscapeKind, seasonDoy, treeQuality);
  landscape.group.traverse(o => { if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true; });
  scene.add(landscape.group);
  landscapeReport.textContent = `${landscape.draws} draw call for all primitives. Triangles: high ${landscape.triangles.high.toLocaleString()}, `
    + `low ${landscape.triangles.low.toLocaleString()}. Showing ${treeQuality} detail.`;
  landscapeReport.hidden = false;
}
function build() {
  landscape?.dispose();
  landscape?.group.removeFromParent();
  landscape = null;
  landscapeReport.hidden = true;
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
  trees?.dispose();
  trees = null;
  scaleFigure?.dispose();
  scaleFigure = undefined;
  ground.visible = true;
  const isTree = model === 'generic' || Object.hasOwn(SPECIES, model);
  for (const id of ['tree-size', 'season', 'tier']) document.getElementById(id)!.hidden = !isTree && !(isLandscape(model) && id !== 'tree-size');
  if (isLandscape(model)) {
    for (const id of ['lines', 'roles', 'platforms', 'motion']) document.getElementById(id)!.hidden = true;
    nextLook.hidden = true;
    track.visible = longTrack.visible = false;
    // The test plot brings its own sloped ground; the lab's flat floor would show through it.
    ground.visible = false;
    sun.position.set(-18, 30, 22);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 120 });
    sun.shadow.normalBias = .05;
    sun.shadow.camera.updateProjectionMatrix();
    document.getElementById('title')!.textContent = models[model];
    document.title = models[model] + ' · Model Lab · Sim Atlanta';
    document.getElementById('blurb')!.textContent = LANDSCAPE_NOTES[model] + 'Planting and seasonal colour are illustrative; the season buttons change the flowers.';
    showSeason();
    return;
  }
  if (isTree) {
    buildTrees();
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
  track.visible = (model === 'cq400' || model === 'cm44ac' || passenger);
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
const FREIGHT_VIEWS = { ...TRAIN_VIEWS, '¾ front': { pos: [-32, 12, 36], target: [0, 2, 1], fov: 41 } } satisfies Record<string, ViewPreset>;
let presets: Record<string, ViewPreset>;
const LANDSCAPE_VIEWS: Record<string, ViewPreset> = {
  Front: { pos: [0, 8, 26], target: [0, 1.2, 0], fov: 40 },
  '¾ front': { pos: [-17, 11, 19], target: [0, 1.2, 0], fov: 40 },
  Side: { pos: [-26, 6, 0], target: [0, 1.2, 0], fov: 40 },
  Rear: { pos: [0, 10, -26], target: [0, 1.2, 0], fov: 40 },
  Top: { pos: [.01, 36, 0], target: [0, 0, 0], fov: 40 },
};
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
  presets = isLandscape(id) ? LANDSCAPE_VIEWS : id === 'crescent' || isPassengerUnit(id) ? passengerViews : ({ cq400: TRAIN_VIEWS, xn40: BUS_VIEWS, cm44ac: FREIGHT_VIEWS, walker: FIGURE_VIEWS, cyclist: FIGURE_VIEWS, generic: TRAIN_VIEWS, ginkgo: TRAIN_VIEWS } as Record<string, Record<string, ViewPreset>>)[id];
  modelSelect.value = id;
  document.querySelectorAll<HTMLButtonElement>('[data-model]').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.model === id)));
  build();
  view(id === 'generic' || Object.hasOwn(SPECIES, id) ? 'Front' : '¾ front');
}
function selectModel(id: Model) {
  const url = new URL(location.href);
  url.searchParams.set('v', id);
  history.replaceState(null, '', url);
  setModel(id);
}
for (const [group, ids] of [['vehicles', ['cq400', 'xn40', 'cm44ac', ...Object.keys(stockNames) as (keyof typeof stockNames)[], 'crescent']], ['people', ['walker', 'cyclist']], ['trees', ['generic', 'ginkgo']], ['landscape', Object.keys(LANDSCAPE_KINDS) as LandscapeKind[]]] as const) {
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
// Tree controls: size class, season and detail tier.
const setParam = (key: string, value: string | null) => {
  const url = new URL(location.href);
  if (value === null) url.searchParams.delete(key); else url.searchParams.set(key, value);
  history.replaceState(null, '', url);
};
for (const size of [...SIZE_CLASSES, 'all'] as const)
  mk('tree-size', size === 'all' ? 'All sizes' : size[0].toUpperCase() + size.slice(1), () => { treeSize = size; setParam('size', size); build(); view('Front'); }, size === treeSize);
document.getElementById('tree-size')!.append(treeReport);
for (const [label, doy] of SEASONS) mk('season', label, () => { seasonDoy = doy; showSeason(); }, label === 'Clock date');
document.getElementById('season')!.append(seasonReport);
for (const tier of ['high', 'low'] as const)
  mk('tier', tier === 'high' ? 'High' : 'Low', () => { treeQuality = tier; setParam('tier', tier); build(); }, tier === treeQuality);
document.getElementById('tier')!.append(landscapeReport);
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
