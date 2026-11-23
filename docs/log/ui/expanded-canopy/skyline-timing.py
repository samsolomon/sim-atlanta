"""Measure a pinned City skyline on the local Vite server through Orca desktop."""
import json
import os
import subprocess
import sys
import time
from pathlib import Path


def orca(*args):
    result = subprocess.run([os.environ.get("ORCA_CLI_COMMAND", "orca"), *args, "--json"],
                            capture_output=True, text=True)
    response = json.loads(result.stdout)
    if not response["ok"]:
        raise RuntimeError(response["error"])
    return response["result"]


def evaluate(js):
    value = orca("eval", "--page", page, "--expression", js)["result"]
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return value


def wait(expression):
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        if evaluate(expression):
            return
        time.sleep(.25)
    raise RuntimeError((expression, evaluate("document.body.innerText")))


pack = Path("pipeline/prototypes")
areas = [pack / "king-memorial", pack / "sweet-auburn", *(pack / "square-board").glob("*")]
baseline = {area.name: json.loads((area / "context.json").read_bytes())["trees"]
            for area in areas if (area / "context.json").exists()}

# Keep the staged files intact. Removing treeLowCount selects the original leaf mesh.
install = """(function(baseline, quality, version) {
    const load = window.fetch.bind(window);
    window.samplePacks = new Map();
    window.fetch = async (...args) => {
        const response = await load(...args);
        if (!response.url.endsWith('/context.json')) return response;
        const c = await response.json();
        if (!(c.name in baseline) || !Number.isInteger(c.treeLowCount))
            throw Error('Expected a staged canopy pack: ' + c.name);
        if (version === 'old') c.trees = baseline[c.name];
        if (version === 'full' && quality === 'low') c.trees = c.trees.slice(0, c.treeLowCount);
        if (version !== 'simple') delete c.treeLowCount;
        samplePacks.set(c.name, c.treeLowCount !== undefined && quality === 'low' ? c.treeLowCount : c.trees.length);
        return new Response(JSON.stringify(c), {status: response.status, headers: response.headers});
    };
    return true;
})"""

sample = """(() => {
    let first, last, visible = true;
    const intervals = [];
    function frame(t) {
        visible &&= document.visibilityState === 'visible';
        if (first === undefined) first = t;
        else intervals.push(t - last);
        last = t;
        if (t - first < 7000) return requestAnimationFrame(frame);
        intervals.sort((a,b) => a-b);
        const stat = __city.stats();
        window.skylineSample = {
            frames: intervals.length, ms: t-first, mean: (t-first)/intervals.length,
            p50: intervals[Math.floor(intervals.length*.50)], p95: intervals[Math.floor(intervals.length*.95)],
            triangles: stat.triangles, draws: stat.drawCalls, size: [innerWidth,innerHeight,devicePixelRatio],
            visible, camera: __city.camera(), target: __city.target(), quality: __city.quality,
            crowns: [...samplePacks.values()].reduce((a,b) => a+b, 0)
        };
    }
    requestAnimationFrame(frame);
    return true;
})()"""

# Vite serves City's own EffectComposer module at a versioned URL. Time the
# entire postprocessed WebGL render, independently of display-paced callbacks.
gpu_sample = """(async () => {
    const url = performance.getEntriesByType('resource').find(r => r.name.includes('EffectComposer')).name;
    const {EffectComposer} = await import(url);
    const render = EffectComposer.prototype.render;
    const times = [];
    const pending = [];
    let issued = 0;
    EffectComposer.prototype.render = function(...args) {
        const gl = this.renderer.getContext();
        const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
        if (!ext || gl.getParameter(ext.GPU_DISJOINT_EXT)) {
            EffectComposer.prototype.render = render;
            window.gpuSample = {error: 'GPU timer unavailable or disjoint'};
            return render.apply(this, args);
        }
        while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) {
            const query = pending.shift();
            times.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
            gl.deleteQuery(query);
        }
        if (times.length === 20) {
            EffectComposer.prototype.render = render;
            times.sort((a,b) => a-b);
            window.gpuSample = {frames: times.length, medianMs: (times[9]+times[10])/2,
                                p95Ms: times[18], meanMs: times.reduce((a,b) => a+b, 0)/times.length};
        }
        if (issued >= 20) return render.apply(this, args);
        const query = gl.createQuery();
        gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
        try { return render.apply(this, args); }
        finally { gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(query); issued++; }
    };
    return true;
})()"""

gpu = "--gpu" in sys.argv[1:]
conditions = [arg for arg in sys.argv[1:] if arg != "--gpu"]
page = orca("tab", "create", "--worktree", "path:" + str(Path.cwd()), "--url", "about:blank")["browserPageId"]
try:
    orca("tab", "switch", "--page", page)
    for run, condition in enumerate(conditions):
        quality, version = condition.split("/")
        if quality not in ("high", "low") or version not in ("old", "full", "simple"):
            raise ValueError(condition)
        url = (f"http://127.0.0.1:5377/?view=map&board=square&q={quality}"
               f"&t=2026-10-20T14:00:00-04:00&speed=0&run={run}")
        orca("goto", "--page", page, "--url", url)
        wait('Boolean(document.querySelector("#map") && document.readyState === "complete")')
        evaluate(f"{install}({json.dumps(baseline)}, {json.dumps(quality)}, {json.dumps(version)})")
        orca("exec", "--page", page, "--command", "find role button click --name City --exact")
        wait('Boolean(window.__city && document.querySelector("#city-info button") && document.querySelector("#city-loading").hidden)')
        evaluate('document.querySelector("#city-info button").click(); true')
        wait('document.querySelector("#city-info button").textContent.includes("Frame") && samplePacks.size === 6')
        evaluate('__city.lookAt(1195,-1240,{bearing:-142,metresPerPixel:1.03,tilt:72}); true')
        time.sleep(3)
        evaluate(sample)
        time.sleep(7)
        wait("Boolean(window.skylineSample)")
        result = evaluate("window.skylineSample")
        expected = 128 if version == "old" else (1578 if quality == "low" else 3225)
        if not result["visible"] or result["quality"] != quality or result["crowns"] != expected:
            raise RuntimeError((condition, result))
        if gpu:
            evaluate(gpu_sample)
            wait("Boolean(window.gpuSample)")
            result["gpu"] = evaluate("window.gpuSample")
            if "error" in result["gpu"] or result["gpu"]["medianMs"] <= 0:
                raise RuntimeError(result["gpu"])
        print(quality, version, json.dumps(result), flush=True)
finally:
    orca("tab", "close", "--page", page)
