import { Vector3 } from 'three';
import survey from '../../../pipeline/prototypes/kendeda-walk/profile.json';
import type { TerrainCity, TransportRun } from '../terrain/transport-data';
import { Builder, Line, type P2 } from '../vignette/geom';

const center = new Line(survey.path as P2[]);
const halfWidth = 3.6576 / 2; // The Garden's published 12-foot width.
const length = center.length;

function measuredBand(s: number) {
  const i = survey.bins.findIndex(([end]) => end >= s);
  if (i < 0) return survey.bins.at(-1)![1];
  if (i === 0) return survey.bins[0][1];
  const [a, h] = survey.bins[i-1], [b, k] = survey.bins[i];
  return h + (k-h)*(s-a)/(b-a);
}

// Square-section handrails, lean masts and stays share the structural mesh.
function bar(mesh: Builder, a: Vector3, b: Vector3, radius: number, color: string) {
  const tangent = b.clone().sub(a).normalize();
  const side = new Vector3(-tangent.z, 0, tangent.x);
  if (side.lengthSq() < .001) side.set(1,0,0);
  side.normalize().multiplyScalar(radius);
  const up = tangent.clone().cross(side).normalize().multiplyScalar(radius);
  const ring = (p: Vector3) => [[1,1],[-1,1],[-1,-1],[1,-1]].map(([u,v]) =>
    p.clone().addScaledVector(side,u).addScaledVector(up,v).toArray());
  const start = ring(a), end = ring(b);
  for (let i=0; i<4; i++) mesh.quad(start[i],start[(i+1)%4],end[(i+1)%4],end[i],color);
}

export function drawKendedaWalk(city: TerrainCity, zero: number, ground: (x: number,z: number) => number | null,
  mesh: Builder, treads: Map<TransportRun,number[]>, drawn: Set<TransportRun>) {
  const run = city.terrainTransport?.roads.find(r => r.name === 'Kendeda Canopy Walk' && r.kind === 'bridge');
  if (!run) return;
  const stationOf = (p: P2) => survey.path.findIndex(([x,z]) => Math.hypot(x-p[0], z-p[1]) < .01);
  const first = stationOf(run.pts[0]), last = stationOf(run.pts.at(-1)!);
  if (first < 0 || last <= first || last-first+1 !== run.pts.length) {
    // The generic tread would bury the walk in the hillside again; re-bake the profile.
    console.warn('Kendeda Canopy Walk no longer matches pipeline/prototypes/kendeda-walk/profile.json');
    return;
  }
  const { minZ, maxZ } = city.bounds;
  const start = center.cum[first], end = center.cum[last];
  function at(s: number, offset: number, lift=0) {
    const c = center.at(s), left = center.at(Math.max(0,s-.2)), right = center.at(Math.min(length,s+.2));
    const dx=right.x-left.x, dz=right.z-left.z, norm=Math.hypot(dx,dz);
    const x=c.x+offset*dz/norm;
    // Match the entire width on the row clipping plane.
    const seam = Math.abs(c.z-minZ) < 1e-6 || Math.abs(c.z-maxZ) < 1e-6;
    const z=seam ? c.z : c.z-offset*dx/norm;
    let y=measuredBand(s)-zero;
    const toe = s < length/2 ? 0 : length;
    const blend = 1-Math.min(1,Math.abs(s-toe)/9);
    if (blend > 0) {
      const p=center.at(toe), surface=ground(p.x+offset*p.nx,p.z+offset*p.nz);
      if (surface !== null) y+=blend*(surface+.12-(measuredBand(toe)-zero));
    }
    return new Vector3(x,y+lift,z);
  }
  const stations = new Set(center.cum.slice(first,last+1));
  for(let s=Math.ceil(start/3)*3; s<end; s+=3) stations.add(s);
  const marks=[...stations].sort((a,b)=>a-b), top: number[]=[];
  for(let i=1; i<marks.length; i++) {
    const a=marks[i-1], b=marks[i];
    const al=at(a,halfWidth), ar=at(a,-halfWidth), bl=at(b,halfWidth), br=at(b,-halfWidth);
    top.push(mesh.pos.length/3,mesh.pos.length/3+3);
    mesh.quad(al.toArray(),ar.toArray(),br.toArray(),bl.toArray(),'#aea89a');
    for (const side of [-halfWidth,halfWidth]) {
      mesh.quad(at(a,side).toArray(),at(b,side).toArray(),at(b,side,-.28).toArray(),at(a,side,-.28).toArray(),'#514b42');
      bar(mesh,at(a,side,1.12),at(b,side,1.12),.055,'#886f53');
      bar(mesh,at(a,side,.52),at(b,side,.52),.025,'#7c786c');
      if (a%3===0) bar(mesh,at(a,side),at(a,side,1.12),.045,'#625e54');
    }
    bar(mesh,at(a,0,-.65),at(b,0,-.65),.24,'#5b5044');
  }
  for(const [s,side] of [[30,1],[62,-1],[101,1],[142,-1]]) {
    if(s<start || s>=end) continue;
    const foot=at(s,side*6), floor=ground(foot.x,foot.z);
    if (floor === null) continue;
    foot.y=floor-.12;
    const peak=at(s,side*2.5,7.5);
    bar(mesh,foot,peak,.20,'#66695f');
    // Stays meet the near deck edge from outside, clear of the walking surface.
    for(const ds of [-12,-7,7,12]) bar(mesh,peak,at(s+ds,side*(halfWidth+.08),-.18),.035,'#777a73');
  }
  drawn.add(run);
  treads.set(run,top);
}
