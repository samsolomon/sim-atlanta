import {launchChrome} from '../../../scripts/chrome-cdp.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
const [control, candidate, output] = process.argv.slice(2);
if (!control || !candidate || !output) throw Error('Expected CONTROL_URL CANDIDATE_URL OUTPUT_DIR');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const runs=[];
for(const arm of ['before','after','before','after','before','after']){ const tier='low';
 const dest=output+'/'+tier+'-'+arm;mkdirSync(dest,{recursive:true});
 const browser=await launchChrome('north-ansley-',['--headless=new','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']);
 try{
 const ws=new WebSocket(browser.wsUrl);await new Promise(r=>ws.onopen=r);
 const queue=new Map();let id=0;
 ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const [ok,err]=queue.get(m.id);queue.delete(m.id);m.error?err(Error(m.error.message)):ok(m.result);}else if(m.method==='Runtime.exceptionThrown')console.error(m.params.exceptionDetails.exception?.description)};
 const send=(method,params={})=>new Promise((ok,err)=>{queue.set(++id,[ok,err]);ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
 const size=(width,height)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await send('Page.enable');await send('Runtime.enable');await size(384,692);
 const url=(arm==='before'?control:candidate)+'/?view=city&railWitness&q='+tier+'&cam=1310,-5810,30,55,350&t=2026-11-20T14:00:00-05:00&weather=clear&speed=0';
 await send('Page.navigate',{url});
 for(let i=0;i<300&&!await ev('window.__northStudy?.state().rows.includes("r16")');i++)await sleep(500);
 if(!await ev('window.__northStudy?.state().rows.includes("r16")'))throw Error('Missing r16 '+url);
 await ev("document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'body > *:not(#view3d), #view3d > *:not(#view3d-canvas), #view3d-canvas > *:not(canvas){visibility:hidden!important}'}));true");
 await ev("(()=>{let s=__burial.scene,old=s.onBeforeRender;s.onBeforeRender=function(r,...rest){window.studyRenderer=r;return old.call(this,r,...rest)};return true})()");
 await ev('__burial.view(-35,56,720,1280,-5750)');await sleep(1100);
 await send('Emulation.setCPUThrottlingRate',{rate:6});
 const sample=await ev(`new Promise(resolve=>{
 let frame=0,last=0; const durations=[],draws=[],tris=[];
 const next=t=>{
   if(frame>30){durations.push(t-last);draws.push(studyRenderer.info.render.calls);tris.push(studyRenderer.info.render.triangles);}
   last=t;
   __burial.view(-35+12*Math.sin(frame*2*Math.PI/180),56,720,1280,-5750);
   if(++frame<212)requestAnimationFrame(next);
   else {
    const q=(a,p)=>a.sort((x,y)=>x-y)[Math.ceil(a.length*p)-1];
    resolve({n:durations.length,p50:q(durations,.5),p95:q(durations,.95),draws:q(draws,.5),triangles:q(tris,.5),programs:studyRenderer.info.programs.length,...studyRenderer.info.memory});
   }
 };requestAnimationFrame(next)})`);
 runs.push({arm,...sample});console.log(arm,sample);writeFileSync(output+'/low-orbit.json',JSON.stringify(runs,null,2));
 ws.close();
 }finally{await browser.close()}
}
