/**
 * Builds a ground surface off the main thread (?worker=1). Input and output are plain typed
 * arrays, so the same code can later run at build time to pre-bake tiles.
 */
import { buildSurfaceArrays } from './surface-build';

type Input = Parameters<typeof buildSurfaceArrays>[0];
const scope = self as unknown as { onmessage: ((e: MessageEvent<{ id: number; input: Input }>) => void) | null; postMessage(m: unknown, transfer?: Transferable[]): void };

scope.onmessage = e => {
  const { id, input } = e.data;
  try {
    const built = buildSurfaceArrays(input);
    const transfer: Transferable[] = [built.heights.buffer, built.pos.buffer, built.uv.buffer, built.normal.buffer, built.index.buffer, built.starts.buffer];
    if (built.far) transfer.push(built.far.pos.buffer, built.far.uv.buffer, built.far.normal.buffer, built.far.index.buffer);
    scope.postMessage({ id, built }, transfer);
  } catch (error) {
    scope.postMessage({ id, error: String(error) });
  }
};
