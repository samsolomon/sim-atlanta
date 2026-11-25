import * as THREE from 'three';
import { Builder, type P2 } from '../vignette/geom';

/** Daylight albedos for the ground-map bake. Rough inherits the local ground cover. */
export const golfPaint = {
  golf_fringe: '#a4b782', golf_fairway: '#94ae76', golf_tee: '#9cb780',
  golf_green: '#a9c58a', golf_bunker: '#d3c7a1', golf_cartpath: '#c3baaa', golf_stream: '#819e9a',
};

/** Shared geometry per row. Physical-sized flags disappear naturally in wide views. */
export function golfFlags(points: P2[] | undefined, ground: (x: number,z: number) => number | null) {
  if (!points?.length) return;
  const b = new Builder();
  for (const [x,z] of points) {
    const base = ground(x,z);
    if (base === null) continue;
    const y = base + 2.15;
    b.box(.042,2.15,.042,x,y-1.075,z,'#efe6ce');
    b.tri([x,y,z],[x+.29,y-.055,z+.04],[x,y-.32,z],'#bf5844');
    b.tri([x+.29,y-.055,z+.04],[x+.58,y-.13,z+.015],[x,y-.32,z],'#b65240');
  }
  const flags = new THREE.Mesh(b.geometry(),new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  flags.name = 'Ansley golf flags';
  return flags;
}
