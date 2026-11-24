import { BufferAttribute, Mesh, MeshLambertMaterial } from 'three';
import { stairRun, landscapeMesh } from '../landscape/primitives';
import { Builder } from '../vignette/geom';
import { localLandmarkShell } from './landmark-shell';
import { surfaces } from '../materials';
import type { VBuilding } from '../vignette/world';
import type { P2 } from '../vignette/geom';

export const rhodesHallId = 'osm:way:269637579';
/** Photo-estimated heights; mapped OSM plan. Evidence: docs/rhodes-hall.md. */
export function createRhodesHall(
  buildings: VBuilding[],
  site: VBuilding,
  base: number | null,
  groundAt: (x: number, z: number) => number | null,
) {
  if (site.id !== rhodesHallId || base === null || site.rings.length !== 1) return null;
  const grade = groundAt(311, -4675);
  if (grade === null) return null;
  const s = localLandmarkShell(
    buildings,
    site,
    'Rhodes Hall',
    [301, -4675],
    [1, 0],
    [
      [0, 0],
      [-9, -5],
      [10, -7],
    ],
    base - grade,
    grade,
  );
  if (!s) return null;
  const { body: b, lights, prism } = s;
  const stone = '#a49f92',
    trim = '#bdb6a3',
    roof = '#83564b',
    glass = '#303c3e';
  const rect = (x: number, z: number, w: number, d: number): P2[] => [
    [x - w / 2, z - d / 2],
    [x + w / 2, z - d / 2],
    [x + w / 2, z + d / 2],
    [x - w / 2, z + d / 2],
  ];
  const masonry = (ring: P2[], lo: number, hi: number) =>
    prism(ring, lo, hi, stone, trim, { wall: surfaces.granite({ course: 0.55 }) });
  masonry(s.ring, s.base, 0.5);
  masonry(rect(-2, -4, 22, 17), 0.5, 9.6);
  // Front faces south: the tall tower occupies the left (western) end of the porch.
  const towerStart = b.pos.length / 3;
  masonry(rect(-3.5, 8, 8.4, 9.5), 0.5, 22);
  for (const y of [5, 10, 15.5, 20.5])
    s.paint(surfaces.granite({ course: 0.5 }), () => b.box(8.7, 0.35, 9.8, -3.5, y, 8, trim));
  // Corbelled tower crown with small blind arches and a castellated parapet.
  for (const x of [-7, -5.6, -4.2, -2.8, -1.4, 0]) {
    b.box(0.45, 1.2, 0.6, x, 20.4, 13, trim);
    b.box(0.8, 0.7, 0.7, x, 22.3, 12.7, stone);
    b.box(0.8, 0.7, 0.7, x, 22.3, 3.3, stone);
  }
  for (const z of [4, 5.7, 7.4, 9.1, 10.8, 12.5]) for (const x of [-7.7, 0.7]) b.box(0.7, 0.7, 0.8, x, 22.3, z, stone);
  // Paired tower openings, sparse at night.
  for (const y of [3, 8, 13.8, 18.4])
    for (const x of [-5, -2]) {
      b.box(1.6, 2.55, 0.18, x, y, 12.81, trim);
      b.box(1.23, 2.2, 0.2, x, y, 12.83, glass);
      b.box(1.25, 0.09, 0.22, x, y, 12.85, trim);
    }
  for (const y of [3, 8, 13.8, 18.4])
    for (const z of [6, 10]) {
      b.box(0.18, 2.55, 1.6, -7.76, y, z, trim);
      b.box(0.2, 2.2, 1.23, -7.78, y, z, glass);
    }
  const towerEnd = b.pos.length / 3;
  // Steep hipped roof, brick-red in the daylight references.
  s.paint(surfaces.slate(), () => {
    b.quad([-13.5, 9.6, -13], [9.5, 9.6, -13], [5, 16, -4], [-9, 16, -4], roof);
    b.quad([-13.5, 9.6, 5], [-9, 16, -4], [5, 16, -4], [9.5, 9.6, 5], roof);
    b.tri([-13.5, 9.6, -13], [-9, 16, -4], [-13.5, 9.6, 5], roof);
    b.tri([9.5, 9.6, -13], [9.5, 9.6, 5], [5, 16, -4], roof);
  });
  // Rounded bay to the right of the tower, capped by a masonry gable.
  const ring: P2[] = Array.from({ length: 16 }, (_, i) => [
    3.5 + 3.5 * Math.cos((i * Math.PI) / 8),
    3.5 + 3.5 * Math.sin((i * Math.PI) / 8),
  ]);
  masonry(ring, 0.5, 10.8);
  for (const y of [5.4, 9.8, 10.8]) {
    const belt: P2[] = ring.map(([x, z]) => [3.5 + (x - 3.5) * 1.06, 3.5 + (z - 3.5) * 1.06]);
    prism(belt, y, y + 0.25, trim, trim);
  }
  for (let i = 0; i < 8; i++) s.facade(ring[i], ring[(i + 1) % 16], 6.4, 9.4, 1, 2, 0.5, 0.8, [glass], 0);
  s.paint(surfaces.granite({ course: 0.5 }), () => b.tri([0, 10.9, 4], [7, 10.9, 4], [3.5, 16, 4], stone));
  s.paint(surfaces.slate(), () => {
    b.quad([0, 10.9, 4], [0, 10.9, -4], [3.5, 16, -4], [3.5, 16, 4], roof);
    b.quad([7, 10.9, 4], [3.5, 16, 4], [3.5, 16, -4], [7, 10.9, -4], roof);
  });
  b.box(1.4, 2.4, 0.2, 3.5, 12.5, 4.1, trim);
  b.box(1.05, 2.1, 0.23, 3.5, 12.5, 4.12, glass);
  const porchStart = b.pos.length / 3;
  // Three genuinely open arches: segmented voussoirs, no dark rectangles filling openings.
  for (const x of [2.5, 7.1, 11.7]) {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 12,
        c = ((i + 1) * Math.PI) / 12;
      const point = (r: number, t: number, z: number) => [x + r * Math.cos(t), 2.8 + r * Math.sin(t), z];
      for (const z of [8.5, 12.5])
        b.quad(point(1.9, a, z), point(2.45, a, z), point(2.45, c, z), point(1.9, c, z), trim);
      b.quad(point(1.9, a, 8.5), point(1.9, c, 8.5), point(1.9, c, 12.5), point(1.9, a, 12.5), stone);
    }
  }
  for (const x of [0.2, 4.8, 9.4, 14]) masonry(rect(x, 10.5, 0.85, 4), 0.5, 3);
  b.box(14.8, 0.35, 4.5, 7.1, 5.3, 10.5, trim);
  for (let x = 0.2; x < 14.5; x += 1.25) b.box(0.65, 0.6, 0.65, x, 5.75, 12.5, stone);
  // Warm porch bulbs; broad tower illumination is added separately after visual review.
  for (const x of [2.5, 7.1, 11.7]) lights.box(0.3, 0.22, 0.3, x, 4.5, 10.5, '#ffe1a4');
  for (const z of [-10, -6, -2])
    for (const x of [-13.06, 9.06]) s.facade([x, z - 1], [x, z + 1], 1.4, 8.5, 2, 3, 0.6, 0.65, [glass], 0);
  b.box(14.8, 0.35, 8, 7.1, 0.5, 8.5, trim);
  const model = s.finish('#ffdc9c', 0.75);
  const steps = new Builder();
  const cut = stairRun(steps, [308.1, -4659], [308.1, -4662.5], 3.5, groundAt, { toY: grade + 0.675 });
  const stairs = landscapeMesh(steps);
  model.group.add(stairs.mesh);
  // Landscape geometry is already world-relative; cancel the landmark group's datum.
  stairs.mesh.position.set(-301, -grade, 4675);
  const mesh = model.group.children[0] as Mesh<import('three').BufferGeometry, MeshLambertMaterial>;
  const pos = mesh.geometry.attributes.position,
    colour = mesh.geometry.attributes.color;
  const wash = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    // Stone only: dark panes and red roofing do not become emissive.
    if (colour.getY(i) <= 0.25 || Math.abs(colour.getX(i) - colour.getY(i)) >= 0.15) continue;
    if (i >= towerStart && i < towerEnd) {
      wash[i] = 0.35 * Math.max(0, (20 - y) / 19.5);
    } else {
      wash[i] = x > -8 && x < 1 && z > 3 ? (i < porchStart ? 0.75 : 1) * Math.max(0.25, 1 - y / 30) : z > 8 ? 0.6 : 0;
    }
  }
  mesh.geometry.setAttribute('aRhodesWash', new BufferAttribute(wash, 1));
  const night = { value: 0 },
    prior = mesh.material.onBeforeCompile;
  const priorKey = mesh.material.customProgramCacheKey.bind(mesh.material);
  const key = priorKey();
  mesh.material.onBeforeCompile = (shader, renderer) => {
    prior.call(mesh.material, shader, renderer);
    shader.uniforms.uRhodesNight = night;
    shader.vertexShader =
      'attribute float aRhodesWash; varying float vRhodesWash;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vRhodesWash=aRhodesWash;');
    shader.fragmentShader =
      'uniform float uRhodesNight; varying float vRhodesWash;\n' +
      shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * vec3(1.2,.88,.46) * vRhodesWash * uRhodesNight;',
      );
  };
  mesh.material.customProgramCacheKey = () => key + '|rhodes-wash';
  return {
    ...model,
    yields: cut ? [cut] : [],
    setNight(n: number) {
      model.setNight(n);
      night.value = n;
    },
  };
}
