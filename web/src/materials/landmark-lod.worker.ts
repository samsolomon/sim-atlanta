import { farTriangles } from './landmark-lod';

type Job = { id: number; P: Float32Array; C: Float32Array; k: number; minArea: number };
// Typed locally: a webworker lib reference would leak worker globals into the DOM code.
const scope = self as unknown as { onmessage: (e: MessageEvent<Job>) => void; postMessage(m: unknown, transfer?: Transferable[]): void };

/** Off the main thread: one range of a cell's buffer in, its far version out (see farTriangles). */
scope.onmessage = e => {
  const { id, P, C, k, minArea } = e.data;
  const far = farTriangles(P, C, k, 0, P.length / 9, minArea);
  if (!far) { scope.postMessage({ id, kept: null }); return; }
  const kept = Uint32Array.from(far.kept);
  const walls = Uint32Array.from(far.walls, w => w.t);
  const colors = new Float32Array(far.walls.length * 3 * k);
  far.walls.forEach((w, i) => colors.set(w.color, i * 3 * k));
  scope.postMessage({ id, kept, walls, colors, dropped: far.dropped }, [kept.buffer, walls.buffer, colors.buffer]);
};
