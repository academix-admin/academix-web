import { useDemandState } from '@academix-admin/state-stack';
import { UserData } from '@/models/user-data';

export const useAcademixRatio = (lang: string) => {
  // Initial is null (not-loaded) — NOT 0 — so a real ratio of 0 is distinguishable from "not fetched
  // yet" and can be shown (a valid academix ratio of 0 must still render).
  return useDemandState<number | null>(
             null,
             {
               key: "academixRatioData",
               persist: true,
               scope: "secondary_flow",
               deps: [lang],
             }
           );
};
