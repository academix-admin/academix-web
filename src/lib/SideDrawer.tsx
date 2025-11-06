'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'left' | 'right';
  backdropOpacity?: number;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  className?: string;
  backdropClassName?: string;
  style?: React.CSSProperties;
  preventScroll?: boolean;
  width?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
}

const useInjectSideDrawerStyles = (width?: SideDrawerProps['width']) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('sidedrawer-styles')) return;

    const mobileWidth = width?.mobile || '80%';
    const tabletWidth = width?.tablet || '70%';
    const desktopWidth = width?.desktop || '60%';

    const styleTag = document.createElement('style');
    styleTag.id = 'sidedrawer-styles';
    styleTag.innerHTML = `
      .sidedrawer-backdrop {
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, var(--sidedrawer-backdrop-opacity, 0.5));
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
        z-index: 999;
        backdrop-filter: blur(2px);
        pointer-events: none;
      }

      .sidedrawer-backdrop.open {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      .sidedrawer {
        position: fixed;
        top: 0;
        height: 100vh;
        background: var(--sidedrawer-bg, #fff);
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1000;
        overflow-y: auto;
        will-change: transform;
        display: flex;
        flex-direction: column;
        pointer-events: none;
      }

      /* Positioning */
      .sidedrawer.left {
        left: 0;
        transform: translateX(-100%);
      }

      .sidedrawer.right {
        right: 0;
        transform: translateX(100%);
      }

      .sidedrawer.open.left,
      .sidedrawer.open.right {
        pointer-events: auto;
        transform: translateX(0);
      }

      /* Mobile Design (max-width: 500px) */
      @media screen and (max-width: 500px) {
        .sidedrawer {
          width: ${mobileWidth};
          border-radius: 0 12px 12px 0;
        }

        .sidedrawer.right {
          border-radius: 12px 0 0 12px;
        }
      }

      /* Tablet Design (max-width: 800px) and (min-width: 501px) */
      @media screen and (max-width: 800px) and (min-width: 501px) {
        .sidedrawer {
          width: ${tabletWidth};
          max-width: 500px;
          border-radius: 0 12px 12px 0;
        }

        .sidedrawer.right {
          border-radius: 12px 0 0 12px;
        }
      }

      /* Web Design (min-width: 801px) */
      @media screen and (min-width: 801px) {
        .sidedrawer {
          width: ${desktopWidth};
          max-width: 800px;
          border-radius: 0 12px 12px 0;
        }

        .sidedrawer.right {
          border-radius: 12px 0 0 12px;
        }
      }

      /* Accessibility */
      .sidedrawer :focus-visible {
        outline: 2px solid dodgerblue;
        outline-offset: 2px;
      }

      /* Prevent body scroll when drawer is open */
      .sidedrawer-body-scroll-lock {
        overflow: hidden;
      }
    `;

    document.head.appendChild(styleTag);

    return () => {
      if (styleTag && document.head.contains(styleTag)) {
        document.head.removeChild(styleTag);
      }
    };
  }, [width]);
};

export default function SideDrawer({
  isOpen,
  onClose,
  children,
  position = 'left',
  backdropOpacity = 0.5,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  className = '',
  backdropClassName = '',
  style,
  preventScroll = true,
  width,
}: SideDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const portalRoot = typeof window !== 'undefined' ? document.body : null;
  const [isMounted, setIsMounted] = React.useState(false);

  // Inject styles with width configuration
  useInjectSideDrawerStyles(width);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle ESC key with useCallback
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!closeOnEsc || !isOpen) return;

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, closeOnEsc, handleEsc]);

  // Prevent background scroll
  useEffect(() => {
    if (!preventScroll) return;

    if (isOpen) {
      document.body.classList.add('sidedrawer-body-scroll-lock');
    } else {
      document.body.classList.remove('sidedrawer-body-scroll-lock');
    }

    return () => {
      document.body.classList.remove('sidedrawer-body-scroll-lock');
    };
  }, [isOpen, preventScroll]);

  // Focus management
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        drawerRef.current.focus();
      }
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (!closeOnBackdropClick) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Don't render anything during SSR
  if (!portalRoot || !isMounted) {
    return null;
  }

  const drawer = (
    <>
      {/* Backdrop */}
      <div
        className={`sidedrawer-backdrop ${isOpen ? 'open' : ''} ${backdropClassName}`}
        style={{
          '--sidedrawer-backdrop-opacity': backdropOpacity,
        } as React.CSSProperties}
        onClick={handleBackdropClick}
        data-testid="sidedrawer-backdrop"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`sidedrawer ${position} ${isOpen ? 'open' : ''} ${className}`}
        style={{
          ...style,
          '--sidedrawer-bg': style?.backgroundColor || 'white', // Use the provided bg color or default to white
        } as React.CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label="Side drawer"
        tabIndex={-1}
        data-testid="sidedrawer"
        hidden={!isOpen}
      >
        {children}
      </div>
    </>
  );

  return createPortal(drawer, portalRoot);
}