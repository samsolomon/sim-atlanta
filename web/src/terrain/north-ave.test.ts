import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Builder, Line, type P2 } from '../vignette/geom';
import railRows from '../city/fixtures/midtown-rail.json';
import { GroundGrid } from './grid';
import { northAvenue as site } from './north-ave';
import { GroundSurface } from './surface';
import { triangleHeight } from './tread-height';
import { daylightSlots, drawUnderpass, MOUTH_LEVEL_M, underpassFloor, underpassGround } from './underpass';

const get = (file: string) =>
  readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-south/' + file, import.meta.url));
const manifest = JSON.parse(get('ground.json').toString());
const zero = manifest.vertical.sceneZeroNavd88M;
const raw = Uint8Array.from(get('ground.i16')).buffer;
const grid = new GroundGrid(manifest, underpassGround(site, manifest, raw.slice(0)));

it.each(['low', 'high'] as const)(
  'keeps five actual terrain covers, daylight and clearance on %s',
  (quality) => {
    const board = new GroundSurface(grid, quality, daylightSlots(site, zero));
    const before = new GroundSurface(new GroundGrid(manifest, raw), quality);
    const floor = new Builder(),
      walls = new Builder();
    drawUnderpass(site, walls, floor, board.sampleScene.bind(board), zero);
    const street = floor.geometry(),
      structure = walls.geometry();
    const tris =
      (board.geometry.index!.count - before.geometry.index!.count) / 3 +
      (floor.pos.length + walls.pos.length) / 9;
    console.info(quality, 'added board and structure triangles', tris);
    if (quality === 'low') expect(tris).toBeLessThan(5000);
    function hit(mesh: typeof street, s: number, t: number) {
      const pos = mesh.getAttribute('position'),
        xy = site.point(s, t),
        hits: number[] = [];
      for (let i = 0; i < pos.count; i += 3) {
        const h = triangleHeight(pos as import('three').BufferAttribute, i, ...xy);
        if (h !== null) hits.push(h + zero);
      }
      return hits;
    }
    for (const cover of site.spans)
      for (const t of [-7, 4, 7]) {
        const s = (cover.start + cover.end) / 2;
        const surface = board.sampleScene(...site.point(s, t));
        expect(surface).not.toBeNull();
        expect(Math.abs(surface! + zero - cover.top)).toBeLessThan(0.4);
        const road = hit(street, s, t),
          soffit = hit(structure, s, t);
        expect(road[0]).toBeCloseTo(site.floor(s), 3);
        expect(Math.min(...soffit) - road[0]).toBeCloseTo(cover.clearance ?? site.clearance, 3);
      }
    for (const cover of site.spans.filter(c => c.finish === 'disused-ballast')) {
      for (const s of [cover.start+.28,cover.end-.28]) for (const t of [-8,0,8]) {
        const bank = board.sampleScene(...site.point(s,t))! + zero;
        // Both edge rails sit above the surveyed upper surface.
        expect(Math.max(...hit(structure,s,t))-bank).toBeCloseTo(.78,1);
      }
    }
    for (const s of [21.5, 93, 111, 135])
      for (const t of [-7, 4, 7]) {
        expect(board.sampleScene(...site.point(s, t))).toBeNull();
        expect(hit(structure, s, t)).toHaveLength(0);
        expect(hit(street, s, t)[0]).toBeCloseTo(site.floor(s), 3);
      }
    let sampled = 0,
      maxGrade = 0;
    for (const run of railRows['midtown-south']) {
      const line = new Line(run.pts as P2[]);
      let last: number | null = null;
      for (let d = 0; d < line.length; d++) {
        const p = line.at(d),
          [s, t] = site.local(p.x, p.z);
        if (s < 21 || s > 89 || Math.abs(t) > 39) {
          last = null;
          continue;
        }
        const h = board.sampleScene(p.x, p.z);
        expect(h).not.toBeNull();
        if (last !== null) maxGrade = Math.max(maxGrade, Math.abs(last - h!));
        sampled++;
        last = h;
      }
    }
    expect(sampled).toBeGreaterThan(200);
    expect(maxGrade).toBeLessThanOrEqual(0.015);
    street.dispose();
    structure.dispose();
    board.geometry.dispose();
    before.geometry.dispose();
  },
);

it.each(['low', 'high'] as const)('meets the board road level and flush at both mouths on %s', (quality) => {
  const board = new GroundSurface(grid, quality, daylightSlots(site, zero)),
    ground = board.sampleScene.bind(board);
  const floor = new Builder();
  drawUnderpass(site, new Builder(), floor, ground, zero);
  const street = floor.geometry(),
    pos = street.getAttribute('position') as import('three').BufferAttribute;
  const drawn = (s: number, t: number) => {
    const xy = site.point(s, t);
    for (let i = 0; i < pos.count; i += 3) {
      const h = triangleHeight(pos, i, ...xy);
      if (h !== null) return h;
    }
    return null;
  };
  const w = site.halfWidth,
    worst = { step: 0, cross: 0, floor: 0 };
  for (const [mouth, out] of [[site.start, -1], [site.end, 1]] as const) {
    for (let t = -w + 0.05; t <= w - 0.05; t += 0.25) {
      // The joint: board just outside against the drawn pavement just inside.
      const outside = ground(...site.point(mouth + out * 0.02, t)),
        inside = drawn(mouth - out * 0.02, t);
      expect(outside, String([mouth, t])).not.toBeNull();
      expect(inside, String([mouth, t])).not.toBeNull();
      worst.step = Math.max(worst.step, Math.abs(outside! - inside!));
      // Vehicles ride underpassFloor, so it must be the drawn lane surface.
      if (Math.abs(t) < w - 2.2 && Math.abs(t) > 0.8)
        for (const ds of [0.5, 3, 9, 15])
          worst.floor = Math.max(
            worst.floor,
            Math.abs(drawn(mouth - out * ds, t)! - underpassFloor(site, mouth - out * ds, t, ground, zero)),
          );
    }
    // The board road beyond the mouth is level across the carriageway.
    for (let d = 0.5; d <= MOUTH_LEVEL_M; d += 1.5) {
      const centre = ground(...site.point(mouth + out * d, 0))!;
      for (const t of [2 - w, -w / 2, w / 2, w - 2])
        worst.cross = Math.max(worst.cross, Math.abs(ground(...site.point(mouth + out * d, t))! - centre));
    }
  }
  console.info(quality, 'mouth joints', JSON.stringify(worst));
  // 1 m strips against the board's 5 m faces: a few cm where a face kinks under a strip.
  expect(worst.step).toBeLessThan(0.05);
  expect(worst.floor).toBeLessThan(0.16);
  expect(worst.cross).toBeLessThan(0.15);
  street.dispose();
  board.geometry.dispose();
});
