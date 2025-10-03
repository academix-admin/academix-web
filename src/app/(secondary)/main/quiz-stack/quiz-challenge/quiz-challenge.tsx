'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './quiz-challenge.module.css';
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
import { GameModeModel } from '@/models/user-display-quiz-topic-model';
import { ChallengeModel } from '@/models/user-display-quiz-topic-model';
import QuizAllocation from "./quiz-allocation/quiz-allocation";
import GameMode from "./game-mode/game-mode";
import GameChallenge from "./game-challenge/game-challenge";
import QuizRuleAcceptance from "./quiz_rule-acceptance/quiz_rule-acceptance";
import QuizPayoutAcceptance from "./quiz_payout-acceptance/quiz_payout-acceptance";
import QuizRedeemCode from "./quiz-redeem-code/quiz-redeem-code";
import { TransactionModel } from '@/models/transaction-model';
import { BackendTransactionModel } from '@/models/transaction-model';
import { useTransactionModel } from '@/lib/stacks/transactions-stack';


interface QuizChallengeProps {
  topicsId: string;
  pType: string;
}

interface EngageQuizResponse {
  status: string;
  quiz_pool: any;
  transaction_details?: BackendTransactionModel;
}

export default function QuizChallenge(props: QuizChallengeProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { topicsId, pType } = props;
  const isTop = nav.isTop();

  const { userData, userData$ } = useUserData();
  const [transactionModels, demandTransactionModels, setTransactionModels] = useTransactionModel(lang);

  const [currentQuiz, setCurrentQuiz] = useState<UserDisplayQuizTopicModel | null>(null);
  const [quizModels,,, { isHydrated }] = useAvailableQuiz(lang, pType);
  const [selectedGameModeModel, setSelectedGameModeModel] = useState<GameModeModel | null>(null);
  const [selectedChallengeModel, setSelectedChallengeModel] = useState<ChallengeModel | null>(null);
  const [selectedRule, setSelectedRule] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(false);
  const [selectedRedeemCodeModel, setSelectedRedeemCodeModel] = useState<RedeemCodeModel | null>(null);
  const [selectedSkip, setSelectedSkip] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if(!isHydrated)return;
    const getQuiz = quizModels.find((e) => e.topicsId === topicsId);

    if (getQuiz) {
      setCurrentQuiz(getQuiz);
    } else if(isTop) {
      nav.popToRoot();
    }
  }, [quizModels, topicsId, isHydrated, isTop]);

  // Function to engage quiz API call
  const engageQuiz = async (jwt: string, data: any): Promise<EngageQuizResponse> => {
    // Use the App Router API endpoint
    const proxyUrl = '/api/engage';

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error("Engage Quiz API error:", error);
      throw error;
    }
  };

  const handleEngage = async () => {
    if (!userData || !selectedGameModeModel || !selectedChallengeModel || !selectedRule || !selectedPayout) return;

    try {
         setQuizLoading(true);
        setError('');
      const location = await checkLocation();
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) {
        setQuizLoading(false);
        setError(t('error_occurred'));
        return;
      }

      const feature = await checkFeatures(
        'Features.quiz_taking',
        lang,
        paramatical.country,
        userData.usersSex,
        userData.usersDob
      );

      if (!feature) {
        setQuizLoading(false);
        console.log('feature not available');
        setError(t('feature_unavailable'));
        return;
      }

      const session = await supabaseBrowser.auth.getSession();
      const jwt = session.data.session?.access_token;

      if (!jwt) {
        console.log('no JWT token');
        setQuizLoading(false);
        setError(t('error_occurred') );
        return;
      }

      const requestData = {
        userId: userData.usersId,
        topicsId: topicsId,
        challengeId: selectedChallengeModel.challengeId,
        poolsId: null,
        redeemCode: selectedRedeemCodeModel?.redeemCodeValue,
        locale: paramatical.locale,
        country: paramatical.country,
        gender: paramatical.gender,
        age: paramatical.age
      };

      const engagement = await engageQuiz(jwt, requestData);
      const status = engagement.status;

       console.log(engagement);

      if (status === 'PoolStatus.engaged' || status === 'PoolStatus.this_active') {

        const quizModel = new UserDisplayQuizTopicModel(engagement.quiz_pool);
        const transaction = new TransactionModel(engagement.transaction_details);

        if(engagement.transaction_details)setTransactionModels([transaction,...transactionModels]);
        await nav.pushAndPopUntil('quiz_commitment',(entry) => entry.key === 'quiz_page', {poolsId: quizModel?.quizPool?.poolsId, action: 'active'})
      }

     setQuizLoading(false);

    } catch (error: any) {
      console.error("Top up error:", error);
      setQuizLoading(false);
      setError(t('error_occurred'));
    }
  };

  const goBack = async () => {
    await nav.pop();
          StateStack.core.clearScope('redeem_code_flow');

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
          <h1 className={styles.title}>{t('quiz_challenges')}</h1>
          <div className={styles.headerSpacer} />
        </div>
      </header>

      <div className={styles.innerBody}>
         <QuizAllocation />
         { currentQuiz && <GameMode onModeSelect={setSelectedGameModeModel} topicsId={currentQuiz.topicsId} /> }
         { currentQuiz && selectedGameModeModel && <GameChallenge key={selectedGameModeModel.gameModeId} onChallengeSelect={setSelectedChallengeModel} topicsId={currentQuiz.topicsId} gameModeId={selectedGameModeModel.gameModeId} /> }
         { currentQuiz && selectedChallengeModel && <QuizRuleAcceptance  onAcceptanceChange={setSelectedRule}/> }
         { currentQuiz && selectedChallengeModel && <QuizPayoutAcceptance  onAcceptanceChange={setSelectedPayout}/> }
         { currentQuiz && selectedChallengeModel &&  selectedRule && selectedPayout && <QuizRedeemCode  onRedeemCodeSelect={setSelectedRedeemCodeModel} onSkip={setSelectedSkip}/> }
         { currentQuiz && selectedChallengeModel && (selectedSkip || selectedRedeemCodeModel) && selectedRule && selectedPayout && <button
                                                             onClick={handleEngage}
                                                             type="button"
                                                             className={styles.continueButton}
                                                             disabled={quizLoading}
                                                             aria-disabled={quizLoading}
                                                           >
                                                             { quizLoading ?  <span className={styles.spinner}></span> : t('engage_text')}
                                                           </button> }
      </div>
    </main>
  );
}

