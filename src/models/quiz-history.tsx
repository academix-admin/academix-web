export interface BackendQuizHistory {
  pools_id: string;
  pools_duration: number;
  sort_created_id: string;
  topics_identity: string;
  topics_image?: string;
  pools_members_rank: number;
  pools_members_points: number;
  challenge_question_count: number;
  pools_members_created_at: string;
  pools_members_paid_amount: number;
  pools_completed_question_tracker_time: number;
}

export class QuizHistory {
  poolsId: string;
  poolsDuration: number;
  sortCreatedId: string;
  topicsIdentity: string;
  topicsImage?: string;
  poolsMembersRank: number;
  poolsMembersPoints: number;
  challengeQuestionCount: number;
  poolsMembersCreatedAt: string;
  poolsMembersPaidAmount: number;
  poolsCompletedQuestionTrackerTime: number;

  constructor(data?: BackendQuizHistory | null) {
    this.poolsId = data?.pools_id ?? "";
    this.poolsDuration = data?.pools_duration ?? 0;
    this.sortCreatedId = data?.sort_created_id ?? "";
    this.topicsIdentity = data?.topics_identity ?? "";
    this.topicsImage = data?.topics_image ?? "";
    this.poolsMembersRank = data?.pools_members_rank ?? 0;
    this.poolsMembersPoints = data?.pools_members_points ?? 0;
    this.challengeQuestionCount = data?.challenge_question_count ?? 0;
    this.poolsMembersCreatedAt = data?.pools_members_created_at ?? "";
    this.poolsMembersPaidAmount = data?.pools_members_paid_amount ?? 0;
    this.poolsCompletedQuestionTrackerTime = data?.pools_completed_question_tracker_time ?? 0;
  }

  copyWith(data: Partial<QuizHistory>): QuizHistory {
    return new QuizHistory({
      pools_id: data.poolsId !== undefined ? data.poolsId : this.poolsId,
      pools_duration: data.poolsDuration !== undefined ? data.poolsDuration : this.poolsDuration,
      sort_created_id: data.sortCreatedId !== undefined ? data.sortCreatedId : this.sortCreatedId,
      topics_identity: data.topicsIdentity !== undefined ? data.topicsIdentity : this.topicsIdentity,
      topics_image: data.topicsImage !== undefined ? data.topicsImage : this.topicsImage,
      pools_members_rank: data.poolsMembersRank !== undefined ? data.poolsMembersRank : this.poolsMembersRank,
      pools_members_points: data.poolsMembersPoints !== undefined ? data.poolsMembersPoints : this.poolsMembersPoints,
      challenge_question_count: data.challengeQuestionCount !== undefined ? data.challengeQuestionCount : this.challengeQuestionCount,
      pools_members_created_at: data.poolsMembersCreatedAt !== undefined ? data.poolsMembersCreatedAt : this.poolsMembersCreatedAt,
      pools_members_paid_amount: data.poolsMembersPaidAmount !== undefined ? data.poolsMembersPaidAmount : this.poolsMembersPaidAmount,
      pools_completed_question_tracker_time: data.poolsCompletedQuestionTrackerTime !== undefined ? data.poolsCompletedQuestionTrackerTime : this.poolsCompletedQuestionTrackerTime,
    });
  }
}