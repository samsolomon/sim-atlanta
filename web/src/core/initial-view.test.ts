import { describe, expect, it } from 'vitest';
import { initialView } from './initial-view';

describe('landing view', () => {
  it('opens City for new visitors and clock or quality links', () => {
    for (const search of ['', '?q=low', '?t=2026-11-21', '?speed=30']) {
      expect(initialView(search, '')).toBe('city');
    }
  });
  it('keeps geographic bookmarks and palette tools on Map', () => {
    expect(initialView('', '#17.5/33.749/-84.38/177')).toBe('map');
    expect(initialView('?tune', '')).toBe('map');
    expect(initialView('?palette=night', '')).toBe('map');
    expect(initialView('?view=map', '')).toBe('map');
  });
  it('gives explicit City links precedence over map coordinates', () => {
    expect(initialView('?view=3d', '#12/33/-84')).toBe('city');
    expect(initialView('?view=city', '#12/33/-84')).toBe('city');
  });
});

describe('Models view', () => {
  it('opens in A2c; the classic shell keeps the Model lab at /models.html', () => {
    expect(initialView('?view=models', '')).toBe('models');
    expect(initialView('?ui=next&view=models', '')).toBe('models');
    expect(initialView('?ui=classic&view=models', '')).toBe('city');
  });
});
