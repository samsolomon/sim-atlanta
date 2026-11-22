import * as THREE from 'three';
import type { Builder, P2 } from '../vignette/geom';
import type { BuildingFinish, VBuilding } from '../vignette/world';

type House = { form: 'gable' | 'double' | 'hip'; siding: string; floor: number };
// Floors are offsets above City's minimum perimeter foundation. Across the
// three street edges the rendered grade sits 0.95–2.07 m above that base.
const houses: Record<string, House> = {
  'osm:way:270493826': { form: 'gable', siding: '#899788', floor: 2.05 },
  'osm:way:270493832': { form: 'double', siding: '#c4bdaa', floor: 2.95 },
  'osm:way:270493845': { form: 'hip', siding: '#914f45', floor: 2.65 },
};
const trim = '#e2ddcb', roof = '#56575a', masonry = '#887e6e';

// All three fronts face Irwin. Fit the local axes to the mapped front
// edge. The middle house has a mapped step in its rear wall.
function frame(ring: P2[]) {
  const north = Math.min(...ring.map(p => p[1]));
  const front = ring.filter(p => p[1] < north + .6).sort((a,b) => a[0] - b[0]);
  const a = front[0], b = front[front.length - 1];
  const width = Math.hypot(b[0]-a[0], b[1]-a[1]);
  if (width < 5) return;
  const dx = (b[0]-a[0])/width, dz = (b[1]-a[1])/width;
  const outline = ring.map(([x,z]): P2 => [(x-a[0])*dx + (z-a[1])*dz, -(x-a[0])*dz + (z-a[1])*dx]);
  const matrix = new THREE.Matrix4().makeRotationY(-Math.atan2(dz,dx)).setPosition(a[0],0,a[1]);
  return {
    width, outline, matrix,
    point: (u: number, y: number, v: number) => [a[0]+dx*u-dz*v, y, a[1]+dz*u+dx*v],
  };
}

export function irwinHouseFinish(building: VBuilding): BuildingFinish | undefined {
  const house = houses[building.id];
  if (!house || building.rings.length !== 1 || building.rings[0].length < 3 || building.h || building.floors) return;
  const { form, siding, floor } = house;
  const fitted = frame(building.rings[0]);
  if (!fitted) return;
  const { width: w, outline, matrix, point: p } = fitted;
  const back = outline.filter(([,v]) => v > 1);
  const depth = Math.max(...back.map(([,v])=>v));
  const westBack = back.filter(([u]) => u < .25).sort((a,b)=>b[1]-a[1])[0];
  const eastBack = back.filter(([u]) => u > w-.25).sort((a,b)=>b[1]-a[1])[0];
  const step = back.find(([u,v])=>u>.25 && u<w-.25 && v>depth-.25);
  if (!westBack || !eastBack || (form === 'double' && !step)) return;
  const porchShade = '#' + new THREE.Color(siding).multiplyScalar(.72).getHexString();
  const porch = 2.35, porchLeft = form === 'gable' ? w*.30 : 0;
  const wallHeight = floor + 2.9;
  return {
    wall: siding, roof, fallbackHeight: wallHeight,
    drawRing(batch, _ring, _hole, base, eave, glass) {
      const deck = base + floor;
      const box = (l: number, r: number, lo: number, hi: number, front: number, back: number, color: string) =>
        batch.box(r-l, hi-lo, back-front, (l+r)/2, (lo+hi)/2, (front+back)/2, color, matrix);
      // The porch and its steps open toward the street. Side and rear walls
      // follow the OSM outline, including the shallow service wing on 832.
      box(porchLeft,w,base-1,deck,-.12,porch,masonry);
      const entry = porchLeft + (w-porchLeft)*.43;
      for (let i = 0; i < 6; i++) {
        box(entry-.84,entry+.84,base-1.7,deck-(i+1)*.17,-.12-(i+1)*.31,-.12-i*.31,masonry);
      }
      const wall = (a: P2, b: P2, treatment: 'front' | 'side' | 'back' | 'return') => {
        const du = b[0]-a[0], dv = b[1]-a[1], length = Math.hypot(du,dv);
        // Outline traverses the house starting
        // with the west wall toward the back. Offset trim outside its wall.
        const face = (along: number, y: number, out: number) =>
          p(a[0]+du*along/length-dv*out/length,y,a[1]+dv*along/length+du*out/length);
        const panel = (target: Builder, l: number, r: number, lo: number, hi: number, out: number, color: string) =>
          target.quad(face(l,lo,out),face(r,lo,out),face(r,hi,out),face(l,hi,out),color);
        panel(batch,0,length,base-1,deck,0,masonry);
        panel(batch,0,length,deck,eave,0,treatment === 'front' ? porchShade : siding);
        for (let h=deck+.27; h<eave-.1; h+=.30) panel(batch,0,length,h,h+.026,.013,'#aaa698');
        panel(batch,0,length,eave-.15,eave,.025,trim);
        if (length < 2 || treatment === 'return') return;
        const door = treatment === 'front' ? a[0]-entry : length*.53;
        if (treatment === 'front' || (treatment === 'back' && length > 4)) {
          // The facade runs east to west on its street side.
          panel(batch,door-.54,door+.54,deck,deck+2.20,.04,trim);
          panel(batch,door-.44,door+.44,deck+.03,deck+2.11,.055,'#696c60');
          panel(glass,door-.32,door+.32,deck+1.12,deck+1.94,.07,'#687879');
        }
        const count = Math.max(1,Math.round(length/(treatment === 'side' ? 4.5 : 2.8)));
        for (let i=0; i<count; i++) {
          const u=length*(i+.5)/count;
          if ((treatment === 'front' || (treatment === 'back' && length>4)) && Math.abs(u-door)<1.27) continue;
          panel(batch,u-.58,u+.58,deck+.78,deck+2.2,.04,trim);
          panel(glass,u-.47,u+.47,deck+.89,deck+2.10,.055,'#788989');
          panel(batch,u-.48,u+.48,deck+1.47,deck+1.53,.066,trim);
        }
      };
      // The source rings start at different corners. Walk the back perimeter
      // from the western front corner, leaving the porch open on the north.
      wall([0,porchLeft ? 0 : porch],westBack,'side');
      if (step && form === 'double') {
        wall(westBack,[step[0],westBack[1]],'side');
        wall([step[0],westBack[1]],step,'return');
        wall(step,eastBack,'back');
      } else wall(westBack,eastBack,'back');
      wall(eastBack,[w,porch],'side');
      wall([w,porch],[porchLeft,porch],'front');
      if (porchLeft) {
        wall([porchLeft,porch],[porchLeft,0],'return');
        wall([porchLeft,0],[0,0],'side');
      }
      const posts = form === 'gable' ? 3 : 4;
      for (let i=0; i<posts; i++) {
        const u=porchLeft+.2+(w-porchLeft-.4)*i/(posts-1);
        const pier = form === 'double' ? .30 : .17;
        box(u-pier,u+pier,deck,deck+.82,0,.37,masonry);
        box(u-.11,u+.11,deck+.82,eave, .06,.29,trim);
      }
      box(porchLeft,w,eave-.23,eave,0,.30,trim);
      for (const [l,r] of [[porchLeft+.13,entry-.88],[entry+.88,w-.13]]) {
        box(l,r,deck+.73,deck+.83,.07,.17,trim);
        for (let u=l+.15; u<r; u+=.38) box(u-.023,u+.023,deck+.05,deck+.75,.10,.15,trim);
      }
    },
    dressRoof(batch,_ring,eave) {
      const gable = (l: number,r: number,front: number,back: number,y: number,rise: number) => {
        const mid=(l+r)/2;
        for (const end of [front,back]) {
          batch.tri(p(l,y,end),p(r,y,end),p(mid,y+rise,end),siding);
          const fascia = end === front ? end-.015 : end+.015;
          for (const edge of [l,r]) batch.quad(p(edge,y,fascia),p(mid,y+rise,fascia),p(mid,y+rise-.14,fascia),p(edge,y-.14,fascia),trim);
        }
        for (const edge of [l,r]) batch.quad(p(edge,y,front),p(edge,y,back),p(mid,y+rise,back),p(mid,y+rise,front),roof);
      };
      const hip = (l:number,r:number,front:number,back:number,y:number,rise:number,run:number) => {
        const mid=(l+r)/2, near=p(mid,y+rise,front+run), far=p(mid,y+rise,back-run);
        batch.tri(p(l,y,front),near,p(r,y,front),roof);
        batch.tri(p(r,y,back),far,p(l,y,back),roof);
        for (const edge of [l,r]) batch.quad(p(edge,y,front),p(edge,y,back),far,near,roof);
      };
      if (form === 'hip') {
        hip(-.22,w+.22,-.28,depth+.2,eave,2.7,4.9);
        // Hipped dormer rises through the long slope over the porch.
        const l=w*.31,r=w*.69,v=1.65,top=eave+2.15;
        batch.quad(p(l,eave+.8,v),p(r,eave+.8,v),p(r,top,v),p(l,top,v),siding);
        for (const u of [l,r]) batch.quad(p(u,eave+.8,v),p(u,eave+.8,v+2.45),p(u,top,v+2.45),p(u,top,v),siding);
        hip(l-.12,r+.12,v-.13,v+2.65,top,.75,1.1);
        batch.quad(p(l+.55,top-.72,v-.02),p(r-.55,top-.72,v-.02),p(r-.55,top-.17,v-.02),p(l+.55,top-.17,v-.02),trim);
        for(let i=0;i<3;i++) {
          const u=l+.68+i*(r-l-1.36)/3;
          batch.quad(p(u,top-.62,v-.03),p(u+.48,top-.62,v-.03),p(u+.48,top-.27,v-.03),p(u,top-.27,v-.03),'#657375');
        }
      } else {
        const mainDepth = form === 'double' ? westBack[1] : depth;
        gable(-.18,w+.18,form === 'gable' ? .55 : porch-.32,mainDepth+.15,eave,2.6);
        if (form === 'gable') {
          gable(porchLeft-.15,w+.15,-.3,porch+.2,eave,1.95);
          const mid = (porchLeft+w)/2;
          batch.quad(p(mid-.92,eave+.35,-.33),p(mid+.92,eave+.35,-.33),p(mid+.92,eave+1.02,-.33),p(mid-.92,eave+1.02,-.33),trim);
          for (const left of [mid-.81,mid+.03]) batch.quad(p(left,eave+.44,-.34),p(left+.78,eave+.44,-.34),p(left+.78,eave+.93,-.34),p(left,eave+.93,-.34),'#748383');
        } else if (step) {
          gable(w*.48,w+.05,porch-.57,porch+4.2,eave,1.8);
          batch.quad(p(-.2,eave,-.35),p(w+.2,eave,-.35),p(w+.2,eave+.85,porch+.12),p(-.2,eave+.85,porch+.12),roof);
          for (const u of [-.2,w+.2]) batch.tri(p(u,eave,-.35),p(u,eave,porch+.12),p(u,eave+.85,porch+.12),trim);
          gable(step[0],w,mainDepth,depth+.12,eave,.9);
        }
      }
    },
  };
}
