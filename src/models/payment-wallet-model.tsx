// // ---------------- Backend Interfaces ----------------
// export interface BackendBuyPaymentWalletModel {
//   sort_created_id: string;
//   payment_wallet_id: string;
//   payment_wallet_image?: string | null;
//   payment_wallet_buy_fee: number;
//   payment_wallet_buy_min: number;
//   payment_wallet_buy_rate: number;
//   payment_wallet_currency: string;
//   payment_wallet_identity: string;
//   payment_wallet_buy_rate_type: string;
// }
//
// export interface BackendSellPaymentWalletModel {
//   sort_created_id: string;
//   payment_wallet_id: string;
//   payment_wallet_image?: string | null;
//   payment_wallet_sell_fee: number;
//   payment_wallet_sell_min: number;
//   payment_wallet_sell_rate: number;
//   payment_wallet_currency: string;
//   payment_wallet_identity: string;
//   payment_wallet_sell_rate_type: string;
// }
//
// // ---------------- Frontend Model ----------------
// export class PaymentWalletModel {
//   paymentWalletId: string;
//   sortCreatedId: string;
//   paymentWalletMin: number;
//   paymentWalletRate: number;
//   paymentWalletCurrency: string;
//   paymentWalletIdentity: string;
//   paymentWalletImage?: string | null;
//   paymentWalletType: string;
//   paymentWalletRateType: string;
//   paymentWalletFee: number;
//
//   constructor(
//     paymentWalletType: string,
//     data?: BackendBuyPaymentWalletModel | BackendSellPaymentWalletModel | null
//   ) {
//     this.paymentWalletId = data?.payment_wallet_id ?? "";
//     this.sortCreatedId = data?.sort_created_id ?? "";
//     this.paymentWalletMin = paymentWalletType === 'PaymentType.BUY' ? (data?.payment_wallet_buy_min ?? 0) : (data?.payment_wallet_sell_min ?? 0);
//     this.paymentWalletRate = paymentWalletType === 'PaymentType.BUY' ? (data?.payment_wallet_buy_rate ?? 0) : (data?.payment_wallet_sell_rate ?? 0);
//     this.paymentWalletCurrency = data?.payment_wallet_currency ?? "";
//     this.paymentWalletIdentity = data?.payment_wallet_identity ?? "";
//     this.paymentWalletImage = data?.payment_wallet_image ?? null;
//     this.paymentWalletType = paymentWalletType; // <-- injected
//     this.paymentWalletRateType = paymentWalletType === 'PaymentType.BUY' ? (data?.payment_wallet_buy_rate_type ?? "") : (data?.payment_wallet_sell_rate_type ?? "");
//     this.paymentWalletFee = paymentWalletType === 'PaymentType.BUY' ? (data?.payment_wallet_buy_fee ?? 0) : (data?.payment_wallet_sell_fee ?? 0);
//   }
//
//   // Factory: convert frontend object → PaymentWalletModel
//   static from(data: any): PaymentWalletModel {
//     if (data instanceof PaymentWalletModel) return data;
//     return new PaymentWalletModel(
//       data.paymentWalletType,
//       {
//         sort_created_id: data.sortCreatedId,
//         payment_wallet_id: data.paymentWalletId,
//         payment_wallet_image: data.paymentWalletImage,
//         payment_wallet_buy_fee: data.paymentWalletFee,
//         payment_wallet_buy_min: data.paymentWalletMin,
//         payment_wallet_buy_rate: data.paymentWalletRate,
//         payment_wallet_currency: data.paymentWalletCurrency,
//         payment_wallet_identity: data.paymentWalletIdentity,
//         payment_wallet_buy_rate_type: data.paymentWalletRateType,
//       }
//     );
//   }
//
//   // Serialize → backend format (no type, since it's frontend-only)
//   toBuyBackend(): BackendBuyPaymentWalletModel {
//     return {
//       sort_created_id: this.sortCreatedId,
//       payment_wallet_id: this.paymentWalletId,
//       payment_wallet_image: this.paymentWalletImage ?? null,
//       payment_wallet_buy_fee: this.paymentWalletFee,
//       payment_wallet_buy_min: this.paymentWalletMin,
//       payment_wallet_buy_rate: this.paymentWalletRate,
//       payment_wallet_currency: this.paymentWalletCurrency,
//       payment_wallet_identity: this.paymentWalletIdentity,
//       payment_wallet_buy_rate_type: this.paymentWalletRateType,
//     };
//   }
//
//   toSellBackend(): BackendBuyPaymentWalletModel {
//     return {
//       sort_created_id: this.sortCreatedId,
//       payment_wallet_id: this.paymentWalletId,
//       payment_wallet_image: this.paymentWalletImage ?? null,
//       payment_wallet_sell_fee: this.paymentWalletFee,
//       payment_wallet_sell_min: this.paymentWalletMin,
//       payment_wallet_sell_rate: this.paymentWalletRate,
//       payment_wallet_currency: this.paymentWalletCurrency,
//       payment_wallet_identity: this.paymentWalletIdentity,
//       payment_wallet_sell_rate_type: this.paymentWalletRateType,
//     };
//   }
//
//   // Immutable updates
//   copyWith(data: Partial<PaymentWalletModel>): PaymentWalletModel {
//     return PaymentWalletModel.from({
//       ...this,
//       ...data,
//     });
//   }
// }
// ---------------- Backend Interfaces ----------------
export interface BackendBuyPaymentWalletModel {
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

export interface BackendSellPaymentWalletModel {
  sort_created_id: string;
  payment_wallet_id: string;
  payment_wallet_image?: string | null;
  payment_wallet_sell_fee: number;
  payment_wallet_sell_min: number;
  payment_wallet_sell_rate: number;
  payment_wallet_currency: string;
  payment_wallet_identity: string;
  payment_wallet_sell_rate_type: string;
}

// Type guard functions
function isBuyPaymentWalletModel(data: any): data is BackendBuyPaymentWalletModel {
  return data && 'payment_wallet_buy_min' in data;
}

function isSellPaymentWalletModel(data: any): data is BackendSellPaymentWalletModel {
  return data && 'payment_wallet_sell_min' in data;
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
    data?: BackendBuyPaymentWalletModel | BackendSellPaymentWalletModel | null
  ) {
    this.paymentWalletId = data?.payment_wallet_id ?? "";
    this.sortCreatedId = data?.sort_created_id ?? "";

    // Use type guards to safely access properties
    if (paymentWalletType === 'PaymentType.BUY' && isBuyPaymentWalletModel(data)) {
      this.paymentWalletMin = data?.payment_wallet_buy_min ?? 0;
      this.paymentWalletRate = data?.payment_wallet_buy_rate ?? 0;
      this.paymentWalletRateType = data?.payment_wallet_buy_rate_type ?? "";
      this.paymentWalletFee = data?.payment_wallet_buy_fee ?? 0;
    } else if (isSellPaymentWalletModel(data)) {
      this.paymentWalletMin = data?.payment_wallet_sell_min ?? 0;
      this.paymentWalletRate = data?.payment_wallet_sell_rate ?? 0;
      this.paymentWalletRateType = data?.payment_wallet_sell_rate_type ?? "";
      this.paymentWalletFee = data?.payment_wallet_sell_fee ?? 0;
    } else {
      // Default values if data is null or undefined
      this.paymentWalletMin = 0;
      this.paymentWalletRate = 0;
      this.paymentWalletRateType = "";
      this.paymentWalletFee = 0;
    }

    this.paymentWalletCurrency = data?.payment_wallet_currency ?? "";
    this.paymentWalletIdentity = data?.payment_wallet_identity ?? "";
    this.paymentWalletImage = data?.payment_wallet_image ?? null;
    this.paymentWalletType = paymentWalletType;
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

  // Serialize → backend format
  toBuyBackend(): BackendBuyPaymentWalletModel {
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

  toSellBackend(): BackendSellPaymentWalletModel {
    return {
      sort_created_id: this.sortCreatedId,
      payment_wallet_id: this.paymentWalletId,
      payment_wallet_image: this.paymentWalletImage ?? null,
      payment_wallet_sell_fee: this.paymentWalletFee,
      payment_wallet_sell_min: this.paymentWalletMin,
      payment_wallet_sell_rate: this.paymentWalletRate,
      payment_wallet_currency: this.paymentWalletCurrency,
      payment_wallet_identity: this.paymentWalletIdentity,
      payment_wallet_sell_rate_type: this.paymentWalletRateType,
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