import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { VData } from '../vignette/world';
import { GroundGrid, type GroundManifest } from './grid';
import { terrainModel, cityScenery } from './model';

const data = './data/scene/downtown/';
const reading = document.querySelector<HTMLElement>('#reading')!;
const controlsPanel = document.querySelector('fieldset')!;
const sceneryToggle = document.querySelector<HTMLInputElement>('#scenery')!;

async function asset(name: string) {
  const r = await fetch(data + name);
  if (!r.ok) throw new Error(`${name} (${r.status})`);
  return r;
}

const views = {
  downtown: { x: 0, z: 0, eye: [-590, 550, 840], section: [[0, 0]] },
  cut: { x: 198.77, z: 154.56, eye: [115, 80, 60], section: [[198.77, 104.56], [198.77, 204.56]] },
  connector: { x: 740, z: 555, eye: [-90, 150, 195], section: [[610, 555], [865, 555]] },
};
type Stop = keyof typeof views;

async function main() {
  const [m, binary, city, trees]: [GroundManifest, ArrayBuffer, VData, { trees: [number, number, number, number][] }] =
    await Promise.all([asset('ground.json').then(r => r.json()), asset('ground.i16').then(r => r.arrayBuffer()),
      asset('vignette.json').then(r => r.json()), asset('trees.json').then(r => r.json())]);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', binary));
  if (Array.from(hash, b => b.toString(16).padStart(2, '0')).join('') !== m.sha256) throw new Error('Ground checksum mismatch');
  const grid = new GroundGrid(m, binary);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8e4d9');
  scene.fog = new THREE.FogExp2('#e8e4d9', 0.00028);
  const canvas = new THREE.WebGLRenderer({ antialias: true });
  canvas.setPixelRatio(Math.min(devicePixelRatio, 2));
  canvas.shadowMap.enabled = true;
  canvas.shadowMap.type = THREE.PCFSoftShadowMap;
  document.querySelector('#stage')!.append(canvas.domElement);
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 7500);
  const orbit = new OrbitControls(camera, canvas.domElement);
  orbit.maxPolarAngle = Math.PI * 0.47;
  orbit.minDistance = 25;
  orbit.maxDistance = 3400;
  const light = new THREE.DirectionalLight('#fff1d7', 2.05);
  light.castShadow = true;
  Object.assign(light.shadow.camera, { left: -470, right: 470, top: 470, bottom: -470, near: 1, far: 2350 });
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.normalBias = 0.35;
  scene.add(light, light.target, new THREE.HemisphereLight('#fff9ec', '#9eacac', 1.55));
  scene.add(terrainModel(grid, city));
  const scenery = cityScenery(grid, city, trees.trees);
  scene.add(scenery);
  const section = new THREE.Group();
  scene.add(section);
  const ink = new THREE.MeshBasicMaterial({ color: '#1b5862' });
  const pin = new THREE.SphereGeometry(1.3, 12, 8);
  const lineMaterial = new THREE.LineBasicMaterial({ color: '#1b5862' });
  function height(x: number, z: number) {
    const h = grid.sample(x, z);
    if (h === null) throw new Error('Unknown ground in the measured section');
    return h;
  }
  const draw = () => canvas.render(scene, camera);
  function focus(stop: Stop) {
    const { x, z, eye, section: ends } = views[stop];
    const y = height(x, z) - m.vertical.sceneZeroNavd88M;
    orbit.target.set(x, y, z);
    camera.position.set(x + eye[0], y + eye[1], z + eye[2]);
    light.target.position.copy(orbit.target);
    light.position.set(x - 520, y + 1000, z + 440);
    for (const child of section.children) if (child instanceof THREE.Line) child.geometry.dispose();
    section.clear();
    const [start, end = start] = ends;
    const n = Math.max(1, Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1])));
    const points = Array.from({ length: n + 1 }, (_, i) => {
      const px = start[0] + (end[0] - start[0]) * i / n;
      const pz = start[1] + (end[1] - start[1]) * i / n;
      return new THREE.Vector3(px, height(px, pz) - m.vertical.sceneZeroNavd88M + 0.5, pz);
    });
    section.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
    for (const [px, pz] of [...ends, [x, z]]) {
      const mark = new THREE.Mesh(pin, ink);
      mark.position.set(px, height(px, pz) - m.vertical.sceneZeroNavd88M + 0.8, pz);
      section.add(mark);
    }
    for (const b of controlsPanel.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.view === stop));
    scenery.visible = sceneryToggle.checked = stop === 'downtown';
    const h = height(x, z);
    if (stop === 'downtown') reading.textContent = `Five Points ground is ${h.toFixed(1)} m NAVD88, the model’s vertical origin.`;
    if (stop === 'cut') reading.textContent = `The centre of the section is ${h.toFixed(1)} m NAVD88. Ground rises ${(height(x, z - 50) - h).toFixed(1)} m to the north and ${(height(x, z + 50) - h).toFixed(1)} m to the south.`;
    if (stop === 'connector') reading.textContent = `The freeway floor is ${h.toFixed(1)} m NAVD88. The east bank reaches ${height(820, z).toFixed(1)} m. Rail deck height requires a separate profile.`;
    const url = new URL(location.href);
    url.searchParams.set('at', stop);
    history.replaceState(null, '', url);
    orbit.update();
    draw();
  }
  function resize() {
    canvas.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    draw();
  }
  addEventListener('resize', resize);
  orbit.addEventListener('change', draw);
  sceneryToggle.onchange = () => { scenery.visible = sceneryToggle.checked; draw(); };
  for (const b of controlsPanel.querySelectorAll('button')) b.onclick = () => focus(b.dataset.view as Stop);
  controlsPanel.disabled = false;
  resize();
  const stop = new URLSearchParams(location.search).get('at');
  focus(stop === 'cut' || stop === 'connector' ? stop : 'downtown');
}
main().catch(e => { controlsPanel.disabled = true; reading.textContent = `Terrain preview unavailable. ${e.message}. Check the City assets from pnpm data:city.`; });
