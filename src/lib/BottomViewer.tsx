import React, { useState, useEffect, useRef } from "react";
import { Sheet } from "react-modal-sheet";

// ==================== Types ====================
type LayoutProps = {
  backgroundColor?: string;
  handleColor?: string;
  handleWidth?: string;
};

type CancelButtonProps = {
  text?: string;
  view?: React.ReactNode;
  position?: "left" | "right";
  style?: React.CSSProperties;
  onClick?: () => void;
};

type BottomViewerProps = {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  cancelButton?: CancelButtonProps;
  layoutProp?: LayoutProps;
  children?: React.ReactNode;
  unmountOnClose?: boolean;
  zIndex?: number;
  closeThreshold?: number;
};

// ==================== Styles ====================
const styles = `
.bottom-viewer-drag-handle {
  height: 5px;
  border-radius: 3px;
  margin: 16px auto;
}

.bottom-viewer-header {
  padding: 0px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    width: 100%;
}

.bottom-viewer-content {
  height: 100%;
    overflow-y: auto;
    padding: 0 0px 0px 0px;
    -webkit-overflow-scrolling: touch;
    display: flex;
      flex-direction: column;
      gap: 8px;
}

/* React Modal Sheet overrides */
.react-modal-sheet-container {
  max-width: 500px;
  margin: 0 auto;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
}

.react-modal-sheet-backdrop {
  background-color: rgba(0, 0, 0, 0.5) !important;
}

.react-modal-sheet-content {
    padding: 0 0px 0px 0px;
    height: 100%;
}

/* Mobile full-width behavior */
@media (max-width: 500px) {
  .react-modal-sheet-container {
    max-width: 100%;
    border-radius: 0;
  }
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

// ==================== Component ====================
const BottomViewer: React.FC<BottomViewerProps> = ({
  id,
  isOpen,
  onClose,
  cancelButton,
  layoutProp,
  children,
  unmountOnClose = true,
  zIndex = 1000,
  closeThreshold = 0.2,
}) => {
  const sheetRef = useRef<any>(null);

  useInjectStyles();

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
    >
      <Sheet.Container
        style={{
          height: "auto",
                    maxWidth: "500px",
                    margin: "0 auto",
                    width: "100%",
                    left: 0,
                    right: 0,
                    paddingBottom: "calc(0px + env(safe-area-inset-bottom))",
                    background: layoutProp?.backgroundColor,
        }}
      >
        <Sheet.Header>
          <div className="bottom-viewer-header">
            {/* Cancel button left */}
            {cancelButton?.position === "left" && (
              <button
                style={{
                  position: "absolute",
                  left: "0px",
                  top: "8px",
                  border: "none",
                  backgroundColor: "transparent",
                  ...cancelButton.style
                }}
                onClick={cancelButton.onClick || onClose}
              >
                {cancelButton.view || cancelButton.text || "Cancel"}
              </button>
            )}

            {/* Drag handle */}
            <div
              className="bottom-viewer-drag-handle"
              style={{
                background: layoutProp?.handleColor || "#ccc",
                width: layoutProp?.handleWidth || "40px"
              }}
            />

            {/* Cancel button right */}
            {cancelButton?.position === "right" && (
              <button
                style={{
                  position: "absolute",
                  right: "0px",
                  top: "8px",
                  border: "none",
                  backgroundColor: "transparent",
                  ...cancelButton.style
                }}
                onClick={cancelButton.onClick || onClose}
              >
                {cancelButton.view || cancelButton.text || "Cancel"}
              </button>
            )}
          </div>
        </Sheet.Header>
        <Sheet.Content>
          <div className="bottom-viewer-content">
            {children}
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={onClose} />
    </Sheet>
  );
};

// ==================== Controller Hook ====================
type Operation = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const useBottomController = (): [
  string,
  Operation,
  boolean
] => {
  const [isOpen, setIsOpen] = useState(false);
  const bottomViewId = `bottomViewId-${Math.random().toString(36).substr(2, 9)}`;

  const operations: Operation = {
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };

  return [bottomViewId, operations, isOpen];
};

export { BottomViewer, useBottomController };
export default BottomViewer;