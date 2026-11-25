// Private study adapter. Adjacent cells share the same station rows.
// Preserve the existing floor inside every verified interval.
import type { GroundYield } from '../terrain/surface';

type Frame = { x: number; z: number; nx: number; nz: number };
type Profile = { line: { at(s: number): Frame; length: number }; at(s: number): number };
type Window = readonly number[];
type Vertex = readonly [number, number, number];

export function formationEnds(profile: Profile, windows: readonly Window[],
  bare: (x: number, z: number) => number | null, fadeM = 1.5): GroundYield[] {
  if (!(fadeM > 0 && Number.isFinite(fadeM))) throw new Error('Invalid longitudinal fade');
  const distance = (s: number) => Math.min(...windows.map(([a,b]) => Math.max(a-s,0,s-b)));
  const stations = new Set<number>();
  for (const [a,b] of windows) for (const [end,sign] of [[a,-1],[b,1]]) {
    for (const f of [0,.25,.5,.75,1]) stations.add(Math.max(0,Math.min(profile.line.length,end+sign*f*fadeM)));
  }
  // At the centre of an overlapping pair the nearer endpoint switches.
  for (let i=1;i<windows.length;i++) {
    const a=windows[i-1][1], b=windows[i][0];
    if (b-a<2*fadeM) stations.add((a+b)/2);
  }
  const offsets = [-2.5,-1.6,0,1.6,2.5];
  const row = (s: number) => {
    const p=profile.line.at(s), f=Math.min(1,distance(s)/fadeM);
    const blend=f*f*(3-2*f);
    return offsets.map(offset => {
      const x=p.x+p.nx*offset,z=p.z+p.nz*offset;
      const ground=bare(x,z);
      if (ground===null) throw new Error('Missing original NR terrain at '+s);
      const floor=profile.at(s)-.05+Math.max(0,Math.abs(offset)-1.6)/1.5;
      // A small positive allowance at the outer end lets the unmodified board
      // intersect the cap naturally despite cross-track curvature in the DEM.
      return [x,floor+blend*(Math.max(floor,ground+.04)-floor),z] as Vertex;
    });
  };
  const ordered=[...stations].sort((a,b)=>a-b);
  const rows=ordered.map(row), result: GroundYield[]=[];
  function triangle(a: Vertex,b: Vertex,c: Vertex) {
    const ux=b[0]-a[0],uz=b[2]-a[2],vx=c[0]-a[0],vz=c[2]-a[2];
    const det=ux*vz-uz*vx;
    if (Math.abs(det)<1e-10) return;
    const dx=((b[1]-a[1])*vz-(c[1]-a[1])*uz)/det;
    const dz=(ux*(c[1]-a[1])-vx*(b[1]-a[1]))/det;
    result.push({ring:[a,b,c].map(p=>[p[0],p[2]] as const),
      floor:(x,z)=>a[1]+dx*(x-a[0])+dz*(z-a[2])});
  }
  for (let i=1;i<ordered.length;i++) {
    const gap=distance((ordered[i]+ordered[i-1])/2);
    if (gap<=0 || gap>=fadeM) continue;
    for (let j=1;j<offsets.length;j++) {
      const a=rows[i-1][j-1],b=rows[i-1][j],c=rows[i][j],d=rows[i][j-1];
      triangle(a,b,c); triangle(a,c,d);
    }
  }
  return result;
}
