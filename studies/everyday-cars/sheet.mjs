import {writeFileSync} from 'node:fs';
import {body, profiles} from './body.mjs';
import {retained} from './retained.mjs';

const line = Object.keys(profiles).concat(['hatch','van','box','semi']);
const names = {hatch:'Hatchback',van:'Work van',box:'Box truck',semi:'Tractor-trailer'};
const palette = ['#c6c6be','#765452','#415467','#aca99b','#384247','#edece6'];
const shows = [];
for (const style of line) {
  const model = profiles[style] ? body : retained;
  shows.push({style,label:profiles[style]?.label??names[style],faces:model(style,'#8099a6')});
}
// Two successive passes through the same lineup give a body two different paints.
// White service vehicles retain their specified finish in the street composition.
let paintSeed = 719;
function nextPaint() {
  paintSeed = (Math.imul(paintSeed, 1664525) + 1013904223) >>> 0;
  return palette[Math.floor(paintSeed / 2**32 * palette.length)];
}
const street = Array.from({length:2},(_,pass)=>line.filter(s=>s!=='alternate' && (s!=='taxi'||pass===0))
  .map(style=>{
    const paint = nextPaint();
    return {style,paint:['taxi','van'].includes(style)?'#edece6':paint};
  })).flat();
writeFileSync(new URL('street-layout.json',import.meta.url),JSON.stringify(street,null,2)+'\n');
process.stdout.write(JSON.stringify(shows));
