import { useDemandState } from '@academix-admin/state-stack';
import { TransactionModel } from '@/models/transaction-model';

export const useTransactionModel = (lang: string) => {
  return useDemandState<TransactionModel[]>(
             [],
             {
               key: "transactionModels",
               persist: true,
               ttl: 900, // transaction history: refresh the persisted copy after 15m
               scope: "secondary_flow",
               deps: [lang],
             }
           );
};
