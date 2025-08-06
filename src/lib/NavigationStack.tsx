// NavigationStack.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
  ReactElement,
} from "react";

/* -------------------- Types -------------------- */

type NavParams = Record<string, any> | undefined;

export type StackEntry = {
  uid: string;
  key: string;
  params?: NavParams;
};

type StackChangeListener = (stack: StackEntry[]) => void;

type RenderRecord = {
  entry: StackEntry;
  state: "enter" | "idle" | "exit";
  createdAt: number;
};

export type NavStackAPI = {
  id: string;
  push: (rawKey: string, params?: NavParams) => Promise<boolean>;
  replace: (rawKey: string, params?: NavParams) => Promise<boolean>;
  pop: () => Promise<boolean>;
  popUntil: (
    predicate: (entry: StackEntry, idx: number, stack: StackEntry[]) => boolean
  ) => Promise<boolean>;
  popToRoot: () => Promise<boolean>;
  peek: () => StackEntry | undefined;
  getStack: () => StackEntry[];
  length: () => number;
  subscribe: (fn: StackChangeListener) => () => void;
  registerGuard: (guard: GuardFn) => () => void;
};

type NavigationMap = Record<string, React.ComponentType<any> | ReactNode>;

type BuiltinTransition = "fade" | "slide" | "none";

type TransitionRenderer = (props: {
  children: ReactNode;
  state: "enter" | "idle" | "exit";
  index: number;
  isTop: boolean;
}) => ReactNode;

type GuardFn = (action: {
  type: "push" | "replace" | "pop" | "popUntil" | "popToRoot";
  from?: StackEntry | undefined;
  to?: StackEntry | undefined;
  stackSnapshot: StackEntry[];
}) => boolean | Promise<boolean>;

/* -------------------- Registry (global per id) -------------------- */

const globalRegistryRef = { current: {} as Record<string, {
  stack: StackEntry[];
  listeners: Set<StackChangeListener>;
  guards: Set<GuardFn>;
  api?: NavStackAPI;
}> };

/* -------------------- Helpers -------------------- */

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function ensureRegistry() {
  if (!globalRegistryRef.current) globalRegistryRef.current = {};
  return globalRegistryRef.current;
}

function parseRawKey(raw: string, params?: NavParams) {
  const [k, qs] = raw.split("?");
  let merged = params;
  if (qs) {
    try {
      const sp = new URLSearchParams(qs);
      const obj = Object.fromEntries(sp.entries());
      merged = merged ? { ...merged, ...obj } : obj;
    } catch (e) {
      // ignore parse errors
    }
  }
  return { key: k, params: merged };
}

function storageKeyFor(id: string) {
  return `navstack:${id}`;
}

function readPersistedStack(id: string, ttlMs: number = 1000 * 60 * 30): StackEntry[] | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(storageKeyFor(id));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { timestamp: number; entries: StackEntry[] };
    if (!parsed.timestamp || !parsed.entries || !Array.isArray(parsed.entries)) return null;

    const expired = Date.now() - parsed.timestamp > ttlMs;
    if (expired) {
      localStorage.removeItem(storageKeyFor(id));
      return null;
    }

    return parsed.entries.map((p) => ({ uid: uid(), key: p.key, params: p.params }));
  } catch (e) {
    return null;
  }
}

function writePersistedStack(id: string, stack: StackEntry[], ttlMs: number = 1000 * 60 * 30) {
  try {
    if (typeof window === "undefined") return;
    const simplified = {
      timestamp: Date.now(),
      entries: stack.map((s) => ({ key: s.key, params: s.params })),
    };
    localStorage.setItem(storageKeyFor(id), JSON.stringify(simplified));
  } catch (e) {
    // ignore
  }
}

/* -------------------- Registry + API factory -------------------- */

function createOrGetRegistryFor(id: string) {
  const reg = ensureRegistry();
  if (!reg[id]) {
    reg[id] = {
      stack: [],
      listeners: new Set(),
      guards: new Set(),
      api: undefined,
    };
  }
  return reg[id];
}

function createApiFor(id: string): NavStackAPI {
  const regEntry = createOrGetRegistryFor(id);

  function emit() {
    const snapshot = regEntry.stack.slice();
    regEntry.listeners.forEach((l) => {
      try { l(snapshot); } catch (e) { console.warn(e); }
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
    async push(rawKey, params) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const action = {
          type: "push" as const,
          from: regEntry.stack[regEntry.stack.length - 1],
          to: { uid: uid(), key, params: p },
          stackSnapshot: regEntry.stack.slice()
        };
        const ok = await runGuards(action);
        if (!ok) return false;
        regEntry.stack.push({ uid: action.to.uid, key, params: p });
        emit();
        return true;
      });
    },

    async replace(rawKey, params) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const top = regEntry.stack[regEntry.stack.length - 1];
        const action = {
          type: "replace" as const,
          from: top,
          to: { uid: uid(), key, params: p },
          stackSnapshot: regEntry.stack.slice()
        };
        const ok = await runGuards(action);
        if (!ok) return false;
        if (regEntry.stack.length === 0) {
          regEntry.stack.push({ uid: action.to.uid, key, params: p });
        } else {
          regEntry.stack[regEntry.stack.length - 1] = { uid: action.to.uid, key, params: p };
        }
        emit();
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
        emit();
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
        regEntry.stack.splice(i + 1);
        emit();
        return true;
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
          regEntry.stack.splice(1);
          emit();
        }
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
      try { fn(regEntry.stack.slice()); } catch(e) { /* ignore */ }
      return () => regEntry.listeners.delete(fn);
    },

    registerGuard(fn) {
      regEntry.guards.add(fn);
      return () => regEntry.guards.delete(fn);
    }
  };

  regEntry.api = api;
  return api;
}

/* -------------------- Hook -------------------- */

export function useNavStack(id: string) {
  return useMemo(() => createApiFor(id), [id]);
}

/* -------------------- NavigationStack Component -------------------- */

type Props = {
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
};

export default function NavigationStack(props: Props) {
  const {
    id,
    navLink,
    entry,
    onExitStack,
    persist = false,
    transition = "fade",
    transitionDuration = 220,
    renderTransition,
    preserve = false,
    className,
    style,
  } = props;

  const api = useMemo(() => createApiFor(id), [id]);

  // Rehydrate persisted stack or initialize entry
  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = persist ? readPersistedStack(id) : null;
    const reg = createOrGetRegistryFor(id);
    if (persisted && persisted.length > 0) {
      reg.stack.splice(0);
      persisted.forEach((s) => reg.stack.push(s));
      reg.listeners.forEach((l) => { try { l(reg.stack.slice()); } catch(e){} });
    }
    if (reg.stack.length === 0) {
      const { key, params } = parseRawKey(entry);
      reg.stack.push({ uid: uid(), key, params });
      reg.listeners.forEach((l) => { try { l(reg.stack.slice()); } catch(e){} });
    }
  }, [id, entry, persist]);

  const [stackSnapshot, setStackSnapshot] = useState<StackEntry[]>(
    () => createOrGetRegistryFor(id).stack.slice()
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

  /* ---------- transitions & CSS ---------- */
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("navstack-builtins")) return;
    const styleEl = document.createElement("style");
    styleEl.id = "navstack-builtins";
    styleEl.innerHTML = `
      .navstack-root { position: relative; display: block; width: auto; height: auto; }
      .navstack-page { position: relative; display: block; width: 100%; height: auto; overflow: visible; }
      .navstack-hidden { display: none !important; }
      .nav-fade-enter { opacity: 0; transform: translateY(6px); transition: opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease; }
      .nav-fade-enter-active { opacity: 1; transform: translateY(0); }
      .nav-fade-exit { opacity: 1; transform: translateY(0); transition: opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease; }
      .nav-fade-exit-active { opacity: 0; transform: translateY(6px); }
      .nav-slide-enter { opacity: 0; transform: translateX(8%); transition: transform ${transitionDuration}ms ease, opacity ${transitionDuration}ms ease; }
      .nav-slide-enter-active { opacity: 1; transform: translateX(0); }
      .nav-slide-exit { opacity: 1; transform: translateX(0); transition: transform ${transitionDuration}ms ease, opacity ${transitionDuration}ms ease; }
      .nav-slide-exit-active { opacity: 0; transform: translateX(8%); }
    `;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, [transitionDuration]);

  type RenderRecord = {
    entry: StackEntry;
    state: "enter" | "idle" | "exit";
    createdAt: number;
  };
  const [renders, setRenders] = useState<RenderRecord[]>(
    () => stackSnapshot.map((e) => ({ entry: e, state: "idle", createdAt: Date.now() }))
  );

  const transitioningRef = useRef(false);
  useEffect(() => {
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
          startTransitionCleanup();
        }
      }
      return;
    }

    if (added.length > 0) {
      const newRecords = added.map((a) => ({ entry: a, state: "enter" as const, createdAt: Date.now() }));
      setRenders((prev) => prev.concat(newRecords));
      startTransitionCleanup();
    }

    if (removed.length > 0) {
      setRenders((prev) => prev.map((r) => removed.includes(r.entry.uid) ? { ...r, state: "exit", createdAt: Date.now() } : r));
      startTransitionCleanup();
    }
  }, [stackSnapshot]);

  function startTransitionCleanup() {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    setTimeout(() => {
      setRenders((prev) => {
        const next = prev
          .filter((r): r is RenderRecord => r.state !== "exit")
          .map((r) =>
            r.state === "enter"
              ? { ...r, state: "idle" as const }
              : r
          );
        transitioningRef.current = false;
        return next;
      });
    }, transitionDuration + 20);
  }

  function renderEntry(rec: RenderRecord, idx: number) {
    const topEntry = stackSnapshot[stackSnapshot.length - 1];
    const isTop = topEntry ? rec.entry.uid === topEntry.uid : false;
    const pageOrComp = navLink[rec.entry.key];

    if (!pageOrComp) {
      return (
        <div key={rec.entry.uid} className="navstack-page" aria-hidden={!isTop}>
          <div style={{ padding: 16 }}>
            <strong>Missing route:</strong> {rec.entry.key}
          </div>
        </div>
      );
    }

    let child: ReactNode;
    if (typeof pageOrComp === "function") {
      const Component = pageOrComp as React.ComponentType<any>;
      child = <Component {...(rec.entry.params ?? {})} />;
    } else {
      if (React.isValidElement(pageOrComp)) {
        child = React.cloneElement(pageOrComp as ReactElement, { ...(rec.entry.params ?? {}) });
      } else {
        child = pageOrComp;
      }
    }

    const builtInRenderer: TransitionRenderer = ({ children, state: s, isTop: t, index }) => {
      const baseClass = "navstack-page";
      const fadeCls = s === "enter" ? "nav-fade-enter nav-fade-enter-active" : s === "exit" ? "nav-fade-exit nav-fade-exit-active" : "";
      const slideCls = s === "enter" ? "nav-slide-enter nav-slide-enter-active" : s === "exit" ? "nav-slide-exit nav-slide-exit-active" : "";
      const cls = transition === "fade" ? `${baseClass} ${fadeCls}` : transition === "slide" ? `${baseClass} ${slideCls}` : baseClass;
      const hidden = s === "exit" ? false : (!t && !preserve);
      const finalClass = hidden ? "navstack-hidden" : cls;
      return (
        <div key={rec.entry.uid} className={finalClass} aria-hidden={!t}>
          {children}
        </div>
      );
    };

    const renderer = renderTransition ?? builtInRenderer;
    return renderer({ children: child, state: rec.state, index: idx, isTop });
  }

  return (
    <div className={`navstack-root ${className ?? ""}`} style={{ position: "relative", width: "auto", height: "auto", ...style }}>
      {renders.map((r, idx) => (
        <React.Fragment key={r.entry.uid}>
          {renderEntry(r, idx)}
        </React.Fragment>
      ))}
    </div>
  );
}