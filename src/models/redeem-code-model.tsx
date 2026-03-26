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

// ========================
// GiveBack Backend Interface
// ========================
export interface BackendGiveBackDetail {
  giveback_id: string;
  giveback_code: string;
  giveback_unit_amount: number;
  giveback_total_usage: number;
  giveback_total_amount: number;
  giveback_identifier: string | null;
  remaining_slots: number;
  claimed_count: number;
  sort_created_id: string;
  redeem_rule_top: boolean;
  redeem_rule_mid: boolean;
  redeem_rule_bot: boolean;
  redeem_rule_rank1: boolean;
  redeem_rule_rank2: boolean;
  redeem_rule_rank3: boolean;
}

export interface BackendGiveBackCollectionDetails {
  has_claimed: boolean;
  redeem_code_value: string | null;
  is_spent: boolean;
  remaining_slots: number;
  can_claim: boolean;
  has_password: boolean;
}

export interface BackendGiveBackModel {
  giveback_detail: BackendGiveBackDetail;
  giveback_collection_details: BackendGiveBackCollectionDetails | null;
}

// ========================
// GiveBack Frontend Model
// ========================
export class GiveBackModel {
  giveBackId: string;
  giveBackCode: string;
  giveBackAmount: number;
  giveBackTotalUsage: number;
  giveBackTotalAmount: number;
  giveBackIdentifier: string | null;
  remainingSlots: number;
  claimedCount: number;
  sortCreatedId: string;
  giveBackTop: boolean;
  giveBackMid: boolean;
  giveBackBot: boolean;
  giveBackRank1: boolean;
  giveBackRank2: boolean;
  giveBackRank3: boolean;
  // collection details
  hasClaimed: boolean;
  redeemCodeValue: string | null;
  isSpent: boolean;
  canClaim: boolean;
  hasPassword: boolean;

  // derived — used by old card code
  get giveBackValue(): string { return this.redeemCodeValue ?? this.giveBackCode; }
  get giveBackExpires(): string | null { return null; }

  constructor(data?: BackendGiveBackModel | null) {
    const d = data?.giveback_detail;
    const c = data?.giveback_collection_details;
    this.giveBackId = d?.giveback_id ?? "";
    this.giveBackCode = d?.giveback_code ?? "";
    this.giveBackAmount = d?.giveback_unit_amount ?? 0;
    this.giveBackTotalUsage = d?.giveback_total_usage ?? 0;
    this.giveBackTotalAmount = d?.giveback_total_amount ?? 0;
    this.giveBackIdentifier = d?.giveback_identifier ?? null;
    this.remainingSlots = d?.remaining_slots ?? 0;
    this.claimedCount = d?.claimed_count ?? 0;
    this.sortCreatedId = d?.sort_created_id ?? "";
    this.giveBackTop = d?.redeem_rule_top ?? false;
    this.giveBackMid = d?.redeem_rule_mid ?? false;
    this.giveBackBot = d?.redeem_rule_bot ?? false;
    this.giveBackRank1 = d?.redeem_rule_rank1 ?? false;
    this.giveBackRank2 = d?.redeem_rule_rank2 ?? false;
    this.giveBackRank3 = d?.redeem_rule_rank3 ?? false;
    this.hasClaimed = c?.has_claimed ?? false;
    this.redeemCodeValue = c?.redeem_code_value ?? null;
    this.isSpent = c?.is_spent ?? false;
    this.canClaim = c?.can_claim ?? true;
    this.hasPassword = c?.has_password ?? false;
  }

  static from(data: any): GiveBackModel {
    if (data instanceof GiveBackModel) return data;
    return new GiveBackModel({
      giveback_detail: {
        giveback_id: data.giveBackId,
        giveback_code: data.giveBackCode,
        giveback_unit_amount: data.giveBackAmount,
        giveback_total_usage: data.giveBackTotalUsage,
        giveback_total_amount: data.giveBackTotalAmount,
        giveback_identifier: data.giveBackIdentifier,
        remaining_slots: data.remainingSlots,
        claimed_count: data.claimedCount,
        sort_created_id: data.sortCreatedId,
        redeem_rule_top: data.giveBackTop,
        redeem_rule_mid: data.giveBackMid,
        redeem_rule_bot: data.giveBackBot,
        redeem_rule_rank1: data.giveBackRank1,
        redeem_rule_rank2: data.giveBackRank2,
        redeem_rule_rank3: data.giveBackRank3,
      },
      giveback_collection_details: {
        has_claimed: data.hasClaimed,
        redeem_code_value: data.redeemCodeValue,
        is_spent: data.isSpent,
        remaining_slots: data.remainingSlots,
        can_claim: data.canClaim,
        has_password: data.hasPassword,
      },
    });
  }

  copyWith(data: Partial<GiveBackModel>): GiveBackModel {
    return GiveBackModel.from({ ...this, ...data });
  }
}
