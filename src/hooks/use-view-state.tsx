import { useEffect } from 'react';
import { ComponentState } from './use-component-state';

/**
 * A single, mutually-exclusive view state for a section that loads a list/value.
 *
 * Only ONE of these can be true at a time — the UI must never stack an empty view
 * on top of a loading spinner, or an error under data, etc. The precedence encodes
 * the rule "data clears all; loading clears error and empty":
 *
 *   data  > loading > error > empty
 *
 * - `data`   wins whenever there is something to show (a paginating spinner may sit
 *            beside the list, but the primary state is `data`).
 * - `loading` covers the first load (until `ready`) or an in-flight refresh with no
 *            data yet; it suppresses a stale error/empty.
 * - `error`  shows only when there is no data and we're not loading.
 * - `empty`  is the fallback once a load has settled with nothing.
 */
export type ViewState = 'loading' | 'error' | 'empty' | 'data';

export interface UseViewStateOptions {
  /** There is at least one item / a value to render. */
  hasData: boolean;
  /** A load/refresh is currently in flight. */
  loading: boolean;
  /** The last settled load failed. */
  error: boolean;
  /** The first load has completed (distinguishes "still loading" from "empty"). */
  ready: boolean;
  /** Reports the resolved single state to a parent aggregator (`empty` → `none`). */
  onStateChange?: (state: ComponentState) => void;
}

export function useViewState({
  hasData,
  loading,
  error,
  ready,
  onStateChange,
}: UseViewStateOptions): ViewState {
  const state: ViewState = hasData
    ? 'data'
    : loading || !ready
      ? 'loading'
      : error
        ? 'error'
        : 'empty';

  useEffect(() => {
    onStateChange?.(state === 'empty' ? 'none' : state);
  }, [state, onStateChange]);

  return state;
}
