import { expect, it } from 'vitest';
import upper from '../../../pipeline/prototypes/square-board/midtown-upper/context.json';
import brookwood from '../../../pipeline/prototypes/square-board/brookwood-south/context.json';
import { winnPark, WINN } from './winn-park';
import { pointInRing } from '../vignette/geom';
import type { TerrainCity } from '../terrain/transport-data';

it('keeps the western ravine inside its mapped park and adds no low-tier geometry',()=>{
  const city=upper as unknown as TerrainCity;
  const park=city.ground!.find(g=>g.name==='Winn Park')!;
  for(const ring of Object.values(WINN))for(const [x,z] of ring)expect(pointInRing(x,z,park.rings[0])).toBe(true);
  expect(winnPark(city,()=>0,'low')).toBeNull();
  expect(winnPark(brookwood as unknown as TerrainCity,()=>0,'high')).toBeNull();
  expect(winnPark({...city,ground:undefined},()=>0,'high')).toBeNull();
});

it('keeps high detail under 4000 triangles and yields below both hard surfaces on a slope',()=>{
  const ground=(x:number,z:number)=>.12*(x-840)+.06*(z+4060);
  const detail=winnPark(upper as unknown as TerrainCity,ground,'high')!;
  expect(detail).not.toBeNull();
  expect(detail.triangles).toBeGreaterThan(100);
  expect(detail.triangles).toBeLessThan(4000);
  expect(detail.yields).toHaveLength(2);
  // The cut is below the lowest existing edge, never a raised terrain plinth.
  for(const y of detail.yields)for(const [x,z] of y.ring)expect(y.floor(x,z)).toBeLessThan(ground(x,z));
  console.log('Winn high detail triangles',detail.triangles);
  detail.dispose();
  expect(winnPark(upper as unknown as TerrainCity,()=>null,'high')).toBeNull();
});
