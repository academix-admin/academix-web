// --- Backend Interfaces ---
export interface BackendRewardRedeemCodeModel {
  redeem_code_id: string | null;
  redeem_code_value: string | null;
  redeem_code_expires: string | null;
}

export interface BackendDailyStreaksModel {
  daily_streaks_max: number;
  daily_streaks_date: string;
  daily_streaks_count: number;
  redeem_code_details: BackendRewardRedeemCodeModel | null;
  daily_streaks_status: string;
  daily_streaks_awarded: number;
  daily_streaks_reached: boolean;
  daily_streaks_created_at: string | null;
  daily_streaks_date_number: number;
}

// --- Frontend Interfaces ---
export interface RewardRedeemCodeModel {
  id?: string;
  value?: string;
  expires?: string;
}

export class DailyStreaksModel {
  dailyStreaksDate: string;
  dailyStreaksStatus: string;
  dailyStreaksCreatedAt?: string;
  dailyStreaksDateNumber: number;
  dailyStreaksCount: number;
  dailyStreaksMax: number;
  dailyStreaksAwarded: number;
  dailyStreaksReached: boolean;
  rewardRedeemCodeModel?: RewardRedeemCodeModel;

  constructor(data?: BackendDailyStreaksModel | null) {
    this.dailyStreaksDate = data?.daily_streaks_date ?? "";
    this.dailyStreaksStatus = data?.daily_streaks_status ?? "";
    this.dailyStreaksCreatedAt = data?.daily_streaks_created_at ?? undefined;
    this.dailyStreaksDateNumber = data?.daily_streaks_date_number ?? 0;
    this.dailyStreaksCount = data?.daily_streaks_count ?? 0;
    this.dailyStreaksMax = data?.daily_streaks_max ?? 0;
    this.dailyStreaksAwarded = data?.daily_streaks_awarded ?? 0;
    this.dailyStreaksReached = data?.daily_streaks_reached ?? false;

    const redeem = data?.redeem_code_details;
    this.rewardRedeemCodeModel = redeem
      ? {
          id: redeem.redeem_code_id ?? undefined,
          value: redeem.redeem_code_value ?? undefined,
          expires: redeem.redeem_code_expires ?? undefined,
        }
      : undefined;
  }

  copyWith(data: Partial<DailyStreaksModel>): DailyStreaksModel {
    const backendData: BackendDailyStreaksModel = {
      daily_streaks_date: data.dailyStreaksDate ?? this.dailyStreaksDate,
      daily_streaks_status: data.dailyStreaksStatus ?? this.dailyStreaksStatus,
      daily_streaks_created_at:
        data.dailyStreaksCreatedAt ?? this.dailyStreaksCreatedAt ?? null,
      daily_streaks_date_number:
        data.dailyStreaksDateNumber ?? this.dailyStreaksDateNumber,
      daily_streaks_count: data.dailyStreaksCount ?? this.dailyStreaksCount,
      daily_streaks_max: data.dailyStreaksMax ?? this.dailyStreaksMax,
      daily_streaks_awarded: data.dailyStreaksAwarded ?? this.dailyStreaksAwarded,
      daily_streaks_reached: data.dailyStreaksReached ?? this.dailyStreaksReached,
      redeem_code_details: data.rewardRedeemCodeModel
        ? {
            redeem_code_id: data.rewardRedeemCodeModel.id ?? null,
            redeem_code_value: data.rewardRedeemCodeModel.value ?? null,
            redeem_code_expires: data.rewardRedeemCodeModel.expires ?? null,
          }
        : this.rewardRedeemCodeModel
        ? {
            redeem_code_id: this.rewardRedeemCodeModel.id ?? null,
            redeem_code_value: this.rewardRedeemCodeModel.value ?? null,
            redeem_code_expires: this.rewardRedeemCodeModel.expires ?? null,
          }
        : null,
    };

    return new DailyStreaksModel(backendData);
  }
}
