import { useDemandState } from '../state-stack';
import { PoolMemberModel } from '@/models/pool-member';

export const usePoolMemberModel = (lang: string) => {
  return useDemandState<PoolMemberModel[]>(
             [],
             {
               key: "poolMembers",
               persist: true,
               ttl: 600,
               scope: "pool_member_flow",
               deps: [lang],
             }
           );
};
