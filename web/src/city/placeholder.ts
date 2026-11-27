/**
 * The white placeholder (docs/white-placeholder.md; Sam, 2026-11-27): every area that isn't
 * loaded draws as the white study model, white masses with ink on one plain paper ground, so the
 * board never shows an empty square. When an area mounts, its placeholder dissolves into it, and
 * is then hidden. Unloading (later) shows it again.
 *
 * One mesh per area, one draw (plus its shadow). The masses are the area's own far form, baked
 * (city/placeholder.node.ts), so each stands where its coloured building lands, on the ground
 * the area draws. The look matches the opening's white model (city/white-model.ts): the same
 * paper white and albedo, the same ink, the same easing and length of fade.
 *
 * The dissolve draws no blending: the index is ordered so that shrinking its draw range removes
 * masses one at a time in a stable random order (then the ground, then the skirt), the stippled
 * dissolve phones need, at no shader cost. The material is plain Lambert, a program City already
 * compiles, pulled slightly toward the camera so its pixels win over the area arriving under it.
 * At night the ink pass draws lines cream inside the areas still white (vignette/ink.ts uMark).
 */
import * as THREE from 'three';
import { decodePlaceholder, type PlaceholderAreaData } from './placeholder-data';
import { bakeBytes } from '../terrain/ground-bake';
import { WHITE_ALBEDO, WHITE_FADE_MS, WHITE_MODEL, easeInOut } from './white-model';

export const placeholderFile = 'scene/placeholder/board.bin.gz';
/** The most areas the ink pass tests for cream night lines (vignette/ink.ts MARK_RECTS). */
export { MARK_RECTS } from '../vignette/ink';
/** Night: City's night blue (bgNight, tableNight), a little lifted (Sam, 2026-11-27). */
const NIGHT_COLOR = new THREE.Color('#47547c');
const NIGHT_EMISSIVE = new THREE.Color('#2b3554');
/** Share of the dissolve spent on the masses; the ground and skirt go in the rest. */
const MASS_SHARE = 0.65;

const params = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);
/** `?perf&placeholder=off`: no placeholder; `?perf&placeholder=flat`: shared vertices and a
 * flat-shaded material (half the memory, its own program). For A/B runs. */
const perfMode = (() => { const p = params.get('perf'); return p !== null && p !== '0' && p !== 'off' ? params.get('placeholder') : null; })();
export const placeholderOff = perfMode === 'off';
export const placeholderFlat = perfMode === 'flat';
/** Dev: `?placeholderfade=0.5` holds every dissolve at that progress, for stills;
 * `?placeholderfade=brookwood-south:0.5` holds only that area's. */
const pinnedFade = (() => {
  const v = import.meta.env.DEV ? params.get('placeholderfade') : null;
  if (!v) return null;
  const [id, p] = v.includes(':') ? v.split(':') : [null, v];
  return { id, p: Number(p) };
})();

export async function loadPlaceholder(dataRoot: string, signal?: AbortSignal): Promise<PlaceholderAreaData[] | null> {
  if (placeholderOff) return null;
  try {
    const r = await fetch(`${dataRoot}/${placeholderFile}`, { signal });
    if (!r.ok) throw Error(`${placeholderFile} (${r.status})`);
    return decodePlaceholder(await bakeBytes(r));
  } catch (error) {
    // Older data (no bake yet) or a failed fetch: City shows what it did before.
    if (!signal?.aborted) console.warn('City placeholder unavailable', error);
    return null;
  }
}

interface Built { geometry: THREE.BufferGeometry; massEnd: number; groundEnd: number; skirtEnd: number }

/**
 * One area's geometry, in decimetres from (ox, 0, oz) (the mesh scales by 0.1). The index runs
 * skirt, ground, masses, so a draw range ending early drops masses first and the skirt last; the
 * masses come shuffled from the bake and the ground cells are shuffled here.
 *
 * With `normals` (the default), walls and roofs get their own vertices and face normals, and the
 * ground smooth ones, so the layer draws with a plain Lambert material whose program City already
 * has (the mosaic plinth's). Without, vertices are shared and the material must be flat-shaded
 * (about half the memory, one more program).
 */
export function buildArea(d: PlaceholderAreaData, normals = true): Built {
  const { area, ground, ringN, y, xz, roof } = d;
  const { cols, rows, step } = area.ground;
  const b = area.bounds;
  const dm = (v: number) => Math.round(v * 10);
  const gx = (c: number) => dm(Math.min(b.minX + c * step, b.maxX) - area.ox);
  const gz = (r: number) => dm(Math.min(b.minZ + r * step, b.maxZ) - area.oz);
  const groundVerts = cols * rows, edge = 2 * (cols - 1) + 2 * (rows - 1);
  let ringVerts = 0, roofTris = 0;
  for (let i = 0; i < ringN.length; i++) { ringVerts += ringN[i]; roofTris += ringN[i] - 2; }
  // Shared: ground, one bottom vertex per edge node, two per ring vertex. With normals: ground,
  // four per skirt segment, four per wall and one per roof vertex.
  const vertices = normals ? groundVerts + 4 * edge + 5 * ringVerts : groundVerts + edge + 2 * ringVerts;
  const pos = new Int16Array(vertices * 3);
  const nrm = normals ? new Int8Array(vertices * 3) : null;
  let v = 0;
  // The normal the next put() takes (Int8, normalised), set by unit().
  let nx = 0, ny = 127, nz = 0;
  const unit = (x: number, yy: number, z: number) => { const l = 127 / (Math.sqrt(x * x + yy * yy + z * z) || 1); nx = Math.round(x * l); ny = Math.round(yy * l); nz = Math.round(z * l); };
  const put = (x: number, yy: number, z: number) => {
    pos[v * 3] = x; pos[v * 3 + 1] = yy; pos[v * 3 + 2] = z;
    if (nrm) { nrm[v * 3] = nx; nrm[v * 3 + 1] = ny; nrm[v * 3 + 2] = nz; }
    return v++;
  };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    // Smooth ground normals from the grid's slopes (decimetres both ways).
    const h = (cc: number, rr: number) => ground[Math.min(rows - 1, Math.max(0, rr)) * cols + Math.min(cols - 1, Math.max(0, cc))];
    const dx = gx(Math.min(cols - 1, c + 1)) - gx(Math.max(0, c - 1)), dz = gz(Math.min(rows - 1, r + 1)) - gz(Math.max(0, r - 1));
    unit(-(h(c + 1, r) - h(c - 1, r)) / (dx || 1), 1, -(h(c, r + 1) - h(c, r - 1)) / (dz || 1));
    put(gx(c), ground[r * cols + c], gz(r));
  }
  const bottom = dm(area.bottomY);
  // The perimeter, clockwise from above.
  const ring: number[] = [];
  for (let c = 0; c < cols - 1; c++) ring.push(c);
  for (let r = 0; r < rows - 1; r++) ring.push(r * cols + cols - 1);
  for (let c = cols - 1; c > 0; c--) ring.push((rows - 1) * cols + c);
  for (let r = rows - 1; r > 0; r--) ring.push(r * cols);
  const indexCount = 3 * (2 * (cols - 1) * (rows - 1) + 2 * edge + roofTris + 2 * ringVerts);
  const index = vertices > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
  let k = 0;
  const tri = (a: number, b2: number, c: number) => { index[k++] = a; index[k++] = b2; index[k++] = c; };
  const px = (i: number) => pos[i * 3], py = (i: number) => pos[i * 3 + 1], pz = (i: number) => pos[i * 3 + 2];
  /** A wall from (ax, az) to (bx, bz), facing (−dz, dx) of its direction: out for a ring running
   * counter-clockwise from above (the skirt's clockwise ring passes its ends swapped). */
  const wall = (ax: number, az: number, bx: number, bz: number, a0: number, a1: number, b0: number, b1: number, shared?: [number, number, number, number]) => {
    let q: [number, number, number, number];
    if (shared) q = shared;
    else {
      unit(-(bz - az), 0, bx - ax);
      q = [put(ax, a0, az), put(bx, b0, bz), put(bx, b1, bz), put(ax, a1, az)];
    }
    tri(q[0], q[1], q[2]); tri(q[0], q[2], q[3]);
  };
  // Skirt: outward walls down to the plinth's bottom (drawn first, so it goes last). Its ring runs
  // clockwise from above, so each segment is drawn from its far end back.
  const under = normals ? null : ring.map(i => put(px(i), bottom, pz(i)));
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length];
    if (under) wall(0, 0, 0, 0, 0, 0, 0, 0, [under[(i + 1) % ring.length], under[i], a, c]);
    else wall(px(c), pz(c), px(a), pz(a), bottom, py(c), bottom, py(a));
  }
  const skirtEnd = k;
  // Ground cells, in a stable shuffled order.
  const cells = Array.from({ length: (cols - 1) * (rows - 1) }, (_, i) => i);
  let s = 0x9e3779b9 ^ area.id.length;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  for (const cell of cells) {
    const r = Math.floor(cell / (cols - 1)), c = cell % (cols - 1);
    const p00 = r * cols + c, p10 = p00 + 1, p01 = p00 + cols, p11 = p01 + 1;
    tri(p00, p01, p11); tri(p00, p11, p10);
  }
  const groundEnd = k;
  // Masses: walls and a roof each, no floor. Rings run counter-clockwise from above.
  let at = 0, rt = 0;
  for (let i = 0; i < ringN.length; i++) {
    const n = ringN[i], y0 = y[i * 2], y1 = y[i * 2 + 1];
    const X = (j: number) => xz[(at + (j % n)) * 2], Z = (j: number) => xz[(at + (j % n)) * 2 + 1];
    let top: number;
    if (normals) {
      for (let j = 0; j < n; j++) wall(X(j), Z(j), X(j + 1), Z(j + 1), y0, y1, y0, y1);
      top = v;
      unit(0, 1, 0);
      for (let j = 0; j < n; j++) put(X(j), y1, Z(j));
    } else {
      const base = v;
      for (let j = 0; j < n; j++) put(X(j), y0, Z(j));
      for (let j = 0; j < n; j++) put(X(j), y1, Z(j));
      for (let j = 0; j < n; j++) { const j1 = (j + 1) % n; wall(0, 0, 0, 0, 0, 0, 0, 0, [base + j, base + j1, base + n + j1, base + n + j]); }
      top = base + n;
    }
    // The bake stores roof triangles facing up.
    for (let t = 0; t < n - 2; t++) tri(top + roof[(rt + t) * 3], top + roof[(rt + t) * 3 + 1], top + roof[(rt + t) * 3 + 2]);
    at += n; rt += n - 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (nrm) geometry.setAttribute('normal', new THREE.BufferAttribute(nrm, 3, true));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, skirtEnd, groundEnd, massEnd: k };
}

/**
 * The placeholder's one material: the opening's white on a plain Lambert material (no shader
 * changes, so it shares a program City already compiles), pulled slightly toward the camera.
 */
export function placeholderMaterial(flat = false) {
  const material = new THREE.MeshLambertMaterial({ color: new THREE.Color(WHITE_MODEL).multiplyScalar(WHITE_ALBEDO), flatShading: flat });
  // Where a placeholder and the area arriving under it coincide, white wins.
  material.polygonOffset = true;
  material.polygonOffsetFactor = -2;
  material.polygonOffsetUnits = -8;
  return material;
}

type Fade = { start: number | null };

export function createPlaceholder(areas: PlaceholderAreaData[], o: { reducedMotion: boolean; flat?: boolean;
  /** Called when an area's placeholder appears or disappears (shadow maps that cache it). */
  changed?: () => void }) {
  o = { flat: placeholderFlat, ...o };
  const group = new THREE.Group();
  group.name = 'white placeholder';
  group.userData.perf = 'placeholder';
  const material = placeholderMaterial(o.flat);
  const day = material.color.clone();
  const meshes = new Map<string, { mesh: THREE.Mesh; built: Built }>();
  const bounds = new Map(areas.map(d => [d.area.id, d.area.bounds]));
  const fades = new Map<string, Fade>();
  for (const d of areas) {
    const built = buildArea(d, !o.flat);
    const mesh = new THREE.Mesh(built.geometry, material);
    mesh.name = 'placeholder ' + d.area.id;
    mesh.position.set(d.area.ox, 0, d.area.oz);
    mesh.scale.setScalar(0.1);
    mesh.castShadow = mesh.receiveShadow = true;
    // Already white: the opening's white model leaves it as it is (white-model.ts).
    mesh.userData.placeholder = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    // Never picked: three raycasts hidden meshes too, and the placeholder is not the board.
    mesh.raycast = () => {};
    group.add(mesh);
    meshes.set(d.area.id, { mesh, built });
  }
  const full = (e: { mesh: THREE.Mesh; built: Built }) => e.mesh.geometry.setDrawRange(0, e.built.massEnd);
  return {
    group,
    material,
    /** The areas the file covers. */
    get ids() { return [...meshes.keys()]; },
    /** Show an area's placeholder whole (at boot, or when an area unloads). */
    show(id: string) {
      const e = meshes.get(id);
      if (!e) return;
      fades.delete(id);
      full(e);
      if (!e.mesh.visible) o.changed?.();
      e.mesh.visible = true;
      e.mesh.userData.fading = false;
    },
    /** Hide at once (the area is on screen already). */
    hide(id: string) {
      const e = meshes.get(id);
      if (!e) return;
      fades.delete(id);
      if (e.mesh.visible) o.changed?.();
      e.mesh.visible = false;
      e.mesh.userData.fading = false;
    },
    /** The area has mounted under it: dissolve, starting on the next frame drawn. */
    reveal(id: string) {
      const e = meshes.get(id);
      if (!e || !e.mesh.visible) return;
      if (o.reducedMotion) { this.hide(id); return; }
      fades.set(id, { start: null });
      e.mesh.userData.fading = true;
    },
    /** Per frame: advance the dissolves. */
    update(now: number) {
      for (const [id, f] of fades) {
        const e = meshes.get(id)!;
        f.start ??= now;
        const pinned = pinnedFade && (pinnedFade.id === null || pinnedFade.id === id) ? pinnedFade.p : null;
        const t = pinned ?? Math.min(1, (now - f.start) / WHITE_FADE_MS);
        if (t >= 1) { this.hide(id); continue; }
        const p = easeInOut(t), { skirtEnd, groundEnd, massEnd } = e.built;
        // Masses go first, in their shuffled order, then the ground cells, then the skirt.
        const count = p < MASS_SHARE
          ? groundEnd + (massEnd - groundEnd) * (1 - p / MASS_SHARE)
          : skirtEnd + (groundEnd - skirtEnd) * (1 - (p - MASS_SHARE) / (1 - MASS_SHARE)) * (p < 0.97 ? 1 : 0);
        e.mesh.geometry.setDrawRange(0, Math.ceil(count / 3 - 1e-6) * 3);
      }
    },
    /** Whether a dissolve is running (the caller keeps drawing frames). */
    get fading() { return fades.size > 0; },
    /** The masses alone (the opening's map mode draws white buildings over the 2D map). */
    massesOnly(on: boolean) {
      for (const [id, e] of meshes) if (!fades.has(id)) e.mesh.geometry.setDrawRange(on ? e.built.groundEnd : 0, on ? e.built.massEnd - e.built.groundEnd : e.built.massEnd);
    },
    /** City's darkness (0 day, 1 night): white by day, a lifted night blue by night. */
    setNight(night: number) {
      material.color.copy(day).lerp(NIGHT_COLOR, night);
      material.emissive.copy(NIGHT_EMISSIVE).multiplyScalar(night);
    },
    /**
     * The areas drawn whole in white now, as minX, minZ, maxX, maxZ per area, for the ink pass's
     * cream night lines. A dissolving area is left out: the coloured buildings arriving there take
     * the city's own ink at once. Writes into `out` and returns the count.
     */
    rects(out: Float32Array) {
      let n = 0;
      for (const [id, e] of meshes) {
        if (!e.mesh.visible || fades.has(id) || n * 4 >= out.length) continue;
        const b = bounds.get(id)!;
        out.set([b.minX, b.minZ, b.maxX, b.maxZ], n++ * 4);
      }
      return n;
    },
    /** Low geometry this layer holds (bytes), shown or hidden. */
    get bytes() {
      let n = 0;
      for (const { mesh } of meshes.values()) for (const a of [...Object.values(mesh.geometry.attributes), mesh.geometry.index]) n += a?.array.byteLength ?? 0;
      return n;
    },
    dispose() {
      for (const { mesh } of meshes.values()) mesh.geometry.dispose();
      material.dispose();
      group.removeFromParent();
    },
  };
}
export type Placeholder = ReturnType<typeof createPlaceholder>;
