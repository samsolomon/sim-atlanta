// Offline sections through the same drawn triangles and the same local 3DEP cells as City.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GroundGrid } from '../../../web/src/terrain/grid';
import { GroundSurface, type TerrainQuality } from '../../../web/src/terrain/surface';
import { east, west, lowerStrips } from '../i85-cohesion/lower';
import { rampLining, rampSection } from './lining';
import { rampMouthSlots } from './mouths';

const [source, output] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(join(source,'ground.json'),'utf8'));
const input = readFileSync(join(source,'ground.i16'));
const bounds = {minX:810,maxX:1040,minZ:-5850,maxZ:-5730};
const {stepM} = manifest;
const cols = (bounds.maxX-bounds.minX)/stepM+1, rows = (bounds.maxZ-bounds.minZ)/stepM+1;
const cells = new Int16Array(cols*rows);
for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
  const i = (bounds.minX-manifest.bounds.minX)/stepM+c;
  const j = (bounds.minZ-manifest.bounds.minZ)/stepM+r;
  cells[r*cols+c]=input.readInt16LE(2*(j*manifest.cols+i));
}
const grid=new GroundGrid({...manifest,cols,rows,bounds},cells.buffer);
type Vertex=readonly number[];
type Face={vertices:Vertex[]; material:string};
function hit(face:Face,x:number,z:number) {
  const [a,b,c]=face.vertices;
  const dx=b[0]-a[0], dz=b[2]-a[2], ex=c[0]-a[0], ez=c[2]-a[2];
  const det=dx*ez-dz*ex;
  if(Math.abs(det)<1e-9)return null;
  const u=((x-a[0])*ez-(z-a[2])*ex)/det, v=(dx*(z-a[2])-dz*(x-a[0]))/det;
  return u>=-1e-7 && v>=-1e-7 && u+v<=1+1e-7 ? a[1]+u*(b[1]-a[1])+v*(c[1]-a[1]) : null;
}
const records=[['tier','station_from_east_m','offset_right_m','x','z','uncut_ground','before_ground','after_ground',
  'drawn_pavement','lining_floor','drawn_soffit','roof_or_wing_crown','after_minus_crown','after_minus_soffit'].join(',')];
for(const tier of ['low','high'] as TerrainQuality[]) {
  const original=new GroundSurface(grid,tier);
  const ground=original.sampleScene.bind(original);
  const slots=rampMouthSlots(ground);
  const baseline=new GroundSurface(grid,tier,slots.map(slot=>({...slot,cutHeightM:undefined})));
  const candidate=new GroundSurface(grid,tier,slots);
  const byCell=new Map<string,Face[]>();
  function add(vertices:Vertex[],material:string) {
    const rounded=vertices.map(p=>p.map(Math.fround)),xs=rounded.map(p=>p[0]),zs=rounded.map(p=>p[2]);
    const face={vertices:rounded,material};
    for(let i=Math.floor(Math.min(...xs)/5);i<=Math.floor(Math.max(...xs)/5);i++)
      for(let j=Math.floor(Math.min(...zs)/5);j<=Math.floor(Math.max(...zs)/5);j++) {
        const key=i+','+j; if(!byCell.has(key))byCell.set(key,[]);byCell.get(key)!.push(face);
      }
  }
  lowerStrips(ground,(v,_color,tread)=>{if(tread){add(v.slice(0,3),'pavement');add(v.slice(3),'pavement');}});
  rampLining(ground,(a,b,c,d,color)=>{add([a,b,c],color);add([a,c,d],color);});
  let restored=0,covered=0,worstChange=0;
  for(let s=-15;s<=west-east+25;s+=.25) {
    const row=rampSection(east+s,ground);
    const dx=(row.right[0]-row.left[0])/4.95,dz=(row.right[2]-row.left[2])/4.95;
    const leftEdge=-2.375-1.525*row.wing,rightEdge=2.575+1.525*row.wing;
    const offsets=[-7,leftEdge-.30,leftEdge-.08,leftEdge+.03,-2,-.79,0,.79,2,rightEdge-.03,rightEdge+.08,rightEdge+.30,7];
    for(const offset of offsets) {
      const x=row.left[0]+(offset+2.375)*dx,z=row.left[2]+(offset+2.375)*dz;
      const old=baseline.sampleScene(x,z),next=candidate.sampleScene(x,z),bare=ground(x,z);
      const tops=new Map<string,number>();
      for(const f of byCell.get(Math.floor(x/5)+','+Math.floor(z/5))??[]) {
        const y=hit(f,x,z); if(y!==null)tops.set(f.material,Math.max(y,tops.get(f.material)??-Infinity));
      }
      const crown=tops.get('#aaa18d'),ceiling=tops.get('#969182');
      if(s>0 && s<40 && crown!==undefined && bare!==null && bare>crown+.01 &&
        Math.abs(offset)<3 && (next===null || Math.abs(next-bare)>.001))
        throw new Error('Original cover missing at '+[tier,s,offset]);
      if(s>0 && s<40 && ceiling!==undefined && next!==null) {
        if(next<ceiling-.002)throw new Error('Terrain obstructs bore at '+[tier,s,offset]);
        covered++;
        if(old===null && crown!==undefined && next>=crown && bare!==null) {
          restored++;worstChange=Math.max(worstChange,Math.abs(next-bare));
        }
      }
      if((s<0 || s>40 || Math.abs(offset)>=7) &&
        ((old===null)!==(next===null) || (old!==null && next!==null && Math.abs(old-next)>.001)))
        throw new Error('Outside control changed at '+[tier,s,offset]);
      records.push([tier,s,offset,x,z,bare,old,next,tops.get('pavement'),tops.get('#777574'),ceiling,crown,
        next!=null && crown!==undefined? next-crown:null,next!=null && ceiling!==undefined? next-ceiling:null].join(','));
    }
  }
  if(!restored)throw new Error('The capped excavation failed to restore any bank');
  console.log({tier,restoredAboveCrown:restored,probedCover:covered,maxErrorVsOriginalM:worstChange});
  for(const surface of [original,baseline,candidate])surface.geometry.dispose();
}
writeFileSync(output,records.join('\n')+'\n');
