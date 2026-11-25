import assert from 'node:assert/strict';
import { board } from '../i85-cohesion/fixture-board';
import axes from './axes.json';
import { Line,type P2 } from '../../../web/src/vignette/geom';
import { sections,startGain } from './profile';
import { stripePoint } from '../../../web/src/terrain/connector-corridor';

for(const tier of ['low','high'] as const){
  const fixture=board('pipeline/prototypes/square-board/brookwood-station',tier);
  for(const id of [1257642775,484857195] as const){
    const pts=axes[id].pts as P2[], axis=new Line(pts);
    const run=fixture.city.terrainTransport!.roads.find(r=>r.deckWeight && r.sourceAxis?.[0][0]===pts[0][0] && r.sourceAxis?.[0][1]===pts[0][1])!;
    assert(run?.drawTread);
    const last=startGain*(1-new Line(run.pts).length/axis.length);
    const branch=id===1257642775, lanes=branch?1:5;
    let supported=0,missing=0,maxToe=0;
    for(let d=0;d<Math.floor((last-startGain)*4);d++){
      const s=startGain+.02+d/4, row=sections('gain',s)[branch?'ramp':'main'];
      for(let lane=0;lane<lanes;lane++)for(const offset of [-.8,0,.8]){
        const [x,z]=stripePoint(row,(lane+.5+offset/3.55)/lanes);
        if(fixture.deck(x,z,run)===null) missing++;else supported++;
      }
    }
    for(const f of [.01,.25,.5,.75,.99]){
      const inner=sections('gain',last-.02)[branch?'ramp':'main'];
      const [x,z]=stripePoint(inner,f);
      const deck=fixture.deck(x,z,run),ground=fixture.ground(x,z);
      assert(deck!==null && ground!==null);
      maxToe=Math.max(maxToe,Math.abs(deck-ground));
    }
    console.log({tier,id,last,supported,missing,maxToe});
    assert.equal(missing,0);
    assert(maxToe<.025);
  }
}
