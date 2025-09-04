"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";

export function useAwaitableRouter(timeout = 10000) {
  const router = useRouter();
  const pathname = usePathname();

  type Timeout = ReturnType<typeof setTimeout>;

  type Pending = {
    path: string;
    resolve: () => void;
    reject: (err?: any) => void;
    timeoutId: Timeout;
  };

  const pendingRef = useRef<Pending | null>(null);

  // Resolve if the path matches
  useEffect(() => {
    if (pendingRef.current && pathname === pendingRef.current.path) {
      clearTimeout(pendingRef.current.timeoutId);
      pendingRef.current.resolve();
      pendingRef.current = null;
    }
  }, [pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timeoutId);
        pendingRef.current.resolve();
        pendingRef.current = null;
      }
    };
  }, []);

  const pushAndWait = useCallback(
    (path: string) =>
      new Promise<void>((resolve, reject) => {
        if (pathname === path) {
          resolve();
          return;
        }

        if (pendingRef.current) {
          clearTimeout(pendingRef.current.timeoutId);
          pendingRef.current.reject(new Error("Navigation superseded"));
        }

        const timeoutId = setTimeout(() => {
          if (pendingRef.current?.path === path) {
            pendingRef.current.resolve();
            pendingRef.current = null;
          }
        }, timeout);

        pendingRef.current = { path, resolve, reject, timeoutId };

        try {
          router.push(path);
        } catch (err) {
          clearTimeout(timeoutId);
          pendingRef.current = null;
          reject(err);
        }
      }),
    [pathname, router, timeout]
  );

  const replaceAndWait = useCallback(
    (path: string) =>
      new Promise<void>((resolve, reject) => {
        if (pathname === path) {
          resolve();
          return;
        }

        if (pendingRef.current) {
          clearTimeout(pendingRef.current.timeoutId);
          pendingRef.current.reject(new Error("Navigation superseded"));
        }

        const timeoutId = setTimeout(() => {
          if (pendingRef.current?.path === path) {
            pendingRef.current.resolve();
            pendingRef.current = null;
          }
        }, timeout);

        pendingRef.current = { path, resolve, reject, timeoutId };

        try {
          router.replace(path);
        } catch (err) {
          clearTimeout(timeoutId);
          pendingRef.current = null;
          reject(err);
        }
      }),
    [pathname, router, timeout]
  );

  return { ...router, pushAndWait, replaceAndWait };
}
