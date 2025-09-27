// ========================
// Backend Interfaces
// ========================
export interface BackendRedeemCodeModel {
  redeem_code_id: string;
  redeem_code_amount: number;
  redeem_code_value: string;
  sort_created_id: string;
  redeem_code_expires?: string | null;
  redeem_rule_top: boolean;
  redeem_rule_mid: boolean;
  redeem_rule_bot: boolean;
  redeem_rule_rank1: boolean;
  redeem_rule_rank2: boolean;
  redeem_rule_rank3: boolean;
}

// ========================
// Frontend Model
// ========================
export class RedeemCodeModel {
  redeemCodeId: string;
  redeemCodeAmount: number;
  redeemCodeValue: string;
  sortCreatedId: string;
  redeemCodeExpires?: string | null;
  redeemCodeTop: boolean;
  redeemCodeMid: boolean;
  redeemCodeBot: boolean;
  redeemCodeRank1: boolean;
  redeemCodeRank2: boolean;
  redeemCodeRank3: boolean;

  constructor(data?: BackendRedeemCodeModel | null) {
    this.redeemCodeId = data?.redeem_code_id ?? "";
    this.redeemCodeAmount = data?.redeem_code_amount ?? 0;
    this.redeemCodeValue = data?.redeem_code_value ?? "";
    this.sortCreatedId = data?.sort_created_id ?? "";
    this.redeemCodeExpires = data?.redeem_code_expires ?? null;
    this.redeemCodeTop = data?.redeem_rule_top ?? false;
    this.redeemCodeMid = data?.redeem_rule_mid ?? false;
    this.redeemCodeBot = data?.redeem_rule_bot ?? false;
    this.redeemCodeRank1 = data?.redeem_rule_rank1 ?? false;
    this.redeemCodeRank2 = data?.redeem_rule_rank2 ?? false;
    this.redeemCodeRank3 = data?.redeem_rule_rank3 ?? false;
  }

  static from(data: any): RedeemCodeModel {
    if (data instanceof RedeemCodeModel) return data;
    return new RedeemCodeModel({
      redeem_code_id: data.redeemCodeId,
      redeem_code_amount: data.redeemCodeAmount,
      redeem_code_value: data.redeemCodeValue,
      sort_created_id: data.sortCreatedId,
      redeem_code_expires: data.redeemCodeExpires,
      redeem_rule_top: data.redeemCodeTop,
      redeem_rule_mid: data.redeemCodeMid,
      redeem_rule_bot: data.redeemCodeBot,
      redeem_rule_rank1: data.redeemCodeRank1,
      redeem_rule_rank2: data.redeemCodeRank2,
      redeem_rule_rank3: data.redeemCodeRank3,
    });
  }

  copyWith(data: Partial<RedeemCodeModel>): RedeemCodeModel {
    return RedeemCodeModel.from({
      ...this,
      ...data,
    });
  }

  toBackend(): BackendRedeemCodeModel {
    return {
      redeem_code_id: this.redeemCodeId,
      redeem_code_amount: this.redeemCodeAmount,
      redeem_code_value: this.redeemCodeValue,
      sort_created_id: this.sortCreatedId,
      redeem_code_expires: this.redeemCodeExpires ?? null,
      redeem_rule_top: this.redeemCodeTop,
      redeem_rule_mid: this.redeemCodeMid,
      redeem_rule_bot: this.redeemCodeBot,
      redeem_rule_rank1: this.redeemCodeRank1,
      redeem_rule_rank2: this.redeemCodeRank2,
      redeem_rule_rank3: this.redeemCodeRank3,
    };
  }
}
