// Shared instrumentation for the isolated Brookwood measurement build.
const mode = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('neighbor');
export const neighborStudy = mode === 'stock' || mode === 'deferred';
export const deferStation = mode === 'deferred';
export function neighborMark(label: string) {
  if (neighborStudy) performance.mark('neighbor:' + label);
}
if (neighborStudy) performance.setResourceTimingBufferSize(5000);
