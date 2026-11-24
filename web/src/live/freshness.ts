/**
 * Whether a live observation may still be shown as live (AGENTS.md: never present old data as
 * live). The response's own Date header is the server's clock; the client's clock is a second
 * check, because a browser-cached response carries its old Date too.
 *
 * - A response whose Date is older than `maxAgeMs` by the client's clock is stale. A client
 *   clock that runs ahead therefore falls back to the timetable, the safe direction.
 * - The observation's age is measured against the server's Date when there is one, so a
 *   client clock that runs behind still accepts fresh data.
 * - An observation more than `futureMs` ahead of that clock is untrusted.
 */
export type Freshness = 'fresh' | 'stale' | 'future';

export const FUTURE_TOLERANCE_MS = 5 * 60_000;

export function freshness(
  observedAt: number,
  serverDate: number | null,
  clientNow: number,
  maxAgeMs: number,
  futureMs = FUTURE_TOLERANCE_MS,
): Freshness {
  if (!Number.isFinite(observedAt)) return 'stale';
  const server = serverDate !== null && Number.isFinite(serverDate) ? serverDate : null;
  if (server !== null && clientNow - server > maxAgeMs) return 'stale';
  const ref = server ?? clientNow;
  const age = ref - observedAt;
  if (age > maxAgeMs) return 'stale';
  if (age < -futureMs) return 'future';
  return 'fresh';
}

/** The response's Date header in ms, or null. */
export function serverDate(response: Pick<Response, 'headers'>): number | null {
  const t = Date.parse(response.headers.get('Date') ?? '');
  return Number.isFinite(t) ? t : null;
}
