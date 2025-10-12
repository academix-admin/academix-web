import { PaymentDetails, BackendPaymentDetails } from '@/models/payment-details';

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
    this.usersNames = data?.users_names ?? '';
    this.paymentDetails = data?.payment_details
      ? new PaymentDetails(data.payment_details)
      : undefined;
  }

  static from(data: any): UserDetails {
    if (data instanceof UserDetails) return data;
    return new UserDetails({
      users_id: data.usersId,
      users_names: data.usersNames,
      payment_details: data.paymentDetails?.toBackend?.() ?? null,
    });
  }

  toBackend(): BackendUserDetails {
    return {
      users_id: this.usersId ?? null,
      users_names: this.usersNames,
      payment_details: this.paymentDetails?.toBackend?.() ?? null,
    };
  }
}

export class PaymentMethodDetails {
  paymentMethodId: string;
  paymentMethodIdentity: string;
  paymentMethodChecker: string;

  constructor(data?: BackendPaymentMethodDetails | null) {
    this.paymentMethodId = data?.payment_method_id ?? '';
    this.paymentMethodIdentity = data?.payment_method_identity ?? '';
    this.paymentMethodChecker = data?.payment_method_checker ?? '';
  }

  static from(data: any): PaymentMethodDetails {
    if (data instanceof PaymentMethodDetails) return data;
    return new PaymentMethodDetails({
      payment_method_id: data.paymentMethodId,
      payment_method_identity: data.paymentMethodIdentity,
      payment_method_checker: data.paymentMethodChecker,
    });
  }

  toBackend(): BackendPaymentMethodDetails {
    return {
      payment_method_id: this.paymentMethodId,
      payment_method_identity: this.paymentMethodIdentity,
      payment_method_checker: this.paymentMethodChecker,
    };
  }
}

export class PaymentWalletDetails {
  paymentWalletId: string;
  paymentWalletIdentity: string;
  paymentWalletCurrency: string;

  constructor(data?: BackendPaymentWalletDetails | null) {
    this.paymentWalletId = data?.payment_wallet_id ?? '';
    this.paymentWalletIdentity = data?.payment_wallet_identity ?? '';
    this.paymentWalletCurrency = data?.payment_wallet_currency ?? '';
  }

  static from(data: any): PaymentWalletDetails {
    if (data instanceof PaymentWalletDetails) return data;
    return new PaymentWalletDetails({
      payment_wallet_id: data.paymentWalletId,
      payment_wallet_identity: data.paymentWalletIdentity,
      payment_wallet_currency: data.paymentWalletCurrency,
    });
  }

  toBackend(): BackendPaymentWalletDetails {
    return {
      payment_wallet_id: this.paymentWalletId,
      payment_wallet_identity: this.paymentWalletIdentity,
      payment_wallet_currency: this.paymentWalletCurrency,
    };
  }
}

export class PaymentProfileDetails {
  userDetails: UserDetails;
  paymentMethodDetails: PaymentMethodDetails;
  paymentWalletDetails: PaymentWalletDetails;

  constructor(data?: BackendPaymentProfileDetails | null) {
    this.userDetails = new UserDetails(data?.users_details);
    this.paymentMethodDetails = new PaymentMethodDetails(data?.payment_method_details);
    this.paymentWalletDetails = new PaymentWalletDetails(data?.payment_wallet_details);
  }

  static from(data: any): PaymentProfileDetails | null {
    if (!data) return null;
    if (data instanceof PaymentProfileDetails) return data;
    return new PaymentProfileDetails({
      users_details: UserDetails.from(data.userDetails).toBackend(),
      payment_method_details: PaymentMethodDetails.from(data.paymentMethodDetails).toBackend(),
      payment_wallet_details: PaymentWalletDetails.from(data.paymentWalletDetails).toBackend(),
    });
  }

  toBackend(): BackendPaymentProfileDetails {
    return {
      users_details: this.userDetails.toBackend(),
      payment_method_details: this.paymentMethodDetails.toBackend(),
      payment_wallet_details: this.paymentWalletDetails.toBackend(),
    };
  }
}

// --- TransactionModel ---
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
    this.transactionId = data?.transaction_id ?? '';
    this.poolsId = data?.pools_id ?? undefined;
    this.transactionCreatedAt = data?.transaction_created_at ?? '';
    this.sortCreatedId = data?.sort_created_id ?? '';
    this.transactionType = data?.transaction_type ?? '';
    this.transactionSenderStatus = data?.transaction_sender_status ?? '';
    this.transactionReceiverStatus = data?.transaction_receiver_status ?? '';
    this.transactionSenderReference = data?.transaction_sender_reference ?? '';
    this.paymentProfileSenderDetails = data?.payment_profile_sender_details
      ? new PaymentProfileDetails(data.payment_profile_sender_details)
      : undefined;
    this.paymentProfileReceiverDetails = data?.payment_profile_receiver_details
      ? new PaymentProfileDetails(data.payment_profile_receiver_details)
      : undefined;
  }

  /** ✅ Factory for frontend data conversion */
  static from(data: any): TransactionModel {
    if (data instanceof TransactionModel) return data;
    return new TransactionModel({
      pools_id: data.poolsId ?? null,
      transaction_id: data.transactionId ?? '',
      sort_created_id: data.sortCreatedId ?? '',
      transaction_fee: data.transactionFee ?? 0,
      transaction_type: data.transactionType ?? '',
      transaction_created_at: data.transactionCreatedAt ?? '',
      transaction_sender_rate: data.transactionSenderRate ?? 0,
      transaction_receiver_rate: data.transactionReceiverRate ?? 0,
      transaction_sender_amount: data.transactionSenderAmount ?? 0,
      transaction_sender_status: data.transactionSenderStatus ?? '',
      transaction_receiver_amount: data.transactionReceiverAmount ?? 0,
      transaction_receiver_status: data.transactionReceiverStatus ?? '',
      transaction_sender_reference: data.transactionSenderReference ?? '',
      payment_profile_sender_details: PaymentProfileDetails.from(data.paymentProfileSenderDetails)?.toBackend() ?? null,
      payment_profile_receiver_details: PaymentProfileDetails.from(data.paymentProfileReceiverDetails)?.toBackend() ?? null,
    });
  }

  static fromStream(data: BackendTransactionModel | null): TransactionModel {
    return new TransactionModel({
      pools_id: data?.pools_id ?? null,
      transaction_id: data?.transaction_id ?? '',
      sort_created_id: data?.sort_created_id ?? '',
      transaction_fee: data?.transaction_fee ?? 0,
      transaction_type: data?.transaction_type ?? '',
      transaction_created_at: data?.transaction_created_at ?? '',
      transaction_sender_rate: data?.transaction_sender_rate ?? 0,
      transaction_receiver_rate: data?.transaction_receiver_rate ?? 0,
      transaction_sender_amount: data?.transaction_sender_amount ?? 0,
      transaction_sender_status: data?.transaction_sender_status ?? '',
      transaction_receiver_amount: data?.transaction_receiver_amount ?? 0,
      transaction_receiver_status: data?.transaction_receiver_status ?? '',
      transaction_sender_reference: data?.transaction_sender_reference ?? '',
      payment_profile_sender_details: null,
      payment_profile_receiver_details: null,
    });
  }

  copyWith(data: Partial<TransactionModel>): TransactionModel {
    return TransactionModel.from({
      ...this,
      ...data,
    });
  }
}
