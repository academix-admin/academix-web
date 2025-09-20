import { useDemandState } from '../state-stack';
import { TransactionModel } from '@/models/transaction-model';

export const useTransactionModel = (lang: string) => {
  return useDemandState<TransactionModel[]>(
             [],
             {
               key: "transactionModels",
               persist: true,
               ttl: 3600,
               scope: "secondary_flow",
               deps: [lang],
             }
           );
};
