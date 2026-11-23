/**
 * Instanced trees for any mix of species and size classes. Draws per scene:
 * one limb mesh per (species, size class) present, one per leaf shape (clump, cone) present,
 * and one leaf carpet when a species drops one.
 */
import * as THREE from 'three';
import { Builder } from '../vignette/geom';
import { hash01, type Dims, type SizeClass, type Species, type TreeQuality } from './species';

export interface TreePlacement {
  species: Species;
  size: SizeClass;
  x: number;
  z: number;
  seed: number;
  /** Per-tree overrides, metres (measured or estimated); otherwise the class's nominal size, varied by the seed. */
  heightM?: number;
  spreadM?: number;
}

/** A placement's size: its overrides when given, else the class nominal ±8% by seed. */
export function treeDims(p: TreePlacement): Dims {
  const n = p.species.sizes[p.size];
  const k = 1 + (hash01(p.seed, 1) - 0.5) * 0.16;
  const heightM = p.heightM ?? n.heightM * k;
  const spreadM = p.spreadM ?? n.spreadM * (1 + (hash01(p.seed, 3) - 0.5) * 0.16);
  // The trunk is drawn as a fraction of the crown, so the calliper follows the spread.
  return { heightM, spreadM, calliperM: n.calliperM * (spreadM / n.spreadM) };
}

/**
 * Limbs of one species and size class, merged into one geometry in unit space. Each limb is
 * built round at the class's nominal size in metres and then scaled into unit space, so limbs
 * stay round once an instance scales by (crown radius, height, crown radius).
 */
export function skeletonGeometry(species: Species, size: SizeClass, q: TreeQuality) {
  const b = new Builder();
  const up = new THREE.Vector3(0, 1, 0);
  const d = species.sizes[size];
  const R = d.spreadM / 2, H = d.heightM;
  for (const sg of species.form(size, q, d).segs) {
    const dir = new THREE.Vector3((sg.b[0] - sg.a[0]) * R, (sg.b[1] - sg.a[1]) * H, (sg.b[2] - sg.a[2]) * R);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(sg.r1 * R, sg.r0 * R, len, sg.sides, 1, true).translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()));
    g.translate(sg.a[0] * R, sg.a[1] * H, sg.a[2] * R);
    g.scale(1 / R, 1 / H, 1 / R);
    b.addGeometry(g, sg.color);
    g.dispose();
  }
  return b.geometry();
}

export const leafGeometry = (kind: Species['leaf']) =>
  kind === 'cone' ? new THREE.ConeGeometry(1, 2, 6) : new THREE.OctahedronGeometry(1);
const carpetGeometry = () => new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2);
const tris = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.attributes.position.count) / 3;

/** Triangles for one tree of a species and size class at a quality tier, by part. */
export function treeTriangles(species: Species, size: SizeClass, q: TreeQuality) {
  const count = (g: THREE.BufferGeometry) => { const n = tris(g); g.dispose(); return n; };
  const parts = {
    skeleton: count(skeletonGeometry(species, size, q)),
    leaves: species.clumps[q] * count(leafGeometry(species.leaf)),
    carpet: species.carpet ? count(carpetGeometry()) : 0,
  };
  return { ...parts, total: parts.skeleton + parts.leaves + parts.carpet };
}

/** `groundAt` returns scene y under a point, or null off the board (the tree is skipped). */
export function createTrees(placements: TreePlacement[], quality: TreeQuality, groundAt: (x: number, z: number) => number | null) {
  const trees = placements.flatMap((p) => {
    const y = groundAt(p.x, p.z);
    return y === null ? [] : [{ ...p, y, dims: treeDims(p) }];
  });
  if (!trees.length) return null;
  const group = new THREE.Group();
  group.name = 'species trees';
  const barkMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const leafMat = new THREE.MeshLambertMaterial({ flatShading: true });
  const carpetMat = new THREE.MeshLambertMaterial({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const meshes: THREE.InstancedMesh[] = [];
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, count: number, name: string, shadow = true) => {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = name;
    // A handful of trees, often with every instance hidden at first render (a winter carpet):
    // three.js would cache that empty bounding sphere at the origin and cull them for good.
    mesh.frustumCulled = false;
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    meshes.push(mesh);
    group.add(mesh);
    return mesh;
  };

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  // Limbs: one batch per species and size class.
  const limbKey = (t: (typeof trees)[number]) => `${t.species.id}:${t.size}`;
  for (const key of new Set(trees.map(limbKey))) {
    const members = trees.filter(t => limbKey(t) === key);
    const mesh = add(skeletonGeometry(members[0].species, members[0].size, quality), barkMat, members.length, `${key} limbs`);
    members.forEach((t, i) => {
      q.setFromAxisAngle(up, hash01(t.seed, 4) * Math.PI * 2);
      const r = t.dims.spreadM / 2;
      mesh.setMatrixAt(i, m.compose(v.set(t.x, t.y, t.z), q, s.set(r, t.dims.heightM, r)));
    });
  }

  // Leaves: one batch per clump shape; each tree owns a run of slots.
  const leafSets = new Map<Species['leaf'], { mesh: THREE.InstancedMesh; start: Map<(typeof trees)[number], number> }>();
  for (const kind of new Set(trees.map(t => t.species.leaf))) {
    const members = trees.filter(t => t.species.leaf === kind);
    const start = new Map<(typeof trees)[number], number>();
    let n = 0;
    for (const t of members) { start.set(t, n); n += t.species.clumps[quality]; }
    const mesh = add(leafGeometry(kind), leafMat, n, `${kind} leaves`);
    for (let k = 0; k < n; k++) mesh.setColorAt(k, new THREE.Color('#79ab4f'));
    leafSets.set(kind, { mesh, start });
  }

  // Carpet: tilted to the local slope so it neither floats nor sinks on a hillside.
  const carpeted = trees.filter(t => t.species.carpet);
  const carpet = carpeted.length ? add(carpetGeometry(), carpetMat, carpeted.length, 'leaf carpet', false) : null;
  // The fallen-leaf carpet is ground dressing for the perf report, not tree crown.
  if (carpet) carpet.userData.perf = 'landscape';
  const tilts = carpeted.map(t => {
    const r = t.dims.spreadM / 2;
    const g = (x: number, z: number) => groundAt(x, z) ?? t.y;
    const normal = new THREE.Vector3(-(g(t.x + r, t.z) - g(t.x - r, t.z)) / (2 * r), 1, -(g(t.x, t.z + r) - g(t.x, t.z - r)) / (2 * r)).normalize();
    return new THREE.Quaternion().setFromUnitVectors(up, normal);
  });
  carpeted.forEach((_, i) => carpet!.setColorAt(i, new THREE.Color('#e6b83e')));

  const forms = new Map<string, ReturnType<Species['form']>>();
  const formOf = (t: (typeof trees)[number]) => {
    const key = limbKey(t);
    if (!forms.has(key)) forms.set(key, t.species.form(t.size, quality, t.species.sizes[t.size]));
    return forms.get(key)!;
  };
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const euler = new THREE.Euler();
  const tint = new THREE.Color();
  let shown = -1;
  function setSeason(doy: number) {
    if (doy === shown) return;
    shown = doy;
    for (const t of trees) {
      const set = leafSets.get(t.species.leaf)!;
      const k0 = set.start.get(t)!;
      const offset = (hash01(t.seed, 2) * 2 - 1) * t.species.offsetDays;
      const f = t.species.foliage(doy, offset);
      const pads = formOf(t).pads;
      const clumps = t.species.clumps[quality];
      const keep = Math.round(clumps * f.leaves);
      const spin = hash01(t.seed, 4) * Math.PI * 2;
      const cos = Math.cos(spin), sin = Math.sin(spin);
      const R = t.dims.spreadM / 2, H = t.dims.heightM;
      for (let j = 0; j < clumps; j++) {
        const k = k0 + j;
        if (j >= keep) { set.mesh.setMatrixAt(k, zero); continue; }
        const p = pads[j];
        const h = (salt: number) => hash01(t.seed * 31 + j, salt);
        const ux = p.x + (h(5) - 0.5) * 0.08, uz = p.z + (h(6) - 0.5) * 0.08;
        // Match the limbs' spin (three.js rotates +x toward −z about +y).
        const wx = ux * cos + uz * sin, wz = -ux * sin + uz * cos;
        if (t.species.leaf === 'cone') q.setFromEuler(euler.set((h(7) - 0.5) * 0.12, h(8) * 6.3, (h(9) - 0.5) * 0.12));
        else q.setFromEuler(euler.set(h(7) * 6.3, h(8) * 6.3, h(9) * 6.3));
        const half = t.species.leaf === 'cone' ? p.h * H : Math.max(p.h * H, p.w * R * 0.6);
        set.mesh.setMatrixAt(k, m.compose(v.set(t.x + wx * R, t.y + p.y * H, t.z + wz * R), q, s.set(p.w * R, half, p.w * R)));
        const bloom = f.bloom && h(10) < f.bloom.share;
        tint.copy(bloom ? f.bloom!.colour : f.colour).offsetHSL((h(11) - 0.5) * 0.02, 0, (p.y - 0.6) * 0.12 + (h(12) - 0.5) * 0.05);
        set.mesh.setColorAt(k, tint);
      }
    }
    carpeted.forEach((t, i) => {
      const f = t.species.foliage(doy, (hash01(t.seed, 2) * 2 - 1) * t.species.offsetDays);
      if (f.carpet <= 0) { carpet!.setMatrixAt(i, zero); return; }
      const r = t.dims.spreadM / 2 * 1.15 * (f.leaves > 0 ? 0.55 + 0.45 * f.carpet : 0.85 + 0.15 * f.carpet);
      carpet!.setMatrixAt(i, m.compose(v.set(t.x, t.y + 0.05, t.z), tilts[i], s.set(r, 1, r)));
      carpet!.setColorAt(i, f.carpetColour ?? tint.set('#a8915c'));
    });
    for (const mesh of meshes) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  setSeason(180);

  return {
    group,
    count: trees.length,
    draws: meshes.length,
    triangles: () => meshes.reduce((sum, mesh) => sum + tris(mesh.geometry) * mesh.count, 0),
    setSeason,
    /**
     * Level of detail, the same entry point as World.setDetail: `farTrees` hides the limbs
     * (crowns and carpet stay). Board areas call it through area.setDetail.
     */
    setDetail(d: { farTrees?: boolean }) {
      if (d.farTrees === undefined) return;
      for (const mesh of meshes) if (mesh.name.endsWith(' limbs')) mesh.visible = !d.farTrees;
    },
    setWet(f: number) {
      for (const mat of [barkMat, leafMat, carpetMat]) mat.color.setScalar(1 - 0.3 * f);
    },
    dispose() {
      group.removeFromParent();
      for (const mesh of meshes) { mesh.geometry.dispose(); mesh.dispose(); }
      for (const mat of [barkMat, leafMat, carpetMat]) mat.dispose();
    },
  };
}
