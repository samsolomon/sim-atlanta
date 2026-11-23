"""Measure a pinned City skyline on the local Vite server through Orca desktop."""
import json
import subprocess
import sys
import time
from pathlib import Path

def o(*args):
    result = subprocess.run(["orca", *args, "--json"], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)["result"]


def ev(js):
    value = o("eval", "--page", p, "--expression", js)["result"]
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return value


pack=Path('pipeline/prototypes');base={n:json.loads((p/'context.json').read_bytes())['trees'] for p in (pack/'king-memorial',pack/'sweet-auburn',*(pack/'square-board').glob('*')) if (p/'context.json').exists() for n in [p.name]}
p=o('tab','create','--worktree','path:'+str(Path.cwd()),'--url','about:blank')['browserPageId']
def wait(exp):
 for _ in range(160):
  if ev(exp):return
  time.sleep(.25)
 raise RuntimeError((exp,ev('document.body.innerText')))
try:
 # Alternate order within each quality. The receiver is the only open Marlin QA tab.
 for q,version in [tuple(v.split('/')) for v in sys.argv[1:]]:
  o('goto','--page',p,'--url','http://127.0.0.1:5377/?view=map&board=square&q='+q+'&t=2026-10-20T14:00:00-04:00&speed=0')
  wait('Boolean(document.querySelector("#map") && document.readyState==="complete")')
  ev("(()=>{const baseline="+json.dumps(base)+""";const version="""+json.dumps(version)+""";const quality="""+json.dumps(q)+""";const load=window.fetch.bind(window);window.fetch=async(...args)=>{const r=await load(...args);if(!r.url.endsWith('/context.json'))return r;const c=await r.json();if(version==='old'){c.trees=baseline[c.name];delete c.treeLowCount;}else if(version==='full'){if(quality==="low" && c.treeLowCount!==undefined)c.trees=c.trees.slice(0,c.treeLowCount);delete c.treeLowCount;}return new Response(JSON.stringify(c),{status:r.status,headers:r.headers});};return true})()""")
  o('exec','--page',p,'--command','find role button click --name City --exact')
  wait('Boolean(window.__city && document.querySelector("#city-info button") && document.querySelector("#city-loading").hidden)')
  ev('document.querySelector("#city-info button").click();true')
  wait('document.querySelector("#city-info button").textContent.includes("Frame")')
  ev('__city.lookAt(1195,-1240,{bearing:-142,metresPerPixel:1.03,tilt:72});true')
  time.sleep(3)
  ev('''(()=>{let first=0,last=0;const d=[];function frame(t){if(last)d.push(t-last);else first=t;last=t;if(t-first<7000)requestAnimationFrame(frame);else{d.sort((a,b)=>a-b);const stat=__city.stats();window.__marlinTimes={frames:d.length,ms:t-first,mean:(t-first)/d.length,p50:d[Math.floor(d.length*.5)],p95:d[Math.floor(d.length*.95)],triangles:stat.triangles,draws:stat.drawCalls,size:[innerWidth,innerHeight,devicePixelRatio],visible:document.visibilityState,camera:__city.camera()}}}requestAnimationFrame(frame);return true})()''')
  time.sleep(7.1);wait('Boolean(window.__marlinTimes)');print(q,version,json.dumps(ev('window.__marlinTimes')),flush=True)
finally:o('tab','close','--page',p)
