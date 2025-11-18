"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";

export function useAwaitableRouter(timeout = 10000) {
  const router = useRouter();
  const pathname = usePathname();

  /** Normalize path: always "/" + trim slashes */
  const normalize = (p: string) => {
    if (!p) return "/";
    const cleaned = p.replace(/\/+$/, "");
    return cleaned === "" ? "/" : cleaned;
  };

  type NavResult = { success: boolean; error?: string };
  type Pending = {
    expected: string;
    resolve: (v: NavResult) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  };

  const pendingRef = useRef<Pending | null>(null);

  /* ---------------------------------------------------------
   *  Navigation Completion Detection
   * --------------------------------------------------------- */
  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;

    if (normalize(pathname) === pending.expected) {
      clearTimeout(pending.timeoutId);
      pending.resolve({ success: true });
      pendingRef.current = null;
    }
  }, [pathname]);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      const pending = pendingRef.current;
      if (!pending) return;

      clearTimeout(pending.timeoutId);
      pending.resolve({ success: false, error: "Component unmounted" });
      pendingRef.current = null;
    };
  }, []);

  /* ---------------------------------------------------------
   *  INTERNAL: create awaitable push/replace
   * --------------------------------------------------------- */
  const makeAwaitable = useCallback(
    (method: "push" | "replace") =>
      async (path: string): Promise<NavResult> => {
        const current = normalize(pathname);
        const target = normalize(path);

        if (current === target) return { success: true };

        // Cancel previous pending navigation
        const old = pendingRef.current;
        if (old) {
          clearTimeout(old.timeoutId);
          old.resolve({
            success: false,
            error: "Navigation cancelled by new navigation",
          });
          pendingRef.current = null;
        }

        return new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            const p = pendingRef.current;
            if (p && p.expected === target) {
              p.resolve({
                success: false,
                error: `Navigation timeout after ${timeout}ms`,
              });
              pendingRef.current = null;
            }
          }, timeout);

          pendingRef.current = { expected: target, timeoutId, resolve };

          try {
            router[method](path);
          } catch (err) {
            clearTimeout(timeoutId);
            pendingRef.current = null;
            resolve({
              success: false,
              error: err instanceof Error ? err.message : "Navigation failed",
            });
          }
        });
      },
    [pathname, router, timeout]
  );

  /* ---------------------------------------------------------
   *  Open new window → wait → close current
   * --------------------------------------------------------- */
  const newWindowCloseCurrentWait = useCallback(
    async (
      url: string,
      target: string = "_blank",
      features: string = "noopener,noreferrer"
    ): Promise<NavResult> => {
      return new Promise((resolve) => {
        let resolved = false;

        const complete = (success: boolean, error?: string) => {
          if (resolved) return;
          resolved = true;
          resolve({ success, error });
        };

        try {
          const newWin = window.open(url, target, features);
          if (!newWin) {
            return complete(false, "Popup blocked");
          }

          const done = () => {
            try {
              window.close();
              complete(true);
            } catch {
              complete(false, "Failed to close current window");
            }
          };

          newWin.addEventListener("load", () => {
            setTimeout(done, 120);
          });

          newWin.addEventListener("error", () => {
            complete(false, "New window failed to load");
          });

          // Fallback
          setTimeout(() => {
            if (!resolved) {
              try {
                window.close();
                complete(true);
              } catch {
                complete(false, "Timeout closing window");
              }
            }
          }, 3000);
        } catch (err) {
          complete(false, err instanceof Error ? err.message : "Unknown error");
        }
      });
    },
    []
  );

  /* ---------------------------------------------------------
   *  Back navigation (SPA popstate)
   * --------------------------------------------------------- */
  const backAndWait = useCallback(
    async (): Promise<NavResult> => {
      return new Promise((resolve) => {
        let settled = false;

        const cleanup = () => {
          window.removeEventListener("popstate", handle);
          clearTimeout(tid);
        };

        const done = (success: boolean, error?: string) => {
          if (!settled) {
            settled = true;
            cleanup();
            resolve({ success, error });
          }
        };

        const handle = () => done(true);

        const tid = setTimeout(
          () => done(false, `Back navigation timeout after ${timeout}ms`),
          timeout
        );

        window.addEventListener("popstate", handle);

        try {
          router.back();
        } catch (err) {
          done(false, err instanceof Error ? err.message : "Back failed");
        }
      });
    },
    [router, timeout]
  );

  /* ---------------------------------------------------------
   *  Push with state + wait
   * --------------------------------------------------------- */
  const pushWithStateAndWait = useCallback(
    async (path: string, state: Record<string, any>): Promise<NavResult> => {
      const target = normalize(path);
      const current = normalize(pathname);

      if (current === target) return { success: true };

      // Cancel previous navigation
      const old = pendingRef.current;
      if (old) {
        clearTimeout(old.timeoutId);
        old.resolve({ success: false, error: "Navigation cancelled" });
        pendingRef.current = null;
      }

      return new Promise((resolve) => {
        const timeoutId = setTimeout(
          () => {
            const p = pendingRef.current;
            if (p && p.expected === target) {
              p.resolve({
                success: false,
                error: `Navigation timeout after ${timeout}ms`,
              });
              pendingRef.current = null;
            }
          },
          timeout
        );

        pendingRef.current = { expected: target, resolve, timeoutId };

        try {
          window.history.pushState(state, "", path);
          router.push(path);
        } catch (err) {
          clearTimeout(timeoutId);
          pendingRef.current = null;
          resolve({
            success: false,
            error:
              err instanceof Error ? err.message : "Navigation with state failed",
          });
        }
      });
    },
    [pathname, router, timeout]
  );

  /* ---------------------------------------------------------
   *  Reload & wait
   * --------------------------------------------------------- */
  const reloadAndWait = useCallback(
    async (): Promise<NavResult> => {
      return new Promise((resolve) => {
        let done = false;

        const complete = (success: boolean, error?: string) => {
          if (done) return;
          done = true;
          cleanup();
          resolve({ success, error });
        };

        const cleanup = () => {
          window.removeEventListener("load", handleLoad);
          window.removeEventListener("error", handleErr);
          clearTimeout(tid);
        };

        const handleLoad = () => complete(true);
        const handleErr = () => complete(false, "Page failed to load");

        const tid = setTimeout(
          () => complete(false, `Reload timeout after ${timeout}ms`),
          timeout
        );

        window.addEventListener("load", handleLoad);
        window.addEventListener("error", handleErr);

        try {
          router.refresh();
        } catch {
          window.location.reload();
        }
      });
    },
    [router, timeout]
  );

  /* ---------------------------------------------------------
   *  Prefetch
   * --------------------------------------------------------- */
  const prefetchAndWait = useCallback(
    async (path: string): Promise<NavResult> => {
      try {
        await router.prefetch(path);
        // Next.js gives no event — minimal safe delay
        await new Promise((r) => setTimeout(r, 80));
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Prefetch failed",
        };
      }
    },
    [router]
  );

  /* ---------------------------------------------------------
   *  Exposed API
   * --------------------------------------------------------- */
  return {
    ...router,
    pushAndWait: makeAwaitable("push"),
    replaceAndWait: makeAwaitable("replace"),
    backAndWait,
    pushWithStateAndWait,
    newWindowCloseCurrentWait,
    reloadAndWait,
    prefetchAndWait,
    hasPendingNavigation: () => pendingRef.current != null,
    getCurrentPath: () => pathname,
  };
}
