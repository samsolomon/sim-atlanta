/**
 * Baked ground (docs/perf-architecture-plan.md §4.1a): what an area's near ground surface does
 * during its mount, built in Node by `pnpm data:bake`.
 *
 * A mount builds the surface once and then re-cuts it on every carve (golf, yards, decks...), and
 * between carves its builders read the surface as it stands then (cuttings, tee grades, terraces,
 * the High drape). With a bake, the browser still builds the first surface and every yield exactly
 * as before, but skips the re-cuts. Each re-cut is a *stage* of the bake, stored one of two ways,
 * whichever is smaller:
 * - a **tape** of the reads made until the next re-cut (inputs and outputs), each read checked
 *   against its recorded inputs and answered from the tape;
 * - the **surface** that re-cut built, which the browser adopts, so reads run on it as usual.
 * The last stage is always a surface: the one the mount leaves. Every stage also checks the yields
 * carved so far. Any mismatch rebuilds the surface in the browser on the spot (counted in
 * `bakeStats.fallbacks`), so a stale bake is slower, never wrong.
 */

/** Surface reads a tape can stand in for. */
export const Read = { Sample: 0, TrianglesIn: 1 } as const;
export type Read = typeof Read[keyof typeof Read];
const INPUTS = [2, 4] as const;

export interface BakedArrays {
  pos: Float32Array; uv: Float32Array; normal: Float32Array; index: Uint32Array | Uint16Array;
  starts: Uint32Array; blockCols: number;
}

/** One re-cut: the yields carved by then (count and yieldPrint), and its tape or its surface. */
export interface BakedStage { yields: number; yieldPrint: number; tape?: Float64Array; surface?: BakedArrays }

export interface BakedGround {
  id: string; quality: string; gridSha256: string;
  /** The code fingerprint it was made with (web/ground-bake-code.ts): a bake by other code is not used. */
  code: string;
  /** heightsPrint of the drawn grid (after any in-browser grading of the raw file). */
  heights: number;
  /** The mount's re-cuts in order; the last has the surface the mount leaves. */
  stages: BakedStage[];
}

/** Counts for the perf summary and tests: bakes adopted, and fallbacks to the in-browser build. */
export const bakeStats = { adopted: 0, fallbacks: 0, reasons: [] as string[] };

/** FNV-1a over the bits of float64 values. */
function fnv() {
  let h = 2166136261;
  const f = new Float64Array(1), u = new Uint32Array(f.buffer);
  return {
    add(v: number) { f[0] = v; for (const w of u) { h ^= w; h = Math.imul(h, 16777619) >>> 0; } },
    get value() { return h; },
  };
}

/**
 * What a stage's yields do, as one number: each one's flags, ring, and floor at every ring
 * vertex and the ring's centre (a floor relative to the vertex's own height is asked at 0).
 * A yield whose floor, grade or edge rule changed no longer matches its bake.
 */
export function yieldPrint(yields: readonly import('./surface-build').GroundYield[]) {
  const h = fnv();
  for (const y of yields) {
    h.add((y.grade ? 1 : 0) + (y.conformEdges ? 2 : 0));
    let cx = 0, cz = 0;
    for (const [x, z] of y.ring) { h.add(x); h.add(z); cx += x / y.ring.length; cz += z / y.ring.length; }
    for (const [x, z] of [...y.ring, [cx, cz] as const]) { let v: number; try { v = y.floor(x, z, 0); } catch { v = -1e300; } h.add(v); }
  }
  return h.value;
}

/** The drawn grid's heights (scene metres, NaN in voids), as one number. */
export function heightsPrint(heights: Float32Array) {
  let h = 2166136261;
  const u = new Uint32Array(heights.buffer, heights.byteOffset, heights.length);
  for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

const arraysBytes = (a: BakedArrays) => a.pos.byteLength + a.uv.byteLength + a.normal.byteLength + a.index.byteLength + a.starts.byteLength;

/** Records a mount in Node: each re-cut's surface and yields, and the reads after it. */
export class BakeRecorder {
  /** Builds so far, the first included. */
  builds = 0;
  inBuild = false;
  heights = 0;
  private readonly stages: { yields: number; yieldPrint: number; surface: BakedArrays; reads: number[] }[] = [];
  /** A build finished: the first gives the grid's heights, and from the second on a stage starts. */
  built(surface: () => BakedArrays, yields: number, print: number, heights: number) {
    if (++this.builds === 1) this.heights = heights;
    else this.stages.push({ yields, yieldPrint: print, surface: surface(), reads: [] });
  }
  record(kind: Read, input: number[], output: number[]) {
    // Reads made inside a build (yield floors, exit-bank shading) do not happen when it is skipped;
    // reads before the first re-cut see the first surface, which the browser builds as usual.
    if (this.inBuild || !this.stages.length) return;
    this.stages[this.stages.length - 1].reads.push(kind, ...input, output.length, ...output);
  }
  /** The bake: every stage but the last as a tape or a surface, whichever is smaller (`tapes`: always a tape, for tests). */
  bake(meta: { id: string; quality: string; gridSha256: string; code: string }, tapes: 'smaller' | 'always' = 'smaller'): BakedGround {
    return {
      ...meta, heights: this.heights,
      stages: this.stages.map((s, i) => {
        const last = i === this.stages.length - 1;
        const tape = last ? null : Float64Array.from(s.reads);
        return tape && (tapes === 'always' || tape.byteLength < arraysBytes(s.surface))
          ? { yields: s.yields, yieldPrint: s.yieldPrint, tape }
          : { yields: s.yields, yieldPrint: s.yieldPrint, surface: s.surface };
      }),
    };
  }
}

/** Replays a bake while an area mounts in the browser. */
export class BakeReplay {
  /** Builds seen so far (the first included). */
  builds = 0;
  /** The surface skipped a re-cut whose stage is a tape: reads come from it. */
  stale = false;
  failed = false;
  private tape: Float64Array | null = null;
  private at = 0;
  constructor(readonly baked: BakedGround) {}
  /** The stage a re-cut starts (call with builds already counted), or null past the last. */
  stage() { return this.baked.stages[this.builds - 2] ?? null; }
  /** Yields carved as of the last stage entered: what the surface stands for while stale. */
  enteredYields = 0;
  /** Enter a stage: its tape replaces the last one, which must have been read through. */
  enter(stage: BakedStage) {
    this.enteredYields = stage.yields;
    this.tape = stage.tape ?? null;
    this.at = 0;
    this.stale = !!stage.tape;
  }
  /** Whether the current tape (if any) was read through. */
  get consumed() { return !this.tape || this.at === this.tape.length; }
  /** The recorded output of the next read, or null when it is not the read recorded. */
  take(kind: Read, input: readonly number[]): Float64Array | null {
    const t = this.tape;
    if (!t || this.at >= t.length || t[this.at] !== kind) return null;
    for (let i = 0; i < INPUTS[kind]; i++) if (t[this.at + 1 + i] !== input[i]) return null;
    const n = t[this.at + 1 + INPUTS[kind]], from = this.at + 2 + INPUTS[kind];
    this.at = from + n;
    return t.subarray(from, from + n);
  }
  fail(reason: string) {
    this.stale = false;
    if (this.failed) return;
    this.failed = true;
    bakeStats.fallbacks++;
    bakeStats.reasons.push(`${this.baked.id} ${this.baked.quality}: ${reason}`);
    if (import.meta.env?.DEV) console.warn('Baked ground fell back to the in-browser build:', this.baked.id, reason);
  }
}

/** Options a surface takes: record (bake script) or replay (a page with a bake). */
export interface GroundBake { record?: BakeRecorder; replay?: BakeReplay }

const MAGIC = 0x4b425247; // 'GRBK'
const VERSION = 4;
type Typed = Float32Array | Float64Array | Uint32Array | Uint16Array;
const TYPES = { Float32Array, Float64Array, Uint32Array, Uint16Array } as const;
const SURFACE = ['pos', 'uv', 'normal', 'index', 'starts'] as const;

/** One file: magic, version, header length, JSON header, then the arrays in header order, each 8-byte aligned. */
export function encodeBake(b: BakedGround): Uint8Array {
  const arrays: Typed[] = [];
  const layout = (a: Typed) => { arrays.push(a); return { type: a.constructor.name, length: a.length }; };
  const header = {
    id: b.id, quality: b.quality, gridSha256: b.gridSha256, code: b.code, heights: b.heights,
    stages: b.stages.map(s => ({
      yields: s.yields, yieldPrint: s.yieldPrint,
      tape: s.tape ? layout(s.tape) : undefined,
      surface: s.surface ? { blockCols: s.surface.blockCols, ...Object.fromEntries(SURFACE.map(k => [k, layout(s.surface![k])])) } : undefined,
    })),
  };
  const json = new TextEncoder().encode(JSON.stringify(header));
  const align = (n: number) => (n + 7) & ~7;
  let size = align(12 + json.length);
  for (const a of arrays) size += align(a.byteLength);
  const out = new Uint8Array(size), view = new DataView(out.buffer);
  view.setUint32(0, MAGIC, true); view.setUint32(4, VERSION, true); view.setUint32(8, json.length, true);
  out.set(json, 12);
  let at = align(12 + json.length);
  for (const a of arrays) { out.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), at); at += align(a.byteLength); }
  return out;
}

/** The bake in a file, or null when it is not one this code reads. */
export function decodeBake(buffer: ArrayBuffer): BakedGround | null {
  if (buffer.byteLength < 12) return null;
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC || view.getUint32(4, true) !== VERSION) return null;
  const length = view.getUint32(8, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 12, length)));
  const align = (n: number) => (n + 7) & ~7;
  let at = align(12 + length), bad = false;
  const read = (l: { type: keyof typeof TYPES; length: number }) => {
    const T = TYPES[l.type];
    if (!T || at + l.length * T.BYTES_PER_ELEMENT > buffer.byteLength) { bad = true; return new Float32Array(0); }
    const a = new T(buffer, at, l.length);
    at += align(l.length * T.BYTES_PER_ELEMENT);
    return a;
  };
  type Layout = { type: keyof typeof TYPES; length: number };
  const stages: BakedStage[] = (header.stages as { yields: number; yieldPrint: number; tape?: Layout; surface?: Record<string, Layout> & { blockCols: number } }[]).map(s => {
    // A stage is a tape or a surface; one with neither would leave a re-cut unbuilt.
    if (!s.tape === !s.surface) bad = true;
    const stage: BakedStage = { yields: s.yields, yieldPrint: s.yieldPrint };
    if (s.tape) stage.tape = read(s.tape) as Float64Array;
    if (s.surface) {
      const [pos, uv, normal, index, starts] = SURFACE.map(k => read(s.surface![k]));
      stage.surface = { pos, uv, normal, index, starts, blockCols: s.surface.blockCols } as BakedArrays;
    }
    return stage;
  });
  if (bad || !stages.length || !stages[stages.length - 1].surface) return null;
  if (typeof header.heights !== 'number' || typeof header.code !== 'string') return null;
  return { id: header.id, quality: header.quality, gridSha256: header.gridSha256, code: header.code, heights: header.heights, stages };
}

/**
 * Baked ground is parked (Sam, release 20): 1.9 MB (Low) and 4.0 MB (High) per visitor bought about
 * 0.5 s after ready. Areas build their ground in the browser unless the page asks for `?bake=1`,
 * and `vite build` leaves the bake files out of web/dist, so a production `?bake=1` only counts
 * fallbacks. The code, `pnpm data:bake` and CI's bake step stay for future heavy areas.
 */
export const bakeOn = () => new URLSearchParams(globalThis.location?.search ?? '').get('bake') === '1';

/** Areas with a bake (slice 1: the Midtown row with the most carving, Ansley Park's). */
export const BAKED_AREAS: ReadonlySet<string> = new Set(['brookwood-south']);
/**
 * Stored gzipped: the host sends binary files as they are (atlanta.solomon.io adds no
 * Content-Encoding to .i16 or .bin), and gzip is what DecompressionStream inflates everywhere.
 */
export const bakeFile = (quality: string) => `ground-bake-${quality}.bin.gz`;

/** A fetched bake's bytes, inflated unless the server already did (dev servers may send .gz encoded). */
export async function bakeBytes(r: Response): Promise<ArrayBuffer> {
  const raw = await r.arrayBuffer(), head = new Uint8Array(raw, 0, Math.min(2, raw.byteLength));
  if (head[0] !== 0x1f || head[1] !== 0x8b) return raw;
  return new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
