import underpass from '../city/fixtures/midtown-connector/underpass.json';
import type { GroundManifest } from './grid';

/** Restore exposed-road grade beneath the surveyed Peachtree Street deck. */
export function midtownConnectorGround(manifest: GroundManifest, bytes: ArrayBuffer) {
  const nodes = (underpass as Record<string, number[][]>)[manifest.sha256];
  if (!nodes) return bytes;
  const corrected = bytes.slice(0);
  const cells = new DataView(corrected);
  for (const [index, value] of nodes) cells.setInt16(index * 2, value, true);
  return corrected;
}
