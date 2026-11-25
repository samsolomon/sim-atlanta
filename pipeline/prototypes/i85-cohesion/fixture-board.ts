import { readFileSync } from 'node:fs';
import { brookwoodGrid } from '../../../web/src/city/brookwood';
import { midtownConnectorGround } from '../../../web/src/terrain/midtown-connector-ground';
import { midtownConnectorDecks } from '../../../web/src/terrain/midtown-connector-decks';
import { auburnTransport } from '../../../web/src/city/sweet-auburn-transport';
import { GroundSurface } from '../../../web/src/terrain/surface';
import { createSurfaceTransport } from '../../../web/src/terrain/transport';
import { cityRoadHeight } from '../../../web/src/city/road-height';
import { bridgeApproaches } from '../../../web/src/terrain/bridge-approaches';
import { seventeenthPortals } from '../../../web/src/city/seventeenth-street';
import { northFreeway } from '../north-freeway/carrier';
export function board(path:string,tier:'low'|'high'='low') {
 const read=(file:string)=>readFileSync(path+'/'+file);
 const m=JSON.parse(read('ground.json').toString());
 const grid=brookwoodGrid(m,midtownConnectorGround(m,Uint8Array.from(read('ground.i16')).buffer));
 const city=northFreeway(midtownConnectorDecks(auburnTransport(JSON.parse(read('context.json').toString()))));
 const ground=new GroundSurface(grid,tier,undefined,[{z:-5700,minX:-1000,maxX:1800}]);
 const banks=bridgeApproaches(seventeenthPortals(city),323.8,ground.sampleScene.bind(ground),city.bounds,city.roads);
 const deck=createSurfaceTransport(city,grid,banks.groundAt);
 return {city,deck:deck.deckAt,ground:banks.groundAt,road:cityRoadHeight(city,banks.groundAt,deck.deckAt)};
}
