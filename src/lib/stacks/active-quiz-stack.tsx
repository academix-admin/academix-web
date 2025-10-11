import { useDemandState } from '../state-stack';
import { UserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';

export const useActiveQuiz = (lang: string) => {
  return useDemandState<UserDisplayQuizTopicModel | null>(
             null,
             {
               key: `active_quizModels`,
               persist: true,
               ttl: 3600,
               scope: "secondary_flow",
               deps: [lang],
             }
           );
};
