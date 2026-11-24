import {body} from './body.mjs';
import {commercial} from './commercial.mjs';
import {sedanFinish,tractorFinish} from './finish.mjs';

const studies = {};
for (const [name,original,finish] of [
  ['sedan',body('sedan'),sedanFinish],
  ['tractor',commercial('classic'),tractorFinish],
]) {
  studies[name] = {
    before:original.map(f=>({...f,color:f.color==='#8099a6'?'#9aabb0':f.color})),
    close:finish(true),
    distant:finish(false),
  };
}
process.stdout.write(JSON.stringify(studies));
