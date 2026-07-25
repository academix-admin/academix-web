import { useState, useCallback, useEffect } from 'react';

/**
 * Reveal a page's body sections TOGETHER once their loads settle, instead of painting them
 * in one-by-one. The sections must stay MOUNTED while hidden (so their data keeps fetching);
 * this only gates when they become visible.
 *
 * `signal` should be a value that increases as sections resolve (e.g. `loadedCount`): the
 * reveal fires `settleMs` after it last changed (loads stopped arriving), with a `capMs`
 * hard cap so a slow or genuinely-empty section can never leave the page stuck on the loader.
 * Needed because the section components report `'none'` (not `'loading'`) while fetching, so
 * a plain "any loading?" check can't tell "still fetching" from "no data".
 */
export function useSettledReveal(
  signal: number,
  { settleMs = 400, capMs = 4000 }: { settleMs?: number; capMs?: number } = {}
): boolean {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (revealed) return;
    const t = window.setTimeout(() => setRevealed(true), settleMs);
    return () => window.clearTimeout(t);
  }, [signal, revealed, settleMs]);
  useEffect(() => {
    const cap = window.setTimeout(() => setRevealed(true), capMs);
    return () => window.clearTimeout(cap);
  }, [capMs]);
  return revealed;
}

export type ComponentState = 'data' | 'loading' | 'error' | 'none'; // we can have more
export interface ComponentStateProps {
  onStateChange?: (state: ComponentState) => void;
}

export interface UseComponentStateReturn {
  compState: Map<string, ComponentState>;
  handleStateChange: (componentId: string, state: ComponentState) => void;
  resetComponentState: (componentId?: string) => void;
  getComponentState: (componentId: string) => ComponentState | undefined;
}

export function useComponentState(): UseComponentStateReturn {
  const [compState, setCompState] = useState<Map<string, ComponentState>>(new Map());

  const handleStateChange = useCallback((componentId: string, state: ComponentState) => {
    setCompState(prev => {
      const current = prev.get(componentId);

      if (current === state) {
         // No change, return previous map to avoid re-render
         return prev;
      }
      const newMap = new Map(prev);
      newMap.set(componentId, state);
      return newMap;
    });
  }, []);

  const resetComponentState = useCallback((componentId?: string) => {
    setCompState(prev => {
      if (!componentId) {
        return new Map(); // Reset all
      }

      const newMap = new Map(prev);
      newMap.delete(componentId);
      return newMap;
    });
  }, []);

  const getComponentState = useCallback((componentId: string): ComponentState | undefined => {
    return compState.get(componentId);
  }, [compState]);

  return {
    compState,
    handleStateChange,
    resetComponentState,
    getComponentState
  };
}

export const getComponentStatus = (
  compState: Map<string, ComponentState>
): { loadedCount: number; errorCount: number; noneCount: number; loadingCount: number } => {
  const states = Array.from(compState.values());

  return {
    loadedCount: states.filter(state => state === 'data').length,
    errorCount: states.filter(state => state === 'error').length,
    noneCount: states.filter(state => state === 'none').length,
    loadingCount: states.filter(state => state === 'loading').length,
  };
};
