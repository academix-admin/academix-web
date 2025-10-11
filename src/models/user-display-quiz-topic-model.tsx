// ========================
// Backend Interfaces
// ========================
export interface BackendGameModeModel {
  game_mode_id: string;
  game_mode_identity: string;
  game_mode_checker: string;
}

export interface BackendChallengeModel {
  challenge_id: string;
  challenge_development_charge: number;
  challenge_price: number;
  challenge_top_share: number;
  challenge_mid_share: number;
  challenge_bot_share: number;
  challenge_waiting_time?: number | null;
  challenge_min_participants: number;
  challenge_max_participants: number;
  challenge_identity: string;
  challenge_question_count: number;
  game_mode_details?: BackendGameModeModel | null;
}

export interface BackendQuizPool {
  sort_created_id: string;
  sort_updated_id: string;
  pools_id: string;
  pools_visible: boolean;
  pools_allow_submission?: boolean;
  pools_status: string;
  pools_auth: string;
  pools_code?: string | null;
  pools_job?: string | null;
  pools_duration?: number | null;
  challenge_details?: BackendChallengeModel | null;
  pools_starting_at?: string | null;
  pools_job_end_at?: string | null;
  pools_graded_at?: string | null;
  pools_ranked_at?: string | null;
  pools_rewarded_at?: string | null;
  pools_completed_at?: string | null;
  pools_members_count: number;
  question_tracker_count: number;
}

export interface BackendUserDisplayQuizTopicModel {
  sort_created_id: string;
  sort_updated_id: string;
  topics_id: string;
  topics_identity: string;
  topics_created_at: string;
  topics_updated_at: string;
  topics_image?: string | null;
  topics_description?: string;
  creator_details: {
    users_id: string;
    users_image?: string | null;
    users_names: string;
    users_username: string;
  };
  pools_details?: BackendQuizPool | null;
  topics_sponsorship?: string;
}

// ========================
// Frontend Models
// ========================
export class GameModeModel {
  gameModeId: string;
  gameModeIdentity: string;
  gameModeChecker: string;

  constructor(data?: BackendGameModeModel | null) {
    this.gameModeId = data?.game_mode_id ?? "";
    this.gameModeIdentity = data?.game_mode_identity ?? "";
    this.gameModeChecker = data?.game_mode_checker ?? "";
  }

  static from(data: any): GameModeModel {
    if (data instanceof GameModeModel) return data;
    return new GameModeModel({
      game_mode_id: data.gameModeId,
      game_mode_identity: data.gameModeIdentity,
      game_mode_checker: data.gameModeChecker,
    });
  }

  toBackend(): BackendGameModeModel {
    return {
      game_mode_id: this.gameModeId,
      game_mode_identity: this.gameModeIdentity,
      game_mode_checker: this.gameModeChecker,
    };
  }

  copyWith(update: Partial<GameModeModel>): GameModeModel {
    return new GameModeModel({
      game_mode_id: update.gameModeId ?? this.gameModeId,
      game_mode_identity: update.gameModeIdentity ?? this.gameModeIdentity,
      game_mode_checker: update.gameModeChecker ?? this.gameModeChecker,
    });
  }
}

export class ChallengeModel {
  challengeId: string;
  challengeDevelopmentCharge: number;
  challengePrice: number;
  challengeTopShare: number;
  challengeMidShare: number;
  challengeBotShare: number;
  challengeWaitingTime?: number | null;
  challengeMinParticipant: number;
  challengeMaxParticipant: number;
  challengeIdentity: string;
  challengeQuestionCount: number;
  gameModeModel?: GameModeModel | null;

  constructor(data?: BackendChallengeModel | null) {
    this.challengeId = data?.challenge_id ?? "";
    this.challengeDevelopmentCharge = data?.challenge_development_charge ?? 0;
    this.challengePrice = data?.challenge_price ?? 0;
    this.challengeTopShare = data?.challenge_top_share ?? 0;
    this.challengeMidShare = data?.challenge_mid_share ?? 0;
    this.challengeBotShare = data?.challenge_bot_share ?? 0;
    this.challengeWaitingTime = data?.challenge_waiting_time ?? null;
    this.challengeMinParticipant = data?.challenge_min_participants ?? 0;
    this.challengeMaxParticipant = data?.challenge_max_participants ?? 0;
    this.challengeIdentity = data?.challenge_identity ?? "";
    this.challengeQuestionCount = data?.challenge_question_count ?? 0;
    this.gameModeModel = data?.game_mode_details
      ? new GameModeModel(data.game_mode_details)
      : null;
  }

  static from(data: any): ChallengeModel {
    if (data instanceof ChallengeModel) return data;
    return new ChallengeModel({
      challenge_id: data.challengeId,
      challenge_development_charge: data.challengeDevelopmentCharge,
      challenge_price: data.challengePrice,
      challenge_top_share: data.challengeTopShare,
      challenge_mid_share: data.challengeMidShare,
      challenge_bot_share: data.challengeBotShare,
      challenge_waiting_time: data.challengeWaitingTime,
      challenge_min_participants: data.challengeMinParticipant,
      challenge_max_participants: data.challengeMaxParticipant,
      challenge_identity: data.challengeIdentity,
      challenge_question_count: data.challengeQuestionCount,
      game_mode_details: data.gameModeModel
        ? GameModeModel.from(data.gameModeModel).toBackend()
        : null
    });
  }

  toBackend(): BackendChallengeModel {
    return {
      challenge_id: this.challengeId,
      challenge_development_charge: this.challengeDevelopmentCharge,
      challenge_price: this.challengePrice,
      challenge_top_share: this.challengeTopShare,
      challenge_mid_share: this.challengeMidShare,
      challenge_bot_share: this.challengeBotShare,
      challenge_waiting_time: this.challengeWaitingTime ?? null,
      challenge_min_participants: this.challengeMinParticipant,
      challenge_max_participants: this.challengeMaxParticipant,
      challenge_identity: this.challengeIdentity,
      challenge_question_count: this.challengeQuestionCount,
      game_mode_details: this.gameModeModel?.toBackend() ?? null,
    };
  }

  copyWith(update: Partial<ChallengeModel>): ChallengeModel {
    return new ChallengeModel({
      challenge_id: update.challengeId ?? this.challengeId,
      challenge_development_charge: update.challengeDevelopmentCharge ?? this.challengeDevelopmentCharge,
      challenge_price: update.challengePrice ?? this.challengePrice,
      challenge_top_share: update.challengeTopShare ?? this.challengeTopShare,
      challenge_mid_share: update.challengeMidShare ?? this.challengeMidShare,
      challenge_bot_share: update.challengeBotShare ?? this.challengeBotShare,
      challenge_waiting_time: update.challengeWaitingTime ?? this.challengeWaitingTime,
      challenge_min_participants: update.challengeMinParticipant ?? this.challengeMinParticipant,
      challenge_max_participants: update.challengeMaxParticipant ?? this.challengeMaxParticipant,
      challenge_identity: update.challengeIdentity ?? this.challengeIdentity,
      challenge_question_count: update.challengeQuestionCount ?? this.challengeQuestionCount,
      game_mode_details: update.gameModeModel
        ? update.gameModeModel.toBackend()
        : this.gameModeModel?.toBackend() ?? null,
    });
  }
}

export class QuizPool {
  sortCreatedId: string;
  sortUpdatedId: string;
  poolsId: string;
  poolsVisible: boolean;
  poolsAllowSubmission: boolean;
  poolsStatus: string;
  poolsAuth: string;
  poolsCode?: string | null;
  poolsJob?: string | null;
  poolsDuration?: number | null;
  challengeModel?: ChallengeModel | null;
  poolsStartingAt?: string | null;
  poolsJobEndAt?: string | null;
  poolsGradedAt?: string | null;
  poolsRankedAt?: string | null;
  poolsRewardedAt?: string | null;
  poolsCompletedAt?: string | null;
  poolsMembersCount: number;
  questionTrackerCount: number;

  constructor(data?: BackendQuizPool | null) {
    this.sortCreatedId = data?.sort_created_id ?? "";
    this.sortUpdatedId = data?.sort_updated_id ?? "";
    this.poolsId = data?.pools_id ?? "";
    this.poolsVisible = data?.pools_visible ?? false;
    this.poolsAllowSubmission = data?.pools_allow_submission ?? false;
    this.poolsStatus = data?.pools_status ?? "";
    this.poolsAuth = data?.pools_auth ?? "";
    this.poolsCode = data?.pools_code ?? null;
    this.poolsJob = data?.pools_job ?? null;
    this.poolsDuration = data?.pools_duration ?? null;
    this.challengeModel = data?.challenge_details ? new ChallengeModel(data.challenge_details) : null;
    this.poolsStartingAt = data?.pools_starting_at ?? null;
    this.poolsJobEndAt = data?.pools_job_end_at ?? null;
    this.poolsGradedAt = data?.pools_graded_at ?? null;
    this.poolsRankedAt = data?.pools_ranked_at ?? null;
    this.poolsRewardedAt = data?.pools_rewarded_at ?? null;
    this.poolsCompletedAt = data?.pools_completed_at ?? null;
    this.poolsMembersCount = data?.pools_members_count ?? 0;
    this.questionTrackerCount = data?.question_tracker_count ?? 0;
  }

  static from(data: any): QuizPool {
    if (data instanceof QuizPool) return data;
    return new QuizPool({
      sort_created_id: data.sortCreatedId,
      sort_updated_id: data.sortUpdatedId,
      pools_id: data.poolsId,
      pools_visible: data.poolsVisible,
      pools_allow_submission: data.poolsAllowSubmission,
      pools_status: data.poolsStatus,
      pools_auth: data.poolsAuth,
      pools_code: data.poolsCode,
      pools_job: data.poolsJob,
      pools_duration: data.poolsDuration,
      challenge_details: ChallengeModel.from(data.challengeModel)?.toBackend(),
      pools_starting_at: data.poolsStartingAt,
      pools_job_end_at: data.poolsJobEndAt,
      pools_graded_at: data.poolsGradedAt,
      pools_ranked_at: data.poolsRankedAt,
      pools_rewarded_at: data.poolsRewardedAt,
      pools_completed_at: data.poolsCompletedAt,
      pools_members_count: data.poolsMembersCount,
      question_tracker_count: data.questionTrackerCount,
    });
  }

  toBackend(): BackendQuizPool {
    return {
      sort_created_id: this.sortCreatedId,
      sort_updated_id: this.sortUpdatedId,
      pools_id: this.poolsId,
      pools_visible: this.poolsVisible,
      pools_allow_submission: this.poolsAllowSubmission,
      pools_status: this.poolsStatus,
      pools_auth: this.poolsAuth,
      pools_code: this.poolsCode ?? null,
      pools_job: this.poolsJob ?? null,
      pools_duration: this.poolsDuration ?? null,
      challenge_details: this.challengeModel?.toBackend() ?? null,
      pools_starting_at: this.poolsStartingAt ?? null,
      pools_job_end_at: this.poolsJobEndAt ?? null,
      pools_graded_at: this.poolsGradedAt ?? null,
      pools_ranked_at: this.poolsRankedAt ?? null,
      pools_rewarded_at: this.poolsRewardedAt ?? null,
      pools_completed_at: this.poolsCompletedAt ?? null,
      pools_members_count: this.poolsMembersCount,
      question_tracker_count: this.questionTrackerCount,
    };
  }

  copyWith(update: Partial<QuizPool>): QuizPool {
    return new QuizPool({
      sort_created_id: update.sortCreatedId ?? this.sortCreatedId,
      sort_updated_id: update.sortUpdatedId ?? this.sortUpdatedId,
      pools_id: update.poolsId ?? this.poolsId,
      pools_visible: update.poolsVisible ?? this.poolsVisible,
      pools_allow_submission: update.poolsAllowSubmission ?? this.poolsAllowSubmission,
      pools_status: update.poolsStatus ?? this.poolsStatus,
      pools_auth: update.poolsAuth ?? this.poolsAuth,
      pools_code: update.poolsCode ?? this.poolsCode,
      pools_job: update.poolsJob ?? this.poolsJob,
      pools_duration: update.poolsDuration ?? this.poolsDuration,
      challenge_details: (update.challengeModel ?? this.challengeModel)?.toBackend() ?? null,
      pools_starting_at: update.poolsStartingAt ?? this.poolsStartingAt,
      pools_job_end_at: update.poolsJobEndAt ?? this.poolsJobEndAt,
      pools_graded_at: update.poolsGradedAt ?? this.poolsGradedAt,
      pools_ranked_at: update.poolsRankedAt ?? this.poolsRankedAt,
      pools_rewarded_at: update.poolsRewardedAt ?? this.poolsRewardedAt,
      pools_completed_at: update.poolsCompletedAt ?? this.poolsCompletedAt,
      pools_members_count: update.poolsMembersCount ?? this.poolsMembersCount,
      question_tracker_count: update.questionTrackerCount ?? this.questionTrackerCount,
    });
  }

  getStreamedUpdate(newPool: QuizPool): QuizPool {
    const backendData = this.toBackend();
    return new QuizPool({
      ...backendData,
      sort_updated_id: newPool.sortUpdatedId,
      pools_allow_submission: newPool.poolsAllowSubmission,
      pools_status: newPool.poolsStatus,
      pools_job: newPool.poolsJob,
      pools_duration: newPool.poolsDuration,
      pools_starting_at: newPool.poolsStartingAt,
      pools_job_end_at: newPool.poolsJobEndAt,
      pools_graded_at: newPool.poolsGradedAt,
      pools_ranked_at: newPool.poolsRankedAt,
      pools_rewarded_at: newPool.poolsRewardedAt,
      pools_completed_at: newPool.poolsCompletedAt,
    });
  }


}

export class UserDisplayQuizTopicModel {
  sortCreatedId: string;
  sortUpdatedId: string;
  topicsId: string;
  topicsIdentity: string;
  topicsCreatedAt: string;
  topicsUpdatedAt: string;
  topicsImageUrl?: string | null;
  topicsDescription: string;
  userImageUrl?: string | null;
  usernameText: string;
  creatorId: string;
  fullNameText: string;
  quizPool?: QuizPool | null;
  topicsSponsorship?: string;

  constructor(data?: BackendUserDisplayQuizTopicModel | null) {
    this.sortCreatedId = data?.sort_created_id ?? "";
    this.sortUpdatedId = data?.sort_updated_id ?? "";
    this.topicsId = data?.topics_id ?? "";
    this.topicsIdentity = data?.topics_identity ?? "";
    this.topicsCreatedAt = data?.topics_created_at ?? "";
    this.topicsUpdatedAt = data?.topics_updated_at ?? "";
    this.topicsImageUrl = data?.topics_image ?? null;
    this.topicsDescription = data?.topics_description ?? "";
    this.userImageUrl = data?.creator_details?.users_image ?? null;
    this.usernameText = data?.creator_details?.users_username ?? "";
    this.creatorId = data?.creator_details?.users_id ?? "";
    this.fullNameText = data?.creator_details?.users_names ?? "";
    this.quizPool = data?.pools_details ? new QuizPool(data.pools_details) : null;
    this.topicsSponsorship = data?.topics_sponsorship ?? "";
  }

  static from(data: any): UserDisplayQuizTopicModel {
    if (data instanceof UserDisplayQuizTopicModel) return data;
    return new UserDisplayQuizTopicModel({
      sort_created_id: data.sortCreatedId,
      sort_updated_id: data.sortUpdatedId,
      topics_id: data.topicsId,
      topics_identity: data.topicsIdentity,
      topics_created_at: data.topicsCreatedAt,
      topics_updated_at: data.topicsUpdatedAt,
      topics_image: data.topicsImageUrl,
      topics_description: data.topicsDescription,
      creator_details: {
        users_id: data.creatorId,
        users_image: data.userImageUrl,
        users_names: data.fullNameText,
        users_username: data.usernameText,
      },
      pools_details: QuizPool.from(data.quizPool)?.toBackend(),
      topics_sponsorship: data.topicsSponsorship,
    });
  }

  toBackend(): BackendUserDisplayQuizTopicModel {
    return {
      sort_created_id: this.sortCreatedId,
      sort_updated_id: this.sortUpdatedId,
      topics_id: this.topicsId,
      topics_identity: this.topicsIdentity,
      topics_created_at: this.topicsCreatedAt,
      topics_updated_at: this.topicsUpdatedAt,
      topics_image: this.topicsImageUrl ?? null,
      topics_description: this.topicsDescription,
      creator_details: {
        users_id: this.creatorId,
        users_image: this.userImageUrl ?? null,
        users_names: this.fullNameText,
        users_username: this.usernameText,
      },
      pools_details: this.quizPool?.toBackend() ?? null,
      topics_sponsorship: this.topicsSponsorship ?? "",
    };
  }

  copyWith(update: Partial<UserDisplayQuizTopicModel>): UserDisplayQuizTopicModel {
    return new UserDisplayQuizTopicModel({
      sort_created_id: update.sortCreatedId ?? this.sortCreatedId,
      sort_updated_id: update.sortUpdatedId ?? this.sortUpdatedId,
      topics_id: update.topicsId ?? this.topicsId,
      topics_identity: update.topicsIdentity ?? this.topicsIdentity,
      topics_created_at: update.topicsCreatedAt ?? this.topicsCreatedAt,
      topics_updated_at: update.topicsUpdatedAt ?? this.topicsUpdatedAt,
      topics_image: update.topicsImageUrl ?? this.topicsImageUrl,
      topics_description: update.topicsDescription ?? this.topicsDescription,
      creator_details: {
        users_id: update.creatorId ?? this.creatorId,
        users_image: update.userImageUrl ?? this.userImageUrl,
        users_names: update.fullNameText ?? this.fullNameText,
        users_username: update.usernameText ?? this.usernameText,
      },
      pools_details: (update.quizPool ?? this.quizPool)?.toBackend() ?? null,
      topics_sponsorship: update.topicsSponsorship ?? this.topicsSponsorship,
    });
  }
}
