// Local Vite study only. Each open mapped way has its own domain and support strip.
import model from './model.json';
import { Builder, Line } from '/src/vignette/geom.ts';
import { trackInDaylight } from '/src/vignette/world.ts';

const names = ['ER', 'X', 'EL', 'CSX'];
const { tracks, origin, along, across } = model;
const point = (s,u) => [origin[0]+along[0]*s+across[0]*u, origin[1]+along[1]*s+across[1]*u];
const project = (x,z) => [(x-origin[0])*along[0]+(z-origin[1])*along[1],
  (x-origin[0])*across[0]+(z-origin[1])*across[1]];
const off = (track,s) => {
  if (s <= track[0][0]) return track[0][1];
  for (let i=1; i<track.length; i++) {
    const [b,v] = track[i], [a,u] = track[i-1];
    if (s <= b) return u+(s-a)*(v-u)/(b-a);
  }
  return track.at(-1)[1];
};
const bed = grid => model.illustrativeBedNavd88M-grid.manifest.vertical.sceneZeroNavd88M;

export function mask(al) {
  return { ...al, openToSky(d) {
    const p=al.line.at(d), [s,u]=project(p.x,p.z);
    return !(s > -22 && s < 135 && Math.abs(u)<35) && trackInDaylight(al,d);
  }};
}

function bands(fn) {
  for (const [i,name] of names.entries()) {
    const track=tracks[name];
    const edge = s => {
      const u=off(track,s);
      return [i ? (u+off(tracks[names[i-1]],s))/2 : u-2.2,
        i<3 ? (u+off(tracks[names[i+1]],s))/2 : u+2.4];
    };
    for (let s=track[0][0]; s<track.at(-1)[0]; s+=1) {
      const e=Math.min(track.at(-1)[0],s+1);
      fn(i,s,e,edge(s),edge(e));
    }
  }
}

export function openings(grid) {
  const slots=[], y=bed(grid)-.12;
  bands((_i,s,e,[l,r],[l1,r1]) => {
    const a=point(s,(l+r)/2), b=point(e,(l1+r1)/2);
    slots.push({ start:[a[0],y,a[1]], end:[b[0],y,b[1]],
      halfWidthM:Math.max(r-l,r1-l1)/2+.08 });
  });
  return slots;
}

export function support(grid, groundAt) {
  return (x,z) => {
    const [s,u]=project(x,z), path=tracks.CSX;
    // Small end tolerance covers the angled cross-section of the 4.2 m freight strip.
    if (s>=path[0][0]-.3 && s<=path.at(-1)[0]+.3 && Math.abs(u-off(path,s))<=2.4) return bed(grid);
    return groundAt(x,z);
  };
}

export function commonFloor(THREE,grid) {
  const mesh=new Builder(), y=bed(grid);
  const vertex=(s,u,h) => { const [x,z]=point(s,u); return [x,h,z]; };
  const rim=(s,u) => { const [x,z]=point(s,u);
    return Math.max(y,(grid.sample(x,z)??model.illustrativeBedNavd88M)-grid.manifest.vertical.sceneZeroNavd88M); };
  bands((i,s,e,[l,r],[l1,r1])=>{
    mesh.quad(vertex(s,l,y),vertex(e,l1,y),vertex(e,r1,y),vertex(s,r,y),'#655f57');
    for (const [draw,v,w] of [[i===0,l,l1],[i===3,r,r1]]) if (draw) {
      mesh.quad(vertex(s,v,y),vertex(e,w,y),vertex(e,w,rim(e,w)),vertex(s,v,rim(s,v)),'#94897a');
    }
  });
  for (const name of names.slice(0,3)) {
    const line=new Line(tracks[name].map(([s,u])=>point(s,u)));
    mesh.ribbon(line,2.8,()=>y+.045,'#625c54',1);
    for (let s=.3;s<line.length;s+=.8) mesh.ribbon(line,2.35,()=>y+.08,'#4c453f',1,s,Math.min(s+.18,line.length));
    for (const d of [-.7175,.7175]) mesh.ribbon(line.offset(d,.75),.13,()=>y+.13,'#a6a49a',.75);
  }
  const obj=new THREE.Mesh(mesh.geometry(),new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  obj.receiveShadow=true;
  return obj;
}

export function metrics(marta,transport,grid) {
  const intervals=transport.freightTreads.filter(p=>p.length && p[0].s>840 && p[0].s<980)
    .map(p=>[p[0].s,p.at(-1).s]);
  const positions=[];
  for(const s of [15,35,55,75,90]) {
    const f=off(tracks.CSX,s);
    let best=null;
    for(const al of marta) {
      for(let i=1;i<al.line.pts.length;i++) {
        const [a,u]=project(...al.line.pts[i-1]),[b,v]=project(...al.line.pts[i]);
        if(s<Math.min(a,b)||s>Math.max(a,b)||a===b) continue;
        const t=(s-a)/(b-a), centre=u+t*(v-u);
        const d=al.line.cum[i-1]+t*(al.line.cum[i]-al.line.cum[i-1]);
        if(!trackInDaylight(al,d)||Math.abs(centre-f)>30) continue;
        if(!best||Math.abs(centre-f)<Math.abs(best.offset-f)) best={offset:centre,
          bedNavd88:al.elev(d)+grid.manifest.vertical.sceneZeroNavd88M};
      }
    }
    positions.push({s,gtfs:best,csx:f});
  }
  return {intervals,positions};
}
