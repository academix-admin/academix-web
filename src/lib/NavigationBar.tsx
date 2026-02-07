'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useScrollBroadcast } from './NavigationStack';

export type NavigationModeType = 'normal' | 'float' | 'autohide';

export interface NavItem {
  id: string;
  text: string;
  svg: React.ReactNode;
}

export interface NavigationBarProps {
  navKeys: NavItem[];
  activeId?: string;
  onChange?: (id: string, item: NavItem) => void;

  /** Colors */
  activeColor?: string;
  inactiveColor?: string;
  hoverColor?: string;
  backgroundColor?: string;

  /** Layout */
  direction?: 'horizontal' | 'vertical';
  normalHeight?: string;
  shrinkHeight?: string;
  itemSpacing?: string;
  iconSize?: string;
  textSize?: string;
  fontWeight?: number | string;
  paddingY?: string;
  paddingX?: string;

  /** Bar Visuals */
  barBorderTop?: string;
  barBorderRadius?: string;
  barShadow?: string;

  /** Mode */
  mode?: NavigationModeType;
  floatScrollThreshold?: number;
  snapPoint?: number;

  /** Floating Button */
  floatingButton?: React.ReactNode;
  floatingButtonPosition?: 'left' | 'right';
  floatingButtonBottom?: string;
  floatingButtonPadding?: string;
  floatingButtonColor?: string;
  floatingButtonTextColor?: string;
  floatingButtonRadius?: string;
  floatingButtonShadow?: string;
  floatingButtonVisibility?: 'always' | 'whenHidden' | 'whenVisible';

  /** Extra */
  className?: string;
}

const useInjectStyles = () => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const styleId = 'navigation-bar-styles';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      styleTag.innerHTML = `
      .navigation-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-around;
        align-items: center;
        transition: height 0.25s ease, padding 0.25s ease, transform 0.25s ease;
        z-index: 50;
        overflow: hidden;
          box-sizing: border-box;
      }

      .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: color 0.2s ease, transform 0.2s ease;
        user-select: none;
        min-width: 44px;
        min-height: 44px;
        outline: none;
      }

      .nav-item:hover {
        color: var(--hoverColor);
      }

      .nav-item svg {
        margin-bottom: 2px;
        transition: transform 0.2s ease;
      }

      .fab {
        position: fixed;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s ease, opacity 0.2s ease;
      }

      .fab.left { left: 16px; }
      .fab.right { right: 16px; }
      .fab.hidden { opacity: 0; transform: scale(0.9); pointer-events: none; }
    `;
      document.head.appendChild(styleTag);
    }

    // Cleanup on unmount
    return () => {
      if (styleTag && document.head.contains(styleTag)) {
        document.head.removeChild(styleTag);
      }
    };
  }, []);
};

export default function NavigationBar({
  navKeys,
  activeId,
  onChange,

  /** Colors */
  activeColor = '#166534',
  inactiveColor = '#6b7280',
  hoverColor = '#3b82f6',
  backgroundColor = '#ffffff',

  /** Layout */
  direction = 'horizontal',
  normalHeight = '64px',
  shrinkHeight = '0px',
  itemSpacing = '8px',
  iconSize = '20px',
  textSize = '12px',
  fontWeight = 500,
  paddingY = '6px',
  paddingX = '6px',

  /** Bar visuals */
  barBorderTop = '1px solid rgba(0,0,0,0.05)',
  barBorderRadius = '0px',
  barShadow = '0 -2px 10px rgba(0,0,0,0.05)',

  /** Mode */
  mode = 'normal',
  floatScrollThreshold = 200,
  snapPoint = 0.5,

  /** FAB */
  floatingButton,
  floatingButtonPosition = 'right',
  floatingButtonBottom = '80px',
  floatingButtonPadding = '12px',
  floatingButtonColor = '#2563eb',
  floatingButtonTextColor = '#ffffff',
  floatingButtonRadius = '9999px',
  floatingButtonShadow = '0 4px 8px rgba(0, 0, 0, 0.2)',
  floatingButtonVisibility,

  /** Extra */
  className = '',
}: NavigationBarProps) {
  useInjectStyles();

  const [mounted, setMounted] = useState(false); // ✅ NEW
    useEffect(() => {
      setMounted(true);
    }, []);

  const [internalActive, setInternalActive] = useState<string>(navKeys[0]?.id);
  const controlled = activeId !== undefined;
  const active = controlled ? activeId : internalActive;

  const [shrinkRatio, setShrinkRatio] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [fabClicked, setFabClicked] = useState(false); // NEW
  const prevScroll = useRef(0);

  // Reset hidden state when component mounts or mode changes
  useEffect(() => {
    setHidden(false);
    setShrinkRatio(0);
  }, [mode]);

  // Add visibility check based on content height
  useEffect(() => {
    const checkContentHeight = () => {
      const content = document.documentElement;
      const hasScrollableContent = content.scrollHeight > content.clientHeight;

      // If content isn't scrollable, always show navigation
      if (!hasScrollableContent && mode === 'autohide') {
        setHidden(false);
      }
    };

    checkContentHeight();
    window.addEventListener('resize', checkContentHeight);
    return () => window.removeEventListener('resize', checkContentHeight);
  }, [mode]);

  // Track scroll state for broadcast listening
  const scrollHandlerCallback = React.useCallback((event: any) => {
    if (mode === 'normal') return;

    const { scrollPosition, pageKey, uid } = event;
    const atTop = scrollPosition <= 0;
    
    // Get viewport and content heights from the scrollable container
    const container = event.container;
    let contentHeight = 0;
    if (container === 'window') {
      contentHeight = document.documentElement.scrollHeight;
    } else if (container instanceof HTMLElement) {
      contentHeight = container.scrollHeight;
      contentHeight += container.offsetTop; // Account for offset
    }
    
    const clientHeight = container === 'window'
      ? window.innerHeight
      : container instanceof HTMLElement ? container.clientHeight : 0;
    
    const atBottom = clientHeight + scrollPosition >= contentHeight - 2; // small buffer

    console.log(`[NavigationBar-ScrollEvent] pageKey=${pageKey} uid=${uid} position=${scrollPosition}px mode=${mode} atTop=${atTop} atBottom=${atBottom}`);

    // ✅ Always show NavigationBar when at top
    if (atTop) {
      setHidden(false);
      prevScroll.current = scrollPosition;
      return;
    }

    // 🚫 Ignore overscroll at bottom
    if (atBottom) {
      prevScroll.current = scrollPosition;
      return;
    }

    if (mode === 'float') {
      const rawRatio = Math.min(1, scrollPosition / floatScrollThreshold);
      const ratio =
        rawRatio >= snapPoint
          ? 1
          : rawRatio <= snapPoint * 0.7
          ? 0
          : rawRatio;
      setShrinkRatio(ratio);
    }

    if (mode === 'autohide') {
      setHidden(scrollPosition > prevScroll.current && scrollPosition > 50);
      prevScroll.current = scrollPosition;
      console.log(`[NavigationBar-AutoHide] hidden=${scrollPosition > prevScroll.current && scrollPosition > 50}`);
    }
  }, [mode, floatScrollThreshold, snapPoint]);

  /** Scroll handler - listen to broadcast instead of window */
  useScrollBroadcast(scrollHandlerCallback);


  const handleClick = (item: NavItem) => {
    if (!controlled) setInternalActive(item.id);
    onChange?.(item.id, item);
  };

  const currentHeight =
    mode === 'float'
      ? `calc(${normalHeight} - (${normalHeight} - ${shrinkHeight}) * ${shrinkRatio})`
      : normalHeight;

  // Update CSS variable for content spacing
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.setProperty('--nav-height', currentHeight);
    }
  }, [currentHeight]);

  /** Decide FAB visibility */
  const shouldShowFab =
    floatingButton &&
    !fabClicked && // hide fab right after click
    (floatingButtonVisibility
      ? floatingButtonVisibility === 'always'
        ? true
        : floatingButtonVisibility === 'whenHidden'
        ? hidden
        : !hidden
      : mode === 'autohide' && hidden);

  // Reset fabClicked when nav hides again
  useEffect(() => {
    if (hidden) setFabClicked(false);
  }, [hidden]);

    if (!mounted) return null;

  return (
    <>
      <nav
        role="navigation"
        className={`navigation-bar ${className}`}
        style={{
          background: backgroundColor,
          padding: `${paddingY} ${paddingX}`,
          transform: hidden ? `translateY(calc(100% + ${currentHeight}))` : 'translateY(0)',
          flexDirection: direction === 'vertical' ? 'column' : 'row',
          borderTop: barBorderTop,
          borderRadius: barBorderRadius,
          boxShadow: barShadow,
          paddingBottom: `calc(env(safe-area-inset-bottom))`,
        }}
      >
        {navKeys.map((item) => {
          const isActive = active === item.id;
          return (
            <div
              key={item.id}
              className="nav-item"
              role="button"
              tabIndex={0}
              style={{
                margin: itemSpacing,
                color: isActive ? activeColor : inactiveColor,
                fontSize: textSize,
                fontWeight,
                '--hoverColor': hoverColor,
              } as React.CSSProperties}
              onClick={() => handleClick(item)}
              onKeyDown={(e) => e.key === 'Enter' && handleClick(item)}
            >
              <div
                style={{
                  fontSize: iconSize,
                  transform: `scale(${1 - shrinkRatio * 0.3})`,
                }}
              >
                {item.svg}
              </div>
              <span>{item.text}</span>
            </div>
          );
        })}
      </nav>

      {shouldShowFab && (
        <div
          className={`fab ${floatingButtonPosition}`}
          style={{
            bottom: `calc(${floatingButtonBottom} + env(safe-area-inset-bottom))`,
            padding: floatingButtonPadding,
            borderRadius: floatingButtonRadius,
            background: floatingButtonColor,
            color: floatingButtonTextColor,
            boxShadow: floatingButtonShadow,
          }}
          role="button"
          tabIndex={0}
          onClick={() => {
            setHidden(false);    // show nav
            setFabClicked(true); // hide fab until nav hides again
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setHidden(false);
              setFabClicked(true);
            }
          }}
        >
          {floatingButton}
        </div>
      )}
    </>
  );
}