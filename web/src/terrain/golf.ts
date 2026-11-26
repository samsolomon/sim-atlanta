import * as THREE from 'three';
import type { GroundYield } from './surface';
import type { TerrainCity } from './transport-data';
import { Builder, type P2 } from '../vignette/geom';

/** Daylight albedos for the ground-map bake. Rough inherits the local ground cover. */
export const golfPaint = {
  golf_fringe: '#a4b782', golf_fairway: '#94ae76', golf_tee: '#bfd68b',
  golf_collar: '#92ae77', golf_lip: '#83966e', golf_green: '#a9c58a', golf_bunker: '#d3c7a1', golf_cartpath: '#c3baaa', golf_stream: '#819e9a',
};

/** Shared geometry per row. Illustrative flag dimensions keep all nine holes legible at the ordinary orbit. */
export function golfFlags(points: P2[] | undefined, ground: (x: number,z: number) => number | null) {
  if (!points?.length) return;
  const b = new Builder();
  for (const [x,z] of points) {
    const base = ground(x,z);
    if (base === null) continue;
    const y = base + 4.8;
    b.box(.18,4.8,.18,x,y-2.4,z,'#ffffff');
    b.tri([x,y,z],[x+.95,y-.05,z+.37],[x,y-1.38,z],'#ff3527');
    b.tri([x+.95,y-.05,z+.37],[x+2.08,y-.52,z+.22],[x,y-1.38,z],'#ef2620');
  }
  const flags = new THREE.Mesh(b.geometry(),new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  flags.name = 'Ansley golf flags';
  return flags;
}

/** Each depth is relative to the current tier's uncut triangle at that point. */
export function golfBowlYields(city: TerrainCity): GroundYield[] {
  return (city.golfBowls ?? []).map(([a,b,c]) => {
    const dx = b[0]-a[0], dz = b[1]-a[1], ex = c[0]-a[0], ez = c[1]-a[1];
    const area = dx*ez - dz*ex;
    return {
      ring: [a,b,c].map(([x,z]) => [x,z] as P2),
      floor(x,z,originalY = Infinity) {
        const u = ((x-a[0])*ez - (z-a[1])*ex)/area;
        const v = (dx*(z-a[1]) - dz*(x-a[0]))/area;
        return originalY - Math.max(0,a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]));
      },
    };
  });
}

export function teeMarkers(points: P2[] | undefined, ground: (x:number,z:number)=>number|null) {
  if (!points?.length) return;
  const builder = new Builder();
  for (const [x,z] of points) {
    const y = ground(x,z);
    if (y === null) continue;
    const peak = [x,y+.46,z];
    for (let i=0; i<8; i++) {
      const rim = (j:number) => {
        const angle = j*Math.PI/4;
        const px=x+.37*Math.cos(angle), pz=z+.37*Math.sin(angle);
        return [px,ground(px,pz) ?? y,pz];
      };
      const a=rim(i), b=rim(i+1);
      const top=(v:number[])=>[x+(v[0]-x)*.86,y+.30,z+(v[2]-z)*.86];
      builder.tri(a,top(a),b,'#174d9c');
      builder.tri(b,top(a),top(b),'#174d9c');
      builder.tri(top(a),peak,top(b),'#4497fa');
    }
  }
  const mesh=new THREE.Mesh(builder.geometry(),new THREE.MeshLambertMaterial({vertexColors:true}));
  mesh.name='Ansley tee markers';
  return mesh;
}

/** Triangle weights run from zero on the mapped outer edge to one on the level cap. */
export function golfTeeGrades(city: TerrainCity, ground: (x: number, z: number) => number | null): GroundYield[] {
  return (city.golfTees ?? []).flatMap(tee => {
    const anchor = tee.sharedDatum ?? ground(...tee.anchor);
    if (anchor === null) return [];
    const top = anchor + .45;
    return tee.faces.map(([a,b,c]) => {
      const dx = b[0]-a[0], dz = b[1]-a[1], ex = c[0]-a[0], ez = c[1]-a[1];
      const det = dx*ez-dz*ex;
      return {
        grade: true,
        ring: [a,b,c].map(([x,z]) => [x,z] as P2),
        floor(x: number, z: number, original = top) {
          const u = ((x-a[0])*ez-(z-a[1])*ex)/det;
          const v = (dx*(z-a[1])-dz*(x-a[0]))/det;
          const blend = Math.min(1, Math.max(0, a[2]+u*(b[2]-a[2])+v*(c[2]-a[2])));
          return original + blend*(top-original);
        },
      };
    });
  });
}
