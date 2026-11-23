import { BufferAttribute, DoubleSide, Group, Mesh, MeshLambertMaterial } from 'three';
import { Builder, rng } from '../vignette/geom';

export const heritageId = 'osm:way:173532779';
export const bigBethelId = 'osm:way:97337613';

// Both sign frames clear the widest part of the spire at the bottom of the lettering.
export const bethelSign = { x: 1031.7, z: -198.6, y: 330, offset: 2.05, width: 4.35, height: 3.35 };

const brick = '#995b46', trim = '#d8cdb6', stone = '#a49e8e', slate = '#625e60';
type Point = [number, number, number];

function block(b: Builder, x0: number, x1: number, z0: number, z1: number, lo: number, hi: number, color: string) {
  b.box(x1 - x0, hi - lo, z1 - z0, (x1 + x0) / 2, (hi + lo) / 2, (z1 + z0) / 2, color);
}

// A gable between two parallel end walls; cross gables turn the ridge east/west.
function gable(b: Builder, x0: number, x1: number, z0: number, z1: number, eave: number, ridge: number, wall: string, cross = false) {
  const p = (u: number, v: number, h: number) => [x0 + (x1 - x0) * (cross ? v : u), h, z0 + (z1 - z0) * (cross ? u : v)];
  for (const v of [0, 1]) b.tri(p(0, v, eave), p(1, v, eave), p(.5, v, ridge), wall);
  for (const u of [0, 1]) b.quad(p(u, 0, eave), p(u, 1, eave), p(.5, 1, ridge), p(.5, 0, ridge), slate);
}

// A low-poly arch with a masonry surround and individual glazing bars.
// End walls run along x; side walls run along z.
function arch(b: Builder, x: number, z: number, direction: 'west' | 'east' | 'north' | 'south', width: number, sill: number, head: number, glass = '#565d66', surround = trim) {
  const side = direction === 'west' || direction === 'east';
  const p = (u: number, y: number, d: number): Point => [x + (side ? d : u), y, z + (side ? u : d)];
  const face = (w: number, lo: number, hi: number, d: number, color: string) => {
    const spring = hi - w * .43;
    b.quad(p(-w / 2, lo, d), p(w / 2, lo, d), p(w / 2, spring, d), p(-w / 2, spring, d), color);
    for (let i = 0; i < 8; i++) {
      const rim = (j: number) => p(w * .5 * Math.cos(j * Math.PI / 8), spring + w * .43 * Math.sin(j * Math.PI / 8), d);
      b.tri(p(0, spring, d), rim(i), rim(i + 1), color);
    }
  };
  const offset = direction === 'west' || direction === 'north' ? -.03 : .03;
  face(width, sill, head, 0, surround);
  face(width - .26, sill + .14, head - .15, offset, glass);
  for (const u of (width > 3 ? [-width * .24, 0, width * .24] : [0])) {
    b.quad(p(u - .035, sill + .14, 2 * offset), p(u + .035, sill + .14, 2 * offset),
      p(u + .035, head - .23 - Math.abs(u) * .23, 2 * offset), p(u - .035, head - .23 - Math.abs(u) * .23, 2 * offset), surround);
  }
  const y = sill + (head - sill) * .52;
  b.quad(p(-width * .45, y, 2 * offset), p(width * .45, y, 2 * offset), p(width * .45, y + .07, 2 * offset), p(-width * .45, y + .07, 2 * offset), surround);
}

function heritage(b: Builder) {
  // Main sanctuary west of the narrow lightwell; the east education wing has
  // a lower, flat roof and continues south past the sanctuary.
  block(b, 1600.8, 1616.1, -167.5, -133.8, 302.5, 307.2, trim);
  block(b, 1600.8, 1616.1, -167.5, -133.8, 307.2, 312.6, brick);
  gable(b, 1600.7, 1616.2, -164.1, -135.3, 312.6, 320.1, brick);
  block(b, 1619, 1630.8, -167.4, -125.6, 303.0, 312.6, '#9d624b');
  block(b, 1616, 1619, -167.4, -162.9, 303.1, 312.6, brick);
  block(b, 1618.9, 1630.9, -167.5, -125.5, 312.55, 312.8, '#8f8176');
  // Shallow projecting corner towers frame a gabled central front.
  for (const x of [1600.8, 1611.55]) {
    block(b, x, x + 4.55, -167.65, -160.8, 307.15, 319.82, brick);
    block(b, x - .08, x + 4.63, -167.73, -160.72, 319.72, 319.96, '#81513f');
    for (const u of [x + .18, x + 4.37]) block(b, u - .14, u + .14, -167.7, -167.15, 319.8, 320.7, brick);
    arch(b, x + 2.27, -167.72, 'north', 1.32, 314.9, 318.45);
    arch(b, x + 2.27, -167.72, 'north', .95, 309.2, 311.7);
    for (const u of [-.48, .48]) arch(b, x + 2.27 + u, -167.72, 'north', .88, 304.05, 306.15);
    block(b, x - .05, x + 4.60, -167.8, -167.47, 313.35, 313.63, '#8a5342');
  }
  arch(b, 1600.73, -164.1, 'west', 1.85, 315.0, 318.8);
  block(b, 1605.3, 1611.6, -167.52, -160.55, 307, 317.45, brick);
  gable(b, 1605.2, 1611.7, -167.6, -161.0, 317.45, 320.75, brick);
  for (const [x, hi] of [[1606.85, 317.85], [1608.45, 318.7], [1610.05, 317.85]]) {
    arch(b, x, -167.67, 'north', 1.2, 314.2, hi);
    arch(b, x, -167.68, 'north', .79, 309.5, hi - 6.3);
  }
  block(b, 1606.65, 1610.3, -167.74, -167.54, 303.65, 306.9, '#483c36');
  for (const z of [-158.1, -153.3, -148.7, -144.1, -139.3]) {
    arch(b, 1600.68, z, 'west', 1.6, 308.15, 311.95);
    arch(b, 1600.68, z, 'west', 1.32, 304.35, 306.48);
    block(b, 1600.55, 1600.82, z - 1.40, z - 1.09, 304.1, 312.45, brick);
  }
  for (const z of [-158.1, -139.3]) {
    gable(b, 1600.38, 1605.8, z - 2.8, z + 2.8, 312.48, 315.28, brick, true);
    arch(b, 1600.32, z, 'west', 2.0, 312.5, 314.35);
  }
  for (const z of [-161, -153, -145, -137, -129]) {
    arch(b, 1630.87, z, 'east', 1.65, 307.8, 310.9);
  }
  for (const x of [1621.5, 1624.9, 1628.1]) {
    block(b, x - .85, x + .85, -167.49, -167.35, 307.7, 310.85, trim);
    block(b, x - .70, x + .70, -167.51, -167.40, 307.85, 310.70, '#59595a');
  }
  block(b, 1623.0, 1626.4, -167.52, -167.41, 304.2, 307.1, '#4f4038');
}

function turret(b: Builder, x: number, z: number, r0: number, r1: number, lo: number, hi: number, sides: number, color: string) {
  const p = (i: number, r: number, y: number) => [x + r * Math.cos(2 * Math.PI * i / sides), y, z + r * Math.sin(2 * Math.PI * i / sides)];
  for (let i = 0; i < sides; i++) {
    b.quad(p(i, r0, lo), p(i + 1, r0, lo), p(i + 1, r1, hi), p(i, r1, hi), color);
    b.tri([x, hi, z], p(i, r1, hi), p(i + 1, r1, hi), color);
  }
}

// Sparse courses break up the rough-cut granite on the two most exposed
// tower faces. Openings stand proud of these shallow stones.
function belfryStones(b: Builder) {
  const random = rng(220);
  for (let y = 297.1; y < 321.8; y += .43) {
    for (const east of [false, true]) {
      const width = east ? 7.5 : 6.45;
      for (let u = random() * .45; u < width - .4;) {
        const end = Math.min(width, u + .45 + random() * .75);
        const face = (s: number, h: number) => east ? [1034.57, h, -203.22 + s] : [1028.05 + s, h, -195.63];
        if (random() < .30) b.quad(face(u, y), face(end - .03, y), face(end - .03, y + .35), face(u, y + .36), random() < .5 ? '#979384' : '#b3ad9d');
        u = end;
      }
    }
  }
}

function bigBethel(b: Builder) {
  block(b, 1015.2, 1039.15, -234.6, -201.25, 295.0, 308.65, stone);
  gable(b, 1015.1, 1039.25, -234.65, -201.1, 308.65, 315.65, stone);
  block(b, 1011.6, 1041.18, -222.9, -212.7, 295.1, 308.7, stone);
  gable(b, 1011.5, 1041.28, -223.0, -212.6, 308.7, 312.8, stone, true);
  turret(b, 1026.5, -233.4, 4.2, 4.2, 295.5, 305.5, 12, stone);
  turret(b, 1026.5, -233.4, 4.28, .3, 305.5, 308.7, 12, slate);
  // A short round turret and a much taller square belfry flank the porch.
  turret(b, 1017.85, -198.3, 2.77, 2.77, 295.65, 311.9, 16, stone);
  turret(b, 1017.85, -198.3, 2.9, 2.6, 311.9, 312.6, 16, '#c3baa6');
  turret(b, 1017.85, -198.3, 2.6, 2.55, 312.6, 315.85, 12, stone);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    block(b, 1017.6 + 2.4 * Math.cos(angle), 1018.1 + 2.4 * Math.cos(angle),
      -198.55 + 2.4 * Math.sin(angle), -198.05 + 2.4 * Math.sin(angle), 315.8, 316.38, stone);
  }
  block(b, 1028.0, 1034.55, -203.25, -195.65, 295.1, 322.22, stone);
  for (const y of [305.6, 314.6, 316.0, 321.95]) block(b, 1027.86, 1034.69, -203.37, -195.52, y, y + .31, '#c3bda9');
  for (const x of [1028.4, 1034.15]) for (const z of [-202.85, -196.05]) {
    turret(b, x, z, .53, .11, 322.20, 323.9, 4, '#b0a794');
  }
  belfryStones(b);
  arch(b, 1017.85, -195.47, 'south', 1.24, 300.6, 304.2);
  arch(b, 1017.85, -195.62, 'south', 1.14, 313.05, 315.03, '#4c4940');
  arch(b, 1015.02, -198.3, 'west', 1.12, 302.4, 305.8);
  arch(b, 1031.25, -203.32, 'north', 3.1, 316.65, 321.35, '#494740');
  arch(b, 1027.90, -199.35, 'west', 3.1, 316.65, 321.35, '#494740');
  arch(b, 1031.25, -195.48, 'south', 3.1, 316.65, 321.35, '#494740');
  arch(b, 1034.73, -199.35, 'east', 3.15, 316.65, 321.35, '#494740');
  arch(b, 1031.25, -195.48, 'south', 2.45, 300.9, 305.2);
  turret(b, 1031.7, -198.6, 3.28, .24, 322.25, 335.7, 8, '#5c605e');
  block(b, 1031.61, 1031.79, -198.70, -198.50, 335.7, 336.72, trim);
  block(b, 1031.34, 1032.06, -198.70, -198.50, 336.28, 336.41, trim);
  for (const side of [-1, 1]) {
    const x = bethelSign.x + side * bethelSign.offset;
    for (const y of [bethelSign.y - 1.08, bethelSign.y + .17]) {
      block(b, x - .025, x + .025, bethelSign.z - 2.05, bethelSign.z + 2.05, y, y + .07, '#4b4d49');
      block(b, Math.min(x, bethelSign.x), Math.max(x, bethelSign.x), bethelSign.z - .04,
        bethelSign.z + .04, y, y + .07, '#4b4d49');
    }
  }
  arch(b, 1024.1, -201.06, 'south', 6.8, 304.8, 310.8, '#5f6261');
  block(b, 1020.1, 1028, -201.25, -197.8, 296.3, 302.75, stone);
  for (const x of [1021.4, 1024.1, 1026.75]) arch(b, x, -197.73, 'south', 2.23, 298.45, 302.7, '#443f38');
  gable(b, 1022.25, 1025.97, -197.85, -200.85, 302.7, 304.45, stone);
  for (let i = 0; i < 7; i++) block(b, 1021.5, 1026.8, -197.82 + i * .38, -197.43 + i * .38, 295.4, 298.45 - i * .25, '#beb8aa');
  for (const x of [1015.05, 1039.31]) for (const z of [-229.5, -225.2, -209.3, -205.3]) {
    arch(b, x, z, x < 1020 ? 'west' : 'east', 2.12, 301.0, 306.65);
  }
  for (const x of [1011.42, 1041.36]) arch(b, x, -217.7, x < 1020 ? 'west' : 'east', 4.8, 303.7, 310.35);
}


// Photographs show the entrance brickwork at Ebenezer and the belfry masonry
// at Big Bethel catching warm light. A per-vertex wash avoids extra scene lights.
export function sanctuaryShells(ids: Set<string>, zero: number) {
  const group = new Group();
  const night = { value: 0 };
  const shells: Mesh[] = [];
  for (const [id, build] of [[heritageId, heritage], [bigBethelId, bigBethel]] as const) {
    if (!ids.has(id)) continue;
    const batch = new Builder();
    build(batch);
    const geometry = batch.geometry(), pos = geometry.attributes.position, normal = geometry.attributes.normal;
    const wash = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
      if (id === heritageId) {
        const distance = Math.hypot(x - 1608.5, z + 168, (y - 308.5) * .8);
        wash[i] = Math.max(0, 1 - distance / 13) * Math.max(0, -normal.getZ(i));
      } else {
        const distance = Math.hypot(x - 1032, z + 198, (y - 311) * .38);
        wash[i] = Math.max(0, 1 - distance / 24) * (.85 * Math.abs(normal.getZ(i)) + .55 * Math.abs(normal.getX(i)));
      }
    }
    geometry.setAttribute('aWash', new BufferAttribute(wash, 1));
    const material = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
    material.onBeforeCompile = shader => {
      shader.uniforms.uAuburnNight = night;
      shader.vertexShader = 'attribute float aWash; varying float vWash;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWash=aWash;');
      shader.fragmentShader = 'uniform float uAuburnNight; varying float vWash;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * vec3(.76,.32,.08) * vWash * uAuburnNight;');
    };
    const mesh = new Mesh(geometry, material);
    mesh.position.y = -zero; mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = id; mesh.updateMatrixWorld();
    shells.push(mesh); group.add(mesh);
  }
  return {
    group, setNight(n: number) { night.value = n; }, dispose() {
      for (const mesh of shells) { mesh.geometry.dispose(); (mesh.material as MeshLambertMaterial).dispose(); }
      group.removeFromParent();
    }
  };
}
