import * as THREE from 'three';
import { groundMap } from './ground-map';
import type { TerrainCity } from './transport-data';
import type { TerrainQuality } from './surface';
import { Builder, type P2 } from '../vignette/geom';
import { PAL } from '../vignette/world';
import type { OpenSlot } from './openings';

type Ground = (x: number, z: number) => number | null;
export interface CoverSpan {
  start: number;
  end: number;
  type: 'terrain' | 'rail-ballast' | 'street';
  top: number;
  clearance?: number;
  medianPier?: boolean;
}

/** Absolute heights are NAVD88. Uncovered intervals between spans admit daylight.
 * Breaks include changes in centreline bearing and pavement grade. */
export interface Underpass {
  roadName: string;
  point(s: number, t: number): P2;
  local(x: number, z: number): P2;
  floor(s: number): number;
  start: number;
  end: number;
  breaks: number[];
  halfWidth: number;
  clearance: number;
  spans: CoverSpan[];
}

export function smoothGrade(distance: number, width: number) {
  const t = Math.max(0, Math.min(1, distance / width));
  return t * t * (3 - 2 * t);
}

function intervals(site: Underpass) {
  const stations = [...new Set([site.start, ...site.breaks, ...site.spans.flatMap(c => [c.start, c.end]), site.end])].sort((a,b) => a-b);
  return stations.slice(1).map((end,i) => {
    const start = stations[i];
    return { start, end, cover: site.spans.find(c => start >= c.start && end <= c.end) };
  });
}

export function daylightSlots(site: Underpass, zero: number): OpenSlot[] {
  const bed = (s: number): [number, number, number] => {
    const [x,z] = site.point(s,0);
    return [x, site.floor(s)-zero-2, z];
  };
  return intervals(site).filter(i => !i.cover).map(({start,end}) => {
    const a = site.point(start,0), b = site.point(start,1);
    return { start: bed(start), end: bed(end), crossAxis: [b[0]-a[0], b[1]-a[1]], halfWidthM: site.halfWidth };
  });
}

/** Surveyed tops belong to the actual textured board. Only the daylight slots
 * remove triangles. This prevents coplanar lids, cover seams and separate rail beds. */
export function upperGrade(site: Underpass, s: number, t: number, dem: number) {
  const first = site.spans[0], last = site.spans[site.spans.length-1];
  const along = smoothGrade(s-site.start, first.start-site.start-7) * smoothGrade(site.end-s,site.end-last.end-7);
  const across = smoothGrade(site.halfWidth+28-Math.abs(t),19);
  let height = first.top;
  for (let i=1; i<site.spans.length; i++) {
    const prev=site.spans[i-1], next=site.spans[i];
    height += (next.top-prev.top)*smoothGrade(s-prev.end,next.start-prev.end);
  }
  return dem + across*along*(height-dem);
}

export function underpassFloor(site: Underpass,s: number,t: number,ground: Ground,zero:number) {
    const end = s < (site.start+site.end)/2 ? site.start : site.end;
    const weight = smoothGrade(Math.abs(s-end), 10);
    // Match the existing terrain across the entire approach cross-section.
    const outer = ground(...site.point(end+(end===site.start ? -.01 : .01),t)) ?? site.floor(s)-zero;
    return outer + weight*(site.floor(s)-zero-outer);
}

export function drawUnderpass(site: Underpass, out: Builder, pavement: Builder, ground: Ground, zero: number) {
  const w = site.halfWidth;
  const edgeHeight = (s: number,t: number) => ground(...site.point(s,t)) ?? site.floor(s)-zero;
  const floor=(s:number,t:number)=>underpassFloor(site,s,t,ground,zero);
  const p = (s: number,t: number,h: number) => { const [x,z]=site.point(s,t); return [x,h,z]; };
  const road = (s: number,t: number) => p(s,t,floor(s,t));
  for (const {start,end,cover} of intervals(site)) {
    const n=Math.ceil((end-start)/2);
    const ceiling=(s: number)=>site.floor(s)-zero+(cover?.clearance ?? site.clearance);
    for(let i=0;i<n;i++){
      const a=start+(end-start)*i/n,b=start+(end-start)*(i+1)/n;
      for(let j=0;j<8;j++){
        const l=w*(j/4-1),r=w*((j+1)/4-1);
        pavement.quad(road(a,r),road(b,r),road(b,l),road(a,l),'#ffffff');
      }
      for(const side of [-1,1]){
        const t=side*w;
        const crest=(s:number)=>cover ? ceiling(s) : edgeHeight(s,side*(w+.01));
        out.quad(road(a,t),road(b,t),p(b,t,crest(b)),p(a,t,crest(a)),PAL.concrete);
      }
      if(cover)out.quad(p(a,-w,ceiling(a)),p(b,-w,ceiling(b)),p(b,w,ceiling(b)),p(a,w,ceiling(a)),PAL.concrete);
    }
    if (!cover) continue;
    for(const s of [start,end]){
      if(s!==cover.start && s!==cover.end)continue;
      for(let i=0;i<12;i++){
        const l=w*(i/6-1),r=w*((i+1)/6-1);
        const inset=s===cover.start?.025:-.025;
        out.quad(p(s,l,ceiling(s)),p(s,r,ceiling(s)),p(s,r,edgeHeight(s+inset,r)),p(s,l,edgeHeight(s+inset,l)),PAL.concrete);
      }
    }
    if(cover.medianPier){
      const s=(start+end)/2;
      out.box(.6,ceiling(s)-floor(s,0),.6,...sitePier(site,s,(floor(s,0)+ceiling(s))/2),PAL.concrete);
    }
  }
}

/** Use the same map painter and texel scale at both levels. The lower road has
 * its own small world-aligned crop because it shares its XY footprint with a
 * different street, a railway and three grass strips. */
export function underpassMesh(site: Underpass, city: TerrainCity, quality: TerrainQuality, ground: Ground, zero: number) {
  const walls=new Builder(), pavement=new Builder();
  drawUnderpass(site,walls,pavement,ground,zero);
  const roadBounds={minX:Infinity,minZ:Infinity,maxX:-Infinity,maxZ:-Infinity};
  for(let i=0;i<pavement.pos.length;i+=3){
    const x=pavement.pos[i],z=pavement.pos[i+2];
    roadBounds.minX=Math.min(roadBounds.minX,Math.floor(x)-2);
    roadBounds.minZ=Math.min(roadBounds.minZ,Math.floor(z)-2);
    roadBounds.maxX=Math.max(roadBounds.maxX,Math.ceil(x)+2);
    roadBounds.maxZ=Math.max(roadBounds.maxZ,Math.ceil(z)+2);
  }
  const roads=city.roads.filter(r=>r.name===site.roadName).map(r=>({...r,tunnel:false}));
  const map=groundMap({bounds:roadBounds,roads,buildings:[],rail:[]},quality);
  const uv:number[]=[];
  for(let i=0;i<pavement.pos.length;i+=3)
    uv.push((pavement.pos[i]-roadBounds.minX)/(roadBounds.maxX-roadBounds.minX),(roadBounds.maxZ-pavement.pos[i+2])/(roadBounds.maxZ-roadBounds.minZ));
  const geometry=pavement.geometry();
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const roadMaterial=new THREE.MeshLambertMaterial({map,side:THREE.DoubleSide});
  const concrete=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,emissive:0x342f26});
  const group=new THREE.Group();
  const street=new THREE.Mesh(geometry,roadMaterial), structure=new THREE.Mesh(walls.geometry(),concrete);
  street.receiveShadow=true;
  group.add(street,structure);
  return {group, setWet(factor:number){roadMaterial.color.setScalar(1-.3*factor);},dispose(){map.dispose();}};
}

function sitePier(site: Underpass,s: number,y: number): [number,number,number] {
  const [x,z]=site.point(s,0);
  return [x,y,z];
}
