'use client';

/**
 * ModalSheetView — owned replica of react-modal-sheet.
 *
 * Key fix over the original: we wait for the container's real measured height
 * before starting the open animation, so the sheet never flashes full-screen.
 *
 * All defaults are exposed as props so callers control everything cleanly.
 */

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from 'motion/react';

// ─── SSR guard ────────────────────────────────────────────────────────────────

const IS_SSR = typeof window === 'undefined';
const useIsoLayoutEffect = IS_SSR ? useEffect : useLayoutEffect;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SheetDetent = 'default' | 'full' | 'content';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Controls height behaviour. default='content' */
  detent?: SheetDetent;
  /** Animation ease. default='easeOut' */
  ease?: string;
  /** Animation duration in seconds. default=0.22 */
  duration?: number;
  /** Velocity threshold to close on drag. default=500 */
  dragVelocityThreshold?: number;
  /** Fraction of height dragged before close. default=0.6 */
  dragCloseThreshold?: number;
  disableDrag?: boolean;
  disableDismiss?: boolean;
  avoidKeyboard?: boolean;
  mountPoint?: Element;
  style?: React.CSSProperties;
  /** Max height hint for initial positioning. Pass same value as Container maxHeight */
  maxHeight?: string | number;
  onOpenStart?: () => void;
  onOpenEnd?: () => void;
  onCloseStart?: () => void;
  onCloseEnd?: () => void;
}

export interface SheetContainerProps {
  children: React.ReactNode;
  /** Background colour. default='#fff' */
  backgroundColor?: string;
  /** Border radius on top corners. default='12px' */
  borderRadius?: string | number;
  /** Box shadow. default='0px -2px 16px rgba(0,0,0,0.3)' */
  boxShadow?: string;
  /** Max height of the sheet. default=undefined (library uses safe-area calc) */
  maxHeight?: string | number;
  /** Min height of the sheet. default=undefined */
  minHeight?: string | number;
  /** Max width of the sheet. default='500px' */
  maxWidth?: string | number;
  /** Extra bottom padding e.g. for safe area. default='env(safe-area-inset-bottom)' */
  paddingBottom?: string | number;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  [key: string]: any;
}

export interface SheetHeaderProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  disableDrag?: boolean;
}

export interface SheetContentProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  disableDrag?: boolean;
  disableScroll?: boolean;
  scrollStyle?: React.CSSProperties;
}

export interface SheetBackdropProps {
  /** Backdrop colour. default='rgba(0,0,0,0.4)' */
  backgroundColor?: string;
  /** Fade duration in seconds. default=0.2 */
  fadeDuration?: number;
  style?: React.CSSProperties;
  className?: string;
  onTap?: (e: any) => void;
  onClick?: (e: any) => void;
}

// ─── Internal context ─────────────────────────────────────────────────────────

interface SheetContextType {
  y: MotionValue<number>;
  detent: SheetDetent;
  disableDrag: boolean;
  dragProps: object;
  sheetRef: React.RefObject<HTMLDivElement | null>;
  sheetBoundsRef: React.RefCallback<HTMLDivElement>;
  avoidKeyboard: boolean;
}

const SheetContext = createContext<SheetContextType | null>(null);

function useSheetContext() {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('ModalSheetView: must be used inside <Sheet>');
  return ctx;
}

// ─── useMeasureHeight ─────────────────────────────────────────────────────────

function useMeasureHeight(): [React.RefCallback<HTMLDivElement>, number] {
  const [height, setHeight] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref: React.RefCallback<HTMLDivElement> = useCallback((node) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    const measure = () => {
      const borderH = node.getBoundingClientRect().height;
      setHeight(Math.round(borderH));
    };
    observerRef.current = new ResizeObserver(measure);
    observerRef.current.observe(node);
    measure();
  }, []);

  return [ref, height];
}

// ─── useWindowHeight ──────────────────────────────────────────────────────────

function useWindowHeight() {
  const [h, setH] = useState(() => (IS_SSR ? 800 : window.innerHeight));
  useIsoLayoutEffect(() => {
    const handler = () => setH(window.innerHeight);
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return h;
}

// ─── usePreventScroll ─────────────────────────────────────────────────────────

function usePreventScroll(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = prev; };
  }, [isOpen]);
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

type SheetState = 'closed' | 'opening' | 'open' | 'closing';

const SheetBase = forwardRef<any, SheetProps>(({
  isOpen,
  onClose,
  children,
  detent = 'content',
  ease = 'easeOut',
  duration = 0.22,
  dragVelocityThreshold = 500,
  dragCloseThreshold = 0.6,
  disableDrag: disableDragProp = false,
  disableDismiss = false,
  avoidKeyboard = true,
  mountPoint,
  style,
  maxHeight,
  onOpenStart,
  onOpenEnd,
  onCloseStart,
  onCloseEnd,
}, ref) => {
  const [sheetBoundsRef, sheetHeight] = useMeasureHeight();
  const sheetRef = useRef<HTMLDivElement>(null);
  const windowHeight = useWindowHeight();

  // Calculate effective max height immediately
  const effectiveMaxHeight = React.useMemo(() => {
    if (!maxHeight) return windowHeight;
    if (typeof maxHeight === 'number') return maxHeight;
    if (typeof maxHeight === 'string' && maxHeight.includes('dvh')) {
      const dvhValue = parseFloat(maxHeight);
      return (windowHeight * dvhValue) / 100;
    }
    if (typeof maxHeight === 'string' && maxHeight.includes('vh')) {
      const vhValue = parseFloat(maxHeight);
      return (windowHeight * vhValue) / 100;
    }
    return windowHeight;
  }, [maxHeight, windowHeight]);

  const y = useMotionValue(effectiveMaxHeight);
  const [state, setState] = useState<SheetState>(isOpen ? 'opening' : 'closed');
  const [visible, setVisible] = useState(isOpen);

  const animOpts = { ease, duration };

  // State machine transitions
  useEffect(() => {
    if (isOpen && state === 'closed') {
      setVisible(true);          // mount children
      setState('opening');       // will animate once height is measured
    } else if (!isOpen && (state === 'open' || state === 'opening')) {
      setState('closing');
    }
  }, [isOpen]);

  // Once children are mounted and sheetHeight is measured, start open animation
  useEffect(() => {
    if (state !== 'opening' || sheetHeight <= 0) return;
    onOpenStart?.();
    // Always use effectiveMaxHeight as the start position, not sheetHeight
    // This prevents the jank where it briefly shows at full content height
    y.set(effectiveMaxHeight);
    (animate as any)(y, 0, {
      ...animOpts,
      onComplete: () => { setState('open'); onOpenEnd?.(); },
    });
  }, [state, sheetHeight, effectiveMaxHeight]);

  useEffect(() => {
    if (state !== 'closing') return;
    onCloseStart?.();
    const closeY = sheetHeight > 0 ? sheetHeight : effectiveMaxHeight;
    (animate as any)(y, closeY, {
      ...animOpts,
      onComplete: () => {
        setState('closed');
        setVisible(false);
        onCloseEnd?.();
      },
    });
  }, [state, sheetHeight, effectiveMaxHeight]);

  const onDrag = useCallback((_: any, info: any) => {
    y.set(Math.max(y.get() + info.delta.y, 0));
  }, [y]);

  const onDragEnd = useCallback((_: any, info: any) => {
    const closeY = sheetHeight > 0 ? sheetHeight : effectiveMaxHeight;
    const shouldClose = !disableDismiss && (
      info.velocity.y > dragVelocityThreshold ||
      y.get() > closeY * dragCloseThreshold
    );
    if (shouldClose) {
      (animate as any)(y, closeY, animOpts);
      onClose();
    } else {
      (animate as any)(y, 0, animOpts);
    }
  }, [y, sheetHeight, effectiveMaxHeight, disableDismiss, dragVelocityThreshold, dragCloseThreshold, onClose, animOpts]);

  const dragProps = disableDragProp ? {} : {
    drag: 'y' as const,
    dragElastic: 0,
    dragMomentum: false,
    dragPropagation: false,
    onDrag,
    onDragEnd,
  };

  useImperativeHandle(ref, () => ({ y, height: sheetHeight }));
  usePreventScroll(isOpen);

  const zIndex = useTransform(y, (val) => {
    const effectiveHeight = sheetHeight || effectiveMaxHeight;
    return val + 2 >= effectiveHeight ? -1 : (style?.zIndex as number ?? 9999);
  });
  const opacity = useTransform(y, (val) => {
    if (state === 'opening' && val >= effectiveMaxHeight * 0.95) return 0;
    const effectiveHeight = sheetHeight || effectiveMaxHeight;
    return val + 2 >= effectiveHeight ? 0 : 1;
  });

  const context: SheetContextType = {
    y, detent, disableDrag: disableDragProp, dragProps,
    sheetRef, sheetBoundsRef, avoidKeyboard,
  };

  const sheet = (
    <SheetContext.Provider value={context}>
      <motion.div style={{
        position: 'fixed', top: 0, bottom: 0, left: 0, right: 0,
        overflow: 'hidden', pointerEvents: 'none',
        zIndex, opacity, ...style,
      }}>
        {visible ? children : null}
      </motion.div>
    </SheetContext.Provider>
  );

  if (IS_SSR) return sheet;
  return createPortal(sheet, mountPoint ?? document.body);
});

SheetBase.displayName = 'Sheet';

// ─── Sheet.Container ──────────────────────────────────────────────────────────

const SheetContainer = forwardRef<any, SheetContainerProps>(({
  children,
  backgroundColor = '#fff',
  borderRadius = '12px',
  boxShadow = '0px -2px 16px rgba(0,0,0,0.3)',
  maxHeight,
  minHeight,
  maxWidth = '500px',
  paddingBottom = 'env(safe-area-inset-bottom)',
  style,
  className = '',
  id,
  ...rest
}, ref) => {
  const { y, detent, sheetRef, sheetBoundsRef } = useSheetContext();

  // Calculate effective max height in pixels
  const effectiveMaxHeight = React.useMemo(() => {
    if (!maxHeight) return undefined;
    if (typeof maxHeight === 'number') return maxHeight;
    if (typeof maxHeight === 'string' && maxHeight.includes('dvh')) {
      const dvhValue = parseFloat(maxHeight);
      return (window.innerHeight * dvhValue) / 100;
    }
    if (typeof maxHeight === 'string' && maxHeight.includes('vh')) {
      const vhValue = parseFloat(maxHeight);
      return (window.innerHeight * vhValue) / 100;
    }
    return undefined;
  }, [maxHeight]);

  // Expose effective height to parent context
  React.useEffect(() => {
    if (effectiveMaxHeight && sheetRef.current) {
      (sheetRef.current as any).effectiveMaxHeight = effectiveMaxHeight;
    }
  }, [effectiveMaxHeight, sheetRef]);

  const containerStyle: MotionStyle = {
    zIndex: 2,
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    maxWidth,
    margin: '0 auto',
    right: 0,
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor,
    borderTopRightRadius: borderRadius,
    borderTopLeftRadius: borderRadius,
    boxShadow,
    paddingBottom,
    y,
    ...style,
  };

  // Apply height based on detent
  if (detent === 'default') {
    containerStyle.height = 'calc(100% - env(safe-area-inset-top) - 34px)';
  } else if (detent === 'full') {
    containerStyle.height = '100%';
    containerStyle.maxHeight = '100%';
  } else {
    // content — height driven by content, capped by maxHeight
    containerStyle.height = 'auto';
    if (maxHeight) containerStyle.maxHeight = maxHeight;
    if (minHeight) containerStyle.minHeight = minHeight;
  }

  const mergedRef = useCallback((node: HTMLDivElement | null) => {
    (sheetRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    sheetBoundsRef(node);
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<any>).current = node;
  }, [sheetRef, sheetBoundsRef, ref]);

  return (
    <motion.div
      {...rest}
      id={id}
      ref={mergedRef}
      className={`react-modal-sheet-container ${className}`}
      style={containerStyle}
    >
      {children}
    </motion.div>
  );
});

SheetContainer.displayName = 'SheetContainer';

// ─── Sheet.Header ─────────────────────────────────────────────────────────────

const SheetHeader = forwardRef<any, SheetHeaderProps>(({
  children, style, className = '', disableDrag,
}, ref) => {
  const { dragProps, disableDrag: ctxDisableDrag } = useSheetContext();
  const activeDragProps = (disableDrag || ctxDisableDrag) ? {} : dragProps;

  return (
    <motion.div
      ref={ref}
      className={`react-modal-sheet-header-container ${className}`}
      style={{ width: '100%', flexShrink: 0, ...style }}
      {...activeDragProps}
      dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
    >
      {children ?? (
        <div style={{
          width: '100%', height: '40px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '36px', height: '4px', borderRadius: '99px', backgroundColor: '#ddd',
          }} />
        </div>
      )}
    </motion.div>
  );
});

SheetHeader.displayName = 'SheetHeader';

// ─── Sheet.Content ────────────────────────────────────────────────────────────

const SheetContent = forwardRef<any, SheetContentProps>(({
  children, style, className = '', disableDrag, disableScroll, scrollStyle,
}, ref) => {
  const { dragProps, disableDrag: ctxDisableDrag, avoidKeyboard } = useSheetContext();
  const activeDragProps = (disableDrag || ctxDisableDrag) ? {} : dragProps;

  return (
    <motion.div
      ref={ref}
      className={`react-modal-sheet-content ${className}`}
      style={{ minHeight: 0, flexGrow: 1, display: 'flex', flexDirection: 'column', ...style }}
      {...activeDragProps}
      dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
    >
      <div
        className="react-modal-sheet-content-scroller"
        style={{
          height: '100%',
          overflowY: disableScroll ? 'hidden' : 'auto',
          overscrollBehaviorY: 'none',
          ...(avoidKeyboard ? {
            paddingBottom: 'env(keyboard-inset-height, var(--keyboard-inset-height, 0px))',
          } : {}),
          ...scrollStyle,
        }}
      >
        {children}
      </div>
    </motion.div>
  );
});

SheetContent.displayName = 'SheetContent';

// ─── Sheet.Backdrop ───────────────────────────────────────────────────────────

const SheetBackdrop = forwardRef<any, SheetBackdropProps>(({
  backgroundColor = 'rgba(0,0,0,0.4)',
  fadeDuration = 0.2,
  style, className = '', onTap, onClick,
}, ref) => {
  const isClickable = !!(onTap || onClick);
  const Comp = isClickable ? motion.button : motion.div;

  return (
    <Comp
      ref={ref as any}
      className={`react-modal-sheet-backdrop ${className}`}
      style={{
        zIndex: 1,
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        touchAction: 'none',
        userSelect: 'none',
        backgroundColor,
        border: 'none',
        WebkitTapHighlightColor: 'transparent',
        pointerEvents: isClickable ? 'auto' : 'none',
        ...style,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: fadeDuration }}
      onTap={onTap as any}
      onClick={onClick}
    />
  );
});

SheetBackdrop.displayName = 'SheetBackdrop';

// ─── Compound export ──────────────────────────────────────────────────────────

type SheetCompound = typeof SheetBase & {
  Container: typeof SheetContainer;
  Header: typeof SheetHeader;
  Content: typeof SheetContent;
  Backdrop: typeof SheetBackdrop;
};

const Sheet = SheetBase as SheetCompound;
Sheet.Container = SheetContainer;
Sheet.Header = SheetHeader;
Sheet.Content = SheetContent;
Sheet.Backdrop = SheetBackdrop;

export { Sheet };
export default Sheet;
