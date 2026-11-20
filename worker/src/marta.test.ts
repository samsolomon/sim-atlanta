import { describe, expect, it } from 'vitest';
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
});
