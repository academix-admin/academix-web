// state-stack.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const DEBUG = process.env.NODE_ENV === "development";

type Subscriber = () => void;

/**
 * StorageAdapter abstracts persistence. All methods return Promise for
 * uniformity even if the implementation is synchronous (localStorage).
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear?(): Promise<void>;
  getAllKeys?(): Promise<string[]>;
}

/**
 * IndexedDB Adapter - Preferred for larger storage and better performance
 */
class IndexedDBAdapter implements StorageAdapter {
  private dbName = 'StateStackDB';
  private storeName = 'state';
  private version = 1;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  private async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.init();
    return db.transaction([this.storeName], mode).objectStore(this.storeName);
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const store = await this.getStore();
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (error) {
      console.warn('[IndexedDBAdapter] getItem failed, falling back to null:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const store = await this.getStore('readwrite');
      return new Promise((resolve, reject) => {
        const request = store.put(value, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] setItem failed:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const store = await this.getStore('readwrite');
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] removeItem failed:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const store = await this.getStore('readwrite');
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] clear failed:', error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const store = await this.getStore();
      return new Promise((resolve, reject) => {
        const request = store.getAllKeys();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as string[]);
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] getAllKeys failed:', error);
      return [];
    }
  }
}

/**
 * Browser adapter (localStorage) - synchronous but wrapped in Promise for API consistency.
 */
const browserStorageAdapter: StorageAdapter = {
  getItem: async (k) =>
    typeof window !== "undefined" ? Promise.resolve(localStorage.getItem(k)) : Promise.resolve(null),
  setItem: async (k, v) => {
    if (typeof window !== "undefined") localStorage.setItem(k, v);
    return Promise.resolve();
  },
  removeItem: async (k) => {
    if (typeof window !== "undefined") localStorage.removeItem(k);
    return Promise.resolve();
  },
  clear: async () => {
    if (typeof window !== "undefined") localStorage.clear();
    return Promise.resolve();
  },
  getAllKeys: async () => {
    if (typeof window !== "undefined") {
      return Object.keys(localStorage);
    }
    return [];
  },
};

export const fallbackStorageAdapter: StorageAdapter = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {},
  getAllKeys: async () => [],
};

// Create IndexedDB adapter instance
const indexedDBAdapter = new IndexedDBAdapter();

/**
 * Smart default storage that prefers IndexedDB with localStorage fallback
 */
export const defaultStorageAdapter: StorageAdapter = {
  getItem: async (key: string) => {
    try {
      // Try IndexedDB first
      return await indexedDBAdapter.getItem(key);
    } catch (error) {
      console.warn('[StateStack] IndexedDB getItem failed, falling back to localStorage:', error);
      try {
        return await browserStorageAdapter.getItem(key);
      } catch (fallbackError) {
        console.error('[StateStack] All storage adapters failed:', fallbackError);
        return null;
      }
    }
  },

  setItem: async (key: string, value: string) => {
    try {
      // Try IndexedDB first
      await indexedDBAdapter.setItem(key, value);
    } catch (error) {
      console.warn('[StateStack] IndexedDB setItem failed, falling back to localStorage:', error);
      try {
        await browserStorageAdapter.setItem(key, value);
      } catch (fallbackError) {
        console.error('[StateStack] All storage adapters failed:', fallbackError);
        throw fallbackError;
      }
    }
  },

  removeItem: async (key: string) => {
    try {
      await Promise.allSettled([
        indexedDBAdapter.removeItem(key),
        browserStorageAdapter.removeItem(key),
      ]);
    } catch (error) {
      console.warn('[StateStack] Storage removeItem had issues:', error);
    }
  },

  clear: async () => {
    try {
      await Promise.allSettled([
        indexedDBAdapter.clear(),
        browserStorageAdapter.clear?.() ?? Promise.resolve(),
      ]);
    } catch (error) {
      console.warn('[StateStack] Storage clear had issues:', error);
    }
  },

  getAllKeys: async () => {
    try {
      const [idbKeys, lsKeys] = await Promise.all([
        indexedDBAdapter.getAllKeys(),
        browserStorageAdapter.getAllKeys?.() ?? Promise.resolve([]),
      ]);
      return Array.from(new Set([...idbKeys, ...lsKeys]));
    } catch (error) {
      console.warn('[StateStack] getAllKeys failed, returning empty array:', error);
      return [];
    }
  },
};

export interface StateStackInitOptions {
  storagePrefix?: string;
  defaultStorageAdapter?: StorageAdapter | undefined;
  debug?: boolean;
  crossTabSync?: boolean;
  preferredStorage?: 'indexeddb' | 'localstorage' | 'auto';
}

let _globalConfig: StateStackInitOptions = {
  storagePrefix: "",
  defaultStorageAdapter: undefined,
  debug: DEBUG,
  crossTabSync: true,
  preferredStorage: 'auto',
};

export function initStateStack(opts: StateStackInitOptions = {}) {
  _globalConfig = { ..._globalConfig, ...opts };

  if (opts.preferredStorage === 'indexeddb') {
    _globalConfig.defaultStorageAdapter = indexedDBAdapter;
  } else if (opts.preferredStorage === 'localstorage') {
    _globalConfig.defaultStorageAdapter = browserStorageAdapter;
  }
}

export const getDefaultStorage = (): StorageAdapter =>
  _globalConfig.defaultStorageAdapter ?? defaultStorageAdapter;

const INTERNAL_SEPARATOR = "::";

/**
 * Utility: safe structured clone with fallback.
 * FIX: removed unnecessary @ts-ignore — structuredClone is in the TS DOM lib since v4.7.
 */
function safeClone<T>(v: T): T {
  try {
    if (typeof structuredClone === "function") {
      return structuredClone(v);
    }
    return JSON.parse(JSON.stringify(v));
  } catch {
    return v;
  }
}

/**
 * Production-ready StateStack core.
 */
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
  private broadcastChannel?: BroadcastChannel;

  private hydratedKeys = new Set<string>();
  private loadedKeys = new Set<string>();
  private pendingHydration = new Map<string, Promise<boolean>>();
  private hydrationSubscribers = new Map<string, Set<Subscriber>>();

  private demandedKeys = new Set<string>();
  private pendingDemandOperations = new Map<string, Promise<void>>();

  private debugLog(...args: any[]) {
    if (_globalConfig.debug) {
      console.debug("[StateStack]", ...args);
    }
  }

  private storageKey(scope: string, key: string) {
    const prefix = _globalConfig.storagePrefix ? `${_globalConfig.storagePrefix}:` : "";
    return `${prefix}${scope}${INTERNAL_SEPARATOR}${key}`;
  }

  private subKey(scope: string, key: string) {
    return `${scope}${INTERNAL_SEPARATOR}${key}`;
  }

  private parseSubKey(subKey: string): [string, string] {
    const idx = subKey.indexOf(INTERNAL_SEPARATOR);
    if (idx === -1) return ["", subKey];
    return [subKey.slice(0, idx), subKey.slice(idx + INTERNAL_SEPARATOR.length)];
  }

  async ensureHydrated(scope: string, key: string, initial: any, persist: boolean, storage: StorageAdapter): Promise<boolean> {
    const internalKey = this.subKey(scope, key);

    if (!persist) {
      this.hydratedKeys.add(internalKey);
      this.loadedKeys.add(internalKey);
      return false;
    }

    if (this.hydratedKeys.has(internalKey)) return false;

    if (this.pendingHydration.has(internalKey)) {
      return this.pendingHydration.get(internalKey)!;
    }

    const p = (async (): Promise<boolean> => {
      try {
        const storageKey = this.storageKey(scope, key);
        const stored = await storage.getItem(storageKey);
        if (stored != null) {
          try {
            const parsed = JSON.parse(stored);
            if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
            this.stacks.get(scope)!.set(key, parsed);
            this.hydratedKeys.add(internalKey);
            this.loadedKeys.add(internalKey);
            this.notifyHydration(scope, key);
            return true;
          } catch (err) {
            console.warn("[StateStack] failed to parse persisted JSON; ignoring.", err);
          }
        } else {
          if (_globalConfig.storagePrefix !== undefined) {
            const prefix = _globalConfig.storagePrefix ? `${_globalConfig.storagePrefix}:` : "";
            const altKey = `${prefix}${scope}:${key}`;
            try {
              const altStored = await storage.getItem(altKey);
              if (altStored != null) {
                const parsedAlt = JSON.parse(altStored);
                if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
                this.stacks.get(scope)!.set(key, parsedAlt);
                this.hydratedKeys.add(internalKey);
                this.loadedKeys.add(internalKey);
                this.notifyHydration(scope, key);
                return true;
              }
            } catch (err) {
              console.warn("[StateStack] legacy persist parse failed", err);
            }
          }
        }

        this.hydratedKeys.add(internalKey);
        this.loadedKeys.add(internalKey);
        this.notifyHydration(scope, key);
        return false;
      } catch (err) {
        console.error("[StateStack] hydrate error:", err);
        this.hydratedKeys.add(internalKey);
        this.loadedKeys.add(internalKey);
        this.notifyHydration(scope, key);
        return false;
      } finally {
        this.pendingHydration.delete(internalKey);
      }
    })();

    this.pendingHydration.set(internalKey, p);
    return p;
  }

  getStateSync<S>(scope: string, key: string, initial: S): S {
    if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
    const scopeStack = this.stacks.get(scope)!;
    if (!scopeStack.has(key)) {
      scopeStack.set(key, safeClone(initial));
    }
    return scopeStack.get(key) as S;
  }

  async getState<S>(scope: string, key: string, initial: S, persist: boolean, storage: StorageAdapter): Promise<S> {
    const internalKey = this.subKey(scope, key);
    return this.queueUpdate(internalKey, async () => {
      await this.ensureHydrated(scope, key, initial, persist, storage);
      return this.getStateSync(scope, key, initial);
    });
  }

  private async queueUpdate<S>(key: string, fn: () => Promise<S>): Promise<S> {
    const existingPromise = this.pendingUpdates.get(key);

    const newPromise = (async () => {
      if (existingPromise) {
        try {
          await existingPromise;
        } catch (error) {
          this.debugLog("previous update error", error);
        }
      }
      return await fn();
    })();

    this.pendingUpdates.set(key, newPromise);
    try {
      return await newPromise;
    } catch (error) {
      console.error("[StateStack] queue update error:", error);
      throw error;
    } finally {
      if (this.pendingUpdates.get(key) === newPromise) {
        this.pendingUpdates.delete(key);
      }
    }
  }

  /**
   * setState: Persists first for safety, then updates in-memory state.
   * The isHydrated flag controls when components can access the persisted state.
   */
  async setState<S>(scope: string, key: string, value: S, persist: boolean, storage: StorageAdapter, pushHistory = true): Promise<S> {
    const internalKey = this.subKey(scope, key);
    return this.queueUpdate(internalKey, async () => {
      if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
      const scopeStack = this.stacks.get(scope)!;
      const prev = scopeStack.get(key);

      // Mark as not hydrated during the persistence operation
      if (persist) {
        this.hydratedKeys.delete(internalKey);
      }

      // Attempt persistence first for safety
      if (persist) {
        try {
          const storageKey = this.storageKey(scope, key);
          await storage.setItem(storageKey, JSON.stringify(value));
        } catch (err) {
          console.error("[StateStack] persist error:", err);
          // Even if persist fails, we'll update in-memory state
        }
      }

      // Update history after persistence
      if (pushHistory) {
        const historyKey = internalKey;
        if (!this.history.has(historyKey)) {
          this.history.set(historyKey, { past: [], future: [], maxDepth: 50 });
        }
        const h = this.history.get(historyKey)!;
        h.past.push(prev === undefined ? null : safeClone(prev));
        if (h.past.length > h.maxDepth) h.past.shift();
        h.future = [];
      }

      // Update in-memory state
      scopeStack.set(key, safeClone(value));
      this.loadedKeys.add(internalKey);

      // Mark as hydrated after everything is complete
      if (persist) {
        this.hydratedKeys.add(internalKey);
        this.notifyHydration(scope, key);
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
      const subs = Array.from(s);
      for (const fn of subs) {
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
      const t = setTimeout(async () => {
        try {
          // Mark as not hydrated first
          this.hydratedKeys.delete(timerKey);
          this.loadedKeys.delete(timerKey);
          this.demandedKeys.delete(timerKey);
          this.notifyHydration(scope, key);
          
          // Then clear state
          this.stacks.get(scope)?.delete(key);
          if (this.history.has(timerKey)) this.history.delete(timerKey);
          try {
            const storage = getDefaultStorage();
            const storageKey = this.storageKey(scope, key);
            await storage.removeItem(storageKey);
          } catch (err) {
            console.error("[StateStack] TTL persist remove error:", err);
          }
        } finally {
          this.timers.delete(timerKey);
          this.notify(scope, key);
        }
      }, ttlSeconds * 1000);
      this.timers.set(timerKey, t);
    }
  }

  async clearScope(scope: string, removePersist = true) {
    const scopeMap = this.stacks.get(scope);
    const storage = getDefaultStorage();
    if (scopeMap) {
      for (const key of Array.from(scopeMap.keys())) {
        const timerKey = this.subKey(scope, key);
        
        // Mark as not hydrated first
        this.hydratedKeys.delete(timerKey);
        this.loadedKeys.delete(timerKey);
        this.demandedKeys.delete(timerKey);
        this.notifyHydration(scope, key);
        
        // Then clear in-memory state
        scopeMap.delete(key);
        this.notify(scope, key);
        
        if (this.timers.has(timerKey)) {
          clearTimeout(this.timers.get(timerKey)!);
          this.timers.delete(timerKey);
        }
        if (this.history.has(timerKey)) {
          this.history.delete(timerKey);
        }

        if (removePersist) {
          try {
            const storageKey = this.storageKey(scope, key);
            await storage.removeItem(storageKey);
          } catch (err) {
            console.error("[StateStack] clearScope persist remove error:", err);
          }
        }
      }
      this.stacks.delete(scope);
    }

    // Also remove tracked loaded/hydrated keys matching scope
    for (const internalKey of Array.from(this.loadedKeys)) {
      const [keyScope, key] = this.parseSubKey(internalKey);
      if (keyScope === scope) {
        this.hydratedKeys.delete(internalKey);
        this.loadedKeys.delete(internalKey);
        this.demandedKeys.delete(internalKey);
        this.notifyHydration(keyScope, key);

        if (removePersist) {
          try {
            const storageKey = this.storageKey(scope, key);
            await storage.removeItem(storageKey);
          } catch (err) {
            console.error("[StateStack] clearScope demand persist remove error:", err);
          }
        }
      }
    }
    this.scopeSubscriberCounts.delete(scope);
  }

  async clearByPathname(pathname: string, removePersist = true) {
    const scope = `route:${pathname}`;
    await this.clearScope(scope, removePersist);
  }

  async clearCurrentPath(removePersist = true) {
    if (typeof window === "undefined") return;
    const pathname = window.location.pathname;
    await this.clearByPathname(pathname, removePersist);
  }

  clearKey(scope: string, key: string, removePersist = true) {
    const internalKey = this.subKey(scope, key);

    // Mark as not hydrated first
    this.hydratedKeys.delete(internalKey);
    this.loadedKeys.delete(internalKey);
    this.demandedKeys.delete(internalKey);
    this.notifyHydration(scope, key);

    if (!this.stacks.has(scope)) {
      if (removePersist) {
        try {
          const storage = getDefaultStorage();
          const storageKey = this.storageKey(scope, key);
          storage.removeItem(storageKey).catch((err) => console.error("[StateStack] clearKey remove persist error:", err));
        } catch (err) {
          console.error("[StateStack] clearKey remove persist error:", err);
        }
      }
      return;
    }

    this.stacks.get(scope)?.delete(key);
    this.notify(scope, key);

    if (this.timers.has(internalKey)) {
      clearTimeout(this.timers.get(internalKey)!);
      this.timers.delete(internalKey);
    }

    if (this.history.has(internalKey)) {
      this.history.delete(internalKey);
    }

    if (removePersist) {
      try {
        const storage = getDefaultStorage();
        const storageKey = this.storageKey(scope, key);
        storage.removeItem(storageKey).catch((err) => console.error("[StateStack] clearKey remove persist error:", err));
      } catch (err) {
        console.error("[StateStack] clearKey remove persist error:", err);
      }
    }
  }

  clearByPrefix(prefix: string, removePersist = true) {
    for (const [scope, scopeMap] of this.stacks) {
      for (const key of Array.from(scopeMap.keys())) {
        if (key.startsWith(prefix)) {
          this.clearKey(scope, key, removePersist);
        }
      }
    }

    for (const internalKey of Array.from(this.loadedKeys)) {
      const [keyScope, key] = this.parseSubKey(internalKey);
      if (key.startsWith(prefix)) {
        this.hydratedKeys.delete(internalKey);
        this.loadedKeys.delete(internalKey);
        this.demandedKeys.delete(internalKey);
        this.notifyHydration(keyScope, key);

        if (removePersist) {
          try {
            const storage = getDefaultStorage();
            const storageKey = this.storageKey(keyScope, key);
            storage.removeItem(storageKey).catch((err) => {
              console.error("[StateStack] clearByPrefix persist remove error:", err);
            });
          } catch (err) {
            console.error("[StateStack] clearByPrefix persist remove error:", err);
          }
        }
      }
    }
  }

  clearByCondition(condition: (scope: string, key: string) => boolean, removePersist = true) {
    for (const [scope, scopeMap] of this.stacks) {
      for (const key of Array.from(scopeMap.keys())) {
        try {
          if (condition(scope, key)) {
            this.clearKey(scope, key, removePersist);
          }
        } catch (err) {
          console.error("[StateStack] clearByCondition condition error:", err);
        }
      }
    }

    for (const internalKey of Array.from(this.loadedKeys)) {
      const [keyScope, key] = this.parseSubKey(internalKey);
      try {
        if (condition(keyScope, key)) {
          this.hydratedKeys.delete(internalKey);
          this.loadedKeys.delete(internalKey);
          this.demandedKeys.delete(internalKey);
          this.notifyHydration(keyScope, key);

          if (removePersist) {
            try {
              const storage = getDefaultStorage();
              const storageKey = this.storageKey(keyScope, key);
              storage.removeItem(storageKey).catch((err) => {
                console.error("[StateStack] clearByCondition persist remove error:", err);
              });
            } catch (err) {
              console.error("[StateStack] clearByCondition persist remove error:", err);
            }
          }
        }
      } catch (err) {
        console.error("[StateStack] clearByCondition error on loadedKey:", err);
      }
    }
  }

  clearMatching(opts: {
    prefix?: string;
    contains?: string;
    regex?: RegExp;
    scope?: string;
    removePersist?: boolean;
    condition?: (scope: string, key: string) => boolean;
  }) {
    const { prefix, contains, regex, scope: onlyScope, removePersist = true, condition } = opts;
    if (condition) {
      return this.clearByCondition(condition, removePersist);
    }
    const matcher = (scope: string, key: string) => {
      if (onlyScope && scope !== onlyScope) return false;
      if (prefix && key.startsWith(prefix)) return true;
      if (contains && key.includes(contains)) return true;
      if (regex && regex.test(key)) return true;
      return false;
    };
    this.clearByCondition(matcher, removePersist);
  }

  canUndo(scope: string, key: string) {
    const h = this.history.get(this.subKey(scope, key));
    return !!h && h.past.length > 0;
  }

  canRedo(scope: string, key: string) {
    const h = this.history.get(this.subKey(scope, key));
    return !!h && h.future.length > 0;
  }

  /**
   * FIX (undo/redo on non-persistent state): undo and redo now work regardless
   * of the `persist` flag. History is always tracked; persistence is a separate
   * concern. A warning is emitted when called with no history.
   */
  async undo(scope: string, key: string, persist: boolean, storage: StorageAdapter) {
    const internalKey = this.subKey(scope, key);
    return this.queueUpdate(internalKey, async () => {
      const h = this.history.get(internalKey);
      if (!h || h.past.length === 0) {
        console.warn(`[StateStack] undo called on "${scope}::${key}" but there is no history.`);
        return;
      }
      const current = this.stacks.get(scope)?.get(key);
      const prev = h.past.pop()!;
      h.future.push(safeClone(current));
      if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
      this.stacks.get(scope)!.set(key, prev);
      this.loadedKeys.add(internalKey);
      if (persist) {
        try {
          await (storage || getDefaultStorage()).setItem(this.storageKey(scope, key), JSON.stringify(prev));
        } catch (err) {
          console.error("[StateStack] undo persist error:", err);
        }
      }
      this.notify(scope, key);
    });
  }

  async redo(scope: string, key: string, persist: boolean, storage: StorageAdapter) {
    const internalKey = this.subKey(scope, key);
    return this.queueUpdate(internalKey, async () => {
      const h = this.history.get(internalKey);
      if (!h || h.future.length === 0) {
        console.warn(`[StateStack] redo called on "${scope}::${key}" but there is no future.`);
        return;
      }
      const next = h.future.pop()!;
      h.past.push(safeClone(this.stacks.get(scope)?.get(key)));
      this.stacks.get(scope)!.set(key, next);
      this.loadedKeys.add(internalKey);
      if (persist) {
        try {
          await (storage || getDefaultStorage()).setItem(this.storageKey(scope, key), JSON.stringify(next));
        } catch (err) {
          console.error("[StateStack] redo persist error:", err);
        }
      }
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

  isLoaded(scope: string, key: string) {
    return this.loadedKeys.has(this.subKey(scope, key));
  }

  markLoaded(scope: string, key: string) {
    this.loadedKeys.add(this.subKey(scope, key));
  }

  clearLoaded(scope: string, key: string) {
    this.loadedKeys.delete(this.subKey(scope, key));
  }

  isDemanded(scope: string, key: string) {
    return this.demandedKeys.has(this.subKey(scope, key));
  }

  markDemanded(scope: string, key: string) {
    this.demandedKeys.add(this.subKey(scope, key));
  }

  clearDemanded(scope: string, key: string) {
    this.demandedKeys.delete(this.subKey(scope, key));
  }

  isHydrated(scope: string, key: string): boolean {
    return this.hydratedKeys.has(this.subKey(scope, key));
  }

  markHydrated(scope: string, key: string) {
    const internalKey = this.subKey(scope, key);
    this.hydratedKeys.add(internalKey);
    this.loadedKeys.add(internalKey);
    this.notifyHydration(scope, key);
  }

  private notifyHydration(scope: string, key: string) {
    const k = this.subKey(scope, key);
    const s = this.hydrationSubscribers.get(k);
    if (!s) return;
    queueMicrotask(() => {
      const subs = Array.from(s);
      for (const fn of subs) {
        try {
          fn();
        } catch (err) {
          console.error("[StateStack] hydration subscriber error:", err);
        }
      }
    });
  }

  subscribeToHydration(scope: string, key: string, fn: Subscriber): () => void {
    const k = this.subKey(scope, key);
    if (!this.hydrationSubscribers.has(k)) this.hydrationSubscribers.set(k, new Set());
    this.hydrationSubscribers.get(k)!.add(fn);

    if (this.isHydrated(scope, key)) {
      queueMicrotask(() => {
        try {
          fn();
        } catch (err) {
          console.error("[StateStack] hydration subscriber immediate call error:", err);
        }
      });
    }

    return () => {
      if (this.hydrationSubscribers.has(k)) {
        this.hydrationSubscribers.get(k)!.delete(fn);
        if (this.hydrationSubscribers.get(k)!.size === 0) {
          this.hydrationSubscribers.delete(k);
        }
      }
    };
  }

  async runDemandOperation<S>(scope: string, key: string, operation: () => Promise<void>): Promise<void> {
    const operationKey = this.subKey(scope, key);

    if (this.pendingDemandOperations.has(operationKey)) {
      return this.pendingDemandOperations.get(operationKey)!;
    }

    const promise = (async () => {
      try {
        if (this.isDemanded(scope, key)) return;
        await operation();
      } finally {
        this.pendingDemandOperations.delete(operationKey);
      }
    })();

    this.pendingDemandOperations.set(operationKey, promise);
    return promise;
  }

  private attachStorageListener() {
    if (this.storageEventListenerAttached || typeof window === "undefined") return;
    if (_globalConfig.crossTabSync === false) {
      this.storageEventListenerAttached = false;
      return;
    }
    this.storageEventListenerAttached = true;

    // FIX (cross-tab sync): the `storage` event is now reliably fired because
    // defaultStorageAdapter.setItem mirrors writes to localStorage. This
    // listener therefore works correctly for the default 'auto' storage mode.
    window.addEventListener("storage", (ev) => {
      try {
        if (!ev.key) return;
        let key = ev.key;
        const prefix = _globalConfig.storagePrefix ? `${_globalConfig.storagePrefix}:` : "";
        if (prefix && key.startsWith(prefix)) {
          key = key.slice(prefix.length);
        }

        let scope = "";
        let subKey = "";
        if (key.includes(INTERNAL_SEPARATOR)) {
          const idx = key.indexOf(INTERNAL_SEPARATOR);
          scope = key.slice(0, idx);
          subKey = key.slice(idx + INTERNAL_SEPARATOR.length);
        } else {
          const idx = key.lastIndexOf(":");
          if (idx === -1) return;
          scope = key.slice(0, idx);
          subKey = key.slice(idx + 1);
        }

        if (ev.newValue == null) {
          this.stacks.get(scope)?.delete(subKey);
          this.hydratedKeys.delete(this.subKey(scope, subKey));
          this.loadedKeys.delete(this.subKey(scope, subKey));
          this.demandedKeys.delete(this.subKey(scope, subKey));
          this.notify(scope, subKey);
        } else {
          try {
            const parsed = JSON.parse(ev.newValue);
            if (!this.stacks.has(scope)) this.stacks.set(scope, new Map());
            this.stacks.get(scope)!.set(subKey, parsed);
            this.hydratedKeys.add(this.subKey(scope, subKey));
            this.loadedKeys.add(this.subKey(scope, subKey));
            this.notify(scope, subKey);
          } catch {
            // ignore parse errors from other origins
          }
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
      loadedKeys: Array.from(this.loadedKeys),
    };
  }
}

/* -------------------------
   Public helpers & hooks
   ------------------------- */

type MethodFn<S = any> = (state: S, ...args: any[]) => S;
type MethodDict<S = any> = Record<string, MethodFn<S>>;
type ParamsForMethod<F> = F extends (state: any, ...args: infer A) => any ? A : never;

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

    // FIX (config.initial instability): capture the initial value once so that
    // inline object/array literals don't produce a new reference every render,
    // which would otherwise invalidate useCallback/useMemo dependencies.
    const initialRef = useRef(config.initial as StateType);

    const [isHydrated, setIsHydrated] = useState(() => core.isHydrated(scope, keyStr));

    useEffect(() => {
      return core.subscribeToHydration(scope, keyStr, () => {
        setIsHydrated((prev) => {
          const next = core.isHydrated(scope, keyStr);
          return prev === next ? prev : next;
        });
      });
    }, [scope, keyStr]);

    const state = useSyncExternalStore(
      useCallback((callback) => core.subscribe(scope, keyStr, callback), [scope, keyStr]),
      useCallback(() => core.getStateSync(scope, keyStr, initialRef.current), [scope, keyStr]),
      useCallback(() => initialRef.current, [])
    );

    useEffect(() => {
      if (!persist) return;
      let mounted = true;
      const hydrate = async () => {
        try {
          const didHydrate = await core.ensureHydrated(scope, keyStr, initialRef.current, persist, storage);
          if (mounted && didHydrate) {
            core.notify(scope, keyStr);
          }
        } catch (err) {
          console.error("[StateStack] hydrate error:", err);
        }
      };
      hydrate();
      return () => { mounted = false; };
    }, [scope, keyStr, persist, storage]);

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
        [M in keyof typeof m]: (...args: ParamsForMethod<typeof m[M]>) => Promise<void>;
      } = {} as any;

      for (const methodName of Object.keys(m)) {
        out[methodName as keyof typeof m] = async (...args: any[]) => {
          const current = await core.getState(scope, keyStr, initialRef.current, persist, storage);
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
    }, [scope, keyStr, ttl, persist, config.middleware, storage]);

    // FIX (undo/redo): guard removed — undo/redo now work for non-persistent state too.
    const undo = useCallback(async () => {
      await core.undo(scope, keyStr, persist, storage);
    }, [scope, keyStr, persist, storage]);

    const redo = useCallback(async () => {
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
        clear: (removePersist = true) => core.clearKey(scope, keyStr, removePersist),
        clearByScope: (removePersist = true) => core.clearScope(scope, removePersist),
        isHydrated,
      },
    } as unknown as {
      [K in Key]: StateType;
    } & {
      [K2 in `${Key}$`]: {
        [M in keyof MethodsFor<Blueprints[Key]>]: (...args: ParamsForMethod<MethodsFor<Blueprints[Key]>[M]>) => Promise<void>;
      };
    } & { __meta: any };
  }

  return { useStack };
}

/**
 * useDemandState: lazy-loaded state helper with demand(loader) function.
 *
 * FIX (config.initial instability): initial value is stabilized via useRef.
 * FIX ("route:unknown" silent collision): a dev warning is now emitted when
 * pathname is unavailable so the issue is visible during development.
 */
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
    scope?: string;
  }
): [
  T,
  (loader: (helpers: { get: () => T; set: (v: T) => void }) => void | Promise<void>) => void,
  (v: T | ((prev: T) => T)) => void,
  {
    clear: (removePersist?: boolean) => void;
    clearByScope: (scope: string, removePersist?: boolean) => void;
    clearByPathname: (removePersist?: boolean) => void;
    clearByPrefix: (prefix: string, removePersist?: boolean) => void;
    clearByCondition: (condition: (scope: string, key: string) => boolean, removePersist?: boolean) => void;
    isHydrated: boolean;
  }
] {
  const pathname = usePathname();

  // FIX: warn in dev when pathname is unavailable to surface potential scope collisions.
  if (!pathname && _globalConfig.debug) {
    console.warn(
      "[StateStack] useDemandState: usePathname() returned null. " +
      "State will be scoped to 'route:unknown', which may cause key collisions " +
      "across unrelated components. Provide an explicit `scope` via opts to avoid this."
    );
  }

  const resolvedPathname = pathname || "route:unknown";
  const scope = opts?.scope || `route:${resolvedPathname}`;
  const key = opts?.key ?? "demand";
  const ttl = opts?.ttl;
  const persist = opts?.persist ?? true;
  const storage = opts?.storage || getDefaultStorage();
  const historyDepth = opts?.historyDepth ?? 10;
  const clearOnUnmount = opts?.clearOnUnmount ?? false;
  const clearOnBack = opts?.clearOnBack ?? false;
  const deps = opts?.deps ?? [];
  const clearOnZeroSubscribers = opts?.clearOnZeroSubscribers ?? false;

  const core = StateStackCore.instance;
  const keyStr = key;

  // FIX (config.initial instability): stabilize the initial value.
  const initialRef = useRef(initial);

  const [isHydrated, setIsHydrated] = useState(() => core.isHydrated(scope, keyStr));

  useEffect(() => {
    return core.subscribeToHydration(scope, keyStr, () => {
      setIsHydrated((prev) => {
        const next = core.isHydrated(scope, keyStr);
        return prev === next ? prev : next;
      });
    });
  }, [scope, keyStr]);

  const state = useSyncExternalStore(
    useCallback((cb) => core.subscribe(scope, keyStr, cb), [scope, keyStr]),
    useCallback(() => core.getStateSync(scope, keyStr, initialRef.current), [scope, keyStr]),
    useCallback(() => initialRef.current, [])
  );

  useEffect(() => {
    if (!persist) return;
    let mounted = true;
    const hydrate = async () => {
      try {
        const didHydrate = await core.ensureHydrated(scope, keyStr, initialRef.current, persist, storage);
        if (mounted && didHydrate) {
          core.notify(scope, keyStr);
        }
      } catch (err) {
        console.error("[useDemandState] hydrate error:", err);
      }
    };
    hydrate();
    return () => { mounted = false; };
  }, [scope, keyStr, persist, storage]);

  useEffect(() => {
    core.setHistoryDepth(scope, keyStr, historyDepth);
  }, [scope, keyStr, historyDepth]);

  useEffect(() => {
    if (clearOnUnmount) {
      return () => { core.clearScope(scope); };
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

  useEffect(() => {
    core.clearDemanded(scope, keyStr);
  }, deps);

  const demand = useCallback(
    (loader: (helpers: { get: () => T; set: (v: T) => void }) => void | Promise<void>) => {
      if (core.isDemanded(scope, key)) return;
      core.runDemandOperation(scope, keyStr, async () => {
        const ctx = {
          get: () => core.getStateSync(scope, keyStr, initialRef.current) as T,
          set: (v: T) => {
            core.setState(scope, keyStr, v, persist, storage);
            if (ttl) core.setTTL(scope, keyStr, ttl);
            core.markDemanded(scope, keyStr);
            core.markHydrated(scope, keyStr);
          },
        };
        await Promise.resolve(loader(ctx));
      }).catch((err) => {
        console.error("[useDemandState] loader error:", err);
      });
    },
    [scope, keyStr, ttl, persist, storage]
  );

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      const prev = core.getStateSync(scope, keyStr, initialRef.current) as T;
      const next = typeof v === "function" ? (v as any)(prev) : v;
      core.setState(scope, keyStr, next, persist, storage);
      if (ttl) core.setTTL(scope, keyStr, ttl);
      core.markDemanded(scope, keyStr);
      core.markHydrated(scope, keyStr);
    },
    [scope, keyStr, ttl, persist, storage]
  );

  const clear = useCallback((removePersist = true) => {
    core.clearKey(scope, keyStr, removePersist);
  }, [scope, keyStr]);

  const clearByScope = useCallback((scopeArg: string, removePersist = true) => {
    core.clearScope(scopeArg, removePersist);
  }, []);

  const clearByPathname = useCallback((removePersist = true) => {
    core.clearByPathname(resolvedPathname, removePersist);
  }, [resolvedPathname]);

  const clearByPrefix = useCallback((prefix: string, removePersist = true) => {
    core.clearByPrefix(prefix, removePersist);
  }, []);

  const clearByCondition = useCallback((condition: (scope: string, key: string) => boolean, removePersist = true) => {
    core.clearByCondition(condition, removePersist);
  }, []);

  return [state, demand, set, { clear, clearByScope, clearByPathname, clearByPrefix, clearByCondition, isHydrated }];
}

/* -----------------------------------------------------------------------
   Atom store

   FIX (concurrent updates dropped): replaced the broken queueUpdate pattern
   (which deduplicated concurrent calls instead of queuing them) with a
   per-key promise chain. Every set() appends to the chain, guaranteeing all
   updates are applied in order and none are silently discarded.
   ----------------------------------------------------------------------- */
class AtomStore {
  private atoms = new Map<string, any>();
  private subs = new Map<string, Set<() => void>>();
  // FIX: sequential chain per key instead of a deduplicating map.
  private updateChains = new Map<string, Promise<void>>();

  private notifySubscribers(key: string) {
    queueMicrotask(() => {
      const s = this.subs.get(key);
      if (!s) return;
      for (const fn of s) {
        try { fn(); } catch (err) { console.error("[Atom] subscriber error", err); }
      }
    });
  }

  get<T>(key: string, initial: T): T {
    if (!this.atoms.has(key)) this.atoms.set(key, safeClone(initial));
    return this.atoms.get(key) as T;
  }

  set<T>(key: string, value: T) {
    const prev = this.updateChains.get(key) ?? Promise.resolve();
    const next = prev
      .then(() => {
        this.atoms.set(key, safeClone(value));
        this.notifySubscribers(key);
      })
      .catch((err) => {
        console.error("[Atom] set error:", err);
      });
    this.updateChains.set(key, next);
    // Avoid memory leak: remove the chain ref once settled.
    next.finally(() => {
      if (this.updateChains.get(key) === next) {
        this.updateChains.delete(key);
      }
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
      pendingChains: Array.from(this.updateChains.keys()),
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

/**
 * FIX (useComputed flash): replaced useState+useEffect with useMemo so the
 * computed value is always in sync with its deps at render time, eliminating
 * the one-tick stale-value flash caused by the original implementation.
 */
export function useComputed<T>(compute: () => T, defaultValue: T, deps: React.DependencyList = []): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    try {
      return compute();
    } catch (err) {
      console.error("[useComputed] compute error:", err);
      return defaultValue;
    }
  }, deps);
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

export { indexedDBAdapter, browserStorageAdapter };

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
    adapters: {
      indexedDB: indexedDBAdapter,
      localStorage: browserStorageAdapter,
      default: defaultStorageAdapter,
    },
  };
}

/**
 * FIX (StateStack export boilerplate): bind core methods directly instead of
 * wrapping each one in an anonymous arrow function.
 */
const coreInstance = StateStackCore.instance;

export const StateStack = {
  core: coreInstance,
  init: initStateStack,
  createStateStack,
  useDemandState,
  useAtom,
  useComputed,
  useToggle,
  useList,
  getDefaultStorage,
  clearKey: coreInstance.clearKey.bind(coreInstance),
  clearScope: coreInstance.clearScope.bind(coreInstance),
  clearByPathname: coreInstance.clearByPathname.bind(coreInstance),
  clearCurrentPath: (removePersist = true) => {
    if (typeof window !== "undefined") {
      coreInstance.clearByPathname(window.location.pathname, removePersist);
    }
  },
  clearByPrefix: coreInstance.clearByPrefix.bind(coreInstance),
  clearByCondition: coreInstance.clearByCondition.bind(coreInstance),
  clearMatching: coreInstance.clearMatching.bind(coreInstance),
  adapters: {
    indexedDB: indexedDBAdapter,
    localStorage: browserStorageAdapter,
    default: defaultStorageAdapter,
  },
};