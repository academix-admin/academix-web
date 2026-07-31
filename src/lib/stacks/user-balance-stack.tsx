import { useDemandState } from '@academix-admin/state-stack';
import { UserBalanceModel } from '@/models/user-balance';

export const useUserBalance = (lang: string) => {
  return useDemandState<UserBalanceModel | null>(
             null,
             {
               key: "userBalance",
               persist: true,
               ttl: 300, // wallet balance: expire the persisted copy after 5m so a stale balance can't show on reload (realtime keeps it live while open)
               scope: "secondary_flow",
               deps: [lang],
             }
           );
};
