import * as THREE from 'three';
import { Builder, Line, type P2 } from '../vignette/geom';
import { brookwoodBedNavd88M } from './brookwood';
import fixture from './fixtures/norcross-north-study.json';

/** The Brookwood mains and siding continue on the same three OSM ways. Vehicle
 * service is separate. Sample the mounted terrain so both tiers carry the bed. */
export function norcrossNorthRails(groundAt: (x: number, z: number) => number | null, zero: number) {
  const geometry = new Builder();
  for (const run of fixture.rail) {
    const line = new Line(run.pts as P2[]);
    const bed = (s: number) => {
      const p = line.at(s);
      const edge = brookwoodBedNavd88M(p.x) - zero;
      let crest = -Infinity;
      for (const u of [-1.8, -.9, 0, .9, 1.8]) {
        const h = groundAt(p.x + u * p.nx, p.z + u * p.nz);
        if (h !== null) crest = Math.max(crest, h);
      }
      if (!Number.isFinite(crest)) throw Error('NS continuation outside mounted ground: ' + run.id);
      return THREE.MathUtils.lerp(edge, crest, Math.min(1, s / 8));
    };
    const station = (s: number, width: number, offset: number, lift: number) => {
      const p = line.at(s), y = bed(s) + lift;
      return [-width / 2, width / 2].map(side => {
        const u = offset + side;
        let x = p.x + u * p.nx, z = p.z + u * p.nz;
        // The old mesh has a horizontal clipping plane through its diagonal end.
        if (s === 0 && z < -5700) {
          x += p.dx * (-5700 - z) / p.dz;
          z = -5700;
        }
        return [x,y,z];
      });
    };
    const strip = (start: number, end: number, width: number, offset: number, lift: number, colour: string) => {
      let prev = station(start,width,offset,lift);
      for (let s = start; s < end;) {
        s = Math.min(end, s + 1.5);
        const next = station(s,width,offset,lift);
        geometry.quad(prev[0],prev[1],next[1],next[0],colour);
        prev = next;
      }
    };
    strip(0,line.length,3.6,0,.12,'#807a70');
    for (let s = .3; s < line.length; s += .72)
      strip(s,Math.min(s + .22,line.length),2.5,0,.19,'#665c50');
    for (const u of [-.7175,.7175]) strip(0,line.length,.085,u,.32,'#b0ae9f');
  }
  const mesh = new THREE.Mesh(geometry.geometry(),new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  mesh.name = 'NS Norcross mains and siding north of Brookwood';
  mesh.userData.ways = fixture.rail.map(run => run.id);
  mesh.receiveShadow = true;
  return mesh;
}
