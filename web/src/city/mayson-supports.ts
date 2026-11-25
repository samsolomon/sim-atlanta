// Private under-deck study for the two tracks crossing Mayson. All depths and
// seat dimensions are illustrative. The signed rail and deck vertices are inputs.
import * as THREE from 'three';
import { Builder, type Line } from '../vignette/geom';

type Track = { track: string; line: Line; at(s: number): number };
type Ground = (x: number, z: number) => number;
type Vertex = [number, number, number];

export const supportExtents = [
  { track: 'NR', way: 81137860, start: 728.53, end: 776.82 },
  { track: 'NL', way: 319512612, start: 738.04, end: 785.13 },
];

// Interpolate the actual edge vertices emitted by studyRails at 1.5 m intervals.
// Interior positions use the same triangle diagonal as its top quad.
function deck(track: Track, s: number, offset: number): Vertex {
  const a = Math.floor(s / 1.5) * 1.5;
  const b = a + 1.5;
  const u = (s - a) / 1.5;
  const v = (offset + 1.6) / 3.2;
  const pa = track.line.at(a), pb = track.line.at(b);
  const lateralB = 3.2 * Math.min(v, u) - 1.6 * u;
  const lateralA = offset - lateralB;
  return [
    pa.x * (1-u) + pb.x*u + pa.nx*lateralA + pb.nx*lateralB,
    track.at(a)*(1-u) + track.at(b)*u,
    pa.z * (1-u) + pb.z*u + pa.nz*lateralA + pb.nz*lateralB,
  ];
}

function prism(builder: Builder, upper: Vertex[], lower: Vertex[], color: string, cover = true) {
  const [a,b,c,d] = upper, [e,f,g,h] = lower;
  if (cover) builder.quad(a,b,c,d,color);
  builder.quad(h,g,f,e,color);
  for (let i=0; i<4; i++) {
    const j=(i+1)%4;
    builder.quad(upper[i],lower[i],lower[j],upper[j],color);
  }
}

export function maysonSupports(tracks: Track[], ground: Ground) {
  const group = new THREE.Group();
  group.name = 'Mayson guideway supports';
  const material = new THREE.MeshLambertMaterial({vertexColors:true, side:THREE.DoubleSide});
  const feet: {track:string; end:string; vertices:Vertex[]}[] = [];

  for (const { track:name, way, start, end } of supportExtents) {
    const track = tracks.find(t => t.track === name)!;
    function section(from:number, to:number, left:number, right:number, depth:number) {
      return [[from,left],[to,left],[to,right],[from,right]].map(([s,offset]) => {
        const p = deck(track,s,offset);
        p[1] -= depth;
        return p;
      });
    }
    function attach(builder: Builder, part: string) {
      const mesh = new THREE.Mesh(builder.geometry(), material);
      mesh.name = 'Mayson ' + name + ' ' + part;
      mesh.userData = { way, dimensions:'illustrative', location:'inferred' };
      group.add(mesh);
    }
    const slab = new Builder(), beams = new Builder(), caps = new Builder();
    const pads = new Builder(), stems = new Builder();
    // Continuous side faces and soffits. The signed track formation is the lid.
    const southSeat = start + .72, northSeat = end - .72;
    const seatY = (station: number) => deck(track, station, 0)[1];
    const level = (ring: Vertex[], y: number): Vertex[] => ring.map(([x,,z]) => [x,y,z]);
    const knots = [start, start + 1.25, end - 1.25];
    for (let s=Math.ceil(start/1.5)*1.5; s<end; s+=1.5) knots.push(s);
    knots.push(end);
    knots.sort((a,b) => a-b);
    function ribbon(builder:Builder,left:number,right:number,top:number,bottom:number,color:string) {
      for (let i=1;i<knots.length;i++) {
        const a=knots[i-1], b=knots[i];
        const u=section(a,b,left,right,top), l=section(a,b,left,right,bottom);
        // The short girder end over its bearing has a level lower seat.
        if (builder === beams) {
          for (const [index,s] of [[0,a],[1,b],[2,b],[3,a]]) {
            if (s <= start + 1.25) l[index][1] = seatY(southSeat) - bottom;
            if (s >= end - 1.25) l[index][1] = seatY(northSeat) - bottom;
          }
        }
        builder.quad(l[3],l[2],l[1],l[0],color);
        builder.quad(u[0],l[0],l[1],u[1],color);
        builder.quad(u[2],l[2],l[3],u[3],color);
        if(i===1) builder.quad(u[3],l[3],l[0],u[0],color);
        if(i===knots.length-1) builder.quad(u[1],l[1],l[2],u[2],color);
      }
    }
    ribbon(slab,-1.6,1.6,0,.26,'#939089');
    for(const offset of [-1.07,1.07])
      ribbon(beams,offset-.24,offset+.24,.26,1.22,'#8d9391');

    for (const [label,station] of [['south',southSeat],['north',northSeat]] as const) {
      const seat = (halfLength:number,left:number,right:number,depth:number) =>
        level(section(station-halfLength,station+halfLength,left,right,0), seatY(station)-depth);
      for(const offset of [-1.07,1.07]){
        const left=offset-.21,right=offset+.21;
        prism(pads,seat(.28,left,right,1.22),
          seat(.28,left,right,1.36),'#444741');
      }
      prism(caps,seat(.64,-1.57,1.57,1.36),
        seat(.64,-1.57,1.57,1.88),'#aaa49b');
      const upper=seat(.53,-1.32,1.32,1.88);
      // An interior terrain edge rises or dips relative to the four corner planes.
      // Ground found up to 16.9 mm of daylight in the zero-depth fit.
      const lower=upper.map(([x,,z]):Vertex=>[x,ground(x,z)-.03,z]);
      prism(stems,upper,lower,'#a09a8e');
      feet.push({track:name,end:label,vertices:lower});
    }
    attach(slab,'deck soffit'); attach(beams,'edge girders'); attach(stems,'end piers');
    attach(caps,'caps'); attach(pads,'bearings');
  }
  group.userData.feet=feet;
  return group;
}
