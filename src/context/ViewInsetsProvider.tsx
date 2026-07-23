'use client';

import { useEffect } from 'react';

/**
 * ViewInsetsProvider — keyboard / viewport-inset primitive (Workstream E1).
 *
 * The mobile virtual keyboard shrinks the *visual* viewport but leaves the
 * *layout* viewport unchanged, so anything anchored to the layout viewport
 * (fixed headers at `top:0`, bottom nav/sheets, centered dialogs) ignores the
 * keyboard — the header slides off the top, bottom chrome and dialog inputs get
 * occluded. This mirrors Flutter's `MediaQuery.viewInsets.bottom`.
 *
 * It publishes two CSS variables on `<html>` (the "variables are the contract"
 * pattern, like `--ax-header-*`), rAF-throttled from the VisualViewport API:
 *
 *   --ax-keyboard-inset      occluded bottom height (px) = viewInsets.bottom
 *   --ax-viewport-offset-top visualViewport.offsetTop (px) — the header's real
 *                            enemy on iOS (how far the visual viewport scrolled
 *                            down inside the layout viewport)
 *
 * Both default to `0px` in consumers, so this ships dark and creates zero
 * coupling: consumers only *read* the vars. No React context is exposed on
 * purpose — the contract is the CSS variables, not a hook.
 *
 * Fully cross-browser (iOS Safari + Android Chrome) and does NOT change global
 * `vh`/`dvh` semantics (unlike the `interactive-widget=resizes-content` meta,
 * which is deliberately avoided — see Workstream E in REFACTOR_PLAN.md).
 */
export function ViewInsetsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;
    const root = document.documentElement;

    // No VisualViewport API (very old browsers / SSR): leave the fallbacks (0px).
    if (!vv) return;

    let frame = 0;

    const apply = () => {
      frame = 0;
      // Occluded bottom strip: layout height minus the visible bottom edge.
      // Clamp small negatives away (rounding / URL-bar transitions).
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--ax-keyboard-inset', `${Math.round(inset)}px`);
      root.style.setProperty('--ax-viewport-offset-top', `${Math.round(vv.offsetTop)}px`);
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    apply(); // initialize immediately
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      // Reset so a remount doesn't inherit a stale keyboard inset.
      root.style.removeProperty('--ax-keyboard-inset');
      root.style.removeProperty('--ax-viewport-offset-top');
    };
  }, []);

  return <>{children}</>;
}

export default ViewInsetsProvider;
