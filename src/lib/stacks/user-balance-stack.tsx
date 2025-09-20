import { useDemandState } from '../state-stack';
import { UserBalanceModel } from '@/models/user-balance';

export const useUserBalance = (lang: string) => {
  return useDemandState<UserBalanceModel | null>(
             null,
             {
               key: "userBalance",
               persist: true,
               ttl: 3600,
               scope: "secondary_flow",
               deps: [lang],
             }
           );
};
