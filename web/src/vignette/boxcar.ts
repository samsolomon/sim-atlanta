import type { Builder } from './geom';

export type BoxcarPaint = 'oxide' | 'faded' | 'blue';

/** Body colours. `faded` follows a sun-bleached ex-Southern car (SOU 531111, June 2016) with
 * painted-out patches; `blue` a dark CSX-family car (Danville, 1987). Inputs are set brighter than
 * the photos because the City colour grade crushes dark blues. No lettering or numbers. */
const PAINT = {
  oxide: { body: '#9c5940', rib: '#854632', roof: '#8a8177', roofRib: '#a59b8c', patch: null },
  faded: { body: '#a86a52', rib: '#8f5640', roof: '#8d857c', roofRib: '#9c9488', patch: '#7e4232' },
  blue: { body: '#3f5d84', rib: '#33506f', roof: '#5f6a76', roofRib: '#6c7783', patch: null },
} as const;

/** 50-foot-class boxcar: sliding door, exterior posts and a ribbed roof above the shared underframe. */
export function boxcarBody(b: Builder, paint: BoxcarPaint) {
  const p = PAINT[paint];
  b.box(3.04, 2.94, 15.75, 0, 2.84, 0, p.body);
  b.box(3.16, .18, 15.94, 0, 4.39, 0, p.roof);
  for (const side of [-1, 1]) {
    b.box(.1, 2.55, 3.07, side * 1.55, 2.76, 0, p.rib); // sliding door
    for (const z of [-7.5, -6.1, -4.7, -3.3, -1.65, 1.65, 3.3, 4.7, 6.1, 7.5])
      b.box(.12, 2.91, .11, side * 1.54, 2.83, z, p.rib);
    // Painted-out reporting marks and data panels: darker fresh paint over a bleached side.
    if (p.patch) for (const [z, y, w, h] of [[-5.4, 3.55, 2.3, .55], [-5.4, 2.0, 1.2, .5], [4.9, 3.2, 2.0, .7]] as const) {
      const x = side * 1.523, z0 = side * z - w / 2, z1 = side * z + w / 2;
      const corners = [[x, y - h / 2, z0], [x, y - h / 2, z1], [x, y + h / 2, z1], [x, y + h / 2, z0]];
      if (side > 0) corners.reverse(); // face outward on both sides
      b.quad(corners[0], corners[1], corners[2], corners[3], p.patch);
    }
  }
  for (let z = -7; z <= 7; z += 1.4) b.box(3.12, .08, .09, 0, 4.5, z, p.roofRib);
}
