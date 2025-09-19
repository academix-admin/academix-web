import { useDemandState } from '../state-stack';
import { PaymentMethodModel } from '@/models/payment-method-model';

export const usePaymentMethodModel = (lang: string) => {
  return useDemandState<PaymentMethodModel[]>(
             [],
             {
               key: "methodsModel",
               persist: true,
               ttl: 3600,
               scope: "payment_flow",
               deps: [lang],
             }
           );
};
