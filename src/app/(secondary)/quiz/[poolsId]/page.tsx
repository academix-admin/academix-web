'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './page.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import Image from 'next/image';
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import { FriendsModel } from '@/models/friends-model';
import { PaginateModel } from '@/models/paginate-model';
import { QuizPool } from '@/models/user-display-quiz-topic-model';
import { BackendPoolQuestion } from '@/models/pool-question-model';
import { PoolQuestion } from '@/models/pool-question-model';



export default function Quiz({ params }: { params: Promise<{ poolsId: string }> }) {
  const { poolsId } = use(params);
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const { userData } = useUserData();
  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());


  // State = {loading, quizPlay, notFound, quizTime, quizEnd, questionTrack, quizReward, error}
  const [quizState, setQuizState] = useState('loading');
  
  const [quizQuestions, setQuizQuestions] = useState<PoolQuestion[]>([]);
  const [quizModel, demandQuizModel, setQuizModel] = useDemandState<QuizPool | null>(
    null,
    {
      key: "quizModel",
      persist: false,
      scope: "quiz_flow",
      deps: [lang],
    }
  );


  useEffect(() => {
    if (!userData) return;
    demandQuizModel(async ({ get, set }) => {
      setQuizState('loading');
    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical){
          setQuizState('error');
          return;}

      const { data, error } = await supabaseBrowser.rpc("authorized_quiz_pool_questions", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_pool_id: poolsId
      });

      if (error) {
        console.error("[QuizModel] error:", error);
        return;
      }
      if(!data){
          setQuizState('error');
          return;}
      if(data.status === 'Pool.allowed'){
          const quizPool = new QuizPool(data.pools_quiz);
          const poolQuestions = (data.pools_question || []).map((row: BackendPoolQuestion) => new PoolQuestion(row));
          set(quizPool);
          setQuizQuestions(poolQuestions);
          setQuizState('quizPlay'); // allow to see questions
      }else{
          set(null);
          setQuizQuestions([]);
          setQuizState('notFound'); // quiz does not exist
      }

    } catch (err) {
      console.error("[QuizModel] error:", err);
      setQuizState('error');
      return;
    }
    });

  }, [demandQuizModel,poolsId, userData]);

        console.log(quizModel);
        console.log(quizQuestions);


  return (
    <div>
      <h1>Quiz ID: {poolsId}</h1>
      {userData && <h1>User ID: {userData.usersId}</h1>}
      <h1>Status: {quizState}</h1>
    </div>
  );
}
