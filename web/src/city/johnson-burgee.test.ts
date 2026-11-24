import { expect, it } from 'vitest';
import { rng } from '../vignette/geom';
import { atlasPixels, type GraniteAtlasOptions } from './johnson-burgee';

/** The atlas loop as it was before channels were written directly (the reference). */
function reference(o: GraniteAtlasOptions) {
  const w = o.bays.length * o.bayWidth, h = o.floors * o.floorHeight;
  const day = new Uint8Array(w * h * 4), night = new Uint8Array(day.length);
  const random = rng(o.seed);
  o.bays.forEach(({ panes, width, grouped }, bay) => {
    const left = (o.bayWidth - width) / 2;
    for (let floor = 0; floor < o.floors; floor++) {
      const lit = random() < o.occupancy ? .28 + .48 * random() : 0;
      const sill = grouped ? (floor % o.groupFloors === 0 ? o.bandHeight : 0) : o.punchedSill;
      const head = grouped ? o.floorHeight : o.punchedHead;
      for (let y = 0; y < o.floorHeight; y++) for (let x = 0; x < o.bayWidth; x++) {
        const dx = x - left;
        const pane = dx >= 0 && dx < width && y >= sill && y < head;
        const mullion = pane && ((dx % (width / panes)) < 1 || y === 0);
        const shade = 68 + 4 * (Math.floor(dx * panes / width) % 3);
        const i = 4 * ((floor * o.floorHeight + y) * w + bay * o.bayWidth + x);
        day.set(!pane ? o.granite : mullion ? o.frame : [shade, shade + 13, shade + 22], i);
        day[i + 3] = 255;
        const glow = pane && !mullion ? lit : 0;
        night.set([255 * glow, 195 * glow, 123 * glow, 255], i);
      }
    }
  });
  return { day, night };
}

// One Atlantic Center's and 191 Peachtree's own options.
const oneAtlantic: GraniteAtlasOptions = { bays: Array.from({ length: 36 }, () => ({ panes: 4, width: 16, grouped: true })),
  floors: 45, bayWidth: 24, floorHeight: 12, granite: [204, 174, 160], frame: [214, 206, 196],
  groupFloors: 3, bandHeight: 3, punchedSill: 2, punchedHead: 9, occupancy: .16, seed: 1987 };
const p191: GraniteAtlasOptions = { bays: [...Array.from({ length: 10 }, () => ({ panes: 3, width: 14, grouped: false })),
  ...Array.from({ length: 6 }, () => ({ panes: 2, width: 18, grouped: true }))], floors: 46, bayWidth: 24, floorHeight: 12,
  granite: [218, 207, 193], frame: [122, 127, 127], groupFloors: 4, bandHeight: 3, punchedSill: 2, punchedHead: 9, occupancy: .19, seed: 191 };

it.each([['One Atlantic', oneAtlantic], ['191 Peachtree-like', p191]] as const)('granite atlas pixels are byte-identical to the original loop (%s)', (_, o) => {
  const ref = reference(o), got = atlasPixels(o);
  expect(Buffer.from(got.day).equals(Buffer.from(ref.day))).toBe(true);
  expect(Buffer.from(got.night).equals(Buffer.from(ref.night))).toBe(true);
  // Cached: the same options return the same buffers.
  expect(atlasPixels({ ...o })).toBe(got);
});
