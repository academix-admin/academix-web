import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sheet } from "react-modal-sheet";

// ==================== Types ====================
type Padding = {
  l: string;
  r: string;
  t: string;
  b: string;
};

type SnapPoint = number;

type TitleProps = {
  text: string;
  className?: string;
};

type SearchProps = {
  text: string;
  className?: string;
  background?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  prefixGap?: string;
  suffixGap?: string;
  padding?: Padding;
  autoFocus?: boolean;
  onChange?: (value: string) => void;
};

type LoadingProps = {
  view: React.ReactNode;
  padding?: Padding;
};

type NoResultProps = {
  view: React.ReactNode;
  text?: string;
  padding?: Padding;
};

type CancelButtonProps = {
  text?: string;
  view: React.ReactNode;
  position?: "left" | "right";
  onClick?: () => void;
};

type LayoutProps = {
  gapBetweenHandleAndTitle?: string;
  gapBetweenTitleAndSearch?: string;
  gapBetweenSearchAndContent?: string;
  backgroundColor?: string;
  handleColor?: string;
  handleWidth?: string;
};

type SelectionViewerProps = {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  titleProp: TitleProps;
  searchProp?: SearchProps;
  loadingProp?: LoadingProps;
  noResultProp?: NoResultProps;
  cancelButton?: CancelButtonProps;
  layoutProp?: LayoutProps;
  childrenDirection?: "vertical" | "horizontal";
  children?: React.ReactNode;
  onPaginate?: () => boolean | Promise<boolean>;
  snapPoints?: SnapPoint[];
  initialSnap?: number;
  unmountOnClose?: boolean;
  zIndex?: number;
  maxHeight?: string;
  minHeight?: string;
  showLoading?: boolean;
  showEmpty?: boolean;
  closeThreshold?: number;
};

// ==================== Styles ====================
const styles = `
.selection-viewer-header {
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.selection-viewer-drag-handle {
  height: 5px;
  border-radius: 3px;
}

.selection-viewer-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.selection-viewer-search {
  display: flex;
  align-items: center;
  margin: 0 16px 16px;
  border-radius: 8px;
}

.selection-viewer-search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px;
  outline: none;
  font-size: 16px;
}

.selection-viewer-content {
  height: 100%;
  overflow-y: auto;
  padding: 0 16px 16px 0px;
  -webkit-overflow-scrolling: touch;
}

.selection-viewer-content.vertical {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selection-viewer-content.horizontal {
  display: flex;
  flex-direction: row;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
}

.selection-viewer-no-results,
.selection-viewer-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
}

.selection-viewer-default-no-results {
  color: #666;
  font-size: 14px;
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
  padding: 0 8px 8px 0px;
  height: 100%;
}

/* Mobile full-width behavior */
@media (max-width: 500px) {
  .react-modal-sheet-container {
    max-width: 100%;
    border-radius: 0;
  }
}

/* Prevent iOS zooming */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  .selection-viewer-search-input {
    font-size: 16px !important;
  }
}
`;

// ==================== Hook to inject CSS once ====================
const useInjectStyles = () => {
  useEffect(() => {
    if (!document.getElementById("selection-viewer-styles")) {
      const styleTag = document.createElement("style");
      styleTag.id = "selection-viewer-styles";
      styleTag.innerHTML = styles;
      document.head.appendChild(styleTag);
    }
  }, []);
};

// ==================== Component ====================
const SelectionViewer: React.FC<SelectionViewerProps> = ({
  id,
  isOpen,
  onClose,
  titleProp,
  searchProp,
  loadingProp,
  noResultProp,
  cancelButton,
  layoutProp,
  childrenDirection = "vertical",
  children,
  onPaginate,
  snapPoints = [0.5, 0.8],
  initialSnap = 0,
  unmountOnClose = true,
  zIndex = 1000,
  maxHeight = "90vh",
  minHeight = "65vh",
  showLoading = false,
  showEmpty = false,
  closeThreshold = 0.2,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [activeSnap, setActiveSnap] = useState(initialSnap);
  const isPaginating = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useInjectStyles();

  // Auto-focus on search
  useEffect(() => {
    if (isOpen && searchProp?.autoFocus && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, searchProp?.autoFocus]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    searchProp?.onChange?.(value);
  };

  const handleScroll = useCallback(
    async (e: React.UIEvent<HTMLDivElement>) => {
      if (isPaginating.current || !onPaginate) return;

      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const isNearBottom = scrollHeight - scrollTop <= clientHeight * 1.2;

      if (isNearBottom) {
        isPaginating.current = true;
        const hasMore = await onPaginate();
        if (!hasMore) {
          isPaginating.current = false;
        } else {
          setTimeout(() => {
            isPaginating.current = false;
          }, 500);
        }
      }
    },
    [onPaginate]
  );

  if (!isOpen && unmountOnClose) return null;

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={snapPoints}
      initialSnap={initialSnap}
      onSnap={setActiveSnap}
      rootId="root"
      style={{ zIndex }}
    >
      <Sheet.Container
        style={{
          maxHeight,
          minHeight,
          maxWidth: "500px",
          margin: "0 auto",
          width: "100%",
          left: 0,
          right: 0,
          paddingBottom: "calc(8px + env(safe-area-inset-bottom))", // ✅ Safe area fix
          background: layoutProp?.backgroundColor,
        }}
      >
        <Sheet.Header>
          <div className="selection-viewer-header">
            {/* Cancel button left */}
            {cancelButton?.position === "left" && (
              <button
                style={{ position: "absolute", left: "16px", top: "8px" , border: "none", backgroundColor: "transparent" }}
                onClick={cancelButton.onClick || onClose}
              >
                {cancelButton.view || cancelButton.text || "Cancel"}
              </button>
            )}

            {/* Drag handle */}
            <div
              className="selection-viewer-drag-handle"
              style={{
                background: layoutProp?.handleColor || "#ccc",
                width: layoutProp?.handleWidth || "40px",
                marginBottom: layoutProp?.gapBetweenHandleAndTitle || "12px",
              }}
            />

            {/* Cancel button right */}
            {cancelButton?.position === "right" && (
              <button
                style={{ position: "absolute", right: "16px", top: "8px", border: "none", backgroundColor: "transparent" }}
                onClick={cancelButton.onClick || onClose}
              >
                {cancelButton.view || cancelButton.text || "Cancel"}
              </button>
            )}

            {/* Title */}
            <h2
              id={`${id}-title`}
              className={titleProp.className || "selection-viewer-title"}
              style={{
                marginBottom: layoutProp?.gapBetweenTitleAndSearch || "8px",
              }}
            >
              {titleProp.text}
            </h2>
          </div>

          {/* Search */}
          {searchProp && (
            <div
              className="selection-viewer-search"
              style={{
                background: searchProp.background,
                padding: searchProp.padding
                  ? `${searchProp.padding.t} ${searchProp.padding.r} ${searchProp.padding.b} ${searchProp.padding.l}`
                  : "8px 16px",
                marginBottom: layoutProp?.gapBetweenSearchAndContent,
              }}
            >
              {searchProp.prefixIcon && (
                <span style={{ marginRight: searchProp.prefixGap || "8px" }}>
                  {searchProp.prefixIcon}
                </span>
              )}
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchProp.text}
                value={searchValue}
                onChange={handleSearchChange}
                className={
                  searchProp.className || "selection-viewer-search-input"
                }
                autoFocus={searchProp.autoFocus}
              />
              {searchProp.suffixIcon && (
                <span style={{ marginLeft: searchProp.suffixGap || "8px" }}>
                  {searchProp.suffixIcon}
                </span>
              )}
            </div>
          )}
        </Sheet.Header>

        <Sheet.Content>
          <div
            className={`selection-viewer-content ${childrenDirection}`}
            onScroll={onPaginate ? handleScroll : undefined}
          >
            {/* ✅ Show children first, then loading at bottom */}
            {React.Children.count(children) > 0 ? (
              <>
                {children}
                {showLoading && (
                  <div
                    className="selection-viewer-loading"
                    style={{
                      padding: loadingProp?.padding
                        ? `${loadingProp.padding.t} ${loadingProp.padding.r} ${loadingProp.padding.b} ${loadingProp.padding.l}`
                        : "16px",
                    }}
                  >
                    {loadingProp?.view}
                  </div>
                )}
              </>
            ) : showEmpty ? (
              <div
                className="selection-viewer-no-results"
                style={{
                  padding: noResultProp?.padding
                    ? `${noResultProp.padding.t} ${noResultProp.padding.r} ${noResultProp.padding.b} ${noResultProp.padding.l}`
                    : "16px",
                }}
              >
                {noResultProp?.view || (
                  <div className="selection-viewer-default-no-results">
                    {noResultProp?.text || "No results found"}
                  </div>
                )}
              </div>
            ) : null}
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
  setLoading: (val: boolean) => void;
  setEmpty: (val: boolean) => void;
};

const useSelectionController = (): [
  string,
  Operation,
  boolean,
  boolean,
  boolean
] => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const selectionId = `selection-${Math.random().toString(36).substr(2, 9)}`;

  const operations: Operation = {
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
    setLoading,
    setEmpty,
  };

  return [selectionId, operations, isOpen, loading, empty];
};

export { SelectionViewer, useSelectionController };
export default SelectionViewer;
