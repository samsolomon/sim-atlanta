import { describe, expect, it, vi } from 'vitest';
import { normalize, parseEastern, type MartaRow } from './marta';

const row = (o: Partial<MartaRow>): MartaRow => ({
  DESTINATION: 'Airport',
  DIRECTION: 'S',
  EVENT_TIME: '11/20/2026 2:59:25 PM',
  IS_REALTIME: 'true',
  LINE: 'RED',
  NEXT_ARR: '03:02:06 PM',
  STATION: 'FIVE POINTS STATION',
  TRAIN_ID: '409',
  WAITING_SECONDS: '145',
  DELAY: 'T90S',
  LATITUDE: '33.7539',
  LONGITUDE: '-84.3916',
  ...o,
});

describe('parseEastern', () => {
  it('reuses the Eastern formatter across prediction rows', () => {
    parseEastern('11/24/2026 8:32:00 AM');
    const Formatter = Intl.DateTimeFormat;
    const constructors = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      (locales, options) => new Formatter(locales, options),
    );
    try {
      const rows = Array.from({ length: 30 }, (_, i) => row({ EVENT_TIME: `11/24/2026 8:32:${String(i).padStart(2, '0')} AM` }));
      expect(normalize(rows, 0).trains[0].at).toBe(Date.UTC(2026, 10, 24, 13, 32, 29));
      expect(constructors).not.toHaveBeenCalled();
    } finally {
      constructors.mockRestore();
    }
  });

  it('handles EST and EDT', () => {
    expect(new Date(parseEastern('11/20/2026 2:59:25 PM')!).toISOString()).toBe('2026-11-20T19:59:25.000Z');
    expect(new Date(parseEastern('7/4/2026 12:05:00 AM')!).toISOString()).toBe('2026-07-04T04:05:00.000Z');
    expect(parseEastern('nonsense')).toBeNull();
  });
});

describe('normalize', () => {
  it('groups predictions per train and picks the soonest realtime stop', () => {
    const feed = normalize(
      [
        row({ STATION: 'GARNETT STATION', WAITING_SECONDS: '300' }),
        row({ STATION: 'FIVE POINTS STATION', WAITING_SECONDS: '60' }),
        row({ STATION: 'WEST END STATION', WAITING_SECONDS: '30', IS_REALTIME: 'false' }),
        row({ TRAIN_ID: '104', LINE: 'blue', DIRECTION: 'E', LATITUDE: '33.75', LONGITUDE: '-84.40' }),
        row({ TRAIN_ID: '999', LATITUDE: '' }),
      ],
      0,
    );
    expect(feed.trains.map((t) => t.id)).toEqual(['marta:train:104', 'marta:train:409']);
    const t409 = feed.trains[1];
    expect(t409).toMatchObject({ line: 'RED', nextStation: 'FIVE POINTS STATION', nextInSec: 60, lat: 33.7539 });
    expect(feed.trains[0].line).toBe('BLUE');
  });

  it('reports a missing observation time as null, not the fetch time', () => {
    const feed = normalize([row({ EVENT_TIME: '' })], 123);
    expect(feed.trains[0].at).toBeNull();
  });
});
