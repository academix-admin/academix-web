import { useDemandState } from '../state-stack';
import { UserData } from '@/models/user-data';

export const useAcademixRatio = (lang: string) => {
  return useDemandState(
             0,
             {
               key: "academixRatioData",
               persist: true,
//                ttl: 3600,
               scope: "secondary_flow",
               deps: [lang],
             }
           );
};
