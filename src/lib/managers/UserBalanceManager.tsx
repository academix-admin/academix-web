import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { BackendUserBalanceModel } from '@/models/user-balance';
import { UserBalanceModel } from '@/models/user-balance';

export interface UserBalanceChangeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  newRecord: UserBalanceModel | null;
  oldRecordId?: string;
}

export type UserBalanceChangeListener = (event: UserBalanceChangeEvent) => void;

class UserBalanceSubscriptionManager {
  private static instance: UserBalanceSubscriptionManager;
  private realtimeChannel: RealtimeChannel | null = null;
  private listeners: Set<UserBalanceChangeListener> = new Set();

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

  public attachListener(listener: UserBalanceChangeListener): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: UserBalanceChangeListener): void {
    this.listeners.delete(listener);
  }

  public removeAllListeners(): void {
    this.listeners.clear();
  }

  public updateSubscription(userId: string): void {

    this.cancelSubscription();

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
              (payload.old as BackendUserBalanceModel | null)?.users_id
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
      console.log('UserBalance subscription cancelled');
    }
  }

  private handleUserBalanceData(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: UserBalanceModel | null,
    oldRecordId?: string
  ): void {
    console.log('UserBalance data received:', { eventType, newRecord, oldRecordId });

    // Notify all listeners
    this.notifyListeners(eventType, newRecord, oldRecordId);
  }

  private notifyListeners(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: UserBalanceModel | null,
    oldRecordId?: string
  ): void {
    const event: UserBalanceChangeEvent = { eventType, newRecord, oldRecordId };

    this.listeners.forEach(listener => {
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

  public getChannelStatus(): string {
    return this.realtimeChannel?.state || 'disconnected';
  }

  public destroy(): void {
    this.cancelSubscription();
    this.removeAllListeners();
    console.log('UserBalanceSubscriptionManager destroyed');
  }
}

export const userBalanceSubscriptionManager = UserBalanceSubscriptionManager.getInstance();