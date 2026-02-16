import React, { useState, useEffect, useRef, useCallback } from "react";

// ==================== Types ====================
interface DialogButton {
  text: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  variant?: "primary" | "secondary" | "danger";
}

interface DialogLayoutProps {
  backgroundColor?: string;
  maxWidth?: string;
  borderRadius?: string;
}

interface DialogViewerProps {
  id: string;
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
const createStyles = () => `
.dialog-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.dialog-container {
  background: white;
  border-radius: 12px;
  max-width: 400px;
  width: calc(100% - 32px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: scaleIn 0.2s ease-out;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.dialog-header {
  padding: 20px 20px 12px;
  text-align: center;
  flex-shrink: 0;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.dialog-content {
  padding: 0 20px 20px;
  overflow-y: auto;
  flex: 1;
}

.dialog-message {
  font-size: 14px;
  color: #666;
  text-align: center;
  line-height: 1.5;
  margin: 0;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  padding: 12px 20px 20px;
  flex-shrink: 0;
}

.dialog-button {
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

.dialog-button-primary {
  background-color: #007AFF;
  color: white;
}

.dialog-button-primary:hover {
  background-color: #0051D5;
}

.dialog-button-secondary {
  background-color: #f0f0f0;
  color: #1a1a1a;
}

.dialog-button-secondary:hover {
  background-color: #e0e0e0;
}

.dialog-button-danger {
  background-color: #FF3B30;
  color: white;
}

.dialog-button-danger:hover {
  background-color: #D70015;
}

.body-dialog-open {
  overflow: hidden;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { 
    opacity: 0;
    transform: scale(0.95);
  }
  to { 
    opacity: 1;
    transform: scale(1);
  }
}
`;

// ==================== Hook to inject CSS ====================
const useInjectStyles = (isOpen?: boolean) => {
  useEffect(() => {
    if (!isOpen) return;

    const styleId = "dialog-viewer-styles";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      styleTag.innerHTML = createStyles();
      document.head.appendChild(styleTag);
    }

    return () => {
      if (styleTag && document.head.contains(styleTag)) {
        document.head.removeChild(styleTag);
      }
    };
  }, [isOpen]);
};

// ==================== DialogViewer Component ====================
const DialogViewer = React.forwardRef<any, DialogViewerProps>(({
  id,
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const [currentContent, setCurrentContent] = useState<React.ReactNode>(customView);
  const isControlledInternally = useRef(false);

  useInjectStyles(isOpen);

  useEffect(() => {
    if (!isControlledInternally.current) {
      setCurrentContent(customView);
    }
  }, [customView]);

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

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
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

  if (!isOpen && unmountOnClose) return null;

  const defaultButtons: DialogButton[] = buttons || [
    { text: "OK", variant: "primary" }
  ];

  return (
    <div 
      className="dialog-overlay" 
      onClick={handleBackdropClick}
      style={{ zIndex }}
    >
      <div 
        ref={dialogRef}
        className="dialog-container"
        tabIndex={-1}
        style={{
          backgroundColor: layoutProp?.backgroundColor || "#fff",
          maxWidth: layoutProp?.maxWidth || "400px",
          borderRadius: layoutProp?.borderRadius || "12px",
        }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="dialog-header">
            <h2 className="dialog-title">{title}</h2>
          </div>
        )}

        <div className="dialog-content">
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
              className={`dialog-button dialog-button-${button.variant || "primary"}`}
              style={button.style}
              onClick={() => handleButtonClick(button)}
            >
              {button.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

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

// ==================== Enhanced Dialog Hook ====================
const useDialog = (initialContent?: React.ReactNode) => {
  const [id, operations, isOpen, setIsOpen, dialogRef, currentContent] = useDialogController();
  const [internalContent, setInternalContent] = useState<React.ReactNode>(initialContent || null);

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
    clearContent: () => {
      setInternalContent(null);
      operations.clearContent();
    },
  };

  const DialogViewerWrapper: React.FC<Omit<DialogViewerProps, 'id' | 'isOpen' | 'onClose' | 'customView'>> =
    React.memo((props) => (
      <DialogViewer
        ref={dialogRef}
        id={id}
        isOpen={isOpen}
        onClose={operations.close}
        customView={internalContent}
        {...props}
      />
    ));

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
