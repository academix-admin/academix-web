import { useDemandState } from '../state-stack';
import { MissionModel } from '@/models/mission-model';

export const useMissionModel = (lang: string, tab: string) => {
  return useDemandState<MissionModel[]>(
             [],
             {
               key: `missionModel_${tab}`,
               persist: true,
               ttl: 3600,
               scope: "mission_flow",
               deps: [lang],
             }
           );
};
