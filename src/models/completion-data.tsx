// ---------------- Backend Interface ----------------
export interface BackendPaymentCompletionData {
  link?: string | null;
  code?: string | null;
  bank?: string | null;
  account?: string | null;
  amount?: number | null;
  reference?: string | null;
  note?: string | null;
  expire?: string | null;
}

// ---------------- Frontend Model ----------------
export class PaymentCompletionData {
  link?: string | null;
  code?: string | null;
  bank?: string | null;
  account?: string | null;
  amount?: number | null;
  reference?: string | null;
  note?: string | null;
  expire?: string | null;

  constructor(data?: BackendPaymentCompletionData | null) {
    this.link = data?.link ?? null;
    this.code = data?.code ?? null;
    this.bank = data?.bank ?? null;
    this.account = data?.account ?? null;
    this.amount = data?.amount ?? null;
    this.reference = data?.reference ?? null;
    this.note = data?.note ?? null;
    this.expire = data?.expire ?? null;
  }

  static from(data: any): PaymentCompletionData {
    if (data instanceof PaymentCompletionData) return data;
    return new PaymentCompletionData({
      link: data.link,
      code: data.code,
      bank: data.bank,
      account: data.account,
      amount: data.amount,
      reference: data.reference,
      note: data.note,
      expire: data.expire,
    });
  }

  toBackend(): BackendPaymentCompletionData {
    return {
      link: this.link ?? null,
      code: this.code ?? null,
      bank: this.bank ?? null,
      account: this.account ?? null,
      amount: this.amount ?? null,
      reference: this.reference ?? null,
      note: this.note ?? null,
      expire: this.expire ?? null,
    };
  }

  copyWith(data: Partial<PaymentCompletionData>): PaymentCompletionData {
    return PaymentCompletionData.from({
      ...this,
      ...data,
    });
  }
}
