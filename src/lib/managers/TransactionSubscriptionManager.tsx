import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { BackendTransactionModel } from '@/models/transaction-model';
import { TransactionModel } from '@/models/transaction-model';

export interface TransactionChangeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  newRecord: TransactionModel | null;
  oldRecordId?: string;
}

export type TransactionChangeListener = (event: TransactionChangeEvent) => void;

class TransactionSubscriptionManager {
  private static instance: TransactionSubscriptionManager;
  private activeTransactions: Set<string> = new Set();
  private realtimeChannel: RealtimeChannel | null = null;
  private listeners: Set<TransactionChangeListener> = new Set();

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

  // Add event listener
  public attachListener(listener: TransactionChangeListener): void {
    this.listeners.add(listener);
  }

  // Remove event listener
  public removeListener(listener: TransactionChangeListener): void {
    this.listeners.delete(listener);
  }

  // Remove all listeners
  public removeAllListeners(): void {
    this.listeners.clear();
  }

  // Updates the subscription based on active transaction IDs
  public updateSubscription(): void {
    this.cancelSubscription({ clear: false });

    if (this.activeTransactions.size > 0) {
      const transactionIds = Array.from(this.activeTransactions);

      console.log('Subscribing to transaction IDs:', transactionIds);

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
              this.handleTransactionData(
                payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                newRecord,
                (payload.old as BackendTransactionModel | null)?.transaction_id
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

  public addTransactionId(
    transactionId: string,
    options: { override?: boolean; update?: boolean } = {}
  ): boolean {
    console.log('Current transaction IDs:', Array.from(this.activeTransactions));

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

  public removeTransactionId(transactionId: string, options: { update?: boolean } = {}): void {
    const { update = true } = options;

    this.activeTransactions.delete(transactionId);

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
      console.log('Transaction subscription cancelled');
    }

    if (clear) {
      this.activeTransactions.clear();
    }
  }

  private handleTransactionData(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: TransactionModel | null,
    oldRecordId?: string
  ): void {
    console.log('Transaction data received:', { eventType, newRecord, oldRecordId });

    // Notify all listeners
    this.notifyListeners(eventType, newRecord, oldRecordId);

    // Clean up subscription if record was deleted
    if (eventType === 'DELETE' && oldRecordId) {
      this.activeTransactions.delete(oldRecordId);
    }
  }

  // Notify all registered listeners
  private notifyListeners(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: TransactionModel | null,
    oldRecordId?: string
  ): void {
    const event: TransactionChangeEvent = { eventType, newRecord, oldRecordId };

    this.listeners.forEach(listener => {
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

  // Clean up method
  public destroy(): void {
    this.cancelSubscription();
    this.removeAllListeners();
    console.log('TransactionSubscriptionManager destroyed');
  }
}

// Export the singleton instance
export const transactionSubscriptionManager = TransactionSubscriptionManager.getInstance();