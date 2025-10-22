import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { BackendUserBalanceModel } from '@/models/user-balance';
import { UserBalanceModel } from '@/models/user-balance';

export interface UserBalanceChangeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  newRecord: UserBalanceModel | null;
  oldRecordId?: string;
  timestamp: number;
  userId: string;
}

export type UserBalanceChangeListener = (event: UserBalanceChangeEvent) => void;

class UserBalanceSubscriptionManager {
  private static instance: UserBalanceSubscriptionManager;
  private realtimeChannel: RealtimeChannel | null = null;
  private listeners: Map<UserBalanceChangeListener, number> = new Map(); // listener -> attach timestamp
  private lastEventPerUser: Map<string, UserBalanceChangeEvent> = new Map(); // userId -> latest event
  private currentUserId: string | null = null;

  private get channel(): string {
    return `personal:users_balance_table`;
  }

  private constructor() {}

  public static getInstance(): UserBalanceSubscriptionManager {
    if (!UserBalanceSubscriptionManager.instance) {
      UserBalanceSubscriptionManager.instance = new UserBalanceSubscriptionManager();
    }
    return UserBalanceSubscriptionManager.instance;
  }

  // Add event listener with optional replay of latest event
  public attachListener(listener: UserBalanceChangeListener, replayLatest: boolean = true): void {
    const attachTime = Date.now();
    this.listeners.set(listener, attachTime);

    // If replay is enabled and we have a current user, send the latest event
    if (replayLatest && this.currentUserId) {
      this.replayLatestEventToListener(listener, this.currentUserId);
    }
  }

  // Remove event listener
  public removeListener(listener: UserBalanceChangeListener): void {
    this.listeners.delete(listener);
  }

  // Remove all listeners
  public removeAllListeners(): void {
    this.listeners.clear();
  }

  // Replay latest event to a specific listener for the current user
  private replayLatestEventToListener(listener: UserBalanceChangeListener, userId: string): void {
    const latestEvent = this.lastEventPerUser.get(userId);
    if (latestEvent) {
      try {
        listener(latestEvent);
      } catch (error) {
        console.error('Error replaying event to listener:', error);
      }
    }
  }

  // Get the latest event for a specific user
  public getLatestEvent(userId: string): UserBalanceChangeEvent | null {
    return this.lastEventPerUser.get(userId) || null;
  }

  // Clear latest event for a specific user
  public clearLatestEvent(userId: string): void {
    this.lastEventPerUser.delete(userId);
  }

  // Clear all latest events
  public clearAllLatestEvents(): void {
    this.lastEventPerUser.clear();
  }

  public updateSubscription(userId: string): void {
    this.cancelSubscription();
    this.currentUserId = userId;

    try {
      this.realtimeChannel = supabaseBrowser
        .channel(this.channel)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'personal',
            table: 'users_balance_table',
            filter: `users_id=eq.${userId}`
          },
          (payload: RealtimePostgresChangesPayload<BackendUserBalanceModel>) => {
            const newRecord = payload.new
              ? new UserBalanceModel(payload.new as BackendUserBalanceModel)
              : null;
            this.handleUserBalanceData(
              payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              newRecord,
              (payload.old as BackendUserBalanceModel | null)?.users_id,
              userId
            );
          }
        )
        .subscribe((status, error) => {
          if (error) {
            this.handleUserBalanceError(error);
          } else {
            console.log('UserBalance subscription status:', status);
          }
        });

    } catch (error) {
      console.error('Failed to create UserBalance subscription:', error);
    }
  }

  public cancelSubscription(): void {
    if (this.realtimeChannel) {
      supabaseBrowser.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      this.currentUserId = null;
      console.log('UserBalance subscription cancelled');
    }
  }

  private handleUserBalanceData(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: UserBalanceModel | null,
    oldRecordId?: string,
    userId?: string
  ): void {
    console.log('UserBalance data received:', { eventType, newRecord, oldRecordId });

    const actualUserId = userId || this.currentUserId || newRecord?.usersId || oldRecordId || 'unknown';

    // Create event with timestamp
    const event: UserBalanceChangeEvent = {
      eventType,
      newRecord,
      oldRecordId,
      timestamp: Date.now(),
      userId: actualUserId
    };

    // Store as latest event for this user
    this.lastEventPerUser.set(actualUserId, event);

    // Notify all listeners
    this.notifyListeners(event);
  }

  private notifyListeners(event: UserBalanceChangeEvent): void {
    this.listeners.forEach((attachTime, listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in UserBalance change listener:', error);
      }
    });
  }

  private handleUserBalanceError(error: any): void {
    console.error('UserBalance subscription error:', error);
  }

  // Get the current user ID being subscribed to
  public getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  // Check if currently subscribed to any user
  public hasActiveSubscription(): boolean {
    return this.currentUserId !== null && this.realtimeChannel !== null;
  }

  public getChannelStatus(): string {
    return this.realtimeChannel?.state || 'disconnected';
  }

  // Get all latest events (for debugging)
  public getAllLatestEvents(): Map<string, UserBalanceChangeEvent> {
    return new Map(this.lastEventPerUser);
  }

  // Get listener count
  public getListenerCount(): number {
    return this.listeners.size;
  }

  // Check if specific listener is attached
  public hasListener(listener: UserBalanceChangeListener): boolean {
    return this.listeners.has(listener);
  }

  // Force replay latest event to all listeners
  public replayToAllListeners(): void {
    if (this.currentUserId) {
      const latestEvent = this.lastEventPerUser.get(this.currentUserId);
      if (latestEvent) {
        this.notifyListeners(latestEvent);
      }
    }
  }

  public destroy(): void {
    this.cancelSubscription();
    this.removeAllListeners();
    this.clearAllLatestEvents();
    console.log('UserBalanceSubscriptionManager destroyed');
  }
}

export const userBalanceSubscriptionManager = UserBalanceSubscriptionManager.getInstance();