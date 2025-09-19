import { useDemandState } from '../state-stack';
import { PaymentProfileModel } from '@/models/payment-profile-model';

export const usePaymentProfileModel = (lang: string) => {
  return useDemandState<PaymentProfileModel[]>(
             [],
             {
               key: "profilesModel",
               persist: true,
               ttl: 3600,
               scope: "payment_flow",
               deps: [lang],
             }
           );
};
