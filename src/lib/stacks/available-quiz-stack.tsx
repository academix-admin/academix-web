import { useDemandState } from '@academix-admin/state-stack';
import { UserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';

export const useAvailableQuiz = (lang: string, pType: string) => {
  return useDemandState<UserDisplayQuizTopicModel[]>(
             [],
             {
               key: `${pType}_quizModels`,
               persist: true,
               scope: "secondary_flow",
               deps: [lang],
             }
           );
};
