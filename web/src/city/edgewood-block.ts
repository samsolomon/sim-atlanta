import type { BuildingFinish, VBuilding } from '../vignette/world';

// March 2025 Edgewood/Hilliard panoramas show a shallow commercial frontage,
// with dark display glazing and a brick fascia. The map has one envelope.
const commercialRow: BuildingFinish = {
  wall: '#996e58', roof: '#9a9692', fallbackHeight: 5.3,
  drawRing(batch, ring, _hole, base, top) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      batch.quad([a[0],base-.5,a[1]], [b[0],base-.5,b[1]], [b[0],top,b[1]], [a[0],top,a[1]], '#996e58');
      if (Math.max(a[1],b[1]) > -42) continue;
      const length = Math.hypot(b[0]-a[0], b[1]-a[1]);
      const bays = Math.round(length / 4.4);
      const p = (u: number, h: number) => [a[0]+(b[0]-a[0])*u,base+h,a[1]+(b[1]-a[1])*u-.05];
      const band = (l: number, r: number, lo: number, hi: number, color: string) =>
        batch.quad(p(l,lo), p(r,lo), p(r,hi), p(l,hi), color);
      band(0,1,3.65,3.95,'#554f48');
      for (let j = 0; j < bays; j++) {
        const l = (j+.06)/bays, r = (j+.94)/bays;
        const mid = (l+r)/2, frame = .07/length;
        for (const [left,right] of [[l,mid-frame],[mid+frame,r]]) {
          band(left,right,.55,2.85,'#798680');
          band(left,right,2.98,3.6,'#98a09b');
        }
      }
    }
  },
};
export function edgewoodFinish(b: VBuilding): BuildingFinish | undefined {
  if (b.id === 'osm:way:270493781') return commercialRow;
  if (b.id === 'osm:way:270493815') return { wall: '#a06f59', roof: '#ada9a1' };
}
