import { PaymentDetails } from '@/models/payment-details';
import { BackendPaymentDetails } from '@/models/payment-details';

// --- Backend Interfaces ---
export interface BackendTransactionModel {
  pools_id: string | null;
  transaction_id: string;
  sort_created_id: string;
  transaction_fee: number;
  transaction_type: string;
  transaction_created_at: string;
  transaction_sender_rate: number;
  transaction_receiver_rate: number;
  transaction_sender_amount: number;
  transaction_sender_status: string;
  transaction_receiver_amount: number;
  transaction_receiver_status: string;
  transaction_sender_reference: string;
  payment_profile_sender_details: BackendPaymentProfileDetails | null;
  payment_profile_receiver_details: BackendPaymentProfileDetails | null;
}

export interface BackendPaymentProfileDetails {
  users_details: BackendUserDetails;
  payment_method_details: BackendPaymentMethodDetails;
  payment_wallet_details: BackendPaymentWalletDetails;
}

export interface BackendPaymentMethodDetails {
  payment_method_id: string;
  payment_method_identity: string;
  payment_method_checker: string;
}

export interface BackendPaymentWalletDetails {
  payment_wallet_id: string;
  payment_wallet_identity: string;
  payment_wallet_currency: string;
}

export interface BackendUserDetails {
  users_id: string | null;
  users_names: string;
  payment_details: BackendPaymentDetails | null;
}

// --- Frontend Models ---
export class UserDetails {
  usersId?: string;
  usersNames: string;
  paymentDetails?: PaymentDetails;

  constructor(data?: BackendUserDetails | null) {
    this.usersId = data?.users_id ?? undefined;
    this.usersNames = data?.users_names ?? "";
    this.paymentDetails = data?.payment_details
      ? new PaymentDetails(data.payment_details)
      : undefined;
  }
}

export class PaymentMethodDetails {
  paymentMethodId: string;
  paymentMethodIdentity: string;
  paymentMethodChecker: string;

  constructor(data?: BackendPaymentMethodDetails | null) {
    this.paymentMethodId = data?.payment_method_id ?? "";
    this.paymentMethodIdentity = data?.payment_method_identity ?? "";
    this.paymentMethodChecker = data?.payment_method_checker ?? "";
  }
}

export class PaymentWalletDetails {
  paymentWalletId: string;
  paymentWalletIdentity: string;
  paymentWalletCurrency: string;

  constructor(data?: BackendPaymentWalletDetails | null) {
    this.paymentWalletId = data?.payment_wallet_id ?? "";
    this.paymentWalletIdentity = data?.payment_wallet_identity ?? "";
    this.paymentWalletCurrency = data?.payment_wallet_currency ?? "";
  }
}

export class PaymentProfileDetails {
  userDetails: UserDetails;
  paymentMethodDetails: PaymentMethodDetails;
  paymentWalletDetails: PaymentWalletDetails;

  constructor(data?: BackendPaymentProfileDetails | null) {
    this.userDetails = new UserDetails(data?.users_details);
    this.paymentMethodDetails = new PaymentMethodDetails(
      data?.payment_method_details
    );
    this.paymentWalletDetails = new PaymentWalletDetails(
      data?.payment_wallet_details
    );
  }
}

export class TransactionModel {
  transactionFee: number;
  transactionSenderRate: number;
  transactionReceiverRate: number;
  transactionSenderAmount: number;
  transactionReceiverAmount: number;
  transactionId: string;
  poolsId?: string;
  transactionCreatedAt: string;
  sortCreatedId: string;
  transactionType: string;
  transactionSenderStatus: string;
  transactionReceiverStatus: string;
  transactionSenderReference: string;
  paymentProfileSenderDetails?: PaymentProfileDetails;
  paymentProfileReceiverDetails?: PaymentProfileDetails;

  constructor(data?: BackendTransactionModel | null) {
    this.transactionFee = data?.transaction_fee ?? 0;
    this.transactionSenderRate = data?.transaction_sender_rate ?? 0;
    this.transactionReceiverRate = data?.transaction_receiver_rate ?? 0;
    this.transactionSenderAmount = data?.transaction_sender_amount ?? 0;
    this.transactionReceiverAmount = data?.transaction_receiver_amount ?? 0;
    this.transactionId = data?.transaction_id ?? "";
    this.poolsId = data?.pools_id ?? undefined;
    this.transactionCreatedAt = data?.transaction_created_at ?? "";
    this.sortCreatedId = data?.sort_created_id ?? "";
    this.transactionType = data?.transaction_type ?? "";
    this.transactionSenderStatus = data?.transaction_sender_status ?? "";
    this.transactionReceiverStatus = data?.transaction_receiver_status ?? "";
    this.transactionSenderReference = data?.transaction_sender_reference ?? "";
    this.paymentProfileSenderDetails = data?.payment_profile_sender_details
      ? new PaymentProfileDetails(data.payment_profile_sender_details)
      : undefined;
    this.paymentProfileReceiverDetails = data?.payment_profile_receiver_details
      ? new PaymentProfileDetails(data.payment_profile_receiver_details)
      : undefined;
  }
}
