import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sheet } from "react-modal-sheet";

// ==================== Types ====================
interface LayoutProps {
  backgroundColor?: string;
  handleColor?: string;
  handleWidth?: string;
  maxHeight?: string;
  maxWidth?: string; // Added maxWidth to LayoutProps
}

interface CancelButtonProps {
  text?: string;
  view?: React.ReactNode;
  position?: "left" | "right";
  style?: React.CSSProperties;
  onClick?: () => void;
}

interface BottomViewerProps {
  id: string;
  isOpen: boolean;
  backDrop?: boolean;
  onClose: () => void;
  cancelButton?: CancelButtonProps;
  layoutProp?: LayoutProps;
  children?: React.ReactNode;
  unmountOnClose?: boolean;
  zIndex?: number;
  disableDrag?: boolean;
  avoidKeyboard?: boolean;
  closeThreshold?: number;
}

// ==================== Styles ====================
const styles = `
.bottom-viewer-drag-handle {
  height: 5px;
  border-radius: 3px;
  margin: 16px auto;
  cursor: grab;
}
.bottom-viewer-drag-handle:active {
  cursor: grabbing;
}
.bottom-viewer-header {
  padding: 0px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
  flex-shrink: 0;
}
.bottom-viewer-content {
  height: 100%;
  overflow-y: auto;
  padding: 0 0px 0px 0px;
  -webkit-overflow-scrolling: touch;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
  /* ✅ Prevent layout thrashing during measurement */
  contain: layout style paint;
}
.bottom-viewer-cancel-btn {
  position: absolute;
  top: 8px;
  border: none;
  background-color: transparent;
  cursor: pointer;
  padding: 8px 16px;
  font-size: 16px;
  color: #007AFF;
  z-index: 1;
  min-height: 44px;
}
.bottom-viewer-cancel-btn:hover { opacity: 0.7; }
.bottom-viewer-cancel-btn.left { left: 0px; }
.bottom-viewer-cancel-btn.right { right: 0px; }
.react-modal-sheet-container {
  max-height: calc(var(--vh, 1vh) * 100);
  max-width: 500px; /* Default max-width */
  margin: 0 auto;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}
.react-modal-sheet-backdrop {
  background-color: rgba(0, 0, 0, 0.5) !important;
  pointer-events: auto !important;
}
.react-modal-sheet-content {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  /* ✅ Prevent layout thrashing on large screens */
  contain: layout style;
}
@media (max-width: 500px) {
  .react-modal-sheet-container {
    max-width: 100%;
    border-radius: 0;
    margin-left: env(safe-area-inset-left, 0px);
    margin-right: env(safe-area-inset-right, 0px);
    width: calc(100% - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px));
  }
}
/* Dynamic media query for custom max-width */
@media (max-width: var(--bottom-viewer-max-width, 500px)) {
  .react-modal-sheet-container {
    max-width: 100%;
    border-radius: 0;
    margin-left: env(safe-area-inset-left, 0px);
    margin-right: env(safe-area-inset-right, 0px);
    width: calc(100% - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px));
  }
}
.body-bottom-sheet-open {
  overflow: hidden;
  position: fixed;
  width: 100%;
  height: 100%;
}
.bottom-viewer-content-dynamic {
  transition: all 0.3s ease-out;
}
.bottom-viewer-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: #666;
}
`;

// ==================== Hook to inject CSS once ====================
const useInjectStyles = () => {
  useEffect(() => {
    if (!document.getElementById("bottom-viewer-styles")) {
      const styleTag = document.createElement("style");
      styleTag.id = "bottom-viewer-styles";
      styleTag.innerHTML = styles;
      document.head.appendChild(styleTag);
    }
  }, []);
};

// ==================== BottomViewer Component ====================
const BottomViewer = React.forwardRef<any, BottomViewerProps>(({
  id,
  isOpen,
  backDrop = true,
  onClose,
  cancelButton,
  layoutProp,
  children,
  unmountOnClose = true,
  zIndex = 1000,
  disableDrag = false,
  avoidKeyboard = true,
  closeThreshold = 0.2,
}, ref) => {
  const sheetRef = useRef<any>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<Element | null>(null);
    const resizeObserverTimeoutRef = useRef<NodeJS.Timeout | null>(null);  // ✅ For debouncing

    // FIX: Use a ref to track the initial children and manage state properly
    const initialChildrenRef = useRef<React.ReactNode>(children);
    const [currentContent, setCurrentContent] = useState<React.ReactNode>(children);

    useInjectStyles();

    // FIX: Only update currentContent when children prop changes AND we're not controlling content internally
    const isControlledInternally = useRef(false);

    useEffect(() => {
      if (!isControlledInternally.current) {
        setCurrentContent(children);
        initialChildrenRef.current = children;
      }
    }, [children]);

    useEffect(() => {
      const updateVh = () => {
        const vh = window.visualViewport
          ? window.visualViewport.height * 0.01
          : window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };

      updateVh();

      window.visualViewport?.addEventListener('resize', updateVh);
      window.visualViewport?.addEventListener('scroll', updateVh);
      window.addEventListener('resize', updateVh);

      return () => {
        window.visualViewport?.removeEventListener('resize', updateVh);
        window.visualViewport?.removeEventListener('scroll', updateVh);
        window.removeEventListener('resize', updateVh);
      };
    }, []);

    const calculateSafeMaxHeight = useCallback(() => {
      const fallback = 'calc(var(--vh, 1vh) * 100 - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))';
      const maxHeight = layoutProp?.maxHeight || '100dvh';

        return layoutProp?.maxHeight
          ? `calc(${layoutProp.maxHeight} - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))`
          : fallback;
    }, [layoutProp?.maxHeight]);

    // ✅ Get the max height for overflow scrolling (not container sizing)
    const getScrollableMaxHeight = useCallback(() => {
      return layoutProp?.maxHeight || 'calc(var(--vh, 1vh) * 90)';  // Cap at 90vh for scrolling
    }, [layoutProp?.maxHeight]);


    // Get the max width with 500px as default
    const getMaxWidth = useCallback(() => {
      return layoutProp?.maxWidth || '500px';
    }, [layoutProp?.maxWidth]);

    // Body scroll and focus management
    useEffect(() => {
      if (isOpen) {
        previousActiveElement.current = document.activeElement;
        document.body.classList.add('body-bottom-sheet-open');

        // Set CSS variable for dynamic media query
        const maxWidth = getMaxWidth();
        if (maxWidth !== '500px') {
          document.documentElement.style.setProperty('--bottom-viewer-max-width', maxWidth);
        }

        setTimeout(() => contentRef.current?.focus(), 100);
      } else {
        document.body.classList.remove('body-bottom-sheet-open');
        if (previousActiveElement.current instanceof HTMLElement) {
          previousActiveElement.current.focus();
        }
        // FIX: Reset control state when closed
        isControlledInternally.current = false;

        // Reset CSS variable when closed
        document.documentElement.style.removeProperty('--bottom-viewer-max-width');
      }
      return () => {
        document.body.classList.remove('body-bottom-sheet-open');
        document.documentElement.style.removeProperty('--bottom-viewer-max-width');
      };
    }, [isOpen, getMaxWidth]);

    // ResizeObserver for dynamic content height
    useEffect(() => {
      if (!contentRef.current) return;
      
      let lastHeight = 0;  // ✅ Track last measured height to prevent unnecessary updates
      
      const observer = new ResizeObserver(() => {
        if (!contentRef.current) return;
        
        // ✅ Measure actual content height (not viewport)
        const actualHeight = contentRef.current.scrollHeight;
        
        // ✅ Only update if height actually changed significantly
        if (Math.abs(actualHeight - lastHeight) > 1) {
          lastHeight = actualHeight;
          
          // ✅ Batch the update to avoid layout thrashing
          if (resizeObserverTimeoutRef.current) {
            clearTimeout(resizeObserverTimeoutRef.current);
          }
          
          resizeObserverTimeoutRef.current = setTimeout(() => {
            // Content will naturally size to its height, no need to set maxHeight here
            // The Sheet.Content has maxHeight for overflow, so just let it be
            resizeObserverTimeoutRef.current = null;
          }, 0);
        }
      });
      
      observer.observe(contentRef.current);
      
      return () => {
        observer.disconnect();
        if (resizeObserverTimeoutRef.current) {
          clearTimeout(resizeObserverTimeoutRef.current);
        }
      };
    }, []);

    const handleBackdropTap = useCallback((event: MouseEvent | PointerEvent | TouchEvent | any) => {
      if (event && typeof event.stopPropagation === 'function') {
         event.stopPropagation();
      }
      if (backDrop) onClose();
    }, [backDrop, onClose]);

    const handleCancelClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent event from bubbling up
      if (cancelButton?.onClick) cancelButton.onClick();
      else onClose();
    }, [cancelButton, onClose]);

    // FIX: Enhanced imperative handle that properly manages internal state
    React.useImperativeHandle(ref, () => ({
      updateContent: (content: React.ReactNode) => {
        isControlledInternally.current = true;
        setCurrentContent(content);
      },
      replaceContent: (content: React.ReactNode) => {
        isControlledInternally.current = true;
        setCurrentContent(content);
      },
      clearContent: () => {
        isControlledInternally.current = true;
        setCurrentContent(null);
      },
      resetContent: () => {
        isControlledInternally.current = false;
        setCurrentContent(initialChildrenRef.current);
      },
      // NEW: Function to check if event target is inside the sheet
      isEventFromSheet: (event: React.MouseEvent | MouseEvent) => {
        const target = event.target as HTMLElement;
        return !!(
          target.closest('.react-modal-sheet-container') ||
          target.closest('.react-modal-sheet-backdrop') ||
          target.closest('.bottom-viewer-container')
        );
      }
    }));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains("bottom-viewer-container")) {
        e.stopPropagation(); // <-- stops DOM bubbling
        e.stopImmediatePropagation(); // <-- stops DOM bubbling
      }
    };
    document.addEventListener("click", handler, true); // capture phase
    return () => document.removeEventListener("click", handler, true);
  }, []);


  if (!isOpen && unmountOnClose) return null;

  return (
    <Sheet
      ref={sheetRef}
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[1]}
      initialSnap={1}
      modalEffectRootId="root"
      style={{ zIndex }}
      disableDrag={disableDrag}
    >
      <Sheet.Container
        style={{
          height: "auto",
          maxHeight: "none",  // ✅ Let it size to content naturally on large screens
          maxWidth: getMaxWidth(),
          margin: "0 auto",
          width: "100%",
          left: 0,
          right: 0,
          background: layoutProp?.backgroundColor || "#fff",
        }}
        className="bottom-viewer-container"
      >
        <Sheet.Header>
          <div className="bottom-viewer-header">
            {cancelButton?.position === "left" && (
              <button
                className="bottom-viewer-cancel-btn left"
                style={cancelButton.style}
                onClick={handleCancelClick}
                aria-label={cancelButton.text || "Close"}
              >
                {cancelButton.view || cancelButton.text || "Cancel"}
              </button>
            )}

            {!disableDrag && (
              <div
                className="bottom-viewer-drag-handle"
                style={{
                  background: layoutProp?.handleColor || "#ccc",
                  width: layoutProp?.handleWidth || "40px"
                }}
              />
            )}

            {cancelButton?.position === "right" && (
              <button
                className="bottom-viewer-cancel-btn right"
                style={cancelButton.style}
                onClick={handleCancelClick}
                aria-label={cancelButton.text || "Close"}
              >
                {cancelButton.view || cancelButton.text || "Cancel"}
              </button>
            )}
          </div>
        </Sheet.Header>

        <Sheet.Content
          style={{
            flex: 1,
            overflow: "hidden",
            height: '100%',
            maxHeight: getScrollableMaxHeight(),  // ✅ Max height for scrollable content
            willChange: 'transform',
          }}
        >
          <div
            ref={contentRef}
            tabIndex={-1}
            className="bottom-viewer-content bottom-viewer-content-dynamic"
            onClick={e => e.stopPropagation()}
            style={{
              contain: 'layout style paint',  // ✅ Explicit contain for safety
            }}
          >
            {currentContent}
          </div>
        </Sheet.Content>
      </Sheet.Container>

      <Sheet.Backdrop
        {...({
            onTap: handleBackdropTap,
            onClick: handleBackdropTap, // allowed at runtime
        } as any)}
        style={{ cursor: backDrop ? 'pointer' : 'default' }}
      />
    </Sheet>
  );
});

// ==================== Controller Hook ====================
interface Operation {
  open: () => void;
  close: () => void;
  toggle: () => void;
  updateContent: (content: React.ReactNode) => void;
  replaceContent: (content: React.ReactNode) => void;
  clearContent: () => void;
  isEventFromSheet: (event: React.MouseEvent | MouseEvent) => boolean; // NEW
}

const useBottomController = (): [
  string,                     // bottom sheet id
  Operation,                   // operations
  boolean,                     // isOpen
  React.Dispatch<React.SetStateAction<boolean>>, // setIsOpen
  React.MutableRefObject<any>, // ref to BottomViewer
  React.ReactNode              // current content
] => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentContent, setCurrentContent] = useState<React.ReactNode>(null);
  const sheetRef = useRef<any>(null);

  const [bottomViewId] = useState(() =>
    `bottomViewId-${Math.random().toString(36).substr(2, 9)}`
  );

  const operations: Operation = {
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => setIsOpen(false), []),
    toggle: useCallback(() => setIsOpen(prev => !prev), []),

    updateContent: useCallback((newContent: React.ReactNode) => {
      setCurrentContent(newContent);
      if (sheetRef.current?.updateContent) {
        sheetRef.current.updateContent(newContent);
      }
    }, []),

    replaceContent: useCallback((newContent: React.ReactNode) => {
      setCurrentContent(newContent);
      if (sheetRef.current?.replaceContent) {
        sheetRef.current.replaceContent(newContent);
      }
    }, []),

    clearContent: useCallback(() => {
      setCurrentContent(null);
      if (sheetRef.current?.clearContent) {
        sheetRef.current.clearContent();
      }
    }, []),

    // NEW: Expose the event checking function
    isEventFromSheet: useCallback((event: React.MouseEvent | MouseEvent) => {
      if (sheetRef.current?.isEventFromSheet) {
        return sheetRef.current.isEventFromSheet(event);
      }
      return false;
    }, []),
  };

  return [bottomViewId, operations, isOpen, setIsOpen, sheetRef, currentContent];
};

// ==================== Enhanced BottomSheet Hook ====================
const useBottomSheet = (initialContent?: React.ReactNode) => {
  const [id, operations, isOpen, setIsOpen, sheetRef, currentContent] = useBottomController();
  const [internalContent, setInternalContent] = useState<React.ReactNode>(initialContent || null);

  // Sync internal content with controller content
  useEffect(() => {
    if (currentContent !== undefined) {
      setInternalContent(currentContent);
    }
  }, [currentContent]);

  const enhancedOps = {
    ...operations,
    open: (content?: React.ReactNode) => {
      if (content) {
        setInternalContent(content);
        operations.updateContent(content);
      }
      operations.open();
    },
    updateContent: (content: React.ReactNode) => {
      setInternalContent(content);
      operations.updateContent(content);
    },
    replaceContent: (content: React.ReactNode) => {
      setInternalContent(content);
      operations.replaceContent(content);
    },
    clearContent: () => {
      setInternalContent(null);
      operations.clearContent();
    },
  };

  const BottomViewerWrapper: React.FC<Omit<BottomViewerProps, 'id' | 'isOpen' | 'onClose' | 'children'>> =
    React.memo((props) => (
      <BottomViewer
        ref={sheetRef}
        id={id}
        isOpen={isOpen}
        onClose={operations.close}
        {...props}
      >
        {internalContent}
      </BottomViewer>
    ));

  return {
    isOpen,
    open: enhancedOps.open,
    close: enhancedOps.close,
    toggle: enhancedOps.toggle,
    updateContent: enhancedOps.updateContent,
    replaceContent: enhancedOps.replaceContent,
    clearContent: enhancedOps.clearContent,
    isEventFromSheet: operations.isEventFromSheet, // NEW: Expose the event checker
    BottomViewer: BottomViewerWrapper,
    currentContent: internalContent,
  };
};

export { BottomViewer, useBottomController, useBottomSheet };
export default BottomViewer;