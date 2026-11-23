import * as THREE from 'three';
import features from '../../../pipeline/prototypes/piedmont-edge/features.json';
import { Builder, type P2 } from '../vignette/geom';

/**
 * The 1920s rough-granite entrances on Piedmont Avenue at 12th and 14th
 * Streets, with black iron gates standing open (the park is open 6 am to
 * 11 pm). Gate positions are reported (OSM gate nodes); every dimension is
 * estimated from photographs; see docs/log/ui/piedmont-gates.
 */
type Ground = (x: number, z: number) => number | null;
type Gate = {
  at: P2; opening: number; pier: number; shaft: number; crown: 'slab' | 'pyramid';
  wall: { length: number; height: number; endPier?: number }; lintel: boolean; sign: boolean; lamps: boolean;
  /** Unit vector into the park, along an axis (default east, off Piedmont Avenue). */
  inward?: P2;
};
const GRANITE = '#8f887c', CAP = '#a49e93', IRON = '#1b1d1f';
const gates: Record<string, Gate> = {
  // 12th Street: flat slab caps and the cut-out PIEDMONT PARK beam. Acorn lamps line the path inside.
  '12th Street': { at: features.gates['12th Street'].at as P2, opening: 6.5, pier: 1.1, shaft: 3.2, crown: 'slab',
    wall: { length: 5, height: .9 }, lintel: false, sign: true, lamps: true },
  // 14th Street: tall piers with stepped pyramid caps and finials, low walls to smaller end piers.
  '14th Street': { at: features.gates['14th Street'].at as P2, opening: 6, pier: 1.2, shaft: 4, crown: 'pyramid',
    wall: { length: 7, height: 1.1, endPier: .7 }, lintel: true, sign: false, lamps: false },
  // 10th Street at Charles Allen Drive (Street View, March 2025): the same stepped pyramid piers either side
  // of the drive, no lintel, and taller granite walls out to end piers. The mapped node is the inner iron
  // gate; the piers stand an estimated 2 m nearer the street, and the park lies north (−z).
  '10th Street': { at: [features.gates['10th Street'].at[0] - .4, features.gates['10th Street'].at[1] + 2] as P2, opening: 8,
    pier: 1.2, shaft: 4.2, crown: 'pyramid', wall: { length: 6.5, height: 1.5, endPier: .9 }, lintel: false, sign: false,
    lamps: false, inward: [0, -1] },
};

function post(b: Builder, x: number, z: number, w: number, y0: number, y1: number, color: string) {
  b.box(w, y1 - y0, w, x, (y0 + y1) / 2, z, color);
}

/** Where a gate stands, which way is into the park and how wide its opening is. */
export const gateFrame = (name: string) => ({ at: gates[name].at, inward: gates[name].inward ?? [1, 0] as P2, opening: gates[name].opening });

/** Granite and iron in one mesh; acorn globes in a second that glows at night. */
export function piedmontGates(ground: Ground, names: string[] = ['12th Street', '14th Street']) {
  const b = new Builder(), glow = new Builder();
  for (const g of names.map(n => gates[n])) {
    const IN = g.inward ?? [1, 0], ALONG: P2 = [-IN[1], IN[0]];
    const base = ground(...g.at);
    if (base === null) continue;
    const at = (along: number, inward = 0): P2 => [g.at[0] + ALONG[0] * along + IN[0] * inward, g.at[1] + ALONG[1] * along + IN[1] * inward];
    const half = g.opening / 2;
    for (const side of [-1, 1]) {
      const [px, pz] = at(side * (half + g.pier / 2));
      const y = ground(px, pz) ?? base, top = y + g.shaft;
      post(b, px, pz, g.pier, y - .3, top, GRANITE);
      post(b, px, pz, g.pier + .25, top, top + .2, CAP);
      if (g.crown === 'pyramid') {
        post(b, px, pz, g.pier + .05, top + .2, top + .45, CAP);
        const r = (g.pier + .05) / 2;
        const c = [[px - r, pz - r], [px + r, pz - r], [px + r, pz + r], [px - r, pz + r]];
        for (let i = 0; i < 4; i++) b.tri([c[i][0], top + .45, c[i][1]], [c[(i + 1) % 4][0], top + .45, c[(i + 1) % 4][1]], [px, top + 1.1, pz], CAP);
        post(b, px, pz, .12, top + 1.1, top + 1.5, CAP);
      }
      // Black steel gate post inside each pier, and the leaf swung open against the path edge.
      const [qx, qz] = at(side * (half - .12));
      const qy = ground(qx, qz) ?? base, leafH = g.crown === 'pyramid' ? 3.8 : 3.4;
      post(b, qx, qz, .18, qy, qy + leafH + .3, IRON);
      const leaf = half - .2;
      // Top and bottom rails run inward along the open leaf.
      const [rx, rz] = [Math.abs(IN[0]) * leaf + Math.abs(IN[1]) * .05, Math.abs(IN[1]) * leaf + Math.abs(IN[0]) * .05];
      for (const h of [.15, leafH - .1]) b.box(rx, .06, rz, qx + IN[0] * leaf / 2, qy + h, qz + IN[1] * leaf / 2, IRON);
      for (let k = 1; k <= 9; k++) {
        const t = k / 10 * leaf, [bx, bz] = [qx + IN[0] * t, qz + IN[1] * t];
        // Arched top at 14th Street, flat at 12th.
        const rise = g.crown === 'pyramid' ? .5 * Math.sin(Math.PI * k / 10) : 0;
        post(b, bx, bz, .035, qy + .15, qy + leafH - .1 + rise, IRON);
      }
      if (g.sign) {
        // The PIEDMONT PARK beam runs from the pier to the gate post, about 3 m up.
        const mid = at(side * (half + .05));
        b.box(.12, .5, .75, mid[0], (ground(...mid) ?? base) + 3.05, mid[1], IRON);
      }
      // Low rough-granite wall along the street, ending in a smaller pier at 14th.
      const w0 = half + g.pier, w1 = w0 + g.wall.length;
      for (let s = w0; s < w1; s += 1) {
        const [ax, az] = at(side * s), [cx, cz] = at(side * Math.min(w1, s + 1));
        const ya = ground(ax, az) ?? base, yc = ground(cx, cz) ?? base;
        for (const o of [-.25, .25]) b.quad([ax + IN[0] * o, ya - .3, az + IN[1] * o], [cx + IN[0] * o, yc - .3, cz + IN[1] * o],
          [cx + IN[0] * o, yc + g.wall.height, cz + IN[1] * o], [ax + IN[0] * o, ya + g.wall.height, az + IN[1] * o], GRANITE);
        b.quad([ax - IN[0] * .3, ya + g.wall.height, az - IN[1] * .3], [cx - IN[0] * .3, yc + g.wall.height, cz - IN[1] * .3],
          [cx + IN[0] * .3, yc + g.wall.height, cz + IN[1] * .3], [ax + IN[0] * .3, ya + g.wall.height, az + IN[1] * .3], CAP);
      }
      if (g.wall.endPier) {
        const [ex, ez] = at(side * (w1 + g.wall.endPier / 2)), ey = ground(ex, ez) ?? base;
        // End piers stand half a metre above their wall.
        const eh = Math.max(1.5, g.wall.height + .5);
        post(b, ex, ez, g.wall.endPier, ey - .3, ey + eh, GRANITE);
        post(b, ex, ez, g.wall.endPier + .15, ey + eh, ey + eh + .15, CAP);
      }
    }
    if (g.lintel) {
      const [lx, lz] = at(0);
      b.box(.12, .14, g.opening - .1, lx, base + 4.1, lz, IRON);
    }
    if (g.lamps) for (const side of [-1, 1]) {
      // Black acorn path lamps just inside, about 4.2 m to the globe (estimated positions).
      const [lx, lz] = at(side * 3.6, 9), ly = ground(lx, lz) ?? base;
      post(b, lx, lz, .3, ly, ly + .5, IRON);
      post(b, lx, lz, .12, ly + .5, ly + 3.8, IRON);
      glow.box(.42, .55, .42, lx, ly + 4.1, lz, '#ffd9a0');
      post(b, lx, lz, .22, ly + 4.37, ly + 4.5, IRON);
    }
  }
  const group = new THREE.Group();
  group.name = 'piedmont-gates';
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const lamps = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#ffb45a', emissiveIntensity: 0 });
  for (const [builder, mat] of [[b, material], [glow, lamps]] as const) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(builder.pos, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(builder.col, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  return { group, setNight(night: number) { lamps.emissiveIntensity = night * 3; } };
}
