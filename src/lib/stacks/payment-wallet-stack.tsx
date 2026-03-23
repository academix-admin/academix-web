import { useDemandState } from '../state-stack';
import { PaymentWalletModel } from '@/models/payment-wallet-model';

export const usePaymentWalletModel = (lang: string, scopeKey: string = 'payment_flow') => {
  return useDemandState<PaymentWalletModel[]>(
             [],
             {
               key: "walletsModel",
               persist: true,
               ttl: 3600,
               scope: scopeKey,
               deps: [lang],
             }
           );
};
