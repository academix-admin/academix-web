// --- Backend Interfaces ---
export interface BackendMissionModel {
  mission_id: string;
  mission_type: string;
  mission_image?: string | null;
  mission_title: string;
  mission_description: string;
  sort_created_id: number;
  mission_requirement: { count: number };
  reward_details: BackendRewardDetails;
  mission_progress_details: BackendMissionProgressDetails;
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

// --- Frontend Models ---
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

  constructor(data?: BackendMissionModel | null) {
    this.missionId = data?.mission_id ?? "";
    this.missionType = data?.mission_type ?? "";
    this.rewardDetails = new RewardDetails(data?.reward_details ?? null);
    this.sortCreatedId = data?.sort_created_id ?? 0;
    this.missionRequirement = data?.mission_requirement?.count ?? 0;
    this.missionTitle = data?.mission_title ?? "";
    this.missionImage = data?.mission_image ?? null;
    this.missionProgressDetails = new MissionProgressDetails(
      data?.mission_progress_details ?? null
    );
    this.missionDescription = data?.mission_description ?? "";
  }

  copyWith(data: Partial<MissionModel>): MissionModel {
    const backendData: BackendMissionModel = {
      mission_id: data.missionId ?? this.missionId,
      mission_type: data.missionType ?? this.missionType,
      reward_details: data.rewardDetails
        ? data.rewardDetails.toBackend()
        : this.rewardDetails.toBackend(),
      sort_created_id: data.sortCreatedId ?? this.sortCreatedId,
      mission_requirement: { count: data.missionRequirement ?? this.missionRequirement },
      mission_title: data.missionTitle ?? this.missionTitle,
      mission_image: data.missionImage ?? this.missionImage,
      mission_progress_details: data.missionProgressDetails
        ? data.missionProgressDetails.toBackend()
        : this.missionProgressDetails.toBackend(),
      mission_description: data.missionDescription ?? this.missionDescription,
    };

    return new MissionModel(backendData);
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

  toBackend(): BackendMissionProgressDetails {
    return {
      mission_progress_id: this.missionProgressId,
      mission_progress_count: this.missionProgressCount,
      mission_progress_required: this.missionProgressRequired,
      mission_progress_rewarded: this.missionProgressRewarded,
      mission_progress_completed: this.missionProgressCompleted,
      mission_progress_created_at: this.missionProgressCreatedAt,
      mission_progress_updated_at: this.missionProgressUpdatedAt,
      redeem_code_details: this.rewardRedeemCodeModel
        ? this.rewardRedeemCodeModel.toBackend()
        : null,
    };
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

  toBackend(): BackendRewardRedeemCodeModel {
    return {
      redeem_code_id: this.id,
      redeem_code_value: this.value,
      redeem_code_expires: this.expires,
    };
  }
}
