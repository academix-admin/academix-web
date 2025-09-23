// ---------------- Backend Interface ----------------
export interface BackendPaymentDetails {
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  network?: string | null;
  fullname?: string | null;
  private_account?: boolean | null;
  e_naira?: boolean | null;
  direct_debit?: boolean | null;
  opay?: boolean | null;
  bank_name?: string | null;
  account_number?: string | null;
}

// ---------------- Frontend Model ----------------
export class PaymentDetails {
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  network?: string | null;
  fullname?: string | null;
  privateAccount?: boolean | null;
  eNaira?: boolean | null;
  directDebit?: boolean | null;
  opay?: boolean | null;
  bankName?: string | null;
  accountNumber?: string | null;

  constructor(data?: BackendPaymentDetails | null) {
    this.email = data?.email ?? null;
    this.phone = data?.phone ?? null;
    this.country = data?.country ?? null;
    this.network = data?.network ?? null;
    this.fullname = data?.fullname ?? null;
    this.privateAccount = data?.private_account ?? null;
    this.eNaira = data?.e_naira ?? null;
    this.directDebit = data?.direct_debit ?? null;
    this.opay = data?.opay ?? null;
    this.bankName = data?.bank_name ?? null;
    this.accountNumber = data?.account_number ?? null;
  }

  static from(data: any): PaymentDetails {
    if (data instanceof PaymentDetails) return data;
    return new PaymentDetails({
      email: data.email,
      phone: data.phone,
      country: data.country,
      network: data.network,
      fullname: data.fullname,
      private_account: data.privateAccount,
      e_naira: data.eNaira,
      direct_debit: data.directDebit,
      opay: data.opay,
      bank_name: data.bankName,
      account_number: data.accountNumber,
    });
  }

  toBackend(): BackendPaymentDetails {
    return {
      email: this.email ?? null,
      phone: this.phone ?? null,
      country: this.country ?? null,
      network: this.network ?? null,
      fullname: this.fullname ?? null,
      private_account: this.privateAccount ?? null,
      e_naira: this.eNaira ?? null,
      direct_debit: this.directDebit ?? null,
      opay: this.opay ?? null,
      bank_name: this.bankName ?? null,
      account_number: this.accountNumber ?? null,
    };
  }

  toJson(): Record<any, any> {
    return {
      email: this.email ?? null,
      phone: this.phone ?? null,
      country: this.country ?? null,
      network: this.network ?? null,
      fullname: this.fullname ?? null,
      private_account: this.privateAccount ?? null,
      eNaira: this.eNaira ?? null,
      directDebit: this.directDebit ?? null,
      opay: this.opay ?? null,
      bankName: this.bankName ?? null,
      accountNumber: this.accountNumber ?? null,
    };
  }

  copyWith(data: Partial<PaymentDetails>): PaymentDetails {
    return PaymentDetails.from({
      ...this,
      ...data,
    });
  }
}
