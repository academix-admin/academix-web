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
  timestamp: number;
  poolId: string;
}

export type PoolChangeListener = (event: PoolChangeEvent) => void;

class PoolsQuizTopicSubscriptionManager {
  private static instance: PoolsQuizTopicSubscriptionManager;
  private activePoolsSubscriptions: Map<string, 'creator' | 'active' | 'personalized' | 'public' | 'code' | string> = new Map();
  private realtimeChannel: RealtimeChannel | null = null;
  private listeners: Map<PoolChangeListener, number> = new Map(); // listener -> attach timestamp
  private lastEventPerPool: Map<string, PoolChangeEvent> = new Map(); // poolId -> latest event

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

  // Add event listener with optional replay of latest event
  public attachListener(listener: PoolChangeListener, replayLatest: boolean = true): void {
    const attachTime = Date.now();
    this.listeners.set(listener, attachTime);

    // If replay is enabled, check and send latest events for all active pools
    if (replayLatest) {
      this.replayLatestEventsToListener(listener, attachTime);
    }
  }

  // Remove event listener
  public removeListener(listener: PoolChangeListener): void {
    this.listeners.delete(listener);
  }

  // Remove all listeners
  public removeAllListeners(): void {
    this.listeners.clear();
  }

  private replayLatestEventsToListener(listener: PoolChangeListener, listenerAttachTime: number): void {
    this.lastEventPerPool.forEach((event) => {
      if (event.timestamp <= listenerAttachTime) {
        try {
          listener(event);
        } catch (error) {
          console.error('Error replaying event to listener:', error);
        }
      }
    });
  }


  // Get the latest event for a specific pool
  public getLatestEvent(poolId: string): PoolChangeEvent | null {
    return this.lastEventPerPool.get(poolId) || null;
  }

  // Clear latest event for a specific pool
  public clearLatestEvent(poolId: string): void {
    this.lastEventPerPool.delete(poolId);
  }

  // Clear all latest events
  public clearAllLatestEvents(): void {
    this.lastEventPerPool.clear();
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
            table: 'pools_table',
            filter: `pools_id=in.(${poolIds.join(',')})`
          },
          (payload: RealtimePostgresChangesPayload<BackendQuizPool>) => {
            const newRecord = payload.new
              ? new QuizPool(payload.new as BackendQuizPool)
              : null;
            const poolId = (payload.old as BackendQuizPool | null)?.pools_id ||
                          (payload.new as BackendQuizPool | null)?.pools_id ||
                          'unknown';

            this.handleQuizTopicData(
              payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              newRecord,
              (payload.old as BackendQuizPool | null)?.pools_id,
              poolId
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
    const poolIds = Array.from(this.activePoolsSubscriptions.keys());


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
  public removeQuizTopicPool(poolsId: string, options: { update?: boolean; clearEvent?: boolean } = {}): void {
    const { update = true, clearEvent = true } = options;

    this.activePoolsSubscriptions.delete(poolsId);

    if (clearEvent) {
      this.clearLatestEvent(poolsId);
    }

    if (update) {
      this.updateSubscription();
    }
  }

  // Optional: Cancel the subscription entirely
  public cancelSubscription(options: { clear?: boolean; clearEvents?: boolean } = {}): void {
    const { clear = true, clearEvents = true } = options;

    if (this.realtimeChannel) {
      supabaseBrowser.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    if (clear) {
      this.activePoolsSubscriptions.clear();
    }

    if (clearEvents) {
      this.clearAllLatestEvents();
    }
  }

  // Handle quiz topic data
  public handleQuizTopicData(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: QuizPool | null,
    oldRecordId?: string,
    poolId?: string
  ): void {

    const actualPoolId = poolId || newRecord?.poolsId || oldRecordId || 'unknown';

    // Create event with timestamp
    const event: PoolChangeEvent = {
      eventType,
      newRecord,
      oldRecordId,
      timestamp: Date.now(),
      poolId: actualPoolId
    };

    // Store as latest event for this pool
    this.lastEventPerPool.set(actualPoolId, event);

    // Notify all listeners
    this.notifyListeners(event);

    // Clean up subscription if record was deleted
    if (eventType === 'DELETE' && oldRecordId) {
      this.activePoolsSubscriptions.delete(oldRecordId);
      this.clearLatestEvent(oldRecordId);
    }
  }

  // Notify all registered listeners
  private notifyListeners(event: PoolChangeEvent): void {
    this.listeners.forEach((attachTime, listener) => {
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

  // Get all latest events (for debugging)
  public getAllLatestEvents(): Map<string, PoolChangeEvent> {
    return new Map(this.lastEventPerPool);
  }

  // Clean up method
  public destroy(): void {
    this.cancelSubscription({ clear: true, clearEvents: true });
    this.removeAllListeners();
  }
}

// Export the singleton instance
export const poolsSubscriptionManager = PoolsQuizTopicSubscriptionManager.getInstance();