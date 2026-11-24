import { describe, expect, it } from 'vitest';
import { boxDistance, nextRing, ringConfig, type RingInput } from './rings';

const cfg = ringConfig(true);
const base: RingInput = { distance: 0, fogFar: 60000, visible: true, offscreenFor: 0, inRingFor: 10000 };

describe('stream rings', () => {
  it('promotes inside the near radius and holds near until past the out radius', () => {
    expect(nextRing('mid', { ...base, distance: cfg.nearIn - 1 }, cfg)).toBe('near');
    expect(nextRing('near', { ...base, distance: (cfg.nearIn + cfg.nearOut) / 2 }, cfg)).toBe('near');
    expect(nextRing('mid', { ...base, distance: (cfg.nearIn + cfg.nearOut) / 2 }, cfg)).toBe('mid');
    expect(nextRing('near', { ...base, distance: cfg.nearOut + 1 }, cfg)).toBe('mid');
  });
  it('does not demote before the dwell, so a wobble across a boundary does not reload', () => {
    expect(nextRing('near', { ...base, distance: cfg.nearOut + 1, inRingFor: cfg.dwellMs - 1 }, cfg)).toBe('near');
    expect(nextRing('mid', { ...base, distance: 1e6, inRingFor: 0 }, cfg)).toBe('mid');
  });
  it('unloads past the fog and after a long time off-screen', () => {
    expect(nextRing('mid', { ...base, distance: 5000, fogFar: 4000 }, cfg)).toBe('unloaded');
    expect(nextRing('mid', { ...base, distance: 5000, visible: false, offscreenFor: cfg.offscreenMs }, cfg)).toBe('unloaded');
    expect(nextRing('mid', { ...base, distance: 5000, visible: false, offscreenFor: cfg.offscreenMs - 1 }, cfg)).toBe('mid');
  });
  it('reloads only areas that are on screen, with a gap below the unload distance', () => {
    expect(nextRing('unloaded', { ...base, distance: 5000, visible: false }, cfg)).toBe('unloaded');
    expect(nextRing('unloaded', { ...base, distance: 3900, fogFar: 4000 }, cfg)).toBe('unloaded');
    expect(nextRing('unloaded', { ...base, distance: 3000, fogFar: 4000 }, cfg)).toBe('mid');
  });
  it('fog bounds the near ring at a close orbit', () => {
    expect(nextRing('unloaded', { ...base, distance: 600, fogFar: 660 }, cfg)).not.toBe('near');
    expect(nextRing('unloaded', { ...base, distance: 400, fogFar: 660 }, cfg)).toBe('near');
  });
  it('a needed area goes near at any distance', () => {
    expect(nextRing('unloaded', { ...base, distance: 1e5, visible: false, needed: true }, cfg)).toBe('near');
  });
  it('measures the eye to the nearest point of the box', () => {
    const b = { minX: 0, maxX: 100, minZ: 0, maxZ: 100 };
    expect(boxDistance(b, 50, 0, 50)).toBe(0);
    expect(boxDistance(b, 130, 40, 50)).toBe(50);
  });
  it('reads radii from the query', () => {
    const c = ringConfig(false, new URLSearchParams('near=900&mid=3000'));
    expect(c.nearIn).toBe(900);
    expect(c.midMax).toBe(3000);
  });
});
