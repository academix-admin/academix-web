import { useDemandState } from '../state-stack';
import { UserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';

export const useAvailableQuiz = (lang: string, pType: string) => {
  return useDemandState<UserDisplayQuizTopicModel[]>(
             [],
             {
               key: `${pType}_quizModels`,
               persist: true,
               ttl: 3600,
               scope: "secondary_flow",
               deps: [lang],
             }
           );
};
