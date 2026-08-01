import { useDemandState } from '@academix-admin/state-stack';
import { MissionModel } from '@/models/mission-model';

export const useMissionModel = (lang: string, tab: string) => {
  return useDemandState<MissionModel[]>(
             [],
             {
               key: `missionModel_${tab}`,
               persist: true,
               scope: "mission_flow",
               deps: [lang],
             }
           );
};
