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


'use client';

import styles from './step3.module.css';
import { useState, useCallback } from 'react';
import {SelectionViewer, useSelectionController} from "@/lib/SelectionViewer";
import { useNav } from "@/lib/NavigationStack";

export default function SignUpStep3() {
  const [selectionId, controller, isOpen, loading, empty] = useSelectionController();
  const [items, setItems] = useState<string[]>(['item 1','item 2','item 3','item 4','item 5','item 6','item 7','item 8','item 9','item 10','item 11','item 12',]);
  const [searchQuery, setSearchQuery] = useState('');
  const nav = useNav();

    // Simulate loading data
    const loadMore = useCallback(() => {
      controller.setLoading(true);
      setTimeout(() => {
        setItems(prev => [...prev, ...Array(5).fill(0).map((_, i) => `Item ${prev.length + i + 1}`)]);
        controller.setLoading(false);
      }, 1000);
      return items.length < 20; // Stop after 20 items
    }, [items.length]);

    const handleSearch = (query: string) => {
      setSearchQuery(query);
      // Filter logic would go here
    };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
        <button
                      className={styles.backButton}
                      onClick={() => nav.pop()}
                      aria-label="Go back"
                    >
                      <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        <button onClick={controller.toggle}>Selection Viewer</button>

              <SelectionViewer
                id={selectionId}
                isOpen={isOpen}
                onClose={controller.close}
                titleProp={{
                  text: "Selector",
                  className: "custom-title-class"
                }}
                searchProp={{
                  text: "Search items...",
                  onChange: handleSearch,
                  background: "#f5f5f5",
                  padding: { l: "12px", r: "12px", t: "8px", b: "8px" },
                  autoFocus: false
                }}
                loadingProp={{
                  view: <div className="spin" >Loading...</div>,
                  padding: { l: "16px", r: "16px", t: "24px", b: "24px" }
                }}
                noResultProp={{
                  text: "No matching items found",
                  view: <div className="custom-empty-state">No results</div>
                }}
                childrenDirection="vertical"
                onPaginate={loadMore}
                snapPoints={[0.6, 0.9]}
                initialSnap={0.9}
                minHeight="65vh"
                maxHeight="90vh"
                closeThreshold={0.2}
                showLoading={loading}
                showEmpty={empty}
                zIndex={1000}
              >
                {items
                  .filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item, index) => (
                    <div key={index} className="item">
                      {item}
                    </div>
                  ))}
              </SelectionViewer>
      </div>
    </main>
  );
}