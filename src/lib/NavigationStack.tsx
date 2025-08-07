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
} from "react";

// ==================== Types ====================
type NavParams = Record<string, any> | undefined;
type LazyComponent = Promise<{ default: React.ComponentType<any> }>;
type TransitionState = "enter" | "idle" | "exit";

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
  createChildStack: (childId: string) => NavStackAPI;
  getParentStack: () => NavStackAPI | null;
  pushWithTransition: (rawKey: string, params?: NavParams, metadata?: StackEntry['metadata']) => Promise<boolean>;
  clearCache: () => void;
  isTop: (uid?: string) => boolean;
};

type NavigationMap = Record<string, React.ComponentType<any> | ReactNode>;
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
const STORAGE_TTL_MS = 1000 * 60 * 30; // 30 minutes
const MEMORY_CACHE_SIZE = 5;
const MEMORY_CACHE_EXPIRY = 1000 * 60 * 5; // 5 minutes

// ==================== Global Systems ====================
const globalRegistry = new Map<string, {
  stack: StackEntry[];
  listeners: Set<StackChangeListener>;
  guards: Set<GuardFn>;
  middlewares: Set<MiddlewareFn>;
  maxStackSize: number;
  historySyncEnabled: boolean;
  parentStackId?: string;
  childStacks: Set<string>;
  snapshotBuffer: StackEntry[];
}>();

class TransitionManager {
  private activeTransitions = new Map<string, NodeJS.Timeout>();

  start(uid: string, duration: number, onComplete: () => void) {
    this.cancel(uid);
    const timer = setTimeout(() => {
      this.activeTransitions.delete(uid);
      onComplete();
    }, duration + 50); // 50ms buffer
    this.activeTransitions.set(uid, timer);
  }

  cancel(uid: string) {
    const timer = this.activeTransitions.get(uid);
    if (timer) {
      clearTimeout(timer);
      this.activeTransitions.delete(uid);
    }
  }

  dispose() {
    this.activeTransitions.forEach(timer => clearTimeout(timer));
    this.activeTransitions.clear();
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

class StackSnapshot {
  private static instance: StackSnapshot;
  private snapshots = new WeakMap<object, StackEntry[]>();

  private constructor() {}

  static getInstance(): StackSnapshot {
    if (!StackSnapshot.instance) {
      StackSnapshot.instance = new StackSnapshot();
    }
    return StackSnapshot.instance;
  }

  save(stackId: string, entries: StackEntry[]) {
    const key = { stackId };
    this.snapshots.set(key, [...entries]);
    return key;
  }

  get(key: object): StackEntry[] | undefined {
    return this.snapshots.get(key);
  }
}

// ==================== Core Functions ====================
const NavContext = createContext<NavStackAPI | null>(null);
const CurrentPageContext = createContext<string | null>(null);

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
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

function readPersistedStack(id: string, ttlMs: number = STORAGE_TTL_MS): StackEntry[] | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(storageKeyFor(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { timestamp: number; entries: StackEntry[] };
    if (!parsed.timestamp || !parsed.entries || !Array.isArray(parsed.entries)) return null;
    const expired = Date.now() - parsed.timestamp > ttlMs;
    if (expired) {
      sessionStorage.removeItem(storageKeyFor(id));
      return null;
    }
    return parsed.entries.map((p) => ({ uid: uid(), key: p.key, params: p.params, metadata: p.metadata }));
  } catch (e) {
    return null;
  }
}

function writePersistedStack(id: string, stack: StackEntry[], ttlMs: number = STORAGE_TTL_MS) {
  try {
    if (typeof window === "undefined") return;
    const simplified = {
      timestamp: Date.now(),
      entries: stack.map((s) => ({ key: s.key, params: s.params, metadata: s.metadata })),
    };
    sessionStorage.setItem(storageKeyFor(id), JSON.stringify(simplified));
  } catch (e) {}
}

function updateBrowserHistory(id: string, stack: StackEntry[]) {
  if (typeof window === "undefined") return;
  const regEntry = globalRegistry.get(id);
  if (!regEntry || !regEntry.historySyncEnabled) return;

  const currentPath = window.location.pathname + window.location.search;
  const newPath = `/${stack.map(e => e.key).join('/')}`;

  if (currentPath !== newPath) {
    window.history.pushState({ navStackId: id }, "", newPath);
  }
}

function createApiFor(id: string): NavStackAPI {
  const transitionManager = new TransitionManager();
  const memoryManager = new PageMemoryManager();
  const snapshot = StackSnapshot.getInstance();

  let safeRegEntry = globalRegistry.get(id);
  if (!safeRegEntry) {
    safeRegEntry = {
      stack: [],
      listeners: new Set(),
      guards: new Set(),
      middlewares: new Set(),
      maxStackSize: DEFAULT_MAX_STACK_SIZE,
      historySyncEnabled: false,
      childStacks: new Set(),
      snapshotBuffer: [],
    };
    globalRegistry.set(id, safeRegEntry);
  }
  const regEntry = safeRegEntry;

  function emit() {
    const stackCopy = regEntry!.stack.slice();
    updateBrowserHistory(id, stackCopy);
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
          to: { uid: uid(), key, params: p, metadata },
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

        // Focus management
        setTimeout(() => {
          const newPage = document.querySelector(`[data-nav-uid="${action.to.uid}"]`);
          if (newPage) {
            const focusable = newPage.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            (focusable as HTMLElement)?.focus?.();
          }
        }, DEFAULT_TRANSITION_DURATION + 50);

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
          to: { uid: uid(), key, params: p, metadata },
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

        // Focus management
        setTimeout(() => {
          const newPage = document.querySelector(`[data-nav-uid="${action.to.uid}"]`);
          if (newPage) {
            const focusable = newPage.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            (focusable as HTMLElement)?.focus?.();
          }
        }, DEFAULT_TRANSITION_DURATION + 50);

        return true;
      });
    },

    async pop() {
      return withLock<boolean>(async () => {
        if (regEntry.stack.length === 0) return false;
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

        // Focus management
        setTimeout(() => {
          const prevPage = document.querySelector(`[data-nav-uid="${action.to?.uid}"]`);
          if (prevPage) {
            const focusable = prevPage.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            (focusable as HTMLElement)?.focus?.();
          }
        }, DEFAULT_TRANSITION_DURATION + 50);

        return true;
      });
    },

    async popUntil(predicate) {
      return withLock<boolean>(async () => {
        if (regEntry.stack.length === 0) return false;
        const action = {
          type: "popUntil" as const,
          stackSnapshot: regEntry.stack.slice()
        };
        const ok = await runGuards(action);
        if (!ok) return false;
        let i = regEntry.stack.length - 1;
        while (i >= 0 && !predicate(regEntry.stack[i], i, regEntry.stack)) i--;
        if (i < regEntry.stack.length - 1) {
          const targetUid = regEntry.stack[i]?.uid;
          regEntry.stack.splice(i + 1);
          runMiddlewares(action);
          emit();

          // Focus management
          setTimeout(() => {
            const targetPage = document.querySelector(`[data-nav-uid="${targetUid}"]`);
            if (targetPage) {
              const focusable = targetPage.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
              (focusable as HTMLElement)?.focus?.();
            }
          }, DEFAULT_TRANSITION_DURATION + 50);

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
        const ok = await runGuards(action);
        if (!ok) return false;
        if (regEntry.stack.length > 1) {
          const rootUid = regEntry.stack[0]?.uid;
          regEntry.stack.splice(1);
          runMiddlewares(action);
          emit();

          // Focus management
          setTimeout(() => {
            const rootPage = document.querySelector(`[data-nav-uid="${rootUid}"]`);
            if (rootPage) {
              const focusable = rootPage.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
              (focusable as HTMLElement)?.focus?.();
            }
          }, DEFAULT_TRANSITION_DURATION + 50);

          return true;
        }
        return false;
      });
    },

    async pushAndPopUntil(rawKey, predicate, params, metadata) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const newEntry: StackEntry = { uid: uid(), key, params: p, metadata };
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
        const newEntry: StackEntry = { uid: uid(), key, params: p, metadata };
        const action = {
          type: "replace" as const,
          from: regEntry.stack[regEntry.stack.length - 1],
          to: newEntry,
          stackSnapshot: regEntry.stack.slice()
        };

        const ok = await runGuards(action);
        if (!ok) return false;

        // Pop + push as one atomic action
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
        const newEntry: StackEntry = { uid: uid(), key, params: p, metadata };

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

        // Optional: focus management
        setTimeout(() => {
          const newPage = document.querySelector(`[data-nav-uid="${newEntry.uid}"]`);
          if (newPage) {
            const focusable = newPage.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            (focusable as HTMLElement)?.focus?.();
          }
        }, DEFAULT_TRANSITION_DURATION + 50);

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
        updateBrowserHistory(id, regEntry.stack);
      }
    },

    createChildStack(childId) {
      const childApi = createApiFor(childId);
      const childReg = globalRegistry.get(childId)!;
      childReg.parentStackId = id;
      regEntry.childStacks.add(childId);
      return childApi;
    },


    getParentStack() {
      return regEntry.parentStackId ? createApiFor(regEntry.parentStackId) : null;
    },

    async pushWithTransition(rawKey, params, metadata) {
      const snapshotKey = snapshot.save(id, regEntry.stack);
      try {
        return await api.push(rawKey, params, metadata);
      } catch (err) {
        const saved = snapshot.get(snapshotKey);
        if (saved) {
          regEntry.stack = [...saved];
          emit();
        }
        throw err;
      }
    },

    clearCache() {
      memoryManager.dispose();
    },

    dispose() {
      transitionManager.dispose();
      memoryManager.dispose();
      regEntry.childStacks.forEach(childId => {
        const childApi = createApiFor(childId);
        childApi.dispose();
      });
      globalRegistry.delete(id);
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
          console.warn("nav.isTop() called outside of page context. Make sure you're calling it from within a page component.");
        }

        return false;
      }
  };

  return api;
}

// ==================== React Components ====================
function LazyRouteLoader({ lazyComponent }: { lazyComponent: () => LazyComponent }) {
  const LazyComponent = lazy(lazyComponent);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}

export function useNav() {
  const context = useContext(NavContext);
  if (!context) throw new Error("useNav must be used within a NavigationStack");
  return context;
}

export function useNavStack(id: string) {
  return useMemo(() => createApiFor(id), [id]);
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
  const [stage, setStage] = useState<"init" | "active">(state === "enter" ? "init" : "active");

  useEffect(() => {
    if (state === "enter") {
      const frame = requestAnimationFrame(() => setStage("active"));
      return () => cancelAnimationFrame(frame);
    }
  }, [state]);

  const slideCls =
    state === "enter"
      ? stage === "init"
        ? "nav-slide-enter"
        : "nav-slide-enter-active"
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
  const fadeCls =
    state === "enter"
      ? "nav-fade-enter nav-fade-enter-active"
      : state === "exit"
      ? "nav-fade-exit nav-fade-exit-active"
      : "";

  return (
    <div key={uid} className={`${baseClass} ${fadeCls}`} inert={!isTop} data-nav-uid={uid}>
      {children}
    </div>
  );
}

export default function NavigationStack(props: {
  id: string;
  navLink: NavigationMap;
  entry: string;
  onExitStack?: () => void;
  persist?: boolean;
  transition?: BuiltinTransition;
  transitionDuration?: number;
  renderTransition?: TransitionRenderer;
  preserve?: boolean;
  className?: string;
  style?: React.CSSProperties;
  maxStackSize?: number;
  autoDispose?: boolean;
  syncHistory?: boolean;
  lazyComponents?: Record<string, () => LazyComponent>;
  children?: ReactNode;
}) {
  const {
    id,
    navLink,
    entry,
    onExitStack,
    persist = false,
    transition = "fade",
    transitionDuration = DEFAULT_TRANSITION_DURATION,
    renderTransition,
    preserve = false,
    className,
    style,
    maxStackSize,
    autoDispose = true,
    syncHistory = false,
    lazyComponents,
    children,
  } = props;

  const api = useMemo(() => {
    const instance = createApiFor(id);
    if (maxStackSize !== undefined) {
      const regEntry = globalRegistry.get(id)!;
      regEntry.maxStackSize = maxStackSize;
    }
    return instance;
  }, [id, maxStackSize]);

  // Initialize stack and browser history sync
  useEffect(() => {
    if (typeof window === "undefined") return;


  let regEntry = globalRegistry.get(id);
    if (!regEntry) {
      regEntry = {
        stack: [],
        listeners: new Set(),
        guards: new Set(),
        middlewares: new Set(),
        maxStackSize: maxStackSize ?? DEFAULT_MAX_STACK_SIZE,
        historySyncEnabled: false,
        childStacks: new Set(),
        snapshotBuffer: [],
      };
      globalRegistry.set(id, regEntry);
    } else if (maxStackSize !== undefined) {
      regEntry.maxStackSize = maxStackSize;
    }

    const persisted = persist ? readPersistedStack(id) : null;

    if (persisted && persisted.length > 0) {
      regEntry.stack.splice(0);
      persisted.forEach((s) => regEntry.stack.push(s));
      regEntry.listeners.forEach((l) => { try { l(regEntry.stack.slice()); } catch(e){} });
    } else if (regEntry.stack.length === 0) {
      const { key, params } = parseRawKey(entry);
      if (!navLink[key]) {
        console.error(`Entry route "${key}" not found in navLink`);
        return;
      }
      regEntry.stack.push({ uid: uid(), key, params });
      regEntry.listeners.forEach((l) => { try { l(regEntry.stack.slice()); } catch(e){} });
    }

    // Initialize history sync
    api.syncWithBrowserHistory(syncHistory);

    // Handle browser back/forward
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.navStackId === id) {
        api.pop();
      }
    };

    window.addEventListener('popstate', handlePopState);

    const action = { type: "init" as const, stackSnapshot: regEntry.stack.slice() };
    regEntry.middlewares.forEach((m) => {
      try { m(action); } catch(e) { console.warn("Init middleware threw:", e); }
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (autoDispose) api.dispose();
    };
  }, [id, entry, persist, autoDispose, navLink, syncHistory, api]);

  const [stackSnapshot, setStackSnapshot] = useState<StackEntry[]>(
    () => globalRegistry.get(id)?.stack.slice() || []
  );

  useEffect(() => {
    const unsub = api.subscribe((s) => setStackSnapshot(s));
    return unsub;
  }, [api]);

  useEffect(() => {
    if (persist) writePersistedStack(id, stackSnapshot);
  }, [id, persist, stackSnapshot]);

  const lastLen = useRef(stackSnapshot.length);
  useEffect(() => {
    if (lastLen.current > 0 && stackSnapshot.length === 0) {
      if (onExitStack) {
        try { onExitStack(); } catch (e) { console.warn(e); }
      } else if (typeof window !== "undefined" && window.history.length > 0) {
        window.history.back();
      }
    }
    lastLen.current = stackSnapshot.length;
  }, [stackSnapshot.length, onExitStack]);

  // Inject default transition styles
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("navstack-builtins")) return;

    const styleEl = document.createElement("style");
    styleEl.id = "navstack-builtins";
    styleEl.innerHTML = `
      .navstack-root { position: relative; display: block; width: 100%; height: 100%; overflow: hidden;}
      .navstack-page { position: relative; display: block; width: 100%; height: auto; overflow: visible; }
      .navstack-page[inert] { position: absolute; pointer-events: none; display: none !important;}
      .nav-fade-enter { opacity: 0; transform: translateY(6px); }
      .nav-fade-enter-active { opacity: 1; transform: translateY(0); transition: opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease; }
      .nav-fade-exit { opacity: 1; transform: translateY(0); }
      .nav-fade-exit-active { opacity: 0; transform: translateY(6px); transition: opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease; }
      .nav-slide-enter { opacity: 0; transform: translateX(8%); }
      .nav-slide-enter-active { opacity: 1; transform: translateX(0); transition: transform ${transitionDuration}ms ease, opacity ${transitionDuration}ms ease; }
      .nav-slide-exit { opacity: 1; transform: translateX(0); }
      .nav-slide-exit-active { opacity: 0; transform: translateX(8%); transition: transform ${transitionDuration}ms ease, opacity ${transitionDuration}ms ease; }
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
            setRenders(prev => prev.filter(r => r.entry.uid !== uid || r.state !== 'exit'));
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
  }, [stackSnapshot, transitionDuration, transitionManager]);

  function renderEntry(rec: RenderRecord, idx: number) {
    const topEntry = stackSnapshot[stackSnapshot.length - 1];
    const isTop = topEntry ? rec.entry.uid === topEntry.uid : false;
    const pageOrComp = navLink[rec.entry.key];

    // Check memory cache first
    const cached = memoryManager.get(rec.entry.uid);
    let child: ReactNode = cached;

    if (!cached) {
      if (!pageOrComp) {
        child = (
          <div key={rec.entry.uid} className="navstack-page" inert={!isTop} data-nav-uid={rec.entry.uid}>
            <div style={{ padding: 16 }}>
              <strong>Missing route:</strong> {rec.entry.key}
            </div>
          </div>
        );
      } else if (rec.entry.metadata?.lazy) {
        child = <LazyRouteLoader lazyComponent={rec.entry.metadata.lazy} />;
      } else if (lazyComponents?.[rec.entry.key]) {
        child = <LazyRouteLoader lazyComponent={lazyComponents[rec.entry.key]} />;
      } else if (typeof pageOrComp === "function") {
        const Component = pageOrComp as React.ComponentType<any>;
        child = <Component {...(rec.entry.params ?? {})} />;
      } else if (React.isValidElement(pageOrComp)) {
        child = React.cloneElement(pageOrComp as ReactElement, { ...(rec.entry.params ?? {}) });
      } else {
        child = pageOrComp;
      }

      // Cache the rendered element
      if (child && preserve) {
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

  return (
    <NavContext.Provider value={api}>
      <div className={`navstack-root ${className ?? ""}`} style={{ position: "relative", width: "auto", height: "auto", ...style }}>
        {renders.map((r, idx) => (
          <React.Fragment key={r.entry.uid}>
            {renderEntry(r, idx)}
          </React.Fragment>
        ))}
        {children}
      </div>
    </NavContext.Provider>
  );
}


// Cleanup global registry on hot module reload
if (typeof module !== 'undefined' && (module as any).hot) {
  (module as any).hot.dispose(() => {
    globalRegistry.forEach((_, id) => {
      const api = createApiFor(id);
      api.dispose();
    });
  });
}