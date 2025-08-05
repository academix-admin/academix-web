// lib/state-stack.ts
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const DEBUG = process.env.NODE_ENV === 'development';

type Subscriber = () => void;

export interface StorageAdapter {
getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const browserStorageAdapter: StorageAdapter = {
  getItem: async (k) => (typeof window !== "undefined" ? localStorage.getItem(k) : null),
  setItem: async (k, v) => {
    if (typeof window !== "undefined") localStorage.setItem(k, v);
  },
  removeItem: async (k) => {
    if (typeof window !== "undefined") localStorage.removeItem(k);
  },
};

export const fallbackStorageAdapter: StorageAdapter = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const defaultStorageAdapter = browserStorageAdapter;

export interface StateStackInitOptions {
  storagePrefix?: string;
  defaultStorageAdapter?: StorageAdapter;
  debug?: boolean;
}

let _globalConfig: StateStackInitOptions = {
  storagePrefix: "",
  defaultStorageAdapter: typeof window !== "undefined" ? defaultStorageAdapter : fallbackStorageAdapter,
  debug: DEBUG
};

export function initStateStack(opts: StateStackInitOptions) {
  _globalConfig = { ..._globalConfig, ...opts };
}

export const getDefaultStorage = (): StorageAdapter =>
  _globalConfig.defaultStorageAdapter ?? fallbackStorageAdapter;

class StateStackCore {
  private static _instance: StateStackCore | null = null;
  static get instance() {
    if (!this._instance) {
      this._instance = new StateStackCore();
      this._instance.attachStorageListener();
    }
    return this._instance;
  }

  private stacks = new Map<string, Map<string, unknown>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private subscribers = new Map<string, Set<Subscriber>>();
  private history = new Map<string, { past: any[]; future: any[]; maxDepth: number }>();
  private pendingUpdates = new Map<string, Promise<any>>();
  private scopeSubscriberCounts = new Map<string, number>();
  private autoClearScopes = new Set<string>();
  private storageEventListenerAttached = false;
  private hydratedKeys = new Set<string>();

  private debugLog(...args: any[]) {
    if (_globalConfig.debug) {
      console.debug('[StateStack]', ...args);
    }
  }

  private storageKey(scope: string, key: string) {
    const prefix = _globalConfig.storagePrefix ? `${_globalConfig.storagePrefix}:` : "";
    return `${prefix}${scope}:${key}`;
  }

  private subKey(scope: string, key: string) {
    return `${scope}:${key}`;
  }

  async ensureHydrated(scope: string, key: string, initial: any, persist: boolean, storage: StorageAdapter): Promise<boolean> {
    const internalKey = this.subKey(scope, key);

    if (!persist || this.hydratedKeys.has(internalKey)) return false;

    try {
      const storageKey = this.storageKey(scope, key);
      const stored = await storage.getItem(storageKey);
      if (stored != null) {
        const parsed = JSON.parse(stored);
        if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
        this.stacks.get(scope)!.set(key, parsed);
        this.hydratedKeys.add(internalKey);
        return true;
      }
    } catch (err) {
      console.error("[StateStack] hydrate error:", err);
    }
    return false;
  }

  getStateSync<S>(scope: string, key: string, initial: S): S {
    if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
    const scopeStack = this.stacks.get(scope)!;
    if (!scopeStack.has(key)) {
      scopeStack.set(key, initial);
    }
    return scopeStack.get(key) as S;
  }

  async getState<S>(
    scope: string,
    key: string,
    initial: S,
    persist: boolean,
    storage: StorageAdapter
  ): Promise<S> {
    const internalKey = this.subKey(scope, key);
    return this.queueUpdate(internalKey, async () => {
      await this.ensureHydrated(scope, key, initial, persist, storage);
      return this.getStateSync(scope, key, initial);
    });
  }

  private async queueUpdate<S>(key: string, fn: () => Promise<S>): Promise<S> {
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

  async setState<S>(
    scope: string,
    key: string,
    value: S,
    persist: boolean,
    storage: StorageAdapter,
    pushHistory = true
  ): Promise<S> {
    const internalKey = this.subKey(scope, key);
    return this.queueUpdate(internalKey, async () => {
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
          const storageKey = this.storageKey(scope, key);
          await storage.setItem(storageKey, JSON.stringify(value));
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
    this.incrementScopeCount(scope);

    let unsubbed = false;
    return () => {
      if (unsubbed) return;
      unsubbed = true;
      if (this.subscribers.has(k)) {
        this.subscribers.get(k)!.delete(fn);
        if (this.subscribers.get(k)!.size === 0) {
          this.subscribers.delete(k);
        }
      }
      this.decrementScopeCount(scope);
    };
  }

  private incrementScopeCount(scope: string) {
    const prev = this.scopeSubscriberCounts.get(scope) ?? 0;
    this.scopeSubscriberCounts.set(scope, prev + 1);
  }

  private decrementScopeCount(scope: string) {
    const prev = this.scopeSubscriberCounts.get(scope) ?? 0;
    const next = Math.max(0, prev - 1);
    this.scopeSubscriberCounts.set(scope, next);
    if (next === 0 && this.autoClearScopes.has(scope)) {
      this.clearScope(scope);
      this.autoClearScopes.delete(scope);
    }
  }

  enableAutoClearOnZero(scope: string) {
    this.autoClearScopes.add(scope);
  }

  disableAutoClearOnZero(scope: string) {
    this.autoClearScopes.delete(scope);
  }

  notify(scope: string, key: string) {
    const k = this.subKey(scope, key);
    const s = this.subscribers.get(k);
    if (!s) return;

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
        if (this.history.has(timerKey)) this.history.delete(timerKey);
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
      const timerKey = this.subKey(scope, key);
      if (this.timers.has(timerKey)) {
        clearTimeout(this.timers.get(timerKey)!);
        this.timers.delete(timerKey);
      }
      if (this.history.has(timerKey)) {
        this.history.delete(timerKey);
      }
    }
    this.stacks.delete(scope);
    this.scopeSubscriberCounts.delete(scope);
  }

  clearByPathname(pathname: string) {
    const scope = `route:${pathname}`;
    this.clearScope(scope);
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
    if (this.history.has(timerKey)) {
      this.history.delete(timerKey);
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
    const internalKey = this.subKey(scope, key);
    return this.queueUpdate(internalKey, async () => {
      const hk = internalKey;
      const h = this.history.get(hk);
      if (!h || h.past.length === 0) return;
      const current = this.stacks.get(scope)?.get(key);
      const prev = h.past.pop()!;
      h.future.push(this._clone(current));
      if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
      this.stacks.get(scope)!.set(key, prev);
      if (persist) await (storage || getDefaultStorage()).setItem(this.storageKey(scope, key), JSON.stringify(prev));
      this.notify(scope, key);
    });
  }

  async redo(scope: string, key: string, persist: boolean, storage: StorageAdapter) {
    const internalKey = this.subKey(scope, key);
    return this.queueUpdate(internalKey, async () => {
      const hk = internalKey;
      const h = this.history.get(hk);
      if (!h || h.future.length === 0) return;
      const next = h.future.pop()!;
      h.past.push(this._clone(this.stacks.get(scope)?.get(key)));
      this.stacks.get(scope)!.set(key, next);
      if (persist) await (storage || getDefaultStorage()).setItem(this.storageKey(scope, key), JSON.stringify(next));
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

  private _clone<T>(v: T): T {
    try {
      return JSON.parse(JSON.stringify(v));
    } catch {
      return v;
    }
  }

  private attachStorageListener() {
    if (this.storageEventListenerAttached || typeof window === "undefined") return;
    this.storageEventListenerAttached = true;
    window.addEventListener("storage", (ev) => {
      try {
        if (!ev.key) return;
        let key = ev.key;
        const prefix = _globalConfig.storagePrefix ? `${_globalConfig.storagePrefix}:` : "";
        if (prefix && key.startsWith(prefix)) {
          key = key.slice(prefix.length);
        }
        const idx = key.lastIndexOf(":");
        if (idx === -1) return;
        const scope = key.slice(0, idx);
        const subKey = key.slice(idx + 1);
        if (ev.newValue == null) {
          this.stacks.get(scope)?.delete(subKey);
          this.notify(scope, subKey);
        } else {
          try {
            const parsed = JSON.parse(ev.newValue);
            if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
            this.stacks.get(scope)!.set(subKey, parsed);
            this.notify(scope, subKey);
          } catch {}
        }
      } catch (err) {
        console.error("[StateStack] storage event handler error:", err);
      }
    });
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
      historyKeys: Array.from(this.history.keys()),
      subscribers: Array.from(this.subscribers.keys()),
      scopeSubscriberCounts: Array.from(this.scopeSubscriberCounts.entries()),
      autoClearScopes: Array.from(this.autoClearScopes),
      pendingUpdates: Array.from(this.pendingUpdates.keys()),
      hydratedKeys: Array.from(this.hydratedKeys),
    };
  }
}

type MethodFn<S = any> = (state: S, ...args: any[]) => S;
type MethodDict<S = any> = Record<string, MethodFn<S>>;

export interface StackConfig<S> {
  initial: S;
  ttl?: number;
  persist?: boolean;
  storage?: StorageAdapter;
  historyDepth?: number;
  middleware?: Array<(prev: S, next: S, action: string) => S | void>;
  clearOnZeroSubscribers?: boolean;
}

type InferStateFromMethods<T> = T extends MethodDict<infer S> ? S : never;
type MethodsFor<T> = T extends MethodDict<infer S> ? T : never;

export function createStateStack<
  Blueprints extends Record<string, MethodDict>
>(methodBlueprints: Blueprints) {
  const core = StateStackCore.instance;

  function useStack<Key extends keyof Blueprints & string>(
    key: Key,
    config: StackConfig<InferStateFromMethods<Blueprints[Key]>>,
    scope = "global"
  ) {
    type StateType = InferStateFromMethods<Blueprints[Key]>;
    const storage = config.storage || getDefaultStorage();
    const keyStr = String(key);
    const persist = !!config.persist;
    const ttl = config.ttl;
    const historyDepth = config.historyDepth ?? 50;

    const state = useSyncExternalStore(
      useCallback((callback) => core.subscribe(scope, keyStr, callback), [scope, keyStr]),
      useCallback(() => core.getStateSync(scope, keyStr, config.initial as StateType), [
        scope,
        keyStr,
        config.initial,
      ]),
      useCallback(() => config.initial as StateType, [config.initial])
    );

    useEffect(() => {
      if (!persist) return;

      let mounted = true;
      const hydrate = async () => {
        try {
          const didHydrate = await core.ensureHydrated(scope, keyStr, config.initial, persist, storage);
          if (mounted && didHydrate) {
            core.notify(scope, keyStr);
          }
        } catch (err) {
          console.error("[StateStack] hydrate error:", err);
        }
      };

      hydrate();
      return () => {
        mounted = false;
      };
    }, [scope, keyStr, config.initial, persist, storage]);

    useEffect(() => {
      core.setHistoryDepth(scope, keyStr, historyDepth);
    }, [scope, keyStr, historyDepth]);

    useEffect(() => {
      if (config.clearOnZeroSubscribers) {
        core.enableAutoClearOnZero(scope);
      }
      return () => {
        if (config.clearOnZeroSubscribers) {
          core.disableAutoClearOnZero(scope);
        }
      };
    }, [scope, config.clearOnZeroSubscribers]);

    const methods = useMemo(() => {
      const m = methodBlueprints[key];
      const out: {
        [M in keyof typeof m]: (...args: any[]) => Promise<void>;
      } = {} as any;

      for (const methodName of Object.keys(m)) {
        out[methodName as keyof typeof m] = async (...args: any[]) => {
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

      return out;
    }, [scope, keyStr, ttl, persist, config.middleware, config.initial, storage]);

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
    } as unknown as {
      [K in Key]: StateType;
    } & {
      [K2 in `${Key}$`]: {
        [M in keyof MethodsFor<Blueprints[Key]>]: (...args: Parameters<MethodsFor<Blueprints[Key]>[M]>) => Promise<void>;
      };
    } & { __meta: any };
  }

  return { useStack };
}

export function useDemandState<T>(
  initial: T,
  opts?: {
    key?: string;
    persist?: boolean;
    ttl?: number;
    storage?: StorageAdapter;
    historyDepth?: number;
    clearOnUnmount?: boolean;
    clearOnBack?: boolean;
    deps?: React.DependencyList;
    clearOnZeroSubscribers?: boolean;
  }
): [
  T,
  (loader: (helpers: { get: () => T; set: (v: T) => void }) => void | Promise<void>) => void,
  (v: T | ((prev: T) => T)) => void,
  { clear: () => void; clearByScope: (scope: string) => void; clearByPathname: () => void }
] {
  const pathname = usePathname() || "route:unknown";
  const scope = `route:${pathname}`;
  const key = opts?.key ?? "demand";
  const ttl = opts?.ttl ?? 3600;
  const persist = opts?.persist ?? true;
  const storage = opts?.storage || getDefaultStorage();
  const historyDepth = opts?.historyDepth ?? 10;
  const clearOnUnmount = opts?.clearOnUnmount ?? false;
  const clearOnBack = opts?.clearOnBack ?? false;
  const deps = opts?.deps ?? [];
  const clearOnZeroSubscribers = opts?.clearOnZeroSubscribers ?? false;

  const core = StateStackCore.instance;
  const keyStr = key;

  const state = useSyncExternalStore(
    useCallback((cb) => core.subscribe(scope, keyStr, cb), [scope, keyStr]),
    useCallback(() => core.getStateSync(scope, keyStr, initial), [scope, keyStr, initial]),
    useCallback(() => initial, [initial])
  );

  useEffect(() => {
    if (!persist) return;

    let mounted = true;
    const hydrate = async () => {
      try {
        const didHydrate = await core.ensureHydrated(scope, keyStr, initial, persist, storage);
        if (mounted && didHydrate) {
          core.notify(scope, keyStr);
        }
      } catch (err) {
        console.error("[useDemandState] hydrate error:", err);
      }
    };

    hydrate();
    return () => {
      mounted = false;
    };
  }, [scope, keyStr, initial, persist, storage]);

  useEffect(() => {
    core.setHistoryDepth(scope, keyStr, historyDepth);
  }, [scope, keyStr, historyDepth]);

  useEffect(() => {
    if (clearOnUnmount) {
      return () => {
        core.clearScope(scope);
      };
    }
  }, [scope, clearOnUnmount]);

  useEffect(() => {
    if (!clearOnBack || typeof window === "undefined") return;
    const handlePopState = () => core.clearScope(scope);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [scope, clearOnBack]);

  useEffect(() => {
    if (clearOnZeroSubscribers) {
      core.enableAutoClearOnZero(scope);
    }
    return () => {
      if (clearOnZeroSubscribers) core.disableAutoClearOnZero(scope);
    };
  }, [scope, clearOnZeroSubscribers]);

  const demand = useCallback(
    (loader: (helpers: { get: () => T; set: (v: T) => void }) => void | Promise<void>) => {
      const ctx = {
        get: () => state,
        set: (v: T) => {
          core.setState(scope, keyStr, v, persist, storage);
          core.setTTL(scope, keyStr, ttl);
        },
      };
      Promise.resolve(loader(ctx)).catch((err) => {
        console.error("[useDemandState] loader error:", err);
      });
    },
    [state, scope, keyStr, ttl, persist, storage]
  );

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      const next = typeof v === "function" ? (v as any)(state) : v;
      core.setState(scope, keyStr, next, persist, storage);
      core.setTTL(scope, keyStr, ttl);
    },
    [state, scope, keyStr, ttl, persist, storage]
  );

  const clear = useCallback(() => {
    core.clearKey(scope, keyStr);
  }, [scope, keyStr]);

  const clearByScope = useCallback((scope: string) => {
    core.clearScope(scope);
  }, []);

  const clearByPathname = useCallback(() => {
    core.clearByPathname(pathname);
  }, [pathname]);

  return [state, demand, set, { clear, clearByScope, clearByPathname }];
}

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
    const atoms: Record<string, any> = {};
    for (const [k, v] of this.atoms) atoms[k] = v;
    return {
      atoms,
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

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).__STATE_STACK__ = {
    core: StateStackCore.instance,
    atomStore,
    initStateStack,
    debug: () => ({
      stateStack: StateStackCore.instance.debug(),
      atoms: atomStore.debug(),
      globalConfig: _globalConfig,
    }),
  };
}

export const StateStack = {
  core: StateStackCore.instance,
  init: initStateStack,
  createStateStack,
  useDemandState,
  useAtom,
  useComputed,
  useToggle,
  useList,
  getDefaultStorage,
};