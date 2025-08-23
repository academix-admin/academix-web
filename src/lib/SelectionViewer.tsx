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

type SelectionState = "loading" | "empty" | "error" | "data" | "initial";


type TitleProps = {
  text: string;
  textColor: string;
  className?: string;
  containerClass?: string;
  style?: React.CSSProperties;
};

type SearchProps = {
  text: string;
  textColor: string;
  className?: string;
  background?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  clearIcon?: React.ReactNode;
  backIcon?: React.ReactNode;
  prefixGap?: string;
  suffixGap?: string;
  padding?: Padding;
  autoFocus?: boolean;
  inputStyle?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

type LoadingProps = {
  view: React.ReactNode;
  padding?: Padding;
  style?: React.CSSProperties;
};

type NoResultProps = {
  view: React.ReactNode;
  text?: string;
  padding?: Padding;
  style?: React.CSSProperties;
};

type ErrorProps = {
  view: React.ReactNode;
  text?: string;
  padding?: Padding;
  style?: React.CSSProperties;
};

type CancelButtonProps = {
  text?: string;
  view: React.ReactNode;
  position?: "left" | "right";
  style?: React.CSSProperties;
  onClick?: () => void;
};

type LayoutProps = {
  gapBetweenHandleAndTitle?: string;
  gapBetweenTitleAndSearch?: string;
  gapBetweenSearchAndContent?: string;
  backgroundColor?: string;
  handleColor?: string;
  handleWidth?: string;
  fullScreenSearchBackground?: string;
  fullScreenSearchHeaderStyle?: React.CSSProperties;
};

type SelectionViewerProps = {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  titleProp: TitleProps;
  searchProp?: SearchProps;
  loadingProp?: LoadingProps;
  noResultProp?: NoResultProps;
  errorProp?: ErrorProps;
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
  selectionState?: SelectionState;
  closeThreshold?: number;
};

// ==================== Styles ====================
const styles = `
.selection-viewer-header {
  padding: 0px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
}

.selection-viewer-drag-handle {
  height: 5px;
  border-radius: 3px;
  margin-top: 16px;
}

.selection-viewer-container {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

.selection-viewer-title {
  margin: 0px;
  font-size: 18px;
  font-weight: 600;
  padding: 0px 16px 0px 16px;
}

.selection-viewer-search {
  display: flex;
  align-items: center;
  margin: 0 16px 0px 16px;
  border-radius: 8px;
  box-sizing: border-box;
}

.selection-viewer-search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px;
  outline: none;
  font-size: 16px;
  width: 100%;
}

.selection-viewer-content {
  height: 100%;
  overflow-y: auto;
  padding: 0 0px 0px 0px;
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
.selection-viewer-error,
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

.selection-viewer-default-error {
  color: red;
  font-size: 14px;
}

/* Full screen search mode */
.selection-viewer-fullscreen-search {
//   position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
//   padding-top: env(safe-area-inset-top);
  width: 100%;
}

.selection-viewer-search-back-button {
  background: none;
  border: none;
  padding: 8px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selection-viewer-search-clear-button {
  background: none;
  border: none;
  padding: 8px;
  margin-left: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
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
  errorProp,
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
  selectionState = "initial",
  closeThreshold = 0.2,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [activeSnap, setActiveSnap] = useState(initialSnap);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const isPaginating = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<any>(null);

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

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    if (sheetRef.current) {
      sheetRef.current.snapTo(snapPoints.length - 1); // Snap to max height
    }
    searchProp?.onFocus?.();
  };

  const handleSearchBlur = () => {
    searchProp?.onBlur?.();
  };

  const handleBackFromSearch = () => {
    setIsSearchFocused(false);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
    if (sheetRef.current) {
      sheetRef.current.snapTo(initialSnap );
    }
  };

  const clearSearch = () => {
    setSearchValue("");
    searchProp?.onChange?.("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
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
      ref={sheetRef}
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={snapPoints}
      initialSnap={initialSnap}
      onSnap={setActiveSnap}
      modalEffectRootId="root"
      style={{ zIndex }}
    >
      <Sheet.Container
        style={{
          maxHeight,
          minHeight: isSearchFocused ? "100%" : minHeight,
          maxWidth: "500px",
          margin: "0 auto",
          width: "100%",
          left: 0,
          right: 0,
          paddingBottom: "calc(0px + env(safe-area-inset-bottom))",
          background: isSearchFocused
            ? layoutProp?.fullScreenSearchBackground || layoutProp?.backgroundColor
            : layoutProp?.backgroundColor,
        }}
      >
        {isSearchFocused ? (
          <Sheet.Header>
          <div
            className="selection-viewer-fullscreen-search"
            style={layoutProp?.fullScreenSearchHeaderStyle}
          >
            <div className="selection-viewer-search" style={{
              ...searchProp?.containerStyle,
              background: searchProp?.background,
              padding: searchProp?.padding
                ? `${searchProp.padding.t} ${searchProp.padding.r} ${searchProp.padding.b} ${searchProp.padding.l}`
                : "16px",
              margin: 0,
            }}>
              <button
                className="selection-viewer-search-back-button"
                onClick={handleBackFromSearch}
                aria-label="Exit search mode"
              >
                {searchProp?.backIcon || (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke= {searchProp?.textColor || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchProp?.text}
                value={searchValue}
                onChange={handleSearchChange}
                className={searchProp?.className || "selection-viewer-search-input"}
                style={{
                    color: searchProp?.textColor,
                    ...searchProp?.inputStyle}}
                autoFocus
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
              />

              {searchValue && (
                <button
                  className="selection-viewer-search-clear-button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                >
                  {searchProp?.clearIcon || (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6L18 18" stroke={searchProp?.textColor || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
          </Sheet.Header>
        ) : (
          <Sheet.Header>
            <div className="selection-viewer-header">
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
              {!isSearchFocused && (
                <div
                  className="selection-viewer-drag-handle"
                  style={{
                    background: layoutProp?.handleColor || "#ccc",
                    width: layoutProp?.handleWidth || "40px",
                    marginBottom: layoutProp?.gapBetweenHandleAndTitle || "12px",
                  }}
                />
              )}

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

              {/* Title */}
              <div className={titleProp.containerClass || "selection-viewer-container"}>
                <h2
                  id={`${id}-title`}
                  className={titleProp.className || "selection-viewer-title"}
                  style={{
                    marginBottom: layoutProp?.gapBetweenTitleAndSearch || "8px",
                    color: titleProp?.textColor || 'black',
                    ...titleProp.style
                  }}
                >
                  {titleProp.text}
                </h2>
              </div>
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
                  ...searchProp.containerStyle
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
                  className={searchProp.className || "selection-viewer-search-input"}
                  style={{
                      color: searchProp?.textColor,
                      ...searchProp.inputStyle}}
                  autoFocus={searchProp.autoFocus}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                />
                {searchValue && (
                  <button
                    className="selection-viewer-search-clear-button"
                    onClick={clearSearch}
                    aria-label="Clear search"
                    style={{ marginLeft: searchProp.suffixGap || "8px" }}
                  >
                    {searchProp.clearIcon || searchProp.suffixIcon || (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                )}
                {!searchValue && searchProp.suffixIcon && (
                  <span style={{ marginLeft: searchProp.suffixGap || "8px" }}>
                    {searchProp.suffixIcon}
                  </span>
                )}
              </div>
            )}
          </Sheet.Header>
        )}

        <Sheet.Content >
          <div
            className={`selection-viewer-content ${childrenDirection}`}
            onScroll={onPaginate ? handleScroll : undefined}
            style={{
                paddingTop: isSearchFocused ? layoutProp?.gapBetweenSearchAndContent : '0'}}
          >
            {/* Show children first, then loading at bottom */}
            {React.Children.count(children) > 0 ? (
              <>
                {children}
                {selectionState === "loading" && (
                  <div
                    className="selection-viewer-loading"
                    style={{
                      padding: loadingProp?.padding
                        ? `${loadingProp.padding.t} ${loadingProp.padding.r} ${loadingProp.padding.b} ${loadingProp.padding.l}`
                        : "16px",
                      ...loadingProp?.style
                    }}
                  >
                    {loadingProp?.view}
                  </div>
                )}
              </>
            ) : (selectionState === "empty" || (React.Children.count(children) <= 0 && (selectionState != "loading" && selectionState != "error"))) ? (
              <div
                className="selection-viewer-no-results"
                style={{
                  padding: noResultProp?.padding
                    ? `${noResultProp.padding.t} ${noResultProp.padding.r} ${noResultProp.padding.b} ${noResultProp.padding.l}`
                    : "16px",
                  ...noResultProp?.style
                }}
              >
                {noResultProp?.view || (
                  <div className="selection-viewer-default-no-results">
                    {noResultProp?.text || "No results found"}
                  </div>
                )}
              </div>
            ) : selectionState === "loading" ? (
                                  <div
                                    className="selection-viewer-loading"
                                    style={{
                                      padding: loadingProp?.padding
                                        ? `${loadingProp.padding.t} ${loadingProp.padding.r} ${loadingProp.padding.b} ${loadingProp.padding.l}`
                                        : "16px",
                                      ...loadingProp?.style
                                    }}
                                  >
                                    {loadingProp?.view}
                                  </div>
                                ) : (selectionState === "error") ? (
                                                  <div
                                                    className="selection-viewer-error"
                                                    style={{
                                                      padding: errorProp?.padding
                                                        ? `${errorProp.padding.t} ${errorProp.padding.r} ${errorProp.padding.b} ${errorProp.padding.l}`
                                                        : "16px",
                                                      ...errorProp?.style
                                                    }}
                                                  >
                                                    {errorProp?.view || (
                                                      <div className="selection-viewer-default-error">
                                                        {errorProp?.text || "No results found"}
                                                      </div>
                                                    )}
                                                  </div>
                                                ) :  null}
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
  setSelectionState: (val: SelectionState) => void;
};

const useSelectionController = (initialSelectionState?: SelectionState): [
  string,
  Operation,
  boolean,
  SelectionState
] => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectionState, setSelectionState] = useState(initialSelectionState || 'initial');
  const [empty, setEmpty] = useState(false);
  const selectionId = `selection-${Math.random().toString(36).substr(2, 9)}`;

  const operations: Operation = {
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
    setSelectionState
  };

  return [selectionId, operations, isOpen, selectionState];
};

export { SelectionViewer, useSelectionController };
export default SelectionViewer;