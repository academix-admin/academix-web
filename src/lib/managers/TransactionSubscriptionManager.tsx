import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { BackendTransactionModel } from '@/models/transaction-model';
import { TransactionModel } from '@/models/transaction-model';

export interface TransactionChangeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  newRecord: TransactionModel | null;
  oldRecordId?: string;
  timestamp: number;
  transactionId: string;
}

export type TransactionChangeListener = (event: TransactionChangeEvent) => void;

class TransactionSubscriptionManager {
  private static instance: TransactionSubscriptionManager;
  private activeTransactions: Set<string> = new Set();
  private realtimeChannel: RealtimeChannel | null = null;
  private listeners: Map<TransactionChangeListener, number> = new Map(); // listener -> attach timestamp
  private lastEventPerTransaction: Map<string, TransactionChangeEvent> = new Map(); // transactionId -> latest event

  private get channel(): string {
    return `public:transaction_table`;
  }

  private constructor() {}

  // Singleton pattern - get the single instance
  public static getInstance(): TransactionSubscriptionManager {
    if (!TransactionSubscriptionManager.instance) {
      TransactionSubscriptionManager.instance = new TransactionSubscriptionManager();
    }
    return TransactionSubscriptionManager.instance;
  }

  // Add event listener with optional replay of latest event
  public attachListener(listener: TransactionChangeListener, replayLatest: boolean = true): void {
    const attachTime = Date.now();
    this.listeners.set(listener, attachTime);

    // If replay is enabled, check and send latest events for all active transactions
    if (replayLatest) {
      this.replayLatestEventsToListener(listener, attachTime);
    }
  }

  // Remove event listener
  public removeListener(listener: TransactionChangeListener): void {
    this.listeners.delete(listener);
  }

  // Remove all listeners
  public removeAllListeners(): void {
    this.listeners.clear();
  }

  private replayLatestEventsToListener(listener: TransactionChangeListener, listenerAttachTime: number): void {
    this.lastEventPerTransaction.forEach((event) => {
      if (event.timestamp <= listenerAttachTime) {
        try {
          listener(event);
        } catch (error) {
          console.error('Error replaying event to listener:', error);
        }
      }
    });
  }

  // Get the latest event for a specific transaction
  public getLatestEvent(transactionId: string): TransactionChangeEvent | null {
    return this.lastEventPerTransaction.get(transactionId) || null;
  }

  // Clear latest event for a specific transaction
  public clearLatestEvent(transactionId: string): void {
    this.lastEventPerTransaction.delete(transactionId);
  }

  // Clear all latest events
  public clearAllLatestEvents(): void {
    this.lastEventPerTransaction.clear();
  }

  // Updates the subscription based on active transaction IDs
  public updateSubscription(): void {
    this.cancelSubscription({ clear: false });

    if (this.activeTransactions.size > 0) {
      const transactionIds = Array.from(this.activeTransactions);


      try {
        this.realtimeChannel = supabaseBrowser
          .channel(this.channel)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'transaction_table',
              filter: `transaction_id=in.(${transactionIds.join(',')})`
            },
            (payload: RealtimePostgresChangesPayload<BackendTransactionModel>) => {
              const newRecord = payload.new
                ? TransactionModel.fromStream(payload.new as BackendTransactionModel)
                : null;
              const transactionId = (payload.old as BackendTransactionModel | null)?.transaction_id ||
                                   (payload.new as BackendTransactionModel | null)?.transaction_id ||
                                   'unknown';

              this.handleTransactionData(
                payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                newRecord,
                (payload.old as BackendTransactionModel | null)?.transaction_id,
                transactionId
              );
            }
          )
          .subscribe((status, error) => {
            if (error) {
              this.handleTransactionError(error);
            } else {
              console.log('Transaction subscription status:', status);
            }
          });

        console.log('Realtime channel status:', this.realtimeChannel);
      } catch (error) {
        console.error('Failed to create transaction subscription:', error);
      }
    }
  }

  // Add a new transaction ID, ensuring no duplicates
  public addTransactionId(
    transactionId: string,
    options: { override?: boolean; update?: boolean } = {}
  ): boolean {

    const { override = false, update = true } = options;
    const existingSubscription = this.activeTransactions.has(transactionId);

    if (existingSubscription && !override) {
      return false;
    }

    // If override is true and transaction already exists, we still add it (Set will handle uniqueness)
    this.activeTransactions.add(transactionId);

    if (update) {
      this.updateSubscription();
    }

    return true;
  }

  // Remove a transaction ID and update the subscription
  public removeTransactionId(transactionId: string, options: { update?: boolean; clearEvent?: boolean } = {}): void {
    const { update = true, clearEvent = true } = options;

    this.activeTransactions.delete(transactionId);

    if (clearEvent) {
      this.clearLatestEvent(transactionId);
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
      console.log('Transaction subscription cancelled');
    }

    if (clear) {
      this.activeTransactions.clear();
    }

    if (clearEvents) {
      this.clearAllLatestEvents();
    }
  }

  // Handle transaction data
  private handleTransactionData(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: TransactionModel | null,
    oldRecordId?: string,
    transactionId?: string
  ): void {

    const actualTransactionId = transactionId || newRecord?.transactionId || oldRecordId || 'unknown';

    // Create event with timestamp
    const event: TransactionChangeEvent = {
      eventType,
      newRecord,
      oldRecordId,
      timestamp: Date.now(),
      transactionId: actualTransactionId
    };

    // Store as latest event for this transaction
    this.lastEventPerTransaction.set(actualTransactionId, event);

    // Notify all listeners
    this.notifyListeners(event);

    // Clean up subscription if record was deleted
    if (eventType === 'DELETE' && oldRecordId) {
      this.activeTransactions.delete(oldRecordId);
      this.clearLatestEvent(oldRecordId);
    }
  }

  // Notify all registered listeners
  private notifyListeners(event: TransactionChangeEvent): void {
    this.listeners.forEach((attachTime, listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in transaction change listener:', error);
      }
    });
  }

  private handleTransactionError(error: any): void {
    console.error('Transaction subscription error:', error);
  }

  // Utility method to get current subscriptions
  public getActiveSubscriptions(): string[] {
    return Array.from(this.activeTransactions);
  }

  // Check if a specific transaction is being subscribed to
  public hasTransactionSubscription(transactionId: string): boolean {
    return this.activeTransactions.has(transactionId);
  }

  // Check if currently subscribed to any transactions
  public hasActiveSubscriptions(): boolean {
    return this.activeTransactions.size > 0;
  }

  // Get the current channel status
  public getChannelStatus(): string {
    return this.realtimeChannel?.state || 'disconnected';
  }

  // Get all latest events (for debugging)
  public getAllLatestEvents(): Map<string, TransactionChangeEvent> {
    return new Map(this.lastEventPerTransaction);
  }

  // Add multiple transaction IDs in batch
  public addMultipleTransactionIds(
    transactionIds: string[],
    options: { override?: boolean; update?: boolean } = {}
  ): number {
    let addedCount = 0;

    transactionIds.forEach(transactionId => {
      if (this.addTransactionId(transactionId, { ...options, update: false })) {
        addedCount++;
      }
    });

    if (options.update !== false && addedCount > 0) {
      this.updateSubscription();
    }

    return addedCount;
  }

  // Remove multiple transaction IDs in batch
  public removeMultipleTransactionIds(
    transactionIds: string[],
    options: { update?: boolean; clearEvents?: boolean } = {}
  ): void {
    const { update = true, clearEvents = true } = options;

    transactionIds.forEach(transactionId => {
      this.activeTransactions.delete(transactionId);
      if (clearEvents) {
        this.clearLatestEvent(transactionId);
      }
    });

    if (update) {
      this.updateSubscription();
    }
  }

  // Clean up method
  public destroy(): void {
    this.cancelSubscription({ clear: true, clearEvents: true });
    this.removeAllListeners();
    console.log('TransactionSubscriptionManager destroyed');
  }
}

// Export the singleton instance
export const transactionSubscriptionManager = TransactionSubscriptionManager.getInstance();