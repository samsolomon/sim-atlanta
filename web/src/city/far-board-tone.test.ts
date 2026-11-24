import { expect, it } from 'vitest';
import { BaseStyle, v2StyleTone } from '../vignette/generic-v2';
import { boxFromVertices } from './far-board';

it('weights each wall style by triangle area and preserves the roof colour', () => {
  const positions = [
    0, 0, 0, 6, 0, 0, 0, 2, 0,
    0, 0, 0, 0, 0, 2, 0, 2, 0,
    0, 2, 0, 6, 2, 0, 0, 2, 2,
  ];
  const wall = [0.8, 0.6, 0.4] as const;
  const roof = [0.25, 0.5, 0.75];
  const colours = [...wall, ...wall, ...wall, ...wall, ...wall, ...wall, ...roof, ...roof, ...roof];
  const styles = [
    BaseStyle.Lobby, BaseStyle.Lobby, BaseStyle.Lobby,
    0, 0, 0,
    BaseStyle.Lobby, BaseStyle.Lobby, BaseStyle.Lobby,
  ];
  const box = boxFromVertices(positions, colours, 0, 9, 1, undefined, styles);
  expect(box?.roof).toEqual({ r: roof[0], g: roof[1], b: roof[2] });
  const lobby = v2StyleTone(BaseStyle.Lobby, wall);
  for (const [i, channel] of (['r', 'g', 'b'] as const).entries()) {
    expect(box?.[channel]).toBeCloseTo((3 * lobby[i] + wall[i]) / 4, 8);
  }
});
