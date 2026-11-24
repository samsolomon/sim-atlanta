import * as THREE from 'three';
import { Builder, hashStr, pointInRing, rng, type P2 } from '../vignette/geom';
import { bench } from '../landscape/furniture';
import { landscapeMesh, retainingEdge, tuft, type Ground } from '../landscape/primitives';
import type { TerrainCity } from '../terrain/transport-data';
import type { GroundYield } from '../terrain/surface';

// Illustrative western ravine, constrained to the mapped park. See docs/winn-park.md.
export const WINN = {
  floor: [[815,-4084],[842,-4088],[883,-4085],[895,-4073],[878,-4051],[849,-4048],[821,-4059]] as P2[],
  path: [[816,-4049],[832,-4055],[846,-4059],[860,-4060],[878,-4072],[890,-4087]] as P2[],
  channel: [[818,-4078],[832,-4075],[846,-4070],[855,-4070]] as P2[],
  terrace: [[836,-4062],[844,-4062],[844,-4057],[836,-4057]] as P2[],
  pond: Array.from({length: 16}, (_, i): P2 => [862 + 6 * Math.cos(i*Math.PI/8), -4070 + 3.5 * Math.sin(i*Math.PI/8)]),
};
const GRANITE = '#92958b', CAP = '#b9bbae', EARTH = '#c4b394', LITTER = '#bfab8c';
const parkRings = (city: TerrainCity) => (city.ground ?? []).filter(g => g.name === 'Winn Park').flatMap(g => g.rings);
const outerPond = (p:P2):P2 => [862+(p[0]-862)*1.08,-4070+(p[1]+4070)*1.14];
const poly = (ctx: CanvasRenderingContext2D, pts: P2[]) => {
  ctx.beginPath(); pts.forEach(([x,z],i) => i ? ctx.lineTo(x,z) : ctx.moveTo(x,z)); ctx.closePath();
};

/** Quiet ground paint on both tiers; no extra texture or low-tier geometry. */
export function paintWinnPark(ctx: CanvasRenderingContext2D, city: TerrainCity) {
  const rings = parkRings(city);
  if (!rings.length) return;
  ctx.save(); ctx.beginPath();
  for (const ring of rings) { ring.forEach(([x,z],i) => i ? ctx.lineTo(x,z) : ctx.moveTo(x,z)); ctx.closePath(); }
  ctx.clip('evenodd');
  poly(ctx, WINN.floor); ctx.fillStyle = LITTER; ctx.fill();
  // Broad low planting masses; fine variation stays close to the mean.
  for (const ring of [
    [[822,-4083],[843,-4086],[862,-4081],[873,-4076],[862,-4075],[840,-4078]],
    [[827,-4067],[843,-4063],[866,-4055],[879,-4057],[886,-4064],[873,-4050],[847,-4051]],
  ] as P2[][]) { poly(ctx, ring); ctx.fillStyle = '#87966d'; ctx.fill(); }
  const r = rng(hashStr('winn-litter'));
  for (let i=0;i<500;i++) {
    const x=815+r()*80,z=-4088+r()*40;
    if (!pointInRing(x,z,WINN.floor)) continue;
    ctx.fillStyle=i%2 ? '#c2ae90' : '#bca88a'; ctx.fillRect(x,z,.45+r()*.6,.2+r()*.3);
  }
  const stroke = (pts:P2[],width:number,color:string) => {
    ctx.beginPath();pts.forEach(([x,z],i)=>i?ctx.lineTo(x,z):ctx.moveTo(x,z));
    ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=color;ctx.stroke();
  };
  stroke(WINN.channel,1.1,'#7e8b83');
  stroke(WINN.path,1.4,EARTH);
  stroke([[832,-4055],[840,-4059],[850,-4061]],1.5,CAP);
  poly(ctx,WINN.terrace);ctx.fillStyle=CAP;ctx.fill();
  // Offset joints suggest irregular flagstone without a high-contrast grid.
  ctx.save();poly(ctx,WINN.terrace);ctx.clip();
  for(let z=-4062;z<-4057;z+=1.2) stroke([[836,z],[844,z+.18]],.08,GRANITE);
  for(let x=837;x<844;x+=1.5) stroke([[x,-4062],[x+.4,-4057]],.08,GRANITE);
  ctx.restore();
  poly(ctx,WINN.pond);ctx.fillStyle='#768e85';ctx.fill();ctx.lineWidth=.6;ctx.strokeStyle=CAP;ctx.stroke();
  ctx.restore();
}

/** High-only hard surfaces. Construct before carving; attach after carving. */
export function winnPark(city: TerrainCity, ground: Ground, quality:'high'|'low') {
  if(quality==='low')return null;
  const rings=parkRings(city);
  if(!rings.length || ![...WINN.terrace,...WINN.pond.map(outerPond),...WINN.channel].every(([x,z])=>rings.some(r=>pointInRing(x,z,r))))return null;
  const samples=[...WINN.terrace,...WINN.pond].map(([x,z])=>ground(x,z));
  if(samples.some(y=>y===null || !Number.isFinite(y)))return null;
  const terraceY=Math.min(...samples.slice(0,4) as number[]),waterY=Math.min(...samples.slice(4) as number[])-.12;
  const yields:GroundYield[]=[{ring:WINN.terrace,floor:()=>terraceY-.08},{ring:WINN.pond.map(outerPond),floor:()=>waterY-.12}];
  const b=new Builder();
  b.box(8,.2,5,840,terraceY-.1,-4059.5,CAP);
  // Small flagstone joints are part of the hard slab, at its surface.
  for(let x=837;x<844;x+=1.5)b.box(.045,.008,5,x,terraceY+.004,-4059.5,GRANITE);
  for(let z=-4061;z<-4057;z+=1.25)b.box(8,.008,.045,840,terraceY+.004,z,GRANITE);
  bench(b,[840,-4058],()=>terraceY,0);
  retainingEdge(b,WINN.channel,ground,{reveal:.28,width:.45,stone:GRANITE,cap:CAP});
  // Separate courses at the channel face make the edge read as stacked fieldstone.
  for(let i=1;i<WINN.channel.length;i++) {
    const a=WINN.channel[i-1],d=WINN.channel[i],len=Math.hypot(d[0]-a[0],d[1]-a[1]);
    const nx=-(d[1]-a[1])/len,nz=(d[0]-a[0])/len;
    for(let t=0;t<len;t+=1.2) {
      const x=a[0]+(d[0]-a[0])*t/len,z=a[1]+(d[1]-a[1])*t/len,y=ground(x,z);
      if(y===null)continue;
      b.box(.1,.32,.1,x+nx*.24,y+.1,z+nz*.24,'#7e8279');
    }
  }
  const r=rng(hashStr('winn-liriope'));
  for(let i=0;i<50;i++) {
    const x=823+r()*52,z=-4083+r()*30;
    if(!pointInRing(x,z,WINN.floor)||pointInRing(x,z,WINN.pond)||pointInRing(x,z,WINN.terrace))continue;
    const y=ground(x,z);if(y!==null)tuft(b,x,y,z,.32,7,'#607b48',r);
  }
  // Flat water; rim sides extend from the water level up to the adjacent bank.
  for(let i=0;i<WINN.pond.length;i++) {
    const a=WINN.pond[i],d=WINN.pond[(i+1)%WINN.pond.length];
    b.tri([862,waterY,-4070],[a[0],waterY,a[1]],[d[0],waterY,d[1]],'#768e85');
    const aa=outerPond(a),dd=outerPond(d);
    const ya=Math.max(waterY+.12,ground(...a)!,ground(...aa)!),yd=Math.max(waterY+.12,ground(...d)!,ground(...dd)!);
    b.quad([a[0],waterY-.15,a[1]],[d[0],waterY-.15,d[1]],[d[0],yd,d[1]],[a[0],ya,a[1]],GRANITE);
    b.quad([a[0],ya,a[1]],[d[0],yd,d[1]],[dd[0],yd,dd[1]],[aa[0],ya,aa[1]],i%3?CAP:'#a9ada0');
    b.quad([aa[0],waterY-.15,aa[1]],[aa[0],ya,aa[1]],[dd[0],yd,dd[1]],[dd[0],waterY-.15,dd[1]],GRANITE);
  }
  const layer=landscapeMesh(b),group=new THREE.Group();group.name='Winn Park ravine';group.add(layer.mesh);
  return {group,yields,triangles:layer.triangles,dispose:()=>layer.dispose()};
}
