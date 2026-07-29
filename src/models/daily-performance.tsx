import type { BackendDailyPerformance } from '@academix-admin/domain-types';
export type { BackendDailyPerformance };
interface DailyPerformance {
  dailyPerformanceEarnings: number;
  dailyPerformanceQuiz: number;
}

export class DailyPerformanceModel {
  dailyPerformanceEarnings: number;
  dailyPerformanceQuiz: number;

  constructor(data?: BackendDailyPerformance | null) {
    this.dailyPerformanceEarnings = data?.daily_performance_for_earning ?? 0;
    this.dailyPerformanceQuiz = data?.daily_performance_for_quiz ?? 0;
  }

  copyWith(data: Partial<DailyPerformanceModel>): DailyPerformanceModel {
    return new DailyPerformanceModel({
      daily_performance_for_earning: data.dailyPerformanceEarnings !== undefined
        ? data.dailyPerformanceEarnings
        : this.dailyPerformanceEarnings,
      daily_performance_for_quiz: data.dailyPerformanceQuiz !== undefined
        ? data.dailyPerformanceQuiz
        : this.dailyPerformanceQuiz,
    });
  }
}