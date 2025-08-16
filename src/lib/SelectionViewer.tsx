import React, { useState, useEffect, useRef, useCallback } from "react";

// Types
type Padding = {
  l: string;
  r: string;
  t: string;
  b: string;
};

type SnapPoint = number; // 0-1 representing percentage of screen height

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

type SelectionViewerProps = {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  titleProp: TitleProps;
  searchProp?: SearchProps;
  loadingProp?: LoadingProps;
  noResultProp?: NoResultProps;
  childrenDirection?: "vertical" | "horizontal";
  children?: React.ReactNode;
  onPaginate?: () => boolean;
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

// Styles
const styles = `
.selection-viewer-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  justify-content: center;
  touch-action: none;
}

.selection-viewer-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.selection-viewer-container {
  position: absolute;
  bottom: 0;
  width: 100%;
  max-width: 500px;
  background: white;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  will-change: transform;
  touch-action: pan-y;
}

.selection-viewer-header {
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  touch-action: none;
}

.selection-viewer-drag-handle {
  width: 40px;
  height: 5px;
  background: #ccc;
  border-radius: 3px;
  margin-bottom: 12px;
  cursor: grab;
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
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
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

/* Prevent iOS zooming */
@media screen and (-webkit-min-device-pixel-ratio:0) {
  .selection-viewer-search-input {
    font-size: 16px !important;
  }
}
`;

// Inject styles only once
const useInjectStyles = () => {
  useEffect(() => {
    if (!document.getElementById('selection-viewer-styles')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'selection-viewer-styles';
      styleTag.innerHTML = styles;
      document.head.appendChild(styleTag);
    }
  }, []);
};

const SelectionViewer: React.FC<SelectionViewerProps> = ({
  id,
  isOpen,
  onClose,
  titleProp,
  searchProp,
  loadingProp,
  noResultProp,
  childrenDirection = "vertical",
  children,
  onPaginate,
  snapPoints = [0.5, 0.8],
  initialSnap = 0.5,
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
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const isPaginating = useRef(false);
  const focusTrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useInjectStyles();

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (searchProp?.autoFocus && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, searchProp?.autoFocus]);

  // Enhanced mobile drag handlers
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY.current === null) return;
    e.preventDefault();

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;
    const newRatio = Math.min(1, Math.max(0, activeSnap - deltaY / window.innerHeight));

    if (newRatio < closeThreshold) {
      onClose();
      return;
    }

    setActiveSnap(newRatio);
  }, [activeSnap, closeThreshold, onClose]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (startY.current === null) return;

    const deltaY = e.clientY - startY.current;
    const newRatio = Math.min(1, Math.max(0, activeSnap - deltaY / window.innerHeight));

    if (newRatio < closeThreshold) {
      onClose();
      return;
    }

    setActiveSnap(newRatio);
  }, [activeSnap, closeThreshold, onClose]);

  const handleDragEnd = useCallback(() => {
    if (startY.current === null) return;

    const closest = snapPoints.reduce((prev, curr) =>
      Math.abs(curr - activeSnap) < Math.abs(prev - activeSnap) ? curr : prev
    );
    setActiveSnap(closest);
    startY.current = null;

    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleDragEnd);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleDragEnd);
  }, [activeSnap, snapPoints, handleMouseMove, handleTouchMove]);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) {
      startY.current = e.touches[0].clientY;
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);
    } else {
      startY.current = e.clientY;
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleDragEnd);
    }
  };

  // Keyboard handling
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    searchProp?.onChange?.(value);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isPaginating.current || !onPaginate) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop <= clientHeight * 1.2;
    if (isNearBottom) {
      isPaginating.current = true;
      const hasMore = onPaginate();
      if (hasMore === false) {
        isPaginating.current = false;
      } else {
        setTimeout(() => {
          isPaginating.current = false;
        }, 500);
      }
    }
  };

  if (!isOpen && unmountOnClose) return null;

  return (
    <div
      className="selection-viewer-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      style={{ display: isOpen ? "flex" : "none", zIndex }}
    >
      <div className="selection-viewer-backdrop" onClick={onClose} />

      <div
        ref={sheetRef}
        className={`selection-viewer-container ${childrenDirection}`}
        style={{
          transform: `translateY(${(1 - activeSnap) * 100}%)`,
          maxHeight,
          minHeight,
        }}
        ref={focusTrapRef}
      >
        <div
          className="selection-viewer-header"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="selection-viewer-drag-handle" />
          <h2 id={`${id}-title`} className={titleProp.className || "selection-viewer-title"}>
            {titleProp.text}
          </h2>
        </div>

        {searchProp && (
          <div
            className="selection-viewer-search"
            style={{
              background: searchProp.background,
              padding: searchProp.padding
                ? `${searchProp.padding.t} ${searchProp.padding.r} ${searchProp.padding.b} ${searchProp.padding.l}`
                : "8px 16px",
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
            />
            {searchProp.suffixIcon && (
              <span style={{ marginLeft: searchProp.suffixGap || "8px" }}>
                {searchProp.suffixIcon}
              </span>
            )}
          </div>
        )}

        <div className={`selection-viewer-content ${childrenDirection}`} onScroll={handleScroll}>
          {showLoading ? (
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
          ) : showEmpty || React.Children.count(children) === 0 ? (
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
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
};

// Controller Hook
type Operation = {
  open: () => void;
  close: () => void;
  toggle: () => void;
  setLoading: (val: boolean) => void;
  setEmpty: (val: boolean) => void;
};

const useSelectionController = (): [string, Operation, boolean, boolean, boolean] => {
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