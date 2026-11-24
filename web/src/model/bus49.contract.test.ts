import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import type { BusTimetableFile } from './types';

const file = resolve(__dirname, '../../../pipeline/prototypes/bus-49/timetable.json');
it('preserves every Route 49 trip, stop call and calendar in its separate edition', () => {
  const data: BusTimetableFile = JSON.parse(readFileSync(file, 'utf8'));
  expect(data.source.sha256).toBe('f4a36309f42858d3c55bf46298395471621ba6ec1888a141c543a1190a52e2e1');
  expect(data.routes.map((r) => r.id)).toEqual(['marta:route:49']);
  expect(data.paths).toHaveLength(2);
  const { trips, patterns, services } = data.timetable;
  const stops = new Set(data.stops.map((s) => s.id));
  expect(trips).toHaveLength(658);
  expect(trips.reduce((n, [p]) => n + patterns[p].stops.length, 0)).toBe(27632);
  expect(services.map((s) => s.id).sort()).toEqual(['24', '28', '3', '39', '4', '5']);
  for (const p of patterns) {
    expect(p.stops.every((s) => stops.has(s))).toBe(true);
    expect(p.arr).toEqual(p.dep);
    expect(data.paths.some((path) => path.id === p.pathId)).toBe(true);
  }
});
