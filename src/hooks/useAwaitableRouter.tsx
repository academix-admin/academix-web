// "use client";
//
// import { useRouter, usePathname } from "next/navigation";
// import { useEffect, useRef, useCallback } from "react";
//
// export function useAwaitableRouter(timeout = 10000) {
//   const router = useRouter();
//   const pathname = usePathname();
//
//   /** Normalize path: always "/" + trim slashes */
//   const normalize = (p: string) => {
//     if (!p) return "/";
//     const cleaned = p.replace(/\/+$/, "");
//     return cleaned === "" ? "/" : cleaned;
//   };
//
//   type NavResult = { success: boolean; error?: string };
//   type Pending = {
//     expected: string;
//     resolve: (v: NavResult) => void;
//     timeoutId: ReturnType<typeof setTimeout>;
//   };
//
//   const pendingRef = useRef<Pending | null>(null);
//
//   /* ---------------------------------------------------------
//    *  Navigation Completion Detection
//    * --------------------------------------------------------- */
//   useEffect(() => {
//     const pending = pendingRef.current;
//     if (!pending) return;
//
//     if (normalize(pathname) === pending.expected) {
//       clearTimeout(pending.timeoutId);
//       pending.resolve({ success: true });
//       pendingRef.current = null;
//     }
//   }, [pathname]);
//
//   /* Cleanup on unmount */
//   useEffect(() => {
//     return () => {
//       const pending = pendingRef.current;
//       if (!pending) return;
//
//       clearTimeout(pending.timeoutId);
//       pending.resolve({ success: false, error: "Component unmounted" });
//       pendingRef.current = null;
//     };
//   }, []);
//
//   /* ---------------------------------------------------------
//    *  INTERNAL: create awaitable push/replace
//    * --------------------------------------------------------- */
//   const makeAwaitable = useCallback(
//     (method: "push" | "replace") =>
//       async (path: string): Promise<NavResult> => {
//         const current = normalize(pathname);
//         const target = normalize(path);
//
//         if (current === target) return { success: true };
//
//         // Cancel previous pending navigation
//         const old = pendingRef.current;
//         if (old) {
//           clearTimeout(old.timeoutId);
//           old.resolve({
//             success: false,
//             error: "Navigation cancelled by new navigation",
//           });
//           pendingRef.current = null;
//         }
//
//         return new Promise((resolve) => {
//           const timeoutId = setTimeout(() => {
//             const p = pendingRef.current;
//             if (p && p.expected === target) {
//               p.resolve({
//                 success: false,
//                 error: `Navigation timeout after ${timeout}ms`,
//               });
//               pendingRef.current = null;
//             }
//           }, timeout);
//
//           pendingRef.current = { expected: target, timeoutId, resolve };
//
//           try {
//             router[method](path);
//           } catch (err) {
//             clearTimeout(timeoutId);
//             pendingRef.current = null;
//             resolve({
//               success: false,
//               error: err instanceof Error ? err.message : "Navigation failed",
//             });
//           }
//         });
//       },
//     [pathname, router, timeout]
//   );
//
//   /* ---------------------------------------------------------
//    *  Open new window → wait → close current
//    * --------------------------------------------------------- */
//   const newWindowCloseCurrentWait = useCallback(
//     async (
//       url: string,
//       target: string = "_blank",
//       features: string = "noopener,noreferrer"
//     ): Promise<NavResult> => {
//       return new Promise((resolve) => {
//         let resolved = false;
//
//         const complete = (success: boolean, error?: string) => {
//           if (resolved) return;
//           resolved = true;
//           resolve({ success, error });
//         };
//
//         try {
//           const newWin = window.open(url, target, features);
//           if (!newWin) {
//             return complete(false, "Popup blocked");
//           }
//
//           const done = () => {
//             try {
//               window.close();
//               complete(true);
//             } catch {
//               complete(false, "Failed to close current window");
//             }
//           };
//
//           newWin.addEventListener("load", () => {
//             setTimeout(done, 120);
//           });
//
//           newWin.addEventListener("error", () => {
//             complete(false, "New window failed to load");
//           });
//
//           // Fallback
//           setTimeout(() => {
//             if (!resolved) {
//               try {
//                 window.close();
//                 complete(true);
//               } catch {
//                 complete(false, "Timeout closing window");
//               }
//             }
//           }, 3000);
//         } catch (err) {
//           complete(false, err instanceof Error ? err.message : "Unknown error");
//         }
//       });
//     },
//     []
//   );
//
//   /* ---------------------------------------------------------
//    *  Redirect the current window (_self) and wait for load
//    * --------------------------------------------------------- */
//   const redirectSelfAndWait = useCallback(
//     async (url: string): Promise<NavResult> => {
//       return new Promise((resolve) => {
//         let settled = false;
//
//         const complete = (success: boolean, error?: string) => {
//           if (settled) return;
//           settled = true;
//           cleanup();
//           resolve({ success, error });
//         };
//
//         const cleanup = () => {
//           window.removeEventListener("load", handleLoad);
//           window.removeEventListener("error", handleErr);
//           clearTimeout(tid);
//         };
//
//         const handleLoad = () => complete(true);
//         const handleErr = () => complete(false, "Redirect failed");
//
//         // Timeout safety
//         const tid = setTimeout(
//           () => complete(false, `Redirect timeout after ${timeout}ms`),
//           timeout
//         );
//
//         window.addEventListener("load", handleLoad);
//         window.addEventListener("error", handleErr);
//
//         try {
//           // This cannot be blocked by browsers
//           window.location.href = url;
//         } catch (err) {
//           complete(false, err instanceof Error ? err.message : "Unknown redirect error");
//         }
//       });
//     },
//     [timeout]
//   );
//
//
//   /* ---------------------------------------------------------
//    *  Back navigation (SPA popstate)
//    * --------------------------------------------------------- */
//   const backAndWait = useCallback(
//     async (): Promise<NavResult> => {
//       return new Promise((resolve) => {
//         let settled = false;
//
//         const cleanup = () => {
//           window.removeEventListener("popstate", handle);
//           clearTimeout(tid);
//         };
//
//         const done = (success: boolean, error?: string) => {
//           if (!settled) {
//             settled = true;
//             cleanup();
//             resolve({ success, error });
//           }
//         };
//
//         const handle = () => done(true);
//
//         const tid = setTimeout(
//           () => done(false, `Back navigation timeout after ${timeout}ms`),
//           timeout
//         );
//
//         window.addEventListener("popstate", handle);
//
//         try {
//           router.back();
//         } catch (err) {
//           done(false, err instanceof Error ? err.message : "Back failed");
//         }
//       });
//     },
//     [router, timeout]
//   );
//
//   /* ---------------------------------------------------------
//    *  Push with state + wait
//    * --------------------------------------------------------- */
//   const pushWithStateAndWait = useCallback(
//     async (path: string, state: Record<string, any>): Promise<NavResult> => {
//       const target = normalize(path);
//       const current = normalize(pathname);
//
//       if (current === target) return { success: true };
//
//       // Cancel previous navigation
//       const old = pendingRef.current;
//       if (old) {
//         clearTimeout(old.timeoutId);
//         old.resolve({ success: false, error: "Navigation cancelled" });
//         pendingRef.current = null;
//       }
//
//       return new Promise((resolve) => {
//         const timeoutId = setTimeout(
//           () => {
//             const p = pendingRef.current;
//             if (p && p.expected === target) {
//               p.resolve({
//                 success: false,
//                 error: `Navigation timeout after ${timeout}ms`,
//               });
//               pendingRef.current = null;
//             }
//           },
//           timeout
//         );
//
//         pendingRef.current = { expected: target, resolve, timeoutId };
//
//         try {
//           window.history.pushState(state, "", path);
//           router.push(path);
//         } catch (err) {
//           clearTimeout(timeoutId);
//           pendingRef.current = null;
//           resolve({
//             success: false,
//             error:
//               err instanceof Error ? err.message : "Navigation with state failed",
//           });
//         }
//       });
//     },
//     [pathname, router, timeout]
//   );
//
//   /* ---------------------------------------------------------
//    *  Reload & wait
//    * --------------------------------------------------------- */
//   const reloadAndWait = useCallback(
//     async (): Promise<NavResult> => {
//       return new Promise((resolve) => {
//         let done = false;
//
//         const complete = (success: boolean, error?: string) => {
//           if (done) return;
//           done = true;
//           cleanup();
//           resolve({ success, error });
//         };
//
//         const cleanup = () => {
//           window.removeEventListener("load", handleLoad);
//           window.removeEventListener("error", handleErr);
//           clearTimeout(tid);
//         };
//
//         const handleLoad = () => complete(true);
//         const handleErr = () => complete(false, "Page failed to load");
//
//         const tid = setTimeout(
//           () => complete(false, `Reload timeout after ${timeout}ms`),
//           timeout
//         );
//
//         window.addEventListener("load", handleLoad);
//         window.addEventListener("error", handleErr);
//
//         try {
//           router.refresh();
//         } catch {
//           window.location.reload();
//         }
//       });
//     },
//     [router, timeout]
//   );
//
//   /* ---------------------------------------------------------
//    *  Prefetch
//    * --------------------------------------------------------- */
//   const prefetchAndWait = useCallback(
//     async (path: string): Promise<NavResult> => {
//       try {
//         await router.prefetch(path);
//         // Next.js gives no event — minimal safe delay
//         await new Promise((r) => setTimeout(r, 80));
//         return { success: true };
//       } catch (err) {
//         return {
//           success: false,
//           error: err instanceof Error ? err.message : "Prefetch failed",
//         };
//       }
//     },
//     [router]
//   );
//
//   /* ---------------------------------------------------------
//    *  Exposed API
//    * --------------------------------------------------------- */
//   return {
//     ...router,
//     pushAndWait: makeAwaitable("push"),
//     replaceAndWait: makeAwaitable("replace"),
//     backAndWait,
//     pushWithStateAndWait,
//     newWindowCloseCurrentWait,
//     redirectSelfAndWait,
//     reloadAndWait,
//     prefetchAndWait,
//     hasPendingNavigation: () => pendingRef.current != null,
//     getCurrentPath: () => pathname,
//   };
// }
"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";

export interface NavigationResult {
  success: boolean;
  error?: string;
}

interface PendingNavigation {
  expected: string;
  resolve: (result: NavigationResult) => void;
  timeoutId: ReturnType<typeof setTimeout>;
  startTime: number;
  navigationId: string;
  method: string;
}

interface UseAwaitableRouterOptions {
  timeout?: number;
  enableLogging?: boolean;
}

export function useAwaitableRouter(options: UseAwaitableRouterOptions = {}) {
  const { timeout = 10000, enableLogging = false } = options;
  const router = useRouter();
  const pathname = usePathname();

  const pendingRef = useRef<PendingNavigation | null>(null);
  const navigationCounterRef = useRef(0);

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableLogging) {
        console.log(`[useAwaitableRouter] ${message}`, data ?? "");
      }
    },
    [enableLogging]
  );

  /** Enhanced path normalization */
  const normalize = useCallback((p: string) => {
    if (!p) return "/";

    // Remove query parameters and hash for comparison
    const withoutQuery = p.split('?')[0].split('#')[0];

    // Normalize path with proper trailing slash handling
    const cleaned = withoutQuery.replace(/\/+$/, "").replace(/^\/+/, "/");
    const normalized = cleaned === "" ? "/" : cleaned;

    return normalized;
  }, []);

  /* ---------------------------------------------------------
   *  Navigation Completion Detection
   * --------------------------------------------------------- */
  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;

    const currentNormalized = normalize(pathname);
    const expectedNormalized = normalize(pending.expected);

    log(`Navigation check`, {
      current: currentNormalized,
      expected: expectedNormalized,
      match: currentNormalized === expectedNormalized,
      pendingId: pending.navigationId,
      method: pending.method
    });

    if (currentNormalized === expectedNormalized) {
      const duration = Date.now() - pending.startTime;
      log(`Navigation completed`, {
        navigationId: pending.navigationId,
        duration,
        method: pending.method
      });
      clearTimeout(pending.timeoutId);
      pending.resolve({ success: true });
      pendingRef.current = null;
    }
  }, [pathname, normalize, log]);

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
   *  Safe cleanup of pending navigation
   * --------------------------------------------------------- */
  const cleanupPending = useCallback((result?: NavigationResult) => {
    const pending = pendingRef.current;
    if (pending) {
      log(`Cleaning up pending navigation`, {
        navigationId: pending.navigationId,
        reason: result?.error
      });
      clearTimeout(pending.timeoutId);
      if (result) {
        pending.resolve(result);
      }
      pendingRef.current = null;
    }
  }, [log]);

  /* ---------------------------------------------------------
   *  ENHANCED: create awaitable push/replace
   * --------------------------------------------------------- */
  const makeAwaitable = useCallback(
    (method: "push" | "replace") =>
      async (path: string): Promise<NavigationResult> => {
        const current = normalize(pathname);
        const target = normalize(path);

        log(`Starting ${method}`, { from: current, to: target });

        if (current === target) {
          log(`Already on target path`, { path: target });
          return { success: true };
        }

        // Cancel previous pending navigation
        cleanupPending({
          success: false,
          error: "Navigation cancelled by new navigation",
        });

        const navigationId = `nav-${++navigationCounterRef.current}-${Date.now()}-${method}`;

        return new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            const p = pendingRef.current;
            if (p && p.navigationId === navigationId) {
              log(`Navigation timeout`, {
                navigationId,
                timeout,
                method
              });
              p.resolve({
                success: false,
                error: `Navigation timeout after ${timeout}ms`,
              });
              pendingRef.current = null;
            }
          }, timeout);

          pendingRef.current = {
            expected: target,
            timeoutId,
            resolve,
            startTime: Date.now(),
            navigationId,
            method
          };

          try {
            log(`Calling router.${method}`, { path, navigationId });
            router[method](path);

            // Additional safety: check if we're still pending after a short delay
            setTimeout(() => {
              const stillPending = pendingRef.current?.navigationId === navigationId;
              if (stillPending) {
                const currentPath = normalize(window.location.pathname);
                const currentPathname = normalize(pathname);

                log(`Safety check`, {
                  navigationId,
                  windowLocation: currentPath,
                  pathname: currentPathname,
                  target,
                  matches: currentPath === target || currentPathname === target
                });

                if (currentPath === target || currentPathname === target) {
                  log(`Safety check: navigation completed but not detected`, { navigationId });
                  clearTimeout(timeoutId);
                  resolve({ success: true });
                  pendingRef.current = null;
                }
              }
            }, 150);

          } catch (err) {
            log(`Router.${method} error`, { error: err, navigationId });
            clearTimeout(timeoutId);
            pendingRef.current = null;
            resolve({
              success: false,
              error: err instanceof Error ? err.message : "Navigation failed",
            });
          }
        });
      },
    [pathname, router, timeout, normalize, log, cleanupPending]
  );

  /* ---------------------------------------------------------
   *  Enhanced replace with additional safety
   * --------------------------------------------------------- */
  const replaceAndWaitEnhanced = useCallback(
    async (path: string): Promise<NavigationResult> => {
      const result = await makeAwaitable("replace")(path);

      if (!result.success) {
        log(`Replace failed, falling back to push`, {
          error: result.error,
          path
        });
        // Fallback to push if replace fails
        return await makeAwaitable("push")(path);
      }

      return result;
    },
    [makeAwaitable, log]
  );

  /* ---------------------------------------------------------
   *  Open new window → wait → close current
   * --------------------------------------------------------- */
  const newWindowCloseCurrentWait = useCallback(
    async (
      url: string,
      target: string = "_blank",
      features: string = "noopener,noreferrer,popup"
    ): Promise<NavigationResult> => {
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
            return complete(false, "Popup blocked by browser");
          }

          // Check if window was closed immediately (some blockers do this)
          if (newWin.closed) {
            return complete(false, "New window was immediately closed");
          }

          const cleanup = () => {
            newWin.removeEventListener("load", handleLoad);
            newWin.removeEventListener("error", handleError);
            clearTimeout(fallbackTimeout);
            clearInterval(closedCheckInterval);
          };

          const handleLoad = () => {
            cleanup();
            setTimeout(() => {
              try {
                window.close();
                complete(true);
              } catch {
                complete(true); // Still success even if we can't close current window
              }
            }, 150);
          };

          const handleError = () => {
            cleanup();
            complete(false, "New window failed to load");
          };

          newWin.addEventListener("load", handleLoad);
          newWin.addEventListener("error", handleError);

          // Fallback for cases where events don't fire
          const fallbackTimeout = setTimeout(() => {
            if (!resolved) {
              cleanup();
              try {
                if (!newWin.closed) {
                  // Window opened successfully
                  window.close();
                  complete(true);
                } else {
                  complete(false, "New window closed unexpectedly");
                }
              } catch {
                complete(true);
              }
            }
          }, 3000);

          // Monitor for window being closed by user
          const closedCheckInterval = setInterval(() => {
            if (newWin.closed && !resolved) {
              cleanup();
              complete(false, "New window was closed by user");
            }
          }, 500);

        } catch (error) {
          complete(false, error instanceof Error ? error.message : "Unknown error opening window");
        }
      });
    },
    [log]
  );

  /* ---------------------------------------------------------
   *  Enhanced redirect with better error handling
   * --------------------------------------------------------- */
  const redirectSelfAndWait = useCallback(
    async (url: string): Promise<NavigationResult> => {
      return new Promise((resolve) => {
        let settled = false;

        const complete = (success: boolean, error?: string) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve({ success, error });
        };

        const cleanup = () => {
          window.removeEventListener("load", handleLoad);
          window.removeEventListener("error", handleError);
          window.removeEventListener("beforeunload", handleBeforeUnload);
          clearTimeout(timeoutId);
        };

        const handleLoad = () => complete(true);
        const handleError = () => complete(false, "Redirect failed to load");
        const handleBeforeUnload = () => {
          log("Redirect navigation started");
        };

        const timeoutId = setTimeout(
          () => complete(false, `Redirect timeout after ${timeout}ms`),
          timeout
        );

        window.addEventListener("load", handleLoad);
        window.addEventListener("error", handleError);
        window.addEventListener("beforeunload", handleBeforeUnload);

        try {
          window.location.href = url;
        } catch (error) {
          complete(false, error instanceof Error ? error.message : "Unknown redirect error");
        }
      });
    },
    [timeout, log]
  );

  /* ---------------------------------------------------------
   *  Back navigation with history state check
   * --------------------------------------------------------- */
  const backAndWait = useCallback(
    async (): Promise<NavigationResult> => {
      // Can't go back if we're at the beginning of history
      if (window.history.state?.idx === 0) {
        return { success: false, error: "No history to go back to" };
      }

      return new Promise((resolve) => {
        let settled = false;

        const cleanup = () => {
          window.removeEventListener("popstate", handlePopState);
          clearTimeout(timeoutId);
        };

        const complete = (success: boolean, error?: string) => {
          if (!settled) {
            settled = true;
            cleanup();
            resolve({ success, error });
          }
        };

        const handlePopState = () => complete(true);

        const timeoutId = setTimeout(
          () => complete(false, `Back navigation timeout after ${timeout}ms`),
          timeout
        );

        window.addEventListener("popstate", handlePopState);

        try {
          router.back();
        } catch (error) {
          complete(false, error instanceof Error ? error.message : "Back navigation failed");
        }
      });
    },
    [router, timeout]
  );

  /* ---------------------------------------------------------
   *  Enhanced stateful navigation
   * --------------------------------------------------------- */
  const pushWithStateAndWait = useCallback(
    async (path: string, state: Record<string, any> = {}): Promise<NavigationResult> => {
      const targetPath = normalize(path);
      const currentPath = normalize(pathname);

      if (currentPath === targetPath) {
        return { success: true };
      }

      cleanupPending({
        success: false,
        error: "Navigation cancelled by new navigation",
      });

      const navigationId = `nav-state-${++navigationCounterRef.current}-${Date.now()}`;

      return new Promise((resolve) => {
        const timeoutId = setTimeout(
          () => {
            const pending = pendingRef.current;
            if (pending && pending.navigationId === navigationId) {
              pending.resolve({
                success: false,
                error: `Navigation timeout after ${timeout}ms`,
              });
              pendingRef.current = null;
            }
          },
          timeout
        );

        pendingRef.current = {
          expected: targetPath,
          resolve,
          timeoutId,
          startTime: Date.now(),
          navigationId,
          method: 'pushWithState'
        };

        try {
          // Use both methods for maximum compatibility
          window.history.pushState(state, "", path);
          router.push(path);

          // Safety check
          setTimeout(() => {
            const stillPending = pendingRef.current?.navigationId === navigationId;
            if (stillPending) {
              const currentPath = normalize(window.location.pathname);
              if (currentPath === targetPath) {
                log(`State navigation safety check: completed`, { navigationId });
                clearTimeout(timeoutId);
                resolve({ success: true });
                pendingRef.current = null;
              }
            }
          }, 150);

        } catch (error) {
          clearTimeout(timeoutId);
          pendingRef.current = null;
          resolve({
            success: false,
            error: error instanceof Error ? error.message : "Navigation with state failed",
          });
        }
      });
    },
    [pathname, router, timeout, normalize, cleanupPending, log]
  );

  /* ---------------------------------------------------------
   *  Enhanced reload with force option
   * --------------------------------------------------------- */
  const reloadAndWait = useCallback(
    async (forceHardReload = false): Promise<NavigationResult> => {
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
          window.removeEventListener("error", handleError);
          clearTimeout(timeoutId);
        };

        const handleLoad = () => complete(true);
        const handleError = () => complete(false, "Page failed to load after reload");

        const timeoutId = setTimeout(
          () => complete(false, `Reload timeout after ${timeout}ms`),
          timeout
        );

        window.addEventListener("load", handleLoad);
        window.addEventListener("error", handleError);

        try {
          if (forceHardReload) {
            window.location.reload();
          } else {
            router.refresh();
            // For router.refresh(), we need a different completion detection
            setTimeout(() => complete(true), 100);
          }
        } catch (error) {
          // Fallback to hard reload
          window.location.reload();
        }
      });
    },
    [router, timeout]
  );

  /* ---------------------------------------------------------
   *  Enhanced prefetch with retry logic
   * --------------------------------------------------------- */
  const prefetchAndWait = useCallback(
    async (path: string, retries = 2): Promise<NavigationResult> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          await router.prefetch(path);
          // Small delay to ensure prefetch is processed
          await new Promise(resolve => setTimeout(resolve, 100));
          return { success: true };
        } catch (error) {
          lastError = error as Error;
          log(`Prefetch attempt ${attempt + 1} failed`, { path, error });

          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
          }
        }
      }

      return {
        success: false,
        error: lastError?.message || "Prefetch failed after all retries",
      };
    },
    [router, log]
  );

  /* ---------------------------------------------------------
   *  Additional utility methods
   * --------------------------------------------------------- */
  const getPendingNavigation = useCallback(() => {
    const pending = pendingRef.current;
    return pending ? {
      expected: pending.expected,
      startTime: pending.startTime,
      elapsed: Date.now() - pending.startTime,
      navigationId: pending.navigationId,
      method: pending.method
    } : null;
  }, []);

  const cancelPendingNavigation = useCallback((reason = "Cancelled by user") => {
    cleanupPending({ success: false, error: reason });
  }, [cleanupPending]);

  const forceClearPending = useCallback(() => {
    cleanupPending({ success: false, error: "Manually cleared" });
  }, [cleanupPending]);

  /* ---------------------------------------------------------
   *  Exposed API
   * --------------------------------------------------------- */
  return {
    // Original router methods
    ...router,

    // Awaitable navigation methods
    pushAndWait: makeAwaitable("push"),
    replaceAndWait: replaceAndWaitEnhanced,
    backAndWait,
    pushWithStateAndWait,

    // Window management
    newWindowCloseCurrentWait,
    redirectSelfAndWait,

    // Page control
    reloadAndWait,
    prefetchAndWait,

    // Utility methods
    hasPendingNavigation: () => pendingRef.current != null,
    getPendingNavigation,
    cancelPendingNavigation,
    forceClearPending,
    getCurrentPath: () => pathname,
    normalizePath: normalize,
  };
}

// Type exports
export type { UseAwaitableRouterOptions };