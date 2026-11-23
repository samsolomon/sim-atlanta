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

import { atlantaDate, dayDiff, placeLabel, skyLabel, sliderValue } from './status';

describe('subject card helpers', () => {
  it('names the sky plainly', () => {
    expect(skyLabel({ cloud: 0, rain: 0, fog: 0, snow: 0 }).label).toBe('Clear');
    expect(skyLabel({ cloud: 1, rain: 1, fog: .4, snow: 0 }).label).toBe('Storm');
    expect(skyLabel({ cloud: 1, rain: .75, fog: .25, snow: 0 }).label).toBe('Rain');
    expect(skyLabel({ cloud: .7, rain: 0, fog: .9, snow: 0 }).label).toBe('Fog');
  });
  it('reads Metro Atlanta past neighbourhood scale', () => {
    expect(placeLabel('Downtown', 2000)).toBe('Downtown');
    expect(placeLabel('Downtown', 20000)).toBe('Metro Atlanta');
    expect(placeLabel('Georgia', 90000)).toBe('Georgia');
    expect(placeLabel(null, 100)).toBe(null);
  });
  it('clamps the slider to ±12 h', () => {
    expect(sliderValue(0, 0)).toBe(0);
    expect(sliderValue(150 * 60_000, 0)).toBe(150);
    expect(sliderValue(-30 * 3_600_000, 0)).toBe(-720);
  });
  it('counts Atlanta calendar days, after midnight UTC included', () => {
    // 11:30 PM Eastern on Nov 20 is already Nov 21 in UTC.
    expect(atlantaDate(Date.parse('2026-11-21T04:30:00Z'))).toBe('2026-11-20');
    expect(dayDiff('2026-11-20', '2026-11-23')).toBe(3);
    expect(dayDiff('2026-11-23', '2026-11-20')).toBe(-3);
  });
});
