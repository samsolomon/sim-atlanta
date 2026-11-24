import { describe, expect, it } from 'vitest';
import { blobSource, canStream, streamSource, trackSource, type SourceDeps } from './radio-source';

const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const SAFARI_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A165F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const FIREFOX = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:140.0) Gecko/20100101 Firefox/140.0';

class FakeSourceBuffer extends EventTarget {
  updating = false;
  appended: number[][] = [];
  appendBuffer(b: Uint8Array) {
    this.appended.push([...b]);
    this.updating = true;
    queueMicrotask(() => { this.updating = false; this.dispatchEvent(new Event('updateend')); });
  }
}
class FakeMediaSource extends EventTarget {
  static isTypeSupported = (t: string) => t === 'audio/mpeg';
  static last: FakeMediaSource;
  readyState: 'closed' | 'open' | 'ended' = 'closed';
  sb = new FakeSourceBuffer();
  ended: (string | undefined)[] = [];
  constructor() { super(); FakeMediaSource.last = this; }
  addSourceBuffer() { return this.sb as unknown as SourceBuffer; }
  endOfStream(e?: string) {
    if (this.sb.updating) throw new DOMException('an append is in flight', 'InvalidStateError');
    this.ended.push(e);
    this.readyState = 'ended';
  }
  open() { this.readyState = 'open'; this.dispatchEvent(new Event('sourceopen')); }
}

/** A response whose body arrives in the given chunks, one per tick. */
function streamingFetch(chunks: number[][], opts: { failAt?: number } = {}): SourceDeps['fetch'] {
  return (async (_u: string, init?: RequestInit) => {
    let i = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(c) {
        await new Promise((r) => setTimeout(r, 0));
        if (init?.signal?.aborted || i === opts.failAt) return c.error(new DOMException('aborted', 'AbortError'));
        if (i < chunks.length) c.enqueue(new Uint8Array(chunks[i++]));
        else c.close();
      },
    });
    return new Response(body, { status: 200 });
  }) as unknown as SourceDeps['fetch'];
}
const deps = (over: Partial<SourceDeps> = {}): SourceDeps => ({
  fetch: streamingFetch([[1, 2], [3], [4, 5, 6]]),
  MediaSource: FakeMediaSource as unknown as typeof MediaSource,
  createObjectURL: (o) => (o instanceof Blob ? `blob:${o.size}` : 'blob:mediasource'),
  userAgent: CHROME,
  ...over,
});
const settle = () => new Promise((r) => setTimeout(r, 20));

describe('radio source', () => {
  it('streams on Chrome, Android and Firefox, and keeps Safari (Mac and iPhone) on the blob path', () => {
    const MS = FakeMediaSource as unknown as typeof MediaSource;
    expect(canStream({ MediaSource: MS, userAgent: CHROME })).toBe(true);
    expect(canStream({ MediaSource: MS, userAgent: ANDROID })).toBe(true);
    expect(canStream({ MediaSource: MS, userAgent: FIREFOX })).toBe(true);
    expect(canStream({ MediaSource: MS, userAgent: SAFARI_MAC })).toBe(false);
    expect(canStream({ MediaSource: undefined, userAgent: SAFARI_IOS })).toBe(false);
    expect(canStream({ MediaSource: undefined, userAgent: CHROME })).toBe(false);
  });

  it('blob path: fetches the whole file, then gives a blob URL', async () => {
    const src = await blobSource('/a.mp3', new AbortController().signal, deps({ userAgent: SAFARI_MAC }));
    expect(src).toBe('blob:6');
  });

  it('stream path: returns at once, queues chunks until the element attaches, then appends them in order and ends the stream', async () => {
    const src = await streamSource('/a.mp3', new AbortController().signal, deps());
    expect(src).toBe('blob:mediasource');
    const ms = FakeMediaSource.last;
    await settle(); // two chunks arrive before any element attaches (a prefetch)
    ms.open();
    await settle();
    expect(ms.sb.appended).toEqual([[1, 2], [3], [4, 5, 6]]);
    expect(ms.ended).toEqual([undefined]);
  });

  it('stream path: an abort or a network failure ends the stream so the element doesn’t wait for ever', async () => {
    const ac = new AbortController();
    await streamSource('/a.mp3', ac.signal, deps({ fetch: streamingFetch([[1], [2], [3]], { failAt: 1 }) }));
    const ms = FakeMediaSource.last;
    ms.open();
    await settle();
    expect(ms.sb.appended).toEqual([[1]]);
    expect(ms.ended).toEqual(['network']);
  });

  it('stream path: a network failure during an append ends the stream once the append finishes', async () => {
    await streamSource('/a.mp3', new AbortController().signal, deps({ fetch: streamingFetch([[1], [2], [3]], { failAt: 1 }) }));
    const ms = FakeMediaSource.last;
    // A slow append: the fetch fails while it is still in flight.
    ms.sb.appendBuffer = function (b: Uint8Array) {
      this.appended.push([...b]);
      this.updating = true;
      setTimeout(() => { this.updating = false; this.dispatchEvent(new Event('updateend')); }, 10);
    };
    ms.open();
    await settle();
    await settle();
    expect(ms.sb.appended).toEqual([[1]]);
    expect(ms.ended).toEqual(['network']);
  });

  it('picks the path from the browser', async () => {
    expect(await trackSource('/a.mp3', new AbortController().signal, deps())).toBe('blob:mediasource');
    expect(await trackSource('/a.mp3', new AbortController().signal, deps({ userAgent: SAFARI_IOS, MediaSource: undefined }))).toBe('blob:6');
  });

  it('stream path: a fetch that fails before any element attaches ends the stream on attach', async () => {
    await streamSource('/a.mp3', new AbortController().signal, deps({ fetch: streamingFetch([[1]], { failAt: 0 }) }));
    const ms = FakeMediaSource.last;
    await settle(); // the prefetch fails while nothing is attached
    ms.open();
    expect(ms.ended).toEqual(['network']);
    expect(ms.sb.appended).toEqual([]);
  });
});
