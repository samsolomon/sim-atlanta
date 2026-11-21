/** Model lab: inspect vehicle models against reference photos (front, side, three-quarter, rear). */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CAR_GAP, CAR_LENGTH, LINE_COLORS, cq400Geometry, cq400Material, type MartaLine } from '../vignette/cq400';
import { gradeShader } from '../vignette/grade';
import { inkShader } from '../vignette/ink';

const el = document.getElementById('stage')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 });
scene.add(hemi, sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshLambertMaterial({ color: '#d9d3c6' }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
// A short length of track: ballast, sleepers, rails.
const track = new THREE.Group();
const ballast = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 60), new THREE.MeshLambertMaterial({ color: '#8d877d' }));
ballast.position.y = -0.15;
track.add(ballast);
for (const x of [-0.72, 0.72]) {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 60), new THREE.MeshLambertMaterial({ color: '#6b625b' }));
  rail.position.set(x, 0.05, 0);
  track.add(rail);
}
for (let z = -30; z < 30; z += 0.7) {
  const tie = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.26), new THREE.MeshLambertMaterial({ color: '#9b968c' }));
  tie.position.set(0, -0.02, z);
  track.add(tie);
}
track.traverse((o) => ((o as THREE.Mesh).receiveShadow = true));
scene.add(track);

const night = { value: 0 };
const role = { value: 1 };
let line: MartaLine = 'gold';
let cars: THREE.Mesh[] = [];
function build() {
  for (const c of cars) {
    scene.remove(c);
    c.geometry.dispose();
  }
  const color = LINE_COLORS[line];
  const cab = new THREE.Mesh(cq400Geometry({ cab: true, u0: 0, u1: 0.25 }, color), cq400Material(color, role, night));
  const mid = new THREE.Mesh(cq400Geometry({ cab: false, u0: 0.25, u1: 0.5 }, color), cq400Material(color, { value: 0 }, night));
  cab.position.z = CAR_LENGTH / 2 + CAR_GAP / 2;
  mid.position.z = -CAR_LENGTH / 2 - CAR_GAP / 2;
  cars = [cab, mid];
  for (const c of cars) {
    c.castShadow = c.receiveShadow = true;
    scene.add(c);
  }
}
build();

const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const VIEWS: Record<string, { pos: [number, number, number]; target: [number, number, number]; fov: number }> = {
  'Front': { pos: [0, 2.3, 48], target: [0, 2.0, 22], fov: 18 },
  '¾ front': { pos: [-11, 4.2, 36], target: [0, 2.0, 18], fov: 28 },
  'Side': { pos: [-30, 2.6, 16], target: [0, 2.0, 16], fov: 32 },
  'Rear': { pos: [0, 2.3, -60], target: [0, 2.0, -22], fov: 20 },
  'Top': { pos: [0.01, 60, 2], target: [0, 0, 2], fov: 40 },
};
function view(name: string) {
  const v = VIEWS[name];
  camera.position.set(...v.pos);
  controls.target.set(...v.target);
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
  (ground.material as THREE.MeshLambertMaterial).color.set(on ? '#2a3040' : '#d9d3c6');
}

const frame = (t: number) => {
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
for (const v of Object.keys(VIEWS)) mk('views', v, () => view(v));
view('¾ front');
const nightBtn = document.getElementById('night')!;
nightBtn.addEventListener('click', () => {
  const on = nightBtn.getAttribute('aria-pressed') !== 'true';
  nightBtn.setAttribute('aria-pressed', String(on));
  setNight(on);
});
const inkBtn = document.getElementById('ink')!;
inkBtn.addEventListener('click', () => {
  inkOn = !inkOn;
  inkBtn.setAttribute('aria-pressed', String(inkOn));
});
const ref = document.getElementById('ref') as HTMLImageElement;
document.getElementById('file')!.addEventListener('change', (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  ref.src = URL.createObjectURL(f);
  ref.style.display = 'block';
});
document.getElementById('opacity')!.addEventListener('input', (e) => (ref.style.opacity = (e.target as HTMLInputElement).value));
Object.assign(window, { __lab: { view, setNight, role, scene, camera } });
