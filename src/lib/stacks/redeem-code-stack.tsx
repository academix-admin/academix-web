import { useDemandState } from '../state-stack';
import { RedeemCodeModel } from '@/models/redeem-code-model';

export const useRedeemCodeModel = (lang: string) => {
  return useDemandState<RedeemCodeModel[]>(
             [],
             {
               key: "redeemCodes",
               persist: true,
               ttl: 600,
               scope: "redeem_code_flow",
               deps: [lang],
             }
           );
};
