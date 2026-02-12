'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './quiz-commitment.module.css';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav, usePageLifecycle, useProvideObject } from "@/lib/NavigationStack";
import { capitalizeWords } from '@/utils/textUtils';
import { getParamatical } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { UserData } from '@/models/user-data';
import { BackendRedeemCodeModel } from '@/models/redeem-code-model';
import { RedeemCodeModel } from '@/models/redeem-code-model';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import DialogCancel from '@/components/DialogCancel';
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import { useDemandState } from '@/lib/state-stack';
import { PaginateModel } from '@/models/paginate-model';
import { StateStack } from '@/lib/state-stack';
import { usePublicQuiz } from "@/lib/stacks/public-quiz-stack";
import { UserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';
import { GameModeModel } from '@/models/user-display-quiz-topic-model';
import { ChallengeModel } from '@/models/user-display-quiz-topic-model';
import QuizRuleAcceptance from "../quiz_rule-acceptance/quiz_rule-acceptance";
import QuizPayoutAcceptance from "../quiz_payout-acceptance/quiz_payout-acceptance";
import QuizRedeemCode from "../quiz-redeem-code/quiz-redeem-code";
import QuizImageViewer from "./quiz-image-viewer/quiz-image-viewer";
import QuizDetailsViewer from "./quiz-details-viewer/quiz-details-viewer";
import QuizChallengeDetails from "./quiz-challenge-details/quiz-challenge-details";
import QuizStatusInfo from "./quiz-status-info/quiz-status-info";
import { TransactionModel } from '@/models/transaction-model';
import { BackendTransactionModel } from '@/models/transaction-model';
import { useTransactionModel } from '@/lib/stacks/transactions-stack';
import { BottomViewer, useBottomController } from "@/lib/BottomViewer";
import { useUserBalance } from '@/lib/stacks/user-balance-stack';
import { useActiveQuiz } from "@/lib/stacks/active-quiz-stack";
import { poolsSubscriptionManager } from '@/lib/managers/PoolsQuizTopicSubscriptionManager';
import { PoolChangeEvent } from '@/lib/managers/PoolsQuizTopicSubscriptionManager';
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
import { useQuizDisplay } from "@/lib/stacks/quiz-display-stack";
import { PinData } from '@/models/pin-data';

interface LeaveQuizResponse {
  status: string;
  pools_id?: string;
}

interface QuizChallengeProps {
  poolsId: string;
  action: string;
}

interface EngageQuizResponse {
  status: string;
  quiz_pool: any;
  transaction_details?: BackendTransactionModel;
}


export default function QuizCommitment(props: QuizChallengeProps) {
  const { theme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const nav = useNav();
  const { poolsId, action } = props;
  const isTop = nav.isTop();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const { replaceAndWait } = useAwaitableRouter();

  const { userData, userData$ } = useUserData();
  const [userBalance] = useUserBalance(lang);
  const [transactionModels, demandTransactionModels, setTransactionModels] = useTransactionModel(lang);

  const [currentQuiz, setCurrentQuiz] = useState<UserDisplayQuizTopicModel | null>(null);
  const [quizModels, , , { isHydrated: availableHydrated }] = usePublicQuiz(lang, action === 'active' ? 'public' : action);
  const [selectedRule, setSelectedRule] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(false);
  const [selectedRedeemCodeModel, setSelectedRedeemCodeModel] = useState<RedeemCodeModel | null>(null);
  const [selectedSkip, setSelectedSkip] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoState, setInfoState] = useState('');

  const [withdrawBottomViewerId, withdrawBottomController, withdrawBottomIsOpen] = useBottomController();

  const [activeQuiz, , setActiveQuizTopicModel, { isHydrated: activeHydrated }] = useActiveQuiz(lang);
  const [membersCount, setMembersCount] = useState<number | null>(null);

  const [quizInfoBottomViewerId, quizInfoBottomController, quizInfoBottomIsOpen, , quizInfoBottomRef] = useBottomController();

  const { controlDisplayMessage, closeDisplay } = useQuizDisplay();

  const [toQuizLoading, setToQuizLoading] = useState(false);

  useProvideObject<PinData>('pin_controller', () => {
    return {
      inUse: selectedPayout && selectedRule,
      action: async (pin: string) => {
        withdrawBottomController.open();
        await handleEngage(pin);
      }
    };
  }, { scope: 'pin_scope', dependencies: [selectedRule, selectedPayout] });

  // Subscribe to changes
  const handlePoolChange = (event: PoolChangeEvent) => {
    const { eventType, newRecord: quizPool, oldRecordId: eventPoolsId } = event;
    if (!currentQuiz) return;

    // Early return if pool ID doesn't match
    if (quizPool?.poolsId !== currentQuiz?.quizPool?.poolsId && eventPoolsId !== currentQuiz?.quizPool?.poolsId) {
      return;
    }

    if (eventType === 'DELETE' && eventPoolsId === currentQuiz.quizPool?.poolsId) {
      if (isTop) {
        setInfoState('deleted');
        closeDisplay();
        quizInfoBottomController.open();
      }
    } else if (quizPool && quizPool.poolsId === currentQuiz.quizPool?.poolsId) {

      // Update the pool
      const topicModel = UserDisplayQuizTopicModel.from(currentQuiz);
      const renewedPool = topicModel?.quizPool?.getStreamedUpdate(quizPool);
      setCurrentQuiz(topicModel.copyWith({ quizPool: renewedPool }));
      //         something else
      // old status was active, ended
      if (quizPool.poolsJob === 'PoolJob.pool_ended') {
        if (isTop) {
          setInfoState('closed');
          closeDisplay();
          quizInfoBottomController.open();
        }
      }

    }
  };

  useEffect(() => {
    if (!availableHydrated || !activeHydrated) return;
    const getQuiz = action === 'active' ? activeQuiz : quizModels.find((e) => e.quizPool?.poolsId === poolsId);

    if (getQuiz && !currentQuiz) {
      fetchPoolMembers(getQuiz);
      setCurrentQuiz(getQuiz);
      if (getQuiz.quizPool?.poolsJob && getQuiz.quizPool?.poolsJobEndAt) {
        controlDisplayMessage(getQuiz.quizPool.poolsJob, getQuiz.quizPool.poolsJobEndAt);
      }
    } else if (isTop) {
      if (!currentQuiz) {
        nav.popToRoot();
      }
    }
  }, [poolsId, availableHydrated, activeHydrated, isTop, action, controlDisplayMessage
  ]);

  useEffect(() => {
    poolsSubscriptionManager.attachListener(handlePoolChange, !currentQuiz);

    return () => {
      poolsSubscriptionManager.removeListener(handlePoolChange);
    };

  }, [handlePoolChange]);

  // ✅ Clean lifecycle management with embedded hook
  usePageLifecycle(nav, {
    onResume: ({ stack, current }) => {
      if (currentQuiz?.quizPool?.poolsJob && currentQuiz?.quizPool?.poolsJobEndAt) {
        controlDisplayMessage(currentQuiz.quizPool.poolsJob, currentQuiz.quizPool.poolsJobEndAt);
      }
    }
  }, [currentQuiz]);

  // Function to engage quiz API call
  const engageQuiz = async (jwt: string, data: any): Promise<EngageQuizResponse> => {
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

  // Function to leave quiz API call
  const leaveQuiz = async (jwt: string, data: any): Promise<LeaveQuizResponse> => {
    const proxyUrl = '/api/leave';

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
      console.error("Leave Quiz API error:", error);
      throw error;
    }
  };

  const handleLeave = async () => {
    if (!userData || !currentQuiz) return;

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

      const session = await supabaseBrowser.auth.getSession();
      const jwt = session.data.session?.access_token;

      if (!jwt) {
        console.log('no JWT token');
        setQuizLoading(false);
        setError(t('error_occurred'));
        return;
      }

      const requestData = {
        userId: userData.usersId,
        locale: paramatical.locale,
        country: paramatical.country,
        gender: paramatical.gender,
        age: paramatical.age
      };

      const leave = await leaveQuiz(jwt, requestData);
      const status = leave.status;

      if (status === 'PoolActive.success') {
        if (activeQuiz?.quizPool?.poolsId) poolsSubscriptionManager.removeQuizTopicPool(activeQuiz.quizPool.poolsId);
        setActiveQuizTopicModel(null);
        const updatedModels = transactionModels.filter(
          (m) => m.poolsId !== leave.pools_id
        );
        setTransactionModels(updatedModels);
        if (isTop) {
          setInfoState('left');
          closeDisplay();
          quizInfoBottomController.open();
        }
      } else if (status === 'PoolActive.no_active' && activeQuiz) {
        if (activeQuiz?.quizPool?.poolsId) poolsSubscriptionManager.removeQuizTopicPool(activeQuiz.quizPool.poolsId);
        setActiveQuizTopicModel(null);
        const updatedModels = transactionModels.filter(
          (m) => m.poolsId !== leave.pools_id
        );
        setTransactionModels(updatedModels);
        if (isTop) {
          setInfoState('left');
          closeDisplay();
          quizInfoBottomController.open();
        }
      }
      setQuizLoading(false);

    } catch (error: any) {
      console.error("Top up error:", error);
      setQuizLoading(false);
      setError(t('error_occurred'));
    }
  };

  const getUserPin = () => {
    withdrawBottomController.close();
    nav.pushWith('pin', { requireObjects: ['pin_controller'] });
  }

  const handleEngage = async (userPin: string) => {
    if (!userData || !currentQuiz || !selectedRule || !selectedPayout) return;

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
        setError(t('error_occurred'));
        return;
      }

      const requestData = {
        userId: userData.usersId,
        topicsId: currentQuiz.topicsId,
        challengeId: currentQuiz.quizPool?.challengeModel?.challengeId,
        poolsId: currentQuiz.quizPool?.poolsId,
        redeemCode: selectedRedeemCodeModel?.redeemCodeValue,
        locale: paramatical.locale,
        country: paramatical.country,
        gender: paramatical.gender,
        age: paramatical.age,
        userPin: userPin
      };

      const engagement = await engageQuiz(jwt, requestData);
      const status = engagement.status;


      if (status === 'PoolStatus.engaged' || status === 'PoolStatus.this_active') {
        const quizModel = new UserDisplayQuizTopicModel(engagement.quiz_pool);
        const transaction = new TransactionModel(engagement.transaction_details);
        if (engagement.transaction_details) setTransactionModels([transaction, ...transactionModels]);
        setActiveQuizTopicModel(quizModel);
        if (quizModel?.quizPool?.poolsId) poolsSubscriptionManager.addQuizTopicPool(
          {
            poolsId: quizModel.quizPool.poolsId,
            poolsSubscriptionType: 'active'
          },
          {
            override: true,
            update: true
          }
        );
        await fetchPoolMembers(quizModel);
        withdrawBottomController.close();
        await nav.replaceParam({
          poolsId: quizModel?.quizPool?.poolsId,
          action: 'active'
        });
      }else if(status === 'PoolStatus.pinError'){
        withdrawBottomController.close();
        await (await nav.goToGroupId('profile-stack')).push('security_verification', { request: 'Pin', isNew: true });
      }else if(status === 'PoolStatus.pinError'){
        setError(status);
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

  const fetchPoolMembers = useCallback(async (currentQuiz: UserDisplayQuizTopicModel) => {
    if (!userData || !currentQuiz) return;
    try {

      const { data, error } = await supabaseBrowser.rpc("get_pools_members_count", {
        p_user_id: userData.usersId,
        p_pools_id: poolsId,
        p_topics_id: currentQuiz.topicsId
      });


      if (error) {
        console.error("[Members] error:", error);
        return;
      }

      setMembersCount(data);
    } catch (err) {
      console.error("[Members] error:", err);
      return;
    } finally {
      // Schedule next call only if component is still mounted
      if (isMountedRef.current) {
        timeoutRef.current = setTimeout(() => {
          fetchPoolMembers(currentQuiz);
        }, 10000);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const onContinueClick = async () => {
    setToQuizLoading(true);
    if (!userData || !currentQuiz?.quizPool?.poolsId) return;
    await nav.popToRoot();
    quizInfoBottomController.close();
    await replaceAndWait(`/quiz/${currentQuiz.quizPool?.poolsId}`);
    setToQuizLoading(false);
  };

  const onExit = () => {
    quizInfoBottomController.close();
    nav.popToRoot();
  };

  // Format number with commas
  const formatNumber = useCallback((num: number) => {
    return Number(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",").replace('.00', '');
  }, []);

  const formatStatus = useCallback((status: string) => {
    switch (status) {
      case 'PoolJob.waiting':
        return t('waiting_time');
      case 'PoolJob.extended_waiting':
        return t('extended_time');
      case 'PoolJob.pool_period':
        return t('pool_time');
      case 'PoolJob.start_pool':
        return t('starting_time');
      case 'PoolJob.pool_ended':
        return t('quiz_closed');
      default:
        return t('open_quiz');
    }
  }, []);

  const selectedChallengeModel = currentQuiz?.quizPool?.challengeModel;
  const balance = userBalance?.usersBalanceAmount ?? 0;
  const codeBalance = selectedRedeemCodeModel?.redeemCodeAmount || 0;
  const balanceSufficient = balance >= (selectedChallengeModel?.challengePrice || 0);
  const codeSufficient = codeBalance >= (selectedChallengeModel?.challengePrice || 0);
  const bothSufficient = (balance < (selectedChallengeModel?.challengePrice || 0)) &&
    (codeBalance < (selectedChallengeModel?.challengePrice || 0)) &&
    (balance + codeBalance) >= (selectedChallengeModel?.challengePrice || 0);
  const codeCheck = codeSufficient || bothSufficient;
  const balanceCheck = codeSufficient ? false : (balanceSufficient || bothSufficient);
  const bothCheck = codeCheck || balanceCheck;

  const showBottom = currentQuiz && selectedChallengeModel && (selectedSkip || selectedRedeemCodeModel) && selectedRule && selectedPayout;

  const getIsContinueEnabled = (quiz: UserDisplayQuizTopicModel | null): boolean => {
    if (!quiz?.quizPool) return false;

    const { poolsStatus, poolsJob, poolsJobEndAt } = quiz.quizPool;
    if (poolsStatus !== 'Pools.active' || !poolsJobEndAt) return false;

    const now = new Date();
    const endAt = new Date(poolsJobEndAt);

    if (poolsJob === 'PoolJob.pool_period') return now < endAt;
    if (poolsJob === 'PoolJob.start_pool') return now >= endAt;

    return false;
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
          <h1 className={styles.title}>{selectedChallengeModel?.challengeIdentity}</h1>
          <div className={styles.headerSpacer} />
        </div>
      </header>

      <div className={styles.innerBody}>
        {currentQuiz && <QuizImageViewer imageUrl={currentQuiz.topicsImageUrl} identity={currentQuiz.topicsIdentity} />}
        {currentQuiz && <QuizDetailsViewer topicsModel={currentQuiz} />}
        {currentQuiz && <QuizChallengeDetails poolsId={currentQuiz?.quizPool?.poolsId || ''} membersCount={membersCount || currentQuiz?.quizPool?.poolsMembersCount || 0} minimumMembers={currentQuiz?.quizPool?.challengeModel?.challengeMinParticipant || 0} maximumMembers={currentQuiz?.quizPool?.challengeModel?.challengeMaxParticipant || 0} fee={currentQuiz?.quizPool?.challengeModel?.challengePrice || 0} status={currentQuiz?.quizPool?.poolsJob || ''} jobEndAt={currentQuiz?.quizPool?.poolsJobEndAt || ''} />}
        {currentQuiz && <QuizStatusInfo status={formatStatus(currentQuiz?.quizPool?.poolsJob || '')} />}
        {currentQuiz && <QuizRuleAcceptance onAcceptanceChange={setSelectedRule} canChange={action != 'active'} initialValue={action === 'active'} />}
        {currentQuiz && <QuizPayoutAcceptance onAcceptanceChange={setSelectedPayout} canChange={action != 'active'} initialValue={action === 'active'} challengeId={currentQuiz?.quizPool?.challengeModel?.challengeId || ''} />}
        {currentQuiz && action != 'active' && selectedRule && selectedPayout && (
          <QuizRedeemCode
            onRedeemCodeSelect={setSelectedRedeemCodeModel}
            onSkip={setSelectedSkip}
          />
        )}
        {showBottom && currentQuiz && action != 'active' && (
          <button
            onClick={() => withdrawBottomController.open()}
            type="button"
            className={styles.continueButton}
          >
            {t('commit_text')}
          </button>
        )}
        {action === 'active' && currentQuiz && (
          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.removeButton}
              disabled={!activeQuiz || activeQuiz.quizPool?.poolsStatus != 'Pools.open'}
              onClick={handleLeave}
            >
              {quizLoading ? <span className={styles.spinner}></span> : t('leave_text')}
            </button>
            <button
              className={styles.continueButton}
              onClick={onContinueClick}
              disabled={!activeQuiz || !getIsContinueEnabled(activeQuiz)}
            >
              {toQuizLoading ? <span className={styles.spinner}></span> : t('continue')}
            </button>
          </div>
        )}
      </div>

      {showBottom && action != 'active' && <BottomViewer
        id={withdrawBottomViewerId}
        isOpen={withdrawBottomIsOpen}
        onClose={withdrawBottomController.close}
        backDrop={false}
        cancelButton={{
          position: "right",
          onClick: withdrawBottomController.close,
          view: <DialogCancel />
        }}
        layoutProp={{
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        closeThreshold={0.2}
        zIndex={1000}
      >
        <div className={`${styles.dialogContainer} ${styles[`dialogContainer_${theme}`]}`}>
          <div className={styles.paymentConfirmation}>
            {/* Amount */}
            <div className={styles.amountSection}>
              <div className={styles.currencyAmount}>
                A {formatNumber(selectedChallengeModel?.challengePrice || 0)}
              </div>
            </div>

            {/* Challenge */}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t('challenge_text')}:</span>
              <span className={styles.infoValue}>
                {selectedChallengeModel?.challengeIdentity}
              </span>
            </div>

            {/* Topic */}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t('topic_text')}:</span>
              <span className={styles.infoValue}>{currentQuiz.topicsIdentity}</span>
            </div>

            {/* Amount */}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t('amount_text')}:</span>
              <span className={styles.infoValue}>
                A {selectedChallengeModel?.challengePrice}
              </span>
            </div>

            {/* Fees */}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t('fee_text')}:</span>
              <span className={styles.infoValue}>0.00</span>
            </div>

            <div className={styles.divider} />

            {/* Payment Method */}
            <div className={styles.paymentMethodSection}>
              <h3 className={styles.paymentMethodTitle}>{t('payment_method')}</h3>

              <div className={styles.walletCard}>
                <div className={styles.walletIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M16 14a2 2 0 11-4 0 2 2 0 014 0z"
                      fill="currentColor"
                    />
                  </svg>
                </div>

                <div className={styles.walletInfo}>
                  <div className={styles.walletName}>
                    {t('redeem_code_text')} (
                    <span className={styles.academixBalance}>
                      A {formatNumber(codeBalance)}
                    </span>
                    )
                  </div>
                  {!codeCheck && <span> {t('insufficient_balance')} </span>}
                </div>
              </div>

              <div className={styles.walletCard}>
                <div className={styles.walletIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M16 14a2 2 0 11-4 0 2 2 0 014 0z"
                      fill="currentColor"
                    />
                  </svg>
                </div>

                <div className={styles.walletInfo}>
                  <div className={styles.walletName}>
                    {t('wallet_text')} (
                    <span className={styles.academixBalance}>
                      A {formatNumber(balance)}
                    </span>
                    )
                  </div>
                  {!balanceCheck && !balanceSufficient && <span> {t('insufficient_balance')} </span>}
                </div>
              </div>
            </div>
            
            {error && <p className={`${styles.errorText} ${styles[`errorText_${theme}`]}`}>{error}</p>}

            {/* Pay Button */}
            <button
              onClick={getUserPin}
              type="button"
              className={styles.continueButton}
              disabled={quizLoading || !bothCheck}
              aria-disabled={quizLoading}
            >
              {quizLoading ? <span className={styles.spinner}></span> : t('pay_text')}
            </button>
          </div>
        </div>
      </BottomViewer>}

      {currentQuiz && action === 'active' && <BottomViewer
        ref={quizInfoBottomRef}
        id={quizInfoBottomViewerId}
        isOpen={quizInfoBottomIsOpen}
        onClose={onExit}
        backDrop={false}
        cancelButton={{
          position: "right",
          onClick: onExit,
          view: <DialogCancel />
        }}
        layoutProp={{
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        closeThreshold={0.2}
        zIndex={1000}
      >
        <div className={`${styles.dialogContainer} ${styles[`dialogContainer_${theme}`]}`}>
          <div className={styles.poolInfoContainer}>
            <h3 className={`${styles.dialogTitle} ${styles[`dialogTitle_${theme}`]}`}>
              {t('pool_closed')}
            </h3>
            <h3 className={`${styles.dialogBody} ${styles[`dialogBody_${theme}`]}`}>
              {infoState === 'deleted' && tNode('pool_info_reason', { topic: <strong>{currentQuiz?.topicsIdentity || ''}</strong> })}
              {infoState === 'left' && t('user_left_pool')}
              {infoState === 'closed' && tNode('pool_already_ended', { topic: <strong>{currentQuiz?.topicsIdentity || ''}</strong> })}
            </h3>
            <button
              onClick={onExit}
              type="button"
              className={styles.continueButton}
            >
              {t('exit_text')}
            </button>
          </div>
        </div>
      </BottomViewer>}
    </main>
  );
}