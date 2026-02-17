import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sheet } from "react-modal-sheet";

// ==================== Types ====================
interface LayoutProps {
  backgroundColor?: string;
  handleColor?: string;
  handleWidth?: string;
  maxHeight?: string;
  maxWidth?: string;
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
  detent?: "content" | "full";
  disableDrag?: boolean;
  avoidKeyboard?: boolean;
  closeThreshold?: number;
}

// ==================== Styles ====================
const createStyles = (maxHeight?: string) => `
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
  max-height: ${maxHeight ? `calc(${maxHeight} - env(safe-area-inset-top) - 34px)` : 'calc(100% - env(safe-area-inset-top) - 34px)'} !important;
  max-width: 500px;
  margin: 0 auto;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  width: 100%;
  left: 0;
  right: 0;
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
const useInjectStyles = (maxHeight?: string, isOpen?: boolean) => {
  useEffect(() => {
    if (!isOpen) return;

    const styleId = maxHeight ? `bottom-viewer-styles-${maxHeight}` : "bottom-viewer-styles";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      styleTag.innerHTML = createStyles(maxHeight);
      document.head.appendChild(styleTag);
    }

    return () => {
      if (styleTag && document.head.contains(styleTag)) {
        document.head.removeChild(styleTag);
      }
    };
  }, [maxHeight, isOpen]);
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
  detent = "content",
  disableDrag = false,
  avoidKeyboard = true,
  closeThreshold = 0.2,
}, ref) => {
  const sheetRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  const initialChildrenRef = useRef<React.ReactNode>(children);
  const [currentContent, setCurrentContent] = useState<React.ReactNode>(children);

  useInjectStyles(layoutProp?.maxHeight, isOpen);

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

  const getMaxWidth = useCallback(() => {
    return layoutProp?.maxWidth || '500px';
  }, [layoutProp?.maxWidth]);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.classList.add('body-bottom-sheet-open');
      setTimeout(() => contentRef.current?.focus(), 100);
    } else {
      document.body.classList.remove('body-bottom-sheet-open');
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
      isControlledInternally.current = false;
    }
    return () => {
      document.body.classList.remove('body-bottom-sheet-open');
    };
  }, [isOpen]);

  const handleBackdropTap = useCallback((event: any) => {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    if (backDrop) onClose();
  }, [backDrop, onClose]);

  const handleCancelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (cancelButton?.onClick) cancelButton.onClick();
    else onClose();
  }, [cancelButton, onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains("bottom-viewer-container")) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

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
    isEventFromSheet: (event: React.MouseEvent | MouseEvent) => {
      const target = event.target as HTMLElement;
      return !!(
        target.closest('.react-modal-sheet-container') ||
        target.closest('.react-modal-sheet-backdrop') ||
        target.closest('.bottom-viewer-container')
      );
    }
  }));

  if (!isOpen && unmountOnClose) return null;

  return (
    <Sheet
      ref={sheetRef}
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0, 1]}
      initialSnap={1}
      detent={detent}
      style={{ zIndex }}
      disableDrag={disableDrag}
      avoidKeyboard={avoidKeyboard}
    >
      <Sheet.Container
        ref={containerRef}
        style={{
          maxWidth: getMaxWidth(),
          margin: "0 auto",
          width: "100%",
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
            willChange: 'transform',
          }}
        >
          <div
            ref={contentRef}
            tabIndex={-1}
            className="bottom-viewer-content bottom-viewer-content-dynamic"
            onClick={e => e.stopPropagation()}
            style={{
              contain: 'layout style paint',
            }}
          >
            {currentContent}
          </div>
        </Sheet.Content>
      </Sheet.Container>

      <Sheet.Backdrop
        {...({
          onTap: handleBackdropTap,
          onClick: handleBackdropTap,
        } as any)}
        style={{ cursor: backDrop ? 'pointer' : 'default' }}
      />
    </Sheet>
  );
});

BottomViewer.displayName = 'BottomViewer';

// ==================== Controller Hook ====================
interface Operation {
  open: () => void;
  close: () => void;
  toggle: () => void;
  updateContent: (content: React.ReactNode) => void;
  replaceContent: (content: React.ReactNode) => void;
  clearContent: () => void;
  isEventFromSheet: (event: React.MouseEvent | MouseEvent) => boolean;
}

const useBottomController = (): [
  string,
  Operation,
  boolean,
  React.Dispatch<React.SetStateAction<boolean>>,
  React.RefObject<any>,
  React.ReactNode
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

    isEventFromSheet: useCallback((event: React.MouseEvent | MouseEvent) => {
      if (sheetRef.current?.isEventFromSheet) {
        return sheetRef.current.isEventFromSheet(event);
      }
      return false;
    }, []),
  };

  return [bottomViewId, operations, isOpen, setIsOpen, sheetRef, currentContent];
};

// ==================== Stable wrapper — defined ONCE at module level ====================
// CRITICAL: Must live outside useBottomSheet. A component type defined inside a
// hook body gets a new function reference on every render, so React unmounts and
// remounts the entire subtree each time — causing the infinite flicker loop.
interface BottomViewerWrapperInternalProps extends Omit<BottomViewerProps, 'id' | 'isOpen' | 'onClose' | 'children'> {
  _stateRef: React.RefObject<{
    id: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    sheetRef: React.RefObject<any>;
  }>;
}

// Reads live state from a ref — stable identity, always fresh values.
const StableBottomViewerWrapper = React.memo(
  React.forwardRef<any, BottomViewerWrapperInternalProps>(({ _stateRef, ...props }, _ref) => {
    const s = _stateRef.current!;
    return (
      <BottomViewer
        ref={s.sheetRef}
        id={s.id}
        isOpen={s.isOpen}
        onClose={s.onClose}
        unmountOnClose={false}
        {...props}
      >
        {s.children}
      </BottomViewer>
    );
  })
);
StableBottomViewerWrapper.displayName = 'StableBottomViewerWrapper';

// ==================== Enhanced BottomSheet Hook ====================
const useBottomSheet = (initialContent?: React.ReactNode) => {
  const [id, operations, isOpen, , sheetRef, currentContent] = useBottomController();
  const [internalContent, setInternalContent] = useState<React.ReactNode>(initialContent || null);

  useEffect(() => {
    if (currentContent !== undefined) {
      setInternalContent(currentContent);
    }
  }, [currentContent]);

  // Ref that always holds the latest state — StableBottomViewerWrapper reads
  // from here so it sees current values without needing to be recreated.
  const stateRef = useRef({
    id,
    isOpen,
    onClose: operations.close,
    children: internalContent,
    sheetRef,
  });

  // Keep ref up-to-date on every render (synchronous, before any paint)
  stateRef.current = {
    id,
    isOpen,
    onClose: operations.close,
    children: internalContent,
    sheetRef,
  };

  const enhancedOps = {
    ...operations,
    open: (content?: React.ReactNode) => {
      if (content) {
        // Push content imperatively before isOpen flips so first frame is correct
        if (sheetRef.current?.updateContent) {
          sheetRef.current.updateContent(content);
        }
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

  // Stable component reference — useCallback with [] gives permanent identity.
  // stateRef.current is always up-to-date so fresh values are read on every render.
  const BottomViewerWrapper: React.FC<Omit<BottomViewerProps, 'id' | 'isOpen' | 'onClose' | 'children'>> =
    useCallback(
      (props: Omit<BottomViewerProps, 'id' | 'isOpen' | 'onClose' | 'children'>) =>
        <StableBottomViewerWrapper _stateRef={stateRef} {...props} />,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    ) as any;

  return {
    isOpen,
    open: enhancedOps.open,
    close: enhancedOps.close,
    toggle: enhancedOps.toggle,
    updateContent: enhancedOps.updateContent,
    replaceContent: enhancedOps.replaceContent,
    clearContent: enhancedOps.clearContent,
    isEventFromSheet: operations.isEventFromSheet,
    BottomViewer: BottomViewerWrapper,
    currentContent: internalContent,
  };
};

export { BottomViewer, useBottomController, useBottomSheet };
export default BottomViewer;