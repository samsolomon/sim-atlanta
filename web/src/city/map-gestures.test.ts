import { describe, expect, it } from 'vitest';
import { angleDelta } from './map-gestures';

describe('twist angle', () => {
  it('takes the short way round', () => {
    expect(angleDelta(0.1, 0.3)).toBeCloseTo(0.2);
    expect(angleDelta(Math.PI - 0.05, -Math.PI + 0.05)).toBeCloseTo(0.1);
    expect(angleDelta(-Math.PI + 0.05, Math.PI - 0.05)).toBeCloseTo(-0.1);
  });
});
