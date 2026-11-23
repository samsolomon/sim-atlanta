import * as THREE from 'three';

/**
 * Ground-contact audit: where does the drawn terrain poke up through a surface
 * that is meant to lie on it (a stair tread, a road deck, a mulch bed)?
 *
 * Every upward-facing triangle within `near` metres of the terrain is sampled on
 * a lattice no coarser than `step` metres and compared with the terrain's own
 * drawn triangles (not the bilinear DEM). A sample penetrates when the terrain
 * is more than `tolerance` above the surface and less than `buried` above it;
 * deeper samples belong to surfaces sunk on purpose (cuts, tunnels, footings).
 */
export interface AuditBoard {
  id: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Scene y on the drawn terrain triangle, or null in a void. */
  terrainAt(x: number, z: number): number | null;
  /** Terrain meshes that are not themselves audited. */
  terrain: THREE.Object3D[];
}

export interface AuditOptions {
  step?: number;
  tolerance?: number;
  near?: number;
  buried?: number;
  /** Layer for a mesh, from its own and its ancestors' names. Null skips the mesh. */
  layer?: (path: string[], mesh: THREE.Mesh) => string | null;
  /** Vertex-colour names that split one merged mesh into layers, such as tread or mulch. */
  colors?: Record<string, string>;
}

export interface Penetration { layer: string; board: string; x: number; y: number; z: number; depth: number; path: string }
export interface LayerResult {
  layer: string;
  board: string;
  triangles: number;
  samples: number;
  penetrating: number;
  /** Distinct 4 m cells with at least one penetrating sample. */
  sites: number;
  /** Penetrating samples by depth: 3–10 cm, 10–30 cm, 30–100 cm, over 1 m. */
  histogram: [number, number, number, number];
  /** Samples within ±tolerance of the terrain on a material without polygonOffset: z-fight risk. */
  coplanar: number;
  worst: Penetration | null;
}

const DEFAULT_SKIP = /^(sky|plinth|joining edge|rain|snow|traffic|trains?|cars?|buses|figures|freight cars)/i;

export function defaultLayer(path: string[], mesh?: THREE.Mesh): string | null {
  const names = path.filter(Boolean);
  if (names.some(n => DEFAULT_SKIP.test(n))) return null;
  if (names.length) return names.at(-1)!;
  if (!mesh) return 'unnamed';
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshLambertMaterial;
  return `unnamed ${mat.type}${mat.map ? '+map' : ''}${mat.vertexColors ? '+vc' : ''} [${Object.keys(mesh.geometry.attributes).join(',')}]`;
}

/** City's ground-hugging layers. Landmark and building meshes are reported as context only. */
export const CITY_COLORS: Record<string, string> = {
  asphalt: '#5d5f66', highway: '#54565d', sidewalk: '#d9d3c7', path: '#e6e2d6', marking: '#eeeae0', centreline: '#e6c04a',
  ballast: '#7f746a', tread: '#bdb7ab', stone: '#a29c90', curb: '#b6b0a4', mulch: '#5b4535', terrace: '#8aa266',
};
export function cityLayer(path: string[], mesh: THREE.Mesh): string | null {
  const names = path.filter(Boolean);
  if (names.some(n => DEFAULT_SKIP.test(n))) return null;
  if (mesh.geometry.hasAttribute('aStyle')) return 'building · generic';
  if (names.includes('bridge approaches')) return 'bridge approaches';
  if (names.includes('landscape')) return 'landscape primitives';
  if (names.includes('ground-cover')) return 'ground cover';
  const curated = names.find(n => n.startsWith('curated:'));
  if (curated) return 'curated landscape';
  if (names.includes('Decks and embedded rails')) return 'streets';
  if (names.includes('Freight track')) return 'rail ballast';
  const own = defaultLayer(path, mesh);
  return own && !own.startsWith('unnamed') ? 'landmark · ' + own : own;
}

export function groundAudit(root: THREE.Object3D, boards: AuditBoard[], o: AuditOptions = {}) {
  const step = o.step ?? 0.5, tol = o.tolerance ?? 0.03, near = o.near ?? 1.2, buried = o.buried ?? 2.5;
  const layerOf = o.layer ?? defaultLayer;
  const palette = Object.entries(o.colors ?? {}).map(([name, hex]) => [name, new THREE.Color(hex)] as const);
  const tint = new THREE.Color();
  const colorName = (col: THREE.BufferAttribute | undefined, i: number) => {
    if (!col || !palette.length) return null;
    tint.fromBufferAttribute(col, i);
    let best: string | null = null, err = 0.02;
    for (const [name, c] of palette) {
      const d = Math.abs(c.r - tint.r) + Math.abs(c.g - tint.g) + Math.abs(c.b - tint.b);
      if (d < err) { err = d; best = name; }
    }
    return best;
  };
  const skip = new Set<THREE.Object3D>(boards.flatMap(b => b.terrain));
  const boardAt = (x: number, z: number) => boards.find(b => x >= b.bounds.minX && x <= b.bounds.maxX && z >= b.bounds.minZ && z <= b.bounds.maxZ);
  const terrainAt = (x: number, z: number): [AuditBoard, number] | null => {
    const b = boardAt(x, z);
    if (!b) return null;
    const y = b.terrainAt(x, z);
    return y === null ? null : [b, y];
  };
  const results = new Map<string, LayerResult & { cells: Set<string> }>();
  const all: Penetration[] = [];
  root.updateMatrixWorld(true);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const visit = (obj: THREE.Object3D, path: string[]) => {
    if (!obj.visible) return;
    const here = [...path, obj.name];
    if (!skip.has(obj) && obj instanceof THREE.Mesh && !(obj instanceof THREE.InstancedMesh) && obj.geometry?.getAttribute('position')) {
      const layer = layerOf(here, obj);
      if (layer) scan(obj, layer, here.filter(Boolean).join(' / '));
    }
    for (const child of obj.children) visit(child, here);
  };
  const scan = (mesh: THREE.Mesh, layer: string, path: string) => {
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const index = mesh.geometry.index;
    const count = index ? index.count : pos.count;
    const m = mesh.matrixWorld;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (materials.every(mat => !mat.visible || (mat.transparent && mat.opacity === 0) || mat.colorWrite === false)) return;
    const doubleSided = materials.some(mat => mat.side === THREE.DoubleSide);
    const offset = materials.every(mat => mat.polygonOffset && mat.polygonOffsetFactor + mat.polygonOffsetUnits < 0);
    const col = mesh.geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
    const base = layer;
    for (let i = 0; i + 2 < count; i += 3) {
      const ia = index ? index.getX(i) : i, ib = index ? index.getX(i + 1) : i + 1, ic = index ? index.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, ia).applyMatrix4(m);
      b.fromBufferAttribute(pos, ib).applyMatrix4(m);
      c.fromBufferAttribute(pos, ic).applyMatrix4(m);
      e1.subVectors(b, a); e2.subVectors(c, a);
      const n = e1.clone().cross(e2);
      const len = n.length();
      if (len < 1e-9) continue;
      const ny = n.y / len;
      // Upward faces, and downward-wound faces of double-sided sheets that are seen from
      // above. A downward face counts only in a named top-surface colour: the undersides
      // of slabs and decks are buried on purpose.
      const down = doubleSided && ny < -0.5;
      if (!(ny > 0.5 || down)) continue;
      if (down && (!palette.length || !colorName(col, ia))) continue;
      // Ground-hugging: some vertex lies within `near` of the terrain below it.
      let hug = false;
      for (const v of [a, b, c]) {
        const t = terrainAt(v.x, v.z);
        if (t && Math.abs(v.y - t[1]) < near) { hug = true; break; }
      }
      if (!hug) continue;
      const named = colorName(col, ia);
      layer = named ? base + ':' + named : base;
      const span = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
      const k = Math.max(1, Math.ceil(span / step));
      // Samples sit up to 2 cm in from the edges: where a surface meets higher ground at its
      // edge (a tread meeting its landing), the edge itself is a junction, not a penetration.
      const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3;
      const inset = Math.min(0.25, 0.02 / Math.max(1e-6, span));
      for (let p = 0; p <= k; p++) for (let q = 0; q <= k - p; q++) {
        const u = p / k, v = q / k, w = 1 - u - v;
        const x = (w * a.x + u * b.x + v * c.x) * (1 - inset) + cx * inset;
        const y = (w * a.y + u * b.y + v * c.y) * (1 - inset) + cy * inset;
        const z = (w * a.z + u * b.z + v * c.z) * (1 - inset) + cz * inset;
        const t = terrainAt(x, z);
        if (!t) continue;
        const [board, ty] = t;
        const key = layer + '\u0000' + board.id;
        let r = results.get(key);
        if (!r) results.set(key, r = { layer, board: board.id, triangles: 0, samples: 0, penetrating: 0, sites: 0, histogram: [0, 0, 0, 0], coplanar: 0, worst: null, cells: new Set() });
        if (p === 0 && q === 0) r.triangles++;
        r.samples++;
        const depth = ty - y;
        if (!offset && Math.abs(depth) <= tol) r.coplanar++;
        if (depth > tol && depth < buried) {
          r.penetrating++;
          r.histogram[depth < .1 ? 0 : depth < .3 ? 1 : depth < 1 ? 2 : 3]++;
          r.cells.add(Math.floor(x / 4) + ',' + Math.floor(z / 4));
          const hit = { layer, board: board.id, x, y, z, depth, path };
          if (!r.worst || depth > r.worst.depth) r.worst = hit;
          all.push(hit);
        }
      }
    }
  };
  visit(root, []);
  const layers = [...results.values()].map(({ cells, ...r }) => ({ ...r, sites: cells.size }))
    .sort((p, q) => (q.worst?.depth ?? 0) - (p.worst?.depth ?? 0) || q.penetrating - p.penetrating);
  // Worst sites: one per 8 m cell, deepest first.
  const seen = new Set<string>();
  const worst = all.sort((p, q) => q.depth - p.depth).filter(h => {
    const cell = Math.floor(h.x / 8) + ',' + Math.floor(h.z / 8);
    if (seen.has(cell)) return false;
    seen.add(cell);
    return true;
  }).slice(0, 400);
  return { layers, worst, penetrating: all.length };
}

/** A close, oblique City camera that frames a penetration. */
export function auditCamera(h: Pick<Penetration, 'x' | 'z'>, distance = 40) {
  return `/?view=city&cam=${h.x.toFixed(0)},${h.z.toFixed(0)},30,55,${distance}`;
}
