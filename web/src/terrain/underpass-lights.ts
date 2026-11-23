import * as THREE from 'three';
import { Builder } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import { ribbons, sectionAt, stripePoint } from './connector-corridor';
import { streetSoffits } from './street-bridges';
import { junctionSoffits } from './junction-decks';
import { triangleHeight } from './tread-height';
import type { GroundSurface } from './surface';
import type { TerrainCity } from './transport-data';

export function underpassLights(city: TerrainCity, floor: GroundSurface, pavement?: THREE.Texture | null) {
  const slab = new Builder(),
    zero = floor.grid.manifest.vertical.sceneZeroNavd88M;
  streetSoffits(city, zero, slab);
  junctionSoffits(city, zero, slab);
  if (!slab.pos.length) return;
  const group = new THREE.Group(),
    geometry = slab.geometry(),
    p = geometry.getAttribute('position') as THREE.BufferAttribute;
  const index = new PlacementIndex<number>(18);
  for (let i = 0; i < p.count; i += 3)
    index.add(
      i,
      [i, i + 1, i + 2].map((j) => [p.getX(j), p.getZ(j)]),
    );
  const ceiling = (x: number, z: number) => {
    for (const i of index.at(x, z)) {
      const h = triangleHeight(p, i, x, z);
      if (h !== null) return h;
    }
    return null;
  };
  const concrete = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const roof = new THREE.Mesh(geometry, concrete);
  roof.name = 'Connector street deck soffits';
  group.add(roof);
  const lenses = new Builder(),
    pools: number[] = [],
    uv: number[] = [],
    housing = new Builder();
  const ground = floor.geometry.getAttribute('position');
  const bounds = city.bounds;
  for (const r of ribbons) {
    if (r.kind !== 'ground') continue;
    // Stationing keeps the rows aligned where the source splits one carriageway.
    const pitch = 16,
      first = (((8 - (r.station0 ?? 0)) % pitch) + pitch) % pitch;
    for (let s = first; s < r.line.length; s += pitch) {
      const row = sectionAt(r, s),
        dir = r.line.at(s);
      for (const f of r.lanes > 3 ? [0.18, 0.82] : [0.5]) {
        const [x, z] = stripePoint(row, f);
        if (x < bounds.minX || x >= bounds.maxX || z < bounds.minZ || z >= bounds.maxZ) continue;
        const h = ceiling(x, z),
          g = floor.sampleScene(x, z);
        if (h === null || g === null || h - g < 4.55) continue;
        const panel = (forward: number, side: number, drop: number) => [
          x + forward * dir.dx + side * dir.nx,
          h - drop,
          z + forward * dir.dz + side * dir.nz,
        ];
        housing.quad(
          panel(-1, -0.34, 0.07),
          panel(1, -0.34, 0.07),
          panel(1, 0.34, 0.07),
          panel(-1, 0.34, 0.07),
          '#4a4641',
        );
        lenses.quad(
          panel(-0.77, -0.24, 0.1),
          panel(0.77, -0.24, 0.1),
          panel(0.77, 0.24, 0.1),
          panel(-0.77, 0.24, 0.1),
          '#ffe4b1',
        );
        // Paint spill onto copies of the exact receiving pavement triangles.
        // The UV falloff also preserves lane markings beneath the additive wash.
        floor.trianglesNear(x, z, 12, (a, b, c) => {
          for (const j of [a, b, c]) {
            const px = ground.getX(j),
              py = ground.getY(j),
              pz = ground.getZ(j);
            pools.push(px, py, pz);
            uv.push(
              ((px - x) * dir.dx + (pz - z) * dir.dz) / 11,
              ((px - x) * dir.nx + (pz - z) * dir.nz) / 6.5,
            );
          }
        });
      }
    }
  }
  const mount = new THREE.Mesh(housing.geometry(), concrete.clone());
  group.add(mount);
  const lens = new THREE.Mesh(
    lenses.geometry(),
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
  );
  lens.name = 'Underpass luminaires';
  group.add(lens);
  const spillGeometry = new THREE.BufferGeometry();
  spillGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pools, 3));
  spillGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const night = { value: 0 };
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      night,
      tread: { value: pavement },
      mapped: { value: pavement ? 1 : 0 },
      bounds: {
        value: new THREE.Vector4(
          bounds.minX,
          bounds.maxZ,
          bounds.maxX - bounds.minX,
          bounds.maxZ - bounds.minZ,
        ),
      },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
    vertexShader:
      'uniform vec4 bounds; varying vec2 v;varying vec2 pavementUV; void main(){v=uv;pavementUV=vec2(position.x-bounds.x,bounds.y-position.z)/bounds.zw;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 v; varying vec2 pavementUV; uniform sampler2D tread; uniform float mapped; uniform float night;
      void main(){
        float w=max(0.,1.-dot(v,v));
        vec3 albedo=mix(vec3(.15),texture2D(tread,pavementUV).rgb,mapped);
        gl_FragColor=vec4(vec3(1.,.75,.48)*(.018+albedo)*1.6,night*w*w);
      }`,
  });
  const spill = new THREE.Mesh(spillGeometry, mat);
  spill.name = 'Underpass pavement illumination';
  group.add(spill);
  function setNight(dark: number) {
    night.value = dark;
    spill.visible = dark > 0.005;
    lens.material.color.setScalar(0.16 + dark * 2.8);
  }
  setNight(0);
  return { group, setNight, ceiling };
}
