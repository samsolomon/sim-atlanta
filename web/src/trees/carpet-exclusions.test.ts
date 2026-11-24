import { InstancedMesh } from 'three';
import { expect, it } from 'vitest';
import { RolloutBatch, rolloutSpecies } from './rollout-city';
import type { P2 } from '../vignette/geom';

it('excludes an overlapping leaf disc without changing either tree, at both tiers',()=>{
  const plan={species:[0,30].map(x=>({species:'loblolly-pine',x,z:0,heightM:12,spreadM:10,size:'mature',seed:9}))} as unknown as Parameters<typeof rolloutSpecies>[0];
  const cut:P2[]=[[4,-1],[6,-1],[6,1],[4,1]];
  for(const quality of ['high','low'] as const){
    const build=(cuts:P2[][])=>{
      const batch=new RolloutBatch();
      const row=rolloutSpecies(plan,quality,()=>0,batch,cuts)!;
      batch.flush();batch.setSeason(324);
      const carpet=batch.group.getObjectByName('carpet') as InstancedMesh;
      const matrices:number[][]=[];
      batch.group.traverse(o=>{if(o instanceof InstancedMesh && o.name!=='carpet')matrices.push(Array.from(o.instanceMatrix.array));});
      const result={count:row.count,carpets:carpet.count,matrices};
      row.dispose();batch.flush();
      return result;
    };
    const normal=build([]),excluded=build([cut]);
    expect(normal.carpets).toBe(2);
    expect(excluded.carpets).toBe(1);
    expect(excluded.count).toBe(2);
    expect(excluded.matrices).toEqual(normal.matrices);
  }
});
