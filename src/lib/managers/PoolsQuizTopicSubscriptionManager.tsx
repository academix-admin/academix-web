import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { BackendQuizPool } from '@/models/user-display-quiz-topic-model';
import { QuizPool } from '@/models/user-display-quiz-topic-model';

export interface PoolSubscriptionModel {
  poolsId: string;
  poolsSubscriptionType: 'creator' | 'active' | 'personalized' | 'public' | 'code' | string;
}

export interface PoolChangeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  newRecord: QuizPool | null;
  oldRecordId?: string;
}

export type PoolChangeListener = (event: PoolChangeEvent) => void;

class PoolsQuizTopicSubscriptionManager {
  private static instance: PoolsQuizTopicSubscriptionManager;
  private activePoolsSubscriptions: Map<string, 'creator' | 'active' | 'personalized' | 'public' | 'code' | string> = new Map();
  private realtimeChannel: RealtimeChannel | null = null;
  private listeners: Set<PoolChangeListener> = new Set();

  private get channel(): string {
    return `public:pools_table`;
  }

  private constructor() {}

  // Singleton pattern - get the single instance
  public static getInstance(): PoolsQuizTopicSubscriptionManager {
    if (!PoolsQuizTopicSubscriptionManager.instance) {
      PoolsQuizTopicSubscriptionManager.instance = new PoolsQuizTopicSubscriptionManager();
    }
    return PoolsQuizTopicSubscriptionManager.instance;
  }

  // Add event listener
  public attachListener(listener: PoolChangeListener): void {
    this.listeners.add(listener);
  }

  // Remove event listener
  public removeListener(listener: PoolChangeListener): void {
    this.listeners.delete(listener);
  }

  // Remove all listeners
  public removeAllListeners(): void {
    this.listeners.clear();
  }

  // Updates the subscription based on active pool IDs
  public updateSubscription(): void {
    this.cancelSubscription({ clear: false });

    if (this.activePoolsSubscriptions.size > 0) {
      const poolIds = Array.from(this.activePoolsSubscriptions.keys());
      console.log('Subscribing to pool IDs:', poolIds);

      this.realtimeChannel = supabaseBrowser
        .channel(this.channel)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pools_table',
            filter: `pools_id=in.(${poolIds.join(',')})`
          },
          (payload: RealtimePostgresChangesPayload<BackendQuizPool>) => {
            const newRecord = payload.new
              ? new QuizPool(payload.new as BackendQuizPool)
              : null;
            this.handleQuizTopicData(
              payload.eventType,
              newRecord,
              (payload.old as BackendQuizPool | null)?.pools_id
            );
          }
        )
        .subscribe((status, error) => {
          if (error) {
            this.handleQuizTopicError(error);
          }
        });

      console.log('Realtime channel status:', this.realtimeChannel);
    }
  }

  // Add a new quiz topic pool, ensuring no duplicates based on poolsId
  public addQuizTopicPool(
    poolSubscriptionModel: PoolSubscriptionModel,
    options: { override?: boolean; update?: boolean } = {}
  ): boolean {
    const poolIds = Array.from(this.activePoolsSubscriptions.keys());
    console.log('Current pool IDs:', poolIds);

    const { override = false, update = true } = options;
    const existingSubscription = this.activePoolsSubscriptions.get(poolSubscriptionModel.poolsId);

    if (existingSubscription !== undefined && !override) {
      return false;
    }

    if (override && existingSubscription === poolSubscriptionModel.poolsSubscriptionType) {
      return false;
    }

    this.activePoolsSubscriptions.set(
      poolSubscriptionModel.poolsId,
      poolSubscriptionModel.poolsSubscriptionType
    );

    if (update) {
      this.updateSubscription();
    }

    return true;
  }

  // Remove a quiz topic pool and update the subscription
  public removeQuizTopicPool(poolsId: string, options: { update?: boolean } = {}): void {
    const { update = true } = options;

    this.activePoolsSubscriptions.delete(poolsId);

    if (update) {
      this.updateSubscription();
    }
  }

  // Optional: Cancel the subscription entirely
  public cancelSubscription(options: { clear?: boolean } = {}): void {
    const { clear = true } = options;

    if (this.realtimeChannel) {
      supabaseBrowser.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    if (clear) {
      this.activePoolsSubscriptions.clear();
    }
  }

  // Handle quiz topic data - implement based on your needs
  public handleQuizTopicData(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: QuizPool | null,
    oldRecordId?: string
  ): void {
    console.log('Quiz topic data received:', { eventType, newRecord, oldRecordId });

    // Notify all listeners
    this.notifyListeners(eventType, newRecord, oldRecordId);

    // Clean up subscription if record was deleted
    if (eventType === 'DELETE' && oldRecordId) {
      this.activePoolsSubscriptions.delete(oldRecordId);
    }
  }

  // Notify all registered listeners
  private notifyListeners(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: QuizPool | null,
    oldRecordId?: string
  ): void {
    const event: PoolChangeEvent = { eventType, newRecord, oldRecordId };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in pool change listener:', error);
      }
    });
  }

  // Handle quiz topic error
  private handleQuizTopicError(error: any): void {
    console.error('Quiz topic subscription error:', error);
  }

  // Utility method to get current subscriptions
  public getActiveSubscriptions(): Map<string, 'creator' | 'active' | 'personalized' | 'public' | 'code' | string> {
    return new Map(this.activePoolsSubscriptions);
  }

  // Check if a specific pool is being subscribed to
  public hasPoolSubscription(poolsId: string): boolean {
    return this.activePoolsSubscriptions.has(poolsId);
  }

  // Get subscription type for a specific pool
  public getPoolSubscriptionType(poolsId: string): 'creator' | 'active' | 'personalized' | 'public' | 'code' | undefined | string {
    return this.activePoolsSubscriptions.get(poolsId);
  }

  // Clean up method
  public destroy(): void {
    this.cancelSubscription();
    this.removeAllListeners();
  }
}

// Export the singleton instance
export const poolsSubscriptionManager = PoolsQuizTopicSubscriptionManager.getInstance();