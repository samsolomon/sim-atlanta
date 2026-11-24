import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { xe60Geometry, xe60Pose, XE60_LAYOUT } from './xe60';

describe('XE60 articulated study geometry', () => {
  for (const tier of ['low', 'high'] as const) it(`keeps ${tier} sections on the ground with valid shared-material attributes`, () => {
    const gs=xe60Geometry(tier);
    let triangles=0;
    for(const [name,g] of Object.entries(gs)) {
      g.computeBoundingBox();const bb=g.boundingBox!;
      expect(bb.min.y).toBeGreaterThanOrEqual(-1e-6);
      expect(bb.max.y).toBeLessThanOrEqual(3.31);
      expect(bb.max.x-bb.min.x).toBeLessThan(2.75);
      const p=g.getAttribute('position');triangles+=p.count/3;
      for(const attr of ['color','normal','aKind','aBendWeight']) expect(g.getAttribute(attr).count,name+attr).toBe(p.count);
      expect([...p.array].every(Number.isFinite)).toBe(true);
      if(name!=='bellows')expect(bb.min.y).toBeCloseTo(0,5);
    }
    if(tier==='low')expect(triangles).toBeLessThanOrEqual(1500);
    Object.values(gs).forEach(g=>g.dispose());
  });
  it('matches the published straight axle spacings and bumper envelope',()=>{
    const {front,rear,bellows}=xe60Geometry('low');
    front.computeBoundingBox();rear.computeBoundingBox();
    const bb=new Box3().copy(front.boundingBox!).union(rear.boundingBox!.clone().translate(new Vector3(0,0,-8)));
    // Mirrors extend ahead of the bumper; length is measured over bumpers, not mirrors.
    expect(bb.min.z).toBeCloseTo(-16.34,4);
    expect(bb.max.z).toBeLessThan(2.4);
    expect(XE60_LAYOUT.front.axles[0]-XE60_LAYOUT.front.axles[1]).toBeCloseTo(229*.0254,6);
    expect(XE60_LAYOUT.front.axles[1]-(XE60_LAYOUT.rear.axles[0]-8)).toBeCloseTo(293*.0254,6);
    front.dispose();rear.dispose();bellows.dispose();
  });
  it('keeps the hitch coincident at both angle limits and clamps invalid poses',()=>{
    for(const angle of [-2,-.3,0,.3,2,NaN]) {
      const pose=xe60Pose(angle);
      const rearAnchor=new Vector3(...XE60_LAYOUT.rear.hitch).applyAxisAngle(new Vector3(0,1,0),pose.rear.yaw).add(new Vector3(pose.rear.x,pose.rear.y,pose.rear.z));
      expect(rearAnchor.distanceTo(new Vector3(...XE60_LAYOUT.front.hitch))).toBeLessThan(1e-9);
      expect(Math.abs(pose.angle)).toBeLessThanOrEqual(XE60_LAYOUT.maxAngle);
    }
  });
});
