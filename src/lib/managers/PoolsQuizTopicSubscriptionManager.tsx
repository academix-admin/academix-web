import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { BackendQuizPool } from '@/models/user-display-quiz-topic-model';
import { QuizPool } from '@/models/user-display-quiz-topic-model';

export interface PoolSubscriptionModel {
  poolsId: string;
  poolsSubscriptionType: 'creator' | 'active' | 'personalized' | 'public' | 'code';
}

class PoolsQuizTopicSubscriptionManager {
  private static instance: PoolsQuizTopicSubscriptionManager;
  private activePoolsSubscriptions: Map<string, 'creator' | 'active' | 'personalized' | 'public' | 'code'> = new Map();
  private realtimeChannel: RealtimeChannel | null = null;

  private get channel(): string {
    return `public:Pools_table`;
  }

  private constructor() {}

  // Singleton pattern - get the single instance
  public static getInstance(): PoolsQuizTopicSubscriptionManager {
    if (!PoolsQuizTopicSubscriptionManager.instance) {
      PoolsQuizTopicSubscriptionManager.instance = new PoolsQuizTopicSubscriptionManager();
    }
    return PoolsQuizTopicSubscriptionManager.instance;
  }

  // Updates the subscription based on active pool IDs
  public updateSubscription(): void {
    this.cancelSubscription({ clear: false });

    if (this.activePoolsSubscriptions.size > 0) {
      const poolIds = Array.from(this.activePoolsSubscriptions.keys());

      this.realtimeChannel = supabaseBrowser
        .channel(this.channel)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'Pools_table',
            filter: `id=in.(${poolIds.join(',')})`
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
    }
  }

  // Add a new quiz topic pool, ensuring no duplicates based on poolsId
  public addQuizTopicPool(
    poolSubscriptionModel: PoolSubscriptionModel,
    options: { override?: boolean; update?: boolean } = {}
  ): boolean {
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
  private handleQuizTopicData(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: QuizPool | null,
    oldRecordId?: string
  ): void {
    console.log('Quiz topic data received:', { eventType, newRecord, oldRecordId });
    
    // Emit custom events or call callbacks that components can listen to
    this.emitChangeEvent(eventType, newRecord, oldRecordId);
  }

  // Emit custom events for components to listen to
  private emitChangeEvent(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: any | null,
    oldRecordId?: string
  ): void {
    const event = new CustomEvent('poolDataChanged', {
      detail: { eventType, newRecord, oldRecordId }
    });
    window.dispatchEvent(event);
  }

  // Handle quiz topic error
  private handleQuizTopicError(error: any): void {
    console.error('Quiz topic subscription error:', error);
  }

  // Utility method to get current subscriptions
  public getActiveSubscriptions(): Map<string, 'creator' | 'active' | 'personalized' | 'public' | 'code'> {
    return new Map(this.activePoolsSubscriptions);
  }

  // Clean up method
  public destroy(): void {
    this.cancelSubscription();
  }
}

// Export the singleton instance
export const poolsSubscriptionManager = PoolsQuizTopicSubscriptionManager.getInstance();