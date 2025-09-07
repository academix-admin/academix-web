import { useState, useCallback } from 'react';

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
