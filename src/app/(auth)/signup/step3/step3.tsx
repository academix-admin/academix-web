// 'use client';
//
// import styles from './step3.module.css';
// import { useState } from 'react';
//
// // import { useNav } from "@/lib/NavigationStack";
// import Step3a from '../step3a/step3a';
// import Step3b from '../step3b/step3b';
// // import NavigationStack from "@/lib/NavigationStack";
// import {SelectionViewer, useSelectionController} from "@/lib/SelectionViewer";
//
// export default function SignUpStep3() {
// //     const routes = {
// //         step3a: Step3a,
// //         step3b: Step3b
// //       };
// //   const nav = useNav();
//    const [items, setItems] = useState([{id:'1',name:'ire'}]);
// const [selectionId, controller] = useSelectionController();
//
//   return (
//     <main className={styles.container}>
//
//       <header className={styles.header}>
//         <div className={styles.headerContent}>
//           <h1 className={styles.title}>Header</h1>
//         </div>
//       </header>
//
//       <div className={styles.innerBody}>
//          {
// //              NavigationStack
// //                   id="step-3"
// //                   navLink={routes}
// //                   entry="step3a"
// //                   transition = "slide"
// //                   persist={true}
// //                   syncHistory={true}
//                 }
//             <button onClick={controller.open}>Open Selection</button>
//
//                 <SelectionViewer
//                   id={selectionId}
//                   isOpen={controller.isOpen}
//                   onClose={controller.close}
//                   titleProp={{ text: "Select an Item" }}
//                   searchProp={{
//                     text: "Search...",
//                     onChange: (value) => console.log("Search:", value)
//                   }}
//                   snapPoints={[0.3, 0.6, 0.9]}
//                   initialSnap={0.6}
//                 >
//                   {items.map(item => (
//                     <div key={item.id}>{item.name}</div>
//                   ))}
//                 </SelectionViewer>
//       </div>
//     </main>
//   );
// }


// 'use client';
//
// import styles from './step3.module.css';
// import { useState, useCallback } from 'react';
// import {SelectionViewer, useSelectionController} from "@/lib/SelectionViewer";
// import { useNav } from "@/lib/NavigationStack";
//
// export default function SignUpStep3() {
//   const [selectionId, controller, isOpen, loading, empty] = useSelectionController();
//   const [items, setItems] = useState<string[]>(['item 1','item 2','item 3','item 4','item 5','item 6','item 7','item 8','item 9','item 10','item 11','item 12',]);
//   const [searchQuery, setSearchQuery] = useState('');
//   const nav = useNav();
//
//     // Simulate loading data
//     const loadMore = useCallback(() => {
//       controller.setLoading(true);
//       setTimeout(() => {
//         setItems(prev => [...prev, ...Array(5).fill(0).map((_, i) => `Item ${prev.length + i + 1}`)]);
//         controller.setLoading(false);
//       }, 1000);
//       return items.length < 20; // Stop after 20 items
//     }, [items.length]);
//
//     const handleSearch = (query: string) => {
//       setSearchQuery(query);
//       // Filter logic would go here
//     };
//
//   return (
//     <main className={styles.container}>
//       <header className={styles.header}>
//         <div className={styles.headerContent}>
//         <button
//                       className={styles.backButton}
//                       onClick={() => nav.pop()}
//                       aria-label="Go back"
//                     >
//                       <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
//                         <path
//                           d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
//                           fill="currentColor"
//                         />
//                       </svg>
//                     </button>
//           <h1 className={styles.title}>Header</h1>
//         </div>
//       </header>
//
//       <div className={styles.innerBody}>
//         <button onClick={controller.toggle}>Selection Viewer</button>
//
//               <SelectionViewer
//                 id={selectionId}
//                 isOpen={isOpen}
//                 onClose={controller.close}
//                 titleProp={{
//                   text: "Selector",
//                   className: "custom-title-class"
//                 }}
//                 searchProp={{
//                   text: "Search items...",
//                   onChange: handleSearch,
//                   background: "#f5f5f5",
//                   padding: { l: "8px", r: "8px", t: "4px", b: "4px" },
//                   autoFocus: false
//                 }}
//                 loadingProp={{
//                   view: <div className="spin" >Loading...</div>,
//                   padding: { l: "16px", r: "16px", t: "24px", b: "24px" }
//                 }}
//                 noResultProp={{
//                   text: "No matching items found",
//                   view: <div className="custom-empty-state">No results</div>
//                 }}
//                 childrenDirection="vertical"
//                 onPaginate={loadMore}
//                 snapPoints={[1]}
//                 initialSnap={0.9}
//                 minHeight="65vh"
//                 maxHeight="90vh"
//                 closeThreshold={0.2}
//                 showLoading={loading}
//                 showEmpty={empty}
//                 zIndex={1000}
//               >
//                 {items
//                   .filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
//                   .map((item, index) => (
//                     <div key={index} className="item">
//                       {item}
//                     </div>
//                   ))}
//               </SelectionViewer>
//       </div>
//     </main>
//   );
// }

'use client';

import styles from './step3.module.css';
import { useState, useCallback, useMemo } from 'react';
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";
import { useNav } from "@/lib/NavigationStack";
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export default function SignUpStep3() {
      const { theme } = useTheme();
      const { t, lang } = useLanguage();
  const [selectionId, controller, isOpen, loading, empty] = useSelectionController();
  const [items, setItems] = useState<string[]>([
    'Item 1','Item 2','Item 3','Item 4','Item 5','Item 6','Item 7','Item 8','Item 9','Item 10','Item 11','Item 12',
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const nav = useNav();

  // 🔹 Load more with functional state to avoid stale closures
  const loadMore = useCallback(() => {
    controller.setLoading(true);
    return new Promise<boolean>((resolve) => {
      setTimeout(() => {
        setItems(prev => {
          if (prev.length >= 200) {
            controller.setLoading(false);
            resolve(false); // stop loading
            return prev;
          }
          const next = [
            ...prev,
            ...Array.from({ length: 5 }, (_, i) => `Item ${prev.length + i + 1}`),
          ];
          controller.setLoading(false);
          resolve(true);
          return next;
        });
      }, 1000);
    });
  }, [controller]);

  // 🔹 Debounced search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // 🔹 Memoize filtered items
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const filters = items.filter(item =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    );
    controller.setEmpty(filters.length <= 0);
    return filters;
  }, [items, searchQuery]);

  return (
    <main className={styles.container}>
      {/* Keep your existing header for back navigation */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button
            className={styles.backButton}
            onClick={() => nav.pop()}
            aria-label="Go back"
          >
            <svg
              className={styles.backIcon}
              viewBox="0 0 16 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <h1 className={styles.title}>Header</h1>
        </div>
      </header>

      <div className={styles.innerBody}>
        <button onClick={controller.toggle}>Open Selector</button>

        <SelectionViewer
          id={selectionId}
          isOpen={isOpen}
          onClose={controller.close}
          titleProp={{
            text: "Selector",
          }}
          cancelButton={{
            text: "Cancel",
            position: "right",
            onClick: controller.close,
            view: <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={16}
                      height={16}
                      viewBox="0 0 122.88 122.88"
                    >
                      <circle cx="61.44" cy="61.44" r="61.44" fill="#333333" />
                      <path
                        fill="white"
                        fillRule="evenodd"
                        d="M35.38 49.72c-2.16-2.13-3.9-3.47-1.19-6.1l8.74-8.53c2.77-2.8 4.39-2.66 7 0L61.68 46.86l11.71-11.71c2.14-2.17 3.47-3.91 6.1-1.2l8.54 8.74c2.8 2.77 2.66 4.4 0 7L76.27 61.44 88 73.21c2.65 2.58 2.79 4.21 0 7l-8.54 8.74c-2.63 2.71-4 1-6.1-1.19L61.68 76 49.9 87.81c-2.58 2.64-4.2 2.78-7 0l-8.74-8.53c-2.71-2.63-1-4 1.19-6.1L47.1 61.44 35.38 49.72Z"
                      />
                    </svg>
            }}
          searchProp={{
            text: "Search items...",
            onChange: handleSearch,
            background: "#f5f5f5",
            padding: { l: "4px", r: "4px", t: "0px", b: "0px" },
            autoFocus: false,
          }}
          loadingProp={{
            view: <div className="spin">Loading...</div>,
            padding: { l: "16px", r: "16px", t: "24px", b: "24px" },
          }}
          noResultProp={{
            text: "No matching items found",
            view: <div className="custom-empty-state">No results</div>,
          }}
          layoutProp={{
            gapBetweenHandleAndTitle: "16px",
            gapBetweenTitleAndSearch: "8px",
            gapBetweenSearchAndContent: "16px",
            backgroundColor:  theme === 'light' ?  "#fff" : "#121212",
            handleColor: "#888",
            handleWidth: "48px",
          }}
          childrenDirection="vertical"
          onPaginate={loadMore}
          snapPoints={[1]}
          initialSnap={1}
          minHeight="65vh"
          maxHeight="90vh"
          closeThreshold={0.2}
          showLoading={loading}
          showEmpty={empty}
          zIndex={1000}
        >
          {filteredItems.map((item, index) => (
            <div key={index} className={styles.item} aria-label={`Option ${item}`}>
              {item}
            </div>
          ))}
        </SelectionViewer>
      </div>
    </main>
  );
}
