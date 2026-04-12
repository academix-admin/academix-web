// import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
// import { Sheet } from "@/lib/ModalSheetView";

// // ==================== Types ====================
// type Padding = {
//   l: string;
//   r: string;
//   t: string;
//   b: string;
// };

// type SearchState = "loading" | "empty" | "error" | "data" | "initial";

// type QueryResult<T, C> = {
//   data: T[];
//   cursor?: C;
// };

// type SearchResult<T> = {
//   isOnline: boolean;
//   data: T;
// };

// type SearchProps = {
//   text: string;
//   textColor: string;
//   className?: string;
//   background?: string;
//   prefixIcon?: React.ReactNode;
//   suffixIcon?: React.ReactNode;
//   clearIcon?: React.ReactNode;
//   backIcon?: React.ReactNode;
//   prefixGap?: string;
//   suffixGap?: string;
//   padding?: Padding;
//   autoFocus?: boolean;
//   inputStyle?: React.CSSProperties;
//   containerStyle?: React.CSSProperties;
//   onChange?: (value: string) => void;
//   onFocus?: () => void;
//   onBlur?: () => void;
// };

// type LoadingProps = {
//   view: React.ReactNode;
//   padding?: Padding;
//   style?: React.CSSProperties;
// };

// type NoResultProps = {
//   view: React.ReactNode;
//   text?: string;
//   padding?: Padding;
//   style?: React.CSSProperties;
// };

// type ErrorProps = {
//   view: React.ReactNode;
//   text?: string;
//   padding?: Padding;
//   style?: React.CSSProperties;
// };

// type LayoutProps = {
//   gapBetweenHandleAndTitle?: string;
//   gapBetweenTitleAndSearch?: string;
//   gapBetweenSearchAndContent?: string;
//   backgroundColor?: string;
//   handleColor?: string;
//   handleWidth?: string;
//   searchBackground?: string;
//   searchHeaderStyle?: React.CSSProperties;
//   maxWidth?: string;
// };

// type SearchViewerProps<T = any, C = any> = {
//   id?: string;
//   isOpen: boolean;
//   backDrop?: boolean;
//   onClose: () => void;
//   searchProp?: SearchProps;
//   loadingProp?: LoadingProps;
//   noResultProp?: NoResultProps;
//   errorProp?: ErrorProps;
//   layoutProp?: LayoutProps;
//   childrenDirection?: "vertical" | "horizontal";
//   children?: React.ReactNode;
//   unmountOnClose?: boolean;
//   zIndex?: number;
//   maxHeight?: string;
//   minHeight?: string;
//   searchState?: SearchState;
//   /**
//    * Called to filter local/cached data on each search query.
//    * Pass `localDataDeps` with the variables this function closes over
//    * instead of wrapping in `useCallback` — the lib handles stabilization internally.
//    *
//    * @example
//    * onInitialData={(text) => quizzes.filter(q => q.title.includes(text))}
//    * localDataDeps={[quizzes, activeCategory]}
//    */
//   onInitialData?: (text: string) => T[];
//   /**
//    * Dependencies that, when changed, signal `onInitialData` would return
//    * different results. Works like `useEffect` deps — pass the variables
//    * your `onInitialData` closes over.
//    *
//    * If omitted, the effect only re-runs when the search text changes or
//    * the sheet opens/closes (safe default for stable data sources).
//    *
//    * @example localDataDeps={[quizzes, activeCategory]}
//    */
//   localDataDeps?: React.DependencyList;
//   queryData?: (cursor: C | undefined, text: string, signal?: AbortSignal) => Promise<QueryResult<T, C>>;
//   onResult?: (results: SearchResult<T>[]) => void;
//   onRemoveDuplicateBy?: (item: T) => any;
//   debounceMs?: number;
// };

// // ==================== Styles ====================
// const getStyles = (id: string) => `
// #${id} .search-viewer-header {
//   padding: 0px;
//   display: flex;
//   flex-direction: column;
//   align-items: center;
//   position: relative;
//   width: 100%;
// }

// #${id} .search-viewer-drag-handle {
//   height: 5px;
//   border-radius: 3px;
//   margin-top: 16px;
// }

// #${id} .search-viewer-container {
//   display: flex;
//   align-items: flex-start;
//   width: 100%;
// }

// #${id} .search-viewer-title {
//   margin: 0px;
//   font-size: 18px;
//   font-weight: 600;
//   padding: 0px 16px 0px 16px;
//   word-break: break-word;
//   white-space: normal;
// }

// #${id} .search-viewer-search {
//   display: flex;
//   align-items: center;
//   margin: 16px 16px 4px 16px;
//   border-radius: 12px;
//   box-sizing: border-box;
//   border: 1px solid rgba(0, 0, 0, 0.1);
// }

// #${id} .search-viewer-search-input {
//   flex: 1;
//   border: none;
//   background: transparent;
//   padding: 12px 8px;
//   outline: none;
//   font-size: 16px !important;
//   width: 100%;
// }

// #${id} .search-viewer-content {
//   overflow-y: auto;
//   -webkit-overflow-scrolling: touch;
//   flex: 1;
//   min-height: 0;
// }

// #${id} .search-viewer-content.vertical {
//   display: flex;
//   flex-direction: column;
//   gap: 8px;
// }

// #${id} .search-viewer-content.horizontal {
//   display: flex;
//   flex-direction: row;
//   gap: 8px;
//   overflow-x: auto;
//   overflow-y: hidden;
// }

// #${id} .search-viewer-no-results,
// #${id} .search-viewer-error,
// #${id} .search-viewer-loading {
//   display: flex;
//   justify-content: center;
//   align-items: center;
//   min-height: 120px;
// }

// #${id} .search-viewer-default-no-results {
//   color: #666;
//   font-size: 14px;
// }

// #${id} .search-viewer-default-error {
//   color: red;
//   font-size: 14px;
// }

// #${id} .search-viewer-fullscreen-search {
//   top: 0;
//   left: 0;
//   right: 0;
//   z-index: 10;
//   width: 100%;
// }

// #${id} .search-viewer-search-back-button {
//   background: none;
//   border: none;
//   padding: 8px;
//   margin-right: 4px;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   cursor: pointer;
//   transition: opacity 0.2s;
// }

// #${id} .search-viewer-search-back-button:hover {
//   opacity: 0.7;
// }

// #${id} .search-viewer-search-clear-button {
//   background: none;
//   border: none;
//   padding: 8px;
//   margin-left: 4px;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   cursor: pointer;
//   transition: opacity 0.2s;
// }

// #${id} .search-viewer-search-clear-button:hover {
//   opacity: 0.7;
// }

// #${id} .react-modal-sheet-container {
//   max-width: 500px;
//   margin: 0 auto;
//   border-top-left-radius: 16px;
//   border-top-right-radius: 16px;
// }

// #${id} .react-modal-sheet-backdrop {
//   background-color: rgba(0, 0, 0, 0.5) !important;
//   pointer-events: auto !important;
// }

// #${id} .react-modal-sheet-content {
//   padding: 0 0px 0px 0px;
//   height: 100%;
// }

// @media (max-width: 500px) {
//   #${id} .react-modal-sheet-container {
//     max-width: 100%;
//     border-radius: 0;
//   }
// }

// @media screen and (-webkit-min-device-pixel-ratio: 0) {
//   #${id} .search-viewer-search-input {
//     font-size: 16px !important;
//   }
// }
// `;

// // ==================== Hook to inject CSS per instance ====================
// const useInjectStyles = (id: string) => {
//   useEffect(() => {
//     const styleId = `search-viewer-styles-${id}`;
//     let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;

//     if (!styleTag) {
//       styleTag = document.createElement("style");
//       styleTag.id = styleId;
//       styleTag.innerHTML = getStyles(id);
//       document.head.appendChild(styleTag);
//     }

//     return () => {
//       if (styleTag && document.head.contains(styleTag)) {
//         document.head.removeChild(styleTag);
//       }
//     };
//   }, [id]);
// };

// const MAX_CACHE = 50;

// // ==================== SearchViewer Component ====================
// function SearchViewer<T = any, C = any>({
//   id: providedId,
//   isOpen,
//   backDrop = true,
//   onClose,
//   searchProp,
//   loadingProp,
//   noResultProp,
//   errorProp,
//   layoutProp,
//   childrenDirection = "vertical",
//   children,
//   unmountOnClose = true,
//   zIndex = 1000,
//   maxHeight = "90dvh",
//   minHeight = "65dvh",
//   searchState: externalSearchState = "initial",
//   onInitialData,
//   localDataDeps,
//   queryData,
//   onResult,
//   onRemoveDuplicateBy,
//   debounceMs = 300,
// }: SearchViewerProps<T, C>) {
//   const [id] = useState(() => providedId || `search-${Math.random().toString(36).substring(2, 11)}`);
//   const [searchValue, setSearchValue] = useState("");
//   const [keyboardHeight, setKeyboardHeight] = useState(0);
//   const [results, setResults] = useState<SearchResult<T>[]>([]);
//   const [cursor, setCursor] = useState<C | undefined>(undefined);
//   const [internalSearchState, setInternalSearchState] = useState<SearchState>(externalSearchState);
//   const [inputKey, setInputKey] = useState(0);
//   const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
//   const isPaginating = useRef(false);
//   const searchInputRef = useRef<HTMLInputElement>(null);
//   const sheetRef = useRef<any>(null);
//   const headerRef = useRef<HTMLDivElement>(null);
//   const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
//   const searchAbortRef = useRef<AbortController | undefined>(undefined);
//   const paginationAbortRef = useRef<AbortController | undefined>(undefined);
//   const cacheRef = useRef<Map<string, QueryResult<T, C>>>(new Map());
//   const onResultRef = useRef(onResult);
//   const onInitialDataRef = useRef(onInitialData);
//   const queryDataRef = useRef(queryData);
//   const onRemoveDuplicateByRef = useRef(onRemoveDuplicateBy);

//   // Always keep refs current — identity changes on these never trigger effects
//   onResultRef.current = onResult;
//   onInitialDataRef.current = onInitialData;
//   queryDataRef.current = queryData;
//   onRemoveDuplicateByRef.current = onRemoveDuplicateBy;

//   useInjectStyles(id);

//   const searchState = externalSearchState !== "initial" ? externalSearchState : internalSearchState;

//   // Cleanup on close
//   useEffect(() => {
//     if (!isOpen) {
//       setSearchValue("");
//       setResults([]);
//       setCursor(undefined);
//       setInternalSearchState("initial");
//       clearTimeout(debounceRef.current);
//       if (searchAbortRef.current) {
//         searchAbortRef.current.abort("Component closed");
//       }
//       if (paginationAbortRef.current) {
//         paginationAbortRef.current.abort("Component closed");
//       }
//     }
//   }, [isOpen]);

//   // Notify parent of results
//   useEffect(() => {
//     onResultRef.current?.(results);
//   }, [results]);

//   // Track keyboard height
//   useEffect(() => {
//     if (typeof window === "undefined" || !window.visualViewport) return;

//     const handleResize = () => {
//       const vp = window.visualViewport!;
//       const kbHeight = window.innerHeight - vp.height;
//       setKeyboardHeight(kbHeight > 0 ? kbHeight : 0);
//     };

//     const viewport = window.visualViewport;
//     viewport.addEventListener("resize", handleResize);
//     viewport.addEventListener("scroll", handleResize);

//     return () => {
//       viewport.removeEventListener("resize", handleResize);
//       viewport.removeEventListener("scroll", handleResize);
//     };
//   }, []);

//   // Blur + reset on close
//   useEffect(() => {
//     if (!isOpen) {
//       searchInputRef.current?.blur();
//       setSearchValue("");
//       searchProp?.onChange?.("");
//       setShouldAutoFocus(false);
//     }
//   }, [isOpen]);

//   const autoFocus = searchProp?.autoFocus;
//   const handleOpenEnd = useCallback(() => {
//     if (autoFocus && searchInputRef.current) {
//       setInputKey((prev) => prev + 1);
//       setShouldAutoFocus(true);
//       searchInputRef.current.focus();
//       searchInputRef.current.click();
//     }
//   }, [autoFocus]);

//   // Remove duplicates — prioritizes online over local
//   const removeDuplicates = useCallback((items: SearchResult<T>[]): SearchResult<T>[] => {
//     if (!onRemoveDuplicateByRef.current) return items;
//     const seen = new Map<any, SearchResult<T>>();
//     items.forEach((item) => {
//       const key = onRemoveDuplicateByRef.current!(item.data);
//       const existing = seen.get(key);
//       if (!existing || (!existing.isOnline && item.isOnline)) {
//         seen.set(key, item);
//       }
//     });
//     return Array.from(seen.values());
//   }, []);

//   // Core search executor — reads from refs so it never goes stale
//   const executeSearch = useCallback(
//     async (value: string) => {
//       let localResults: SearchResult<T>[] = [];
//       let remoteResults: SearchResult<T>[] = [];

//       if (onInitialDataRef.current) {
//         const filtered = onInitialDataRef.current(value);
//         localResults = filtered.map((data) => ({ isOnline: false, data }));
//       }

//       if (queryDataRef.current) {
//         const cached = cacheRef.current.get(value);
//         if (cached) {
//           remoteResults = cached.data.map((data) => ({ isOnline: true, data }));
//           const deduplicated = removeDuplicates([...localResults, ...remoteResults]);
//           setResults(deduplicated);
//           setCursor(cached.cursor);
//           setInternalSearchState(deduplicated.length > 0 ? "data" : "empty");
//           return;
//         }

//         if (searchAbortRef.current) {
//           searchAbortRef.current.abort("New search initiated");
//         }
//         searchAbortRef.current = new AbortController();

//         setInternalSearchState("loading");
//         setCursor(undefined);

//         try {
//           const signal = searchAbortRef.current.signal;
//           const result = await queryDataRef.current(undefined, value, signal);
//           if (signal.aborted) return;

//           cacheRef.current.set(value, result);
//           if (cacheRef.current.size > MAX_CACHE) {
//             const firstKey = cacheRef.current.keys().next().value;
//             if (firstKey !== undefined) {
//               cacheRef.current.delete(firstKey);
//             }
//           }

//           remoteResults = result.data.map((data) => ({ isOnline: true, data }));
//           const deduplicated = removeDuplicates([...localResults, ...remoteResults]);
//           setResults(deduplicated);
//           setCursor(result.cursor);
//           setInternalSearchState(deduplicated.length > 0 ? "data" : "empty");
//         } catch (error: any) {
//           if (error.name === "AbortError") return;
//           setInternalSearchState("error");
//         }
//       } else {
//         const deduplicated = removeDuplicates(localResults);
//         setResults(deduplicated);
//         setInternalSearchState(deduplicated.length > 0 ? "data" : "empty");
//       }
//     },
//     [removeDuplicates]
//   );

//   // Re-run search when:
//   // - sheet opens/closes
//   // - search text changes
//   // - caller signals their local data changed via localDataDeps
//   //
//   // onInitialData is intentionally NOT in deps — it lives in a ref.
//   // Pass localDataDeps={[yourData, yourFilter]} to react to data changes
//   // without needing useCallback at the call site.
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   useEffect(() => {
//     if (isOpen && onInitialDataRef.current) {
//       executeSearch(searchValue);
//     }
//   }, [isOpen, searchValue, executeSearch, ...(localDataDeps ?? [])]);

//   const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setSearchValue(value);
//     searchProp?.onChange?.(value);
//     clearTimeout(debounceRef.current);
//     debounceRef.current = setTimeout(() => {
//       executeSearch(value);
//     }, debounceMs);
//   };

//   const handleSearchFocus = () => {
//     searchProp?.onFocus?.();
//   };

//   const handleSearchBlur = () => {
//     searchProp?.onBlur?.();
//   };

//   const handleBackFromSearch = () => {
//     onClose();
//     if (searchInputRef.current) {
//       searchInputRef.current.blur();
//     }
//   };

//   const clearSearch = () => {
//     setSearchValue("");
//     searchProp?.onChange?.("");
//     executeSearch("");
//     if (searchInputRef.current) {
//       searchInputRef.current.focus();
//     }
//   };

//   const handleScroll = useCallback(
//     async (e: React.UIEvent<HTMLDivElement>) => {
//       if (isPaginating.current || !queryDataRef.current || !cursor) return;

//       const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
//       const isNearBottom = scrollHeight - scrollTop <= clientHeight * 1.2;

//       if (isNearBottom) {
//         isPaginating.current = true;
//         setInternalSearchState("loading");

//         if (paginationAbortRef.current) {
//           paginationAbortRef.current.abort("New pagination request");
//         }
//         paginationAbortRef.current = new AbortController();

//         try {
//           const signal = paginationAbortRef.current.signal;
//           const result = await queryDataRef.current(cursor, searchValue, signal);
//           if (signal.aborted) return;
//           const newResults = result.data.map((data) => ({ isOnline: true, data }));
//           // Functional updater avoids stale closure on results
//           setResults((prev) => removeDuplicates([...prev, ...newResults]));
//           setCursor(result.cursor);
//           setInternalSearchState("data");
//         } catch (error: any) {
//           if (error.name === "AbortError") return;
//           setInternalSearchState("error");
//         } finally {
//           setTimeout(() => {
//             isPaginating.current = false;
//           }, 500);
//         }
//       }
//     },
//     [cursor, searchValue, removeDuplicates]
//   );

//   if (!isOpen && unmountOnClose) return null;

//   const renderContent = () => {
//     if (results.length > 0) {
//       return (
//         <>
//           {children}
//           {searchState === "loading" && (
//             <div
//               className="search-viewer-loading"
//               style={{
//                 padding: loadingProp?.padding
//                   ? `${loadingProp.padding.t} ${loadingProp.padding.r} ${loadingProp.padding.b} ${loadingProp.padding.l}`
//                   : "16px",
//                 ...loadingProp?.style,
//               }}
//             >
//               {loadingProp?.view}
//             </div>
//           )}
//         </>
//       );
//     }

//     switch (searchState) {
//       case "initial":
//         return children;

//       case "loading":
//         return (
//           <div
//             className="search-viewer-loading"
//             style={{
//               padding: loadingProp?.padding
//                 ? `${loadingProp.padding.t} ${loadingProp.padding.r} ${loadingProp.padding.b} ${loadingProp.padding.l}`
//                 : "16px",
//               ...loadingProp?.style,
//             }}
//           >
//             {loadingProp?.view}
//           </div>
//         );

//       case "empty":
//         return (
//           <div
//             className="search-viewer-no-results"
//             style={{
//               padding: noResultProp?.padding
//                 ? `${noResultProp.padding.t} ${noResultProp.padding.r} ${noResultProp.padding.b} ${noResultProp.padding.l}`
//                 : "16px",
//               ...noResultProp?.style,
//             }}
//           >
//             {noResultProp?.view || (
//               <div className="search-viewer-default-no-results">
//                 {noResultProp?.text || "No results found"}
//               </div>
//             )}
//           </div>
//         );

//       case "error":
//         return (
//           <div
//             className="search-viewer-error"
//             style={{
//               padding: errorProp?.padding
//                 ? `${errorProp.padding.t} ${errorProp.padding.r} ${errorProp.padding.b} ${errorProp.padding.l}`
//                 : "16px",
//               ...errorProp?.style,
//             }}
//           >
//             {errorProp?.view || (
//               <div className="search-viewer-default-error">
//                 {errorProp?.text || "Something went wrong"}
//               </div>
//             )}
//           </div>
//         );

//       default:
//         return null;
//     }
//   };

//   return (
//     <Sheet
//       ref={sheetRef}
//       isOpen={isOpen}
//       onClose={onClose}
//       detent="content"
//       style={{ zIndex }}
//       maxHeight={maxHeight}
//       onOpenEnd={handleOpenEnd}
//     >
//       <Sheet.Container
//         id={id}
//         style={{
//           maxHeight: "100dvh",
//           minHeight: "100%",
//           maxWidth: layoutProp?.maxWidth || "800px",
//           margin: "0 auto",
//           width: "100%",
//           left: 0,
//           right: 0,
//           paddingBottom: "calc(0px + env(safe-area-inset-bottom))",
//           background: layoutProp?.searchBackground || layoutProp?.backgroundColor,
//           borderTopLeftRadius: "0px",
//           borderTopRightRadius: "0px",
//         }}
//       >
//         <Sheet.Header>
//           <div
//             className="search-viewer-fullscreen-search"
//             style={layoutProp?.searchHeaderStyle}
//           >
//             <div
//               className="search-viewer-search"
//               style={{
//                 ...searchProp?.containerStyle,
//                 background: searchProp?.background,
//                 padding: searchProp?.padding
//                   ? `${searchProp.padding.t} ${searchProp.padding.r} ${searchProp.padding.b} ${searchProp.padding.l}`
//                   : "16px",
//               }}
//             >
//               <button
//                 className="search-viewer-search-back-button"
//                 onClick={handleBackFromSearch}
//                 aria-label="Exit search mode"
//               >
//                 {searchProp?.backIcon || (
//                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
//                     <path
//                       d="M15 18L9 12L15 6"
//                       stroke={searchProp?.textColor || "currentColor"}
//                       strokeWidth="2"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                     />
//                   </svg>
//                 )}
//               </button>

//               <input
//                 key={inputKey}
//                 ref={searchInputRef}
//                 type="text"
//                 placeholder={searchProp?.text}
//                 value={searchValue}
//                 onChange={handleSearchChange}
//                 className={searchProp?.className || "search-viewer-search-input"}
//                 style={{
//                   color: searchProp?.textColor,
//                   ...searchProp?.inputStyle,
//                 }}
//                 onFocus={handleSearchFocus}
//                 onBlur={handleSearchBlur}
//                 autoFocus={shouldAutoFocus}
//               />

//               {searchValue && (
//                 <button
//                   className="search-viewer-search-clear-button"
//                   onClick={clearSearch}
//                   aria-label="Clear search"
//                 >
//                   {searchProp?.clearIcon || (
//                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
//                       <path
//                         d="M18 6L6 18M6 6L18 18"
//                         stroke={searchProp?.textColor || "currentColor"}
//                         strokeWidth="2"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                       />
//                     </svg>
//                   )}
//                 </button>
//               )}
//             </div>
//           </div>
//         </Sheet.Header>

//         <Sheet.Content>
//           <div
//             className={`search-viewer-content ${childrenDirection}`}
//             onScroll={queryDataRef.current ? handleScroll : undefined}
//             style={{
//               paddingTop: layoutProp?.gapBetweenSearchAndContent,
//               paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : "16px",
//             }}
//           >
//             {renderContent()}
//           </div>
//         </Sheet.Content>
//       </Sheet.Container>
//       <Sheet.Backdrop onTap={backDrop ? onClose : undefined} />
//     </Sheet>
//   );
// }

// // ==================== Controller Hook ====================
// type Operation = {
//   open: () => void;
//   close: () => void;
//   toggle: () => void;
//   setSearchState: (val: SearchState) => void;
// };

// const useSearchController = (
//   initialSearchState?: SearchState
// ): [string, Operation, boolean, SearchState] => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [searchState, setSearchState] = useState<SearchState>(
//     initialSearchState ?? "initial"
//   );
//   const [searchId] = useState(
//     () => `search-${Math.random().toString(36).substring(2, 11)}`
//   );

//   const operations = useMemo<Operation>(
//     () => ({
//       open: () => setIsOpen(true),
//       close: () => setIsOpen(false),
//       toggle: () => setIsOpen((prev) => !prev),
//       setSearchState,
//     }),
//     [setSearchState]
//   );

//   return [searchId, operations, isOpen, searchState];
// };

// export { SearchViewer, useSearchController, type SearchResult };
// export default SearchViewer;

// // ==================== MultipleSearchViewer Types ====================
// type EachViewerProps<T = any, C = any> = {
//   /**
//    * Called to filter local/cached data on each search query.
//    * Pass `localDataDeps` with the variables this function closes over
//    * instead of wrapping in `useCallback` — the lib handles stabilization internally.
//    *
//    * @example
//    * onInitialData={(text) => topics.filter(t => t.name.includes(text))}
//    * localDataDeps={[topics, activeFilter]}
//    */
//   onInitialData?: (text: string) => T[];
//   /**
//    * Dependencies that, when changed, signal `onInitialData` would return
//    * different results. Works like `useEffect` deps — pass the variables
//    * your `onInitialData` closes over.
//    *
//    * If omitted, the effect only re-runs when the search text changes.
//    *
//    * @example localDataDeps={[topics, activeFilter]}
//    */
//   localDataDeps?: React.DependencyList;
//   queryData?: (
//     cursor: C | undefined,
//     text: string,
//     signal?: AbortSignal
//   ) => Promise<QueryResult<T, C>>;
//   onResult?: (results: SearchResult<T>[]) => void;
//   onRemoveDuplicateBy?: (item: T) => any;
//   childrenDirection?: "vertical" | "horizontal";
//   children?: React.ReactNode;
// };

// type MultipleSearchViewerProps = Omit<
//   SearchViewerProps,
//   | "children"
//   | "onInitialData"
//   | "localDataDeps"
//   | "queryData"
//   | "onResult"
//   | "onRemoveDuplicateBy"
//   | "childrenDirection"
// > & {
//   children:
//     | React.ReactElement<EachViewerProps>
//     | React.ReactElement<EachViewerProps>[];
// };

// // ==================== SearchTextContext ====================
// const SearchTextContext = React.createContext<string>("");

// // ==================== EachViewer Component ====================
// function EachViewer<T = any, C = any>({
//   onInitialData,
//   localDataDeps,
//   queryData,
//   onResult,
//   onRemoveDuplicateBy,
//   childrenDirection = "vertical",
//   children,
// }: EachViewerProps<T, C>) {
//   const searchText = React.useContext(SearchTextContext);
//   const [results, setResults] = useState<SearchResult<T>[]>([]);
//   const [cursor, setCursor] = useState<C | undefined>(undefined);
//   const [internalSearchState, setInternalSearchState] =
//     useState<SearchState>("initial");
//   const isPaginating = useRef(false);
//   const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
//   const searchAbortRef = useRef<AbortController | undefined>(undefined);
//   const paginationAbortRef = useRef<AbortController | undefined>(undefined);
//   const cacheRef = useRef<Map<string, QueryResult<T, C>>>(new Map());
//   const onResultRef = useRef(onResult);
//   const onInitialDataRef = useRef(onInitialData);
//   const queryDataRef = useRef(queryData);
//   const onRemoveDuplicateByRef = useRef(onRemoveDuplicateBy);

//   // Always keep refs current — identity changes on these never trigger effects
//   onResultRef.current = onResult;
//   onInitialDataRef.current = onInitialData;
//   queryDataRef.current = queryData;
//   onRemoveDuplicateByRef.current = onRemoveDuplicateBy;

//   const removeDuplicates = useCallback(
//     (items: SearchResult<T>[]): SearchResult<T>[] => {
//       if (!onRemoveDuplicateByRef.current) return items;
//       const seen = new Map<any, SearchResult<T>>();
//       items.forEach((item) => {
//         const key = onRemoveDuplicateByRef.current!(item.data);
//         const existing = seen.get(key);
//         if (!existing || (!existing.isOnline && item.isOnline)) {
//           seen.set(key, item);
//         }
//       });
//       return Array.from(seen.values());
//     },
//     []
//   );

//   const executeSearch = useCallback(
//     async (value: string) => {
//       let localResults: SearchResult<T>[] = [];
//       let remoteResults: SearchResult<T>[] = [];

//       if (onInitialDataRef.current) {
//         const filtered = onInitialDataRef.current(value);
//         localResults = filtered.map((data) => ({ isOnline: false, data }));
//       }

//       if (queryDataRef.current) {
//         const cached = cacheRef.current.get(value);
//         if (cached) {
//           remoteResults = cached.data.map((data) => ({ isOnline: true, data }));
//           const deduplicated = removeDuplicates([...localResults, ...remoteResults]);
//           setResults(deduplicated);
//           setCursor(cached.cursor);
//           setInternalSearchState(deduplicated.length > 0 ? "data" : "empty");
//           return;
//         }

//         if (searchAbortRef.current) {
//           searchAbortRef.current.abort("New search initiated");
//         }
//         searchAbortRef.current = new AbortController();

//         setInternalSearchState("loading");
//         setCursor(undefined);

//         try {
//           const signal = searchAbortRef.current.signal;
//           const result = await queryDataRef.current(undefined, value, signal);
//           if (signal.aborted) return;

//           cacheRef.current.set(value, result);
//           if (cacheRef.current.size > MAX_CACHE) {
//             const firstKey = cacheRef.current.keys().next().value;
//             if (firstKey !== undefined) {
//               cacheRef.current.delete(firstKey);
//             }
//           }

//           remoteResults = result.data.map((data) => ({ isOnline: true, data }));
//           const deduplicated = removeDuplicates([...localResults, ...remoteResults]);
//           setResults(deduplicated);
//           setCursor(result.cursor);
//           setInternalSearchState(deduplicated.length > 0 ? "data" : "empty");
//         } catch (error: any) {
//           if (error.name === "AbortError") return;
//           setInternalSearchState("error");
//         }
//       } else {
//         const deduplicated = removeDuplicates(localResults);
//         setResults(deduplicated);
//         setInternalSearchState(deduplicated.length > 0 ? "data" : "empty");
//       }
//     },
//     [removeDuplicates]
//   );

//   // Re-run search when:
//   // - search text changes (user typed)
//   // - caller signals data changed via localDataDeps
//   //
//   // onInitialData and queryData are intentionally NOT in deps — they live in refs.
//   // Pass localDataDeps={[yourData, yourFilter]} to react to data changes
//   // without needing useCallback at the call site.
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   useEffect(() => {
//     if (onInitialDataRef.current || queryDataRef.current) {
//       clearTimeout(debounceRef.current);
//       debounceRef.current = setTimeout(() => {
//         executeSearch(searchText);
//       }, 300);
//     }
//     return () => clearTimeout(debounceRef.current);
//   }, [searchText, executeSearch, ...(localDataDeps ?? [])]);

//   useEffect(() => {
//     onResultRef.current?.(results);
//   }, [results]);

//   return (
//     <div
//       className={`search-viewer-content ${childrenDirection}`}
//       style={{
//         display: "flex",
//         flexDirection: childrenDirection === "vertical" ? "column" : "row",
//         gap: "8px",
//       }}
//     >
//       {children}
//     </div>
//   );
// }

// EachViewer.displayName = "EachViewer";

// // ==================== MultipleSearchViewer Component ====================
// function MultipleSearchViewer({
//   id: providedId,
//   isOpen,
//   backDrop = true,
//   onClose,
//   searchProp,
//   loadingProp,
//   noResultProp,
//   errorProp,
//   layoutProp,
//   children,
//   unmountOnClose = true,
//   zIndex = 1000,
//   maxHeight = "90dvh",
//   minHeight = "65dvh",
//   debounceMs = 300,
// }: MultipleSearchViewerProps) {
//   const [id] = useState(
//     () => providedId || `multi-search-${Math.random().toString(36).substring(2, 11)}`
//   );
//   const [searchValue, setSearchValue] = useState("");
//   const [keyboardHeight, setKeyboardHeight] = useState(0);
//   const [inputKey, setInputKey] = useState(0);
//   const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
//   const searchInputRef = useRef<HTMLInputElement>(null);
//   const sheetRef = useRef<any>(null);

//   useInjectStyles(id);

//   useEffect(() => {
//     if (typeof window === "undefined" || !window.visualViewport) return;

//     const handleResize = () => {
//       const vp = window.visualViewport!;
//       const kbHeight = window.innerHeight - vp.height;
//       setKeyboardHeight(kbHeight > 0 ? kbHeight : 0);
//     };

//     const viewport = window.visualViewport;
//     viewport.addEventListener("resize", handleResize);
//     viewport.addEventListener("scroll", handleResize);

//     return () => {
//       viewport.removeEventListener("resize", handleResize);
//       viewport.removeEventListener("scroll", handleResize);
//     };
//   }, []);

//   useEffect(() => {
//     if (!isOpen) {
//       searchInputRef.current?.blur();
//       setSearchValue("");
//       searchProp?.onChange?.("");
//       setShouldAutoFocus(false);
//     }
//   }, [isOpen]);

//   const autoFocus = searchProp?.autoFocus;
//   const handleOpenEnd = useCallback(() => {
//     if (autoFocus && searchInputRef.current) {
//       setInputKey((prev) => prev + 1);
//       setShouldAutoFocus(true);
//       searchInputRef.current.focus();
//       searchInputRef.current.click();
//     }
//   }, [autoFocus]);

//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setSearchValue(value);
//     searchProp?.onChange?.(value);
//   };

//   const handleSearchFocus = () => {
//     searchProp?.onFocus?.();
//   };

//   const handleSearchBlur = () => {
//     searchProp?.onBlur?.();
//   };

//   const handleBackFromSearch = () => {
//     onClose();
//     if (searchInputRef.current) {
//       searchInputRef.current.blur();
//     }
//   };

//   const clearSearch = () => {
//     setSearchValue("");
//     searchProp?.onChange?.("");
//     if (searchInputRef.current) {
//       searchInputRef.current.focus();
//     }
//   };

//   if (!isOpen && unmountOnClose) return null;

//   return (
//     <Sheet
//       ref={sheetRef}
//       isOpen={isOpen}
//       onClose={onClose}
//       detent="content"
//       style={{ zIndex }}
//       maxHeight={maxHeight}
//       onOpenEnd={handleOpenEnd}
//     >
//       <Sheet.Container
//         id={id}
//         style={{
//           maxHeight: "100dvh",
//           minHeight: "100%",
//           maxWidth: layoutProp?.maxWidth || "800px",
//           margin: "0 auto",
//           width: "100%",
//           left: 0,
//           right: 0,
//           paddingBottom: "calc(0px + env(safe-area-inset-bottom))",
//           background: layoutProp?.searchBackground || layoutProp?.backgroundColor,
//           borderTopLeftRadius: "0px",
//           borderTopRightRadius: "0px",
//         }}
//       >
//         <Sheet.Header>
//           <div
//             className="search-viewer-fullscreen-search"
//             style={layoutProp?.searchHeaderStyle}
//           >
//             <div
//               className="search-viewer-search"
//               style={{
//                 ...searchProp?.containerStyle,
//                 background: searchProp?.background,
//                 padding: searchProp?.padding
//                   ? `${searchProp.padding.t} ${searchProp.padding.r} ${searchProp.padding.b} ${searchProp.padding.l}`
//                   : "16px",
//               }}
//             >
//               <button
//                 className="search-viewer-search-back-button"
//                 onClick={handleBackFromSearch}
//                 aria-label="Exit search mode"
//               >
//                 {searchProp?.backIcon || (
//                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
//                     <path
//                       d="M15 18L9 12L15 6"
//                       stroke={searchProp?.textColor || "currentColor"}
//                       strokeWidth="2"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                     />
//                   </svg>
//                 )}
//               </button>

//               <input
//                 key={inputKey}
//                 ref={searchInputRef}
//                 type="text"
//                 placeholder={searchProp?.text}
//                 value={searchValue}
//                 onChange={handleSearchChange}
//                 className={searchProp?.className || "search-viewer-search-input"}
//                 style={{
//                   color: searchProp?.textColor,
//                   ...searchProp?.inputStyle,
//                 }}
//                 onFocus={handleSearchFocus}
//                 onBlur={handleSearchBlur}
//                 autoFocus={shouldAutoFocus}
//               />

//               {searchValue && (
//                 <button
//                   className="search-viewer-search-clear-button"
//                   onClick={clearSearch}
//                   aria-label="Clear search"
//                 >
//                   {searchProp?.clearIcon || (
//                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
//                       <path
//                         d="M18 6L6 18M6 6L18 18"
//                         stroke={searchProp?.textColor || "currentColor"}
//                         strokeWidth="2"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                       />
//                     </svg>
//                   )}
//                 </button>
//               )}
//             </div>
//           </div>
//         </Sheet.Header>

//         <Sheet.Content>
//           <div
//             style={{
//               paddingTop: layoutProp?.gapBetweenSearchAndContent,
//               paddingBottom:
//                 keyboardHeight > 0 ? `${keyboardHeight + 16}px` : "16px",
//             }}
//           >
//             <SearchTextContext.Provider value={searchValue}>
//               {children}
//             </SearchTextContext.Provider>
//           </div>
//         </Sheet.Content>
//       </Sheet.Container>
//       <Sheet.Backdrop onTap={backDrop ? onClose : undefined} />
//     </Sheet>
//   );
// }

// MultipleSearchViewer.displayName = "MultipleSearchViewer";

// export { MultipleSearchViewer, EachViewer };

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Sheet } from "@/lib/ModalSheetView";

// ==================== Types ====================

type Padding = { l: string; r: string; t: string; b: string };

type SearchState = "loading" | "empty" | "error" | "data" | "initial";

type QueryResult<T, C> = {
  data: T[];
  cursor?: C;
};

type SearchResult<T> = {
  isOnline: boolean;
  data: T;
};

type EachViewerResult<T> = {
  searchState: SearchState;
  results: SearchResult<T>[];
  containerRef: React.RefObject<HTMLElement | null>;
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
  localDataDeps?: React.DependencyList;
  queryData?: (
    cursor: C | undefined,
    text: string,
    signal?: AbortSignal
  ) => Promise<QueryResult<T, C>>;
  onResult?: (results: SearchResult<T>[]) => void;
  onRemoveDuplicateBy?: (item: T) => any;
  debounceMs?: number;
};

type EachViewerProps<T = any, C = any> = {
  onInitialData?: (text: string) => T[];
  localDataDeps?: React.DependencyList;
  queryData?: (
    cursor: C | undefined,
    text: string,
    signal?: AbortSignal
  ) => Promise<QueryResult<T, C>>;
  onRemoveDuplicateBy?: (item: T) => any;
  debounceMs?: number;
  children: (result: EachViewerResult<T>) => React.ReactNode;
};

type MultipleSearchViewerProps = Omit<
  SearchViewerProps,
  | "children"
  | "onInitialData"
  | "localDataDeps"
  | "queryData"
  | "onResult"
  | "onRemoveDuplicateBy"
  | "childrenDirection"
  | "searchState"
  | "loadingProp"
  | "noResultProp"
  | "errorProp"
> & {
  children:
    | React.ReactElement<EachViewerProps>
    | React.ReactElement<EachViewerProps>[];
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
  font-size: 16px !important;
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
#${id} .search-viewer-fullscreen-search {
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
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
#${id} .search-viewer-search-back-button:hover { opacity: 0.7; }
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
#${id} .search-viewer-search-clear-button:hover { opacity: 0.7; }
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
@media (max-width: 500px) {
  #${id} .react-modal-sheet-container {
    max-width: 100%;
    border-radius: 0;
  }
}
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
    return () => {
      if (styleTag && document.head.contains(styleTag)) {
        document.head.removeChild(styleTag);
      }
    };
  }, [id]);
};

const MAX_CACHE = 50;

// ==================== Shared search executor factory ====================

type SearchExecutorOptions<T, C> = {
  onInitialDataRef: React.MutableRefObject<((text: string) => T[]) | undefined>;
  queryDataRef: React.MutableRefObject<
    | ((
        cursor: C | undefined,
        text: string,
        signal?: AbortSignal
      ) => Promise<QueryResult<T, C>>)
    | undefined
  >;
  onRemoveDuplicateByRef: React.MutableRefObject<
    ((item: T) => any) | undefined
  >;
  searchAbortRef: React.MutableRefObject<AbortController | undefined>;
  cacheRef: React.MutableRefObject<Map<string, QueryResult<T, C>>>;
  removeDuplicates: (items: SearchResult<T>[]) => SearchResult<T>[];
  setResults: React.Dispatch<React.SetStateAction<SearchResult<T>[]>>;
  setCursor: React.Dispatch<React.SetStateAction<C | undefined>>;
  setInternalSearchState: React.Dispatch<React.SetStateAction<SearchState>>;
};

function createExecuteSearch<T, C>(opts: SearchExecutorOptions<T, C>) {
  return async (value: string) => {
    const {
      onInitialDataRef,
      queryDataRef,
      searchAbortRef,
      cacheRef,
      removeDuplicates,
      setResults,
      setCursor,
      setInternalSearchState,
    } = opts;

    let localResults: SearchResult<T>[] = [];
    let remoteResults: SearchResult<T>[] = [];

    if (onInitialDataRef.current) {
      const filtered = onInitialDataRef.current(value);
      localResults = filtered.map((data) => ({ isOnline: false, data }));
    }

    if (queryDataRef.current) {
      const cached = cacheRef.current.get(value);
      if (cached) {
        remoteResults = cached.data.map((data) => ({ isOnline: true, data }));
        const deduplicated = removeDuplicates([...localResults, ...remoteResults]);
        setResults(deduplicated);
        setCursor(cached.cursor);
        setInternalSearchState(deduplicated.length > 0 ? "data" : "empty");
        return;
      }

      if (searchAbortRef.current) {
        searchAbortRef.current.abort("New search initiated");
      }
      searchAbortRef.current = new AbortController();
      setInternalSearchState("loading");
      setCursor(undefined);

      try {
        const signal = searchAbortRef.current.signal;
        const result = await queryDataRef.current(undefined, value, signal);
        if (signal.aborted) return;

        cacheRef.current.set(value, result);
        if (cacheRef.current.size > MAX_CACHE) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey !== undefined) cacheRef.current.delete(firstKey);
        }

        remoteResults = result.data.map((data) => ({ isOnline: true, data }));
        const deduplicated = removeDuplicates([...localResults, ...remoteResults]);
        setResults(deduplicated);
        setCursor(result.cursor);
        setInternalSearchState(deduplicated.length > 0 ? "data" : "empty");
      } catch (error: any) {
        if (error.name === "AbortError") return;
        setInternalSearchState("error");
      }
    } else {
      const deduplicated = removeDuplicates(localResults);
      setResults(deduplicated);
      setInternalSearchState(deduplicated.length > 0 ? "data" : "empty");
    }
  };
}

// ==================== Contexts ====================

const SearchTextContext = React.createContext<string>("");

// ==================== Style helpers ====================

const paddingStr = (p?: Padding, fallback = "16px") =>
  p ? `${p.t} ${p.r} ${p.b} ${p.l}` : fallback;

// ==================== Back / Clear icons ====================

const DefaultBackIcon = ({ color }: { color?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M15 18L9 12L15 6"
      stroke={color || "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DefaultClearIcon = ({ color }: { color?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M18 6L6 18M6 6L18 18"
      stroke={color || "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ==================== Shared search bar ====================

type SearchBarProps = {
  searchProp?: SearchProps;
  searchValue: string;
  shouldAutoFocus: boolean;
  inputKey: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  onClear: () => void;
};

const SearchBar = ({
  searchProp,
  searchValue,
  shouldAutoFocus,
  inputKey,
  inputRef,
  onChange,
  onBack,
  onClear,
}: SearchBarProps) => (
  <div className="search-viewer-fullscreen-search" style={undefined}>
    <div
      className="search-viewer-search"
      style={{
        ...searchProp?.containerStyle,
        background: searchProp?.background,
        padding: paddingStr(searchProp?.padding, "16px"),
      }}
    >
      <button
        className="search-viewer-search-back-button"
        onClick={onBack}
        aria-label="Exit search mode"
      >
        {searchProp?.backIcon || (
          <DefaultBackIcon color={searchProp?.textColor} />
        )}
      </button>
      <input
        key={inputKey}
        ref={inputRef}
        type="text"
        placeholder={searchProp?.text}
        value={searchValue}
        onChange={onChange}
        className={searchProp?.className || "search-viewer-search-input"}
        style={{ color: searchProp?.textColor, ...searchProp?.inputStyle }}
        onFocus={searchProp?.onFocus}
        onBlur={searchProp?.onBlur}
        autoFocus={shouldAutoFocus}
      />
      {searchValue && (
        <button
          className="search-viewer-search-clear-button"
          onClick={onClear}
          aria-label="Clear search"
        >
          {searchProp?.clearIcon || (
            <DefaultClearIcon color={searchProp?.textColor} />
          )}
        </button>
      )}
    </div>
  </div>
);

// ==================== useSearchInput hook ====================

const useSearchInput = (
  isOpen: boolean,
  searchProp?: SearchProps,
  debounceMs = 300,
  onSearch?: (value: string) => void
) => {
  const [searchValue, setSearchValue] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) {
      searchInputRef.current?.blur();
      setSearchValue("");
      searchProp?.onChange?.("");
      setShouldAutoFocus(false);
      clearTimeout(debounceRef.current);
    }
  }, [isOpen]);

  const handleOpenEnd = useCallback(() => {
    if (searchProp?.autoFocus && searchInputRef.current) {
      setInputKey((prev) => prev + 1);
      setShouldAutoFocus(true);
      searchInputRef.current.focus();
    }
  }, [searchProp?.autoFocus]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      searchProp?.onChange?.(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch?.(value);
      }, debounceMs);
    },
    [debounceMs, onSearch, searchProp]
  );

  const handleClear = useCallback(
    (onSearch?: (v: string) => void) => {
      setSearchValue("");
      searchProp?.onChange?.("");
      clearTimeout(debounceRef.current);
      onSearch?.("");
      searchInputRef.current?.focus();
    },
    [searchProp]
  );

  return {
    searchValue,
    setSearchValue,
    inputKey,
    shouldAutoFocus,
    searchInputRef,
    debounceRef,
    handleOpenEnd,
    handleSearchChange,
    handleClear,
  };
};

// ==================== useKeyboardHeight hook ====================

const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const handleResize = () => {
      const vp = window.visualViewport!;
      const kbHeight = window.innerHeight - vp.height;
      setKeyboardHeight(kbHeight > 0 ? kbHeight : 0);
    };
    const vp = window.visualViewport;
    vp.addEventListener("resize", handleResize);
    vp.addEventListener("scroll", handleResize);
    return () => {
      vp.removeEventListener("resize", handleResize);
      vp.removeEventListener("scroll", handleResize);
    };
  }, []);

  return keyboardHeight;
};

// ==================== SearchViewer ====================

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
  maxHeight = "90dvh",
  searchState: externalSearchState = "initial",
  onInitialData,
  localDataDeps,
  queryData,
  onResult,
  onRemoveDuplicateBy,
  debounceMs = 300,
}: SearchViewerProps<T, C>) {
  const [id] = useState(
    () => providedId || `search-${Math.random().toString(36).substring(2, 11)}`
  );
  const [results, setResults] = useState<SearchResult<T>[]>([]);
  const [cursor, setCursor] = useState<C | undefined>(undefined);
  const [internalSearchState, setInternalSearchState] =
    useState<SearchState>(externalSearchState);

  const isPaginating = useRef(false);
  const sheetRef = useRef<any>(null);
  const searchAbortRef = useRef<AbortController | undefined>(undefined);
  const paginationAbortRef = useRef<AbortController | undefined>(undefined);
  const cacheRef = useRef<Map<string, QueryResult<T, C>>>(new Map());
  const onResultRef = useRef(onResult);
  const onInitialDataRef = useRef(onInitialData);
  const queryDataRef = useRef(queryData);
  const onRemoveDuplicateByRef = useRef(onRemoveDuplicateBy);

  onResultRef.current = onResult;
  onInitialDataRef.current = onInitialData;
  queryDataRef.current = queryData;
  onRemoveDuplicateByRef.current = onRemoveDuplicateBy;

  useInjectStyles(id);
  const keyboardHeight = useKeyboardHeight();
  const searchState =
    externalSearchState !== "initial" ? externalSearchState : internalSearchState;

  const removeDuplicates = useCallback(
    (items: SearchResult<T>[]): SearchResult<T>[] => {
      if (!onRemoveDuplicateByRef.current) return items;
      const seen = new Map<any, SearchResult<T>>();
      items.forEach((item) => {
        const key = onRemoveDuplicateByRef.current!(item.data);
        const existing = seen.get(key);
        if (!existing || (!existing.isOnline && item.isOnline)) {
          seen.set(key, item);
        }
      });
      return Array.from(seen.values());
    },
    []
  );

  const executeSearch = useCallback(
    createExecuteSearch<T, C>({
      onInitialDataRef,
      queryDataRef,
      onRemoveDuplicateByRef,
      searchAbortRef,
      cacheRef,
      removeDuplicates,
      setResults,
      setCursor,
      setInternalSearchState,
    }),
    [removeDuplicates]
  );

  const {
    searchValue,
    inputKey,
    shouldAutoFocus,
    searchInputRef,
    handleOpenEnd,
    handleSearchChange,
    handleClear,
  } = useSearchInput(isOpen, searchProp, debounceMs, executeSearch);

  useEffect(() => {
    if (!isOpen) {
      setResults([]);
      setCursor(undefined);
      setInternalSearchState("initial");
      searchAbortRef.current?.abort("Component closed");
      paginationAbortRef.current?.abort("Component closed");
    }
  }, [isOpen]);

  useEffect(() => {
    onResultRef.current?.(results);
  }, [results]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen && onInitialDataRef.current) {
      executeSearch(searchValue);
    }
  }, [isOpen, searchValue, executeSearch, ...(localDataDeps ?? [])]);

  const handleScroll = useCallback(
    async (e: React.UIEvent<HTMLDivElement>) => {
      if (isPaginating.current || !queryDataRef.current || !cursor) return;
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - scrollTop > clientHeight * 1.2) return;

      isPaginating.current = true;
      setInternalSearchState("loading");
      paginationAbortRef.current?.abort("New pagination request");
      paginationAbortRef.current = new AbortController();

      try {
        const signal = paginationAbortRef.current.signal;
        const result = await queryDataRef.current(cursor, searchValue, signal);
        if (signal.aborted) return;
        const newResults = result.data.map((data) => ({ isOnline: true, data }));
        setResults((prev) => removeDuplicates([...prev, ...newResults]));
        setCursor(result.cursor);
        setInternalSearchState("data");
      } catch (error: any) {
        if (error.name === "AbortError") return;
        setInternalSearchState("error");
      } finally {
        setTimeout(() => { isPaginating.current = false; }, 500);
      }
    },
    [cursor, searchValue, removeDuplicates]
  );

  if (!isOpen && unmountOnClose) return null;

  const renderContent = () => {
    if (results.length > 0) {
      return (
        <>
          {children}
          {searchState === "loading" && (
            <div
              className="search-viewer-loading"
              style={{ padding: paddingStr(loadingProp?.padding), ...loadingProp?.style }}
            >
              {loadingProp?.view}
            </div>
          )}
        </>
      );
    }
    switch (searchState) {
      case "initial": return children;
      case "loading":
        return (
          <div
            className="search-viewer-loading"
            style={{ padding: paddingStr(loadingProp?.padding), ...loadingProp?.style }}
          >
            {loadingProp?.view}
          </div>
        );
      case "empty":
        return (
          <div
            className="search-viewer-no-results"
            style={{ padding: paddingStr(noResultProp?.padding), ...noResultProp?.style }}
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
            style={{ padding: paddingStr(errorProp?.padding), ...errorProp?.style }}
          >
            {errorProp?.view || (
              <div className="search-viewer-default-error">
                {errorProp?.text || "Something went wrong"}
              </div>
            )}
          </div>
        );
      default: return null;
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
          <SearchBar
            searchProp={searchProp}
            searchValue={searchValue}
            shouldAutoFocus={shouldAutoFocus}
            inputKey={inputKey}
            inputRef={searchInputRef}
            onChange={handleSearchChange}
            onBack={() => { onClose(); searchInputRef.current?.blur(); }}
            onClear={() => handleClear(executeSearch)}
          />
        </Sheet.Header>
        <Sheet.Content>
          <div
            className={`search-viewer-content ${childrenDirection}`}
            onScroll={queryDataRef.current ? handleScroll : undefined}
            style={{
              paddingTop: layoutProp?.gapBetweenSearchAndContent,
              paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : "16px",
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

// ==================== EachViewer ====================

function EachViewer<T = any, C = any>({
  onInitialData,
  localDataDeps,
  queryData,
  onRemoveDuplicateBy,
  debounceMs = 300,
  children,
}: EachViewerProps<T, C>) {
  const searchText = React.useContext(SearchTextContext);
  const [results, setResults] = useState<SearchResult<T>[]>([]);
  const [cursor, setCursor] = useState<C | undefined>(undefined);
  const [searchState, setSearchState] = useState<SearchState>("initial");

  const containerRef = useRef<HTMLElement>(null);
  const isPaginating = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const searchAbortRef = useRef<AbortController | undefined>(undefined);
  const paginationAbortRef = useRef<AbortController | undefined>(undefined);
  const cacheRef = useRef<Map<string, QueryResult<T, C>>>(new Map());
  const onInitialDataRef = useRef(onInitialData);
  const queryDataRef = useRef(queryData);
  const onRemoveDuplicateByRef = useRef(onRemoveDuplicateBy);

  onInitialDataRef.current = onInitialData;
  queryDataRef.current = queryData;
  onRemoveDuplicateByRef.current = onRemoveDuplicateBy;

  const removeDuplicates = useCallback(
    (items: SearchResult<T>[]): SearchResult<T>[] => {
      if (!onRemoveDuplicateByRef.current) return items;
      const seen = new Map<any, SearchResult<T>>();
      items.forEach((item) => {
        const key = onRemoveDuplicateByRef.current!(item.data);
        const existing = seen.get(key);
        if (!existing || (!existing.isOnline && item.isOnline)) {
          seen.set(key, item);
        }
      });
      return Array.from(seen.values());
    },
    []
  );

  const executeSearch = useCallback(
    createExecuteSearch<T, C>({
      onInitialDataRef,
      queryDataRef,
      onRemoveDuplicateByRef,
      searchAbortRef,
      cacheRef,
      removeDuplicates,
      setResults,
      setCursor,
      setInternalSearchState: setSearchState,
    }),
    [removeDuplicates]
  );

  const handleScroll = useCallback(async () => {
    const el = containerRef.current;
    if (!el || isPaginating.current || !queryDataRef.current || !cursor) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop > clientHeight * 1.2) return;

    isPaginating.current = true;
    setSearchState("loading");
    paginationAbortRef.current?.abort("New pagination request");
    paginationAbortRef.current = new AbortController();

    try {
      const signal = paginationAbortRef.current.signal;
      const result = await queryDataRef.current(cursor, searchText, signal);
      if (signal.aborted) return;

      const newResults = result.data.map((data) => ({ isOnline: true, data }));
      setResults((prev) => removeDuplicates([...prev, ...newResults]));
      setCursor(result.cursor);
      setSearchState("data");
    } catch (error: any) {
      if (error.name === "AbortError") return;
      setSearchState("error");
    } finally {
      setTimeout(() => { isPaginating.current = false; }, 500);
    }
  }, [cursor, searchText, removeDuplicates]);

  // Attach scroll listener to whatever the user puts containerRef on
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !queryDataRef.current) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!onInitialDataRef.current && !queryDataRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      executeSearch(searchText);
    }, debounceMs);
    return () => clearTimeout(debounceRef.current);
  }, [searchText, executeSearch, ...(localDataDeps ?? [])]);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      searchAbortRef.current?.abort("EachViewer unmounted");
      paginationAbortRef.current?.abort("EachViewer unmounted");
    };
  }, []);

  return <>{children({ searchState, results, containerRef })}</>;
}

EachViewer.displayName = "EachViewer";

// ==================== MultipleSearchViewer ====================

function MultipleSearchViewer({
  id: providedId,
  isOpen,
  backDrop = true,
  onClose,
  searchProp,
  layoutProp,
  children,
  unmountOnClose = true,
  zIndex = 1000,
  maxHeight = "90dvh",
  debounceMs = 300,
}: MultipleSearchViewerProps) {
  const [id] = useState(
    () => providedId || `multi-search-${Math.random().toString(36).substring(2, 11)}`
  );
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const sheetRef = useRef<any>(null);

  useInjectStyles(id);
  const keyboardHeight = useKeyboardHeight();

  const handleDebouncedSearch = useCallback((value: string) => {
    setDebouncedSearchValue(value);
  }, []);

  const {
    searchValue,
    inputKey,
    shouldAutoFocus,
    searchInputRef,
    debounceRef,
    handleOpenEnd,
    handleSearchChange,
    handleClear,
  } = useSearchInput(isOpen, searchProp, debounceMs, handleDebouncedSearch);

  useEffect(() => {
    if (!isOpen) {
      setDebouncedSearchValue("");
      clearTimeout(debounceRef.current);
    }
  }, [isOpen]);

  if (!isOpen && unmountOnClose) return null;

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
          <SearchBar
            searchProp={searchProp}
            searchValue={searchValue}
            shouldAutoFocus={shouldAutoFocus}
            inputKey={inputKey}
            inputRef={searchInputRef}
            onChange={handleSearchChange}
            onBack={() => { onClose(); searchInputRef.current?.blur(); }}
            onClear={() => handleClear(handleDebouncedSearch)}
          />
        </Sheet.Header>
        <Sheet.Content>
          <div
            style={{
              paddingTop: layoutProp?.gapBetweenSearchAndContent,
              paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : "16px",
            }}
          >
            <SearchTextContext.Provider value={debouncedSearchValue}>
              {children}
            </SearchTextContext.Provider>
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={backDrop ? onClose : undefined} />
    </Sheet>
  );
}

MultipleSearchViewer.displayName = "MultipleSearchViewer";

// ==================== useSearchController ====================

type Operation = {
  open: () => void;
  close: () => void;
  toggle: () => void;
  setSearchState: (val: SearchState) => void;
};

const useSearchController = (
  initialSearchState?: SearchState
): [string, Operation, boolean, SearchState] => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchState, setSearchState] = useState<SearchState>(
    initialSearchState ?? "initial"
  );
  const [searchId] = useState(
    () => `search-${Math.random().toString(36).substring(2, 11)}`
  );

  const operations = useMemo<Operation>(
    () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((prev) => !prev),
      setSearchState,
    }),
    []
  );

  return [searchId, operations, isOpen, searchState];
};

// ==================== Exports ====================

export {
  SearchViewer,
  MultipleSearchViewer,
  EachViewer,
  useSearchController,
  type SearchResult,
  type EachViewerResult,
  type SearchViewerProps,
  type EachViewerProps,
  type MultipleSearchViewerProps,
};