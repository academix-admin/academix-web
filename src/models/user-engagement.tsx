interface HomeEngagementProgress {
  currentPoints: number;
  engagementLevelsId: number;
  pointsToNextLevel: number;
  currentProgressPercent: number;
  nextEngagementLevelsId: number;
  engagementLevelsIdentity: string;
  nextEngagementLevelsIdentity: string;
}

interface BackendHomeEngagementProgress {
  current_points: number;
  engagement_levels_id: number;
  points_to_next_level: number;
  current_progress_percent: number;
  next_engagement_levels_id: number;
  engagement_levels_identity: string;
  next_engagement_levels_identity: string;
}

interface BackendUserEngagementModel {
  user_engagement_progress_time: number;
  user_engagement_progress_questions: number;
  user_engagement_progress_quiz_count: number;
  user_engagement_progress_points_details: BackendHomeEngagementProgress;
}

export class UserEngagementModel {
  userEngagementProgressTime: number;
  userEngagementProgressQuestions: number;
  userEngagementProgressQuizCount: number;
  userEngagementProgressPointsDetails: HomeEngagementProgress;

  constructor(data?: BackendUserEngagementModel | null) {
    this.userEngagementProgressTime = data?.user_engagement_progress_time ?? 0;
    this.userEngagementProgressQuestions = data?.user_engagement_progress_questions ?? 0;
    this.userEngagementProgressQuizCount = data?.user_engagement_progress_quiz_count ?? 0;

    const points = data?.user_engagement_progress_points_details;
    this.userEngagementProgressPointsDetails = points
      ? {
          currentPoints: points.current_points ?? 0,
          engagementLevelsId: points.engagement_levels_id ?? 0,
          pointsToNextLevel: points.points_to_next_level ?? 0,
          currentProgressPercent: points.current_progress_percent ?? 0,
          nextEngagementLevelsId: points.next_engagement_levels_id ?? 0,
          engagementLevelsIdentity: points.engagement_levels_identity ?? "",
          nextEngagementLevelsIdentity: points.next_engagement_levels_identity ?? "",
        }
      : {
          currentPoints: 0,
          engagementLevelsId: 0,
          pointsToNextLevel: 0,
          currentProgressPercent: 0,
          nextEngagementLevelsId: 0,
          engagementLevelsIdentity: "",
          nextEngagementLevelsIdentity: "",
        };
  }

  copyWith(data: Partial<UserEngagementModel>): UserEngagementModel {
    return new UserEngagementModel({
      user_engagement_progress_time:
        data.userEngagementProgressTime !== undefined
          ? data.userEngagementProgressTime
          : this.userEngagementProgressTime,
      user_engagement_progress_questions:
        data.userEngagementProgressQuestions !== undefined
          ? data.userEngagementProgressQuestions
          : this.userEngagementProgressQuestions,
      user_engagement_progress_quiz_count:
        data.userEngagementProgressQuizCount !== undefined
          ? data.userEngagementProgressQuizCount
          : this.userEngagementProgressQuizCount,
      user_engagement_progress_points_details: data.userEngagementProgressPointsDetails
        ? {
            current_points: data.userEngagementProgressPointsDetails.currentPoints,
            engagement_levels_id: data.userEngagementProgressPointsDetails.engagementLevelsId,
            points_to_next_level: data.userEngagementProgressPointsDetails.pointsToNextLevel,
            current_progress_percent:
              data.userEngagementProgressPointsDetails.currentProgressPercent,
            next_engagement_levels_id:
              data.userEngagementProgressPointsDetails.nextEngagementLevelsId,
            engagement_levels_identity:
              data.userEngagementProgressPointsDetails.engagementLevelsIdentity,
            next_engagement_levels_identity:
              data.userEngagementProgressPointsDetails.nextEngagementLevelsIdentity,
          }
        : this.userEngagementProgressPointsDetails
        ? {
            current_points: this.userEngagementProgressPointsDetails.currentPoints,
            engagement_levels_id: this.userEngagementProgressPointsDetails.engagementLevelsId,
            points_to_next_level: this.userEngagementProgressPointsDetails.pointsToNextLevel,
            current_progress_percent: this.userEngagementProgressPointsDetails.currentProgressPercent,
            next_engagement_levels_id: this.userEngagementProgressPointsDetails.nextEngagementLevelsId,
            engagement_levels_identity: this.userEngagementProgressPointsDetails.engagementLevelsIdentity,
            next_engagement_levels_identity: this.userEngagementProgressPointsDetails.nextEngagementLevelsIdentity,
          }
        : {
            current_points: 0,
            engagement_levels_id: 0,
            points_to_next_level: 0,
            current_progress_percent: 0,
            next_engagement_levels_id: 0,
            engagement_levels_identity: "",
            next_engagement_levels_identity: "",
          },
    });
  }
}
