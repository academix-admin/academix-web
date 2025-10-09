import { useDemandState } from '../state-stack';
import { UserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';

export const usePublicQuiz = (lang: string, pType: string) => {
  return useDemandState<UserDisplayQuizTopicModel[]>(
             [],
             {
               key: `${pType}_publicQuizModels`,
               persist: true,
               ttl: 3600,
               scope: "secondary_flow",
               deps: [lang],
             }
           );
};
