import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

/* =========================
Storage Adapter (SSR-safe)
========================= */

export interface StorageAdapter {
getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const noopAsync = async () => {};

const browserStorageAdapter: StorageAdapter = {
  getItem: async (k) => (typeof window !== "undefined" ? localStorage.getItem(k) : null),
  setItem: async (k, v) => {
    if (typeof window !== "undefined") localStorage.setItem(k, v);
    return noopAsync();
  },
  removeItem: async (k) => {
    if (typeof window !== "undefined") localStorage.removeItem(k);
    return noopAsync();
  },
};

export const fallbackStorageAdapter: StorageAdapter = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const getDefaultStorage = (): StorageAdapter =>
  typeof window !== "undefined" ? browserStorageAdapter : fallbackStorageAdapter;

/* =========================
   Core: StateStackCore
   ========================= */

type Subscriber = () => void;

class StateStackCore {
  private static _instance: StateStackCore | null = null;
  static get instance() {
    if (!this._instance) this._instance = new StateStackCore();
    return this._instance;
  }

  private stacks = new Map<string, Map<string, any>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private subscribers = new Map<string, Set<Subscriber>>();
  private history = new Map<string, { past: any[]; future: any[]; maxDepth: number }>();
  private pendingUpdates = new Map<string, Promise<any>>();

  // whether to listen to storage events for cross-tab sync
  private storageSyncEnabled = typeof window !== "undefined";
  private storageEventListenerAttached = false;

  private constructor() {
    if (this.storageSyncEnabled) this.attachStorageListener();
  }

  private subKey(scope: string, key: string) {
    return `${scope}:${key}`;
  }

  // Synchronous read of in-memory snapshot (must be sync for useSyncExternalStore)
  getStateSync<S = any>(scope: string, key: string, initial: S): S {
    if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
    const scopeStack = this.stacks.get(scope)!;
    if (!scopeStack.has(key)) {
      scopeStack.set(key, initial);
    }
    return scopeStack.get(key);
  }

  private async queueUpdate<S>(key: string, fn: () => Promise<S>): Promise<S> {
    // dedupe simultaneous updates to same key
    if (this.pendingUpdates.has(key)) {
      return this.pendingUpdates.get(key)!;
    }
    const promise = fn();
    this.pendingUpdates.set(key, promise);
    try {
      return await promise;
    } finally {
      this.pendingUpdates.delete(key);
    }
  }

  // Async read (will hydrate from storage if necessary)
  async getState<S = any>(
    scope: string,
    key: string,
    initial: S,
    persist: boolean,
    storage: StorageAdapter
  ): Promise<S> {
    return this.queueUpdate(this.subKey(scope, key), async () => {
      if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
      const scopeStack = this.stacks.get(scope)!;

      if (!scopeStack.has(key)) {
        if (persist) {
          try {
            const stored = await storage.getItem(this.subKey(scope, key));
            if (stored != null) {
              const parsed = JSON.parse(stored);
              scopeStack.set(key, parsed);
            }
          } catch (err) {
            console.error("[StateStack] load error:", err);
          }
        }
        if (!scopeStack.has(key)) {
          scopeStack.set(key, initial);
        }
      }

      return scopeStack.get(key);
    });
  }

  async setState<S = any>(
    scope: string,
    key: string,
    value: S,
    persist: boolean,
    storage: StorageAdapter,
    pushHistory = true
  ): Promise<S> {
    return this.queueUpdate(this.subKey(scope, key), async () => {
      if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
      const scopeStack = this.stacks.get(scope)!;

      const prev = scopeStack.get(key);
      if (pushHistory) {
        const historyKey = this.subKey(scope, key);
        if (!this.history.has(historyKey)) {
          this.history.set(historyKey, { past: [], future: [], maxDepth: 50 });
        }
        const h = this.history.get(historyKey)!;
        h.past.push(prev === undefined ? null : this._clone(prev));
        if (h.past.length > h.maxDepth) h.past.shift();
        h.future = [];
      }

      scopeStack.set(key, value);

      if (persist) {
        try {
          await storage.setItem(this.subKey(scope, key), JSON.stringify(value));
        } catch (err) {
          console.error("[StateStack] persist error:", err);
        }
      }

      this.notify(scope, key);
      return value;
    });
  }

  subscribe(scope: string, key: string, fn: Subscriber): () => void {
    const k = this.subKey(scope, key);
    if (!this.subscribers.has(k)) this.subscribers.set(k, new Set());
    this.subscribers.get(k)!.add(fn);
    return () => {
      if (this.subscribers.has(k)) {
        this.subscribers.get(k)!.delete(fn);
        if (this.subscribers.get(k)!.size === 0) this.subscribers.delete(k);
      }
    };
  }

  notify(scope: string, key: string) {
    const k = this.subKey(scope, key);
    const s = this.subscribers.get(k);
    if (!s) return;

    // Batch notifications to avoid interleaved updates
    queueMicrotask(() => {
      for (const fn of s) {
        try {
          fn();
        } catch (err) {
          console.error("[StateStack] subscriber error:", err);
        }
      }
    });
  }

  setTTL(scope: string, key: string, ttlSeconds?: number) {
    const timerKey = this.subKey(scope, key);
    if (this.timers.has(timerKey)) {
      clearTimeout(this.timers.get(timerKey)!);
      this.timers.delete(timerKey);
    }
    if (ttlSeconds && ttlSeconds > 0) {
      const t = setTimeout(() => {
        this.stacks.get(scope)?.delete(key);
        this.timers.delete(timerKey);
        this.notify(scope, key);
      }, ttlSeconds * 1000);
      this.timers.set(timerKey, t);
    }
  }

  clearScope(scope: string) {
    const scopeMap = this.stacks.get(scope);
    if (!scopeMap) return;
    for (const key of Array.from(scopeMap.keys())) {
      scopeMap.delete(key);
      this.notify(scope, key);
    }
    this.stacks.delete(scope);
  }

  clearKey(scope: string, key: string) {
    if (!this.stacks.has(scope)) return;
    this.stacks.get(scope)?.delete(key);
    this.notify(scope, key);
    const timerKey = this.subKey(scope, key);
    if (this.timers.has(timerKey)) {
      clearTimeout(this.timers.get(timerKey)!);
      this.timers.delete(timerKey);
    }
  }

  canUndo(scope: string, key: string) {
    const h = this.history.get(this.subKey(scope, key));
    return !!h && h.past.length > 0;
  }

  canRedo(scope: string, key: string) {
    const h = this.history.get(this.subKey(scope, key));
    return !!h && h.future.length > 0;
  }

  async undo(scope: string, key: string, persist: boolean, storage: StorageAdapter) {
    return this.queueUpdate(this.subKey(scope, key), async () => {
      const hk = this.subKey(scope, key);
      const h = this.history.get(hk);
      if (!h || h.past.length === 0) return;
      const current = this.stacks.get(scope)?.get(key);
      const prev = h.past.pop()!;
      h.future.push(this._clone(current));
      if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
      this.stacks.get(scope)!.set(key, prev);
      if (persist) await storage.setItem(hk, JSON.stringify(prev));
      this.notify(scope, key);
    });
  }

  async redo(scope: string, key: string, persist: boolean, storage: StorageAdapter) {
    return this.queueUpdate(this.subKey(scope, key), async () => {
      const hk = this.subKey(scope, key);
      const h = this.history.get(hk);
      if (!h || h.future.length === 0) return;
      const next = h.future.pop()!;
      h.past.push(this._clone(this.stacks.get(scope)?.get(key)));
      this.stacks.get(scope)!.set(key, next);
      if (persist) await storage.setItem(hk, JSON.stringify(next));
      this.notify(scope, key);
    });
  }

  setHistoryDepth(scope: string, key: string, depth: number) {
    const hk = this.subKey(scope, key);
    if (!this.history.has(hk)) {
      this.history.set(hk, { past: [], future: [], maxDepth: Math.max(1, depth) });
      return;
    }
    this.history.get(hk)!.maxDepth = Math.max(1, depth);
  }

  debug() {
    const stacks: Record<string, Record<string, any>> = {};
    for (const [scope, map] of this.stacks) {
      stacks[scope] = {};
      for (const [k, v] of map) stacks[scope][k] = v;
    }
    return {
      stacks,
      timers: Array.from(this.timers.keys()),
      subscribers: Array.from(this.subscribers.keys()),
      history: Array.from(this.history.keys()).map((k) => ({
        key: k,
        past: this.history.get(k)?.past.length,
        future: this.history.get(k)?.future.length,
        maxDepth: this.history.get(k)?.maxDepth,
      })),
      pendingUpdates: Array.from(this.pendingUpdates.keys()),
    };
  }

  private _clone<T>(v: T): T {
    try {
      return JSON.parse(JSON.stringify(v));
    } catch {
      return v;
    }
  }

  /* =========================
     Cross-tab sync via storage events
     ========================= */
  private attachStorageListener() {
    if (this.storageEventListenerAttached || typeof window === "undefined") return;
    this.storageEventListenerAttached = true;
    window.addEventListener("storage", (ev) => {
      try {
        if (!ev.key) return;
        // expect keys in format "scope:key"
        const parts = ev.key.split(":");
        if (parts.length < 2) return;
        const scope = parts[0];
        const key = parts.slice(1).join(":");
        if (ev.newValue == null) {
          // removed or cleared
          this.stacks.get(scope)?.delete(key);
          this.notify(scope, key);
        } else {
          try {
            const parsed = JSON.parse(ev.newValue);
            if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
            this.stacks.get(scope)!.set(key, parsed);
            this.notify(scope, key);
          } catch {
            // ignore parse errors
          }
        }
      } catch (err) {
        console.error("[StateStack] storage event handler error:", err);
      }
    });
  }
}

/* =========================
   createStateStack (main)
   ========================= */

type MethodDict<S = any> = Record<string, (state: S, ...args: any[]) => S>;
export interface StackConfig<S> {
  initial: S;
  ttl?: number;
  persist?: boolean;
  storage?: StorageAdapter;
  historyDepth?: number;
  middleware?: Array<(prev: S, next: S, action: string) => S | void>;
  clearOnUnmount?: boolean; // default false (safer)
}

export function createStateStack<T extends Record<string, MethodDict>>(methodBlueprints: T) {
  const core = StateStackCore.instance;

  function useStack<K extends keyof T>(
    key: K,
    config: StackConfig<T[K] extends MethodDict<infer S> ? S : any>,
    scope = "global"
  ) {
    type StateType = T[K] extends MethodDict<infer S> ? S : any;
    const storage = config.storage || getDefaultStorage();
    const keyStr = String(key);
    const persist = !!config.persist;
    const ttl = config.ttl;
    const historyDepth = config.historyDepth ?? 50;

    // Synchronous snapshot for useSyncExternalStore - uses in-memory state
    const state = useSyncExternalStore(
      useCallback((callback) => core.subscribe(scope, keyStr, callback), [scope, keyStr]),
      useCallback(() => core.getStateSync(scope, keyStr, config.initial as StateType), [scope, keyStr, config.initial]),
      useCallback(() => config.initial as StateType, [config.initial])
    );

    // Hydrate persisted value into memory (async) when mounted / key changes
    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          await core.getState(scope, keyStr, config.initial as StateType, persist, storage);
          // core.getState writes to in-memory and calls notify; useSyncExternalStore will catch it
        } catch (err) {
          if (mounted) {
            console.error("[StateStack] hydrate error:", err);
          }
        }
      })();
      return () => {
        mounted = false;
      };
    }, [scope, keyStr, config.initial, persist, storage]);

    // apply history depth
    useEffect(() => {
      core.setHistoryDepth(scope, keyStr, historyDepth);
    }, [scope, keyStr, historyDepth]);

    // cleanup on unmount if requested
    useEffect(() => {
      return () => {
        if (config.clearOnUnmount) {
          core.clearScope(scope);
        }
      };
    }, [scope, config.clearOnUnmount]);

    // create methods
    const methods = useMemo(() => {
      const m = methodBlueprints[key];
      const out: Record<string, (...args: any[]) => Promise<void>> = {};
      for (const methodName of Object.keys(m)) {
        out[methodName] = async (...args: any[]) => {
          const current = await core.getState(scope, keyStr, config.initial as StateType, persist, storage);
          let next = (m as any)[methodName](current, ...args);
          if (config.middleware?.length) {
            for (const middleware of config.middleware) {
              const result = middleware(current, next, methodName);
              if (result !== undefined) next = result;
            }
          }
          await core.setState(scope, keyStr, next, persist, storage, true);
          core.setTTL(scope, keyStr, ttl);
        };
      }
      return out as unknown as { [M in keyof typeof m]: (...args: any[]) => Promise<void> };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope, keyStr, ttl, persist, config.middleware]);

    const undo = useCallback(async () => {
      if (!persist) return;
      await core.undo(scope, keyStr, persist, storage);
    }, [scope, keyStr, persist, storage]);

    const redo = useCallback(async () => {
      if (!persist) return;
      await core.redo(scope, keyStr, persist, storage);
    }, [scope, keyStr, persist, storage]);

    return {
      [keyStr]: state,
      [`${keyStr}$`]: methods,
      __meta: {
        undo,
        redo,
        canUndo: () => core.canUndo(scope, keyStr),
        canRedo: () => core.canRedo(scope, keyStr),
        clear: () => core.clearKey(scope, keyStr),
      },
    } as unknown as Record<typeof keyStr | `${typeof keyStr}$` | "__meta", any>;
  }

  return { useStack };
}

/* =========================
   useDemandState (pathname-scoped cache)
   ========================= */

export function useDemandState<T>(
  initial: T,
  opts?: {
    key?: string;
    persist?: boolean;
    ttl?: number;
    storage?: StorageAdapter;
    historyDepth?: number;
    clearOnUnmount?: boolean;
  }
): [T, (loader: (helpers: { get: () => T; set: (v: T) => void }) => void | Promise<void>) => void, (v: T | ((prev: T) => T)) => void] {
  const pathname = usePathname() || "route:unknown";
  const scope = `route:${pathname}`;
  const key = opts?.key ?? "demand";
  const ttl = opts?.ttl ?? 3600;
  const persist = opts?.persist ?? true;
  const storage = opts?.storage || getDefaultStorage();
  const historyDepth = opts?.historyDepth ?? 10;
  const clearOnUnmount = opts?.clearOnUnmount ?? false;

  const core = StateStackCore.instance;
  const keyStr = key;

  const state = useSyncExternalStore(
    useCallback((cb) => core.subscribe(scope, keyStr, cb), [scope, keyStr]),
    useCallback(() => core.getStateSync(scope, keyStr, initial), [scope, keyStr, initial]),
    useCallback(() => initial, [initial])
  );

  const initializedRef = useRef(false);

  // hydrate persisted data into memory
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await core.getState(scope, keyStr, initial, persist, storage);
      } catch (err) {
        if (mounted) console.error("[demandState] hydrate error:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [scope, keyStr, initial, persist, storage]);

  useEffect(() => {
    core.setHistoryDepth(scope, keyStr, historyDepth);
  }, [scope, keyStr, historyDepth]);

  useEffect(() => {
    return () => {
      if (clearOnUnmount) core.clearScope(scope);
    };
  }, [scope, clearOnUnmount]);

  const demand = useCallback(
    (loader: (helpers: { get: () => T; set: (v: T) => void }) => void | Promise<void>) => {
      if (initializedRef.current) return;
      initializedRef.current = true;
      const ctx = {
        get: () => state,
        set: (v: T) => {
          core.setState(scope, keyStr, v, persist, storage);
          core.setTTL(scope, keyStr, ttl);
        },
      };
      Promise.resolve(loader(ctx)).catch((err) => {
        console.error("[demandState] loader error:", err);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, scope, keyStr, ttl, persist, storage]
  );

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      const next = typeof v === "function" ? (v as any)(state) : v;
      core.setState(scope, keyStr, next, persist, storage);
      core.setTTL(scope, keyStr, ttl);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, scope, keyStr, ttl, persist, storage]
  );

  return [state, demand, set];
}

/* =========================
   Global Atom Store + Hooks
   ========================= */

class AtomStore {
  private atoms = new Map<string, any>();
  private subs = new Map<string, Set<() => void>>();
  private pendingUpdates = new Map<string, Promise<any>>();

  private async queueUpdate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pendingUpdates.has(key)) {
      return this.pendingUpdates.get(key)!;
    }
    const p = fn();
    this.pendingUpdates.set(key, p);
    try {
      return await p;
    } finally {
      this.pendingUpdates.delete(key);
    }
  }

  get<T>(key: string, initial: T): T {
    if (!this.atoms.has(key)) this.atoms.set(key, initial);
    return this.atoms.get(key) as T;
  }

  set<T>(key: string, value: T) {
    // use microtask to batch notifications
    this.queueUpdate(key, async () => {
      this.atoms.set(key, value);
      queueMicrotask(() => {
        const s = this.subs.get(key);
        if (!s) return;
        for (const fn of s) {
          try {
            fn();
          } catch (err) {
            console.error("[Atom] subscriber error", err);
          }
        }
      });
      return value;
    }).catch((err) => {
      console.error("[Atom] set error:", err);
    });
  }

  subscribe(key: string, fn: () => void) {
    if (!this.subs.has(key)) this.subs.set(key, new Set());
    this.subs.get(key)!.add(fn);
    return () => {
      this.subs.get(key)!.delete(fn);
    };
  }

  debug() {
    const obj: Record<string, any> = {};
    for (const [k, v] of this.atoms) obj[k] = v;
    return {
      atoms: obj,
      subscribers: Array.from(this.subs.keys()),
      pendingUpdates: Array.from(this.pendingUpdates.keys()),
    };
  }
}

const atomStore = new AtomStore();

export function useAtom<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const state = useSyncExternalStore(
    useCallback((cb) => atomStore.subscribe(key, cb), [key]),
    useCallback(() => atomStore.get(key, initial), [key, initial]),
    useCallback(() => initial, [initial])
  );

  const setter = useCallback(
    (v: T | ((prev: T) => T)) => {
      const next = typeof v === "function" ? (v as any)(atomStore.get(key, initial)) : v;
      atomStore.set(key, next);
    },
    [key, initial]
  );

  return [state, setter];
}

/* =========================
   Computed hook (lightweight)
   ========================= */

export function useComputed<T>(compute: () => T, defaultValue: T, deps: React.DependencyList = []): T {
  const [val, setVal] = useState<T>(() => {
    try {
      return compute();
    } catch (err) {
      console.error("[useComputed] compute initial error:", err);
      return defaultValue;
    }
  });

  useEffect(() => {
    let mounted = true;
    try {
      const next = compute();
      if (mounted) setVal(next);
    } catch (err) {
      console.error("[useComputed] compute error:", err);
      if (mounted) setVal(defaultValue);
    }
    return () => {
      mounted = false;
    };
  }, deps);

  return val;
}

/* =========================
   Useful small helpers
   ========================= */

export function useToggle(initial = false) {
  const [v, setV] = useState(initial);
  const toggle = useCallback(() => setV((p) => !p), []);
  return [v, toggle, setV] as const;
}

export function useList<T>(initial: T[] = []) {
  const [list, setList] = useState<T[]>(initial);

  const push = useCallback((item: T) => setList((l) => [...l, item]), []);
  const removeAt = useCallback((idx: number) => setList((l) => l.filter((_, i) => i !== idx)), []);
  const clear = useCallback(() => setList([]), []);
  const updateAt = useCallback((idx: number, item: T) => setList((l) => l.map((v, i) => (i === idx ? item : v))), []);
  return { list, push, removeAt, clear, updateAt, setList } as const;
}

/* =========================
   DevTools Integration
   ========================= */

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).__STATE_STACK__ = {
    core: StateStackCore.instance,
    atomStore,
    debug: () => ({
      stateStack: StateStackCore.instance.debug(),
      atoms: atomStore.debug(),
    }),
  };
}

/* =========================
   Exports
   ========================= */

export const StateStack = {
  core: StateStackCore.instance,
  createStateStack,
  useDemandState,
  useAtom,
  useComputed,
  useToggle,
  useList,
  getDefaultStorage,
};
