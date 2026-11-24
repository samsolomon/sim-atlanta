/** Inspect City's models and their poses against a reference photo. */
import './lab.css';
import { mountLab } from './lab-markup';
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
import { s70Geometry } from '../vignette/streetcar';
import { stockNames, formation, layout, passengerGeometry, passengerMaterial } from '../vignette/crescent-stock';
import { FoliageMaskPass, inkShader } from '../vignette/ink';
import { figureLooks } from '../city/figure-looks';
import { createFigurePreview } from '../city/street-figures';
import { labTrack } from './track';
import { createPlatformScene, type PlatformKind } from './platform-scene';
import { createTrees, treeDims, treeTriangles, type TreePlacement } from '../trees/render';
import { SIZE_CLASSES, calendarDoy, doyOf, type SizeClass, type Species, type TreeQuality } from '../trees/species';
import { SPECIES as SPECIES_LIST } from '../trees/index';
import { GENERIC_SIZES, createGenericTrees, genericTriangles } from '../trees/generic';
import { C_FAMILY, TIP_CAP, TIP_RANGE_M, VARIANTS, createGinkgoVariant, variantTriangles, type GinkgoVariant } from '../trees/ginkgo-variants';
import { LOOKS } from '../trees/looks-index';
import { createLook, lookTriangles, type Look } from '../trees/looks';
import { LANDSCAPE_KINDS, LANDSCAPE_NOTES, createLandscapeScene, type LandscapeKind } from './landscape-scene';
import { HOUSE_KINDS, HOUSE_NOTES, createHouseScene, type HouseKind } from './house-scene';
import { MATERIAL_KINDS, MATERIAL_NOTES, createMaterialScene, type MaterialKind } from './materials-scene';

// The markup is shared with the in-app Models view (lab-markup.ts); mount it before any lookup.
mountLab();
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
  s70: 'Siemens S70 streetcar',
  cm44ac: 'GE/Wabtec CM44AC, CSX-like',
  cm44acNs: 'GE AC44-type, NS-like',
  es44acNs: 'GE ES44AC, NS-like',
  es44ah: 'GE ES44AH, CSX-like',
  sd70ace: 'EMD SD70ACe, NS-like',
  gp382: 'EMD GP38-2, CSX-like',
  ...stockNames, crescent: 'Full Crescent consist',
  walker: 'Walker',
  cyclist: 'Cyclist and bicycle',
  generic: 'Generic leaf-clump tree',
  ginkgo: 'Ginkgo',
  ...Object.fromEntries(LOOKS.map(l => [l.species.id, l.species.name])) as Record<string, string>,
  lineup: 'All species',
  ...LANDSCAPE_KINDS,
  ...HOUSE_KINDS,
  ...MATERIAL_KINDS,
} as const;
// Species in the lab's Trees section; 'generic' is City's current tree, the baseline.
const SPECIES: Partial<Record<string, Species>> = Object.fromEntries(SPECIES_LIST.map(s => [s.id, s]));
const SPECIES_NOTES: Record<string, string> = {
  generic: 'City’s canopy today: every crown from the canopy height map gets this faceted clump tree, coloured by a random kind. It is the baseline, and its triangles per tree are the budget a species must stay within. ',
  'willow-oak': 'Downtown’s street oak: a straight trunk under a dense oval crown of fine, narrow leaves; yellow-brown to russet late in the fall. ',
  'white-oak': 'A broad irregular crown on pale spreading limbs, rounded-lobed blue-green leaves, wine-red to russet fall colour, and a few brown leaves held into winter. ',
  'water-oak': 'The yard and woods oak: a short trunk splitting into big ascending leaders under a wider, more open crown of small spatulate leaves; a yellow week in late fall, and some leaves held into winter. ',
  'loblolly-pine': 'The tall pine of Atlanta’s yards and woods: a long clear red-brown trunk under a high, open, irregular crown, its needles in tufts at the tips of bare twigs. Evergreen; the inner needles brown and drop in fall. ',
  'tulip-poplar': 'The city’s tallest tree: a straight column of trunk under a narrow oval crown of big square-tipped leaves, golden yellow early in the fall and bare by mid-November. ',
  'red-maple': 'A rounded, ascending crown on a smooth grey trunk: a red haze of flowers in the bare crown in late winter, and scarlet to orange early in the fall. ',
  sweetgum: 'A straight leader under a crown of glossy star leaves, pyramidal when young and oval later; late in the fall it turns purple, red, orange and yellow at once. ',
  'southern-magnolia': 'A dense, dark, glossy evergreen pyramid branched to the ground, with big creamy-white flowers in May and June. ',
  'crape-myrtle': 'A small multi-stem vase of smooth, mottled, peeling bark, in flower all summer (pink, red, white or purple) and yellow to red in the fall. ',
  'japanese-maple': 'The colour accent of Ansley and Midtown yards and traffic islands: a low, wide, layered umbrella on several leaning trunks, deep red-purple in summer and scarlet to crimson late in the fall (one colourway per tree). ',
  'american-elm': 'The classic street vase: a short trunk forking into erect limbs that arch out into a wide, fountain-like crown, soft yellow in the fall (Atlanta streets plant its look-alikes, lacebark elm and zelkova). ',
  'flowering-dogwood': 'The yard-edge understorey tree: low and wide in horizontal layers, white bracts on bare twigs in early April, red-maroon in the fall. ',
  lineup: 'Every species at mature size in one season, so the board’s palette reads together. The rendering buttons pick the same option for every species that has it. ',
  ginkgo: 'A gangly single leader when young; the oldest fork low into near-upright stems under a broad crown. Leaf tufts on spur shoots, butter-yellow in November and a drop of a few days to a gold carpet. ',
};
type Model = keyof typeof models;
const requested = new URLSearchParams(location.search).get('v');
const aliases: Record<string, Model> = { bus: 'xn40', freight: 'cm44ac', train: 'cq400', streetcar: 's70' };
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
type LabTrees = { group: THREE.Object3D; setSeason(doy: number): void; dispose(): void; update?(dt: number, camera: THREE.Camera): void; setNight?(n: number): void; draws?: number | (() => number) };
let trees: LabTrees | null = null;
// Captions over each tree in "Compare all", projected every frame so screenshots label themselves.
let compareLabels: { text: string; at: THREE.Vector3 }[] = [];
const labelLayer = document.createElement('div');
labelLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;font:600 14px system-ui,sans-serif';
document.getElementById('stage')!.append(labelLayer);
// Rendering options per species, and the cost test's tree count. A species with options (the
// ginkgo's A–D and C family, trees/looks-index.ts for the rest) gets 'current', each option and
// its compare rows. The lineup shows every species at once in one option letter.
type Part = { group: THREE.Object3D; setSeason(d: number): void; update?(dt: number, c: THREE.Camera): void; setNight?(n: number): void; dispose(): void; draws?: number | (() => number) };
interface Renderings {
  ids: string[];
  /** The option Sam picked, or the leading candidate: what the lineup's "Default" shows. */
  preferred: string;
  label(id: string): string;
  /** Labelled compare rows: their button label and the options left to right. */
  compares: { id: string; label: string; set: string[] }[];
  create(placements: TreePlacement[], id: string, q: TreeQuality, compare: boolean): Part;
  /** Triangles and notes for the report under the buttons. */
  report(ids: string[], size: SizeClass, q: TreeQuality): string;
}
const GINKGO_RENDERINGS: Renderings = {
  ids: Object.keys(VARIANTS),
  preferred: 'C4',
  label: id => VARIANTS[id as GinkgoVariant],
  compares: [{ id: 'all', label: 'Compare A–D', set: ['A', 'B', 'C', 'D'] }, { id: 'allC', label: 'Compare C family', set: C_FAMILY }],
  create: (p, id, q, compare) => createGinkgoVariant(p, id as GinkgoVariant, q, () => 0, compare ? { nearM: 400 } : undefined)!,
  report: (ids, size, q) => ids.map(v => `${v} ${VARIANTS[v as GinkgoVariant]} ${variantTriangles(v as GinkgoVariant, size, q).total}`).join(', ') + ` triangles per ${size} tree.`
    + (ids.includes('B') ? (q === 'low' ? ' B draws no fans at low detail (it is A).' : ' B swaps to A beyond 60 m.') : '')
    + (ids.includes('C4') ? ` C4 counts fan tips on one tree; at most ${TIP_CAP} trees within ${TIP_RANGE_M} m carry them, none at low detail.` : ''),
};
const lookRenderings = (look: Look): Renderings => ({
  ids: look.options.map(o => o.id),
  preferred: look.preferred ?? look.options[0].id,
  label: id => look.options.find(o => o.id === id)?.label ?? id,
  compares: [
    { id: 'all', label: 'Compare all', set: look.options.filter(o => /^[A-Z]$/.test(o.id)).map(o => o.id) },
    // Variants of a picked option (magnolia gloss A1–A3) get their own row beside it.
    ...look.options.some(o => /^A\d$/.test(o.id)) ? [{ id: 'allA', label: 'Compare A variants', set: look.options.filter(o => /^A\d?$/.test(o.id)).map(o => o.id) }] : [],
  ],
  create: (p, id, q) => createLook(p, look, id, q, () => 0)!,
  report: (ids, size, q) => ids.map(id => {
    const o = look.options.find(x => x.id === id)!, t = lookTriangles(look, o, size, q);
    return `${o.id} ${o.label}: ${t.total} triangles per ${size} tree (${t.skeleton} limbs, ${t.foliage} leaves, ${t.carpet} carpet). ${o.note}`;
  }).join(' '),
});
const RENDERINGS: Record<string, Renderings> = { ginkgo: GINKGO_RENDERINGS, ...Object.fromEntries(LOOKS.map(l => [l.species.id, lookRenderings(l)])) };
let rendering = new URLSearchParams(location.search).get('variant') ?? LOOKS.find(l => l.species.id === model)?.preferred ?? 'current';
let treeCount = Number(new URLSearchParams(location.search).get('n')) || 1;
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
  let row = sizes.map((size, i) => ({ size, x: xs[i] - mid, z: 0 }));
  // Cost test: a grid of N trees cycling through the shown classes.
  if (treeCount > 1) {
    const pitch = Math.max(...spreads) * 1.15;
    const cols = Math.ceil(Math.sqrt(treeCount));
    row = Array.from({ length: treeCount }, (_, i) => ({ size: sizes[i % sizes.length], x: (i % cols - (cols - 1) / 2) * pitch, z: (Math.floor(i / cols) - (cols - 1) / 2) * pitch }));
  }
  const reg = RENDERINGS[model];
  const compare = reg?.compares.find(c => c.id === rendering);
  const combine = (parts: Part[]): LabTrees => {
    const group = new THREE.Group();
    parts.forEach(p => group.add(p.group));
    return {
      group,
      setSeason: d => parts.forEach(p => p.setSeason(d)),
      update: (dt, cam) => parts.forEach(p => p.update?.(dt, cam)),
      setNight: n => parts.forEach(p => p.setNight?.(n)),
      dispose: () => { parts.forEach(p => p.dispose()); group.removeFromParent(); },
      draws: () => parts.reduce((n, p) => n + (typeof p.draws === 'function' ? p.draws() : p.draws ?? 0), 0),
    };
  };
  if (model === 'lineup') {
    // Every species at mature size, left to right in mix-weight order, each in the chosen option.
    const all: Species[] = [...LOOKS.map(l => l.species), SPECIES.ginkgo!];
    const gaps = all.map(sp => sp.sizes.mature.spreadM);
    let x = 0;
    const xs = gaps.map((g, i) => (x += i ? gaps[i - 1] / 2 + 3 + g / 2 : 0));
    const mid = (xs[0] - gaps[0] / 2 + xs[xs.length - 1] + gaps[gaps.length - 1] / 2) / 2;
    // 'default' is each species' preferred option; a letter applies wherever a species has it.
    const pick = (sp: Species) => rendering === 'default' ? RENDERINGS[sp.id]?.preferred : rendering;
    const uses = (sp: Species) => rendering !== 'current' && !!RENDERINGS[sp.id]?.ids.includes(pick(sp) ?? '');
    const parts = all.map((sp, i) => {
      const p: TreePlacement = { species: sp, size: 'mature', x: xs[i] - mid, z: 0, seed: 11, heightM: sp.sizes.mature.heightM, spreadM: sp.sizes.mature.spreadM };
      return uses(sp) ? RENDERINGS[sp.id].create([p], pick(sp)!, treeQuality, true) : createTrees([p], treeQuality, () => 0)!;
    });
    trees = combine(parts);
    row = all.map((_, i) => ({ size: 'mature' as SizeClass, x: xs[i] - mid, z: 0 }));
    compareLabels = all.map((sp, i) => ({ text: `${sp.name} · ${uses(sp) ? pick(sp) : 'current'}`, at: new THREE.Vector3(row[i].x, sp.sizes.mature.heightM * 1.04, 0) }));
    spreads.splice(0, spreads.length, ...gaps);
    heights.splice(0, heights.length, ...all.map(sp => sp.sizes.mature.heightM));
  } else if (reg && compare) {
    // Compare rows: options left to right at one class (mature when "All sizes" is chosen).
    const set = compare.set;
    const mid0 = (set.length - 1) / 2;
    const size: SizeClass = treeSize === 'all' ? 'mature' : treeSize;
    const spread = species!.sizes[size].spreadM;
    const gap = Math.max(spread + 3, size === 'sapling' ? 5 : 9);
    trees = combine(set.map((v, i) => reg.create([{ species: species!, size, x: (i - mid0) * gap, z: 0, seed: 11, heightM: species!.sizes[size].heightM, spreadM: spread }], v, treeQuality, true)));
    row = set.map((_, i) => ({ size, x: (i - mid0) * gap, z: 0 }));
    compareLabels = set.map((v, i) => ({ text: set.length > 4 ? v : `${v} · ${reg.label(v)}`, at: new THREE.Vector3(row[i].x, species!.sizes[size].heightM * 1.04, 0) }));
    spreads.splice(0, spreads.length, ...row.map(() => gap - 3));
    heights.splice(0, heights.length, ...row.map(() => species!.sizes[size].heightM));
  } else if (reg && reg.ids.includes(rendering)) {
    const placements: TreePlacement[] = row.map((r, i) => ({ species: species!, size: r.size, x: r.x, z: r.z, seed: 11 + i * 7,
      heightM: species!.sizes[r.size].heightM, spreadM: species!.sizes[r.size].spreadM }));
    trees = combine([reg.create(placements, rendering, treeQuality, false)]);
  } else if (species) {
    const placements: TreePlacement[] = row.map((r, i) => ({ species, size: r.size, x: r.x, z: r.z, seed: 11 + i * 7,
      heightM: species.sizes[r.size].heightM, spreadM: species.sizes[r.size].spreadM }));
    trees = createTrees(placements, treeQuality, () => 0);
  } else trees = createGenericTrees(row, treeQuality);
  scene.add(trees!.group);
  trees!.setNight?.(night.value);
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
    // Standing 1.6 m up, close enough that the tallest tree fills the frame, as in a reference photo.
    'Eye level': { pos: [0, 1.6, Math.max(tall * 0.95, Math.max(...spreads) * 1.25)], target: [0, tall * 0.48, 0], fov: 58 },
  };
  camera.far = Math.max(400, d * 4);
  camera.updateProjectionMatrix();

  const variantReport = document.getElementById('variant-report')!;
  if (model === 'lineup') {
    variantReport.textContent = `Left to right roughly by City mix weight, all mature. None of these options is in City yet. ${rendering === 'current' ? 'Current: each species’ framework clump model.' : rendering === 'default' ? 'Default: Sam’s pick where he has made one (ginkgo C4), otherwise each species’ leading option A.' : `Option ${rendering} where a species has it, otherwise its current model.`}`;
  } else if (reg) {
    const size: SizeClass = treeSize === 'all' ? 'mature' : treeSize;
    variantReport.textContent = rendering === 'current'
      ? `Current: the framework clump model${model === 'ginkgo' ? ' City draws today' : ''}, ${treeTriangles(species!, size, treeQuality).total} triangles per ${size} tree.`
      : (compare ? 'Left to right: ' : '') + reg.report(compare ? compare.set : [rendering], size, treeQuality);
  }
  const per = (q: TreeQuality) => model === 'lineup' ? 'see each species' : species
    ? sizes.map(size => `${size} ${treeTriangles(species, size, q).total}`).join(', ')
    : `${genericTriangles(q).total} per tree at every size`;
  const budget = genericTriangles(treeQuality);
  const drawsOf = (trees as LabTrees | null)?.draws;
  const draws = typeof drawsOf === 'function' ? drawsOf() : drawsOf ?? budget.draws;
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
  landscapeReport.textContent = `${landscape.draws} draw call${landscape.draws === 1 ? '' : 's'} (one for primitives, one for ground covers, when present). Triangles: high ${landscape.triangles.high.toLocaleString()}, `
    + `low ${landscape.triangles.low.toLocaleString()}. Showing ${treeQuality} detail.`;
  landscapeReport.hidden = false;
}
const isHouse = (id: string): id is HouseKind => Object.hasOwn(HOUSE_KINDS, id);
let houseScene: ReturnType<typeof createHouseScene> | null = null;
/** Houses drawn exactly as City draws them, with triangle and draw counts for the tier shown. */
function buildHouses() {
  houseScene = createHouseScene(model as HouseKind, treeQuality);
  scene.add(houseScene.group);
  houseScene.setNight(night.value);
  landscapeReport.textContent = `${houseScene.houses} houses, ${houseScene.draws} draw calls, `
    + `${Math.round(houseScene.triangles).toLocaleString()} triangles (${Math.round(houseScene.triangles / houseScene.houses)} per house). Showing ${treeQuality} detail.`;
  landscapeReport.hidden = false;
}
const isMaterial = (id: string): id is MaterialKind => Object.hasOwn(MATERIAL_KINDS, id);
let materialScene: ReturnType<typeof createMaterialScene> | null = null;
/** Every library material at both tiers; the lab's Night button gives the night look. */
function buildMaterials() {
  materialScene = createMaterialScene();
  scene.add(materialScene.group);
  landscapeReport.textContent = `${materialScene.swatches} materials x 2 tiers, ${materialScene.draws} draw calls plus ${materialScene.draws} shadow passes (one program per tier), `
    + `${Math.round(materialScene.triangles).toLocaleString()} triangles, 0 texture bytes.`;
  landscapeReport.hidden = false;
}
function build() {
  houseScene?.dispose();
  houseScene = null;
  materialScene?.dispose();
  materialScene = null;
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
  compareLabels = [];
  scaleFigure?.dispose();
  scaleFigure = undefined;
  ground.visible = true;
  const isTree = model === 'generic' || model === 'lineup' || Object.hasOwn(SPECIES, model);
  eyeLevel.hidden = !isTree;
  for (const id of ['tree-size', 'season', 'tier']) document.getElementById(id)!.hidden = !isTree && !(isLandscape(model) && id !== 'tree-size');
  for (const b of document.getElementById('tier')!.querySelectorAll('button')) b.hidden = isMaterial(model);
  document.querySelector('#tier legend')!.textContent = isMaterial(model) ? 'Swatches' : 'Detail';
  // The lineup is one tree per species; the cost test's counts don't apply.
  document.getElementById('count')!.hidden = !isTree || model === 'lineup';
  document.getElementById('rendering')!.hidden = !RENDERINGS[model] && model !== 'lineup';
  if (isHouse(model) || isMaterial(model)) {
    for (const id of ['lines', 'roles', 'platforms', 'motion', 'tree-size', 'season']) document.getElementById(id)!.hidden = true;
    // Swatches show both tiers at once, so their tier buttons are hidden above; the report still shows.
    document.getElementById('tier')!.hidden = false;
    nextLook.hidden = true;
    track.visible = longTrack.visible = false;
    ground.material = floorMaterial;
    ground.scale.setScalar(1.2);
    sun.position.set(-18, 30, 22).multiplyScalar(1.5);
    sun.shadow.normalBias = .05;
    Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, far: 160 });
    sun.shadow.camera.updateProjectionMatrix();
    document.getElementById('title')!.textContent = models[model];
    document.title = models[model] + ' · Model Lab · Sim Atlanta';
    if (isMaterial(model)) {
      document.getElementById('blurb')!.textContent = MATERIAL_NOTES[model] + 'Patterns are illustrative stylisation, tuned against photographs.';
      buildMaterials();
      return;
    }
    document.getElementById('blurb')!.textContent = HOUSE_NOTES[model] + 'Style, siding, colour and storeys are illustrative; in City OSM tags win where present.';
    buildHouses();
    return;
  }
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
  track.visible = (model === 'cq400' || model === 'cm44ac' || model === 'cm44acNs' || ['es44acNs', 'es44ah', 'sd70ace', 'gp382'].includes(model) || model === 's70' || passenger);
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
      : model === 'airoCoach'
        ? 'Siemens Airo corridor coach in Amtrak’s east-coast scheme. Airo does not run on the Crescent; this is a look study for future corridor service. '
        : 'Illustrative Crescent equipment. ';
    const link = document.createElement('a');
    link.href = 'https://github.com/samsolomon/sim-atlanta/blob/main/docs/crescent-stock.md';
    link.textContent = 'Equipment notes and reference photos';
    blurb.append(link);
    return;
  }
  if (model === 's70') {
    const mesh = new THREE.Mesh(s70Geometry(), passengerMaterial(night));
    mesh.position.y = .125;
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    cars = [mesh];
    const blurb = document.getElementById('blurb')!;
    blurb.textContent = 'Atlanta Streetcar car in its royal-blue livery, cab A leading. Three body sections, four double doors a side. ';
    const link = document.createElement('a');
    link.href = 'https://github.com/samsolomon/sim-atlanta/blob/main/docs/atlanta-streetcar.md';
    link.textContent = 'Dimensions and reference photos';
    blurb.append(link);
    return;
  }
  if (model === 'es44acNs' || model === 'es44ah' || model === 'sd70ace' || model === 'gp382') {
    const mesh = new THREE.Mesh(freightGeometry(model, { leadFront: true }), passengerMaterial(night));
    mesh.position.y = .125;
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh); cars = [mesh];
    const blurb = document.getElementById('blurb')!;
    blurb.textContent = ({
      es44acNs: 'GE Evolution-series road locomotive with the long flared radiator, in an NS-like black and white scheme. ',
      es44ah: 'GE Evolution-series road locomotive with the long flared radiator, in a CSX-like blue-grey and yellow scheme. ',
      sd70ace: 'EMD road locomotive with a broad safety cab, brow headlights and six-axle running gear, in an NS-like scheme. ',
      gp382: 'Compact EMD road-switcher with a narrow short hood and four-axle Blomberg trucks, in a CSX-like scheme. ',
    })[model] + 'Lab study; no logos or numbers. ';
    const link = document.createElement('a');
    link.href = 'https://github.com/samsolomon/sim-atlanta/blob/main/docs/freight-variety.md';
    link.textContent = 'Dimensions and reference photos'; blurb.append(link);
    return;
  }
  if (model === 'cm44ac' || model === 'cm44acNs') {
    const ns = model === 'cm44acNs';
    const blurb = document.getElementById('blurb')!;
    blurb.textContent = ns
      ? 'The same GE body in an NS-like scheme (black, white nose stripes, no marks), as NS AC44C6M rebuilds and ES44ACs appear around Atlanta. Leading an illustrative boxcar. '
      : 'CSX 7257, seen at Georgia State, is a CM44AC: a GE AC4400CW rebuilt by Wabtec with a new cab. Modelled in a CSX-like blue-grey and yellow without marks, leading an illustrative boxcar. ';
    const link = document.createElement('a');
    link.href = 'https://github.com/samsolomon/sim-atlanta/blob/main/docs/freight-stock.md';
    link.textContent = 'Locomotive notes and reference photos';
    blurb.append(link);
    cars = ([ns ? 'locomotiveNs' : 'locomotive', 'boxcar'] as const).map(unit => {
      const mesh = new THREE.Mesh(freightGeometry(unit, { leadFront: unit !== 'boxcar' }), passengerMaterial(night));
      mesh.position.set(0, .125, (unit !== 'boxcar' ? 1 : -1) * (FREIGHT_LENGTH[unit] / 2 + .15));
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
/** `near` defaults to the lab's 0.1 m; the swatches' City-distance view uses City's 20 m so the ink matches. */
type ViewPreset = { pos: [number, number, number]; target: [number, number, number]; fov: number; near?: number };
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
  camera.near = v.near ?? 0.1;
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
let foliageMask: FoliageMaskPass;
const ink = new ShaderPass(inkShader());
// Foliage mask for inkFoliageMesh leaves: drawn after the scene, read by the ink pass.
foliageMask = new FoliageMaskPass(scene, camera, ink);
composer.insertPass(foliageMask, 1);
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
  trees?.setNight?.(night.value);
}

let lastFrame = 0;
const intervals: number[] = [];
// Cost readout for the Trees section: CPU time to submit a frame, and what the GPU was sent.
const perf = (() => {
  const ms: number[] = [];
  let frames = 0;
  return {
    push(m: number, tri: number, calls: number) {
      ms.push(m); if (ms.length > 60) ms.shift();
      if (++frames % 30 || !trees) return;
      const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
      document.getElementById('perf-report')!.textContent =
        `${treeCount} tree${treeCount > 1 ? 's' : ''}: ${tri.toLocaleString()} triangles and ${calls} draw calls per frame (all passes), ${avg.toFixed(1)} ms CPU to submit, ${(1000 / (intervals.reduce((a, b) => a + b, 0) / Math.max(1, intervals.length))).toFixed(0)} fps (60-frame means).`;
    },
  };
})();
/** One render, also callable from captures when a background tab throttles requestAnimationFrame. */
const draw = (t: number) => {
  if (figure && playing) {
    cycle = (cycle + Math.min(t - lastFrame, 100) / 1000 * figure.cyclesPerSecond) % 1;
    figure.setPhase(cycle);
    phase.value = String(Math.round(cycle * 100));
  }
  const dt = Math.min(t - lastFrame, 100) / 1000;
  intervals.push(t - lastFrame); if (intervals.length > 60) intervals.shift();
  labelLayer.replaceChildren(...compareLabels.map(l => {
    const p = l.at.clone().project(camera);
    const d = document.createElement('div');
    d.textContent = l.text;
    d.style.cssText = `position:absolute;left:${(p.x + 1) / 2 * 100}%;top:${(1 - p.y) / 2 * 100}%;transform:translate(-50%,-100%);background:#000c;color:#fff;padding:3px 8px;border-radius:4px;white-space:nowrap`;
    return d;
  }));
  trees?.update?.(dt, camera);
  lastFrame = t;
  controls.update();
  ink.uniforms.tDepth.value = composer.readBuffer.depthTexture;
  ink.uniforms.uNear.value = camera.near;
  ink.uniforms.uFar.value = camera.far;
  ink.uniforms.uStrength.value = inkOn ? 0.9 : 0;
  grade.uniforms.uTime.value = t / 1000;
  const t0 = performance.now();
  renderer.info.autoReset = false;
  renderer.info.reset();
  composer.render();
  perf.push(performance.now() - t0, renderer.info.render.triangles, renderer.info.render.calls);
};
const frame = (t: number) => {
  // Inside the app the lab sits in a view that hides when Map or City shows: draw nothing then.
  // __lab.render() still draws on demand for captures.
  if (!el.closest('[hidden]')) draw(t);
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
// Trees also get an eye-level view, framed like a reference photograph.
mk('views', 'Eye level', () => view('Eye level'));
const eyeLevel = document.querySelector<HTMLButtonElement>('#views button:last-of-type')!;
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
const HOUSE_VIEWS: Record<string, ViewPreset> = {
  Front: { pos: [0, 16, 62], target: [0, 3, 0], fov: 40 },
  '¾ front': { pos: [-34, 22, 46], target: [0, 3, 0], fov: 42 },
  Side: { pos: [-60, 12, 0], target: [0, 3, 0], fov: 40 },
  Rear: { pos: [0, 16, -62], target: [0, 3, 0], fov: 40 },
  Top: { pos: [.01, 80, 0], target: [0, 0, 0], fov: 40 },
};
// Swatch rows run back to front; the high-tier block is on the left (x < 0), low on the right.
// The lab's view buttons are fixed names: ¾ front and Side are close-ups of the high and low
// blocks, and Rear is the City's lens (22°) from about 200 m, where detail fades to flat colour.
const MATERIAL_VIEWS: Record<string, ViewPreset> = {
  Front: { pos: [0, 48, 62], target: [0, 2, 0], fov: 42 },
  '¾ front': { pos: [-24, 12, 30], target: [-24, 4, 4], fov: 40 },
  Side: { pos: [24, 12, 30], target: [24, 4, 4], fov: 40 },
  Rear: { pos: [0, 120, 165], target: [0, 3, 0], fov: 22, near: 20 },
  Top: { pos: [.01, 90, 0], target: [0, 0, 0], fov: 40 },
};
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
  presets = isMaterial(id) ? MATERIAL_VIEWS : isHouse(id) ? HOUSE_VIEWS : isLandscape(id) ? LANDSCAPE_VIEWS : id === 'crescent' || id === 's70' || ['es44acNs', 'es44ah', 'sd70ace', 'gp382'].includes(id) || isPassengerUnit(id) ? passengerViews : ({ cq400: TRAIN_VIEWS, xn40: BUS_VIEWS, cm44ac: FREIGHT_VIEWS, cm44acNs: FREIGHT_VIEWS, es44acNs: FREIGHT_VIEWS, es44ah: FREIGHT_VIEWS, sd70ace: FREIGHT_VIEWS, gp382: FREIGHT_VIEWS, walker: FIGURE_VIEWS, cyclist: FIGURE_VIEWS, generic: TRAIN_VIEWS, ginkgo: TRAIN_VIEWS } as Record<string, Record<string, ViewPreset>>)[id];
  modelSelect.value = id;
  renderingButtons();
  document.querySelectorAll<HTMLButtonElement>('[data-model]').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.model === id)));
  build();
  view(id === 'generic' || id === 'lineup' || isMaterial(id) || Object.hasOwn(SPECIES, id) ? 'Front' : '¾ front');
}
function selectModel(id: Model) {
  const url = new URL(location.href);
  url.searchParams.set('v', id);
  history.replaceState(null, '', url);
  setModel(id);
}
for (const [group, ids] of [['vehicles', ['cq400', 's70', 'xn40', 'cm44ac', 'cm44acNs', 'es44acNs', 'es44ah', 'sd70ace', 'gp382', ...Object.keys(stockNames) as (keyof typeof stockNames)[], 'crescent']], ['people', ['walker', 'cyclist']], ['trees', ['generic', 'ginkgo', ...LOOKS.map(l => l.species.id as Model), 'lineup' as Model]], ['landscape', Object.keys(LANDSCAPE_KINDS) as LandscapeKind[]], ['houses', Object.keys(HOUSE_KINDS) as HouseKind[]], ['materials', Object.keys(MATERIAL_KINDS) as MaterialKind[]]] as const) {
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
/** Rendering buttons for the selected species, from its registry; the lineup offers every option letter. */
function renderingButtons() {
  const box = document.getElementById('rendering')!;
  box.querySelectorAll('button').forEach(b => b.remove());
  const reg = RENDERINGS[model];
  box.querySelector('legend')!.textContent = model === 'lineup' ? 'Rendering, every species' : `${models[model]} rendering`;
  const ids = model === 'lineup' ? [...new Set(Object.values(RENDERINGS).flatMap(r => r.ids))].sort() : reg?.ids ?? [];
  const compares = model === 'lineup' ? [] : reg?.compares ?? [];
  if (rendering !== 'current' && !(model === 'lineup' && rendering === 'default') && !ids.includes(rendering) && !compares.some(c => c.id === rendering)) {
    rendering = 'current';
    setParam('variant', null);
  }
  const buttons: [string, string][] = [['current', 'Current'], ...(model === 'lineup' ? [['default', 'Default']] as [string, string][] : []), ...ids.map(id => [id, model === 'lineup' ? id : `${id} ${reg!.label(id)}`] as [string, string]), ...compares.map(c => [c.id, c.label] as [string, string])];
  // The ginkgo keeps its order: A–D, compare, then the C family and its compare.
  if (model === 'ginkgo') buttons.splice(0, buttons.length, ...(['current', 'A', 'B', 'C', 'D', 'all', 'C1', 'C2', 'C3', 'C4', 'allC'].map(r => [r, r === 'current' ? 'Current' : reg!.compares.find(c => c.id === r)?.label ?? `${r} ${reg!.label(r)}`] as [string, string])));
  for (const [r, label] of buttons) mk('rendering', label, () => { rendering = r; setParam('variant', r); build(); view('Front'); }, r === rendering);
  box.append(document.getElementById('variant-report')!);
}
for (const n of [1, 20, 50, 300])
  mk('count', String(n), () => { treeCount = n; setParam('n', String(n)); build(); view('Front'); }, n === treeCount);
document.getElementById('count')!.append(document.getElementById('perf-report')!);
for (const tier of ['high', 'low'] as const)
  mk('tier', tier === 'high' ? 'High' : 'Low', () => { treeQuality = tier; setParam('tier', tier); build(); }, tier === treeQuality);
document.getElementById('tier')!.append(landscapeReport);
modelSelect.addEventListener('change', () => selectModel(modelSelect.value as Model));
setModel(model);
const nightBtn = document.getElementById('night')!;
if (new URLSearchParams(location.search).get('night') === '1') {
  setNight(true);
  (houseScene as ReturnType<typeof createHouseScene> | null)?.setNight(1);
  nightBtn.setAttribute('aria-pressed', 'true');
}
nightBtn.addEventListener('click', () => {
  const on = nightBtn.getAttribute('aria-pressed') !== 'true';
  nightBtn.setAttribute('aria-pressed', String(on));
  setNight(on);
  houseScene?.setNight(on ? 1 : 0);
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
/** Render `frames` frames back to back (ink, grade and shadows on) and report the mean cost; finish() flushes the GPU. */
function bench(frames = 60) {
  const gl = renderer.getContext();
  composer.render(); gl.finish();
  renderer.info.autoReset = false;
  const t0 = performance.now();
  let tri = 0, calls = 0;
  for (let i = 0; i < frames; i++) {
    trees?.update?.(1 / 60, camera);
    renderer.info.reset();
    composer.render();
    tri = renderer.info.render.triangles; calls = renderer.info.render.calls;
  }
  gl.finish();
  return { msPerFrame: (performance.now() - t0) / frames, triangles: tri, calls };
}
/**
 * Foliage overdraw: renders only the leaf meshes (with their alpha test), adding 1 per fragment
 * that survives the test, and reports layers per covered pixel. Depth test is off, so this is
 * the worst case before early-z rejection.
 */
function overdraw() {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.FloatType });
  const leaves: THREE.InstancedMesh[] = [];
  scene.traverse(o => { if (o instanceof THREE.InstancedMesh && /foliage|leaves|tips|chips|sleeves/.test(o.name) && o.visible) leaves.push(o); });
  const saved = new Map<THREE.Object3D, THREE.Material | THREE.Material[]>();
  const hidden: THREE.Object3D[] = [];
  scene.traverse(o => { if ((o as THREE.Mesh).isMesh && !leaves.includes(o as THREE.InstancedMesh) && o.visible) { o.visible = false; hidden.push(o); } });
  // Hide every other renderable, lines and points included.
  scene.traverse(o => { if (((o as THREE.Line).isLine || (o as THREE.Points).isPoints) && o.visible) { o.visible = false; hidden.push(o); } });
  for (const l of leaves) {
    const src = l.material as THREE.MeshLambertMaterial;
    saved.set(l, l.material);
    // Exactly 1.0 per fragment that survives the alpha test, whatever the tint or atlas colour.
    const counter = new THREE.MeshBasicMaterial({ map: src.map ?? null, alphaTest: src.alphaTest, side: THREE.DoubleSide,
      transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
    counter.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor = vec4(1.0);'); };
    l.material = counter;
  }
  const bgSaved = scene.background;
  scene.background = null;
  renderer.setRenderTarget(rt);
  const clearSaved = renderer.getClearColor(new THREE.Color()), alphaSaved = renderer.getClearAlpha();
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  const px = new Float32Array(size.x * size.y * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, size.x, size.y, px);
  renderer.setRenderTarget(null);
  renderer.setClearColor(clearSaved, alphaSaved);
  scene.background = bgSaved;
  for (const [o, mat] of saved) { ((o as THREE.Mesh).material as THREE.Material).dispose(); (o as THREE.Mesh).material = mat; }
  for (const o of hidden) o.visible = true;
  rt.dispose();
  let covered = 0, sum = 0, max = 0;
  for (let i = 0; i < px.length; i += 4) { const n = px[i]; if (n > 0.5) { covered++; sum += n; max = Math.max(max, n); } }
  return { coveredPct: +(100 * covered / (size.x * size.y)).toFixed(1), layersPerCoveredPixel: +(sum / Math.max(1, covered)).toFixed(2), maxLayers: Math.round(max) };
}
/**
 * Crown colour as Sam sees it: renders a frame through ink and grade, reads the canvas, and
 * averages only the pixels where foliage is visible (a mask render: foliage white with its own
 * alpha test and leaf-drop patch, everything else black, depth-tested). Foliage is any mesh
 * named foliage/leaves/tips/chips/sleeves/plumes, or the generic canopy's clump and cone meshes.
 * Luminance is Rec. 709 on the display values (0–1); saturation is HSV.
 */
function crownStats() {
  const gl = renderer.getContext();
  draw(performance.now());
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const shown = new Uint8Array(size.x * size.y * 4);
  gl.readPixels(0, 0, size.x, size.y, gl.RGBA, gl.UNSIGNED_BYTE, shown);
  const isFoliage = (o: THREE.Mesh) => /foliage|leaves|tips|chips|sleeves|plume/.test(o.name)
    // The generic canopy: instanced clumps and cone tiers (lab props are not instanced).
    || ((o as THREE.InstancedMesh).isInstancedMesh && ['OctahedronGeometry', 'DodecahedronGeometry', 'ConeGeometry'].includes(o.geometry.type));
  const saved = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const made: THREE.Material[] = [];
  const black = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, toneMapped: false });
  scene.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !o.visible) return;
    saved.set(m, m.material);
    if (!isFoliage(m)) { m.material = black; return; }
    const src = m.material as THREE.MeshLambertMaterial;
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff, map: src.map ?? null, alphaTest: src.alphaTest, side: THREE.DoubleSide, toneMapped: false });
    const patch = src.userData?.maskShader as ((sh: THREE.WebGLProgramParametersWithUniforms) => void) | undefined;
    if (patch) { white.onBeforeCompile = sh => patch(sh); white.customProgramCacheKey = () => 'crownStats:' + (src.userData.maskKey ?? 'p'); }
    made.push(white);
    m.material = white;
  });
  const rt = new THREE.WebGLRenderTarget(size.x, size.y);
  const bgSaved = scene.background;
  scene.background = new THREE.Color(0x000000);
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  const mask = new Uint8Array(size.x * size.y * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, size.x, size.y, mask);
  renderer.setRenderTarget(null);
  scene.background = bgSaved;
  for (const [m, mat] of saved) m.material = mat;
  for (const mat of [...made, black]) mat.dispose();
  rt.dispose();
  let n = 0, lum = 0, sat = 0;
  for (let i = 0; i < mask.length; i += 4) {
    // Instance colours and the atlas tint the mask's white; the background is pure black.
    if (mask[i] + mask[i + 1] + mask[i + 2] < 6) continue;
    const r = shown[i] / 255, g = shown[i + 1] / 255, b = shown[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    lum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sat += mx > 0 ? (mx - mn) / mx : 0;
    n++;
  }
  draw(performance.now());
  return { pixels: n, luminance: +(lum / Math.max(1, n)).toFixed(3), saturation: +(sat / Math.max(1, n)).toFixed(3) };
}
Object.assign(window, { __lab: { crownStats, overdraw, bench, view, setNight, resize, render: () => draw(performance.now()), role, scene, camera, controls, station: () => station } });
