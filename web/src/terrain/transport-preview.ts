import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GroundGrid, type GroundManifest } from './grid';
import { createDowntownTerrain } from './model';
import { createSurfaceTransport } from './transport';
import type { TerrainCity } from './transport-data';

const path = '/data/scene/downtown/';
async function asset(name: string) {
  const r = await fetch(path + name);
  if (!r.ok) throw new Error(`${name} (${r.status})`);
  return r;
}

async function show() {
  const [m, bytes, city, canopy] = await Promise.all([
    asset('ground.json').then(r => r.json() as Promise<GroundManifest>),
    asset('ground.i16').then(r => r.arrayBuffer()),
    asset('vignette.json').then(r => r.json() as Promise<TerrainCity>),
    asset('trees.json').then(r => r.json()),
  ]);
  const grid = new GroundGrid(m, bytes);
  const area = createDowntownTerrain(grid, city, canopy.trees, { quality: 'low' });
  const transport = createSurfaceTransport(city, grid, area.groundAt);
  area.carve(transport.cutting);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e6e3d8');
  scene.add(area.group, transport.group, new THREE.HemisphereLight('#fff9ed', '#aab6a7', 1.65));
  const sun = new THREE.DirectionalLight('#fff4dd', 2);
  sun.position.set(-320, 600, 220);
  scene.add(sun);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -180, right: 180, top: 180, bottom: -180, near: 1, far: 1400 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = .18;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  document.body.append(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(37, 1, 0.5, 6500);
  const controls = new OrbitControls(camera, renderer.domElement);
  const at = new URLSearchParams(location.search).get('at');
  const tram = at === 'streetcar', edge = at === 'edge';
  const [x, z] = tram ? [630.87, -61.59] : edge ? [970, -794] : [766, 533];
  const y = area.groundAt(x, z) ?? 0;
  controls.target.set(x, y, z);
  sun.target.position.copy(controls.target);
  sun.position.set(x - 220, y + 280, z - 210);
  scene.add(sun.target);
  camera.position.set(x + (tram ? -49 : edge ? 42 : -75), y + (tram ? 38 : edge ? 34 : 67), z + (tram ? 3 : edge ? 64 : 132));
  controls.update();
  area.setSeason(320);

  renderer.info.autoReset = false;
  function render() { renderer.info.reset(); renderer.render(scene, camera); }
  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    render();
  }
  resize();
  const full = { ...renderer.info.render };
  transport.group.visible = false;
  render();
  const base = { ...renderer.info.render };
  transport.group.visible = true;
  render();
  document.getElementById('place')!.textContent = tram ? 'Atlanta Streetcar' : edge ? 'East board edge' : 'Downtown Connector';
  document.getElementById('status')!.textContent = `Transport · ${full.calls - base.calls} draws · ${(full.triangles - base.triangles).toLocaleString('en-US')} triangles`;
  controls.addEventListener('change', render);
  window.addEventListener('resize', resize);
}
show().catch(e => { document.getElementById('status')!.textContent = e.message; });
