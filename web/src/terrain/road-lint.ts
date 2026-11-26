import * as THREE from 'three';
import { ribbons, type Ribbon, type Section } from './connector-corridor';

/**
 * Road-kit lint (docs/road-kit.md): counts the violations of the road primitives in the
 * assembled City, per board, so `pnpm lint:roads` can hold each count to a ratchet
 * (road-kit-budget.json) that only goes down.
 *
 * Geometry is read from the drawn meshes, not from the data that made them: every
 * upward-facing tread triangle of a structure mesh is rasterised onto a 1 m grid, together
 * with parapet faces and the board's own drawn terrain. Positions are read directly, so a
 * mesh in its far form (far-form.ts, a shortened draw range) is measured in full.
 *
 * Paint is read from what connector-paint actually filled on each board (paintedStrips), and
 * lane counts from the Connector ribbons.
 */
export interface LintBoard {
  id: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Scene y on the drawn terrain, or null in a void. */
  terrainAt(x: number, z: number): number | null;
  /** Terrain meshes, never counted as tread. */
  terrain: THREE.Object3D[];
}

/** Tread colours by kind, as Builder writes them (vignette/world PAL and ground-audit CITY_COLORS). */
export const TREAD_COLORS = { road: ['#54565d', '#5d5f66'], walk: ['#d9d3c7', '#e6e2d6'] } as const;
/** Parapet and fascia concrete (PAL.concrete). */
export const PARAPET_COLOR = '#c9c4b9';

/** Meshes that carry raised road or walk treads. Anything else (landmarks, buildings) is skipped. */
export const STRUCTURE = /Decks and embedded rails|bridge approaches|17th Street Bridge|ramp tread|concrete tread/i;

export interface RoadLintOptions {
  /** Grid cell in metres. */
  cell?: number;
  /** Which meshes are road structures, from their path of names. */
  structure?: (path: string) => boolean;
  /** Surveyed overlays drawn on purpose (docs/road-kit.md, overlap rule), by plan point. */
  allowStacked?: (x: number, z: number) => boolean;
  /** Connector strips painted per board, from connector-paint. */
  painted?: ReadonlyMap<string, readonly { r: Ribbon; rows: Section[] }[]>;
  /** Joints ("x,z" of the shared node) that have a generated gore. */
  gores?: ReadonlySet<string>;
}

/** A site: a connected group of flagged cells, with its centre and size. */
export interface Site { x: number; z: number; cells: number; y: number }
export interface BoardCounts {
  /** Coverage floors: a drop means a mesh was renamed or recoloured and the lint went blind. */
  treadM2: number;
  elevatedM2: number;
  /** Two road treads at one point less than 0.30 m apart (overlap rule). */
  stackedRoadM2: number;
  stackedRoadSites: number;
  /** A walk tread within 0.30 m of a road or another walk. */
  stackedWalkM2: number;
  stackedWalkSites: number;
  /** Elevated edges, in metres of 1 m cell edge. */
  edgeM: number;
  walledM: number;
  /** Drops 0.3–1.5 m to another tread. */
  stepM: number;
  stepSites: number;
  /** Drops with no wall and nothing within 1.5 m below. */
  openM: number;
  openSites: number;
  /** At grade: ground ribbons painted over each other beyond 3 m of a shared node. */
  paintOverlapM2: number;
  paintOverlapPairs: number;
  /** Connector joints where one way continues with a different lane count (no taper yet). */
  abruptLaneSteps: number;
  /** Merges and diverges whose lane counts do not balance. */
  unbalancedJoints: number;
  /** Merges and diverges with no generated gore. */
  goresMissing: number;
}
export interface RoadLintResult {
  boards: Record<string, BoardCounts>;
  /** Largest sites per metric, for stills and review links. */
  sites: Record<string, (Site & { board: string })[]>;
  /** Tread m² per structure mesh path, so a reviewer can see what was measured. */
  meshes: Record<string, number>;
}

type Kind = 0 | 1; // road, walk
const OFF = 20000, SPAN = 100000;
const key = (i: number, j: number) => (i + OFF) * SPAN + (j + OFF);
const unkey = (k: number): [number, number] => { const a = Math.floor(k / SPAN); return [a - OFF, k - a * SPAN - OFF]; };

/** Integer cells (i, j) whose centre (i·c, j·c) lies inside the triangle, with the interpolated y.
 * Strict leaves out centres on an edge, so two polygons that only abut never share a cell. */
function raster(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, cell: number, fn: (i: number, j: number, y: number) => void, strict = false) {
  const eps = strict ? 1e-6 : -1e-6;
  const d = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
  if (Math.abs(d) < 1e-9) return;
  const minX = Math.min(a.x, b.x, c.x), maxX = Math.max(a.x, b.x, c.x), minZ = Math.min(a.z, b.z, c.z), maxZ = Math.max(a.z, b.z, c.z);
  for (let i = Math.ceil(minX / cell); i * cell <= maxX; i++)
    for (let j = Math.ceil(minZ / cell); j * cell <= maxZ; j++) {
      const x = i * cell, z = j * cell;
      const l1 = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / d;
      const l2 = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < eps || l2 < eps || l3 < eps) continue;
      fn(i, j, l1 * a.y + l2 * b.y + l3 * c.y);
    }
}

/** Connected groups (8-neighbour) of flagged cells; only groups of at least `min` cells are sites. */
export function sitesOf(cells: Map<number, number>, cell: number, min = 3): Site[] {
  const seen = new Set<number>(), out: Site[] = [];
  for (const start of cells.keys()) {
    if (seen.has(start)) continue;
    seen.add(start);
    const stack = [start];
    let n = 0, sx = 0, sz = 0, y = -Infinity;
    while (stack.length) {
      const k = stack.pop()!;
      const [i, j] = unkey(k);
      n++; sx += i; sz += j; y = Math.max(y, cells.get(k)!);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const q = key(i + di, j + dj);
        if (!seen.has(q) && cells.has(q)) { seen.add(q); stack.push(q); }
      }
    }
    if (n >= min) out.push({ x: +(sx / n * cell).toFixed(1), z: +(sz / n * cell).toFixed(1), cells: n, y: +y.toFixed(2) });
  }
  return out.sort((p, q) => q.cells - p.cells);
}

const empty = (): BoardCounts => ({ treadM2: 0, elevatedM2: 0, stackedRoadM2: 0, stackedRoadSites: 0, stackedWalkM2: 0, stackedWalkSites: 0,
  edgeM: 0, walledM: 0, stepM: 0, stepSites: 0, openM: 0, openSites: 0, paintOverlapM2: 0, paintOverlapPairs: 0,
  abruptLaneSteps: 0, unbalancedJoints: 0, goresMissing: 0 });

export function roadLint(root: THREE.Object3D, boards: LintBoard[], o: RoadLintOptions = {}): RoadLintResult {
  const cell = o.cell ?? 1, area = cell * cell;
  const structure = o.structure ?? ((p: string) => STRUCTURE.test(p));
  const boardAt = (x: number, z: number) => boards.find(b => x >= b.bounds.minX && x < b.bounds.maxX && z >= b.bounds.minZ && z < b.bounds.maxZ);
  const tint = new THREE.Color();
  const palette = (hexes: readonly string[]) => hexes.map(h => new THREE.Color(h));
  const roadC = palette(TREAD_COLORS.road), walkC = palette(TREAD_COLORS.walk), parapetC = new THREE.Color(PARAPET_COLOR);
  const near = (c: THREE.Color) => Math.abs(c.r - tint.r) + Math.abs(c.g - tint.g) + Math.abs(c.b - tint.b) < 0.02;
  const skip = new Set<THREE.Object3D>(boards.flatMap(b => b.terrain));

  // Per cell: tread heights with their kind, and the highest parapet top.
  const treads = new Map<number, { y: number; kind: Kind }[]>();
  const walls = new Map<number, number>();
  const meshes: Record<string, number> = {};
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  root.updateMatrixWorld(true);
  const visit = (obj: THREE.Object3D, path: string[]) => {
    if (!obj.visible || skip.has(obj)) return;
    const here = obj.name ? [...path, obj.name] : path;
    const joined = here.join(' / ');
    if (obj instanceof THREE.Mesh && !(obj instanceof THREE.InstancedMesh) && structure(joined)) scan(obj, joined);
    for (const child of obj.children) visit(child, here);
  };
  const scan = (mesh: THREE.Mesh, path: string) => {
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!pos) return;
    const col = mesh.geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
    const index = mesh.geometry.index, count = index ? index.count : pos.count, m = mesh.matrixWorld;
    const buried = mesh.userData.groundAuditBuriedFaces as Set<number> | undefined;
    // Bridge approaches are uncoloured board-street ramps: every upward face is road.
    const approach = /bridge approaches/.test(path);
    for (let t = 0; t + 2 < count; t += 3) {
      if (buried?.has(t)) continue;
      const ia = index ? index.getX(t) : t, ib = index ? index.getX(t + 1) : t + 1, ic = index ? index.getX(t + 2) : t + 2;
      a.fromBufferAttribute(pos, ia).applyMatrix4(m); b.fromBufferAttribute(pos, ib).applyMatrix4(m); c.fromBufferAttribute(pos, ic).applyMatrix4(m);
      let kind: Kind | null = approach ? 0 : null;
      if (col) {
        tint.fromBufferAttribute(col, ia);
        if (near(parapetC)) {
          const top = Math.max(a.y, b.y, c.y);
          const minX = Math.min(a.x, b.x, c.x), maxX = Math.max(a.x, b.x, c.x), minZ = Math.min(a.z, b.z, c.z), maxZ = Math.max(a.z, b.z, c.z);
          for (let i = Math.floor(minX / cell); i * cell <= maxX + cell; i++)
            for (let j = Math.floor(minZ / cell); j * cell <= maxZ + cell; j++) {
              const k = key(i, j);
              walls.set(k, Math.max(walls.get(k) ?? -Infinity, top));
            }
          continue;
        }
        if (roadC.some(near)) kind = 0;
        else if (walkC.some(near)) kind = 1;
      }
      if (kind === null) continue;
      e1.subVectors(b, a); e2.subVectors(c, a);
      const nx = e1.y * e2.z - e1.z * e2.y, ny = e1.z * e2.x - e1.x * e2.z, nz = e1.x * e2.y - e1.y * e2.x;
      const len = Math.hypot(nx, ny, nz);
      if (!len || Math.abs(ny) / len < 0.7) continue;
      let hits = 0;
      raster(a, b, c, cell, (i, j, y) => {
        const k = key(i, j);
        let list = treads.get(k);
        if (!list) treads.set(k, list = []);
        // Adjacent triangles of one surface share edges: one height per surface per cell.
        if (!list.some(q => Math.abs(q.y - y) < 0.002)) { list.push({ y, kind: kind! }); hits++; }
      });
      if (hits) meshes[path] = (meshes[path] ?? 0) + hits * area;
    }
  };
  visit(root, []);

  const out: Record<string, BoardCounts> = Object.fromEntries(boards.map(bd => [bd.id, empty()]));
  const flagged: Record<string, Record<string, Map<number, number>>> = {};
  const flag = (metric: string, board: string, k: number, y: number) => {
    const m = (flagged[metric] ??= {})[board] ??= new Map();
    m.set(k, Math.max(m.get(k) ?? -Infinity, y));
  };
  const terrain = new Map<number, number | null>();
  const ground = (k: number) => {
    if (!terrain.has(k)) {
      const [i, j] = unkey(k), x = i * cell, z = j * cell;
      terrain.set(k, boardAt(x, z)?.terrainAt(x, z) ?? null);
    }
    return terrain.get(k)!;
  };
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [k, list] of treads) {
    const [i, j] = unkey(k), x = i * cell, z = j * cell;
    const bd = boardAt(x, z);
    if (!bd) continue;
    const s = out[bd.id];
    s.treadM2 += area;
    const sorted = [...list].sort((p, q) => q.y - p.y);
    // Overlap: the first pair of surfaces less than 0.30 m apart.
    for (let q = 1; q < sorted.length; q++) {
      const d = sorted[q - 1].y - sorted[q].y;
      if (d >= 0.30) continue;
      if (o.allowStacked?.(x, z)) break;
      const road = sorted[q - 1].kind === 0 && sorted[q].kind === 0;
      if (road) { s.stackedRoadM2 += area; flag('stackedRoad', bd.id, k, sorted[q - 1].y); }
      else { s.stackedWalkM2 += area; flag('stackedWalk', bd.id, k, sorted[q - 1].y); }
      break;
    }
    const top = sorted[0].y, g = ground(k);
    if (g === null || top - g < 1.5) continue;
    s.elevatedM2 += area;
    for (const [di, dj] of NB) {
      const kn = key(i + di, j + dj);
      const other = treads.get(kn);
      if (other?.some(q => Math.abs(q.y - top) < 0.3)) continue;
      s.edgeM += cell;
      if (Math.max(walls.get(k) ?? -Infinity, walls.get(kn) ?? -Infinity) > top + 0.3) { s.walledM += cell; continue; }
      const gn = ground(kn);
      if (gn !== null && Math.abs(gn - top) < 0.5) continue; // lands on the terrain
      if (other?.some(q => q.y < top - 0.3 && q.y > top - 1.5)) { s.stepM += cell; flag('step', bd.id, k, top); continue; }
      s.openM += cell;
      flag('open', bd.id, k, top);
    }
  }

  // At grade: what connector-paint filled on each board, rasterised the same way.
  for (const [boardId, strips] of o.painted ?? []) {
    const s = out[boardId];
    if (!s) continue;
    const bd = boards.find(q => q.id === boardId)!;
    const owner = new Map<number, number[]>();
    strips.forEach(({ rows }, n) => {
      for (let q = 1; q < rows.length; q++) {
        const ring = [rows[q - 1].inner, rows[q].inner, rows[q].outer, rows[q - 1].outer];
        for (const [p0, p1, p2] of [[ring[0], ring[1], ring[2]], [ring[0], ring[2], ring[3]]]) {
          a.set(p0[0], 0, p0[1]); b.set(p1[0], 0, p1[1]); c.set(p2[0], 0, p2[1]);
          raster(a, b, c, cell, (i, j) => {
            const x = i * cell, z = j * cell;
            if (x < bd.bounds.minX || x >= bd.bounds.maxX || z < bd.bounds.minZ || z >= bd.bounds.maxZ) return;
            const k = key(i, j);
            const list = owner.get(k) ?? [];
            if (!list.includes(n)) list.push(n);
            owner.set(k, list);
          }, true);
        }
      }
    });
    const pairs = new Set<string>();
    for (const [k, list] of owner) {
      if (list.length < 2) continue;
      const [i, j] = unkey(k), x = i * cell, z = j * cell;
      let counted = false;
      for (let p = 0; p < list.length && !counted; p++) for (let q = p + 1; q < list.length && !counted; q++) {
        const ra = strips[list[p]].r, rb = strips[list[q]].r;
        if (ra === rb) continue;
        // A shared node is a joint: ribbons legitimately meet within 3 m of it.
        const ends = [ra.pts[0], ra.pts.at(-1)!].filter(e => [rb.pts[0], rb.pts.at(-1)!].some(f => f[0] === e[0] && f[1] === e[1]));
        if (ends.some(e => Math.hypot(e[0] - x, e[1] - z) < 3)) continue;
        counted = true;
        pairs.add([ra.key, rb.key].sort().join(' '));
      }
      if (counted) { s.paintOverlapM2 += area; flag('paintOverlap', boardId, k, 0); }
    }
    s.paintOverlapPairs = pairs.size;
  }

  // Lane counts at Connector joints (shared ribbon end nodes), assigned to the board they lie on.
  const joints = new Map<string, { at: [number, number]; incoming: Ribbon[]; outgoing: Ribbon[] }>();
  for (const r of ribbons) {
    if (r.kind === 'tunnel') continue;
    for (const [p, incoming] of [[r.pts.at(-1)!, true], [r.pts[0], false]] as const) {
      const id = p.join(',');
      const jt = joints.get(id) ?? { at: [p[0], p[1]] as [number, number], incoming: [], outgoing: [] };
      (incoming ? jt.incoming : jt.outgoing).push(r);
      joints.set(id, jt);
    }
  }
  for (const [id, jt] of joints) {
    if (!jt.incoming.length || !jt.outgoing.length) continue;
    const bd = boardAt(...jt.at);
    if (!bd) continue;
    const s = out[bd.id];
    const lanesIn = jt.incoming.reduce((n, r) => n + r.lanes, 0), lanesOut = jt.outgoing.reduce((n, r) => n + r.lanes, 0);
    if (jt.incoming.length === 1 && jt.outgoing.length === 1) { if (lanesIn !== lanesOut) s.abruptLaneSteps++; continue; }
    if (lanesIn !== lanesOut) s.unbalancedJoints++;
    if (!o.gores?.has(id)) s.goresMissing++;
  }

  const sites: RoadLintResult['sites'] = {};
  for (const [metric, byBoard] of Object.entries(flagged)) {
    const all: (Site & { board: string })[] = [];
    for (const [board, cells] of Object.entries(byBoard)) {
      const found = sitesOf(cells, cell);
      const s = out[board];
      if (metric === 'stackedRoad') s.stackedRoadSites = found.length;
      if (metric === 'stackedWalk') s.stackedWalkSites = found.length;
      if (metric === 'step') s.stepSites = found.length;
      if (metric === 'open') s.openSites = found.length;
      all.push(...found.map(f => ({ ...f, board })));
    }
    sites[metric] = all.sort((p, q) => q.cells - p.cells).slice(0, 40);
  }
  for (const s of Object.values(out)) for (const k of Object.keys(s) as (keyof BoardCounts)[]) s[k] = Math.round(s[k]);
  return { boards: out, sites, meshes };
}
