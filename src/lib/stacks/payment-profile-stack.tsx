import { useDemandState } from '@academix-admin/state-stack';
import { PaymentProfileModel } from '@/models/payment-profile-model';

export const usePaymentProfileModel = (lang: string, scopeKey: string = 'payment_flow') => {
  return useDemandState<PaymentProfileModel[]>(
             [],
             {
               key: "profilesModel",
               persist: true,
               scope: scopeKey,
               deps: [lang],
             }
           );
};
