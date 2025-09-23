export class ProfileModel {
  phone?: string | null;
  network?: string | null;
  fullname?: string | null;
  privateAccount?: boolean | null;
  eNaira?: boolean | null;
  directDebit?: boolean | null;
  opay?: boolean | null;
  bankCode?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;

  constructor(data?: Record<string, any> | null) {
    this.phone = data?.phone ?? null;
    this.network = data?.network ?? null;
    this.fullname = data?.fullname ?? null;
    this.privateAccount = data?.privateAccount ?? null;
    this.eNaira = data?.eNaira ?? null;
    this.directDebit = data?.directDebit ?? null;
    this.opay = data?.opay ?? null;
    this.bankCode = data?.bankCode ?? null;
    this.bankName = data?.bankName ?? null;
    this.accountNumber = data?.accountNumber ?? null;
  }

  static from(data: any): ProfileModel {
    if (data instanceof ProfileModel) return data;
    return new ProfileModel({
      phone: data.phone,
      network: data.network,
      fullname: data.fullname,
      privateAccount: data.privateAccount,
      eNaira: data.eNaira,
      directDebit: data.directDebit,
      opay: data.opay,
      bankCode: data.bankCode,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
    });
  }

  toJson(): Record<any, any> {
    return {
      phone: this.phone ?? null,
      network: this.network ?? null,
      fullname: this.fullname ?? null,
      private_account: this.privateAccount ?? null,
      e_naira: this.eNaira ?? null,
      direct_debit: this.directDebit ?? null,
      opay: this.opay ?? null,
      bank_code: this.bankCode ?? null,
      bank_name: this.bankName ?? null,
      account_number: this.accountNumber ?? null,
    };
  }

  copyWith(data: Partial<ProfileModel>): ProfileModel {
    return ProfileModel.from({
      ...this,
      ...data,
    });
  }
}
