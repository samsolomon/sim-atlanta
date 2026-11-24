/**
 * Fetches and parses an area's shipped files and builds its mid-ring LOD off the main thread.
 * The result's typed arrays are transferred back, not copied.
 */
import { buildLod, type LodContext, type LodGroundManifest, type LodOptions } from './lod-build';

export interface LodRequest { id: number; path: string; options: LodOptions }
export type LodResponse = { id: number; ok: true; result: ReturnType<typeof buildLod>; bytes: number }
  | { id: number; ok: false; error: string };

async function get(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw Error(`${url} (${r.status})`);
  return r;
}

// Typed locally: a webworker lib reference would retype the page's globals for the whole program.
const scope = self as unknown as { onmessage: ((e: MessageEvent<LodRequest>) => void) | null; postMessage(m: unknown, transfer?: Transferable[]): void };
scope.onmessage = async (e: MessageEvent<LodRequest>) => {
  const { id, path, options } = e.data;
  try {
    const [manifestText, ground, contextText] = await Promise.all([
      get(path + '/ground.json').then(r => r.text()),
      get(path + '/ground.i16').then(r => r.arrayBuffer()),
      get(path + '/context.json').then(r => r.text()),
    ]);
    const manifest = JSON.parse(manifestText) as LodGroundManifest;
    const context = JSON.parse(contextText) as LodContext;
    const result = buildLod(context, manifest, ground, options);
    const bytes = manifestText.length + ground.byteLength + contextText.length;
    const transfer: Transferable[] = [result.heights.buffer];
    for (const p of [result.ground, result.blocks, result.forest]) transfer.push(p.position.buffer, p.normal.buffer, p.color.buffer);
    scope.postMessage({ id, ok: true, result, bytes } satisfies LodResponse, transfer);
  } catch (error) {
    scope.postMessage({ id, ok: false, error: String(error) } satisfies LodResponse);
  }
};
