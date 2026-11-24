import { afterEach, describe, expect, it, vi } from 'vitest';
import { PLAYLIST, createRadio } from './radio';

class FakeAudio { src = ''; preload = ''; addEventListener() {} pause() {} play() { return Promise.resolve(); } }

describe('radio', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it('stays off until toggled, then advances through the stub playlist', () => {
    vi.useFakeTimers();
    vi.stubGlobal('Audio', FakeAudio);
    const r = createRadio([{ title: 'A', durationS: 2 }, { title: 'B', durationS: 2 }]);
    expect(r.playing).toBe(false);
    r.toggle();
    expect(r.playing).toBe(true);
    expect(r.track.title).toBe('A');
    vi.advanceTimersByTime(2100);
    expect(r.track.title).toBe('B');
    r.toggle();
    expect(r.playing).toBe(false);
  });
  it('resumes a stub track where it paused', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    vi.stubGlobal('Audio', FakeAudio);
    const r = createRadio([{ title: 'A', durationS: 2 }, { title: 'B', durationS: 2 }]);
    r.toggle();
    vi.advanceTimersByTime(1000);
    r.toggle(); // pause at 1 s
    vi.advanceTimersByTime(5000);
    expect(r.track.title).toBe('A');
    r.toggle();
    vi.advanceTimersByTime(900);
    expect(r.track.title).toBe('A');
    vi.advanceTimersByTime(200);
    expect(r.track.title).toBe('B');
  });
  it('plans about ten tracks and half an hour', () => {
    const total = PLAYLIST.reduce((s, t) => s + t.durationS, 0);
    expect(PLAYLIST.length).toBe(10);
    expect(total).toBeGreaterThan(25 * 60);
    expect(total).toBeLessThan(35 * 60);
  });
});
