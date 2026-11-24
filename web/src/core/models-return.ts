import { perf } from './perf';

/** Development device probe. The cold leg uses a fresh document and WebGL context
 * with the same browser cache, clock, camera and quality as the warm leg. */
export async function measureModelsReturn(cityReady: () => boolean, modelFramed: () => boolean) {
  const startUrl = new URL(location.href);
  const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  async function waitFor(check: () => boolean, label: string) {
    const deadline = performance.now() + 120_000;
    while (!check()) {
      if (performance.now() > deadline) throw new Error('Timed out waiting for ' + label);
      await frame();
    }
    await frame();
  }
  function report(result: object) {
    const json = JSON.stringify({ probe: 'models-return', quality: startUrl.searchParams.get('q'), ...result });
    console.info('PERF_RESULT ' + json);
    try { localStorage.setItem('perf-result', json); } catch { /* Console is also available. */ }
    const output = document.createElement('pre');
    output.style.cssText = 'position:fixed;inset:0 auto auto 0;z-index:100;background:white;color:black;padding:8px;white-space:pre-wrap';
    output.textContent = 'PERF_RESULT ' + json;
    document.body.append(output);
    document.title = 'PERF_DONE';
  }
  try {
    const cold = startUrl.searchParams.has('warmReturnMs');
    if (!cold) {
      await waitFor(cityReady, 'initial City reveal');
      document.querySelector<HTMLButtonElement>('.a2-appbar [data-view=models]')!.click();
    }
    await waitFor(modelFramed, 'Models framing');
    const snapshot = perf.report();
    const resident = { heapMB: snapshot.heap?.usedMB, cityAreas: snapshot.areas.length,
      cityGeometryMB: snapshot.memory?.total.geometryMB, cityTextureMB: snapshot.memory?.total.textureMB };
    const start = performance.now();
    document.querySelector<HTMLButtonElement>('.a2-appbar [data-view=map]')!.click();
    await waitFor(cityReady, 'return City reveal');
    const elapsed = Math.round(performance.now() - start);
    if (cold) {
      report({ summary: { warmReturnMs: Number(startUrl.searchParams.get('warmReturnMs')), coldReturnMs: elapsed }, resident: JSON.parse(startUrl.searchParams.get('resident') ?? '{}') });
    } else {
      startUrl.searchParams.set('view', 'models');
      startUrl.searchParams.set('model', 'cq400');
      startUrl.searchParams.set('warmReturnMs', String(elapsed));
      startUrl.searchParams.set('resident', JSON.stringify(resident));
      location.replace(startUrl);
    }
  } catch (error) {
    report({ error: String(error) });
  }
}
