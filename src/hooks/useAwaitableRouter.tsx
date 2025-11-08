// "use client";
//
// import { useRouter, usePathname } from "next/navigation";
// import { useEffect, useRef, useCallback } from "react";
//
// export function useAwaitableRouter(timeout = 10000) {
//   const router = useRouter();
//   const pathname = usePathname();
//
//   type Timeout = ReturnType<typeof setTimeout>;
//
//   type Pending = {
//     path: string;
//     resolve: () => void;
//     reject: (err?: any) => void;
//     timeoutId: Timeout;
//   };
//
//   const pendingRef = useRef<Pending | null>(null);
//
//   // Resolve if the path matches
//   useEffect(() => {
//     if (pendingRef.current && pathname === pendingRef.current.path) {
//       clearTimeout(pendingRef.current.timeoutId);
//       pendingRef.current.resolve();
//       pendingRef.current = null;
//     }
//   }, [pathname]);
//
//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       if (pendingRef.current) {
//         clearTimeout(pendingRef.current.timeoutId);
//         pendingRef.current.resolve();
//         pendingRef.current = null;
//       }
//     };
//   }, []);
//
//   const pushAndWait = useCallback(
//     (path: string) =>
//       new Promise<void>((resolve, reject) => {
//         if (pathname === path) {
//           resolve();
//           return;
//         }
//
//         if (pendingRef.current) {
//           clearTimeout(pendingRef.current.timeoutId);
//           pendingRef.current.resolve();
//         }
//
//         const timeoutId = setTimeout(() => {
//           if (pendingRef.current?.path === path) {
//             pendingRef.current.resolve();
//             pendingRef.current = null;
//           }
//         }, timeout);
//
//         pendingRef.current = { path, resolve, reject, timeoutId };
//
//         try {
//           router.push(path);
//         } catch (err) {
//           clearTimeout(timeoutId);
//           pendingRef.current = null;
//           reject(err);
//         }
//       }),
//     [pathname, router, timeout]
//   );
//
//   const replaceAndWait = useCallback(
//     (path: string) =>
//       new Promise<void>((resolve, reject) => {
//         if (pathname === path) {
//           resolve();
//           return;
//         }
//
//         if (pendingRef.current) {
//           clearTimeout(pendingRef.current.timeoutId);
//           pendingRef.current.resolve();
//         }
//
//         const timeoutId = setTimeout(() => {
//           if (pendingRef.current?.path === path) {
//             pendingRef.current.resolve();
//             pendingRef.current = null;
//           }
//         }, timeout);
//
//         pendingRef.current = { path, resolve, reject, timeoutId };
//
//         try {
//           router.replace(path);
//         } catch (err) {
//           clearTimeout(timeoutId);
//           pendingRef.current = null;
//           reject(err);
//         }
//       }),
//     [pathname, router, timeout]
//   );
//
//   return { ...router, pushAndWait, replaceAndWait };
// }

"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";

export function useAwaitableRouter(timeout = 10000) {
  const router = useRouter();
  const pathname = usePathname();

  const normalize = (p: string) => p.replace(/\/+$/, "");

  type Timeout = ReturnType<typeof setTimeout>;
  type Pending = {
    expected: string;
    resolve: () => void;
    reject: (e: any) => void;
    timeoutId: Timeout;
  };

  const pendingRef = useRef<Pending | null>(null);

  //
  // 1️⃣ Detect navigation completion:
  // navigation is complete when pathname matches
  //
  useEffect(() => {
    const interval = setInterval(() => {
      const pending = pendingRef.current;
      if (!pending) return;

      const pathMatch =
        normalize(pathname) === normalize(pending.expected);

      if (pathMatch) {
        clearInterval(interval);
        clearTimeout(pending.timeoutId);
        pending.resolve();
        pendingRef.current = null;
      }
    }, 30); // check every frame without overloading CPU

    return () => clearInterval(interval);
  }, [pathname]);

  //
  // Cleanup on unmount
  //
  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timeoutId);
        pendingRef.current.reject(new Error("Unmounted"));
        pendingRef.current = null;
      }
    };
  }, []);

  //
  // 2️⃣ Core navigation wrapper
  //
  const makeAwaitable = useCallback(
    (method: "push" | "replace") =>
      (path: string) =>
        new Promise<void>((resolve, reject) => {
          if (normalize(pathname) === normalize(path)) {
            resolve();
            return;
          }

          if (pendingRef.current) {
            clearTimeout(pendingRef.current.timeoutId);
            pendingRef.current.reject(
              new Error("Cancelled by new navigation")
            );
            pendingRef.current = null;
          }

          const timeoutId = setTimeout(() => {
            if (pendingRef.current?.expected === path) {
              pendingRef.current.reject(
                new Error("Navigation timeout")
              );
              pendingRef.current = null;
            }
          }, timeout);

          pendingRef.current = {
            expected: path,
            resolve,
            reject,
            timeoutId,
          };

          try {
            router[method](path);
          } catch (err) {
            clearTimeout(timeoutId);
            pendingRef.current = null;
            reject(err);
          }
        }),
    [pathname, router, timeout]
  );

  return {
    ...router,
    pushAndWait: makeAwaitable("push"),
    replaceAndWait: makeAwaitable("replace"),
  };
}

