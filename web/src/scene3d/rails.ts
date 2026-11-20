/**
 * Transit track drawn from the same GTFS paths the trains run on, lifted by each path's
 * elevation profile. Underground stretches go into a ghosted "cutaway" mesh that draws
 * through the ground so you can watch trains under the streets.
 */
import * as THREE from 'three';
import type { RoutesFile } from '../model/types';
import { elevationAt, type Profile, type SceneManifest } from './scene-data';

export const UNDERGROUND = -2; // metres; below this a train/track is drawn in the cutaway pass

interface Ribbon {
  pos: number[];
  idx: number[];
  col: number[];
}

/** Tunnel tint by depth: shallow tunnels light, the deepest (−22 m) dark, so stacked levels read. */
export function depthTint(y: number, out: THREE.Color): THREE.Color {
  const t = THREE.MathUtils.clamp((-y - 6) / 12, 0, 1); // −10 m ≈ 0.33, −16 m ≈ 0.83
  return out.setRGB(0.62 - 0.42 * t, 0.7 - 0.42 * t, 0.86 - 0.36 * t);
}
const tmp = new THREE.Color();

function pushRibbon(r: Ribbon, pts: [number, number, number][], width: number) {
  if (pts.length < 2) return;
  const base = r.pos.length / 3;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * (width / 2);
    const nz = (dx / len) * (width / 2);
    const p = pts[i];
    r.pos.push(p[0] + nx, p[1], p[2] + nz, p[0] - nx, p[1], p[2] - nz);
    depthTint(p[1], tmp);
    r.col.push(tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b);
    if (i > 0) {
      const l0 = base + (i - 1) * 2;
      r.idx.push(l0, l0 + 1, l0 + 3, l0, l0 + 3, l0 + 2);
    }
  }
}

function toMesh(r: Ribbon, mat: THREE.Material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(r.pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(r.col, 3));
  g.setIndex(r.idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

export function buildRails(
  rf: RoutesFile,
  manifest: SceneManifest,
  project: (lon: number, lat: number) => [number, number],
): THREE.Group {
  const group = new THREE.Group();
  const routes = new Map(rf.routes.map((r) => [r.id, r]));
  const b = manifest.bounds;
  const pad = 60;
  const inBounds = (x: number, z: number) => x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad;

  const surface: Ribbon = { pos: [], idx: [], col: [] };
  const under: Ribbon = { pos: [], idx: [], col: [] };
  const pillars: [number, number, number][] = [];

  for (const path of rf.paths) {
    const route = routes.get(path.routeId);
    if (!route || (route.mode !== 'heavy_rail' && route.mode !== 'streetcar')) continue;
    const prof: Profile | undefined = manifest.profiles[path.id];
    // Resample every 5 m so elevation ramps are smooth.
    let run: [number, number, number][] = [];
    let runUnder = false;
    const flush = () => {
      if (run.length > 1) pushRibbon(runUnder ? under : surface, run, route.mode === 'streetcar' ? 3 : 6);
      run = [];
    };
    const total = path.cum[path.cum.length - 1];
    let j = 0;
    let lastPillar = -Infinity;
    for (let s = 0; s <= total; s += 5) {
      while (j < path.cum.length - 2 && path.cum[j + 1] < s) j++;
      const seg = path.cum[j + 1] - path.cum[j] || 1;
      const f = Math.min(1, Math.max(0, (s - path.cum[j]) / seg));
      const lon = path.coords[2 * j] + f * (path.coords[2 * j + 2] - path.coords[2 * j]);
      const lat = path.coords[2 * j + 1] + f * (path.coords[2 * j + 3] - path.coords[2 * j + 1]);
      const [x, z] = project(lon, lat);
      if (!inBounds(x, z)) {
        flush();
        continue;
      }
      const y = elevationAt(prof, s) + 0.3;
      const isUnder = y < UNDERGROUND;
      if (run.length && isUnder !== runUnder) {
        const last = run[run.length - 1];
        flush();
        run.push(last); // keep the ribbon continuous across the portal
      }
      runUnder = isUnder;
      run.push([x, y, z]);
      if (y > 3 && s - lastPillar > 30) {
        pillars.push([x, y, z]);
        lastPillar = s;
      }
    }
    flush();
  }

  // Double-sided: ribbon winding depends on travel direction, and paths run both ways.
  const trackMat = new THREE.MeshLambertMaterial({ color: 0x3d434d, side: THREE.DoubleSide });
  const surfaceMesh = toMesh(surface, trackMat);
  surfaceMesh.renderOrder = 2;
  group.add(surfaceMesh);

  // Cutaway: drawn after the city with no depth test, translucent, so it shows "through" the ground.
  const ghostMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  const underMesh = toMesh(under, ghostMat);
  underMesh.renderOrder = 10;
  group.add(underMesh);

  // Viaduct pillars: one instanced box per ~30 m of elevated track.
  if (pillars.length) {
    const geo = new THREE.BoxGeometry(1.6, 1, 1.6);
    geo.translate(0, 0.5, 0);
    const inst = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0x9ea3ab }), pillars.length);
    const m = new THREE.Matrix4();
    pillars.forEach(([x, y, z], i) => {
      m.makeScale(1, y, 1).setPosition(x, 0, z);
      inst.setMatrixAt(i, m);
    });
    inst.renderOrder = 2;
    group.add(inst);
  }
  return group;
}
