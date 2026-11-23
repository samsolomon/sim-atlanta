import { describe, expect, it } from 'vitest';
import { confidence, confidenceWords, hintText, liveDetails } from './status';
import { uiNext } from './flag';

const live = { realTime: true, rail: 'live' as const };

describe('confidence line', () => {
  it('reads Live only at the real present with the live feed up', () => {
    expect(confidence(live, true)).toEqual({ tier: 'live', skyObserved: true, shifted: false });
    expect(confidenceWords(confidence(live, true))).toEqual(['Live']);
  });
  it('never reads Live on a shifted clock, even if the feed is up', () => {
    const c = confidence({ realTime: false, rail: 'live' }, true);
    expect(c.tier).toBe('timetable');
    expect(c.skyObserved).toBe(false);
    expect(c.shifted).toBe(true);
    expect(confidenceWords(c)).toEqual(['Timetable', 'illustrative sky']);
  });
  it('reads Timetable at the present while the feed connects or is down', () => {
    expect(confidence({ realTime: true, rail: 'connecting' }, true).tier).toBe('timetable');
    expect(confidence({ realTime: true, rail: 'down' }, true).tier).toBe('timetable');
  });
  it('calls the sky illustrative when weather is missing or previewed', () => {
    expect(confidenceWords(confidence(live, false))).toEqual(['Live', 'illustrative sky']);
    expect(confidenceWords(confidence(live, true, true))).toEqual(['Live', 'illustrative sky']);
  });
});

describe('first-visit hint', () => {
  it('matches the view and the input', () => {
    expect(hintText('map', false)).toBe('Drag to move · scroll to zoom');
    expect(hintText('map', true)).toBe('Drag to move · pinch to zoom');
    expect(hintText('city', false)).not.toMatch(/WASD/);
    expect(hintText('map', false)).not.toMatch(/look around/);
  });
});

describe('live details', () => {
  it('shows no live positions or weather at a shifted clock', () => {
    const html = liveDetails({ realTime: false, rail: 'live', trains: 12, cityFreight: true, cityTraffic: true, buses: 40 }, 'city',
      { kind: 'clear', cloud: 0, rain: 0, fog: 0, label: 'clear', tempF: 60, live: true }, 0);
    expect(html).not.toMatch(/live positions/);
    expect(html).toMatch(/timetable/);
    expect(html).not.toMatch(/60°F/);
  });
});

describe('?ui=next', () => {
  it('opts in only with the exact value', () => {
    expect(uiNext('?ui=next')).toBe(true);
    expect(uiNext('?view=city&ui=next')).toBe(true);
    expect(uiNext('?ui=old')).toBe(false);
    expect(uiNext('')).toBe(false);
  });
});
