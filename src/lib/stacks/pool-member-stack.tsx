import { useDemandState } from '@academix-admin/state-stack';
import { PoolMemberModel } from '@/models/pool-member';

export const usePoolMemberModel = (lang: string) => {
  return useDemandState<PoolMemberModel[]>(
             [],
             {
               key: "poolMembers",
               persist: true,
               scope: "pool_member_flow",
               deps: [lang],
             }
           );
};
