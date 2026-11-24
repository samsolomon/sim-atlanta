// Grant Street SE under the eight CSX tracks. Local geometry and NAVD88
// evidence are documented in docs/king-freight-crossings.md.
import type { MeshLambertMaterial } from 'three';
import type { Builder, P2 } from '../vignette/geom';
import { PAL } from '../vignette/world';
import type { GroundYield } from '../terrain/surface';

type Ground = (x: number, z: number) => number | null;
const zero = 323.8;
const centre = (z: number) => 1381.41 + ((z - 488.14) * 0.73) / 39.29;
export const grantRoadY = (z: number) => 307.66 + (z - 488.14) * 0.0046 - zero;
const top = 313.66 - zero;

// The bare-earth DEM follows the road instead of the yard for about 70 m.
// Restore the missing formation, easing back into the measured banks.
export function grantFormation(x: number, ground: number) {
  const weight = Math.max(0, Math.min(1, (x - 1338) / 15, (1442 - x) / 16));
  return ground + weight * Math.max(0, top - ground);
}

export const grantCut: GroundYield = {
  ring: [
    [-6.8, 478],
    [6.8, 478],
    [6.8, 537],
    [-6.8, 537],
  ].map(([d, z]) => [centre(z) + d, z] as P2),
  floor: (_x, z) => grantRoadY(z) - 0.08,
};

export function drawGrantStreet(b: Builder, ground: Ground) {
  // Portals follow the skew of the railway. Eight parallel ballast ribbons
  // remain part of the existing freight batch, including over the opening.
  const edge = (x: number, south: boolean) => (south ? 527.5 : 486.5) - (x - 1382) * (south ? 0.37 : 0.34);
  const row = (x: number, south: boolean) => {
    const z = edge(x, south),
      y = ground(x, z)!;
    return [x, Math.min(top, grantFormation(x, y)) - 0.05, z];
  };
  const west = 1375.1,
    east = 1388.9;
  for (const [lo, hi] of [
    [1338, west],
    [west, east],
    [east, 1442],
  ]) {
    const span = lo === west,
      n = Math.ceil((hi - lo) / 3);
    for (let i = 0; i < n; i++) {
      const x = lo + ((hi - lo) * i) / n,
        xx = lo + ((hi - lo) * (i + 1)) / n;
      const a = row(x, false),
        d = row(x, true),
        c = row(xx, true),
        e = row(xx, false);
      b.quad(a, d, c, e, PAL.ballastFreight);
      const base = (p: number[]) => [p[0], span ? top - 1.5 : ground(p[0], p[2])! - 0.18, p[2]];
      for (const [v, w] of [
        [a, e],
        [c, d],
      ])
        b.quad(v, w, base(w), base(v), span ? PAL.concrete : '#9b917d');
      if (span) b.quad(base(a), base(e), base(c), base(d), PAL.concreteDark);
    }
  }
  for (const x of [west, east]) {
    const a = row(x, false),
      d = row(x, true);
    b.quad(a, d, [x, grantRoadY(d[2]) - 0.2, d[2]], [x, grantRoadY(a[2]) - 0.2, a[2]], PAL.concrete);
  }
  // Shallow steel crossbeams beneath the ballasted slab. The painted
  // abutments have a repeating ochre diamond in the Grant St panorama.
  for (let s = 1; s < 39; s += 3.2) {
    const beam = (x: number, d: number, y: number) => [x, top - y, edge(x, false) + s + d];
    const a = beam(west, 0, 1.5),
      c = beam(east, 0, 1.5);
    const lowA = beam(west, 0, 1.62),
      lowC = beam(east, 0, 1.62);
    const backA = beam(west, 0.22, 1.62),
      backC = beam(east, 0.22, 1.62);
    b.quad(a, c, lowC, lowA, PAL.girder);
    b.quad(lowA, lowC, backC, backA, PAL.girder);
    b.quad(backA, backC, beam(east, 0.22, 1.5), beam(west, 0.22, 1.5), PAL.girder);
  }
  for (const x of [west + 0.025, east - 0.025]) {
    const pt = (y: number, z: number) => [x, grantRoadY(z) + y, z];
    for (let z = edge(x, false) + 1.5; z < edge(x, true) - 1.5; z += 2.6) {
      for (const sign of [-1, 1]) {
        const p = pt(2.3, z + sign * 1.25),
          q = pt(0.65, z),
          r = pt(3.95, z);
        for (const end of [q, r])
          b.quad(p, [x, p[1] + 0.12, p[2]], [x, end[1] + 0.12, end[2]], end, '#ad935d');
      }
    }
  }
  // The mapped road carries on through both portals. Match the existing
  // street's crossfall at the ends of the short approach transitions.
  const at = (d: number, z: number, lift: number) => {
    const x = centre(z) + d,
      blend = Math.max(0, Math.min(1, (z - 478) / 8, (537 - z) / 8));
    const y = ground(x, z)!;
    return [x, y + (grantRoadY(z) - y) * blend + lift, z];
  };
  for (let z = 478; z < 537; z++) {
    for (const [left, right, lift, colour] of [
      [-6.65, -4.5, 0.19, PAL.sidewalk],
      [-4.5, 4.5, 0.065, PAL.asphalt],
      [4.5, 6.65, 0.19, PAL.sidewalk],
      [-0.19, -0.06, 0.08, PAL.lineYellow],
      [0.06, 0.19, 0.08, PAL.lineYellow],
    ] as const)
      b.quad(at(left, z, lift), at(left, z + 1, lift), at(right, z + 1, lift), at(right, z, lift), colour);
  }
}

// Warm wall lights are visible in the daytime panorama. The falloff and
// after-dark intensity are illustrative. Shade the existing batch in place.
export function grantLighting(material: MeshLambertMaterial, night: { value: number }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.grantNight = night;
    shader.vertexShader =
      'varying vec3 grantPosition;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n grantPosition = position;',
      );
    shader.fragmentShader =
      'uniform float grantNight; varying vec3 grantPosition;\n' +
      shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `
      vec3 p = grantPosition;
      float side = abs(p.x - 1382.0);
      float along = mod(p.z - 491.0 + 4.5, 9.0) - 4.5;
      float pane = length(vec3((side - 6.86)*2., (p.y + 13.2)*2., along));
      float lamp = 1.0 - smoothstep(.18,.38,pane);
      float spill = exp(-.14*abs(along) - .24*abs(side-6.86) - .28*abs(p.y+13.2));
      float inside = step(side,7.0)*step(p.y,-11.65)*smoothstep(486.,490.,p.z)*(1.-smoothstep(525.,529.,p.z));
      outgoingLight += inside*grantNight*vec3(1.,.72,.42)*(lamp + spill*.55*diffuseColor.rgb);
      #include <opaque_fragment>`,
      );
  };
}
