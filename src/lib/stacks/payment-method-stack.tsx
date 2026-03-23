import { useDemandState } from '../state-stack';
import { PaymentMethodModel } from '@/models/payment-method-model';

export const usePaymentMethodModel = (lang: string, scopeKey: string = 'payment_flow') => {
  return useDemandState<PaymentMethodModel[]>(
             [],
             {
               key: "methodsModel",
               persist: true,
               ttl: 3600,
               scope: scopeKey,
               deps: [lang],
             }
           );
};
