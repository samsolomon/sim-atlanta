import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LAB_HTML } from './lab-markup';

describe('lab markup contract', () => {
  it('has every id the lab looks up at load', () => {
    const src = readFileSync(new URL('./main.ts', import.meta.url), 'utf8');
    const ids = new Set([
      ...[...src.matchAll(/getElementById\('([\w-]+)'\)/g)].map((m) => m[1]),
      ...[...src.matchAll(/querySelector(?:All)?(?:<[^>]+>)?\('#([\w-]+)[^']*'\)/g)].map((m) => m[1]),
    ]);
    expect(ids.size).toBeGreaterThan(10);
    const missing = [...ids].filter((id) => !LAB_HTML.includes(`id="${id}"`));
    expect(missing).toEqual([]);
  });
  it('is the only copy: models.html no longer carries lab controls', () => {
    const page = readFileSync(new URL('../../models.html', import.meta.url), 'utf8');
    expect(page).toContain('class="lab"');
    expect(page).not.toContain('id="stage"');
  });
});
