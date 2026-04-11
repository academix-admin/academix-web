import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Sheet } from "@/lib/ModalSheetView";

// ==================== Types ====================
type Padding = {
  l: string;
  r: string;
  t: string;
  b: string;
};

type SearchState = "loading" | "empty" | "error" | "data" | "initial";

type QueryResult<T, C> = {
  data: T[];
  cursor?: C;
};

type SearchResult<T> = {
  isOnline: boolean;
  data: T;
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

type LayoutProps = {
  gapBetweenHandleAndTitle?: string;
  gapBetweenTitleAndSearch?: string;
  gapBetweenSearchAndContent?: string;
  backgroundColor?: string;
  handleColor?: string;
  handleWidth?: string;
  searchBackground?: string;
  searchHeaderStyle?: React.CSSProperties;
  maxWidth?: string;
};

type SearchViewerProps<T = any, C = any> = {
  id?: string;
  isOpen: boolean;
  backDrop?: boolean;
  onClose: () => void;
  searchProp?: SearchProps;
  loadingProp?: LoadingProps;
  noResultProp?: NoResultProps;
  errorProp?: ErrorProps;
  layoutProp?: LayoutProps;
  childrenDirection?: "vertical" | "horizontal";
  children?: React.ReactNode;
  unmountOnClose?: boolean;
  zIndex?: number;
  maxHeight?: string;
  minHeight?: string;
  searchState?: SearchState;
  onInitialData?: (text: string) => T[];
  queryData?: (cursor: C | undefined, text: string, signal?: AbortSignal) => Promise<QueryResult<T, C>>;
  onResult?: (results: SearchResult<T>[]) => void;
  onRemoveDuplicateBy?: (item: T) => any;
  debounceMs?: number;
};

// ==================== Styles ====================
const getStyles = (id: string) => `
#${id} .search-viewer-header {
  padding: 0px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
}

#${id} .search-viewer-drag-handle {
  height: 5px;
  border-radius: 3px;
  margin-top: 16px;
}

#${id} .search-viewer-container {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

#${id} .search-viewer-title {
  margin: 0px;
  font-size: 18px;
  font-weight: 600;
  padding: 0px 16px 0px 16px;
    word-break: break-word;   /* break long words */
    white-space: normal;      /* allow wrapping */
}

#${id} .search-viewer-search {
  display: flex;
  align-items: center;
  margin: 16px 16px 4px 16px;
  border-radius: 12px;
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

#${id} .search-viewer-search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 8px;
  outline: none;
  font-size: 16px;
  width: 100%;
}

#${id} .search-viewer-content {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
  min-height: 0;
}

#${id} .search-viewer-content.vertical {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#${id} .search-viewer-content.horizontal {
  display: flex;
  flex-direction: row;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
}

#${id} .search-viewer-no-results,
#${id} .search-viewer-error,
#${id} .search-viewer-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
}

#${id} .search-viewer-default-no-results {
  color: #666;
  font-size: 14px;
}

#${id} .search-viewer-default-error {
  color: red;
  font-size: 14px;
}

/* Full screen search mode */
#${id} .search-viewer-fullscreen-search {
//   position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
//   padding-top: env(safe-area-inset-top);
  width: 100%;
}

#${id} .search-viewer-search-back-button {
  background: none;
  border: none;
  padding: 8px;
  margin-right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
}

#${id} .search-viewer-search-back-button:hover {
  opacity: 0.7;
}

#${id} .search-viewer-search-clear-button {
  background: none;
  border: none;
  padding: 8px;
  margin-left: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
}

#${id} .search-viewer-search-clear-button:hover {
  opacity: 0.7;
}

/* React Modal Sheet overrides */
#${id} .react-modal-sheet-container {
  max-width: 500px;
  margin: 0 auto;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
}

#${id} .react-modal-sheet-backdrop {
  background-color: rgba(0, 0, 0, 0.5) !important;
  pointer-events: auto !important;
}

#${id} .react-modal-sheet-content {
  padding: 0 0px 0px 0px;
  height: 100%;
}


/* Mobile full-width behavior */
@media (max-width: 500px) {
  #${id} .react-modal-sheet-container {
    max-width: 100%;
    border-radius: 0;
  }
}

/* Prevent iOS zooming */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  #${id} .search-viewer-search-input {
    font-size: 16px !important;
  }
}
`;

// ==================== Hook to inject CSS per instance ====================
const useInjectStyles = (id: string) => {
  useEffect(() => {
    const styleId = `search-viewer-styles-${id}`;
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      styleTag.innerHTML = getStyles(id);
      document.head.appendChild(styleTag);
    }

    // Cleanup on unmount
    return () => {
      if (styleTag && document.head.contains(styleTag)) {
        document.head.removeChild(styleTag);
      }
    };
  }, [id]);
};

const MAX_CACHE = 50;

// ==================== Component ====================
function SearchViewer<T = any, C = any>({
  id: providedId,
  isOpen,
  backDrop = true,
  onClose,
  searchProp,
  loadingProp,
  noResultProp,
  errorProp,
  layoutProp,
  childrenDirection = "vertical",
  children,
  unmountOnClose = true,
  zIndex = 1000,
  maxHeight = "90vh",
  minHeight = "65vh",
  searchState: externalSearchState = "initial",
  onInitialData,
  queryData,
  onResult,
  onRemoveDuplicateBy,
  debounceMs = 300,
}: SearchViewerProps<T, C>) {
  const [id] = useState(() => providedId || `search-${Math.random().toString(36).substring(2, 11)}`);
  const [searchValue, setSearchValue] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [results, setResults] = useState<SearchResult<T>[]>([]);
  const [cursor, setCursor] = useState<C | undefined>(undefined);
  const [internalSearchState, setInternalSearchState] = useState<SearchState>(externalSearchState);
  const [inputKey, setInputKey] = useState(0);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const isPaginating = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<any>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const searchAbortRef = useRef<AbortController | undefined>(undefined);
  const paginationAbortRef = useRef<AbortController | undefined>(undefined);
  const cacheRef = useRef<Map<string, QueryResult<T, C>>>(new Map());
  const onResultRef = useRef(onResult);
  const onInitialDataRef = useRef(onInitialData);
  const queryDataRef = useRef(queryData);
  const onRemoveDuplicateByRef = useRef(onRemoveDuplicateBy);

  // Keep refs up to date
  onResultRef.current = onResult;
  onInitialDataRef.current = onInitialData;
  queryDataRef.current = queryData;
  onRemoveDuplicateByRef.current = onRemoveDuplicateBy;

  useInjectStyles(id);

  const searchState = externalSearchState !== "initial" ? externalSearchState : internalSearchState;

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      setSearchValue("");
      setResults([]);
      setCursor(undefined);
      setInternalSearchState("initial");
      clearTimeout(debounceRef.current);
      if (searchAbortRef.current) {
        searchAbortRef.current.abort('Component closed');
      }
      if (paginationAbortRef.current) {
        paginationAbortRef.current.abort('Component closed');
      }
    }
  }, [isOpen]);

  // Notify parent of results (using ref to avoid infinite loops)
  useEffect(() => {
    onResultRef.current?.(results);
  }, [results]);

  // Track keyboard height
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      const vp = window.visualViewport!;
      const kbHeight = window.innerHeight - vp.height;
      setKeyboardHeight(kbHeight > 0 ? kbHeight : 0);
    };

    const viewport = window.visualViewport;
    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Auto-focus on search
  useEffect(() => {
    if (!isOpen) {
      searchInputRef.current?.blur();
      setSearchValue("");
      searchProp?.onChange?.("");
      setShouldAutoFocus(false);
      return;
    }
  }, [isOpen]);

  const handleOpenEnd = useCallback(() => {
    if (searchProp?.autoFocus && searchInputRef.current) {
      setInputKey(prev => prev + 1);
      setShouldAutoFocus(true);
      searchInputRef.current.focus();
      searchInputRef.current.click();
    }
  }, [searchProp?.autoFocus]);

  // Remove duplicates helper - prioritizes online results over local
  const removeDuplicates = useCallback((items: SearchResult<T>[]): SearchResult<T>[] => {
    if (!onRemoveDuplicateByRef.current) return items;
    
    const seen = new Map<any, SearchResult<T>>();
    
    items.forEach(item => {
      const key = onRemoveDuplicateByRef.current!(item.data);
      const existing = seen.get(key);
      
      // Keep online result over local, or first occurrence if same type
      if (!existing || (!existing.isOnline && item.isOnline)) {
        seen.set(key, item);
      }
    });
    
    return Array.from(seen.values());
  }, []);

  // Execute search with caching and cancellation
  const executeSearch = useCallback(async (value: string) => {
    let localResults: SearchResult<T>[] = [];
    let remoteResults: SearchResult<T>[] = [];

    // Filter initial data locally
    if (onInitialDataRef.current) {
      const filtered = onInitialDataRef.current(value);
      localResults = filtered.map(data => ({ isOnline: false, data }));
    }

    // Query remote data
    if (queryDataRef.current) {
      // Check cache first
      const cached = cacheRef.current.get(value);
      if (cached) {
        remoteResults = cached.data.map(data => ({ isOnline: true, data }));
        const deduplicated = removeDuplicates([...localResults, ...remoteResults]);
        setResults(deduplicated);
        setCursor(cached.cursor);
        setInternalSearchState(deduplicated.length > 0 ? "data" : "empty");
        return;
      }

      // Cancel previous request
      if (searchAbortRef.current) {
        searchAbortRef.current.abort('New search initiated');
      }
      searchAbortRef.current = new AbortController();

      setInternalSearchState("loading");
      setCursor(undefined);
      
      try {
        const result = await queryDataRef.current(undefined, value, searchAbortRef.current.signal);
        
        // Cache the result with LRU eviction
        cacheRef.current.set(value, result);
        if (cacheRef.current.size > MAX_CACHE) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey !== undefined) {
            cacheRef.current.delete(firstKey);
          }
        }
        
        remoteResults = result.data.map(data => ({ isOnline: true, data }));
        const deduplicated = removeDuplicates([...localResults, ...remoteResults]);
        setResults(deduplicated);
        setCursor(result.cursor);
        setInternalSearchState(deduplicated.length > 0 ? "data" : "empty");
      } catch (error: any) {
        if (error.name === 'AbortError') return; // Ignore cancelled requests
        setInternalSearchState("error");
      }
    } else {
      // Only local results
      const deduplicated = removeDuplicates(localResults);
      setResults(deduplicated);
      setInternalSearchState(deduplicated.length > 0 ? "data" : "empty");
    }
  }, [removeDuplicates]);

  // Execute initial search when opened
  useEffect(() => {
    if (isOpen && onInitialDataRef.current) {
      executeSearch('');
    }
  }, [isOpen, executeSearch]);

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    searchProp?.onChange?.(value);

    // Clear previous debounce
    clearTimeout(debounceRef.current);

    // Debounce the search execution
    debounceRef.current = setTimeout(() => {
      executeSearch(value);
    }, debounceMs);
  };

  const handleSearchFocus = () => {
    searchProp?.onFocus?.();
  };

  const handleSearchBlur = () => {
    searchProp?.onBlur?.();
  };

  const handleBackFromSearch = () => {
    onClose();
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const clearSearch = () => {
    setSearchValue("");
    searchProp?.onChange?.("");
    executeSearch('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleScroll = useCallback(
    async (e: React.UIEvent<HTMLDivElement>) => {
      if (isPaginating.current || !queryDataRef.current || !cursor) return;

      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const isNearBottom = scrollHeight - scrollTop <= clientHeight * 1.2;

      if (isNearBottom) {
        isPaginating.current = true;
        setInternalSearchState("loading");
        
        // Cancel previous pagination request
        if (paginationAbortRef.current) {
          paginationAbortRef.current.abort('New pagination request');
        }
        paginationAbortRef.current = new AbortController();
        
        try {
          const result = await queryDataRef.current(cursor, searchValue, paginationAbortRef.current.signal);
          const newResults = result.data.map(data => ({ isOnline: true, data }));
          const combined = [...results, ...newResults];
          const deduplicated = removeDuplicates(combined);
          setResults(deduplicated);
          setCursor(result.cursor);
          setInternalSearchState("data");
        } catch (error: any) {
          if (error.name === 'AbortError') return; // Ignore cancelled requests
          setInternalSearchState("error");
        } finally {
          setTimeout(() => {
            isPaginating.current = false;
          }, 500);
        }
      }
    },
    [cursor, searchValue, removeDuplicates, results]
  );

  if (!isOpen && unmountOnClose) return null;

  // Render content based on state
  const renderContent = () => {
    if (results.length > 0) {
      return (
        <>
          {children}
          {searchState === "loading" && (
            <div
              className="search-viewer-loading"
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
      );
    }

    switch (searchState) {
      case "initial":
        // Show children even with no results on initial state (before any search)
        return children;
      
      case "loading":
        return (
          <div
            className="search-viewer-loading"
            style={{
              padding: loadingProp?.padding
                ? `${loadingProp.padding.t} ${loadingProp.padding.r} ${loadingProp.padding.b} ${loadingProp.padding.l}`
                : "16px",
              ...loadingProp?.style
            }}
          >
            {loadingProp?.view}
          </div>
        );
      
      case "empty":
        return (
          <div
            className="search-viewer-no-results"
            style={{
              padding: noResultProp?.padding
                ? `${noResultProp.padding.t} ${noResultProp.padding.r} ${noResultProp.padding.b} ${noResultProp.padding.l}`
                : "16px",
              ...noResultProp?.style
            }}
          >
            {noResultProp?.view || (
              <div className="search-viewer-default-no-results">
                {noResultProp?.text || "No results found"}
              </div>
            )}
          </div>
        );
      
      case "error":
        return (
          <div
            className="search-viewer-error"
            style={{
              padding: errorProp?.padding
                ? `${errorProp.padding.t} ${errorProp.padding.r} ${errorProp.padding.b} ${errorProp.padding.l}`
                : "16px",
              ...errorProp?.style
            }}
          >
            {errorProp?.view || (
              <div className="search-viewer-default-error">
                {errorProp?.text || "No results found"}
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Sheet
      ref={sheetRef}
      isOpen={isOpen}
      onClose={onClose}
      detent="content"
      style={{ zIndex }}
      maxHeight={maxHeight}
      onOpenEnd={handleOpenEnd}
    >
      <Sheet.Container
        id={id}
        style={{
          maxHeight: "100dvh",
          minHeight: "100%",
          maxWidth: layoutProp?.maxWidth || "800px",
          margin: "0 auto",
          width: "100%",
          left: 0,
          right: 0,
          paddingBottom: "calc(0px + env(safe-area-inset-bottom))",
          background: layoutProp?.searchBackground || layoutProp?.backgroundColor,
          borderTopLeftRadius: "0px",
          borderTopRightRadius: "0px",
        }}
      >
      
          <Sheet.Header>
            <div
              className="search-viewer-fullscreen-search"
              style={layoutProp?.searchHeaderStyle}
            >
              <div className="search-viewer-search" style={{
                ...searchProp?.containerStyle,
                background: searchProp?.background,
                padding: searchProp?.padding
                  ? `${searchProp.padding.t} ${searchProp.padding.r} ${searchProp.padding.b} ${searchProp.padding.l}`
                  : "16px"
              }}>
                <button
                  className="search-viewer-search-back-button"
                  onClick={handleBackFromSearch}
                  aria-label="Exit search mode"
                >
                  {searchProp?.backIcon || (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 18L9 12L15 6" stroke={searchProp?.textColor || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                <input
                  key={inputKey}
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchProp?.text}
                  value={searchValue}
                  onChange={handleSearchChange}
                  className={searchProp?.className || "search-viewer-search-input"}
                  style={{
                    color: searchProp?.textColor,
                    ...searchProp?.inputStyle
                  }}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  autoFocus={shouldAutoFocus}
                />

                {searchValue && (
                  <button
                    className="search-viewer-search-clear-button"
                    onClick={clearSearch}
                    aria-label="Clear search"
                  >
                    {searchProp?.clearIcon || (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke={searchProp?.textColor || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </Sheet.Header>

        <Sheet.Content>
          <div
            className={`search-viewer-content ${childrenDirection}`}
            onScroll={queryDataRef.current ? handleScroll : undefined}
            style={{
              paddingTop: layoutProp?.gapBetweenSearchAndContent,
              paddingBottom: keyboardHeight > 0
                ? `${keyboardHeight + 16}px`
                : '16px',
            }}
          >
            {renderContent()}
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={backDrop ? onClose : undefined} />
    </Sheet>
  );
}

// ==================== Controller Hook ====================
type Operation = {
  open: () => void;
  close: () => void;
  toggle: () => void;
  setSearchState: (val: SearchState) => void;
};

const useSearchController = (initialSearchState?: SearchState): [
  string,
  Operation,
  boolean,
  SearchState
] => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchState, setSearchState] = useState(initialSearchState || 'initial');
  const [searchId] = useState(() => `search-${Math.random().toString(36).substring(2, 11)}`);

  const operations = useMemo<Operation>(() => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
    setSearchState,
  }), [setSearchState]);

  return [searchId, operations, isOpen, searchState];
};

export { SearchViewer, useSearchController, type SearchResult };
export default SearchViewer;