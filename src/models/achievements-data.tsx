// --- Backend Interfaces ---
export interface BackendAchievementsData {
  achievements_count: number;
  achievements_finished: number;
  achievements_completed: number;
  achievements_not_rewarded: number;
}

// --- Frontend Models ---
export class AchievementsData {
  achievementsCount: number;
  achievementsFinished: number;
  achievementsCompleted: number;
  achievementsNotRewarded: number;

  constructor(data?: BackendAchievementsData | null) {
    this.achievementsCount = data?.achievements_count ?? 0;
    this.achievementsFinished = data?.achievements_finished ?? 0;
    this.achievementsCompleted = data?.achievements_completed ?? 0;
    this.achievementsNotRewarded = data?.achievements_not_rewarded ?? 0;
  }

  copyWith(data: Partial<AchievementsData>): AchievementsData {
    const backendData: BackendAchievementsData = {
      achievements_count: data.achievementsCount ?? this.achievementsCount,
      achievements_finished: data.achievementsFinished ?? this.achievementsFinished,
      achievements_completed: data.achievementsCompleted ?? this.achievementsCompleted,
      achievements_not_rewarded:
        data.achievementsNotRewarded ?? this.achievementsNotRewarded,
    };

    return new AchievementsData(backendData);
  }
}