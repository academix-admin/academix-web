import { useEffect, useRef, useCallback } from 'react';

export enum TimelapseType {
  second = 'second',
  minute = 'minute',
  hour = 'hour',
  day = 'day',
  week = 'week',
  month = 'month',
  year = 'year'
}

export interface TimelapseManagerConfig {
  onTimelapseComplete?: () => void;
}

export class TimelapseManager {
  private startTime: Date;
  private endTime: Date;
  private timelapseType: TimelapseType;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isInitialized = false;
  private pauseTime: Date | null = null;
  private pausedDuration = 0;
  private totalPausedDuration = 0;
  private listeners: ((remaining: number) => void)[] = [];
  private onTimelapseComplete?: () => void;

  constructor(config?: TimelapseManagerConfig) {
    this.startTime = new Date();
    this.endTime = new Date();
    this.timelapseType = TimelapseType.second;
    this.onTimelapseComplete = config?.onTimelapseComplete;
  }

  setupLapse(startTime: Date, endTime: Date, timelapseType: TimelapseType): void {
    if (this.isInitialized) return;

    if (startTime > endTime) {
      throw new Error("startTime must be before endTime");
    }

    if (startTime.getTime() === endTime.getTime()) {
      throw new Error("startTime and endTime cannot be the same");
    }

    this.startTime = startTime;
    this.endTime = endTime;
    this.timelapseType = timelapseType;
    this.isInitialized = true;

    // Initialize with current remaining time
    this.notifyListeners(this.calculateRemainingTime());
  }

  addListener(listener: (remaining: number) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (remaining: number) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(remaining: number): void {
    this.listeners.forEach(listener => listener(remaining));
  }

  start(): void {
    if (!this.isInitialized) {
      throw new Error("Must call setupLapse() before starting");
    }
    if (this.isRunning) return;

    const periodDuration = this.getUpdateInterval(this.timelapseType);
    const initialRemaining = this.calculateRemainingTime();

    // Send initial update immediately
    this.notifyListeners(initialRemaining);

    // Check if already completed
    if (initialRemaining <= 0) {
      this.handleCompletion();
      return;
    }

    this.timer = setInterval(() => {
      const remaining = this.calculateRemainingTime();

      if (remaining <= 0) {
        this.handleCompletion();
        return;
      }

      this.notifyListeners(remaining);
    }, periodDuration);

    this.isRunning = true;
  }

  pause(): void {
    if (this.isRunning) {
      this.pauseTime = new Date();
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.isRunning = false;
    }
  }

  resume(): void {
    if (!this.isRunning && this.pauseTime) {
      const pauseDuration = new Date().getTime() - this.pauseTime.getTime();
      this.pausedDuration += pauseDuration;
      this.totalPausedDuration += pauseDuration;
      this.pauseTime = null;
      this.start();
    }
  }

  reset(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isInitialized = false;
    this.isRunning = false;
    this.pausedDuration = 0;
    this.totalPausedDuration = 0;
    this.pauseTime = null;
    this.notifyListeners(this.endTime.getTime() - this.startTime.getTime());
  }

  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.listeners = [];
    this.isInitialized = false;
    this.isRunning = false;
    this.pausedDuration = 0;
    this.totalPausedDuration = 0;
    this.pauseTime = null;
  }

  private calculateRemainingTime(): number {
    const now = new Date().getTime();
    const effectiveStart = this.startTime.getTime() + this.totalPausedDuration;
    const remaining = this.endTime.getTime() - now;

    // If we're before the effective start time, return full duration
    if (now < effectiveStart) {
      return this.endTime.getTime() - this.startTime.getTime();
    }

    return remaining > 0 ? remaining : 0;
  }

  private handleCompletion(): void {
    this.notifyListeners(0);
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.onTimelapseComplete?.();
  }

  private getUpdateInterval(type: TimelapseType): number {
    switch (type) {
      case TimelapseType.second:
        return 1000;
      case TimelapseType.minute:
        return 60000;
      case TimelapseType.hour:
        return 3600000;
      case TimelapseType.day:
        return 86400000;
      case TimelapseType.week:
        return 604800000;
      case TimelapseType.month:
        return 2592000000; // 30 days
      case TimelapseType.year:
        return 31536000000; // 365 days
      default:
        return 1000;
    }
  }

  get isTimerRunning(): boolean {
    return this.isRunning;
  }

  get isTimerInitialized(): boolean {
    return this.isInitialized;
  }

  get currentRemainingTime(): number {
    if (!this.isInitialized) return 0;
    return this.calculateRemainingTime();
  }
}

// React Hook for using TimelapseManager
export function useTimelapseManager(config?: TimelapseManagerConfig) {
  const managerRef = useRef<TimelapseManager | null>(null);

  useEffect(() => {
    managerRef.current = new TimelapseManager(config);
    return () => {
      managerRef.current?.dispose();
    };
  }, [config]);

  return managerRef;
}