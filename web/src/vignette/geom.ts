/** Small geometry toolkit for the vignette: polylines, ribbons and vertex-coloured boxes merged into one mesh. */
import * as THREE from 'three';

export type P2 = [number, number];

/** A polyline in scene metres with cumulative length, sampled by distance. */
export class Line {
  readonly cum: number[] = [0];
  constructor(readonly pts: P2[]) {
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  get length() {
    return this.cum[this.cum.length - 1];
  }
  /** Fractional vertex index for looking up attributes sampled on this polyline. */
  vertexAt(s: number) {
    const c = this.cum;
    s = Math.min(Math.max(s, 0), this.length);
    let lo = 0;
    let hi = c.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (c[m] <= s) lo = m;
      else hi = m;
    }
    const i = Math.min(lo, this.pts.length - 2);
    return i + (s - c[i]) / (c[i + 1] - c[i] || 1);
  }
  /** Point, unit direction and left normal at distance s (clamped). */
  at(s: number) {
    const vertex = this.vertexAt(s);
    const i = Math.min(Math.floor(vertex), this.pts.length - 2);
    const f = vertex - i;
    const a = this.pts[i];
    const b = this.pts[i + 1];
    const seg = this.cum[i + 1] - this.cum[i] || 1;
    const dx = (b[0] - a[0]) / seg;
    const dz = (b[1] - a[1]) / seg;
    return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, dx, dz, nx: dz, nz: -dx };
  }
  /** Same line shifted sideways by `d` metres (positive = right of travel), resampled every `step`. */
  offset(d: number, step = 3): Line {
    const out: P2[] = [];
    for (let s = 0; s <= this.length + 1e-6; s += step) {
      const p = this.at(s);
      out.push([p.x - p.nx * d, p.z - p.nz * d]);
    }
    const e = this.at(this.length);
    out.push([e.x - e.nx * d, e.z - e.nz * d]);
    return new Line(out);
  }
}

export function segDist(px: number, pz: number, a: P2, b: P2) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.min(1, Math.max(0, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2));
  return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz);
}

export function pointInRing(x: number, z: number, ring: P2[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Deterministic PRNG so the diorama is the same every load. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Accumulates triangles with per-vertex colour (non-indexed, so flat shading is free). */
export class Builder {
  pos: number[] = [];
  col: number[] = [];
  private c = new THREE.Color();
  /** Parsed colours by string or hex number. Parsing a CSS string (plus the sRGB conversion) per
   * triangle was ~0.6 s of a phone's City load; the cached floats are the ones set() produces. */
  private static parsed = new Map<string | number, [number, number, number]>();
  private use(color: THREE.ColorRepresentation) {
    if (typeof color !== 'string' && typeof color !== 'number') { this.c.set(color); return; }
    const hit = Builder.parsed.get(color);
    if (hit) { this.c.r = hit[0]; this.c.g = hit[1]; this.c.b = hit[2]; return; }
    this.c.set(color);
    if (Builder.parsed.size < 4096) Builder.parsed.set(color, [this.c.r, this.c.g, this.c.b]);
  }

  tri(a: number[], b: number[], c: number[], color: THREE.ColorRepresentation) {
    this.use(color);
    this.pos.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) this.col.push(this.c.r, this.c.g, this.c.b);
  }
  quad(a: number[], b: number[], c: number[], d: number[], color: THREE.ColorRepresentation) {
    this.tri(a, b, c, color);
    this.tri(a, c, d, color);
  }
  /** Ribbon along a polyline: y(s, x, z) gives the height; width may vary. */
  ribbon(line: Line, width: number, y: (s: number, x: number, z: number) => number, color: THREE.ColorRepresentation, step = 2, from = 0, to = line.length) {
    let prev: number[][] | null = null;
    for (let s = from; ; s = Math.min(s + step, to)) {
      const p = line.at(s);
      const h = width / 2;
      const L = [p.x + p.nx * h, 0, p.z + p.nz * h];
      const R = [p.x - p.nx * h, 0, p.z - p.nz * h];
      L[1] = y(s, L[0], L[2]);
      R[1] = y(s, R[0], R[2]);
      if (prev) this.quad(prev[0], prev[1], R, L, color);
      prev = [L, R];
      if (s >= to) break;
    }
  }
  /** Vertical wall along a polyline offset `d` to the side, from yBot(s) to yTop(s). */
  wall(line: Line, d: number, yBot: (s: number) => number, yTop: (s: number) => number, color: THREE.ColorRepresentation, step = 3, from = 0, to = line.length) {
    let prev: number[][] | null = null;
    for (let s = from; ; s = Math.min(s + step, to)) {
      const p = line.at(s);
      const x = p.x - p.nx * d;
      const z = p.z - p.nz * d;
      const cur = [
        [x, yBot(s), z],
        [x, yTop(s), z],
      ];
      if (prev) this.quad(prev[0], cur[0], cur[1], prev[1], color);
      prev = cur;
      if (s >= to) break;
    }
  }
  /** Axis-aligned box in local frame, then transformed by `m`. */
  box(w: number, h: number, l: number, x: number, y: number, z: number, color: THREE.ColorRepresentation, m?: THREE.Matrix4) {
    const g = new THREE.BoxGeometry(w, h, l).toNonIndexed();
    g.translate(x, y, z);
    if (m) g.applyMatrix4(m);
    this.addGeometry(g, color);
  }
  addGeometry(g: THREE.BufferGeometry, color: THREE.ColorRepresentation) {
    const gg = g.index ? g.toNonIndexed() : g;
    const p = gg.attributes.position.array;
    this.use(color);
    for (let i = 0; i < p.length; i++) this.pos.push(p[i]);
    for (let i = 0; i < p.length / 3; i++) this.col.push(this.c.r, this.c.g, this.c.b);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    return g;
  }

  /**
   * geometry() as a build that yields every few thousand vertices (core/slice.ts), with the same
   * bytes: flat normals as three's computeVertexNormals makes them for unindexed triangles.
   */
  *geometrySteps(): Generator<string | void, THREE.BufferGeometry, void> {
    const STEP = 12288;
    const pos = new Float32Array(this.pos.length), col = new Float32Array(this.col.length), nor = new Float32Array(this.pos.length);
    for (let i = 0; i < pos.length; i += STEP) {
      const end = Math.min(pos.length, i + STEP);
      for (let k = i; k < end; k++) { pos[k] = this.pos[k]; col[k] = this.col[k]; }
      yield 'geometry';
    }
    for (let i = 0; i + 8 < pos.length; i += 9) {
      if (i % STEP === 0 && i) yield 'normals';
      // (C − B) × (A − B), as three does, stored unnormalized in float32...
      const ex = pos[i + 6] - pos[i + 3], ey = pos[i + 7] - pos[i + 4], ez = pos[i + 8] - pos[i + 5];
      const fx = pos[i] - pos[i + 3], fy = pos[i + 1] - pos[i + 4], fz = pos[i + 2] - pos[i + 5];
      const nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx;
      for (let v = 0; v < 9; v += 3) { nor[i + v] = nx; nor[i + v + 1] = ny; nor[i + v + 2] = nz; }
      // ...then normalized from the stored values (BufferGeometry.normalizeNormals).
      for (let v = 0; v < 9; v += 3) {
        const x = nor[i + v], y = nor[i + v + 1], z = nor[i + v + 2];
        const inv = 1 / (Math.sqrt(x * x + y * y + z * z) || 1);
        nor[i + v] = x * inv; nor[i + v + 1] = y * inv; nor[i + v + 2] = z * inv;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    return g;
  }
}

/**
 * Faceted transverse sections with individually coloured longitudinal panels. Local +z is forward.
 * Both end caps take `capColor` (the second panel's colour by default).
 */
export function loft(b: Builder, rings: number[][][], colors: string[], capRear = true, capFront = true, capColor = colors[1]) {
  const last = rings[rings.length - 1];
  for (let i = 1; i < last.length - 1; i++) {
    if (capFront) b.tri(last[0], last[i], last[i + 1], capColor);
    if (capRear) b.tri(rings[0][0], rings[0][i + 1], rings[0][i], capColor);
  }
  for (let k = 1; k < rings.length; k++) {
    const a = rings[k - 1],
      c = rings[k];
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      b.quad(a[i], a[j], c[j], c[i], colors[i]);
    }
  }
}
