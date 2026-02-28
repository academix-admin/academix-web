'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import React from 'react';

// ==================== Types ====================
interface DialogButton {
  text: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
}

interface DialogLayoutProps {
  backgroundColor?: string;
  maxWidth?: string;
  borderRadius?: string;
  margin?: string;
}

interface DialogViewerProps {
  id?: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  customView?: React.ReactNode;
  buttons?: DialogButton[];
  showCancel?: boolean;
  cancelText?: string;
  layoutProp?: DialogLayoutProps;
  unmountOnClose?: boolean;
  zIndex?: number;
  closeOnBackdrop?: boolean;
}

// ==================== Styles ====================
const getStyles = (id: string) => `
#${id} .dialog-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
}

#${id} .dialog-container {
  background: white;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 32px);
  position: relative;
  animation: scaleIn 0.2s ease-out;
}

#${id} .dialog-header {
  padding: 20px 20px 12px;
  text-align: center;
  flex-shrink: 0;
}

#${id} .dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

#${id} .dialog-content {
  padding: 0 20px 20px;
  overflow-y: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

#${id} .dialog-message {
  font-size: 14px;
  color: #666;
  text-align: center;
  line-height: 1.5;
  margin: 0;
}

#${id} .dialog-actions {
  display: flex;
  gap: 8px;
  padding: 12px 20px 20px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

@media (max-width: 400px) {
  #${id} .dialog-actions {
    flex-direction: column;
  }
  
  #${id} .dialog-button {
    width: 100%;
  }
}

#${id} .dialog-button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
}

#${id} .dialog-button-primary {
  background-color: #007AFF;
  color: white;
}

#${id} .dialog-button-primary:hover {
  background-color: #0051D5;
}

#${id} .dialog-button-secondary {
  background-color: #f0f0f0;
  color: #1a1a1a;
}

#${id} .dialog-button-secondary:hover {
  background-color: #e0e0e0;
}

#${id} .dialog-button-danger {
  background-color: #FF3B30;
  color: white;
}

#${id} .dialog-button-danger:hover {
  background-color: #D70015;
}

#${id} .dialog-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

#${id} .dialog-button-loading {
  position: relative;
  color: transparent !important;
}

#${id} .dialog-button-loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  top: 50%;
  left: 50%;
  margin-left: -8px;
  margin-top: -8px;
  border: 2px solid currentColor;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 0.6s linear infinite;
  color: white;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

#${id} .body-dialog-open {
  overflow: hidden;
  position: fixed;
  width: 100%;
  height: 100%;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { 
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to { 
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

#${id} .dialog-overlay-animate {
  animation: fadeIn 0.2s ease-out;
}

@media (max-width: 480px) {
  #${id} .dialog-overlay {
    padding: 12px;
  }
  
  #${id} .dialog-container {
    max-height: calc(100vh - 24px);
    border-radius: 16px;
  }
  
  #${id} .dialog-header {
    padding: 16px 16px 8px;
  }
  
  #${id} .dialog-content {
    padding: 0 16px 16px;
  }
  
  #${id} .dialog-actions {
    padding: 8px 16px 16px;
  }
}
`;

// ==================== Hook to inject CSS per instance ====================
const useInjectStyles = (id: string) => {
  useEffect(() => {
    const styleId = `dialog-viewer-styles-${id}`;
    if (document.getElementById(styleId)) return;

    const styleTag = document.createElement("style");
    styleTag.id = styleId;
    styleTag.innerHTML = getStyles(id);
    document.head.appendChild(styleTag);

    return () => {
      const tag = document.getElementById(styleId);
      if (tag) document.head.removeChild(tag);
    };
  }, [id]);
};

// ==================== DialogViewer Component ====================
const DialogViewer = React.forwardRef<any, DialogViewerProps>(({
  id: providedId,
  isOpen,
  onClose,
  title,
  message,
  customView,
  buttons,
  showCancel = true,
  cancelText = "Cancel",
  layoutProp,
  unmountOnClose = true,
  zIndex = 1000,
  closeOnBackdrop = true,
}, ref) => {
  const [id] = useState(() => providedId || `dialog-${Math.random().toString(36).substr(2, 9)}`);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // FIX: Single content state, no isAnimating state.
  // Content is seeded once on first open and then only changed via imperative handle.
  const [currentContent, setCurrentContent] = useState<React.ReactNode>(customView);
  const isControlledInternally = useRef(false);

  // FIX: Track whether we have ever been opened so unmountOnClose works correctly
  // without depending on a separate animation state that causes flicker.
  const hasBeenOpened = useRef(false);
  if (isOpen) hasBeenOpened.current = true;

  useInjectStyles(id);

  // Sync external customView prop only when not controlled internally
  useEffect(() => {
    if (!isControlledInternally.current) {
      setCurrentContent(customView);
    }
  }, [customView]);

  // Body scroll lock and focus management — no isAnimating involvement
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.classList.add('body-dialog-open');
      setTimeout(() => dialogRef.current?.focus(), 100);
    } else {
      document.body.classList.remove('body-dialog-open');
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
      isControlledInternally.current = false;
    }

    return () => {
      document.body.classList.remove('body-dialog-open');
    };
  }, [isOpen]);

  // Overlay ref — needed to attach non-passive native scroll/touch listeners
  const overlayRef = useRef<HTMLDivElement>(null);

  // Stop propagation for clicks directly on the container (capture phase)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("dialog-container")) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  // Block scroll/wheel/touch bleed-through on the backdrop.
  // React synthetic onWheel/onTouchMove CANNOT call preventDefault() because
  // React registers those listeners as passive by default — the call is
  // silently ignored. Only native { passive: false } listeners can block scroll.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !isOpen) return;

    const blockScroll = (e: Event) => {
      // Allow scrolling inside the dialog box itself — block everything else
      const target = e.target as HTMLElement;
      if (!target.closest('.dialog-container')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    overlay.addEventListener('wheel',      blockScroll, { passive: false });
    overlay.addEventListener('touchmove',  blockScroll, { passive: false });
    // Prevent mousedown/touchstart on backdrop reaching elements underneath
    overlay.addEventListener('mousedown',  blockScroll, { passive: false });
    overlay.addEventListener('touchstart', blockScroll, { passive: false });

    return () => {
      overlay.removeEventListener('wheel',      blockScroll);
      overlay.removeEventListener('touchmove',  blockScroll);
      overlay.removeEventListener('mousedown',  blockScroll);
      overlay.removeEventListener('touchstart', blockScroll);
    };
  }, [isOpen]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (closeOnBackdrop) onClose();
  }, [closeOnBackdrop, onClose]);

  const handleButtonClick = useCallback((button: DialogButton) => {
    if (button.onClick) button.onClick();
    else onClose();
  }, [onClose]);

  React.useImperativeHandle(ref, () => ({
    updateContent: (content: React.ReactNode) => {
      isControlledInternally.current = true;
      setCurrentContent(content);
    },
    clearContent: () => {
      isControlledInternally.current = true;
      setCurrentContent(null);
    },
    resetContent: () => {
      isControlledInternally.current = false;
      setCurrentContent(customView);
    },
  }));

  // FIX: Single, clean unmount guard — no isAnimating race condition.
  // Only unmount if: we've been told to unmount on close AND we've never opened
  // (or we're closed with unmountOnClose enabled).
  if (!isOpen && unmountOnClose) return null;
  if (!isOpen && !hasBeenOpened.current) return null;

  const defaultButtons: DialogButton[] = buttons || [
    { text: "OK", variant: "primary" }
  ];

  return (
    <div
      id={id}
      ref={overlayRef}
      className={`dialog-overlay ${isOpen ? 'dialog-overlay-animate' : ''}`}
      onClick={handleBackdropClick}
      style={{
        zIndex,
        visibility: isOpen ? 'visible' : 'hidden',
        pointerEvents: isOpen ? 'auto' : 'none',
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 0.15s ease-out, visibility 0.15s ease-out',
      }}
    >
      <div
        ref={dialogRef}
        className="dialog-container"
        tabIndex={-1}
        style={{
          backgroundColor: layoutProp?.backgroundColor || "#fff",
          maxWidth: layoutProp?.maxWidth || "400px",
          borderRadius: layoutProp?.borderRadius || "12px",
          // FIX: Only run entry animation when actually opening,
          // driven purely by isOpen — no intermediate state needed.
          animation: isOpen ? 'scaleIn 0.2s ease-out' : 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="dialog-header">
            <h2 className="dialog-title">{title}</h2>
          </div>
        )}

        <div className="dialog-content" style={{ margin: layoutProp?.margin }}>
          {currentContent || (message && <p className="dialog-message">{message}</p>)}
        </div>

        <div className="dialog-actions">
          {showCancel && (
            <button
              className="dialog-button dialog-button-secondary"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
          {defaultButtons.map((button, index) => (
            <button
              key={index}
              className={`dialog-button dialog-button-${button.variant || "primary"} ${button.loading ? 'dialog-button-loading' : ''}`}
              style={button.style}
              onClick={() => handleButtonClick(button)}
              disabled={button.disabled || button.loading}
            >
              {button.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

DialogViewer.displayName = 'DialogViewer';

// ==================== Controller Hook ====================
interface DialogOperation {
  open: () => void;
  close: () => void;
  toggle: () => void;
  updateContent: (content: React.ReactNode) => void;
  clearContent: () => void;
}

const useDialogController = (): [
  string,
  DialogOperation,
  boolean,
  React.Dispatch<React.SetStateAction<boolean>>,
  React.RefObject<any>,
  React.ReactNode
] => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentContent, setCurrentContent] = useState<React.ReactNode>(null);
  const dialogRef = useRef<any>(null);

  const [dialogId] = useState(() =>
    `dialogId-${Math.random().toString(36).substr(2, 9)}`
  );

  const operations: DialogOperation = {
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => setIsOpen(false), []),
    toggle: useCallback(() => setIsOpen(prev => !prev), []),

    updateContent: useCallback((newContent: React.ReactNode) => {
      setCurrentContent(newContent);
      if (dialogRef.current?.updateContent) {
        dialogRef.current.updateContent(newContent);
      }
    }, []),

    clearContent: useCallback(() => {
      setCurrentContent(null);
      if (dialogRef.current?.clearContent) {
        dialogRef.current.clearContent();
      }
    }, []),
  };

  return [dialogId, operations, isOpen, setIsOpen, dialogRef, currentContent];
};

// ==================== Stable wrapper — defined ONCE at module level ====================
// CRITICAL: This must live outside of useDialog. Defining a component type
// inside a hook body creates a new function reference on every render, which
// makes React treat it as a different component type and unmount/remount the
// DOM node on every render — causing the infinite flicker loop.
interface DialogViewerWrapperProps extends Omit<DialogViewerProps, 'id' | 'isOpen' | 'onClose' | 'customView'> {
  _stateRef: React.RefObject<{
    id: string;
    isOpen: boolean;
    onClose: () => void;
    customView: React.ReactNode;
    dialogRef: React.RefObject<any>;
  }>;
}

// The wrapper reads live state from a ref so it never needs to re-create itself.
// It re-renders only when its own props change (passed from the usage site like
// title, buttons, layoutProp etc.), not when hook-internal state cycles.
const StableDialogViewerWrapper = React.memo(
  React.forwardRef<any, DialogViewerWrapperProps>(({ _stateRef, ...props }, _ref) => {
    const s = _stateRef.current!;
    return (
      <DialogViewer
        ref={s.dialogRef}
        id={s.id}
        isOpen={s.isOpen}
        onClose={s.onClose}
        customView={s.customView}
        unmountOnClose={false}
        {...props}
      />
    );
  })
);
StableDialogViewerWrapper.displayName = 'StableDialogViewerWrapper';

// ==================== Enhanced Dialog Hook ====================
const useDialog = (initialContent?: React.ReactNode) => {
  const [id, operations, isOpen, , dialogRef, currentContent] = useDialogController();
  const [internalContent, setInternalContent] = useState<React.ReactNode>(initialContent || null);

  useEffect(() => {
    if (currentContent !== undefined) {
      setInternalContent(currentContent);
    }
  }, [currentContent]);

  // A ref that always holds the latest state values.
  // StableDialogViewerWrapper reads from this ref, so it sees current values
  // on every render of its *parent* without needing to be recreated itself.
  const stateRef = useRef({
    id,
    isOpen,
    onClose: operations.close,
    customView: internalContent,
    dialogRef,
  });

  // Keep the ref up-to-date on every render
  stateRef.current = {
    id,
    isOpen,
    onClose: operations.close,
    customView: internalContent,
    dialogRef,
  };

  const enhancedOps = {
    ...operations,
    open: (content?: React.ReactNode) => {
      if (content) {
        // Push content into the component imperatively before flipping isOpen,
        // so the first rendered frame already has the right content.
        if (dialogRef.current?.updateContent) {
          dialogRef.current.updateContent(content);
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
    clearContent: () => {
      setInternalContent(null);
      operations.clearContent();
    },
  };

  // Stable component reference — same object identity across all renders.
  // Uses stateRef so it always renders with fresh values without re-creating.
  const DialogViewerWrapper: React.FC<Omit<DialogViewerProps, 'id' | 'isOpen' | 'onClose' | 'customView'>> =
    useCallback(
      (props: Omit<DialogViewerProps, 'id' | 'isOpen' | 'onClose' | 'customView'>) => <StableDialogViewerWrapper _stateRef={stateRef} {...props} />,
      // Empty deps: the callback never needs to change because stateRef.current
      // is always up-to-date. This gives us a permanently stable component type.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    ) as any;

  return {
    isOpen,
    open: enhancedOps.open,
    close: enhancedOps.close,
    toggle: enhancedOps.toggle,
    updateContent: enhancedOps.updateContent,
    clearContent: enhancedOps.clearContent,
    DialogViewer: DialogViewerWrapper,
    currentContent: internalContent,
  };
};

// ==================== Preset Dialog Functions ====================
export const createAlertDialog = (
  title: string,
  message: string,
  onOk?: () => void
) => ({
  title,
  message,
  buttons: [{ text: "OK", variant: "primary" as const, onClick: onOk }],
  showCancel: false,
});

export const createConfirmDialog = (
  title: string,
  message: string,
  onConfirm?: () => void,
  onCancel?: () => void
) => ({
  title,
  message,
  buttons: [{ text: "Yes", variant: "primary" as const, onClick: onConfirm }],
  showCancel: true,
  cancelText: "No",
});

export const createDestructiveDialog = (
  title: string,
  message: string,
  confirmText: string,
  onConfirm?: () => void
) => ({
  title,
  message,
  buttons: [{ text: confirmText, variant: "danger" as const, onClick: onConfirm }],
  showCancel: true,
});

export { DialogViewer, useDialogController, useDialog };
export default DialogViewer;