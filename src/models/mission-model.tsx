// Backend Interfaces
export interface BackendMissionModel {
  mission_id: string;
  mission_type: string;
  reward_details: BackendRewardDetails | null;
  sort_created_id: number;
  mission_requirement: { count: number };
  mission_title: string;
  mission_image?: string | null;
  mission_progress_details: BackendMissionProgressDetails | null;
  mission_description: string;
}

export interface BackendRewardDetails {
  reward_id: string;
  reward_type: string;
  reward_limit: number;
  reward_value: number;
  reward_instruction: string;
}

export interface BackendMissionProgressDetails {
  mission_progress_id?: string | null;
  mission_progress_count: number;
  mission_progress_required: number;
  mission_progress_rewarded: boolean;
  mission_progress_completed: boolean;
  mission_progress_created_at?: string | null;
  mission_progress_updated_at?: string | null;
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

export class MissionModel {
  missionId: string;
  missionType: string;
  rewardDetails: RewardDetails;
  sortCreatedId: number;
  missionRequirement: number;
  missionTitle: string;
  missionImage?: string | null;
  missionProgressDetails: MissionProgressDetails;
  missionDescription: string;

  // Backend constructor
  constructor(data?: BackendMissionModel | null) {
    this.missionId = data?.mission_id ?? "";
    this.missionType = data?.mission_type ?? "";
    this.rewardDetails = new RewardDetails(data?.reward_details ?? null);
    this.sortCreatedId = data?.sort_created_id ?? 0;
    this.missionRequirement = data?.mission_requirement?.count ?? 0;
    this.missionTitle = data?.mission_title ?? "";
    this.missionImage = data?.mission_image ?? null;
    this.missionProgressDetails = new MissionProgressDetails(data?.mission_progress_details ?? null);
    this.missionDescription = data?.mission_description ?? "";
  }

  // Factory for frontend-plain objects
  static from(data: any): MissionModel {
    if (data instanceof MissionModel) return data;

    return new MissionModel({
      mission_id: data.missionId,
      mission_type: data.missionType,
      reward_details: RewardDetails.from(data.rewardDetails).toBackend(),
      sort_created_id: data.sortCreatedId,
      mission_requirement: { count: data.missionRequirement },
      mission_title: data.missionTitle,
      mission_image: data.missionImage,
      mission_progress_details: MissionProgressDetails.from(data.missionProgressDetails).toBackend(),
      mission_description: data.missionDescription,
    });
  }

  copyWith(data: Partial<MissionModel>): MissionModel {
    return MissionModel.from({
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

export class MissionProgressDetails {
  missionProgressId?: string | null;
  missionProgressCount: number;
  missionProgressRequired: number;
  missionProgressRewarded: boolean;
  missionProgressCompleted: boolean;
  missionProgressCreatedAt?: string | null;
  missionProgressUpdatedAt?: string | null;
  rewardRedeemCodeModel?: RewardRedeemCodeModel | null;

  constructor(data?: BackendMissionProgressDetails | null) {
    this.missionProgressId = data?.mission_progress_id ?? null;
    this.missionProgressCount = data?.mission_progress_count ?? 0;
    this.missionProgressRequired = data?.mission_progress_required ?? 0;
    this.missionProgressRewarded = data?.mission_progress_rewarded ?? false;
    this.missionProgressCompleted = data?.mission_progress_completed ?? false;
    this.missionProgressCreatedAt = data?.mission_progress_created_at ?? null;
    this.missionProgressUpdatedAt = data?.mission_progress_updated_at ?? null;
    this.rewardRedeemCodeModel = data?.redeem_code_details
      ? new RewardRedeemCodeModel(data.redeem_code_details)
      : null;
  }

  static from(data: any): MissionProgressDetails {
    if (data instanceof MissionProgressDetails) return data;
    return new MissionProgressDetails({
      mission_progress_id: data.missionProgressId,
      mission_progress_count: data.missionProgressCount,
      mission_progress_required: data.missionProgressRequired,
      mission_progress_rewarded: data.missionProgressRewarded,
      mission_progress_completed: data.missionProgressCompleted,
      mission_progress_created_at: data.missionProgressCreatedAt,
      mission_progress_updated_at: data.missionProgressUpdatedAt,
      redeem_code_details: RewardRedeemCodeModel.from(data.rewardRedeemCodeModel)?.toBackend(),
    });
  }

  toBackend(): BackendMissionProgressDetails {
    return {
      mission_progress_id: this.missionProgressId,
      mission_progress_count: this.missionProgressCount,
      mission_progress_required: this.missionProgressRequired,
      mission_progress_rewarded: this.missionProgressRewarded,
      mission_progress_completed: this.missionProgressCompleted,
      mission_progress_created_at: this.missionProgressCreatedAt,
      mission_progress_updated_at: this.missionProgressUpdatedAt,
      redeem_code_details: this.rewardRedeemCodeModel?.toBackend() ?? null,
    };
  }

   copyWithRewarded(
     missionProgressRewarded?: boolean,
     rewardRedeemCodeModel?: RewardRedeemCodeModel | null
   ): MissionProgressDetails {
     return MissionProgressDetails.from({
       ...this,
       missionProgressRewarded: missionProgressRewarded ?? this.missionProgressRewarded,
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
