
'use client';

import { useEffect, useRef, useState, RefObject  } from 'react';

interface UsePinnedStateOptions {
  container?: HTMLElement | null; // optional scroll container
  offset?: number; // optional offset from top
}

export function usePinnedState<T extends HTMLElement = HTMLElement>({ container = null, offset = 0 }: UsePinnedStateOptions = {}) {
  const ref = useRef<T>(null);
  const [stuck, setStuck] = useState(false);
  const [released, setReleased] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const root = container || null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const topPosition = entry.boundingClientRect.top;
        const isStuck = topPosition <= (offset || 0);

        setStuck(isStuck);

        // Determine if header has been released (scrolled back into view)
        setReleased(!isStuck && topPosition >= (offset || 0));
      },
      {
        root,
        threshold: [0, 1], // trigger on any intersection change
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [container, offset]);

  // Optional: track scroll direction
  useEffect(() => {
    const scrollContainer = container || window;
    const handleScroll = () => {
      const currentY = container ? container.scrollTop : window.scrollY;
      lastScrollY.current = currentY;
    };
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [container]);

  return { ref, stuck, released };
}
