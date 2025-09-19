// ---------------- Backend Interfaces ----------------
export interface BackendPaymentMethodModel {
  sort_created_id: string;
  payment_method_id: string;
  payment_method_identity: string;
  payment_method_image?: string | null;
  payment_method_checker: string;
  payment_method_network: BackendPaymentNetworkModel[];
  country_id: string;
  country_identity: string;
  country_phone_code: string;
  country_phone_digit: number;
  payment_method_sell_multiple: boolean;
  payment_method_buy_multiple: boolean;
  payment_method_sell_active: boolean;
  payment_method_buy_active: boolean;
  payment_wallet_id: string;
}

export interface BackendPaymentNetworkModel {
  identity: string;
  image?: string | null;
  active: boolean;
}

// ---------------- Frontend Models ----------------
export class PaymentNetworkModel {
  identity: string;
  image?: string | null;
  active: boolean;

  constructor(data?: BackendPaymentNetworkModel | null) {
    this.identity = data?.identity ?? "";
    this.image = data?.image ?? null;
    this.active = data?.active ?? false;
  }

  static from(data: any): PaymentNetworkModel {
    if (data instanceof PaymentNetworkModel) return data;
    return new PaymentNetworkModel({
      identity: data.identity,
      image: data.image,
      active: data.active,
    });
  }

  toBackend(): BackendPaymentNetworkModel {
    return {
      identity: this.identity,
      image: this.image ?? null,
      active: this.active,
    };
  }

  copyWith(data: Partial<PaymentNetworkModel>): PaymentNetworkModel {
    return PaymentNetworkModel.from({
      ...this,
      ...data,
    });
  }
}

export class PaymentMethodModel {
  sortCreatedId: string;
  paymentMethodId: string;
  paymentMethodIdentity: string;
  paymentMethodImage?: string | null;
  paymentMethodChecker: string;
  paymentMethodNetwork: PaymentNetworkModel[];
  countryId: string;
  countryIdentity: string;
  countryPhoneCode: string;
  countryPhoneDigits: number;
  paymentMethodSellMultiple: boolean;
  paymentMethodBuyMultiple: boolean;
  paymentMethodSellActive: boolean;
  paymentMethodBuyActive: boolean;
  paymentWalletId: string;

  constructor(data?: BackendPaymentMethodModel | null) {
    this.sortCreatedId = data?.sort_created_id ?? "";
    this.paymentMethodId = data?.payment_method_id ?? "";
    this.paymentMethodIdentity = data?.payment_method_identity ?? "";
    this.paymentMethodImage = data?.payment_method_image ?? null;
    this.paymentMethodChecker = data?.payment_method_checker ?? "";
    this.paymentMethodNetwork =
      data?.payment_method_network?.map((n) => new PaymentNetworkModel(n)) ?? [];
    this.countryId = data?.country_id ?? "";
    this.countryIdentity = data?.country_identity ?? "";
    this.countryPhoneCode = data?.country_phone_code ?? "";
    this.countryPhoneDigits = data?.country_phone_digit ?? 0;
    this.paymentMethodSellMultiple = data?.payment_method_sell_multiple ?? false;
    this.paymentMethodBuyMultiple = data?.payment_method_buy_multiple ?? false;
    this.paymentMethodSellActive = data?.payment_method_sell_active ?? false;
    this.paymentMethodBuyActive = data?.payment_method_buy_active ?? false;
    this.paymentWalletId = data?.payment_wallet_id ?? "";
  }

  static from(data: any): PaymentMethodModel {
    if (data instanceof PaymentMethodModel) return data;
    return new PaymentMethodModel({
      sort_created_id: data.sortCreatedId,
      payment_method_id: data.paymentMethodId,
      payment_method_identity: data.paymentMethodIdentity,
      payment_method_image: data.paymentMethodImage,
      payment_method_checker: data.paymentMethodChecker,
      payment_method_network: data.paymentMethodNetwork?.map((n: any) =>
        PaymentNetworkModel.from(n).toBackend()
      ),
      country_id: data.countryId,
      country_identity: data.countryIdentity,
      country_phone_code: data.countryPhoneCode,
      country_phone_digit: data.countryPhoneDigits,
      payment_method_sell_multiple: data.paymentMethodSellMultiple,
      payment_method_buy_multiple: data.paymentMethodBuyMultiple,
      payment_method_sell_active: data.paymentMethodSellActive,
      payment_method_buy_active: data.paymentMethodBuyActive,
      payment_wallet_id: data.paymentWalletId,
    });
  }

  toBackend(): BackendPaymentMethodModel {
    return {
      sort_created_id: this.sortCreatedId,
      payment_method_id: this.paymentMethodId,
      payment_method_identity: this.paymentMethodIdentity,
      payment_method_image: this.paymentMethodImage ?? null,
      payment_method_checker: this.paymentMethodChecker,
      payment_method_network: this.paymentMethodNetwork.map((n) => n.toBackend()),
      country_id: this.countryId,
      country_identity: this.countryIdentity,
      country_phone_code: this.countryPhoneCode,
      country_phone_digit: this.countryPhoneDigits,
      payment_method_sell_multiple: this.paymentMethodSellMultiple,
      payment_method_buy_multiple: this.paymentMethodBuyMultiple,
      payment_method_sell_active: this.paymentMethodSellActive,
      payment_method_buy_active: this.paymentMethodBuyActive,
      payment_wallet_id: this.paymentWalletId,
    };
  }

  copyWith(data: Partial<PaymentMethodModel>): PaymentMethodModel {
    return PaymentMethodModel.from({
      ...this,
      ...data,
    });
  }
}
