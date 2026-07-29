/**
 * Timeout + error helpers for network calls.
 *
 * Every external call (Lambda endpoints, Next proxies, Supabase RPCs) can hang indefinitely on a
 * flaky connection or a slow/failed backend — which strands the UI on a spinner (the same class of
 * bug as the global-scope signOut hang). These helpers give every call a hard deadline and a single,
 * recognisable error type so call sites can show a clean "took too long, try again" message.
 */

export class TimeoutError extends Error {
  constructor(label = 'request') {
    super(`${label} timed out`);
    this.name = 'TimeoutError';
  }
}

export const isTimeout = (e: unknown): e is TimeoutError =>
  e instanceof TimeoutError || (e as { name?: string })?.name === 'TimeoutError';

/** Default deadline for a user-facing network call (ms). */
export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * fetch() with a hard deadline. Aborts the underlying request (frees the socket) and throws a
 * TimeoutError — distinct from a network error — when the deadline passes. Pass your own AbortSignal
 * via init.signal and it is respected alongside the timeout.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  ms: number = DEFAULT_TIMEOUT_MS,
  label = 'network request',
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  // Chain a caller-supplied signal so either can abort.
  if (init.signal) {
    if (init.signal.aborted) ctrl.abort();
    else init.signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') throw new TimeoutError(label);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Race any promise (e.g. a Supabase `.rpc()` builder) against a deadline. Does NOT cancel the
 * underlying work — use fetchWithTimeout when you can abort — but stops the UI from waiting forever.
 */
export function withTimeout<T>(p: PromiseLike<T>, ms: number = DEFAULT_TIMEOUT_MS, label = 'request'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(label)), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}
