import { useDemandState } from '@academix-admin/state-stack';
import { AchievementsModel } from '@/models/achievements-model';

export const useAchievementsModel = (lang: string, tab: string) => {
  return useDemandState<AchievementsModel[]>(
             [],
             {
               key: `achievementsModel_${tab}`,
               persist: true,
//                ttl: 3600,
               scope: "achievements_flow",
               deps: [lang],
             }
           );
};
