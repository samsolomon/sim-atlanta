import { expect, it } from 'vitest';
import { swatchFor } from './models-view';

it('colours each Lab vehicle by its kind of service, the express coach as a bus', () => {
  for (const id of ['xn40', 'xe60', 'xpressCoach']) expect(swatchFor('Vehicles', id)).toBe('var(--bus)');
  expect(swatchFor('Vehicles', 'crescent')).toBe('var(--intercity)');
});
