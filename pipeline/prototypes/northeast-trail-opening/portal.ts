// Private Segment 2 fixture. The caller supplies the northbound trail owner's
// tread sections. All offsets are to the right looking north, in scene metres.
import type { OpenSlot } from '../../../web/src/terrain/openings';

import {trailBore, trailHalfWidth, trailPoint, trailStations} from '../northeast-trail/path';

type V = [number, number, number];
type Quad = (a: V, b: V, c: V, d: V, colour: string) => void;
type Ground = (x: number, z: number) => number | null;

// Inferred existing railway box and margins. The paved path occupies 14 feet.
const treadHalf = trailHalfWidth;
const wallOffset = 3.6;
const headroom = 7.0;
const slab = 0.45;
const approach = 6;
const lift = ([x, y, z]: V, h: number): V => [x, y + h, z];

export function trailOpening(
  originalGround: Ground, quad: Quad,
): OpenSlot[] {
  const [south, north] = trailBore;
  const point = trailPoint;
  const from = south - approach, to = north + approach;
  const levels = [...new Set([from, south, north, to, ...trailStations().filter(s => s > from && s < to)])]
    .sort((a, b) => a - b);
  function section(s: number) {
    const wing = Math.max(0, Math.min(1, (s-from)/approach, (to-s)/approach));
    const half = treadHalf + wing * (wallOffset - treadHalf);
    return {s, wing, half, left: point(s,-half), right: point(s,half), centre: point(s,0)};
  }
  const rows = levels.map(section);
  const slots: OpenSlot[] = [];
  for (let i=1; i<rows.length; i++) {
    const a=rows[i-1], b=rows[i];
    const inside = a.s >= south && b.s <= north;
    // Keep undisturbed earth and the three upper road surfaces above the roof.
    // In each approach the original terrain meets the outside of the wing.
    const depth=.12;
    slots.push({start:lift(a.centre,-depth), end:lift(b.centre,-depth),
      halfWidthM:wallOffset, ...(inside ? {cutHeightM:depth+headroom+slab-.05} : {}),
      footprint:[a.left,a.right,b.right,b.left].map(([x,,z])=>[x,z] as const)});
    for (const side of [-1,1] as const) {
      const sideAt=(r: ReturnType<typeof section>) => side === -1 ? r.left : r.right;
      const pa=sideAt(a), pb=sideAt(b);
      const ha=(p:V, wing:number) => inside ? headroom :
        Math.max(0, (originalGround(p[0],p[2]) ?? p[1])-p[1], (headroom+slab)*wing);
      const ta=lift(pa,ha(pa,a.wing)), tb=lift(pb,ha(pb,b.wing));
      quad(pa,pb,tb,ta,'#b1aa9e');
      // Gravel margins meet the registered concrete edge. The buried 2 cm lap
      // accommodates Float32 rounding at the joins.
      quad(lift(point(a.s,side*(treadHalf-.02)),-.006),pa,pb,
        lift(point(b.s,side*(treadHalf-.02)),-.006),'#837e74');
      const outerA=point(a.s,side*(a.half+.32)), outerB=point(b.s,side*(b.half+.32));
      const ca=inside ? lift(pa,headroom+slab) : ta;
      const cb=inside ? lift(pb,headroom+slab) : tb;
      const oa:V=[outerA[0],ca[1],outerA[2]], ob:V=[outerB[0],cb[1],outerB[2]];
      quad(ca,cb,ob,oa,'#aaa497');
      quad(outerA,outerB,ob,oa,'#aaa497');
    }
    if (inside) {
      quad(lift(a.left,headroom),lift(b.left,headroom),lift(b.right,headroom),lift(a.right,headroom),'#979388');
      quad(lift(a.right,headroom+slab),lift(b.right,headroom+slab),lift(b.left,headroom+slab),lift(a.left,headroom+slab),'#aaa497');
    }
  }
  for (const s of trailBore) {
    const a=point(s,-wallOffset), b=point(s,wallOffset);
    // A shallow header projects beyond the angled threshold. This keeps both
    // wheel paths under the lip as the approach direction turns at the node.
    const near = point(s === south ? s+1 : s-1, 0), centre = point(s,0);
    const dx=centre[0]-near[0], dz=centre[2]-near[2], length=Math.hypot(dx,dz);
    const lip=(p:V):V=>[p[0]+.25*dx/length,p[1],p[2]+.25*dz/length];
    const l=lip(a), r=lip(b);
    quad(lift(a,headroom),lift(b,headroom),lift(r,headroom),lift(l,headroom),'#979388');
    quad(lift(a,headroom+slab),lift(b,headroom+slab),lift(r,headroom+slab),lift(l,headroom+slab),'#aaa497');
    quad(lift(l,headroom),lift(r,headroom),lift(r,headroom+slab),lift(l,headroom+slab),'#c0b9ab');
    for(const [p,q] of [[a,l],[b,r]]) {
      quad(lift(p,headroom),lift(q,headroom),lift(q,headroom+slab),lift(p,headroom+slab),'#aaa497');
    }
  }
  // June 2026 north-facing panorama shows fixtures along the east side.
  // Spacing, size and height are illustrative. No per-fixture light sources.
  for(let s=south+8;s<north-3;s+=12) {
    const a=point(s-.25,wallOffset-.05), b=point(s+.25,wallOffset-.05);
    quad(lift(a,3.0),lift(b,3.0),lift(b,3.18),lift(a,3.18),'#ffe6ac');
  }
  return slots;
}
