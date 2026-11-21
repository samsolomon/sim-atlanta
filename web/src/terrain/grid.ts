/** Read-only decoder for the downtown bare-earth grid. Heights are absolute NAVD88 metres. */
export interface GroundManifest {
  version: number;
  rows: number;
  cols: number;
  stepM: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  scaleM: number;
  offsetM: number;
  noData: number;
  encoding: string;
  vertical: { crs: string; sceneZeroNavd88M: number };
  sha256: string;
}

export class GroundGrid {
  private readonly data: DataView;
  constructor(readonly manifest: GroundManifest, binary: ArrayBuffer) {
    const { bounds: b, rows, cols, stepM, vertical } = manifest;
    if (manifest.version !== 1 || manifest.encoding !== 'signed int16 little-endian' ||
        vertical.crs !== 'EPSG:5703' || !Number.isFinite(vertical.sceneZeroNavd88M) ||
        !Number.isInteger(rows) || !Number.isInteger(cols) || rows < 2 || cols < 2 || !(stepM > 0) ||
        b.minX + (cols - 1) * stepM !== b.maxX || b.minZ + (rows - 1) * stepM !== b.maxZ ||
        binary.byteLength !== 2 * rows * cols) throw new Error('Invalid ground grid or manifest');
    this.data = new DataView(binary);
  }

  node(row: number, col: number): number | null {
    const m = this.manifest;
    const raw = this.data.getInt16(2 * (row * m.cols + col), true);
    return raw === m.noData ? null : raw * m.scaleM + m.offsetM;
  }

  sample(x: number, z: number): number | null {
    const { bounds: b, stepM, rows, cols } = this.manifest;
    const u = (x - b.minX) / stepM, v = (z - b.minZ) / stepM;
    if (!(u >= 0 && u <= cols - 1 && v >= 0 && v <= rows - 1)) return null;
    const i = Math.floor(u), j = Math.floor(v);
    let height = 0;
    for (let dz = 0; dz <= 1; dz++) {
      for (let dx = 0; dx <= 1; dx++) {
        const w = (dx ? u - i : 1 - (u - i)) * (dz ? v - j : 1 - (v - j));
        if (w === 0) continue;
        const h = this.node(j + dz, i + dx);
        if (h === null) return null;
        height += w * h;
      }
    }
    return height;
  }
}
