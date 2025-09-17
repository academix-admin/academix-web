// Backend Interfaces
export interface BackendAchievementsModel {
  achievements_id: string;
  achievements_type: string;
  reward_details: BackendRewardDetails | null;
  sort_created_id: number;
  achievements_requirement: { count: number };
  achievements_title: string;
  achievements_image?: string | null;
  achievements_progress_details: BackendAchievementsProgressDetails | null;
  achievements_description: string;
}

export interface BackendRewardDetails {
  reward_id: string;
  reward_type: string;
  reward_limit: number;
  reward_value: number;
  reward_instruction: string;
}

export interface BackendAchievementsProgressDetails {
  achievements_progress_id?: string | null;
  achievements_progress_count: number;
  achievements_progress_required: number;
  achievements_progress_rewarded: boolean;
  achievements_progress_completed: boolean;
  achievements_progress_created_at?: string | null;
  achievements_progress_updated_at?: string | null;
  redeem_code_details?: BackendRewardRedeemCodeModel | null;
}

export interface BackendRewardRedeemCodeModel {
  redeem_code_id?: string | null;
  redeem_code_value?: string | null;
  redeem_code_expires?: string | null;
}

export interface BackendRewardClaimModel {
  reward_claim_amount: number;
  reward_claim_redeem_code?: BackendRewardRedeemCodeModel | null;
}

export class AchievementsModel {
  achievementsId: string;
  achievementsType: string;
  rewardDetails: RewardDetails;
  sortCreatedId: number;
  achievementsRequirement: number;
  achievementsTitle: string;
  achievementsImage?: string | null;
  achievementsProgressDetails: AchievementsProgressDetails;
  achievementsDescription: string;

  // Backend constructor
  constructor(data?: BackendAchievementsModel | null) {
    this.achievementsId = data?.achievements_id ?? "";
    this.achievementsType = data?.achievements_type ?? "";
    this.rewardDetails = new RewardDetails(data?.reward_details ?? null);
    this.sortCreatedId = data?.sort_created_id ?? 0;
    this.achievementsRequirement = data?.achievements_requirement?.count ?? 0;
    this.achievementsTitle = data?.achievements_title ?? "";
    this.achievementsImage = data?.achievements_image ?? null;
    this.achievementsProgressDetails = new AchievementsProgressDetails(data?.achievements_progress_details ?? null);
    this.achievementsDescription = data?.achievements_description ?? "";
  }

  // Factory for frontend-plain objects
  static from(data: any): AchievementsModel {
    if (data instanceof AchievementsModel) return data;

    return new AchievementsModel({
      achievements_id: data.achievementsId,
      achievements_type: data.achievementsType,
      reward_details: RewardDetails.from(data.rewardDetails).toBackend(),
      sort_created_id: data.sortCreatedId,
      achievements_requirement: { count: data.achievementsRequirement },
      achievements_title: data.achievementsTitle,
      achievements_image: data.achievementsImage,
      achievements_progress_details: AchievementsProgressDetails.from(data.achievementsProgressDetails).toBackend(),
      achievements_description: data.achievementsDescription,
    });
  }

  copyWith(data: Partial<AchievementsModel>): AchievementsModel {
    return AchievementsModel.from({
      ...this,
      ...data,
    });
  }
}

export class RewardDetails {
  rewardId: string;
  rewardType: string;
  rewardLimit: number;
  rewardValue: number;
  rewardInstruction: string;

  constructor(data?: BackendRewardDetails | null) {
    this.rewardId = data?.reward_id ?? "";
    this.rewardType = data?.reward_type ?? "";
    this.rewardLimit = data?.reward_limit ?? 0;
    this.rewardValue = data?.reward_value ?? 0;
    this.rewardInstruction = data?.reward_instruction ?? "";
  }

  static from(data: any): RewardDetails {
    if (data instanceof RewardDetails) return data;
    return new RewardDetails({
      reward_id: data.rewardId,
      reward_type: data.rewardType,
      reward_limit: data.rewardLimit,
      reward_value: data.rewardValue,
      reward_instruction: data.rewardInstruction,
    });
  }

  toBackend(): BackendRewardDetails {
    return {
      reward_id: this.rewardId,
      reward_type: this.rewardType,
      reward_limit: this.rewardLimit,
      reward_value: this.rewardValue,
      reward_instruction: this.rewardInstruction,
    };
  }
}

export class AchievementsProgressDetails {
  achievementsProgressId?: string | null;
  achievementsProgressCount: number;
  achievementsProgressRequired: number;
  achievementsProgressRewarded: boolean;
  achievementsProgressCompleted: boolean;
  achievementsProgressCreatedAt?: string | null;
  achievementsProgressUpdatedAt?: string | null;
  rewardRedeemCodeModel?: RewardRedeemCodeModel | null;

  constructor(data?: BackendAchievementsProgressDetails | null) {
    this.achievementsProgressId = data?.achievements_progress_id ?? null;
    this.achievementsProgressCount = data?.achievements_progress_count ?? 0;
    this.achievementsProgressRequired = data?.achievements_progress_required ?? 0;
    this.achievementsProgressRewarded = data?.achievements_progress_rewarded ?? false;
    this.achievementsProgressCompleted = data?.achievements_progress_completed ?? false;
    this.achievementsProgressCreatedAt = data?.achievements_progress_created_at ?? null;
    this.achievementsProgressUpdatedAt = data?.achievements_progress_updated_at ?? null;
    this.rewardRedeemCodeModel = data?.redeem_code_details
      ? new RewardRedeemCodeModel(data.redeem_code_details)
      : null;
  }

  static from(data: any): AchievementsProgressDetails {
    if (data instanceof AchievementsProgressDetails) return data;
    return new AchievementsProgressDetails({
      achievements_progress_id: data.achievementsProgressId,
      achievements_progress_count: data.achievementsProgressCount,
      achievements_progress_required: data.achievementsProgressRequired,
      achievements_progress_rewarded: data.achievementsProgressRewarded,
      achievements_progress_completed: data.achievementsProgressCompleted,
      achievements_progress_created_at: data.achievementsProgressCreatedAt,
      achievements_progress_updated_at: data.achievementsProgressUpdatedAt,
      redeem_code_details: RewardRedeemCodeModel.from(data.rewardRedeemCodeModel)?.toBackend(),
    });
  }

  toBackend(): BackendAchievementsProgressDetails {
    return {
      achievements_progress_id: this.achievementsProgressId,
      achievements_progress_count: this.achievementsProgressCount,
      achievements_progress_required: this.achievementsProgressRequired,
      achievements_progress_rewarded: this.achievementsProgressRewarded,
      achievements_progress_completed: this.achievementsProgressCompleted,
      achievements_progress_created_at: this.achievementsProgressCreatedAt,
      achievements_progress_updated_at: this.achievementsProgressUpdatedAt,
      redeem_code_details: this.rewardRedeemCodeModel?.toBackend() ?? null,
    };
  }

   copyWithRewarded(
     achievementsProgressRewarded?: boolean,
     rewardRedeemCodeModel?: RewardRedeemCodeModel | null
   ): AchievementsProgressDetails {
     return AchievementsProgressDetails.from({
       ...this,
       achievementsProgressRewarded: achievementsProgressRewarded ?? this.achievementsProgressRewarded,
       rewardRedeemCodeModel: rewardRedeemCodeModel ?? this.rewardRedeemCodeModel,
     });
   }

}

export class RewardRedeemCodeModel {
  id?: string | null;
  value?: string | null;
  expires?: string | null;

  constructor(data?: BackendRewardRedeemCodeModel | null) {
    this.id = data?.redeem_code_id ?? null;
    this.value = data?.redeem_code_value ?? null;
    this.expires = data?.redeem_code_expires ?? null;
  }

  static from(data: any): RewardRedeemCodeModel | null {
    if (!data) return null;
    if (data instanceof RewardRedeemCodeModel) return data;
    return new RewardRedeemCodeModel({
      redeem_code_id: data.id,
      redeem_code_value: data.value,
      redeem_code_expires: data.expires,
    });
  }

  toBackend(): BackendRewardRedeemCodeModel {
    return {
      redeem_code_id: this.id,
      redeem_code_value: this.value,
      redeem_code_expires: this.expires,
    };
  }
}

export class RewardClaimModel {
  amount: number;
  redeemCode?: RewardRedeemCodeModel | null;

  constructor(data?: BackendRewardClaimModel | null) {
    this.amount = data?.reward_claim_amount ?? 0;
    this.redeemCode = data?.reward_claim_redeem_code
      ? new RewardRedeemCodeModel(data.reward_claim_redeem_code)
      : null;
  }

  static from(data: any): RewardClaimModel {
    if (data instanceof RewardClaimModel) return data;
    return new RewardClaimModel({
      reward_claim_amount: data.amount,
      reward_claim_redeem_code: RewardRedeemCodeModel.from(data.redeemCode)?.toBackend(),
    });
  }

  copyWith(data: Partial<RewardClaimModel>): RewardClaimModel {
    return RewardClaimModel.from({
      ...this,
      ...data,
    });
  }

  toBackend(): BackendRewardClaimModel {
    return {
      reward_claim_amount: this.amount,
      reward_claim_redeem_code: this.redeemCode?.toBackend() ?? null,
    };
  }
}
