'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from 'react';

export enum FocusOverlayMode {
  ADJUST = 'adjust',
  VISIBLE = 'visible',
}

export interface AdjustFocus {
  value: number;
  lower: number;
  upper: number;
}

export interface FocusOverlayController {
  focusOverlayMode: FocusOverlayMode;
  fPosition: { x: number; y: number };
  cPosition: { x: number; y: number };
  mounted: boolean;
  showOverlay: () => void;
  hideOverlay: () => void;
  removeOverlay: () => void;
  adjustPosition: (position: (offset: { x: number; y: number }) => { x: number; y: number }) => void;
  animateToPosition: (position: { x: number; y: number }, hideOverlay: boolean) => void;
}

interface AcademixFocusOverlayComponentProps {
  children: (context: null, showOverlay: () => void) => ReactNode;
  tag: string;
  onFocus: (
    context: null,
    position: { x: number; y: number },
    child: ReactNode,
    size: { width: number; height: number },
    hideOverlay: () => void
  ) => ReactNode;
  onPosition?: (
    context: null,
    position: { x: number; y: number },
    size: { width: number; height: number }
  ) => { x: number; y: number };
  backgroundOverlay?: string;
  autoHideDuration?: number;
  animationDuration?: number;
  fadeInCurve?: string;
  fadeOutCurve?: string;
  dismissible?: boolean;
  animateDismiss?: boolean;
  controller?: FocusOverlayController;
  onFocusEntryOverlay?: () => void;
  onBeforeHiddenOverlay?: () => Promise<void>;
  onAfterHiddenOverlay?: () => void;
  className?: string;
}

const AcademixFocusOverlayComponent = forwardRef<FocusOverlayController, AcademixFocusOverlayComponentProps>(
  ({
    children,
    tag,
    onFocus,
    onPosition,
    backgroundOverlay = 'rgba(0, 0, 0, 0.87)',
    autoHideDuration,
    animationDuration = 300,
    fadeInCurve = 'ease-in',
    fadeOutCurve = 'ease-out',
    dismissible = true,
    animateDismiss,
    controller,
    onFocusEntryOverlay,
    onBeforeHiddenOverlay,
    onAfterHiddenOverlay,
    className = '',
  }, ref) => {
    const [isInFocus, setIsInFocus] = useState(false);
    const [overlayVisible, setOverlayVisible] = useState(false);
    const [cPosition, setCPosition] = useState({ x: 0, y: 0 });
    const [fPosition, setFPosition] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [animationProgress, setAnimationProgress] = useState(0);
    const [adjustFocus, setAdjustFocus] = useState<AdjustFocus>({ value: 0, lower: 0, upper: 1 });

    const childRef = useRef<HTMLDivElement>(null);
    const focusRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>(0);
    const overlayRef = useRef<HTMLDivElement>(null);
    const isControllerBinded = useRef(false);

    // Map value to new range utility function
    const mapValueToNewRange = useCallback((
      value: number,
      minInput: number,
      maxInput: number,
      minOutput: number,
      maxOutput: number
    ): number => {
      if (maxInput === minInput) return minOutput;
      return minOutput + ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput);
    }, []);

    // Get element position and size
    const getElementRect = useCallback((element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const scrollY = window.scrollY || document.documentElement.scrollTop;

      return {
        x: rect.left + scrollX,
        y: rect.top + scrollY,
        width: rect.width,
        height: rect.height,
      };
    }, []);

    // Show overlay function
    const showOverlay = useCallback(() => {
      if (!childRef.current || isInFocus) return;

      const rect = getElementRect(childRef.current);

      setCPosition({ x: rect.x, y: rect.y });
      setFPosition({ x: rect.x, y: rect.y });
      setSize({ width: rect.width, height: rect.height });
      setIsInFocus(true);
      setOverlayVisible(true);

      onFocusEntryOverlay?.();

      if (controller) {
        if (controller.focusOverlayMode === FocusOverlayMode.VISIBLE) {
          setAdjustFocus({ value: 1, lower: 0, upper: 1 });
        }
      } else {
        // Animate in for non-controller mode
        let start: number | null = null;
        const animate = (timestamp: number) => {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / animationDuration, 1);
          setAnimationProgress(progress);

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          }
        };

        animationRef.current = requestAnimationFrame(animate);
      }

      if (autoHideDuration && !controller) {
        setTimeout(() => hideOverlay(), autoHideDuration);
      }
    }, [isInFocus, animationDuration, autoHideDuration, onFocusEntryOverlay, controller, getElementRect]);

    // Hide overlay function
    const hideOverlay = useCallback(async () => {
      if (!isInFocus) return;

      await onBeforeHiddenOverlay?.();

      if (controller) {
        if (animateDismiss) {
          await animateOffset(fPosition, cPosition, true);
        } else {
          removeOverlay();
        }
      } else {
        // Animate out for non-controller mode
        let start: number | null = null;
        const animate = (timestamp: number) => {
          if (!start) start = timestamp;
          const progress = 1 - Math.min((timestamp - start) / animationDuration, 1);
          setAnimationProgress(progress);

          if (progress > 0) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            removeOverlay();
          }
        };

        animationRef.current = requestAnimationFrame(animate);
      }
    }, [isInFocus, animateDismiss, animationDuration, onBeforeHiddenOverlay, fPosition, cPosition, controller]);

    // Remove overlay completely
    const removeOverlay = useCallback(() => {
      setOverlayVisible(false);
      setIsInFocus(false);
      setAnimationProgress(0);
      setAdjustFocus({ value: 0, lower: 0, upper: 1 });
      cancelAnimationFrame(animationRef.current);
      onAfterHiddenOverlay?.();
    }, [onAfterHiddenOverlay]);

    // Adjust position function
    const adjustPosition = useCallback((positionFn: (offset: { x: number; y: number }) => { x: number; y: number }) => {
      setFPosition(prev => positionFn(prev));
      if (controller) {
        setAdjustFocus({ value: 1, lower: 0, upper: 1 });
      }
    }, [controller]);

    // Animate to position function
    const animateOffset = useCallback(async (
      start: { x: number; y: number },
      end: { x: number; y: number },
      hideOverlayAfter = false
    ) => {
      const distanceX = end.x - start.x;
      const distanceY = end.y - start.y;

      let startTime: number | null = null;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / animationDuration, 1);

        const easedProgress = hideOverlayAfter
          ? 1 - (1 - progress) * (1 - progress) // easeOut quad
          : progress * progress; // easeIn quad

        setFPosition({
          x: start.x + distanceX * easedProgress,
          y: start.y + distanceY * easedProgress,
        });

        if (controller && hideOverlayAfter) {
          setAdjustFocus({ value: 1 - easedProgress, lower: 0, upper: 1 });
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else if (hideOverlayAfter) {
          removeOverlay();
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }, [animationDuration, controller, removeOverlay]);

    // Animate to position wrapper
    const animateToPosition = useCallback((position: { x: number; y: number }, hideOverlayAfter: boolean) => {
      animateOffset(fPosition, position, hideOverlayAfter);
    }, [fPosition, animateOffset]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focusOverlayMode: controller?.focusOverlayMode || FocusOverlayMode.ADJUST,
      get fPosition() { return fPosition; },
      get cPosition() { return cPosition; },
      get mounted() { return isInFocus; },
      showOverlay,
      hideOverlay,
      removeOverlay,
      adjustPosition,
      animateToPosition,
    }), [
      fPosition,
      cPosition,
      isInFocus,
      showOverlay,
      hideOverlay,
      removeOverlay,
      adjustPosition,
      animateToPosition,
      controller?.focusOverlayMode
    ]);

    // Bind controller methods if provided
    useEffect(() => {
      if (controller && !isControllerBinded.current) {
        // Store the controller methods in a mutable object
        const controllerMethods = {
          showOverlay,
          hideOverlay,
          removeOverlay,
          adjustPosition,
          animateToPosition,
          getFPosition: () => fPosition,
          getCPosition: () => cPosition,
          getMounted: () => isInFocus,
        };

        // Use a proxy to handle the controller methods
        const controllerProxy = new Proxy(controller, {
          get(target, prop) {
            if (prop in controllerMethods) {
              return (controllerMethods as any)[prop];
            }
            return (target as any)[prop];
          },
        });

        // Assign the proxy back to the controller (this is a workaround)
        Object.assign(controller, controllerProxy);

        isControllerBinded.current = true;
      }
    }, [controller, showOverlay, hideOverlay, removeOverlay, adjustPosition, animateToPosition, fPosition, cPosition, isInFocus]);

    // Clean up animation on unmount
    useEffect(() => {
      return () => {
        cancelAnimationFrame(animationRef.current);
      };
    }, []);

    // Calculate revised position based on animation progress
    const revisedPosition = useMemo(() => {
      if (controller) {
        const targetPosition = onPosition?.(null, fPosition, size) || fPosition;
        return {
          x: mapValueToNewRange(adjustFocus.value, adjustFocus.lower, adjustFocus.upper, cPosition.x, targetPosition.x),
          y: mapValueToNewRange(adjustFocus.value, adjustFocus.lower, adjustFocus.upper, cPosition.y, targetPosition.y),
        };
      } else {
        const targetPosition = onPosition?.(null, fPosition, size) || fPosition;
        return {
          x: mapValueToNewRange(animationProgress, 0, 1, cPosition.x, targetPosition.x),
          y: mapValueToNewRange(animationProgress, 0, 1, cPosition.y, targetPosition.y),
        };
      }
    }, [controller, fPosition, cPosition, size, animationProgress, adjustFocus, onPosition, mapValueToNewRange]);

    // Calculate opacity based on animation progress
    const opacity = useMemo(() => {
      if (controller) {
        return mapValueToNewRange(adjustFocus.value, adjustFocus.lower, adjustFocus.upper, 0, 1);
      } else {
        return mapValueToNewRange(animationProgress, 0, 1, 0, 1);
      }
    }, [controller, animationProgress, adjustFocus, mapValueToNewRange]);

    return (
      <>
        {/* Main child content */}
        <div
          ref={childRef}
          className={className}
          style={{
            opacity: isInFocus ? 0 : 1,
            display: 'inline-block'
          }}
        >
          {children(null, showOverlay)}
        </div>

        {/* Overlay */}
        {overlayVisible && (
          <div
            ref={overlayRef}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: backgroundOverlay,
              opacity: opacity,
              zIndex: 9999,
              cursor: dismissible ? 'pointer' : 'default',
              transition: controller ? 'none' : `opacity ${animationDuration}ms ${fadeInCurve}`,
            }}
            onClick={dismissible ? hideOverlay : undefined}
          >
            {/* Focus content */}
            <div
              ref={focusRef}
              style={{
                position: 'absolute',
                left: revisedPosition.x,
                top: revisedPosition.y,
                opacity: opacity,
                zIndex: 10000,
                pointerEvents: 'auto',
                transition: controller ? 'none' : `opacity ${animationDuration}ms ${fadeInCurve}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {onFocus(null, revisedPosition, children(null, showOverlay), size, hideOverlay)}
            </div>
          </div>
        )}
      </>
    );
  }
);

AcademixFocusOverlayComponent.displayName = 'AcademixFocusOverlayComponent';

// Create a hook for using the controller
export const useFocusOverlayController = (mode: FocusOverlayMode = FocusOverlayMode.ADJUST): FocusOverlayController => {
  const controllerRef = useRef<FocusOverlayController>({
    focusOverlayMode: mode,
    fPosition: { x: 0, y: 0 },
    cPosition: { x: 0, y: 0 },
    mounted: false,
    showOverlay: () => {},
    hideOverlay: () => {},
    removeOverlay: () => {},
    adjustPosition: () => {},
    animateToPosition: () => {},
  });

  return controllerRef.current;
};

export default AcademixFocusOverlayComponent;