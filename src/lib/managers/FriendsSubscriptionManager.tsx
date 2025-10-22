import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { BackendFriendsModel } from '@/models/friends-model';
import { FriendsModel } from '@/models/friends-model';

export interface FriendsChangeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  newRecord: FriendsModel | null;
  oldRecordId?: string;
  timestamp: number;
  friendsId: string;
}

export type FriendsChangeListener = (event: FriendsChangeEvent) => void;

class FriendsSubscriptionManager {
  private static instance: FriendsSubscriptionManager;
  private activeFriends: Set<string> = new Set();
  private realtimeChannel: RealtimeChannel | null = null;
  private listeners: Map<FriendsChangeListener, number> = new Map(); // listener -> attach timestamp
  private lastEventPerFriend: Map<string, FriendsChangeEvent> = new Map(); // friendsId -> latest event

  private get channel(): string {
    return `public:users_table`;
  }

  private constructor() {}

  // Singleton pattern - get the single instance
  public static getInstance(): FriendsSubscriptionManager {
    if (!FriendsSubscriptionManager.instance) {
      FriendsSubscriptionManager.instance = new FriendsSubscriptionManager();
    }
    return FriendsSubscriptionManager.instance;
  }

  // Add event listener with optional replay of latest event
  public attachListener(listener: FriendsChangeListener, replayLatest: boolean = true): void {
    const attachTime = Date.now();
    this.listeners.set(listener, attachTime);

    // If replay is enabled, check and send latest events for all active friends
    if (replayLatest) {
      this.replayLatestEventsToListener(listener, attachTime);
    }
  }

  // Remove event listener
  public removeListener(listener: FriendsChangeListener): void {
    this.listeners.delete(listener);
  }

  // Remove all listeners
  public removeAllListeners(): void {
    this.listeners.clear();
  }

  private replayLatestEventsToListener(listener: FriendsChangeListener, listenerAttachTime: number): void {
    this.lastEventPerFriend.forEach((event) => {
      if (event.timestamp <= listenerAttachTime) {
        try {
          listener(event);
        } catch (error) {
          console.error('Error replaying event to listener:', error);
        }
      }
    });
  }

  // Get the latest event for a specific friend
  public getLatestEvent(friendsId: string): FriendsChangeEvent | null {
    return this.lastEventPerFriend.get(friendsId) || null;
  }

  // Clear latest event for a specific friend
  public clearLatestEvent(friendsId: string): void {
    this.lastEventPerFriend.delete(friendsId);
  }

  // Clear all latest events
  public clearAllLatestEvents(): void {
    this.lastEventPerFriend.clear();
  }

  // Updates the subscription based on active friends IDs
  public updateSubscription(): void {
    this.cancelSubscription({ clear: false });

    if (this.activeFriends.size > 0) {
      const friendsIds = Array.from(this.activeFriends);

      console.log('Subscribing to Friends IDs:', friendsIds);

      try {
        this.realtimeChannel = supabaseBrowser
          .channel(this.channel)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'users_table',
              filter: `users_id=in.(${friendsIds.join(',')})`
            },
            (payload: RealtimePostgresChangesPayload<BackendFriendsModel>) => {
              const newRecord = payload.new
                ? new FriendsModel(payload.new as BackendFriendsModel)
                : null;
              const friendsId = (payload.old as BackendFriendsModel | null)?.users_id ||
                               (payload.new as BackendFriendsModel | null)?.users_id ||
                               'unknown';

              this.handleFriendsData(
                payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                newRecord,
                (payload.old as BackendFriendsModel | null)?.users_id,
                friendsId
              );
            }
          )
          .subscribe((status, error) => {
            if (error) {
              this.handleFriendsError(error);
            } else {
              console.log('Friends subscription status:', status);
            }
          });

        console.log('Realtime channel status:', this.realtimeChannel);
      } catch (error) {
        console.error('Failed to create Friends subscription:', error);
      }
    }
  }

  // Add a new friend ID, ensuring no duplicates
  public addFriendsId(
    friendsId: string,
    options: { override?: boolean; update?: boolean } = {}
  ): boolean {
    console.log('Current Friends IDs:', Array.from(this.activeFriends));

    const { override = false, update = true } = options;
    const existingSubscription = this.activeFriends.has(friendsId);

    if (existingSubscription && !override) {
      return false;
    }

    // If override is true and friend already exists, we still add it (Set will handle uniqueness)
    this.activeFriends.add(friendsId);

    if (update) {
      this.updateSubscription();
    }

    return true;
  }

  // Remove a friend ID and update the subscription
  public removeFriendsId(friendsId: string, options: { update?: boolean; clearEvent?: boolean } = {}): void {
    const { update = true, clearEvent = true } = options;

    this.activeFriends.delete(friendsId);

    if (clearEvent) {
      this.clearLatestEvent(friendsId);
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
      console.log('Friends subscription cancelled');
    }

    if (clear) {
      this.activeFriends.clear();
    }

    if (clearEvents) {
      this.clearAllLatestEvents();
    }
  }

  // Handle friends data
  private handleFriendsData(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: FriendsModel | null,
    oldRecordId?: string,
    friendsId?: string
  ): void {
    console.log('Friends data received:', { eventType, newRecord, oldRecordId });

    const actualFriendsId = friendsId || newRecord?.usersId || oldRecordId || 'unknown';

    // Create event with timestamp
    const event: FriendsChangeEvent = {
      eventType,
      newRecord,
      oldRecordId,
      timestamp: Date.now(),
      friendsId: actualFriendsId
    };

    // Store as latest event for this friend
    this.lastEventPerFriend.set(actualFriendsId, event);

    // Notify all listeners
    this.notifyListeners(event);

    // Clean up subscription if record was deleted
    if (eventType === 'DELETE' && oldRecordId) {
      this.activeFriends.delete(oldRecordId);
      this.clearLatestEvent(oldRecordId);
    }
  }

  // Notify all registered listeners
  private notifyListeners(event: FriendsChangeEvent): void {
    this.listeners.forEach((attachTime, listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in friends change listener:', error);
      }
    });
  }

  private handleFriendsError(error: any): void {
    console.error('Friends subscription error:', error);
  }

  // Utility method to get current subscriptions
  public getActiveSubscriptions(): string[] {
    return Array.from(this.activeFriends);
  }

  // Check if a specific friend is being subscribed to
  public hasFriendsSubscription(friendsId: string): boolean {
    return this.activeFriends.has(friendsId);
  }

  // Check if currently subscribed to any friends
  public hasActiveSubscriptions(): boolean {
    return this.activeFriends.size > 0;
  }

  // Get the current channel status
  public getChannelStatus(): string {
    return this.realtimeChannel?.state || 'disconnected';
  }

  // Get all latest events (for debugging)
  public getAllLatestEvents(): Map<string, FriendsChangeEvent> {
    return new Map(this.lastEventPerFriend);
  }

  // Add multiple friend IDs in batch
  public addMultipleFriendsIds(
    friendsIds: string[],
    options: { override?: boolean; update?: boolean } = {}
  ): number {
    let addedCount = 0;

    friendsIds.forEach(friendsId => {
      if (this.addFriendsId(friendsId, { ...options, update: false })) {
        addedCount++;
      }
    });

    if (options.update !== false && addedCount > 0) {
      this.updateSubscription();
    }

    return addedCount;
  }

  // Remove multiple friend IDs in batch
  public removeMultipleFriendsIds(
    friendsIds: string[],
    options: { update?: boolean; clearEvents?: boolean } = {}
  ): void {
    const { update = true, clearEvents = true } = options;

    friendsIds.forEach(friendsId => {
      this.activeFriends.delete(friendsId);
      if (clearEvents) {
        this.clearLatestEvent(friendsId);
      }
    });

    if (update) {
      this.updateSubscription();
    }
  }

  // Get subscription count
  public getSubscriptionCount(): number {
    return this.activeFriends.size;
  }

  // Get listener count
  public getListenerCount(): number {
    return this.listeners.size;
  }

  // Check if specific listener is attached
  public hasListener(listener: FriendsChangeListener): boolean {
    return this.listeners.has(listener);
  }

  // Clean up method
  public destroy(): void {
    this.cancelSubscription({ clear: true, clearEvents: true });
    this.removeAllListeners();
    console.log('FriendsSubscriptionManager destroyed');
  }
}

// Export the singleton instance
export const friendsSubscriptionManager = FriendsSubscriptionManager.getInstance();