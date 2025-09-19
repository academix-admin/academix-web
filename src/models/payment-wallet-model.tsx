// ---------------- Backend Interfaces ----------------
export interface BackendPaymentWalletModel {
  sort_created_id: string;
  payment_wallet_id: string;
  payment_wallet_image?: string | null;
  payment_wallet_buy_fee: number;
  payment_wallet_buy_min: number;
  payment_wallet_buy_rate: number;
  payment_wallet_currency: string;
  payment_wallet_identity: string;
  payment_wallet_buy_rate_type: string;
}

// ---------------- Frontend Model ----------------
export class PaymentWalletModel {
  paymentWalletId: string;
  sortCreatedId: string;
  paymentWalletMin: number;
  paymentWalletRate: number;
  paymentWalletCurrency: string;
  paymentWalletIdentity: string;
  paymentWalletImage?: string | null;
  paymentWalletType: string;
  paymentWalletRateType: string;
  paymentWalletFee: number;

  constructor(
    paymentWalletType: string,
    data?: BackendPaymentWalletModel | null
  ) {
    this.paymentWalletId = data?.payment_wallet_id ?? "";
    this.sortCreatedId = data?.sort_created_id ?? "";
    this.paymentWalletMin = data?.payment_wallet_buy_min ?? 0;
    this.paymentWalletRate = data?.payment_wallet_buy_rate ?? 0;
    this.paymentWalletCurrency = data?.payment_wallet_currency ?? "";
    this.paymentWalletIdentity = data?.payment_wallet_identity ?? "";
    this.paymentWalletImage = data?.payment_wallet_image ?? null;
    this.paymentWalletType = paymentWalletType; // <-- injected
    this.paymentWalletRateType = data?.payment_wallet_buy_rate_type ?? "";
    this.paymentWalletFee = data?.payment_wallet_buy_fee ?? 0;
  }

  // Factory: convert frontend object → PaymentWalletModel
  static from(data: any): PaymentWalletModel {
    if (data instanceof PaymentWalletModel) return data;
    return new PaymentWalletModel(
      data.paymentWalletType,
      {
        sort_created_id: data.sortCreatedId,
        payment_wallet_id: data.paymentWalletId,
        payment_wallet_image: data.paymentWalletImage,
        payment_wallet_buy_fee: data.paymentWalletFee,
        payment_wallet_buy_min: data.paymentWalletMin,
        payment_wallet_buy_rate: data.paymentWalletRate,
        payment_wallet_currency: data.paymentWalletCurrency,
        payment_wallet_identity: data.paymentWalletIdentity,
        payment_wallet_buy_rate_type: data.paymentWalletRateType,
      }
    );
  }

  // Serialize → backend format (no type, since it's frontend-only)
  toBackend(): BackendPaymentWalletModel {
    return {
      sort_created_id: this.sortCreatedId,
      payment_wallet_id: this.paymentWalletId,
      payment_wallet_image: this.paymentWalletImage ?? null,
      payment_wallet_buy_fee: this.paymentWalletFee,
      payment_wallet_buy_min: this.paymentWalletMin,
      payment_wallet_buy_rate: this.paymentWalletRate,
      payment_wallet_currency: this.paymentWalletCurrency,
      payment_wallet_identity: this.paymentWalletIdentity,
      payment_wallet_buy_rate_type: this.paymentWalletRateType,
    };
  }

  // Immutable updates
  copyWith(data: Partial<PaymentWalletModel>): PaymentWalletModel {
    return PaymentWalletModel.from({
      ...this,
      ...data,
    });
  }
}
