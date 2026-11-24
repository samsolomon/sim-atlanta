import { describe, expect, it } from 'vitest';
import { busTimetableStatus, confidence, confidenceWords, hintText } from './status';

const live = { realTime: true, rail: 'live' as const };

describe('confidence line', () => {
  it('reads Live only at the real present with the live feed up', () => {
    expect(confidence(live, true)).toEqual({ tier: 'live', skyObserved: true, shifted: false });
    expect(confidenceWords(confidence(live, true))).toEqual(['Live trains', 'weather reported']);
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
  it('reads Live in City at the present only while rail or bus GPS is live', () => {
    const city = (rail: 'live' | 'down', buses: number | null) => confidence({ realTime: true, rail, buses }, true, false, false, true).tier;
    expect(city('down', 120)).toBe('live');
    expect(city('live', null)).toBe('live');
    expect(city('down', null)).toBe('timetable');
    expect(city('down', 0)).toBe('timetable');
    expect(confidence({ realTime: false, rail: 'live', buses: 120 }, true, false, false, true).tier).toBe('timetable');
    expect(confidenceWords(confidence({ realTime: true, rail: 'down', buses: 3 }, true, false, false, true), true)[0]).toBe('Live');
  });
  it('separates live trains from an unobserved sky', () => {
    expect(confidenceWords(confidence(live, false))).toEqual(['Live trains', 'illustrative sky']);
    expect(confidenceWords(confidence(live, true, true))).toEqual(['Live trains', 'illustrative sky']);
    expect(confidence(live, false).skyObserved).toBe(false);
  });
});

describe('first-visit hint', () => {
  it('matches the view and the input', () => {
    expect(hintText('map', false)).toBe('Click anything to inspect · drag to move · scroll to zoom');
    expect(hintText('map', true)).toBe('Tap anything to inspect. Pinch to zoom.');
    expect(hintText('city', false)).not.toMatch(/WASD/);
    expect(hintText('map', false)).not.toMatch(/look around/);
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

import { sameTimeOnDate } from './status';

describe('date picker', () => {
  it('keeps the wall-clock time across DST and late-evening UTC dates', () => {
    // 11:30 PM EST Sat Mar 7 → Mon Mar 9 (EDT) at 11:30 PM.
    const t = sameTimeOnDate(Date.parse('2026-03-08T04:30:00Z'), '2026-03-09');
    expect(new Date(t).toISOString()).toBe('2026-03-10T03:30:00.000Z');
    expect(atlantaDate(t)).toBe('2026-03-09');
    // 10:00 AM EDT Oct 30 → Nov 2 (EST) still 10:00 AM.
    expect(new Date(sameTimeOnDate(Date.parse('2026-10-30T14:00:00Z'), '2026-11-02')).toISOString()).toBe('2026-11-02T15:00:00.000Z');
  });
});

describe('loading', () => {
  it('never reads Live while City builds, and says no scene word', () => {
    const c = confidence({ realTime: true, rail: 'live' }, true, false, true);
    expect(c.tier).toBe('loading');
    expect(confidenceWords(c)).toEqual([]);
  });
});

it('names the expired Route 49 calendar at a shifted City clock', () => {
  const state = { realTime:false, rail:'live' as const, trains:0, cityFreight:true, cityTraffic:true, buses:0,
    cityBusDay:20261218, busCalendar:{first:20260822,last:20261211} };
  expect(busTimetableStatus(state)).toContain('outside the published service calendar');
});
