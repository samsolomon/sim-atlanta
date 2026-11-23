import { describe, expect, it } from 'vitest';
import { shareUrl } from './share';
import { formatCityCamera, parseCityCamera } from '../core/camera';

const at = new Date('2026-11-21T02:30:00Z');

describe('share links', () => {
  it('round-trips the City camera through #166 format', () => {
    const cam = formatCityCamera({ x: 565.4, z: -3964.6, bearing: -101.2, tilt: 55.4, distanceM: 420.7 });
    expect(cam).toBe('565,-3965,-101,55,421');
    expect(parseCityCamera(cam)).toEqual({ x: 565, z: -3965, bearing: -101, tilt: 55, distanceM: 421 });
    expect(formatCityCamera({ x: 0, z: 0, bearing: 270, tilt: 40, distanceM: 300 }).split(',')[2]).toBe('-90');
  });
  it('a live City link has no time; a frozen one pauses at the moment', () => {
    const page = 'https://sim.example/?view=city&ui=next&t=2026-11-20T14:00:00-05:00&speed=30&follow=1&tune=1';
    const live = shareUrl(page, { view: 'city', cam: '565,-3965,-101,55,421' }, 'live', at);
    expect(live).toBe('https://sim.example/?ui=next&view=city&cam=565,-3965,-101,55,421');
    const freeze = shareUrl(page, { view: 'city', cam: '565,-3965,-101,55,421' }, 'freeze', at);
    expect(new URL(freeze).searchParams.get('t')).toBe('2026-11-21T02:30:00Z');
    expect(new URL(freeze).searchParams.get('speed')).toBe('0');
    expect(parseCityCamera(new URL(freeze).searchParams.get('cam'))).not.toBeNull();
  });
  it('a Map link carries the MapLibre hash and no cam', () => {
    const url = shareUrl('https://sim.example/?view=city&cam=1,2,3,4,5', { view: 'map', hash: '#14/33.757/-84.392/30' }, 'live', at);
    expect(url).toBe('https://sim.example/?view=map#14/33.757/-84.392/30');
  });
});

describe('model links', () => {
  it('name the model, keep ui=next, and never freeze the clock', () => {
    const url = new URL(shareUrl('https://sim.example/?ui=next&view=models&t=2026-11-20T14:00:00-05:00&speed=0', { view: 'models', model: 'cq400' }, 'freeze', at));
    expect(url.searchParams.get('view')).toBe('models');
    expect(url.searchParams.get('v')).toBe('cq400');
    expect(url.searchParams.get('ui')).toBe('next');
    expect(url.searchParams.has('t')).toBe(false);
  });
});
