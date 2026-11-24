/**
 * How a radio track gets from its static file to an <audio> src (docs/ui-controls-brief.md, Radio).
 *
 * Cloudflare's static assets ignore Range (a byte-range request returns 200 and the whole file),
 * so the element can't stream the URL itself on every browser. Two paths, both one plain fetch() of
 * the static file and never the worker:
 *
 * - **stream** (Chrome, Android, Firefox, Edge): MediaSource. The response body is appended to a
 *   SourceBuffer as it arrives, so sound starts after the first few kilobytes instead of the whole
 *   file. The src is returned at once; fetching starts immediately and queues chunks until an
 *   element attaches, so a prefetch can begin before any deck exists.
 * - **blob** (Safari, and anywhere MSE can't take audio/mpeg): fetch the whole file, then play it
 *   from a blob URL, which every browser can play and seek.
 */

export interface SourceDeps {
  fetch: typeof fetch;
  MediaSource?: typeof MediaSource;
  createObjectURL(o: Blob | MediaSource): string;
  userAgent: string;
}

/** Safari keeps the blob path (the coordinator's call, 2026-11-24): its MSE story differs by
 * platform, and iPhone Safari has no MediaSource at all. */
export function canStream(d: Pick<SourceDeps, 'MediaSource' | 'userAgent'>): boolean {
  const safari = /^((?!chrome|chromium|crios|android|edg|firefox|fxios).)*safari/i.test(d.userAgent);
  return !safari && !!d.MediaSource?.isTypeSupported?.('audio/mpeg');
}

/** Whole file, then a blob URL. */
export async function blobSource(url: string, signal: AbortSignal, d: SourceDeps): Promise<string> {
  const r = await d.fetch(url, { signal });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return d.createObjectURL(await r.blob());
}

/** A MediaSource URL that fills from one streaming fetch. Resolves at once. */
export function streamSource(url: string, signal: AbortSignal, d: SourceDeps): Promise<string> {
  const ms = new d.MediaSource!();
  const queue: Uint8Array<ArrayBuffer>[] = [];
  let sb: SourceBuffer | null = null;
  let done = false;
  let failed = false;
  const pump = () => {
    if (!sb || sb.updating || failed || ms.readyState !== 'open') return;
    const next = queue.shift();
    if (next) {
      try {
        sb.appendBuffer(next);
      } catch {
        failed = true;
      }
    } else if (done) {
      try {
        ms.endOfStream();
      } catch {
        /* already ended or detached */
      }
    }
  };
  ms.addEventListener('sourceopen', () => {
    if (sb) return;
    sb = ms.addSourceBuffer('audio/mpeg');
    sb.addEventListener('updateend', pump);
    pump();
  });
  void (async () => {
    try {
      const r = await d.fetch(url, { signal });
      if (!r.ok || !r.body) throw new Error(`${url} ${r.status}`);
      const reader = r.body.getReader();
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        if (value?.length) queue.push(value as Uint8Array<ArrayBuffer>);
        pump();
      }
      done = true;
      pump();
    } catch {
      // Aborted (the deck moved on) or the network failed: end what we have, so the element
      // reaches 'ended' or 'error' instead of waiting for ever.
      failed = true;
      if (ms.readyState === 'open') {
        try {
          ms.endOfStream('network');
        } catch {
          /* detached */
        }
      }
    }
  })();
  return Promise.resolve(d.createObjectURL(ms));
}

export function trackSource(url: string, signal: AbortSignal, d: SourceDeps): Promise<string> {
  return canStream(d) ? streamSource(url, signal, d) : blobSource(url, signal, d);
}
