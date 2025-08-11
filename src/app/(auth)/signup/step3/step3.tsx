'use client';

import styles from './step3.module.css';
import { useNav } from "@/lib/NavigationStack";
import Step3a from '../step3a/step3a';
import Step3b from '../step3b/step3b';
import NavigationStack from "@/lib/NavigationStack";

export default function SignUpStep3() {
    const routes = {
        step3a: Step3a,
        step3b: Step3b
      };
  const nav = useNav();


  return (
    <main className={styles.container}>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Header</h1>
        </div>
      </header>

      <div className={styles.innerBody}>
         <NavigationStack
                  id="step-3"
                  navLink={routes}
                  entry="step3a"
                  transition = "slide"
                  persist={true}
                  syncHistory={true}
                />
      </div>
    </main>
  );
}