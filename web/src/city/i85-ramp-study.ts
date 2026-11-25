import { retainedOuterEdge, rampSpanSides } from '../../../pipeline/prototypes/i85-cohesion/structure';
import * as THREE from 'three';
import { lowerAxis, lowerPoint, lowerStrips } from '../../../pipeline/prototypes/i85-cohesion/lower';
import { rampLining } from '../../../pipeline/prototypes/i85-openings/lining';
import { rampMouthSlots } from '../../../pipeline/prototypes/i85-openings/mouths';
import { GroundSurface, type TerrainQuality, type TerrainJoins } from '../terrain/surface';
import type { GroundGrid } from '../terrain/grid';
import { Builder, type P2 } from '../vignette/geom';
import { alongOn } from '../terrain/connector-corridor';

export function rampStudy(grid: GroundGrid, quality: TerrainQuality, joins: TerrainJoins) {
  // Blends at the two mouths refer to the exposed road before either aperture is cut.
  const original = new GroundSurface(grid, quality, [], joins);
  const exposed = original.sampleScene.bind(original);
  const slots = rampMouthSlots(exposed);
  const builder = new Builder();
  lowerStrips(exposed, (vertices, color) => {
    for (let i = 0; i < vertices.length; i += 3) builder.tri(vertices[i], vertices[i+1], vertices[i+2], color);
  });
  const surface = new THREE.Mesh(builder.geometry(), new THREE.MeshLambertMaterial({vertexColors:true, side:THREE.DoubleSide}));
  surface.name = 'GA 13 to I-85 southbound ramp tread';
  const liningBuilder = new Builder();
  rampLining(exposed, liningBuilder.quad.bind(liningBuilder));
  const lining = new THREE.Mesh(liningBuilder.geometry(), surface.material);
  lining.name = "Inferred ramp lining, soffit and headers";
  const ribbon = {line: lowerAxis, pts: lowerAxis.pts};
  const owners = new WeakSet<P2[]>();
  return {
    slots, surface, lining,
    register(axis: P2[]) {
      if (axis.length < 2) return;
      const a = alongOn(ribbon, axis[0]), b = alongOn(ribbon, axis[axis.length - 1]);
      const mid = alongOn(ribbon, axis[Math.floor(axis.length / 2)]);
      if (a.distance < .08 && b.distance < .08 && mid.distance < .08 && b.s > a.s) owners.add(axis);
    },
    roadHeight(x:number,z:number,axis:P2[]) {
      if (!owners.has(axis)) return null;
      const s = alongOn(ribbon, [x,z]);
      const p = lowerAxis.at(s.s);
      const offset = -(x-p.x)*p.nx - (z-p.z)*p.nz;
      const y = lowerPoint(s.s, offset, exposed);
      return y?.[1] ?? null;
    },
    dispose() { original.geometry.dispose(); lining.geometry.dispose(); surface.geometry.dispose(); surface.material.dispose(); }
  };
}


export function freewaySides(top:(x:number,z:number)=>number|null) {
  const builder = new Builder();
  retainedOuterEdge(top, ([a,b,c,d], color) => builder.quad(a,b,c,d,color));
  rampSpanSides(top, ([a,b,c,d]) => builder.quad(a,b,c,d,'#a8a198'));
  const mesh = new THREE.Mesh(builder.geometry(), new THREE.MeshLambertMaterial({vertexColors:true, side:THREE.DoubleSide}));
  mesh.name = 'Brookwood NB retaining panels and ramp slab fascias';
  return mesh;
}
