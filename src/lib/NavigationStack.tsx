'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
  ReactElement,
  useContext,
  createContext,
  lazy,
  Suspense,
  ComponentType,
} from "react";

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useEffect : () => {};

// ==================== Types ====================
type NavParams = Record<string, any> | undefined;
type LazyComponent = Promise<{ default: ComponentType<any> }>;
type TransitionState = "enter" | "idle" | "exit" | "done";
type ParsedStack = { code: string; params?: NavParams }[];

export type StackEntry = {
  uid: string;
  key: string;
  params?: NavParams;
  metadata?: {
    title?: string;
    icon?: ReactNode;
    breadcrumb?: string;
    lazy?: () => LazyComponent;
  };
};

type StackChangeListener = (stack: StackEntry[]) => void;
type RenderRecord = {
  entry: StackEntry;
  state: TransitionState;
  createdAt: number;
};

type MissingRouteConfig = {
  className?: string;
  containerClassName?: string;
  textClassName?: string;
  buttonClassName?: string;
  labels?: {
    missingRoute?: string;
    goBack?: string;
    goToRoot?: string;
  };
};

export type NavStackAPI = {
  id: string;
  push: (rawKey: string, params?: NavParams, metadata?: StackEntry['metadata']) => Promise<boolean>;
  replace: (rawKey: string, params?: NavParams, metadata?: StackEntry['metadata']) => Promise<boolean>;
  pop: () => Promise<boolean>;
  popUntil: (predicate: (entry: StackEntry, idx: number, stack: StackEntry[]) => boolean) => Promise<boolean>;
  popToRoot: () => Promise<boolean>;
  pushAndPopUntil: (rawKey: string, predicate: (entry: StackEntry, idx: number, stack: StackEntry[]) => boolean, params?: NavParams, metadata?: StackEntry['metadata']) => Promise<boolean>;
  pushAndReplace: (rawKey: string, params?: NavParams, metadata?: StackEntry['metadata']) => Promise<boolean>;
  peek: () => StackEntry | undefined;
  go: (rawKey: string, params?: NavParams, metadata?: StackEntry['metadata']) => Promise<boolean>;
  getStack: () => StackEntry[];
  length: () => number;
  subscribe: (fn: StackChangeListener) => () => void;
  registerGuard: (guard: GuardFn) => () => void;
  registerMiddleware: (middleware: MiddlewareFn) => () => void;
  dispose: () => void;
  syncWithBrowserHistory: (enabled: boolean) => void;
  isTop: (uid?: string) => boolean;
  getFullPath: () => string;
  getNavLink: () => NavigationMap;
  isActiveStack: () => boolean;
};

type NavigationMap = Record<string, ComponentType<any> | (() => LazyComponent)>;
type BuiltinTransition = "fade" | "slide" | "none";
type TransitionRenderer = (props: {
  children: ReactNode;
  state: TransitionState;
  index: number;
  isTop: boolean;
}) => ReactNode;

type GuardFn = (action: {
  type: "push" | "replace" | "pop" | "popUntil" | "popToRoot";
  from?: StackEntry | undefined;
  to?: StackEntry | undefined;
  stackSnapshot: StackEntry[];
}) => boolean | Promise<boolean>;

type MiddlewareFn = (action: {
  type: "push" | "replace" | "pop" | "popUntil" | "popToRoot" | "init";
  from?: StackEntry | undefined;
  to?: StackEntry | undefined;
  stackSnapshot: StackEntry[];
}) => void;

// ==================== Constants ====================
const DEFAULT_TRANSITION_DURATION = 220;
const DEFAULT_MAX_STACK_SIZE = 50;
const STORAGE_TTL_MS = 1000 * 60 * 30;
const MEMORY_CACHE_SIZE = 5;
const MEMORY_CACHE_EXPIRY = 1000 * 60 * 5;
const NAV_STACK_VERSION = '1';
const STACK_SEPARATOR = 'x';

// ==================== Global Systems ====================
const globalRegistry = new Map<string, {
  stack: StackEntry[];
  listeners: Set<StackChangeListener>;
  guards: Set<GuardFn>;
  middlewares: Set<MiddlewareFn>;
  maxStackSize: number;
  historySyncEnabled: boolean;
  snapshotBuffer: StackEntry[];
  parentId: string | null;
  childIds: Set<string>;
  navLink?: NavigationMap; // store navLink for each registry entry
  api?: NavStackAPI;
}>();

class TransitionManager {
  private activeTransitions = new Map<string, any>(); // browser timers are numbers
  private completedTransitions = new Set<string>();

  start(uid: string, duration: number, onComplete: () => void) {
    this.cancel(uid);
    const timer = setTimeout(() => {
      this.activeTransitions.delete(uid);
      this.completedTransitions.add(uid);
      try { onComplete(); } catch (e) { /* swallow */ }
    }, duration) as any;
    this.activeTransitions.set(uid, timer);
  }

  cancel(uid: string) {
    const timer = this.activeTransitions.get(uid);
    if (timer) {
      clearTimeout(timer);
      this.activeTransitions.delete(uid);
    }
  }

  isComplete(uid: string): boolean {
    return this.completedTransitions.has(uid);
  }

  dispose() {
    this.activeTransitions.forEach(timer => clearTimeout(timer));
    this.activeTransitions.clear();
    this.completedTransitions.clear();
  }
}

class PageMemoryManager {
  private cache = new Map<string, {
    element: ReactNode;
    lastActive: number;
  }>();

  get(uid: string): ReactNode | undefined {
    const entry = this.cache.get(uid);
    if (entry) {
      entry.lastActive = Date.now();
      return entry.element;
    }
    return undefined;
  }

  set(uid: string, element: ReactNode) {
    this.cleanup();
    this.cache.set(uid, {
      element,
      lastActive: Date.now()
    });
  }

  delete(uid: string) {
    this.cache.delete(uid);
  }

  private cleanup() {
    if (this.cache.size >= MEMORY_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].lastActive - b[1].lastActive);

      for (let i = 0; i < entries.length - MEMORY_CACHE_SIZE + 1; i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    const now = Date.now();
    this.cache.forEach((value, key) => {
      if (now - value.lastActive > MEMORY_CACHE_EXPIRY) {
        this.cache.delete(key);
      }
    });
  }

  dispose() {
    this.cache.clear();
  }
}

// ==================== Core Functions ====================
const NavContext = createContext<NavStackAPI | null>(null);
const CurrentPageContext = createContext<string | null>(null);

function findParentNavContext(): NavStackAPI | null {
  try {
    return useContext(NavContext);
  } catch (e) {
    return null;
  }
}

function isEqual(a: StackEntry[], b: StackEntry[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((entry, i) =>
    entry.key === b[i].key &&
    JSON.stringify(entry.params) === JSON.stringify(b[i].params)
  );
}

function generateStableUid(key: string, params?: NavParams): string {
  const str = key + (params ? JSON.stringify(params) : '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `uid_${Math.abs(hash)}`;
}

function parseRawKey(raw: string, params?: NavParams) {
  const [k, qs] = raw.split("?");
  let merged = params;
  if (qs) {
    try {
      const sp = new URLSearchParams(qs);
      const obj = Object.fromEntries(sp.entries());
      merged = merged ? { ...merged, ...obj } : obj;
    } catch (e) {}
  }
  return { key: k, params: merged };
}

function storageKeyFor(id: string) {
  return `navstack:${id}`;
}

function readPersistedStack(id: string): StackEntry[] | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(storageKeyFor(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { timestamp: number; entries: StackEntry[] };
    if (!parsed.timestamp || !parsed.entries || !Array.isArray(parsed.entries)) return null;
    const expired = Date.now() - parsed.timestamp > STORAGE_TTL_MS;
    if (expired) {
      sessionStorage.removeItem(storageKeyFor(id));
      return null;
    }
    return parsed.entries.map((p) => ({ uid: generateStableUid(p.key, p.params), key: p.key, params: p.params, metadata: p.metadata }));
  } catch (e) {
    return null;
  }
}

function writePersistedStack(id: string, stack: StackEntry[]) {
  try {
    if (typeof window === "undefined") return;
    const simplified = {
      timestamp: Date.now(),
      entries: stack.map((s) => ({ key: s.key, params: s.params, metadata: s.metadata })),
    };
    sessionStorage.setItem(storageKeyFor(id), JSON.stringify(simplified));
  } catch (e) {}
}

/**
 * Encode a route key to a short code based on navLink ordering.
 * If not found in navLink, return a safe fallback 'k:<encodedKey>' so we don't lose it.
 */
function encodeStackPath(navLink: NavigationMap, key: string): string {
  const keys = Object.keys(navLink);
  const index = keys.indexOf(key);

  if (index === -1) {
    // Fallback to using the raw key in a safe form
    try {
      return 'k:' + encodeURIComponent(key);
    } catch {
      return 'k:' + key;
    }
  }
  if (index < 26) return String.fromCharCode(97 + index) + '1';
  if (index < 52) return 'a' + String.fromCharCode(65 + index - 26);

  const firstChar = String.fromCharCode(97 + Math.floor((index - 52) / 26));
  const secondChar = String.fromCharCode(97 + ((index - 52) % 26));
  return `${firstChar}${secondChar}1`;
}

/**
 * Decode a code into the original key using navLink ordering.
 * Also supports 'k:' fallback format.
 */
function decodeStackPath(navLink: NavigationMap, code: string): string | null {
  if (code.startsWith('k:')) {
    try {
      return decodeURIComponent(code.slice(2));
    } catch {
      return code.slice(2);
    }
  }

  const keys = Object.keys(navLink);

  if (code.length === 2 && code[1] === '1' && code[0] >= 'a' && code[0] <= 'z') {
    const index = code.charCodeAt(0) - 97;
    return keys[index] || null;
  }

  if (code.length === 2 && code[0] === 'a' && code[1] >= 'A' && code[1] <= 'Z') {
    const index = 26 + (code.charCodeAt(1) - 65);
    return keys[index] || null;
  }

  if (code.length === 3 && code[2] === '1' &&
      code[0] >= 'a' && code[0] <= 'z' &&
      code[1] >= 'a' && code[1] <= 'z') {
    const first = code.charCodeAt(0) - 97;
    const second = code.charCodeAt(1) - 97;
    const index = 52 + (first * 26) + second;
    return keys[index] || null;
  }

  return null;
}

function encodeParams(params: NavParams): string {
  if (!params) return '';
  try {
    // keep it URL-safe and utf8-friendly via encodeURIComponent
    return 'p:' + btoa(encodeURIComponent(JSON.stringify(params)));
  } catch {
    return '';
  }
}

function decodeParams(encoded: string): NavParams {
  if (!encoded.startsWith('p:')) return undefined;
  try {
    return JSON.parse(decodeURIComponent(atob(encoded.slice(2))));
  } catch {
    return undefined;
  }
}

function buildUrlPath(stacks: Array<{navLink: NavigationMap, stack: StackEntry[]}>): string {
  let path = NAV_STACK_VERSION;

  stacks.forEach(({navLink, stack}, depth) => {
    // Add separator for nested stacks
    if (depth > 0) path += '.' + STACK_SEPARATOR;

    stack.forEach(entry => {
      const code = encodeStackPath(navLink, entry.key);
      if (!code) return;

      path += '.' + code;

      // Include params if they exist
      if (entry.params) {
        const paramsStr = encodeParams(entry.params);
        if (paramsStr) path += '.' + paramsStr;
      }
    });
  });

  return path;
}

function parseUrlPathIntoStacks(path: string) {
  const parts = path.split('.');
  if (parts[0] !== NAV_STACK_VERSION) return [];

  const stacks: ParsedStack[] = [];
  let currentStack: ParsedStack = [];

  for (let i = 1; i < parts.length; i++) {
    const token = parts[i];
    if (!token) continue;

    if (token === STACK_SEPARATOR) {
      if (currentStack.length > 0) {  // Only push non-empty stacks
        stacks.push(currentStack);
      } else {
        // push empty to preserve depth mapping if user intentionally left an empty stack
        stacks.push([]);
      }
      currentStack = [];
      continue;
    }

    if (token.startsWith('p:')) {
      // Handle params - attach to previous code if present
      if (currentStack.length > 0) {
        currentStack[currentStack.length - 1].params = decodeParams(token);
      }
      continue;
    }

    // Normal code token
    currentStack.push({ code: token });
  }

  // Push the last stack (could be empty)
  stacks.push(currentStack);

  return stacks;
}


function parseCombinedNavParam(navParam: string | null | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  if (!navParam) return map;
  try {
    navParam.split('|').forEach(segment => {
      if (!segment) return;
      const idx = segment.indexOf(':');
      if (idx === -1) return;
      const id = segment.slice(0, idx);
      const path = segment.slice(idx + 1);
      if (id) map[id] = path;
    });
  } catch (e) {
    // ignore parsing errors, return empty map
  }
  return map;
}


function buildCombinedNavParam(map: Record<string, string>): string {
  return Object.keys(map)
    .filter(k => map[k] && map[k].length > 0)
    .map(k => `${k}:${map[k]}`)
    .join('|');
}

function updateNavQueryParamForStack(stackId: string, path: string | null) {
  if (typeof window === "undefined") return;

  try {
    const url = new URL(window.location.href);
    const current = url.searchParams.get('nav');
    const map = parseCombinedNavParam(current || undefined);

    if (path && path.length > 0) {
      map[stackId] = path;
    } else {
      delete map[stackId];
    }

    const newParam = buildCombinedNavParam(map);
    if (newParam) {
      url.searchParams.set('nav', newParam);
    } else {
      url.searchParams.delete('nav');
    }

    const newHref = url.toString();
    if (window.location.href !== newHref) {
      window.history.replaceState({ navStack: newParam }, "", newHref);
    }
  } catch (e) {
    // ignore
  }
}

function setNavQueryParamIfDifferent(fullPath: string) {
  if (typeof window === "undefined") return;

  try {
    const newUrl = new URL(window.location.href);
    if (fullPath) {
      newUrl.searchParams.set('nav', fullPath);
    } else {
      newUrl.searchParams.delete('nav');
    }

    const newHref = newUrl.toString();
    if (window.location.href !== newHref) {
      window.history.replaceState({ navStack: fullPath }, "", newHref);
    }
  } catch (e) {
    // ignore
  }
}

function createApiFor(id: string, navLink: NavigationMap, syncHistory: boolean, parentApi: NavStackAPI | null): NavStackAPI {
  const transitionManager = new TransitionManager();
  const memoryManager = new PageMemoryManager();

  let safeRegEntry = globalRegistry.get(id);
  if (!safeRegEntry) {
    safeRegEntry = {
      stack: [],
      listeners: new Set(),
      guards: new Set(),
      middlewares: new Set(),
      maxStackSize: DEFAULT_MAX_STACK_SIZE,
      historySyncEnabled: false,
      snapshotBuffer: [],
      parentId: parentApi?.id || null,
      childIds: new Set(),
      navLink,
    };
    globalRegistry.set(id, safeRegEntry);

    if (parentApi) {
      const parentReg = globalRegistry.get(parentApi.id);
      if (parentReg) {
        parentReg.childIds.add(id);
      }
    }
  } else {
    // update navLink & parent if api recreated (HMR)
    safeRegEntry.navLink = navLink;
    safeRegEntry.parentId = parentApi?.id || null;
  }
  const regEntry = safeRegEntry;

  function emit() {
    const stackCopy = regEntry!.stack.slice();

    // Build the path for this stack alone and update only this stack's segment in the combined param
    try {
      // Build local path for this stack (versioned)
      const localPath = buildUrlPath([{ navLink, stack: stackCopy }]);
      if (syncHistory || regEntry.historySyncEnabled) {
        updateNavQueryParamForStack(id, localPath);
      }
    } catch (e) {
      // fallback - try to set a simple encoding (non-versioned)
      try {
        if (syncHistory || regEntry.historySyncEnabled) {
          const fallback = buildUrlPath([{ navLink, stack: stackCopy }]);
          updateNavQueryParamForStack(id, fallback);
        }
      } catch {}
    }

    regEntry.listeners.forEach((l) => {
      try { l(stackCopy); } catch (e) { console.warn(e); }
    });
  }

  function runMiddlewares(action: Parameters<MiddlewareFn>[0]) {
    regEntry.middlewares.forEach((m) => {
      try { m(action); } catch (e) { console.warn("Nav middleware threw:", e); }
    });
  }

  async function runGuards(action: Parameters<GuardFn>[0]): Promise<boolean> {
    for (const g of Array.from(regEntry.guards)) {
      try {
        const res = await Promise.resolve(g(action));
        if (!res) return false;
      } catch (e) {
        console.warn("Nav guard threw:", e);
        return false;
      }
    }
    return true;
  }

  let actionLock = false;
  async function withLock<T>(fn: () => Promise<T>): Promise<T | false> {
    if (actionLock) return false as unknown as T;
    actionLock = true;
    try {
      const out = await fn();
      actionLock = false;
      return out;
    } catch (err) {
      actionLock = false;
      throw err;
    }
  }

  const api: NavStackAPI = {
    id,
    async push(rawKey, params, metadata) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const action = {
          type: "push" as const,
          from: regEntry.stack[regEntry.stack.length - 1],
          to: { uid: generateStableUid(key, p), key, params: p, metadata },
          stackSnapshot: regEntry.stack.slice()
        };
        const ok = await runGuards(action);
        if (!ok) return false;
        if (regEntry.maxStackSize && regEntry.stack.length >= regEntry.maxStackSize) {
          regEntry.stack.splice(0, regEntry.stack.length - regEntry.maxStackSize + 1);
        }
        regEntry.stack.push(action.to);
        runMiddlewares(action);
        emit();
        return true;
      });
    },

    async replace(rawKey, params, metadata) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const top = regEntry.stack[regEntry.stack.length - 1];
        const action = {
          type: "replace" as const,
          from: top,
          to: { uid: generateStableUid(key, p), key, params: p, metadata },
          stackSnapshot: regEntry.stack.slice()
        };
        const ok = await runGuards(action);
        if (!ok) return false;
        if (regEntry.stack.length === 0) {
          regEntry.stack.push(action.to);
        } else {
          regEntry.stack[regEntry.stack.length - 1] = action.to;
        }
        runMiddlewares(action);
        emit();
        return true;
      });
    },

    async pop() {
      return withLock<boolean>(async () => {
        if (regEntry.stack.length === 0) {
            if (regEntry.parentId) return false;
            return false;
        }
        const top = regEntry.stack[regEntry.stack.length - 1];
        const action = {
          type: "pop" as const,
          from: top,
          to: regEntry.stack[regEntry.stack.length - 2],
          stackSnapshot: regEntry.stack.slice()
        };
        const ok = await runGuards(action);
        if (!ok) return false;
        regEntry.stack.pop();
        runMiddlewares(action);
        emit();
        return true;
      });
    },

    async popUntil(predicate) {
      return withLock<boolean>(async () => {
        if (regEntry.stack.length === 0) {
            if (regEntry.parentId) return false;
            return false;
        }
        const action = {
          type: "popUntil" as const,
          stackSnapshot: regEntry.stack.slice()
        };
        const ok = await runGuards(action);
        if (!ok) return false;
        let i = regEntry.stack.length - 1;
        while (i >= 0 && !predicate(regEntry.stack[i], i, regEntry.stack)) i--;
        if (i < regEntry.stack.length - 1) {
          regEntry.stack.splice(i + 1);
          runMiddlewares(action);
          emit();
          return true;
        }
        return false;
      });
    },

    async popToRoot() {
      return withLock<boolean>(async () => {
        const action = {
          type: "popToRoot" as const,
          stackSnapshot: regEntry.stack.slice()
        };
        if (regEntry.parentId) return false;
        const ok = await runGuards(action);
        if (!ok) return false;
        if (regEntry.stack.length > 1) {
          regEntry.stack.splice(1);
          runMiddlewares(action);
          emit();
          return true;
        }
        return false;
      });
    },

    async pushAndPopUntil(rawKey, predicate, params, metadata) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const newEntry: StackEntry = { uid: generateStableUid(key, p), key, params: p, metadata };
        const action = {
          type: "push" as const,
          from: regEntry.stack[regEntry.stack.length - 1],
          to: newEntry,
          stackSnapshot: regEntry.stack.slice()
        };

        const ok = await runGuards(action);
        if (!ok) return false;

        let i = regEntry.stack.length - 1;
        while (i >= 0 && !predicate(regEntry.stack[i], i, regEntry.stack)) i--;

        if (i < regEntry.stack.length - 1) {
          regEntry.stack.splice(i + 1);
        }

        regEntry.stack.push(newEntry);
        runMiddlewares(action);
        emit();
        return true;
      });
    },

    async pushAndReplace(rawKey, params, metadata) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const newEntry: StackEntry = { uid: generateStableUid(key, p), key, params: p, metadata };
        const action = {
          type: "replace" as const,
          from: regEntry.stack[regEntry.stack.length - 1],
          to: newEntry,
          stackSnapshot: regEntry.stack.slice()
        };

        const ok = await runGuards(action);
        if (!ok) return false;

        if (regEntry.stack.length > 0) regEntry.stack.pop();
        regEntry.stack.push(newEntry);

        runMiddlewares(action);
        emit();
        return true;
      });
    },

    go(rawKey, params, metadata) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const newEntry: StackEntry = { uid: generateStableUid(key, p), key, params: p, metadata };

        const action = {
          type: "replace" as const,
          from: regEntry.stack[regEntry.stack.length - 1],
          to: newEntry,
          stackSnapshot: regEntry.stack.slice(),
        };

        const ok = await runGuards(action);
        if (!ok) return false;

        const len = regEntry.stack.length;
        regEntry.stack.push(newEntry);
        regEntry.stack.splice(0, len);

        runMiddlewares(action);
        emit();
        return true;
      });
    },

    peek() {
      return regEntry.stack[regEntry.stack.length - 1];
    },

    getStack() {
      return regEntry.stack.slice();
    },

    length() {
      return regEntry.stack.length;
    },

    subscribe(fn) {
      regEntry.listeners.add(fn);
      try { fn(regEntry.stack.slice()); } catch(e) {}
      return () => regEntry.listeners.delete(fn);
    },

    registerGuard(fn) {
      regEntry.guards.add(fn);
      return () => regEntry.guards.delete(fn);
    },

    registerMiddleware(fn) {
      regEntry.middlewares.add(fn);
      return () => regEntry.middlewares.delete(fn);
    },

    syncWithBrowserHistory(enabled) {
      regEntry.historySyncEnabled = enabled;
      if (enabled) {
        try {
          // set this stack's segment into the combined nav param
          const localPath = buildUrlPath([{ navLink, stack: regEntry.stack }]);
          updateNavQueryParamForStack(id, localPath);
        } catch {
          // fallback
          updateNavQueryParamForStack(id, buildUrlPath([{ navLink, stack: regEntry.stack }]));
        }
      }
    },

    isTop(uid) {
      if (uid) {
        const top = this.peek();
        return top?.uid === uid;
      }

      try {
        const currentUid = useContext(CurrentPageContext);
        if (currentUid) {
          const top = this.peek();
          return top?.uid === currentUid;
        }
      } catch (e) {
        console.warn("nav.isTop() called outside of page context.");
      }

      return false;
    },

    getFullPath() {
      const allStacks: Array<{navLink: NavigationMap, stack: StackEntry[]}> = [];
      let currentId: string | null = id;
      let currentNavLink = navLink;

      // Walk up the parent chain and collect stacks that have historySyncEnabled.
      // We unshift so the root-most stack appears first in the path.
      while (currentId) {
        const reg = globalRegistry.get(currentId);
        if (!reg) break;

        if (reg.historySyncEnabled) {
          // Use the navLink associated with that registry entry; if missing, fall back to currentNavLink
          allStacks.unshift({ navLink: reg.navLink || currentNavLink, stack: reg.stack });
        }

        currentId = reg.parentId;
      }

      // If nothing enabled (edge-case), at least include this stack
      if (allStacks.length === 0) {
        allStacks.push({ navLink: navLink, stack: regEntry.stack });
      }

      return buildUrlPath(allStacks);
    },

    getNavLink() {
      return navLink;
    },

    isActiveStack() {
      // The stack is active if it's the deepest one with history sync enabled
      if (!regEntry.historySyncEnabled) return false;

      // Safely iterate through childIds (convert to array if needed)
      const childIds = Array.from(regEntry.childIds || []);
      for (const childId of childIds) {
        const childReg = globalRegistry.get(childId);
        if (childReg?.historySyncEnabled) return false;
      }

      return true;
    },

    dispose() {
      transitionManager.dispose();
      memoryManager.dispose();

      // Clean up parent reference
      if (regEntry.parentId) {
        const parentReg = globalRegistry.get(regEntry.parentId);
        if (parentReg) {
          parentReg.childIds.delete(id);
        }
      }

      // Clean up child references
      regEntry.childIds?.forEach(childId => {
        const childReg = globalRegistry.get(childId);
        if (childReg) {
          childReg.parentId = null;
        }
      });

      // Remove this stack's segment from URL if present
      try {
        updateNavQueryParamForStack(id, null);
      } catch {}

      globalRegistry.delete(id);
    }
  };

  // attach api into registry for other code to inspect navLink etc.
  regEntry.api = api;

  return api;
}

function LazyRouteLoader({ lazyComponent }: { lazyComponent: () => LazyComponent }) {
  const LazyComponent = lazy(lazyComponent);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}

function MissingRoute({
  entry,
  isTop,
  api,
  config = {}
}: {
  entry: StackEntry;
  isTop: boolean;
  api: NavStackAPI;
  config?: MissingRouteConfig;
}) {
  const defaultLabels = {
    missingRoute: 'Missing route',
    goBack: 'Go Back',
    goToRoot: 'Go to Root'
  };

  const {
    className = '',
    containerClassName = '',
    textClassName = '',
    buttonClassName = '',
    labels = {}
  } = config;

  const mergedLabels = { ...defaultLabels, ...labels };

  const handleNavigation = () => {
    if (api.length() > 1) {
      api.pop();
    } else {
      api.popToRoot();
    }
  };

  return (
    <div
      className={`navstack-page ${className} ${containerClassName}`}
      inert={!isTop}
      data-nav-uid={entry.uid}
    >
      <div className={`navstack-missing-route ${textClassName}`} style={{ padding: 16 }}>
        <strong>{mergedLabels.missingRoute}:</strong> {entry.key}
        <button
          className={`navstack-missing-route-button ${buttonClassName}`}
          onClick={handleNavigation}
        >
          {api.length() > 1 ? mergedLabels.goBack : mergedLabels.goToRoot}
        </button>
      </div>
    </div>
  );
}

function SlideTransitionRenderer({
  children,
  state,
  isTop,
  uid,
  baseClass,
}: {
  children: React.ReactNode;
  state: TransitionState;
  isTop: boolean;
  uid: string;
  baseClass: string;
}) {
  const [stage, setStage] = useState<"init" | "active" | "done">(state === "enter" ? "init" : "done");

  useEffect(() => {
    if (state === "enter") {
      setStage("init");
      const frame = requestAnimationFrame(() => {
        setStage("active");
        // Remove active class after transition duration
        setTimeout(() => setStage("done"), DEFAULT_TRANSITION_DURATION);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [state]);

  const slideCls =
    state === "enter"
      ? stage === "init"
        ? "nav-slide-enter"
        : stage === "active"
        ? "nav-slide-enter-active"
        : ""
      : state === "exit"
      ? "nav-slide-exit nav-slide-exit-active"
      : "";

  return (
    <div key={uid} className={`${baseClass} ${slideCls}`} inert={!isTop} data-nav-uid={uid}>
      {children}
    </div>
  );
}

function FadeTransitionRenderer({
  children,
  state,
  isTop,
  uid,
  baseClass
}: {
  children: React.ReactNode;
  state: TransitionState;
  isTop: boolean;
  uid: string;
  baseClass: string;
}) {
  const [stage, setStage] = useState<"active" | "done">(state === "enter" ? "active" : "done");

  useEffect(() => {
    if (state === "enter") {
      setStage("active");
      // Remove active class after transition duration
      setTimeout(() => setStage("done"), DEFAULT_TRANSITION_DURATION);
    }
  }, [state]);

  const fadeCls =
    state === "enter"
      ? stage === "active"
        ? "nav-fade-enter nav-fade-enter-active"
        : ""
      : state === "exit"
      ? "nav-fade-exit nav-fade-exit-active"
      : "";

  return (
    <div key={uid} className={`${baseClass} ${fadeCls}`} inert={!isTop} data-nav-uid={uid}>
      {children}
    </div>
  );
}

export function useNav() {
  const context = useContext(NavContext);
  if (!context) throw new Error("useNav must be used within a NavigationStack");
  return context;
}

export default function NavigationStack(props: {
  id: string;
  navLink: NavigationMap;
  entry: string;
  onExitStack?: () => void;
  transition?: BuiltinTransition;
  transitionDuration?: number;
  renderTransition?: TransitionRenderer;
  className?: string;
  style?: React.CSSProperties;
  maxStackSize?: number;
  autoDispose?: boolean;
  syncHistory?: boolean;
  lazyComponents?: Record<string, () => LazyComponent>;
  missingRouteConfig?: MissingRouteConfig;
  persist?: boolean;
}) {
  const {
    id,
    navLink,
    entry,
    onExitStack,
    transition = "fade",
    transitionDuration = DEFAULT_TRANSITION_DURATION,
    renderTransition,
    className,
    style,
    maxStackSize,
    autoDispose = true,
    syncHistory = false,
    lazyComponents,
    missingRouteConfig,
    persist = false
  } = props;

  // Auto-detect parent navigation context
  const parentApi = findParentNavContext();

  const [isInitialized, setInitialized] = useState(false);
  const [stackSnapshot, setStackSnapshot] = useState<StackEntry[]>([]);

  const api = useMemo(() => {
    const newApi = createApiFor(id, navLink, syncHistory || false, parentApi);

    // Auto-register as child if we have a parent
    if (parentApi) {
      const parentReg = globalRegistry.get(parentApi.id);
      if (parentReg) {
        parentReg.childIds.add(id);
      }
    }

    return newApi;
  }, [id, navLink, syncHistory, parentApi]);

  // In NavigationStack component
  useIsomorphicLayoutEffect(() => {
    let regEntry = globalRegistry.get(id);
    if (!regEntry) {
      regEntry = {
        stack: [],
        listeners: new Set(),
        guards: new Set(),
        middlewares: new Set(),
        maxStackSize: DEFAULT_MAX_STACK_SIZE,
        historySyncEnabled: false,
        snapshotBuffer: [],
        parentId: parentApi?.id || null,
        childIds: new Set(),
        navLink,
      };
      globalRegistry.set(id, regEntry);
    } else {
      // ensure navLink is available
      regEntry.navLink = navLink;
      regEntry.parentId = parentApi?.id || null;
    }

    // Parse from URL (tokenize only, resolution of tokens -> keys happens per-stack)
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const navPathCombined = searchParams.get('nav');

      if (navPathCombined) {
        // parse map and pick our own segment
        const map = parseCombinedNavParam(navPathCombined);
        const ourPath = map[id];
        if (ourPath) {
          const tokenizedStacks = parseUrlPathIntoStacks(ourPath);

          // For backward compatibility we used to rely on depth; now each stack has its own segment
          // We'll take the first (and only) parsed stacks array for this stack
          const ourTokens = tokenizedStacks[0] || [];

          if (ourTokens.length > 0) {
            // Resolve codes into keys using our navLink (we only know our navLink here)
            regEntry.stack = ourTokens.map(t => {
              const resolvedKey = decodeStackPath(navLink, t.code) || (t.code.startsWith('k:') ? (() => {
                try { return decodeURIComponent(t.code.slice(2)); } catch { return t.code.slice(2); }
              })() : t.code);
              return {
                uid: generateStableUid(resolvedKey, t.params),
                key: resolvedKey,
                params: t.params
              } as StackEntry;
            });
            setStackSnapshot([...regEntry.stack]);
            if (syncHistory) api.syncWithBrowserHistory(true);
            setInitialized(true);
            return;
          }
        }
      }
    }

    // Fall back to persisted storage
    if (persist) {
      const persisted = readPersistedStack(id);
      if (persisted && persisted.length > 0) {
        regEntry.stack = persisted;
        setStackSnapshot([...persisted]);
        if (syncHistory) api.syncWithBrowserHistory(true);
        setInitialized(true);
        return;
      }
    }

    // Fall back to initial entry
    const { key, params } = parseRawKey(entry);
    if (!navLink[key]) {
      console.error(`Entry route "${key}" not found in navLink`);
      return;
    }
    regEntry.stack = [{
      uid: generateStableUid(key, params),
      key,
      params
    }];
    setStackSnapshot([...regEntry.stack]);
    if (persist) writePersistedStack(id, regEntry.stack);
    if (syncHistory) api.syncWithBrowserHistory(true);
    setInitialized(true);
  }, [id, entry, navLink]);

  useEffect(() => {
    const unsub = api.subscribe((stack) => {
      setStackSnapshot(stack);
      try {
        console.log('Stack changed:', {
          stack: stack.map(s => s.key),
          // log the combined param for debugging
          currentUrl: typeof window !== 'undefined' ? window.location.href : 'server'
        });
      } catch {}
      if (persist) writePersistedStack(id, stack);
    });
    return unsub;
  }, [api, persist, id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = (event: PopStateEvent) => {
      // Get the current registry entry
      const currentRegEntry = globalRegistry.get(id);
      if (!currentRegEntry) return;

      // Only handle if this is the active stack
      if (!api.isActiveStack()) return;

      const searchParams = new URLSearchParams(window.location.search);
      const navPathCombined = searchParams.get('nav');
      if (!navPathCombined) return;

      // parse combined and read our segment
      const map = parseCombinedNavParam(navPathCombined);
      const ourPath = map[id];
      if (!ourPath) return;

      const tokenized = parseUrlPathIntoStacks(ourPath);
      const ourSlice = tokenized[0] || [];

      const newStack = ourSlice.map(t => {
        const resolvedKey = decodeStackPath(navLink, t.code) || (t.code.startsWith('k:') ? (() => {
          try { return decodeURIComponent(t.code.slice(2)); } catch { return t.code.slice(2); }
        })() : t.code);
        return {
          uid: generateStableUid(resolvedKey, t.params),
          key: resolvedKey,
          params: t.params,
        };
      });

      if (!isEqual(currentRegEntry.stack, newStack)) {
        currentRegEntry.stack = newStack;
        setStackSnapshot([...newStack]);
        if (persist) writePersistedStack(id, newStack);
      }
    };

    if (syncHistory) {
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      if (syncHistory) {
        window.removeEventListener('popstate', handlePopState);
      }
      if (autoDispose) api.dispose();
    };
  }, [id, navLink, syncHistory, autoDispose, api, persist]);

  const lastLen = useRef(stackSnapshot.length);


  // Replace the current stack length effect with this:
  useEffect(() => {
    const handleStackEmpty = () => {
      // 1. Try onExit first
      if (onExitStack) {
        try {
          onExitStack();
          return;
        } catch (e) {
          console.warn('onExit error:', e);
        }
      }

      // 2. Bubble to parent
      if (parentApi) {
        parentApi.pop().catch(() => {
          // If parent pop fails, try history back
          if (typeof window !== "undefined" && window.history.length > 0) {
            window.history.back();
          }
        });
        return;
      }

      // 3. Final fallback
      if (typeof window !== "undefined" && window.history.length > 0) {
        window.history.back();
      }
    };

    const unsub = api.subscribe((stack) => {
      setStackSnapshot(stack);
      if (lastLen.current > 0 && stack.length === 0) {
        handleStackEmpty();
      }
      lastLen.current = stack.length;
    });

    return unsub;
  }, [api, onExitStack, parentApi]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("navstack-builtins")) return;

    const styleEl = document.createElement("style");
    styleEl.id = "navstack-builtins";
    styleEl.innerHTML = `
      .navstack-root {  display: block; width: 100%; height: auto; overflow: hidden;}
      .navstack-page {  display: block; width: 100%; height: auto; overflow: visible; }
      .navstack-page[inert] {  pointer-events: none; display: none !important;}
      .nav-fade-enter { opacity: 0; transform: translateY(6px); }
      .nav-fade-enter-active { opacity: 1; transform: translateY(0); transition: opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease; }
      .nav-fade-exit { opacity: 1; transform: translateY(0); }
      .nav-fade-exit-active { opacity: 0; transform: translateY(6px); transition: opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease; }
      .nav-slide-enter { opacity: 0; transform: translateX(8%); }
      .nav-slide-enter-active { opacity: 1; transform: translateX(0); transition: transform ${transitionDuration}ms ease, opacity ${transitionDuration}ms ease; }
      .nav-slide-exit { opacity: 1; transform: translateX(0); }
      .nav-slide-exit-active { opacity: 0; transform: translateX(8%); transition: transform ${transitionDuration}ms ease, opacity ${transitionDuration}ms ease; }
      .navstack-missing-route { padding: 1rem; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 0.25rem; display: flex; flex-direction: column}
      .navstack-missing-route-button { margin-top: 0.5rem; padding: 0.375rem 0.75rem; background-color: #0d6efd; color: white; border: none; border-radius: 0.25rem; cursor: pointer; }
      .navstack-missing-route-button:hover { background-color: #0b5ed7; }
    `;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, [transitionDuration]);

  const [renders, setRenders] = useState<RenderRecord[]>(
    () => stackSnapshot.map((e) => ({ entry: e, state: "idle", createdAt: Date.now() }))
  );

  const transitionManager = useRef<TransitionManager>(new TransitionManager()).current;
  const memoryManager = useRef<PageMemoryManager>(new PageMemoryManager()).current;

  useEffect(() => {
    const handleTransitionEnd = (uid: string) => {
      setRenders(prev => prev.filter(r => r.entry.uid !== uid));
      memoryManager.delete(uid);
    };

    const old = renders.map((r) => r.entry.uid);
    const cur = stackSnapshot.map((s) => s.uid);

    const added = stackSnapshot.filter((s) => !old.includes(s.uid));
    const removed = renders.filter((r) => !cur.includes(r.entry.uid)).map((r) => r.entry.uid);

    if (added.length === 0 && removed.length === 0) {
      if (stackSnapshot.length > 0 && renders.length > 0) {
        const topSnap = stackSnapshot[stackSnapshot.length - 1];
        const topRender = renders[renders.length - 1];
        if (topRender && topSnap.uid !== topRender.entry.uid) {
          const newRenders = renders.slice(0, -1)
            .concat([{ entry: topRender.entry, state: "exit", createdAt: Date.now() }, { entry: topSnap, state: "enter", createdAt: Date.now() }]);
          setRenders(newRenders);
          transitionManager.start(topRender.entry.uid, transitionDuration, () => {});
          transitionManager.start(topSnap.uid, transitionDuration, () => {});
        }
      }
      return;
    }

    if (added.length > 0) {
      const newRecords = added.map((a) => ({ entry: a, state: "enter" as const, createdAt: Date.now() }));
      setRenders((prev) => prev.concat(newRecords));
      added.forEach(a => transitionManager.start(a.uid, transitionDuration, () => {}));
    }

    if (removed.length > 0) {
      setRenders((prev) => prev.map((r) => removed.includes(r.entry.uid) ? { ...r, state: "exit", createdAt: Date.now() } : r));
      removed.forEach(uid => transitionManager.start(uid, transitionDuration, () => handleTransitionEnd(uid)));
    }
  }, [stackSnapshot, transitionDuration, transitionManager, memoryManager]);

  function renderEntry(rec: RenderRecord, idx: number) {
    const topEntry = stackSnapshot[stackSnapshot.length - 1];
    const isTop = topEntry ? rec.entry.uid === topEntry.uid : false;
    const pageOrComp = navLink[rec.entry.key];

    const cached = memoryManager.get(rec.entry.uid);
    let child: ReactNode = cached;

    if (!cached) {
      if (!pageOrComp) {
        child = (
          <MissingRoute
            entry={rec.entry}
            isTop={isTop}
            api={api}
            config={missingRouteConfig}
          />
        );
      } else if (typeof pageOrComp === 'function') {
        if (rec.entry.metadata?.lazy) {
          child = <LazyRouteLoader lazyComponent={rec.entry.metadata.lazy} />;
        } else if (lazyComponents?.[rec.entry.key]) {
          child = <LazyRouteLoader lazyComponent={lazyComponents[rec.entry.key]} />;
        } else {
          const Component = pageOrComp as ComponentType<any>;
          child = <Component {...(rec.entry.params ?? {})} />;
        }
      }

      if (child) {
        memoryManager.set(rec.entry.uid, child);
      }
    }

    const builtInRenderer: TransitionRenderer = ({ children, state: s, isTop: t, index }) => {
      const baseClass = "navstack-page";
      const uid = rec.entry.uid;

      if (transition === "slide" && index > 0) {
        return (
          <SlideTransitionRenderer state={s} isTop={t} uid={uid} baseClass={baseClass}>
            {children}
          </SlideTransitionRenderer>
        );
      }

      if (transition === "fade" && index > 0) {
        return (
          <FadeTransitionRenderer state={s} isTop={t} uid={uid} baseClass={baseClass}>
            {children}
          </FadeTransitionRenderer>
        );
      }

      return (
        <div
          key={uid}
          className={`${baseClass}`}
          inert={!t}
          data-nav-uid={uid}
        >
          {children}
        </div>
      );
    };

    const renderer = renderTransition ?? builtInRenderer;
    return (
      <CurrentPageContext.Provider value={rec.entry.uid}>
        {renderer({
          children: (
            <CurrentPageContext.Provider value={rec.entry.uid}>
              {child}
            </CurrentPageContext.Provider>
          ),
          state: rec.state,
          index: idx,
          isTop
        })}
      </CurrentPageContext.Provider>
    );
  }

  if (!isInitialized) {
    return null;
  }

  return (
    <NavContext.Provider value={api}>
      <div className={`navstack-root ${className ?? ""}`} style={{ position: "relative", width: "auto", height: "auto", ...style }}>
        {renders.map((r, idx) => (
          <React.Fragment key={r.entry.uid}>
            {renderEntry(r, idx)}
          </React.Fragment>
        ))}
      </div>
    </NavContext.Provider>
  );
}

if (typeof module !== 'undefined' && (module as any).hot) {
  (module as any).hot.dispose(() => {
    globalRegistry.forEach((_, id) => {
      const api = createApiFor(id, {}, false, null);
      api.dispose();
    });
  });
}
