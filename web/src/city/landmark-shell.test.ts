import { Mesh } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';

it('gives the lit panes the body\'s shadow flags, so they shade alike and batch together', () => {
  const site = { id: 'x', cls: 'office', h: 20, floors: 5, rings: [[[0, 0], [20, 0], [20, 20], [0, 20]]] } as unknown as VBuilding;
  const shell = localLandmarkShell([site], site, 'Test', [0, 0], [1, 0], [[10, 10]], 0, 0)!;
  shell.prism([[0, 0], [20, 0], [20, 20], [0, 20]], 0, 20, '#888888', '#666666');
  // Every pane lit, so the lamps mesh has geometry.
  shell.facade([0, 0], [20, 0], 0, 20, 5, 4, 0.6, 0.6, ['#334455'], 1);
  const { group } = shell.finish();
  const [body, lamps] = group.children as Mesh[];
  expect(lamps.geometry.getAttribute('position').count).toBeGreaterThan(0);
  expect([lamps.castShadow, lamps.receiveShadow]).toEqual([body.castShadow, body.receiveShadow]);
  expect(body.castShadow && body.receiveShadow).toBe(true);
});

it('builds no lamps mesh when no pane is lit, and its night switch is a no-op', () => {
  const site = { id: 'x', cls: 'office', h: 20, floors: 5, rings: [[[0, 0], [20, 0], [20, 20], [0, 20]]] } as unknown as VBuilding;
  const shell = localLandmarkShell([site], site, 'Test', [0, 0], [1, 0], [[10, 10]], 0, 0)!;
  shell.prism([[0, 0], [20, 0], [20, 20], [0, 20]], 0, 20, '#888888', '#666666');
  // No pane lit: an empty lamps mesh would still cost a draw every frame.
  shell.facade([0, 0], [20, 0], 0, 20, 5, 4, 0.6, 0.6, ['#334455'], 0);
  const { group, setNight } = shell.finish('#f2d5a5', 0);
  expect(group.children).toHaveLength(1);
  expect(() => setNight(1)).not.toThrow();
});
