import { useDemandState } from '../state-stack';
import { RedeemCodeModel } from '@/models/redeem-code-model';
import { GiveBackModel } from '@/models/redeem-code-model';

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

export const useGiveBackModel = (lang: string) => {
  return useDemandState<GiveBackModel[]>(
    [],
    {
      key: "giveBacks",
      persist: false,
      scope: "give_back_flow",
      deps: [lang],
    }
  );
};
