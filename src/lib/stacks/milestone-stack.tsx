import { useDemandState } from '../state-stack';
import { MissionData } from '@/models/mission-data';
import { AchievementsData } from '@/models/achievements-data';


export const useMissionData = (lang: string) => {
  return useDemandState<MissionData | null>(
             null,
             {
               key: "missionData",
               persist: true,
//                ttl: 3600,
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
//                ttl: 3600,
               scope: "secondary_flow",
               deps: [lang],
             }
           );
};