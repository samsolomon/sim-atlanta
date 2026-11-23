import type { Builder, P2 } from '../vignette/geom';
import type { BuildingFinish, VBuilding } from '../vignette/world';

const towerId = 'osm:way:841048595';
const auditoriumId = 'osm:way:102163024';
const brick = '#925946', deepBrick = '#805045', limestone = '#cdbfa5';
const terraCotta = '#c4ac8d', glass = '#686e71', roofColor = '#827c78';

// Rings in this bake have their exterior to the left in City x/z.
function facade(batch: Builder, a: P2, b: P2) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length;
  const p = (s: number, y: number, out: number) => [a[0] + dx * s - dz * out, y, a[1] + dz * s + dx * out];
  function panel(l: number, r: number, lo: number, hi: number, depth: number, color: string) {
    batch.quad(p(l, lo, depth), p(r, lo, depth), p(r, hi, depth), p(l, hi, depth), color);
  }
  function arch(l: number, r: number, spring: number, rise: number, depth: number, color: string) {
    const mid = (l + r) / 2;
    for (let j = 0; j < 8; j++) {
      const rim = (i: number) => p(mid + (r - l) / 2 * Math.cos(i * Math.PI / 8), spring + rise * Math.sin(i * Math.PI / 8), depth);
      batch.tri(p(mid, spring, depth), rim(j), rim(j + 1), color);
    }
  }
  function sash(l: number, r: number, lo: number, hi: number, arched = false, panes = 2) {
    panel(l - .07, r + .07, lo - .07, hi + .05, .045, terraCotta);
    panel(l, r, lo, hi, .064, glass);
    if (arched) {
      arch(l - .08, r + .08, hi, .38, .049, terraCotta);
      arch(l, r, hi, .27, .066, glass);
    }
    for (let i = 1; i < panes; i++) {
      const mullion = l + (r - l) * i / panes;
      panel(mullion - .065, mullion + .065, lo, hi + (arched ? .24 : 0), .08, terraCotta);
    }
    panel(l, r, lo + (hi - lo) * .6, lo + (hi - lo) * .6 + .07, .08, '#464441');
  }
  function diamond(mid: number, y: number, w: number) {
    batch.quad(p(mid - w, y, .065), p(mid, y + w, .065), p(mid + w, y, .065), p(mid, y - w, .065), terraCotta);
  }
  function canopy(l: number, r: number, y: number) {
    const mid = (l + r) / 2, reach = 1.85;
    for (let j = 0; j < 8; j++) {
      const rim = (i: number, d: number) => p(mid + (r - l) * .5 * Math.cos(i * Math.PI / 8), y + .7 * Math.sin(i * Math.PI / 8), d);
      batch.quad(rim(j, .06), rim(j + 1, .06), rim(j + 1, reach), rim(j, reach), '#65605a');
      batch.tri(p(mid, y, reach), rim(j, reach), rim(j + 1, reach), '#514e49');
    }
    panel(l, r, y - .21, y, reach, '#514e49');
    for (const s of [l + .12, r - .12]) panel(s - .035, s + .035, y - 2.65, y - .12, reach, '#928e80');
  }
  function corbel(s: number, y: number) {
    // The small carved heads project from the ends of the terracotta straps.
    const left = p(s - .17, y + .14, .15), right = p(s + .17, y + .14, .15);
    const face = p(s, y, .36), chin = p(s, y - .24, .20);
    batch.tri(left, right, face, limestone);
    batch.tri(left, face, chin, terraCotta);
    batch.tri(face, right, chin, limestone);
  }
  return { length, panel, arch, sash, diamond, canopy, corbel };
}
type Facade = ReturnType<typeof facade>;

function officeFront(f: Facade, base: number, top: number, count: number) {
  const first = base + 6, pitch = (top - first - .72) / 5, span = f.length / count;
  f.panel(0, f.length, base - .55, first, 0, limestone);
  f.panel(0, f.length, first, top, 0, brick);
  f.panel(0, f.length, first - .3, first + .12, .14, '#dbcfb7');
  f.panel(0, f.length, first + 4 * pitch - .28, first + 4 * pitch, .09, terraCotta);
  for (let j = 0; j < count; j++) {
    const mid = (j + .5) * span, end = j === 0 || j === count - 1;
    const w = span * (end ? .48 : .77);
    if (j === Math.floor(count / 2)) {
      f.panel(mid - w * .55, mid + w * .55, base + .6, first - .5, .04, terraCotta);
      f.arch(mid - w * .68, mid + w * .68, first - .48, .75, .07, terraCotta);
      f.sash(mid - w * .45, mid + w * .45, base + .65, first - .95, true);
    } else f.sash(mid - w / 2, mid + w / 2, base + 1.05, first - .67);
    for (let floor = 0; floor < 5; floor++) {
      const y = first + floor * pitch;
      f.sash(mid - w / 2, mid + w / 2, y + .5, y + pitch - .55, floor === 3, end ? 1 : 3);
      if (floor > 0) f.diamond(mid, y - .04, end ? .22 : .18);
    }
    if (end) {
      f.arch(mid - span * .34, mid + span * .34, top + .46, .25, .06, limestone);
      f.panel(mid - span * .46, mid + span * .46, top - .10, top + .52, 0, deepBrick);
      f.panel(mid - span * .46, mid + span * .46, top + .49, top + .60, .06, limestone);
      for (const s of [mid - span * .46, mid + span * .46]) {
        f.panel(s - .07, s + .07, first + 2.8 * pitch, top + .60, .11, terraCotta);
        f.corbel(s, first + 2.8 * pitch);
        for (let y = first + 2.8 * pitch; y < top; y += .63) f.panel(s - .14, s + .14, y, y + .22, .12, terraCotta);
      }
    }
  }
}

function auditoriumFront(f: Facade, base: number, top: number, count: number, main: boolean) {
  const span = f.length / count, split = base + 5;
  f.panel(0, f.length, base - .55, top, 0, brick);
  f.panel(0, f.length, split - .19, split + .10, .13, limestone);
  f.panel(0, f.length, top - .18, top, .11, terraCotta);
  for (let j = 0; j < count; j++) {
    const l = j * span + .29, r = (j + 1) * span - .29, mid = (l + r) / 2;
    f.panel(l - .08, r + .08, base + .58, split - .33, .035, limestone);
    f.sash(l + .13, r - .13, base + .87, split - .63);
    for (const at of [l + .27 * (r - l), l + .73 * (r - l)]) f.sash(at - .18 * span, at + .18 * span, split + .68, top - 1.1);
    f.panel(mid - .74, mid + .74, top, top + .27, .015, brick);
    if (main && j === Math.floor(count * .66)) {
      // The auditorium has a paired entrance under a voussoired arch and
      // a raised central pediment on the storefront side of the building.
      f.arch(l, r, split - .52, .95, .12, limestone);
      f.arch(l + .14, r - .14, split - .58, .71, .13, '#4e443e');
      f.panel(l + .14, r - .14, base + .7, split - .58, .14, '#634c3f');
      f.panel(mid - .05, mid + .05, base + .7, split - .2, .16, terraCotta);
      f.canopy(l + .45, r - .45, split - .75);
      f.arch(l - .15, r + .15, top, .76, .06, limestone);
      f.arch(l + .08, r - .08, top, .54, .085, brick);
    }
  }
}

// The street-level block is flat. Behind it, the hall roof rises to a short
// ridge. Its north and south slopes and hipped ends follow the 2019 returns.
const auditorium: BuildingFinish = {
  fallbackHeight: 9.27, wall: brick, roof: roofColor,
  drawRing(batch, ring, _hole, base, cap) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], f = facade(batch, a, b);
      const front = Math.min(a[1], b[1]) > -193;
      if (front || Math.max(a[0], b[0]) < 1060) auditoriumFront(f, base, cap, front ? 8 : 6, front);
      else f.panel(0, f.length, base - .6, cap, 0, deepBrick);
    }
  },
  dressRoof(batch, _ring, roof) {
    const corners = [[1070.2, -219.5], [1098.1, -219.5], [1098.1, -199], [1070.2, -199]];
    const eave = roof + 1.93, ridge = roof + 5.95;
    const at = (i: number, h: number) => [corners[i][0], h, corners[i][1]];
    const west = [1076, ridge, -209.2], east = [1092.8, ridge, -209.2];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      batch.quad(at(i, roof), at(j, roof), at(j, eave), at(i, eave), deepBrick);
    }
    batch.quad(at(0, eave), at(1, eave), east, west, roofColor);
    batch.tri(at(1, eave), at(2, eave), east, roofColor);
    batch.quad(at(2, eave), at(3, eave), west, east, roofColor);
    batch.tri(at(3, eave), at(0, eave), west, roofColor);
  },
};

const tower: BuildingFinish = {
  fallbackHeight: 22.44, wall: brick, roof: roofColor,
  drawRing(batch, ring, _hole, base, cap) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], f = facade(batch, a, b);
      const front = Math.min(a[1], b[1]) > -192, bell = Math.min(a[0], b[0]) > 1120;
      // The street cornice stands just above the 320.02 m front roof. The
      // raised end bays project above that line in the Auburn photograph.
      if (front || bell) officeFront(f, base, cap + 1.76, front ? 5 : 7);
      else {
        f.panel(0, f.length, base - .55, cap, 0, deepBrick);
        if (f.length < 5) continue;
        const bays = Math.max(1, Math.round(f.length / 3.6));
        for (let j = 0; j < bays; j++) for (let floor = 0; floor < 5; floor++) {
          const s = (j + .5) * f.length / bays, y = base + 1.1 + floor * 4.12;
          f.sash(s - .65, s + .65, y, y + 2.25);
        }
      }
    }
  },
  dressRoof(batch, _ring, roof) {
    // The taller Auburn-side roof sits inside the stepped footprint. A small
    // service volume stands at its northwest corner.
    batch.box(14.0, 2.78, 15.9, 1112.2, roof + 1.39, -199.05, roofColor);
    batch.box(2.25, 4.39, 3.2, 1104.85, roof + 2.195, -206.1, '#8c8075');
  },
};

export function oddFellowsFinish(b: VBuilding) {
  if (b.id === towerId) return tower;
  if (b.id === auditoriumId) return auditorium;
}
