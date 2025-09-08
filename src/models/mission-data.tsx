// --- Backend Interfaces ---
export interface BackendMissionData {
  mission_count: number;
  mission_finished: number;
  mission_completed: number;
  mission_not_rewarded: number;
}


// --- Frontend Models ---
export class MissionData {
  missionCount: number;
  missionFinished: number;
  missionCompleted: number;
  missionNotRewarded: number;

  constructor(data?: BackendMissionData | null) {
    this.missionCount = data?.mission_count ?? 0;
    this.missionFinished = data?.mission_finished ?? 0;
    this.missionCompleted = data?.mission_completed ?? 0;
    this.missionNotRewarded = data?.mission_not_rewarded ?? 0;
  }

  copyWith(data: Partial<MissionData>): MissionData {
    const backendData: BackendMissionData = {
      mission_count: data.missionCount ?? this.missionCount,
      mission_finished: data.missionFinished ?? this.missionFinished,
      mission_completed: data.missionCompleted ?? this.missionCompleted,
      mission_not_rewarded: data.missionNotRewarded ?? this.missionNotRewarded,
    };

    return new MissionData(backendData);
  }
}