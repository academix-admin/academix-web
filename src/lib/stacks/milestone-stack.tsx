import { useDemandState } from '@academix-admin/state-stack';
import { MissionData } from '@/models/mission-model';
import { AchievementsData } from '@/models/achievements-model';


export const useMissionData = (lang: string) => {
  return useDemandState<MissionData | null>(
             null,
             {
               key: "missionData",
               persist: true,
               scope: "secondary_flow",
               deps: [lang],
             }
           );
};

export const useAchievementsData = (lang: string) => {
  return useDemandState<AchievementsData | null>(
             null,
             {
               key: "achievementsData",
               persist: true,
               scope: "secondary_flow",
               deps: [lang],
             }
           );
};