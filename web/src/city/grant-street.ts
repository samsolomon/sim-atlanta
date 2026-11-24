// Grant Street SE under the eight CSX tracks. Local geometry and NAVD88
// evidence are documented in docs/king-freight-crossings.md.
import type { MeshLambertMaterial } from 'three';
import type { Builder } from '../vignette/geom';
import { PAL, type VRoad } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';

type Ground = (x: number, z: number) => number | null;
const deckNavd = 313.66;
const centre = (z: number) => 1381.41 + ((z - 488.14) * 0.73) / 39.29;
const roadNavd = (z: number) => 307.66 + (z - 488.14) * 0.0046;
const edge = (x: number, south: boolean) => (south ? 527.5 : 486.5) - (x - 1382) * (south ? 0.37 : 0.34);
const smooth = (distance: number, width: number) => {
  const t = Math.max(0, Math.min(1, distance / width));
  return t * t * (3 - 2 * t);
};

// Keep the street on the actual drawn triangles. Interpolate the two portal
// returns across the occluded pavement, feathering the approach and verges
// back into the DEM before either terrain tier chooses its triangulation.
export class GrantStreetGround extends GroundGrid {
  override node(row: number, col: number) {
    const y = super.node(row, col);
    const { bounds, stepM } = this.manifest;
    const z = bounds.minZ + row * stepM;
    if (y === null || z <= 465 || z >= 550) return y;
    const x = bounds.minX + col * stepM;
    const weight = smooth(22 - Math.abs(x - centre(z)), 10) * smooth(z - 465, 20) * smooth(550 - z, 20);
    const pavement = y + weight * (roadNavd(z) - y);
    // Approach fill rises outside the walls and rolls down into the original
    // terrain over the shoulder. The street and its painted sidewalks stay flat.
    const offset = Math.abs(x - centre(z));
    const bank =
      smooth(offset - 12, 10) *
      smooth(x - 1338, 15) *
      smooth(1442 - x, 16) *
      smooth(z - edge(x, false) + 8, 12) *
      smooth(edge(x, true) + 8 - z, 12);
    return pavement + bank * Math.max(0, deckNavd - 0.35 - pavement);
  }
}

/** Paint the two street approaches and the mapped bore in one stroke per
 * material. Adjacent butt caps leave a transverse hairline at low texel density. */
export function grantBoardRoads(roads: VRoad[]) {
  const grant = roads.filter((r) => r.name === 'Grant Street Southeast');
  const tunnel = grant.find((r) => r.tunnel);
  if (!tunnel) return roads;
  const pts = [...tunnel.pts];
  const joined = new Set([tunnel]);
  for (const road of grant) {
    if (road === tunnel) continue;
    for (const run of [road.pts, [...road.pts].reverse()]) {
      if (run.at(-1)![0] === pts[0][0] && run.at(-1)![1] === pts[0][1]) {
        pts.unshift(...run.slice(0, -1));
        joined.add(road);
        break;
      }
      if (run[0][0] === pts.at(-1)![0] && run[0][1] === pts.at(-1)![1]) {
        pts.push(...run.slice(1));
        joined.add(road);
        break;
      }
    }
  }
  return [...roads.filter((r) => !joined.has(r)), { ...tunnel, tunnel: false, pts }];
}

// The bare-earth DEM follows the road instead of the yard for about 70 m.
// Restore the missing formation, easing back into the measured banks.
export function grantFormation(x: number, ground: number, zero: number) {
  const weight = Math.max(0, Math.min(1, (x - 1338) / 15, (1442 - x) / 16));
  return ground + weight * Math.max(0, deckNavd - zero - ground);
}

export function drawGrantStreet(b: Builder, ground: Ground, zero: number) {
  const top = deckNavd - zero;
  const roadY = (z: number) => roadNavd(z) - zero;
  // Portals follow the skew of the railway. Eight parallel ballast ribbons
  // remain part of the existing freight batch, including over the opening.

  const row = (x: number, south: boolean) => {
    const z = edge(x, south),
      y = ground(x, z)!;
    return [x, Math.min(top, grantFormation(x, y, zero)) - 0.05, z];
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
    b.quad(a, d, [x, roadY(d[2]) - 0.2, d[2]], [x, roadY(a[2]) - 0.2, a[2]], PAL.concrete);
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
    const pt = (y: number, z: number) => [x, roadY(z) + y, z];
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
}

// Warm wall lights are visible in the daytime panorama. The falloff and
// after-dark intensity are illustrative. Shade the existing batch in place.
export function grantLighting(material: MeshLambertMaterial, night: { value: number }, zero: number) {
  const previous = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
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
      float pane = length(vec3((side - 6.86)*2., (p.y - ${(310.6 - zero).toFixed(3)})*2., along));
      float lamp = 1.0 - smoothstep(.18,.38,pane);
      float spill = exp(-.14*abs(along) - .24*abs(side-6.86) - .28*abs(p.y - ${(310.6 - zero).toFixed(3)}));
      float inside = step(side,7.0)*step(p.y,${(312.15 - zero).toFixed(3)})*smoothstep(486.,490.,p.z)*(1.-smoothstep(525.,529.,p.z));
      outgoingLight += inside*grantNight*vec3(1.,.72,.42)*(lamp + spill*.55*diffuseColor.rgb);
      #include <opaque_fragment>`,
      );
  };
}
