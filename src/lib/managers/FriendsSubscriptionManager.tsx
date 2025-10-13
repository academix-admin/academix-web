import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { BackendFriendsModel } from '@/models/friends-model';
import { FriendsModel } from '@/models/friends-model';

export interface FriendsChangeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  newRecord: FriendsModel | null;
  oldRecordId?: string;
}

export type FriendsChangeListener = (event: FriendsChangeEvent) => void;

class FriendsSubscriptionManager {
  private static instance: FriendsSubscriptionManager;
  private activeFriends: Set<string> = new Set();
  private realtimeChannel: RealtimeChannel | null = null;
  private listeners: Set<FriendsChangeListener> = new Set();

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

  // Add event listener
  public attachListener(listener: FriendsChangeListener): void {
    this.listeners.add(listener);
  }

  // Remove event listener
  public removeListener(listener: FriendsChangeListener): void {
    this.listeners.delete(listener);
  }

  // Remove all listeners
  public removeAllListeners(): void {
    this.listeners.clear();
  }

  // Updates the subscription based on active Friends IDs
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
              this.handleFriendsData(
                payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                newRecord,
                (payload.old as BackendFriendsModel | null)?.users_id
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

    // If override is true and Friends already exists, we still add it (Set will handle uniqueness)
    this.activeFriends.add(friendsId);

    if (update) {
      this.updateSubscription();
    }

    return true;
  }

  public removeFriendsId(friendsId: string, options: { update?: boolean } = {}): void {
    const { update = true } = options;

    this.activeFriends.delete(friendsId);

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
      console.log('Friends subscription cancelled');
    }

    if (clear) {
      this.activeFriends.clear();
    }
  }

  private handleFriendsData(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: FriendsModel | null,
    oldRecordId?: string
  ): void {
    console.log('Friends data received:', { eventType, newRecord, oldRecordId });

    // Notify all listeners
    this.notifyListeners(eventType, newRecord, oldRecordId);

    // Clean up subscription if record was deleted
    if (eventType === 'DELETE' && oldRecordId) {
      this.activeFriends.delete(oldRecordId);
    }
  }

  // Notify all registered listeners
  private notifyListeners(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: FriendsModel | null,
    oldRecordId?: string
  ): void {
    const event: FriendsChangeEvent = { eventType, newRecord, oldRecordId };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in Friends change listener:', error);
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

  public hasFriendsSubscription(friendsId: string): boolean {
    return this.activeFriends.has(friendsId);
  }

  // Check if currently subscribed to any Friendss
  public hasActiveSubscriptions(): boolean {
    return this.activeFriends.size > 0;
  }

  // Get the current channel status
  public getChannelStatus(): string {
    return this.realtimeChannel?.state || 'disconnected';
  }

  // Clean up method
  public destroy(): void {
    this.cancelSubscription();
    this.removeAllListeners();
    console.log('FriendsSubscriptionManager destroyed');
  }
}

// Export the singleton instance
export const friendsSubscriptionManager = FriendsSubscriptionManager.getInstance();