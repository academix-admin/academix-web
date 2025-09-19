// components/AcademixFocusOverlayComponent.tsx
'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

export enum FocusOverlayMode {
  ADJUST = 'adjust',
  VISIBLE = 'visible',
}

interface FocusOverlayController {
  showOverlay: () => void;
  hideOverlay: () => void;
  removeOverlay: () => void;
  adjustPosition: (position: (offset: { x: number; y: number }) => { x: number; y: number }) => void;
  animateToPosition: (position: { x: number; y: number }, hideOverlay: boolean) => void;
  fPosition: { x: number; y: number };
  cPosition: { x: number; y: number };
  mounted: boolean;
}

interface AcademixFocusOverlayComponentProps {
  children: (showOverlay: () => void) => ReactNode;
  tag: string;
  onFocus: (
    position: { x: number; y: number },
    child: ReactNode,
    size: { width: number; height: number },
    hideOverlay: () => void
  ) => ReactNode;
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

// ==================== Styles ====================
const styles = `
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.childContainer {
  width: fit-content;
}

.focusContent {
  z-index: 10000;
}
`;

// ==================== Hook to inject CSS once ====================
const useInjectStyles = () => {
  useEffect(() => {
    if (!document.getElementById("focus-overlay-styles")) {
      const styleTag = document.createElement("style");
      styleTag.id = "focus-overlay-styles";
      styleTag.innerHTML = styles;
      document.head.appendChild(styleTag);
    }
  }, []);
};

const AcademixFocusOverlayComponent: React.FC<AcademixFocusOverlayComponentProps> = ({
  children,
  tag,
  onFocus,
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
}) => {
  const [isInFocus, setIsInFocus] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [animationProgress, setAnimationProgress] = useState(0);
  
  const childRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  const showOverlay = useCallback(() => {
    if (!childRef.current || isInFocus) return;

    const rect = childRef.current.getBoundingClientRect();
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    
    const x = rect.left + scrollX;
    const y = rect.top + scrollY;
    
    setPosition({ x, y });
    setSize({ width: rect.width, height: rect.height });
    setIsInFocus(true);
    setOverlayVisible(true);
    
    onFocusEntryOverlay?.();
    
    // Animate in
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
    
    if (autoHideDuration) {
      setTimeout(() => hideOverlay(), autoHideDuration);
    }
  }, [isInFocus, animationDuration, autoHideDuration, onFocusEntryOverlay]);

  const hideOverlay = useCallback(async () => {
    if (!isInFocus) return;
    
    await onBeforeHiddenOverlay?.();
    
    if (animateDismiss) {
      // Animate out
      let start: number | null = null;
      const animate = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = 1 - Math.min((timestamp - start) / animationDuration, 1);
        setAnimationProgress(progress);
        
        if (progress > 0) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setOverlayVisible(false);
          setIsInFocus(false);
          onAfterHiddenOverlay?.();
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setOverlayVisible(false);
      setIsInFocus(false);
      onAfterHiddenOverlay?.();
    }
  }, [isInFocus, animateDismiss, animationDuration, onBeforeHiddenOverlay, onAfterHiddenOverlay]);

  const removeOverlay = useCallback(() => {
    setOverlayVisible(false);
    setIsInFocus(false);
    cancelAnimationFrame(animationRef.current);
  }, []);

  const adjustPosition = useCallback((positionFn: (offset: { x: number; y: number }) => { x: number; y: number }) => {
    setPosition(prev => positionFn(prev));
  }, []);

  const animateToPosition = useCallback((newPosition: { x: number; y: number }, hide: boolean) => {
    // Implementation for smooth position animation
    const startPos = { ...position };
    const distanceX = newPosition.x - startPos.x;
    const distanceY = newPosition.y - startPos.y;
    
    let start: number | null = null;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / animationDuration, 1);
      
      setPosition({
        x: startPos.x + distanceX * progress,
        y: startPos.y + distanceY * progress,
      });
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (hide) {
        removeOverlay();
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [position, animationDuration, removeOverlay]);

  // Expose controller methods if provided
  useEffect(() => {
    if (controller) {
      // This would typically be implemented with a ref to store the controller methods
      // For simplicity, we're not implementing the full controller binding here
    }
  }, [controller]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const mapValueToNewRange = (
    value: number,
    minInput: number,
    maxInput: number,
    minOutput: number,
    maxOutput: number
  ): number => {
    if (maxInput === minInput) return minOutput;
    return minOutput + ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput);
  };

  const revisedX = mapValueToNewRange(animationProgress, 0, 1, position.x, position.x);
  const revisedY = mapValueToNewRange(animationProgress, 0, 1, position.y, position.y);
  const bgOpacity = mapValueToNewRange(animationProgress, 0, 1, 0, 1);

  return (
    <>
      <div
        ref={childRef}
        style={{ opacity: isInFocus ? 0 : 1 }}
        onClick={showOverlay}
      >
        {children(showOverlay)}
      </div>

      {overlayVisible && (
        <div
          ref={overlayRef}
          style={{
            backgroundColor: backgroundOverlay,
            opacity: bgOpacity
          }}
          onClick={dismissible ? hideOverlay : undefined}
        >
          <div
            style={{
              position: 'absolute',
              left: revisedX,
              top: revisedY,
              opacity: animationProgress,
              transition: `opacity ${animationDuration}ms ${fadeInCurve}`
            }}
          >
            {onFocus({ x: revisedX, y: revisedY }, children(showOverlay), size, hideOverlay)}
          </div>
        </div>
      )}
    </>
  );
};

export default AcademixFocusOverlayComponent;