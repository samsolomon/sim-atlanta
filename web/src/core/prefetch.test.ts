import { afterEach, expect, it, vi } from 'vitest';
import { prefetch, takePrefetched } from './prefetch';

afterEach(() => vi.unstubAllGlobals());

it('aborts a pending prefetched download when its City consumer leaves', async () => {
  let downloadSignal: AbortSignal | undefined;
  vi.stubGlobal('fetch', vi.fn((_url, options) => {
    downloadSignal = options.signal;
    return new Promise((_resolve, reject) => {
      downloadSignal!.addEventListener('abort', () => reject(downloadSignal!.reason));
    });
  }));
  prefetch('/pending-city');
  const city = new AbortController();
  const response = takePrefetched('/pending-city', city.signal);
  city.abort();
  await expect(response).rejects.toMatchObject({ name: 'AbortError' });
  expect(downloadSignal!.aborted).toBe(true);
  expect(await takePrefetched('/pending-city')).toBeNull();
});

it('keeps cancellation connected while the response body is downloading', async () => {
  let downloadSignal: AbortSignal | undefined;
  const response = new Response('{}');
  vi.stubGlobal('fetch', vi.fn((_url, options) => {
    downloadSignal = options.signal;
    return Promise.resolve(response);
  }));
  prefetch('/city-body');
  const city = new AbortController();
  expect(await takePrefetched('/city-body', city.signal)).toBe(response);
  city.abort();
  expect(downloadSignal!.aborted).toBe(true);
});
