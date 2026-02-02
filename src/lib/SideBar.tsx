'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

export interface NavItem {
  id: string;
  text: string;
  svg: React.ReactNode;
}

export interface SidebarProps {
  navKeys: NavItem[];
  activeId?: string;
  onChange?: (id: string, item: NavItem) => void;

  /** Optional */
  logo?: React.ReactNode;
  footer?: React.ReactNode;

  /** Icons */
  expandIcon?: React.ReactNode;
  collapseIcon?: React.ReactNode;

  /** Styling */
  backgroundColor?: string;
  activeColor?: string;
  inactiveColor?: string;
  hoverColor?: string;
  widthExpanded?: string;
  widthCollapsed?: string;
  textSize?: string;
  iconSize?: string;
  fontWeight?: number | string;
  borderRight?: string;
  shadow?: string;
  className?: string;
}

const useInjectSidebarStyles = () => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const styleId = 'sidebar-styles';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      styleTag.innerHTML = `
      .sidebar {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100vh;
        transition: width 0.3s ease;
        overflow: hidden;
        position: relative;
      }

      .sidebar-item-text {
        white-space: nowrap;
        overflow: hidden;
        transition: opacity 0.3s ease;
      }

      .sidebar-item-icon {
        transition: all 0.3s ease;
      }

      .sidebar-resize-handle {
        position: absolute;
        right: 0;
        top: 0;
        width: 6px;
        height: 100%;
        cursor: col-resize;
        background: transparent;
        transition: background 0.2s ease;
        z-index: 100;
      }

      .sidebar-resize-handle:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .sidebar-nav {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        padding: 8px 0;
        overflow-y: auto;
      }

      .sidebar-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        margin: 4px 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: 6px;
      }

      .sidebar-item:hover {
        background-color: rgba(255, 255, 255, 0.05);
      }

      .sidebar-item.active {
        background-color: rgba(255, 255, 255, 0.1);
      }

      .sidebar-footer {
        padding: 16px;
        border-top: 1px solid rgba(255,255,255,0.1);
      }

      .sidebar-toggle {
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        transition: background-color 0.2s ease;
        color: #9ca3af;
      }

      .sidebar-toggle:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: #e5e7eb;
      }

      .sidebar-logo-collapsed {
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        transition: all 0.2s ease;
      }

      .sidebar-logo-collapsed:hover {
        background-color: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
      }

      .sidebar-item-text {
        white-space: nowrap;
        overflow: hidden;
        transition: opacity 0.2s ease;
      }

      /* Scrollbar styling */
      .sidebar-nav::-webkit-scrollbar {
        width: 4px;
      }

      .sidebar-nav::-webkit-scrollbar-track {
        background: transparent;
      }

      .sidebar-nav::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }

      .sidebar-nav::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }
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

// Default expand icon (right arrow)
const DefaultExpandIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z"></path>
  </svg>
);

// Default collapse icon (X icon)
const DefaultCollapseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-rtl-flip="">
  <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z"></path></svg>
);

const getBorderWidth = (borderRight: string): number => {
  const match = borderRight.match(/^(\d+(\.\d+)?)px/);
  return match ? parseFloat(match[1]) : 0;
};

export default function Sidebar({
  navKeys,
  activeId,
  onChange,

  logo,
  footer,

  expandIcon = <DefaultExpandIcon />,
  collapseIcon = <DefaultCollapseIcon />,

  backgroundColor = '#111827',
  activeColor = '#3b82f6',
  inactiveColor = '#9ca3af',
  hoverColor = '#e5e7eb',
  widthExpanded = '280px',
  widthCollapsed = '80px',
  textSize = '14px',
  iconSize = '20px',
  fontWeight = 500,
  borderRight = '1px solid rgba(255,255,255,0.1)',
  shadow = '2px 0 8px rgba(0,0,0,0.2)',
  className = '',
}: SidebarProps) {
  useInjectSidebarStyles();

  const [mounted, setMounted] = useState(false);
  useEffect(() =>  {
    setMounted(true);
  }, []);

  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<Map<string, HTMLElement>>(new Map());
  const shouldCollapseRef = useRef<boolean>(false);
  const maxItemWidthRef = useRef<number>(0);
  const controlled = activeId !== undefined;
  const [internalActive, setInternalActive] = useState(navKeys[0]?.id);
  const active = controlled ? activeId : internalActive;

  // Calculate dimensions
  const maxWidth = 400;
  const expandedPx = parseFloat(widthExpanded);
  const collapsedPx = parseFloat(widthCollapsed);
  const currentWidth = customWidth || expandedPx;

  // Log collapsed state changes
  useEffect(() => {
    // State change tracking removed
  }, [collapsed, currentWidth, expandedPx, collapsedPx]);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    const checkOverflow = (width: number) => {
      // Always measure as if expanded (with text visible)
      if (navRef.current && itemsRef.current.size > 0) {
        const navElement = navRef.current;
        const navPaddingLeft = parseFloat(getComputedStyle(navElement).paddingLeft) || 0;
        const navPaddingRight = parseFloat(getComputedStyle(navElement).paddingRight) || 0;
        const availableWidth = width - navPaddingLeft - navPaddingRight;

        let wouldOverflow = false;
        let highestItemWidth = 0;
        let debugInfo: any = {
          width,
          availableWidth,
          navPaddingLeft,
          navPaddingRight,
          items: [] as any[]
        };

        itemsRef.current.forEach((itemElement) => {
          // Get actual computed styles from the item container
          const itemStyle = getComputedStyle(itemElement);
          const marginLeft = parseFloat(itemStyle.marginLeft) || 0;
          const marginRight = parseFloat(itemStyle.marginRight) || 0;
          const paddingLeft = parseFloat(itemStyle.paddingLeft) || 0;
          const paddingRight = parseFloat(itemStyle.paddingRight) || 0;
          const gap = parseFloat(itemStyle.gap) || 0;
          
          // Measure icon directly
          const iconElement = itemElement.querySelector('.sidebar-item-icon') as HTMLElement;
          const iconWidth = iconElement ? iconElement.scrollWidth : 0;
          
          // Measure text directly
          const textElement = itemElement.querySelector('.sidebar-item-text') as HTMLElement;
          const textWidth = textElement ? textElement.scrollWidth : 0;
          
          // Only check if there's text (expanded state)
          if (textWidth > 0) {
            // Calculate the exact needed width: margins + padding + icon + gap + text
            const expandedItemWidth = marginLeft + marginRight + paddingLeft + paddingRight + iconWidth + gap + textWidth;
            highestItemWidth = Math.max(highestItemWidth, expandedItemWidth);
            
            const itemOverflows = expandedItemWidth > availableWidth;
            
            if (itemOverflows) {
              wouldOverflow = true;
            }

            debugInfo.items.push({
              text: textElement.textContent,
              iconWidth: Math.round(iconWidth * 100) / 100,
              textWidth: Math.round(textWidth * 100) / 100,
              marginLeft: Math.round(marginLeft * 100) / 100,
              marginRight: Math.round(marginRight * 100) / 100,
              paddingLeft: Math.round(paddingLeft * 100) / 100,
              paddingRight: Math.round(paddingRight * 100) / 100,
              gap: Math.round(gap * 100) / 100,
              expandedItemWidth: Math.round(expandedItemWidth * 100) / 100,
              overflows: itemOverflows
            });
          }
        });

        // Capture max width when we detect overflow while below expandedPx
        // Always capture (not just first time) to maintain threshold across expand/collapse cycles
        if (width < expandedPx && wouldOverflow && highestItemWidth > 0) {
          if (maxItemWidthRef.current === 0 || maxItemWidthRef.current !== highestItemWidth) {
            maxItemWidthRef.current = highestItemWidth;
          }
        }

        // If we have a captured threshold, use it directly without remeasuring collapsed items
        if (width < expandedPx && maxItemWidthRef.current > 0) {
          return maxItemWidthRef.current > availableWidth;
        }

        // If we measured 0px for all items, they're not visible (sidebar is collapsed)
        if (highestItemWidth === 0) {
          // If we have a stored threshold from previous measurement, use it to decide
          if (maxItemWidthRef.current > 0) {
            const wouldOverflowNow = maxItemWidthRef.current > availableWidth;
            return wouldOverflowNow;
          }
          // If no stored threshold yet, allow expansion to measure items properly
          return false;
        }

        return wouldOverflow;
      }
      return false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(collapsedPx, Math.min(e.clientX, maxWidth));
      setCustomWidth(newWidth);
      
      // Calculate decision but don't apply it yet
      const shouldCollapse = checkOverflow(newWidth);
      shouldCollapseRef.current = shouldCollapse;
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      
      // Apply the decision made during move
      setCollapsed(shouldCollapseRef.current);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, collapsedPx, maxWidth, currentWidth]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    // Only reset threshold if we're starting from expanded state at or above expandedPx
    // If already collapsed, keep the threshold for this resize session
    if (!collapsed || currentWidth >= expandedPx) {
      maxItemWidthRef.current = 0;
    }
    setIsResizing(true);
  };

  const handleClick = (item: NavItem) => {
    if (!controlled) setInternalActive(item.id);
    onChange?.(item.id, item);
  };

  if (!mounted) return null;

  return (
    <aside
      className={`sidebar ${className}`}
      style={{
        width: `${currentWidth}px`,
        background: backgroundColor,
        borderRight,
        boxShadow: shadow,
        '--hoverColor': hoverColor,
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className="sidebar-header">
        {!collapsed && logo && <div className="sidebar-logo">{logo}</div>}

        <div
          className="sidebar-toggle"
          onClick={() => {
            if(collapsed){
              setCustomWidth(parseFloat(widthExpanded));
            }else{
              setCustomWidth(parseFloat(widthCollapsed));
            }
            setCollapsed(!collapsed);
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? expandIcon : collapseIcon}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" ref={navRef}>
        {navKeys.map((item) => {
          const isActive = active === item.id;
          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) {
                  itemsRef.current.set(item.id, el);
                } else {
                  itemsRef.current.delete(item.id);
                }
              }}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              style={{
                color: isActive ? activeColor : inactiveColor,
                fontSize: textSize,
                fontWeight,
                margin: collapsed ? '4px 12px' : '4px 8px',
                justifyContent: collapsed ? 'center' : 'flex-start'
              }}
              role="button"
              tabIndex={0}
              onClick={() => handleClick(item)}
              onKeyDown={(e) => e.key === 'Enter' && handleClick(item)}
              title={collapsed ? item.text : undefined}
            >
              <div className="sidebar-item-icon" style={{
                fontSize: iconSize,
                display: 'flex',
                color: isActive ? activeColor : inactiveColor
              }}>
                {item.svg}
              </div>
              {!collapsed && (
                <span className="sidebar-item-text">{item.text}</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="sidebar-footer" style={{
          padding: collapsed ? '16px 12px' : '16px',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-start'
        }}>
          {footer}
        </div>
      )}

      {/* Resize Handle */}
      <div
        className="sidebar-resize-handle"
        onMouseDown={handleResizeStart}
        style={{
          cursor: isResizing ? 'col-resize' : 'col-resize',
          opacity: isResizing ? 1 : 0.5,
        }}
      />
    </aside>
  );
}