/**
 * The white placeholder's file format (docs/white-placeholder.md): per area, a coarse ground grid
 * and building masses (a footprint ring extruded from y0 to y1, with its roof triangulated). It is
 * source-agnostic: the bake fills it from each area's own far form, and a tile that City never
 * builds (the rest of the I-285 square) can be filled from Overture footprints and heights alone.
 *
 * Layout, little-endian: "WPH1", u32 header length, the JSON header (padded to 4 bytes), then
 * each area's arrays in header order, each starting on a 2-byte boundary:
 *   ground  Int16[cols × rows]  scene y in decimetres, row-major from minZ and minX
 *   ringN   Uint8[buildings]    vertices per footprint ring
 *   y       Int16[2 × buildings] base and top, scene y in decimetres
 *   xz      Int16[2 × Σ ringN]  ring vertices in decimetres from the area's origin (ox, oz)
 *   roof    Uint8[3 × Σ (ringN − 2)] roof triangles, indices into the building's own ring
 */

export interface PlaceholderArea {
  id: string;
  /** Origin of the area's ring coordinates (scene metres). */
  ox: number; oz: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** The skirt's bottom (scene y, metres): the mosaic plinth's bottom. */
  bottomY: number;
  ground: { step: number; cols: number; rows: number };
  buildings: number; ringVerts: number; roofTris: number;
}

export interface PlaceholderHeader { version: 1; areas: PlaceholderArea[] }

export interface PlaceholderAreaData {
  area: PlaceholderArea;
  ground: Int16Array; ringN: Uint8Array; y: Int16Array; xz: Int16Array; roof: Uint8Array;
}

const MAGIC = 0x31485057; // "WPH1"

export function encodePlaceholder(areas: PlaceholderAreaData[]): Uint8Array {
  const header = new TextEncoder().encode(JSON.stringify({ version: 1, areas: areas.map(a => a.area) } satisfies PlaceholderHeader));
  const pad = (n: number, k: number) => (n + k - 1) & ~(k - 1);
  let size = pad(8 + header.length, 4);
  for (const a of areas) for (const arr of [a.ground, a.ringN, a.y, a.xz, a.roof]) size = pad(size, 2) + arr.byteLength;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, header.length, true);
  out.set(header, 8);
  let at = pad(8 + header.length, 4);
  for (const a of areas) for (const arr of [a.ground, a.ringN, a.y, a.xz, a.roof]) {
    at = pad(at, 2);
    out.set(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength), at);
    at += arr.byteLength;
  }
  return out;
}

export function decodePlaceholder(buffer: ArrayBuffer): PlaceholderAreaData[] {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC) throw Error('Not a placeholder file');
  const length = view.getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, length))) as PlaceholderHeader;
  if (header.version !== 1) throw Error('Placeholder version ' + header.version);
  let at = (8 + length + 3) & ~3;
  // Copies, so each array is aligned and the file's buffer can be dropped.
  const i16 = (n: number) => { at = (at + 1) & ~1; const a = new Int16Array(buffer.slice(at, at + n * 2)); at += n * 2; return a; };
  const u8 = (n: number) => { at = (at + 1) & ~1; const a = new Uint8Array(buffer.slice(at, at + n)); at += n; return a; };
  return header.areas.map(area => ({
    area,
    ground: i16(area.ground.cols * area.ground.rows),
    ringN: u8(area.buildings),
    y: i16(area.buildings * 2),
    xz: i16(area.ringVerts * 2),
    roof: u8(area.roofTris * 3),
  }));
}
