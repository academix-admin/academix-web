"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface PinEdges {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

interface PinnedHeaderProps {
  children: React.ReactNode;
  offsetTop?: number;
  offsetLeft?: number;
  offsetBottom?: number;
  offsetRight?: number;
  className?: string;
  background?: string;
  showShadowWhenPinned?: boolean;
  pin?: PinEdges;
  zIndex?: number;
  onPinChange?: (isPinned: boolean) => void;
  useSticky?: boolean;
  scrollRoot?: "parent" | "window" | HTMLElement;
}

const PINNED_STYLE_ID = "pinned-header-enhanced-style";

interface CSSCustomProperties extends React.CSSProperties {
  '--pinned-top'?: string | number;
  '--pinned-bg'?: string;
  '--pinned-shadow'?: string;
  [key: `--${string}`]: string | number | undefined;
}

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;

  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if (
      ["auto", "scroll"].includes(style.overflow) ||
      ["auto", "scroll"].includes(style.overflowY) ||
      ["auto", "scroll"].includes(style.overflowX)
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement as HTMLElement;
}

const PinnedHeader: React.FC<PinnedHeaderProps> = ({
  children,
  offsetTop = 0,
  offsetLeft = 0,
  offsetBottom = 0,
  offsetRight = 0,
  className = "",
  background = "inherit",
  showShadowWhenPinned = true,
  pin = { top: true },
  zIndex = 9999,
  onPinChange,
  useSticky = false,
  scrollRoot = "window",
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [fixedStyle, setFixedStyle] = useState<React.CSSProperties>({});
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const isPinnedRef = useRef(isPinned);
  const isVisibleRef = useRef(isVisible);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    isPinnedRef.current = isPinned;
    isVisibleRef.current = isVisible;
  }, [isPinned, isVisible]);

  // Determine scroll parent - memoize this logic
  const getScrollParentElement = useCallback(() => {
    if (!ref.current) return null;

    if (scrollRoot === "window") {
      return document.scrollingElement as HTMLElement;
    } else if (scrollRoot === "parent") {
      return getScrollParent(ref.current);
    } else if (scrollRoot instanceof HTMLElement) {
      return scrollRoot;
    }
    return null;
  }, [scrollRoot]);

  // Memoize the updatePosition function with useCallback
  const updatePosition = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // Store dimensions to avoid layout thrashing
    if (elRect.width !== dimensionsRef.current.width || elRect.height !== dimensionsRef.current.height) {
      dimensionsRef.current = { width: elRect.width, height: elRect.height };
    }

    // Parent visible in viewport?
    const inView =
      parentRect.bottom > 0 &&
      parentRect.top < window.innerHeight &&
      parentRect.right > 0 &&
      parentRect.left < window.innerWidth;

    if (inView !== isVisibleRef.current) {
      setIsVisible(inView);
    }

    if (!inView && isPinnedRef.current) {
      setIsPinned(false);
      onPinChange?.(false);
      return;
    }

    const newStyle: React.CSSProperties = {
      background,
      zIndex,
      width: `${dimensionsRef.current.width}px`,
      height: `${dimensionsRef.current.height}px`
    };
    let pinnedNow = false;

    // TOP/BOTTOM
    if (pin.top && parentRect.top <= offsetTop) {
      newStyle.top = `${offsetTop}px`;
      pinnedNow = true;
    } else if (pin.bottom && parentRect.bottom >= window.innerHeight - offsetBottom) {
      newStyle.bottom = `${offsetBottom}px`;
      pinnedNow = true;
    }

    // LEFT/RIGHT using transform for smooth horizontal scroll
    let translateX = 0;
    if (pinnedNow) {
      if (pin.left && parentRect.left < offsetLeft) {
        translateX = offsetLeft - parentRect.left;
      }
      if (pin.right && parentRect.right > window.innerWidth - offsetRight) {
        translateX = window.innerWidth - offsetRight - parentRect.right;
      }

      newStyle.transform = `translateX(${translateX}px)`;
    }

    // Only update state if pinning status changed
    if (pinnedNow !== isPinnedRef.current) {
      setIsPinned(pinnedNow);
      onPinChange?.(pinnedNow);
    }

    setFixedStyle(newStyle);
  }, [
    offsetTop, offsetLeft, offsetBottom, offsetRight,
    background, pin, zIndex, onPinChange
  ]);

  // Sticky implementation using IntersectionObserver
  useEffect(() => {
    if (!useSticky) return;

    const el = ref.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;

    // Get scroll parent once
    scrollParentRef.current = getScrollParentElement();

    // Sentinel for detecting "stuck"
    const sentinel = document.createElement("div");
    sentinel.style.cssText =
      "position: absolute; height: 1px; width: 100%; top: 0; left: 0; margin: 0; padding: 0; visibility: hidden; pointer-events: none;";

    // Ensure parent has relative positioning for absolute sentinel
    const originalParentPosition = parent.style.position;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    parent.appendChild(sentinel);

    const sentinelObserver = new IntersectionObserver(
      ([entry]) => {
        const pinnedStatus = entry.boundingClientRect.top < offsetTop;
        if (pinnedStatus !== isPinnedRef.current) {
          setIsPinned(pinnedStatus);
          onPinChange?.(pinnedStatus);
        }
      },
      {
        root: scrollParentRef.current,
        rootMargin: `-${offsetTop}px 0px 0px 0px`,
        threshold: 0,
      }
    );
    sentinelObserver.observe(sentinel);

    const parentObserver = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { root: scrollParentRef.current, threshold: 0 }
    );
    parentObserver.observe(parent);

    return () => {
      sentinelObserver.disconnect();
      parentObserver.disconnect();
      if (sentinel.parentElement) {
        sentinel.parentElement.removeChild(sentinel);
      }
      // Restore original parent position
      parent.style.position = originalParentPosition;
    };
  }, [useSticky, offsetTop, onPinChange, getScrollParentElement]);

  // Fixed implementation using scroll/resize events
  useEffect(() => {
    if (useSticky) return;

    if (!document.getElementById(PINNED_STYLE_ID)) {
      const style = document.createElement("style");
      style.id = PINNED_STYLE_ID;
      style.innerHTML = `
        .pinned-fixed {
          position: fixed;
          z-index: ${zIndex};
          background: inherit;
          transition: box-shadow 0.2s ease, background 0.2s ease, transform 0.2s ease;
          pointer-events: auto;
          will-change: transform;
        }
        .pinned-fixed.pinned {
          box-shadow: var(--pinned-shadow, 0 2px 10px rgba(0,0,0,0.1));
        }
        .pinned-sticky {
          position: sticky;
          top: var(--pinned-top, 0px);
          z-index: ${zIndex};
          background: var(--pinned-bg, inherit);
          transition: box-shadow 0.2s ease, background 0.2s ease;
        }
        .pinned-sticky.pinned {
          box-shadow: var(--pinned-shadow, 0 2px 10px rgba(0,0,0,0.1));
        }
        .pinned-sticky.hidden {
          opacity: 0;
          pointer-events: none;
        }
      `;
      document.head.appendChild(style);
    }

    // Get scroll parent once
    scrollParentRef.current = getScrollParentElement();

    const handleScrollAndResize = () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(updatePosition);
    };

    const scrollElement = scrollParentRef.current || window;
    scrollElement.addEventListener("scroll", handleScrollAndResize, { passive: true });
    window.addEventListener("resize", handleScrollAndResize);

    // Initial update
    handleScrollAndResize();

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      scrollElement.removeEventListener("scroll", handleScrollAndResize);
      window.removeEventListener("resize", handleScrollAndResize);

      const styleEl = document.getElementById(PINNED_STYLE_ID);
      if (styleEl && styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, [useSticky, updatePosition, zIndex, getScrollParentElement]);

  // Determine the appropriate class based on implementation
  const stateClass = useSticky
    ? !isVisible ? "hidden" : isPinned ? "pinned" : ""
    : isPinned ? "pinned" : "";

  return (
    <>
      {useSticky ? (
        // Sticky implementation
        <div
          ref={ref}
          className={`pinned-sticky ${stateClass} ${className}`}
          style={
            {
              "--pinned-top": `${offsetTop}px`,
              "--pinned-bg": background,
              "--pinned-shadow": showShadowWhenPinned
                ? "0 2px 10px rgba(0,0,0,0.1)"
                : "none",
            } as CSSCustomProperties
          }
        >
          {children}
        </div>
      ) : (
        // Fixed implementation
        <>
          {/* Original header */}
          <div ref={ref} className={className} style={{ background }}>
            {children}
          </div>

          {/* Pinned clone */}
          {isPinned && (
            <div
              className={`pinned-fixed ${stateClass} ${className}`}
              style={
                {
                  ...fixedStyle,
                  "--pinned-shadow": showShadowWhenPinned
                    ? "0 2px 10px rgba(0,0,0,0.1)"
                    : "none",
                } as CSSCustomProperties
              }
            >
              {children}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default PinnedHeader;