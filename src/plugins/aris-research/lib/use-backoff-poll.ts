import { useEffect, useRef, useCallback } from "react";

interface BackoffPollOptions {
  /** Initial interval in ms (default: 1000) */
  initialMs?: number;
  /** Maximum interval in ms (default: 30000) */
  maxMs?: number;
  /** Backoff multiplier (default: 2) */
  multiplier?: number;
  /** Jitter factor 0-1 (default: 0.2 means ±20%) */
  jitter?: number;
  /** Whether polling is active */
  enabled: boolean;
}

/**
 * Hook that polls with exponential backoff and jitter.
 * Returns a `resetBackoff` function to restart from initialMs when fresh data arrives.
 *
 * - Starts at `initialMs`, doubles each tick, caps at `maxMs`.
 * - Adds random jitter (±`jitter`%) to prevent thundering herd.
 * - Call `resetBackoff()` when new data arrives to reset to `initialMs`.
 * - Cleans up via clearTimeout on unmount or when `enabled` becomes false.
 */
export function useBackoffPoll(
  callback: () => void | Promise<void>,
  options: BackoffPollOptions,
): { resetBackoff: () => void } {
  const {
    initialMs = 1000,
    maxMs = 30000,
    multiplier = 2,
    jitter = 0.2,
    enabled,
  } = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentMs = useRef(initialMs);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // Memoize enabled/maxMs/multiplier/jitter via refs to keep schedule stable
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const base = Math.min(currentMs.current, maxMs);
    const jitterRange = base * jitter;
    const delay = base + (Math.random() * 2 - 1) * jitterRange;

    timerRef.current = setTimeout(async () => {
      try {
        await callbackRef.current();
      } catch {
        /* swallow – caller handles errors internally */
      }
      currentMs.current = Math.min(currentMs.current * multiplier, maxMs);
      if (enabledRef.current) schedule();
    }, delay);
  }, [maxMs, multiplier, jitter]);

  const resetBackoff = useCallback(() => {
    currentMs.current = initialMs;
  }, [initialMs]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      currentMs.current = initialMs;
      return;
    }
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, schedule, initialMs]);

  return { resetBackoff };
}
