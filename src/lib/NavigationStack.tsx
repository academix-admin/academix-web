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
  clearAllPersistedStacks: () => void;
  syncWithBrowserHistory: (enabled: boolean) => void;
  isTop: (uid?: string) => boolean;
  getFullPath: () => string;
  getNavLink: () => NavigationMap;
  isActiveStack: () => boolean;
  isInGroup: () => boolean;
  getGroupId: () => string | null;
  goToGroupId: (groupId: string) => Promise<boolean>;
  addOnCreate: (handler: LifecycleHandler) => () => void;
  addOnDispose: (handler: LifecycleHandler) => () => void;
  addOnPause: (handler: LifecycleHandler) => () => void;
  addOnResume: (handler: LifecycleHandler) => () => void;
  addOnEnter: (handler: LifecycleHandler) => () => void;
  addOnExit: (handler: LifecycleHandler) => () => void;
  addOnBeforePush: (handler: AsyncLifecycleHandler) => () => void;
  addOnAfterPush: (handler: LifecycleHandler) => () => void;
  addOnBeforePop: (handler: AsyncLifecycleHandler) => () => void;
  addOnAfterPop: (handler: LifecycleHandler) => () => void;
  addOnBeforeReplace: (handler: AsyncLifecycleHandler) => () => void;
  addOnAfterReplace: (handler: LifecycleHandler) => () => void;
  clearAllLifecycleHandlers: (hook?: LifecycleHook) => void;
  getLifecycleHandlers: (hook: LifecycleHook) => LifecycleHandler[];
  _getLifecycleManager: () => EnhancedLifecycleManager;
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

type LifecycleHook =
  | 'onCreate'
  | 'onDispose'
  | 'onPause'
  | 'onResume'
  | 'onEnter'
  | 'onExit'
  | 'onBeforePush'
  | 'onAfterPush'
  | 'onBeforePop'
  | 'onAfterPop'
  | 'onBeforeReplace'
  | 'onAfterReplace';

type LifecycleHandler = (context: {
  stack: StackEntry[];
  current?: StackEntry;
  previous?: StackEntry;
  action?: {
    type: 'push' | 'pop' | 'replace' | 'popUntil' | 'popToRoot';
    target?: StackEntry;
  };
}) => void | Promise<void>;

type AsyncLifecycleHandler = (context: {
  stack: StackEntry[];
  current?: StackEntry;
  previous?: StackEntry;
  action?: {
    type: 'push' | 'pop' | 'replace' | 'popUntil' | 'popToRoot';
    target?: StackEntry;
  };
}) => Promise<void> | void;

// ==================== Constants ====================
const DEFAULT_TRANSITION_DURATION = 220;
const DEFAULT_MAX_STACK_SIZE = 50;
const STORAGE_TTL_MS = 1000 * 60 * 30;
const MEMORY_CACHE_SIZE = 5;
const MEMORY_CACHE_EXPIRY = 1000 * 60 * 5;
const NAV_STACK_VERSION = '1';
const STACK_SEPARATOR = 'x';

// ==================== Global Systems ====================
// Only create these on the client side
let globalRegistry: Map<string, any>;
let isServer = typeof window === 'undefined';

if (!isServer) {
  globalRegistry = new Map<string, {
    stack: StackEntry[];
    listeners: Set<StackChangeListener>;
    guards: Set<GuardFn>;
    middlewares: Set<MiddlewareFn>;
    maxStackSize: number;
    historySyncEnabled: boolean;
    snapshotBuffer: StackEntry[];
    parentId: string | null;
    childIds: Set<string>;
    navLink?: NavigationMap;
    api?: NavStackAPI;
    currentPath?: string;
    isInGroup?: boolean;
    groupId?: string;
    lifecycleHandlers: Map<LifecycleHook, Set<LifecycleHandler | AsyncLifecycleHandler>>;
    currentState: 'active' | 'paused' | 'background';
    lastActiveEntry?: StackEntry;
  }>();
} else {
  // Server-side stub
  globalRegistry = new Map();
}

// ==================== Group Context ====================
type GroupNavigationContextType = {
  getGroupId: () => string | null;
  getCurrent: () => string;
  goToGroupId: (groupId: string) => Promise<boolean>;
  isActiveStack: (stackId: string) => boolean;
};

const GroupNavigationContext = createContext<GroupNavigationContextType | null>(null);
const GroupStackIdContext = createContext<string | null>(null);

function useGroupNavigation() {
  const context = useContext(GroupNavigationContext);
  return context;
}

function useGroupStackId() {
  const context = useContext(GroupStackIdContext);
  return context;
}

// ==================== Transition Manager ====================
class TransitionManager {
  private activeTransitions = new Map<string, any>();
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

// ==================== Page Memory Manager ====================
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

// ==================== Enhanced Lifecycle Manager ====================
class EnhancedLifecycleManager {
  private handlers: Map<LifecycleHook, Set<LifecycleHandler | AsyncLifecycleHandler>>;
  private stackId: string;
  private cleanupCallbacks: (() => void)[] = [];

  constructor(stackId: string) {
    this.stackId = stackId;
    this.handlers = new Map();

    // Initialize all lifecycle hooks
    const hooks: LifecycleHook[] = [
      'onCreate', 'onDispose', 'onPause', 'onResume',
      'onEnter', 'onExit', 'onBeforePush', 'onAfterPush',
      'onBeforePop', 'onAfterPop', 'onBeforeReplace', 'onAfterReplace'
    ];

    hooks.forEach(hook => {
      this.handlers.set(hook, new Set());
    });
  }

  // Add app state tracking
  enableAppStateTracking(getCurrentContext: () => { stack: StackEntry[]; current?: StackEntry }) {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      const context = getCurrentContext();
      if (document.hidden) {
        this.trigger('onPause', context);
      } else {
        this.trigger('onResume', context);
      }
    };

    const handlePageHide = () => {
      const context = getCurrentContext();
      this.trigger('onPause', context);
    };

    const handlePageShow = () => {
      const context = getCurrentContext();
      this.trigger('onResume', context);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    const cleanup = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };

    this.cleanupCallbacks.push(cleanup);
    return cleanup;
  }

  addHandler(hook: LifecycleHook, handler: LifecycleHandler | AsyncLifecycleHandler): () => void {
    const hookHandlers = this.handlers.get(hook);
    if (hookHandlers) {
      hookHandlers.add(handler);
      return () => hookHandlers.delete(handler);
    }
    return () => {};
  }

  async trigger(hook: LifecycleHook, context: any): Promise<void> {
    const hookHandlers = this.handlers.get(hook);
    if (!hookHandlers) return;

    const handlers = Array.from(hookHandlers);

    // For async handlers (onBefore* hooks), wait for all to complete
    if (hook.startsWith('onBefore')) {
      for (const handler of handlers) {
        await (handler as AsyncLifecycleHandler)(context);
      }
    } else {
      // For sync handlers, run in parallel but don't wait
      handlers.forEach(handler => {
        try {
          (handler as LifecycleHandler)(context);
        } catch (error) {
          console.warn(`Lifecycle handler for ${hook} threw:`, error);
        }
      });
    }
  }

  getHandlers(hook: LifecycleHook): LifecycleHandler[] {
    const hookHandlers = this.handlers.get(hook);
    return hookHandlers ? Array.from(hookHandlers) as LifecycleHandler[] : [];
  }

  clear(hook?: LifecycleHook) {
    if (hook) {
      this.handlers.get(hook)?.clear();
    } else {
      this.handlers.forEach(handlers => handlers.clear());
    }
  }

  dispose() {
    this.cleanupCallbacks.forEach(cleanup => cleanup());
    this.cleanupCallbacks = [];
    this.clear();
    this.handlers.clear();
  }
}

// ==================== Enhanced Scroll Memory Manager ====================
class ScrollMemoryManager {
  private scrollPositions = new Map<string, number>();
  private currentUid: string | null = null;
  private lastSavedUid: string | null = null;

  saveScrollPosition(uid: string, position?: number) {
    if (typeof window === 'undefined') return;

    const scrollY = position !== undefined ? position : window.scrollY;
    this.scrollPositions.set(uid, scrollY);
    this.lastSavedUid = uid;
  }

  restoreScrollPosition(uid: string) {
    if (typeof window === 'undefined') return;

    const savedPosition = this.scrollPositions.get(uid);

    requestAnimationFrame(() => {
      if (savedPosition !== undefined) {
        window.scrollTo(0, savedPosition);
      } else {
        // Only scroll to top if this is a completely new page
        // Don't scroll to top when going back to a page that was never saved
        if (!this.scrollPositions.has(uid)) {
          window.scrollTo(0, 0);
        }
      }
    });
  }

  setCurrentUid(uid: string) {
    // Save current scroll position before switching (if we have a current UID)
    if (this.currentUid && this.currentUid !== uid) {
      this.saveScrollPosition(this.currentUid);
    }

    this.currentUid = uid;
    this.restoreScrollPosition(uid);
  }

  hasSavedPosition(uid: string): boolean {
    return this.scrollPositions.has(uid);
  }

  delete(uid: string) {
    this.scrollPositions.delete(uid);
    if (this.lastSavedUid === uid) {
      this.lastSavedUid = null;
    }
  }

  clear() {
    this.scrollPositions.clear();
    this.currentUid = null;
    this.lastSavedUid = null;
  }

  // Debug method
  getStats() {
    return {
      currentUid: this.currentUid,
      lastSavedUid: this.lastSavedUid,
      savedPositions: Object.fromEntries(this.scrollPositions),
      totalPages: this.scrollPositions.size
    };
  }
}

// ==================== Enhanced Scroll Restoration Hook ====================
function useEnhancedScrollRestoration(
  api: NavStackAPI,
  renders: RenderRecord[],
  stackSnapshot: StackEntry[],
  transitionDuration: number
) {
  const scrollManager = useRef(new ScrollMemoryManager()).current;
  const isInitialMount = useRef(true);
  const lastTopUid = useRef<string | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save scroll position on scroll (debounced)
  useEffect(() => {
    const handleScroll = () => {
      const topEntry = stackSnapshot[stackSnapshot.length - 1];
      if (!topEntry) return;

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        scrollManager.saveScrollPosition(topEntry.uid);
      }, 80);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [stackSnapshot, scrollManager]);

  // Track navigation changes
  useEffect(() => {
    const currentTopUid = stackSnapshot.at(-1)?.uid;
    if (!currentTopUid) return;

    const previousUid = lastTopUid.current;
    const isNewPage = !scrollManager.hasSavedPosition(currentTopUid);

    // Save outgoing page scroll
    if (previousUid && previousUid !== currentTopUid) {
      scrollManager.saveScrollPosition(previousUid);
    }

    // Restore (or reset) for new page
    requestAnimationFrame(() => {
      if (isNewPage) {
        // Always start at top for new pages
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      } else {
        // Restore immediately for known pages (no long timeout)
        scrollManager.setCurrentUid(currentTopUid);
      }
    });

    lastTopUid.current = currentTopUid;
    isInitialMount.current = false;
  }, [stackSnapshot, scrollManager]);

  // Clean up orphaned scroll positions
  useEffect(() => {
    const activeUids = new Set(stackSnapshot.map((e) => e.uid));
    const renderUids = new Set(renders.map((r) => r.entry.uid));

    for (const uid of scrollManager["scrollPositions"].keys()) {
      if (!activeUids.has(uid) && !renderUids.has(uid)) {
        scrollManager.delete(uid);
      }
    }
  }, [stackSnapshot, renders, scrollManager]);

  // Save final scroll when unmounting
  useEffect(() => {
    return () => {
      const topEntry = stackSnapshot.at(-1);
      if (topEntry) scrollManager.saveScrollPosition(topEntry.uid);
    };
  }, [stackSnapshot, scrollManager]);
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
    hash = hash & hash;
  }
  return `uid_${Math.abs(hash)}`;
}

function parseRawKey(raw: string, params?: NavParams) {
  if (!raw) return { key: '', params };

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

function encodeStackPath(navLink: NavigationMap, key: string): string {
  const keys = Object.keys(navLink);
  const index = keys.indexOf(key);

  if (index === -1) {
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
    if (depth > 0) path += '.' + STACK_SEPARATOR;

    stack.forEach(entry => {
      const code = encodeStackPath(navLink, entry.key);
      if (!code) return;

      path += '.' + code;

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
      if (currentStack.length > 0) {
        stacks.push(currentStack);
      } else {
        stacks.push([]);
      }
      currentStack = [];
      continue;
    }

    if (token.startsWith('p:')) {
      if (currentStack.length > 0) {
        currentStack[currentStack.length - 1].params = decodeParams(token);
      }
      continue;
    }

    currentStack.push({ code: token });
  }

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
  }
  return map;
}

function buildCombinedNavParam(map: Record<string, string>): string {
  return Object.keys(map)
    .filter(k => map[k] && map[k].length > 0)
    .map(k => `${k}:${map[k]}`)
    .join('|');
}

function updateNavQueryParamForStack(stackId: string, path: string | null, groupContext: GroupNavigationContextType | null, groupStackId: string | null) {
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
      if(groupContext)url.searchParams.set('group', groupStackId || '');
      url.searchParams.set('nav', newParam);
    } else {
      if(groupContext)url.searchParams.delete('group');
      url.searchParams.delete('nav');
    }

    const newHref = url.toString();
    if (window.location.href !== newHref) {
      if(groupContext)window.history.replaceState({ group: groupStackId }, "", newHref);
      window.history.replaceState({ navStack: newParam }, "", newHref);
    }
  } catch (e) {
  }
}
function removeNavQueryParamForStack(stackId: string, groupContext: GroupNavigationContextType | null, groupStackId: string | null) {
  if (typeof window === "undefined") return;

  try {
    const url = new URL(window.location.href);

    if(groupContext)url.searchParams.delete('group');
    url.searchParams.delete('nav');


    const newHref = url.toString();
    if (window.location.href !== newHref) {
      if(groupContext)window.history.replaceState({ group: null }, "", newHref);
      window.history.replaceState({ navStack: null }, "", newHref);
    }
  } catch (e) {
  }
}


function createApiFor(id: string, navLink: NavigationMap, syncHistory: boolean, parentApi: NavStackAPI | null, currentPath: string, groupContext: GroupNavigationContextType | null = null, groupStackId : string | null): NavStackAPI {
  const transitionManager = new TransitionManager();
  const memoryManager = new PageMemoryManager();
  const lifecycleManager = new EnhancedLifecycleManager(id);

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
      lifecycleHandlers: new Map(),
      currentState: 'active',
      lastActiveEntry: undefined,
    };
    globalRegistry.set(id, safeRegEntry);

    if (parentApi) {
      const parentReg = globalRegistry.get(parentApi.id);
      if (parentReg) {
        parentReg.childIds.add(id);
      }
    }
  } else {
    safeRegEntry.navLink = navLink;
    safeRegEntry.parentId = parentApi?.id || null;
  }
  const regEntry = safeRegEntry;


  function emit(previousStack?: StackEntry[], action?: { type: string; target?: StackEntry }) {
      const stackCopy = regEntry!.stack.slice();
      const regEntryCurrentPath = regEntry.currentPath || (typeof window !== 'undefined' ? window.location.pathname : '');

      const previous = previousStack ? previousStack[previousStack.length - 1] : undefined;
      const current = stackCopy[stackCopy.length - 1];

      if (!previousStack) {
        if (current) {
          lifecycleManager.trigger('onEnter', {
            stack: stackCopy,
            current,
            previous: undefined,
            action
          });
        }
      } else {
        const previousTop = previousStack[previousStack.length - 1];
        const currentTop = stackCopy[stackCopy.length - 1];

        const isDifferentPage = !previousTop || !currentTop || previousTop.uid !== currentTop.uid;

        if (isDifferentPage) {
          if (previousTop) {
            lifecycleManager.trigger('onExit', {
              stack: stackCopy,
              current: currentTop,
              previous: previousTop,
              action
            });
          }

          if (currentTop) {
            lifecycleManager.trigger('onEnter', {
              stack: stackCopy,
              current: currentTop,
              previous: previousTop,
              action
            });
          }
        }
      }

    // Update registry state
    regEntry.lastActiveEntry = current;

    if ((syncHistory || regEntry.historySyncEnabled) && regEntryCurrentPath) {
      if (typeof window !== 'undefined' && window.location.pathname !== regEntryCurrentPath) {
        console.warn(`NavigationStack ${id}: Path changed from ${regEntryCurrentPath} to ${window.location.pathname}, disabling URL updates`);
        regEntry.listeners.forEach((l: StackChangeListener) => {
          try { l(stackCopy); } catch (e) { console.warn(e); }
        });
        return;
      }
    }

    if (syncHistory || regEntry.historySyncEnabled) {
      try {
        const localPath = buildUrlPath([{ navLink, stack: stackCopy }]);
        updateNavQueryParamForStack(id, localPath, groupContext, groupStackId);
      } catch (e) {
        try {
          const fallback = buildUrlPath([{ navLink, stack: stackCopy }]);
          updateNavQueryParamForStack(id, fallback, groupContext, groupStackId);
        } catch {}
      }
    }

    regEntry.listeners.forEach((l: StackChangeListener) => {
      try { l(stackCopy); } catch (e) { console.warn(e); }
    });
  }

  function runMiddlewares(action: Parameters<MiddlewareFn>[0]) {
    regEntry.middlewares.forEach((m: MiddlewareFn) => {
      try { m(action); } catch (e) { console.warn("Nav middleware threw:", e); }
    });
  }

  async function runGuards(action: Parameters<GuardFn>[0]): Promise<boolean> {
   const guards = Array.from(regEntry.guards) as GuardFn[];
    for (const g of guards) {
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

        const newEntry: StackEntry = {
          uid: generateStableUid(key, p),
          key,
          params: p,
          metadata
        };

        const previousStack = regEntry.stack.slice();

        // Before push lifecycle
        await lifecycleManager.trigger('onBeforePush', {
          stack: regEntry.stack.slice(),
          current: regEntry.stack[regEntry.stack.length - 1],
          previous: undefined,
          action: { type: 'push', target: newEntry }
        });

        const action = {
          type: "push" as const,
          from: regEntry.stack[regEntry.stack.length - 1],
          to: newEntry,
          stackSnapshot: regEntry.stack.slice()
        };
        const ok = await runGuards(action);
        if (!ok) return false;
        if (regEntry.maxStackSize && regEntry.stack.length >= regEntry.maxStackSize) {
          regEntry.stack.splice(0, regEntry.stack.length - regEntry.maxStackSize + 1);
        }
        regEntry.stack.push(newEntry);
        runMiddlewares(action);
        emit(previousStack, { type: 'push', target: newEntry });

        // After push lifecycle
        lifecycleManager.trigger('onAfterPush', {
          stack: regEntry.stack.slice(),
          current: newEntry,
          previous: action.from,
          action: { type: 'push', target: newEntry }
        });

        return true;
      });
    },

   async replace(rawKey, params, metadata) {
     return withLock<boolean>(async () => {
       const { key, params: p } = parseRawKey(rawKey, params);
       const newEntry: StackEntry = { uid: generateStableUid(key, p), key, params: p, metadata };
       const previousEntry = regEntry.stack[regEntry.stack.length - 1];

       // Before replace lifecycle
       await lifecycleManager.trigger('onBeforeReplace', {
         stack: regEntry.stack.slice(),
         current: previousEntry,
         previous: undefined,
         action: { type: 'replace', target: newEntry }
       });

       const action = {
         type: "replace" as const,
         from: previousEntry,
         to: newEntry,
         stackSnapshot: regEntry.stack.slice()
       };

       const ok = await runGuards(action);
       if (!ok) return false;

       const previousStack = regEntry.stack.slice();
       if (regEntry.stack.length === 0) {
         regEntry.stack.push(newEntry);
       } else {
         regEntry.stack[regEntry.stack.length - 1] = newEntry;
       }

       runMiddlewares(action);
       emit(previousStack, { type: 'replace', target: newEntry });

       // After replace lifecycle
       lifecycleManager.trigger('onAfterReplace', {
         stack: regEntry.stack.slice(),
         current: newEntry,
         previous: previousEntry,
         action: { type: 'replace', target: newEntry }
       });

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

        await lifecycleManager.trigger('onBeforePop', {
          stack: regEntry.stack.slice(),
          current: top,
          previous: regEntry.stack[regEntry.stack.length - 2],
          action: { type: 'pop', target: top }
        });

        const action = {
          type: "pop" as const,
          from: top,
          to: regEntry.stack[regEntry.stack.length - 2],
          stackSnapshot: regEntry.stack.slice()
        };
        const ok = await runGuards(action);
        if (!ok) return false;

        const previousStack = regEntry.stack.slice();

        regEntry.stack.pop();
        runMiddlewares(action);
        emit(previousStack, { type: 'pop', target: top });
        // After pop lifecycle
        lifecycleManager.trigger('onAfterPop', {
          stack: regEntry.stack.slice(),
          current: regEntry.stack[regEntry.stack.length - 1],
          previous: top,
          action: { type: 'pop', target: top }
        });
        return true;
      });
    },

    async popUntil(predicate) {
      return withLock<boolean>(async () => {
        if (regEntry.stack.length === 0) {
          if (regEntry.parentId) return false;
          return false;
        }

        const previousStack = regEntry.stack.slice();
        let i = regEntry.stack.length - 1;
        while (i >= 0 && !predicate(regEntry.stack[i], i, regEntry.stack)) i--;

        if (i < regEntry.stack.length - 1) {
          const poppedEntries = regEntry.stack.slice(i + 1);
          const targetEntry = regEntry.stack[i];

          // Before popUntil lifecycle for each popped entry
          for (const poppedEntry of poppedEntries) {
            await lifecycleManager.trigger('onBeforePop', {
              stack: previousStack,
              current: poppedEntry,
              previous: targetEntry,
              action: { type: 'popUntil', target: poppedEntry }
            });
          }

          const action = {
            type: "popUntil" as const,
            stackSnapshot: previousStack
          };

          const ok = await runGuards(action);
          if (!ok) return false;

          regEntry.stack.splice(i + 1);

          runMiddlewares(action);
          emit(previousStack, { type: 'popUntil', target: targetEntry });

          // After popUntil lifecycle
          lifecycleManager.trigger('onAfterPop', {
            stack: regEntry.stack.slice(),
            current: targetEntry,
            previous: poppedEntries[poppedEntries.length - 1],
            action: { type: 'popUntil', target: targetEntry }
          });

          // Trigger onExit for each popped entry
          poppedEntries.forEach((poppedEntry: StackEntry) => {
            lifecycleManager.trigger('onExit', {
              stack: regEntry.stack.slice(),
              current: targetEntry,
              previous: poppedEntry,
              action: { type: 'popUntil', target: poppedEntry }
            });
          });

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

        if (regEntry.stack.length <= 1) return false;

        const previousStack = regEntry.stack.slice();
        const poppedEntries = regEntry.stack.slice(1);
        const targetEntry = regEntry.stack[0];

        // Before popToRoot lifecycle for each popped entry
        for (const poppedEntry of poppedEntries) {
          await lifecycleManager.trigger('onBeforePop', {
            stack: previousStack,
            current: poppedEntry,
            previous: targetEntry,
            action: { type: 'popToRoot', target: poppedEntry }
          });
        }

        const ok = await runGuards(action);
        if (!ok) return false;

        regEntry.stack.splice(1);

        runMiddlewares(action);
        emit(previousStack, { type: 'popToRoot', target: targetEntry });

        // After popToRoot lifecycle
        lifecycleManager.trigger('onAfterPop', {
          stack: regEntry.stack.slice(),
          current: targetEntry,
          previous: poppedEntries[poppedEntries.length - 1],
          action: { type: 'popToRoot', target: targetEntry }
        });

        // Trigger onExit for each popped entry
        poppedEntries.forEach((poppedEntry: StackEntry) => {
          lifecycleManager.trigger('onExit', {
            stack: regEntry.stack.slice(),
            current: targetEntry,
            previous: poppedEntry,
            action: { type: 'popToRoot', target: poppedEntry }
          });
        });

        return true;
      });
    },

    async pushAndPopUntil(rawKey, predicate, params, metadata) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const newEntry: StackEntry = { uid: generateStableUid(key, p), key, params: p, metadata };

        const previousStack = regEntry.stack.slice();
        let i = regEntry.stack.length - 1;
        while (i >= 0 && !predicate(regEntry.stack[i], i, regEntry.stack)) i--;

        const poppedEntries = i < regEntry.stack.length - 1 ? regEntry.stack.slice(i + 1) : [];
        const targetEntry = i >= 0 ? regEntry.stack[i] : undefined;

        // Before lifecycle for popped entries
        for (const poppedEntry of poppedEntries) {
          await lifecycleManager.trigger('onBeforePop', {
            stack: previousStack,
            current: poppedEntry,
            previous: newEntry,
            action: { type: 'pushAndPopUntil', target: poppedEntry }
          });
        }

        // Before push lifecycle
        await lifecycleManager.trigger('onBeforePush', {
          stack: previousStack,
          current: regEntry.stack[regEntry.stack.length - 1],
          previous: undefined,
          action: { type: 'pushAndPopUntil', target: newEntry }
        });

        const action = {
          type: "push" as const,
          from: regEntry.stack[regEntry.stack.length - 1],
          to: newEntry,
          stackSnapshot: previousStack
        };

        const ok = await runGuards(action);
        if (!ok) return false;

        if (i < regEntry.stack.length - 1) {
          regEntry.stack.splice(i + 1);
        }

        regEntry.stack.push(newEntry);

        runMiddlewares(action);
        emit(previousStack, { type: 'pushAndPopUntil', target: newEntry });

        // After lifecycle
        lifecycleManager.trigger('onAfterPush', {
          stack: regEntry.stack.slice(),
          current: newEntry,
          previous: action.from,
          action: { type: 'pushAndPopUntil', target: newEntry }
        });

        // Trigger onExit for popped entries
        poppedEntries.forEach((poppedEntry: StackEntry) => {
          lifecycleManager.trigger('onExit', {
            stack: regEntry.stack.slice(),
            current: newEntry,
            previous: poppedEntry,
            action: { type: 'pushAndPopUntil', target: poppedEntry }
          });
        });

        return true;
      });
    },

    async pushAndReplace(rawKey, params, metadata) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const newEntry: StackEntry = { uid: generateStableUid(key, p), key, params: p, metadata };
        const previousEntry = regEntry.stack[regEntry.stack.length - 1];

        // Before replace lifecycle
        await lifecycleManager.trigger('onBeforeReplace', {
          stack: regEntry.stack.slice(),
          current: previousEntry,
          previous: undefined,
          action: { type: 'pushAndReplace', target: newEntry }
        });

        const action = {
          type: "replace" as const,
          from: previousEntry,
          to: newEntry,
          stackSnapshot: regEntry.stack.slice()
        };

        const ok = await runGuards(action);
        if (!ok) return false;

        const previousStack = regEntry.stack.slice();
        if (regEntry.stack.length > 0) regEntry.stack.pop();
        regEntry.stack.push(newEntry);

        runMiddlewares(action);
        emit(previousStack, { type: 'pushAndReplace', target: newEntry });

        // After replace lifecycle
        lifecycleManager.trigger('onAfterReplace', {
          stack: regEntry.stack.slice(),
          current: newEntry,
          previous: previousEntry,
          action: { type: 'pushAndReplace', target: newEntry }
        });

        return true;
      });
    },

    async go(rawKey, params, metadata) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const newEntry: StackEntry = { uid: generateStableUid(key, p), key, params: p, metadata };
        const previousEntry = regEntry.stack[regEntry.stack.length - 1];

        // Before replace lifecycle (go is essentially a replace)
        await lifecycleManager.trigger('onBeforeReplace', {
          stack: regEntry.stack.slice(),
          current: previousEntry,
          previous: undefined,
          action: { type: 'go', target: newEntry }
        });

        const action = {
          type: "replace" as const,
          from: previousEntry,
          to: newEntry,
          stackSnapshot: regEntry.stack.slice(),
        };

        const ok = await runGuards(action);
        if (!ok) return false;

        const previousStack = regEntry.stack.slice();
        const len = regEntry.stack.length;
        regEntry.stack.push(newEntry);
        regEntry.stack.splice(0, len);

        runMiddlewares(action);
        emit(previousStack, { type: 'go', target: newEntry });

        // After replace lifecycle
        lifecycleManager.trigger('onAfterReplace', {
          stack: regEntry.stack.slice(),
          current: newEntry,
          previous: previousEntry,
          action: { type: 'go', target: newEntry }
        });

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
      if (enabled ) {
        try {
          const localPath = buildUrlPath([{ navLink, stack: regEntry.stack }]);
          updateNavQueryParamForStack(id, localPath, groupContext, groupStackId);
        } catch {
          updateNavQueryParamForStack(id, buildUrlPath([{ navLink, stack: regEntry.stack }]), groupContext, groupStackId);
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

      while (currentId) {
        const reg = globalRegistry.get(currentId);
        if (!reg) break;

        if (reg.historySyncEnabled) {
          allStacks.unshift({ navLink: reg.navLink || currentNavLink, stack: reg.stack });
        }

        currentId = reg.parentId;
      }

      if (allStacks.length === 0) {
        allStacks.push({ navLink: navLink, stack: regEntry.stack });
      }

      return buildUrlPath(allStacks);
    },

    getNavLink() {
      return navLink;
    },

    isActiveStack() {
      if (!regEntry.historySyncEnabled) return false;

      const childIds = Array.from(regEntry.childIds || []) as string[];
      for (const childId of childIds) {
        const childReg = globalRegistry.get(childId as string);
        if (childReg?.historySyncEnabled) return false;
      }

      return true;
    },

    isInGroup() {
      return groupContext !== null;
    },

    getGroupId() {
      return groupContext ? groupContext.getGroupId() : null;
    },

    async goToGroupId(groupId: string) {
      if (!groupContext) {
        console.warn(`goToGroupId called on non-group stack ${id}`);
        return false;
      }

      return groupContext.goToGroupId(groupId);
    },

    addOnCreate: (handler) => lifecycleManager.addHandler('onCreate', handler),
    addOnDispose: (handler) => lifecycleManager.addHandler('onDispose', handler),
    addOnPause: (handler) => lifecycleManager.addHandler('onPause', handler),
    addOnResume: (handler) => lifecycleManager.addHandler('onResume', handler),
    addOnEnter: (handler) => lifecycleManager.addHandler('onEnter', handler),
    addOnExit: (handler) => lifecycleManager.addHandler('onExit', handler),
    addOnBeforePush: (handler) => lifecycleManager.addHandler('onBeforePush', handler),
    addOnAfterPush: (handler) => lifecycleManager.addHandler('onAfterPush', handler),
    addOnBeforePop: (handler) => lifecycleManager.addHandler('onBeforePop', handler),
    addOnAfterPop: (handler) => lifecycleManager.addHandler('onAfterPop', handler),
    addOnBeforeReplace: (handler) => lifecycleManager.addHandler('onBeforeReplace', handler),
    addOnAfterReplace: (handler) => lifecycleManager.addHandler('onAfterReplace', handler),

    clearAllLifecycleHandlers: (hook) => lifecycleManager.clear(hook),
    getLifecycleHandlers: (hook) => lifecycleManager.getHandlers(hook),
    _getLifecycleManager: () => lifecycleManager,

    dispose() {
      lifecycleManager.trigger('onDispose', {
        stack: regEntry.stack.slice(),
        current: regEntry.stack[regEntry.stack.length - 1]
      });

      lifecycleManager.dispose();
      transitionManager.dispose();
      memoryManager.dispose();
      regEntry.listeners.clear();
      regEntry.guards.clear();
      regEntry.middlewares.clear();

      try {
            if (typeof window !== "undefined") {
              sessionStorage.removeItem(storageKeyFor(id));
            }
      } catch (e) {
            console.warn(`Failed to clear persisted storage for stack ${id}:`, e);
      }

      if (regEntry.parentId) {
        const parentReg = globalRegistry.get(regEntry.parentId);
        if (parentReg) {
          parentReg.childIds.delete(id);
        }
      }

      regEntry.childIds?.forEach((childId : string) => {
        const childReg = globalRegistry.get(childId as string);
        if (childReg) {
          childReg.parentId = null;
        }
      });

      try {
        updateNavQueryParamForStack(id, null, groupContext, groupStackId);
      } catch {}

      globalRegistry.delete(id);
    },

    clearAllPersistedStacks() {
        if (typeof window === "undefined") return;

        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('navstack:')) {
              sessionStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.warn('Failed to clear all persisted stacks:', e);
        }
      }
  };

  regEntry.api = api;
  (api as any).lifecycleManager = lifecycleManager;
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

// ==================== Custom Hooks ====================

/**
 * Hook for managing page lifecycle events
 * @param nav - The navigation stack API
 * @param callbacks - Object containing lifecycle callback functions
 * @param dependencies - Additional dependencies for the callbacks
 */
export function usePageLifecycle(
  nav: NavStackAPI,
  callbacks: {
    onEnter?: (context: any) => void;
    onExit?: (context: any) => void;
    onPause?: (context: any) => void;
    onResume?: (context: any) => void;
    onBeforePush?: (context: any) => Promise<void>;
    onAfterPush?: (context: any) => void;
    onBeforePop?: (context: any) => Promise<void>;
    onAfterPop?: (context: any) => void;
    onBeforeReplace?: (context: any) => Promise<void>;
    onAfterReplace?: (context: any) => void;
  },
  dependencies: any[] = []
) {
  const stableCallbacks = useMemo(() => callbacks, dependencies);
  const currentPageUid = useContext(CurrentPageContext);
  const isMounted = useRef(false);
  const hasTriggeredInitialEnter = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    const cleanupFunctions: (() => void)[] = [];

    // Get current page info
    const currentEntry = nav.peek();
    const isCurrentPageActive = currentEntry?.uid === currentPageUid;

    // Helper to check if context belongs to current page
    const isOurPageEntering = (context: any) =>
      context.current?.uid === currentPageUid;

    const isOurPageExiting = (context: any) =>
      context.previous?.uid === currentPageUid;

    const isOurPageCurrent = (context: any) =>
      context.current?.uid === currentPageUid;

    // Handle initial page load - only for the current page
    if (isCurrentPageActive && currentEntry && stableCallbacks.onEnter && !hasTriggeredInitialEnter.current) {
      hasTriggeredInitialEnter.current = true;

      const initialContext = {
        stack: nav.getStack(),
        current: currentEntry,
        previous: undefined,
        action: { type: 'initial' }
      };

      // Use microtask to ensure component is mounted
      Promise.resolve().then(() => {
        if (isMounted.current) {
          stableCallbacks.onEnter!(initialContext);
        }
      });
    }

    // Register scoped lifecycle handlers

    // PAGE TRANSITION EVENTS (scoped to specific page)
    if (stableCallbacks.onEnter) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        if (isOurPageEntering(context)) {
          stableCallbacks.onEnter!(context);
        }
      };
      cleanupFunctions.push(nav.addOnEnter(handler));
    }

    if (stableCallbacks.onExit) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        if (isOurPageExiting(context)) {
          stableCallbacks.onExit!(context);
        }
      };
      cleanupFunctions.push(nav.addOnExit(handler));
    }

    // APP-LEVEL EVENTS (not scoped - fire for active page)
    if (stableCallbacks.onPause) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        const currentTopPage = nav.peek();
        if (currentTopPage?.uid === currentPageUid) {
          stableCallbacks.onPause!(context);
        }
      };
      cleanupFunctions.push(nav.addOnPause(handler));
    }

    if (stableCallbacks.onResume) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        const currentTopPage = nav.peek();
        if (currentTopPage?.uid === currentPageUid) {
          stableCallbacks.onResume!(context);
        }
      };
      cleanupFunctions.push(nav.addOnResume(handler));
    }

    // NAVIGATION ACTION EVENTS (scoped to initiating page)
    if (stableCallbacks.onBeforePush) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // onBeforePush: only when pushing FROM our current page
        if (isOurPageCurrent(context)) {
          return stableCallbacks.onBeforePush!(context);
        }
      };
      cleanupFunctions.push(nav.addOnBeforePush(handler));
    }

    if (stableCallbacks.onAfterPush) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // onAfterPush: only when push was initiated FROM our page
        if (context.previous?.uid === currentPageUid) {
          stableCallbacks.onAfterPush!(context);
        }
      };
      cleanupFunctions.push(nav.addOnAfterPush(handler));
    }

    if (stableCallbacks.onBeforePop) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // onBeforePop: only when popping FROM our current page
        if (isOurPageCurrent(context)) {
          return stableCallbacks.onBeforePop!(context);
        }
      };
      cleanupFunctions.push(nav.addOnBeforePop(handler));
    }

    if (stableCallbacks.onAfterPop) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // onAfterPop: only when our page was popped
        if (isOurPageExiting(context)) {
          stableCallbacks.onAfterPop!(context);
        }
      };
      cleanupFunctions.push(nav.addOnAfterPop(handler));
    }

    if (stableCallbacks.onBeforeReplace) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // onBeforeReplace: only when replacing our current page
        if (isOurPageCurrent(context)) {
          return stableCallbacks.onBeforeReplace!(context);
        }
      };
      cleanupFunctions.push(nav.addOnBeforeReplace(handler));
    }

    if (stableCallbacks.onAfterReplace) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // onAfterReplace: only when our page was replaced
        if (isOurPageExiting(context)) {
          stableCallbacks.onAfterReplace!(context);
        }
      };
      cleanupFunctions.push(nav.addOnAfterReplace(handler));
    }

    return () => {
      isMounted.current = false;
      hasTriggeredInitialEnter.current = false;
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [nav, stableCallbacks, currentPageUid]);
}

/**
 * Advanced hook with page state management
 * @param nav - The navigation stack API
 * @param pageKey - Optional page key to filter events
 */
export function usePageState(nav: NavStackAPI, pageKey?: string) {
  const [state, setState] = useState({
    isActive: false,
    isPaused: false,
    enterTime: null as number | null,
    exitTime: null as number | null
  });

  usePageLifecycle(nav, {
    onEnter: (context) => {
      if (pageKey && context.current?.key !== pageKey) return;

      setState(prev => ({
        ...prev,
        isActive: true,
        isPaused: false,
        enterTime: Date.now(),
        exitTime: null
      }));
    },

    onExit: (context) => {
      if (pageKey && context.current?.key !== pageKey) return;

      setState(prev => ({
        ...prev,
        isActive: false,
        exitTime: Date.now()
      }));
    },

    onPause: () => {
      setState(prev => ({ ...prev, isPaused: true }));
    },

    onResume: () => {
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [pageKey]);

  return state;
}

/**
 * Hook for page-specific lifecycle with automatic cleanup
 * @param nav - The navigation stack API
 * @param pageKey - The specific page key to watch
 * @param callbacks - Lifecycle callbacks
 */
export function usePageSpecificLifecycle(
  nav: NavStackAPI,
  pageKey: string,
  callbacks: {
    onEnter?: (context: any) => void;
    onExit?: (context: any) => void;
    onPause?: (context: any) => void;
    onResume?: (context: any) => void;
  }
) {
  usePageLifecycle(nav, {
    onEnter: (context) => {
      if (context.current?.key === pageKey) {
        callbacks.onEnter?.(context);
      }
    },
    onExit: (context) => {
      if (context.current?.key === pageKey) {
        callbacks.onExit?.(context);
      }
    },
    onPause: (context) => {
      if (context.current?.key === pageKey) {
        callbacks.onPause?.(context);
      }
    },
    onResume: (context) => {
      if (context.current?.key === pageKey) {
        callbacks.onResume?.(context);
      }
    }
  }, [pageKey]);
}

// ==================== Group Navigation Stack ====================
type GroupNavigationStackProps = {
  id: string;
  navStack: Map<string, React.ReactElement>;
  current: string;
  onCurrentChange?: (id: string) => void;
  persist?: boolean;
  preloadAll?: boolean;
  defaultStack?: string;
};

const GROUP_STATE_STORAGE_KEY = 'navstack-group-state';

function readGroupState(groupId: string): { activeStack: string;} | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(`${GROUP_STATE_STORAGE_KEY}:${groupId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeGroupState(groupId: string, activeStack: string) {
  try {
    if (typeof window === "undefined") return;
    const state = { activeStack, timestamp: Date.now() };
    sessionStorage.setItem(`${GROUP_STATE_STORAGE_KEY}:${groupId}`, JSON.stringify(state));
  } catch (e) {}
}

function clearGroupState(groupId: string) {
  try {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(`${GROUP_STATE_STORAGE_KEY}:${groupId}`);
  } catch (e) {}
}

export function GroupNavigationStack({
  id,
  navStack,
  current,
  onCurrentChange,
  persist = false,
  preloadAll = false,
  defaultStack
}: GroupNavigationStackProps) {


  // Get initial active stack from URL or fallback to current prop
  const getInitialActiveStackId = (): string => {
    if (typeof window === 'undefined') return current;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlGroup = urlParams.get('group');
      return (urlGroup && navStack.has(urlGroup)) ? urlGroup : current;
    } catch (e) {
      console.warn('Failed to parse URL for group navigation:', e);
      return current;
    }
  };

  const [activeStackId, setActiveStackId] = useState<string>(getInitialActiveStackId);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
      onCurrentChange?.(getInitialActiveStackId());
      setHydrated(true);}, []);

  // Sync activeStackId with current prop when it changes from external
  useEffect(() => {
    if(current === activeStackId || !hydrated)return;
    restUrl();
    setActiveStackId(current);
  }, [current]);

  const restUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('group');
      url.searchParams.delete('nav');
      const newHref = url.toString();
      if (window.location.href !== newHref) {
            window.history.replaceState({ group: null }, "", newHref);
            window.history.replaceState({ navStack: null }, "", newHref);
      }
  }

  // Group context implementation
  const groupContext: GroupNavigationContextType = useMemo(() => ({
    getGroupId: () => id,

    getCurrent: () => activeStackId,

    goToGroupId: async (groupId: string) => {
      if (navStack.has(groupId)) {
        restUrl();
        setActiveStackId(groupId);
        onCurrentChange?.(groupId);
        return true;
      }
      return false;
    },



    isActiveStack: (stackId: string) => {
      return stackId === activeStackId;
    }
  }), [id, activeStackId, navStack, persist]);

  // Load group state from storage on mount
  useEffect(() => {
    if (persist && typeof window !== 'undefined') {
      const savedState = readGroupState(id);
      if (savedState) {
        // If we have a saved active stack and it's different from current activeStackId, update it
        if (savedState.activeStack && savedState.activeStack !== activeStackId && navStack.has(savedState.activeStack)) {
           restUrl();
           setActiveStackId(savedState.activeStack);
           onCurrentChange?.(savedState.activeStack);
        }
      }
    }
  }, [id, persist, navStack]);

  // Save group state to storage when it changes
  useEffect(() => {
    if (persist && typeof window !== 'undefined') {
      writeGroupState(id, activeStackId);
    }
  }, [id, activeStackId, persist]);


  // Handle back/forward browser buttons
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: PopStateEvent) => {
      if (e.state && e.state.group && navStack.has(e.state.group)) {
        restUrl();
        setActiveStackId(e.state.group);
        onCurrentChange?.(e.state.group);
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [navStack]);

  return (
    <GroupNavigationContext.Provider value={groupContext}>
      <div className="group-navigation-stack">
        {Array.from(navStack.entries()).map(([stackId, stackEl]) => {
          const isActive = hydrated && stackId === activeStackId;

          return (
            <div
              key={stackId}
              style={{ display: isActive ? "block" : "none" }}
              aria-hidden={!isActive}
            >
              <GroupStackIdContext.Provider value={stackId}>
                {stackEl}
              </GroupStackIdContext.Provider>
            </div>
          );
        })}
      </div>
    </GroupNavigationContext.Provider>
  );
}

// ==================== Main NavigationStack Component ====================
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
  enableScrollRestoration?: boolean;
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
    persist = false,
    enableScrollRestoration = true,
  } = props;

  // Auto-detect parent navigation context
  const parentApi = findParentNavContext();
  const groupContext = useGroupNavigation();
  const groupStackId = useGroupStackId();

  const [isInitialized, setInitialized] = useState(false);
  const [stackSnapshot, setStackSnapshot] = useState<StackEntry[]>([]);
  const [currentPath, setCurrentPath] = useState(
      typeof window !== 'undefined' ? window.location.pathname : ''
    );

  useEffect(() => {
      if (typeof window === 'undefined') return;
        setCurrentPath(window.location.pathname);
    }, []);

  const api = useMemo(() => {
    const newApi = createApiFor(id, navLink, syncHistory || false, parentApi, currentPath, groupContext, groupStackId);

    if (parentApi) {
      const parentReg = globalRegistry.get(parentApi.id);
      if (parentReg) {
        parentReg.childIds.add(id);
      }
    }

    return newApi;
  }, [id, navLink, syncHistory, parentApi, currentPath, groupContext]);

 // Trigger onCreate lifecycle when API is created
  useEffect(() => {
    const lifecycleManager = api._getLifecycleManager();
    lifecycleManager.trigger('onCreate', {
      stack: api.getStack(),
      current: api.peek()
    });
  }, [api]);

  // App state tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const regEntry = globalRegistry.get(id);
    if (!regEntry) return;

    const lifecycleManager = api._getLifecycleManager();

    // Enable app state tracking
    const getCurrentContext = () => ({
      stack: regEntry.stack.slice(),
      current: regEntry.stack[regEntry.stack.length - 1]
    });

    const cleanupAppState = lifecycleManager.enableAppStateTracking(getCurrentContext);

    return cleanupAppState;
  }, [api, id]);

  // Update the registry with the current path
    useEffect(() => {
      const regEntry = globalRegistry.get(id);
      if (regEntry) {
        regEntry.currentPath = currentPath;
      }
    }, [id, currentPath]);

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
      regEntry.navLink = navLink;
      regEntry.parentId = parentApi?.id || null;
    }


    // First priority: Parse from URL
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const navPathCombined = searchParams.get('nav');

      if (navPathCombined) {
        const map = parseCombinedNavParam(navPathCombined);
        const ourPath = map[id];
        if (ourPath) {
          const tokenizedStacks = parseUrlPathIntoStacks(ourPath);

          const ourTokens = tokenizedStacks[0] || [];

          if (ourTokens.length > 0) {
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
            setInitialized(true);
            return;
          }
        }
      }
    }

    // Second priority: Fall back to persisted storage
    if (persist ) {
      const persisted = readPersistedStack(id);
      if (persisted && persisted.length > 0) {
        regEntry.stack = persisted;
        setStackSnapshot([...persisted]);
        setInitialized(true);
        return;
      }
    }

    // Final fallback: Use initial entry
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
    if (persist ) writePersistedStack(id, regEntry.stack);
    setInitialized(true);
  }, [id, entry, navLink, groupContext]);


  useEffect(() => {
      const currentRegEntry = globalRegistry.get(id);
      if (!currentRegEntry || !groupContext || !groupStackId) return;
      const active = groupContext.isActiveStack(groupStackId);
      if((syncHistory || currentRegEntry.historySyncEnabled) && active){
          const localPath = buildUrlPath([{ navLink, stack: currentRegEntry.stack }]);
          updateNavQueryParamForStack(id, localPath, groupContext, groupStackId);
      }else if(!(syncHistory || currentRegEntry.historySyncEnabled)){
           removeNavQueryParamForStack(id, groupContext, groupStackId)
      }
  }, [id, navLink, syncHistory, groupContext?.getCurrent]);

  useEffect(() => {
    const unsub = api.subscribe((stack) => {
      setStackSnapshot(stack);
      if (persist ) writePersistedStack(id, stack);
    });
    return unsub;
  }, [api, persist, id, groupContext]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = (event: PopStateEvent) => {
      const currentRegEntry = globalRegistry.get(id);
      if (!currentRegEntry) return;

      if (!api.isActiveStack()) return;

      const searchParams = new URLSearchParams(window.location.search);
      const navPathCombined = searchParams.get('nav');
      if (!navPathCombined) return;

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
        if (persist ) writePersistedStack(id, newStack);
      }
    };

    if (syncHistory ) {
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      if (syncHistory ) {
        window.removeEventListener('popstate', handlePopState);
      }
      if (autoDispose && !groupContext) api.dispose();
    };
  }, [id, navLink, syncHistory, autoDispose, api, persist, groupContext]);

  const lastLen = useRef(stackSnapshot.length);

  useEffect(() => {
    const handleStackEmpty = () => {
      if (onExitStack) {
        try {
          onExitStack();
          return;
        } catch (e) {
          console.warn('onExit error:', e);
        }
      }

      if (parentApi) {
        parentApi.pop().catch(() => {
          if (typeof window !== "undefined" && window.history.length > 0) {
            window.history.back();
          }
        });
        return;
      }

      if (typeof window !== "undefined" && window.history.length > 0) {
        window.history.back();
      }
    };

    const unsub = api.subscribe((stack) => {
      setStackSnapshot(stack);
      if (lastLen.current > 0 && stack.length === 0) {
        if(!groupContext)handleStackEmpty();
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

  if (enableScrollRestoration) {
    useEnhancedScrollRestoration(api, renders, stackSnapshot, transitionDuration);
  }

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
      const api = createApiFor(id, {}, false, null,'', null, null);
      api.dispose();
    });
  });
}