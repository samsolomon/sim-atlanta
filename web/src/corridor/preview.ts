/**
 * Dev-only study of the King Memorial corridor (web/corridor.html), east of the downtown board.
 * It draws only measured data:
 * - the corridor ground strip, next to downtown's east edge, from their own manifests;
 * - the lidar guideway top along MARTA path 155177, drawn only where it was measured;
 * - the station canopy roof;
 * - the road and rail crossings, as posts from ground to guideway top.
 * See docs/king-memorial-corridor.md.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeProjector } from '../core/scene-data';
import { GroundGrid, type GroundManifest } from '../terrain/grid';

interface Bin { s: number; x: number; z: number; ground: number | null; top: number | null; roof: number | null; status: string }
interface Crossing { s: number; x: number; z: number; kind: string; name: string | null; guidewayTopNavd88M: number | null; groundNavd88M: number | null }
interface Corridor {
  guideway: Bin[]; crossings: Crossing[]; summary: Record<string, number>; cityProfileEndS: number;
  coverage: { path: string; boardEdgeS: number; nearestToStationS: number }[];
  station: { platforms: { osm: string; ring: [number, number][] }[] };
}

async function load(dir: string) {
  const get = async (name: string) => {
    const r = await fetch(`./data/scene/${dir}/${name}`);
    if (!r.ok) throw new Error(`${dir}/${name} (${r.status}); run pnpm data:corridor`);
    return r;
  };
  const [m, bin] = await Promise.all([get('ground.json').then(r => r.json() as Promise<GroundManifest>), get('ground.i16').then(r => r.arrayBuffer())]);
  return { grid: new GroundGrid(m, bin), bytes: bin.byteLength, get };
}

/** Ground mesh over [x0,x1]×[z0,z1] from a grid, in scene y (NAVD88 − zero). */
function groundMesh(grid: GroundGrid, x0: number, x1: number, z0: number, z1: number, zero: number, color: string) {
  const step = grid.manifest.stepM;
  const nx = Math.round((x1 - x0) / step) + 1, nz = Math.round((z1 - z0) / step) + 1;
  const pos: number[] = [], idx: number[] = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * step, z = z0 + j * step;
    pos.push(x, (grid.sample(x, z) ?? zero) - zero, z);
  }
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i;
    idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color }));
  mesh.receiveShadow = true;
  return mesh;
}

async function main() {
  const [down, strip] = await Promise.all([load('downtown'), load('king-memorial')]);
  const corridor: Corridor = await strip.get('corridor.json').then(r => r.json());
  const zero = down.grid.manifest.vertical.sceneZeroNavd88M;
  if (strip.grid.manifest.vertical.sceneZeroNavd88M !== zero) throw new Error('Strip and downtown disagree on scene zero');
  const y = (navd: number) => navd - zero;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  document.querySelector('#stage')!.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8e4d9');
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 6000);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.maxPolarAngle = Math.PI * 0.49;
  scene.add(new THREE.HemisphereLight('#fff9ec', '#9eacac', 1.6));
  const sun = new THREE.DirectionalLight('#fff1d7', 1.8);
  sun.position.set(-300, 500, 200);
  scene.add(sun);

  // Ground: downtown's last 400 m and the corridor strip, which share the x = 1000 column.
  const sb = strip.grid.manifest.bounds;
  scene.add(groundMesh(down.grid, 600, 1000, sb.minZ, sb.maxZ, zero, '#cfc6ae'));
  scene.add(groundMesh(strip.grid, sb.minX, sb.maxX, sb.minZ, sb.maxZ, zero, '#d9cfb3'));
  const seam = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: (sb.maxZ - sb.minZ) / 5 + 1 }, (_, i) => {
      const z = sb.minZ + i * 5;
      return new THREE.Vector3(1000, y(strip.grid.sample(1000, z)!) + 0.3, z);
    })), new THREE.LineBasicMaterial({ color: '#9a8f78' }));
  scene.add(seam);

  // Measured guideway top and canopy roof, as polylines broken wherever nothing was measured.
  const runs = (key: 'top' | 'roof') => {
    const out: THREE.Vector3[][] = [];
    let cur: THREE.Vector3[] = [];
    for (const b of corridor.guideway) {
      const v = b[key];
      if (v === null) { if (cur.length > 1) out.push(cur); cur = []; continue; }
      cur.push(new THREE.Vector3(b.x, y(v), b.z));
    }
    if (cur.length > 1) out.push(cur);
    return out;
  };
  for (const [key, color, radius] of [['top', '#1474c4', 1.1], ['roof', '#7a5bb5', 0.8]] as const) {
    for (const run of runs(key)) {
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(run), run.length * 2, radius, 6), new THREE.MeshLambertMaterial({ color }));
      scene.add(tube);
    }
  }
  // Unmeasured bins: a red mark on the ground, so a gap reads as unknown rather than absent.
  const unknownMat = new THREE.MeshBasicMaterial({ color: '#c0392b' });
  for (const b of corridor.guideway) {
    if (b.status !== 'gap' && b.status !== 'unresolved') continue;
    const g = strip.grid.sample(b.x, b.z) ?? down.grid.sample(b.x, b.z);
    if (g === null) continue;
    const m = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 4), unknownMat);
    m.position.set(b.x, y(g) + 0.2, b.z);
    scene.add(m);
  }
  // Crossings: a post from the ground to the measured guideway top (clearance itself is unknown).
  const postMat = new THREE.MeshBasicMaterial({ color: '#2a2722' });
  for (const c of corridor.crossings) {
    if (c.guidewayTopNavd88M === null || c.groundNavd88M === null || c.kind === 'footway') continue;
    const h = c.guidewayTopNavd88M - c.groundNavd88M;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, h, 6), postMat);
    post.position.set(c.x, y(c.groundNavd88M) + h / 2, c.z);
    scene.add(post);
  }
  // Platform plan only (OSM lines), drawn on the ground in grey dashes: their height is unknown.
  const project = makeProjector({ lon: -84.3916, lat: 33.7539 }); // ground.json horizontal origin (Five Points)
  for (const p of corridor.station.platforms) {
    const pts = p.ring.map(([lon, lat]) => {
      const [x, z] = project(lon, lat);
      return new THREE.Vector3(x, (strip.grid.sample(x, z) ?? zero) - zero + 0.05, z);
    });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: '#6b665c', dashSize: 3, gapSize: 2 }));
    line.computeLineDistances();
    scene.add(line);
  }

  const facts = document.querySelector('#facts')!;
  const ref = corridor.coverage[0];
  const row = (k: string, v: string) => facts.insertAdjacentHTML('beforeend', `<dt>${k}</dt><dd>${v}</dd>`);
  row('Board edge → station', `${Math.round(ref.nearestToStationS - ref.boardEdgeS)} m along path ${ref.path}`);
  row('City profile ends', `s ${corridor.cityProfileEndS} (station at s ${Math.round(ref.nearestToStationS)})`);
  row('Guideway measured', `${corridor.summary.measuredM} m`);
  row('Under canopy roof', `${corridor.summary.underRoofM} m (deck unknown)`);
  row('Not measured', `${corridor.summary.unknownM} m`);
  row('Strip ground', `${strip.bytes.toLocaleString()} B (${strip.grid.manifest.cols} × ${strip.grid.manifest.rows} nodes)`);

  type V3 = [number, number, number];
  const views: Record<string, { target: V3; eye: V3 }> = {
    Overview: { target: [1200, 0, 470], eye: [700, 420, 980] },
    Connector: { target: [760, -12, 540], eye: [700, 30, 690] },
    'King Memorial': { target: [1480, 0, 440], eye: [1380, 40, 560] },
    Crossover: { target: [1640, 0, 390], eye: [1560, 50, 520] },
  };
  const setView = (name: string) => {
    const v = views[name] ?? views.Overview;
    orbit.target.set(...v.target);
    camera.position.set(...v.eye);
    orbit.update();
    document.querySelectorAll('#views button').forEach(b => b.setAttribute('aria-pressed', String(b.textContent === name)));
  };
  for (const name of Object.keys(views)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.addEventListener('click', () => setView(name));
    document.querySelector('#views')!.append(b);
  }
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();
  setView(new URLSearchParams(location.search).get('view') || 'Overview');
  renderer.setAnimationLoop(() => { orbit.update(); renderer.render(scene, camera); });
  Object.assign(window, { __corridor: { setView, camera, orbit } });
}

main().catch(err => {
  document.querySelector('#facts')!.insertAdjacentHTML('beforeend', `<dt>Error</dt><dd>${String(err.message ?? err)}</dd>`);
});
