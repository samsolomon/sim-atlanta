// Node 22+. Pass the Air-local ADB Chrome debugging port and an output directory.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [port, output] = process.argv.slice(2);
if (!port || !output) throw Error('usage: node neighbor-phone.mjs PORT OUTPUT_DIRECTORY');
mkdirSync(output, { recursive: true });
const endpoint = 'http://127.0.0.1:' + port;
const sleep = ms => new Promise(done => setTimeout(done, ms));
const arms = ['stock', 'deferred', 'deferred', 'stock', 'stock', 'deferred'];
for (const [index, mode] of arms.entries()) {
  const result = { mode, index, snapshots: [], network: [], inputs: [] };
  const tab = await (await fetch(endpoint + '/json/new?about:blank', {method:'PUT'})).json();
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let seq = 0;
  const pending = new Map();
  socket.onmessage = ({data}) => {
    const m = JSON.parse(data);
    if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); }
    if (m.method === 'Network.responseReceived') {
      const r = m.params.response;
      result.network.push({url:r.url,status:r.status,disk:r.fromDiskCache,worker:r.fromServiceWorker,id:m.params.requestId});
    } else if (m.method === 'Network.requestServedFromCache' || m.method === 'Network.loadingFinished') {
      result.network.push({event:m.method,id:m.params.requestId,bytes:m.params.encodedDataLength});
    }
  };
  const call = (method, params = {}) => new Promise((resolve,reject) => {
    const id = ++seq;
    pending.set(id,m => m.error ? reject(Error(JSON.stringify(m.error))) : resolve(m.result));
    socket.send(JSON.stringify({id,method,params}));
  });
  const evaluate = async expression => {
    const r = await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const until = async expression => {
    for(let i=0;i<600;i++){ if(await evaluate(expression)) return; await sleep(250); }
    throw Error('Timed out: '+expression);
  };
  const snapshot = async label => result.snapshots.push({label,...await evaluate("({t:performance.now(),pose:__neighbor.pose(),distance:__neighbor.distance(),areas:__neighbor.areas(),allocations:__neighbor.allocations(),heap:performance.memory?.usedJSHeapSize})")});
  const touch = (type,points) => call('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x,y,id}))});
  const tap = async (x,y) => {await touch('touchStart',[[x,y]]);await touch('touchEnd',[]);};
  const centerOf = async expr => evaluate('(()=>{const e='+expr+';if(!e)return null;const r=e.getBoundingClientRect();return r.width&&r.height?[r.x+r.width/2,r.y+r.height/2]:null})()');
  try {
    await call('Network.enable');
    await call('Page.enable');
    await call('Page.bringToFront');
    // Gets a cold fixture load without clearing the owner's other Chrome profiles or origins.
    await call('Network.setCacheDisabled',{cacheDisabled:true});
    const url = 'http://localhost:5198/?view=city&q=low&perf&neighbor='+mode+'&cam=-92,-4600,40,58,420&t=2026-11-20T14:00:00-05:00&speed=0&weather=clear';
    await call('Page.navigate',{url});
    await until("performance.getEntriesByName('neighbor:initial:usable').length");
    await snapshot('initial-usable-observed');
    await until('__neighbor.areas().length === '+(mode==='stock'?12:11));
    await call('Network.setCacheDisabled',{cacheDisabled:false});
    await sleep(1000);
    await snapshot('initial-settled');
    for(const leg of ['station','south','station']){
      const marks="performance.getEntriesByName('neighbor:"+leg+":usable').length";
      const before=await evaluate(marks);
      await evaluate('__neighbor.go('+JSON.stringify(leg)+')');
      await until(marks+'>'+before);
      await snapshot(leg);
      await sleep(1000);
    }
    const [x,y] = await evaluate('[innerWidth*.49,innerHeight*.54]');
    const observe = async (kind,action) => {
      await evaluate("window.__inputSamples=[];window.__inputStart=undefined;window.addEventListener('pointerdown',()=>window.__inputStart=performance.now(),{capture:true,once:true});{const samples=window.__inputSamples;requestAnimationFrame(function sample(){samples.push([performance.now(),...__neighbor.pose(),__neighbor.distance()]);if(samples===window.__inputSamples && samples.length<240)requestAnimationFrame(sample)})}");
      await action();
      await sleep(500);
      result.inputs.push({kind,...await evaluate('({start:window.__inputStart,samples:window.__inputSamples})')});
    };
    await observe('pan',async()=>{
      await touch('touchStart',[[x,y]]);
      for(let i=1;i<=6;i++){await touch('touchMove',[[x+i*7,y]]);await sleep(16);}
      await touch('touchEnd',[]);
    });
    await observe('pinch',async()=>{
      await touch('touchStart',[[x-24,y],[x+24,y]]);
      for(let i=1;i<=6;i++){await touch('touchMove',[[x-24-i*4,y],[x+24+i*4,y]]);await sleep(16);}
      await touch('touchEnd',[]);
    });
    const search=await centerOf("document.querySelector('button[aria-label=\"Search Atlanta\"]')");
    if(search) await tap(...search);
    else { const field=await centerOf("document.querySelector('input[aria-label=\"Search Atlanta\"]')"); if(field) await tap(...field); }
    await call('Input.insertText',{text:'Five Points'});
    await sleep(300);
    const hit=await centerOf("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Five Points from above') && b.offsetWidth)");
    if(hit) await observe('select-view',()=>tap(...hit));
    else result.inputs.push({kind:'select-view',error:'No visible Five Points view result'});
    await snapshot('after-input');
  } catch (e) { result.error=String(e); }
  finally {
    try {result.data=await evaluate("({marks:performance.getEntriesByType('mark').filter(m=>m.name.startsWith('neighbor:')).map(m=>m.toJSON()),frames:window.__neighbor?.frames,resources:performance.getEntriesByType('resource').map(r=>r.toJSON()),viewport:[innerWidth,innerHeight,devicePixelRatio]})");} catch {}
    writeFileSync(join(output,index+'-'+mode+'.json'),JSON.stringify(result));
    socket.close();
    await fetch(endpoint+'/json/close/'+tab.id);
  }
  console.log(index,mode,result.error??'complete');
  if(result.error) process.exitCode=1;
}
