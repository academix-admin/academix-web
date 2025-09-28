'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './quiz-mode.module.css';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { capitalizeWords } from '@/utils/textUtils';
import { getParamatical } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { UserData } from '@/models/user-data';
import { BackendRedeemCodeModel } from '@/models/redeem-code-model';
import { RedeemCodeModel } from '@/models/redeem-code-model';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import { useDemandState } from '@/lib/state-stack';
import { PaginateModel } from '@/models/paginate-model';
import { StateStack } from '@/lib/state-stack';
import { useAvailableQuiz } from "@/lib/stacks/available-quiz-stack";
import { UserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';

interface QuizModeProps {
  topicsId: string;
  pType: string;
}

export default function QuizMode(props: QuizModeProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { topicsId, pType } = props;

  const { userData, userData$ } = useUserData();

  const [currentQuiz, setCurrentQuiz] = useState<UserDisplayQuizTopicModel | null>(null);
  const [quizModels,,, { isHydrated }] = useAvailableQuiz(lang, pType);

  useEffect(() => {
    if(!isHydrated)return;
    const getQuiz = quizModels.find((e) => e.topicsId === topicsId);

    if (getQuiz) {
      setCurrentQuiz(getQuiz);
    } else {
      goBack();
    }
  }, [quizModels, topicsId, isHydrated]);

    const goBack = async () => {
      await nav.pop();
    };

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button
            className={styles.backButton}
            onClick={goBack}
            aria-label="Go back"
          >
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <h1 className={styles.title}>{t('quiz_mode')}</h1>
          <div className={styles.headerSpacer} />
        </div>
      </header>

      <div className={styles.content}>
         { currentQuiz && currentQuiz.topicsIdentity}
      </div>
    </main>
  );
}

