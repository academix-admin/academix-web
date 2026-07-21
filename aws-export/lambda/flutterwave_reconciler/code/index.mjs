import { createClient } from "@supabase/supabase-js";
import Flutterwave from 'flutterwave-node-v3';
import fetch from 'node-fetch';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const flw      = new Flutterwave(
  process.env.FLUTTERWAVE_PUBLIC_KEY,
  process.env.FLUTTERWAVE_SECRET_KEY
);

// VAT rate applied on top of Flutterwave fees.
// Matches the rate used in the wallet-rate-updater for consistency.
const FW_VAT_RATE = 0.075; // 7.5%

const MAX_RETRIES = 5;

// =============================================================================
//  FLUTTERWAVE HELPERS
// =============================================================================

async function fetchFlutterwaveBalance(currency) {
  try {
    const res  = await fetch(`https://api.flutterwave.com/v3/balances/${currency}`, {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== 'success') throw new Error(json.message || 'FW balance API error');
    const balance = parseFloat(json.data.available_balance);
    console.log(`fetchFlutterwaveBalance: ${currency} → ${balance}`);
    return balance;
  } catch (err) {
    console.error(`fetchFlutterwaveBalance failed for ${currency}:`, err.message);
    return null;
  }
}

// =============================================================================
//  LEDGER
// =============================================================================

/**
 * Writes a ledger entry for a reconciled transaction.
 * By this point, transaction_flutterwave_fee has been stored on the row
 * from the FW verify response. write_wallet_ledger_entry reads it from there.
 */
async function writeLedgerEntry(transactionId, currency) {
  try {
    const fwBalance = await fetchFlutterwaveBalance(currency);

    const { data, error } = await supabase.rpc('write_wallet_ledger_entry', {
      p_transaction_id:      transactionId,
      p_flutterwave_balance: fwBalance,
      p_source:              'reconciler'
    });

    if (error) {
      console.error('LEDGER WRITE FAILED:', {
        transactionId, currency, error: error.message
      });
      return null;
    }

    console.log('LEDGER: entry written by reconciler:', { transactionId, currency });
    return data;
  } catch (err) {
    console.error('LEDGER: unexpected error:', err.message, { transactionId });
    return null;
  }
}

// =============================================================================
//  HANDLER ENTRY POINT
// =============================================================================

export const handler = async () => {
  console.log('Ledger reconciler: starting');

  // Fetch unreconciled transactions — excludes failed transactions and rows
  // that have hit the retry cap. Returns oldest confirmed_at first so
  // running balance ordering is preserved on insert.
  const { data: rows, error } = await supabase.rpc(
    'get_unreconciled_ledger_transactions',
    { p_limit: 50, p_max_retries: MAX_RETRIES }
  );

  if (error) {
    console.error('Failed to fetch unreconciled rows:', error.message);
    return;
  }

  if (!rows?.length) {
    console.log('Ledger reconciler: nothing to process');
    return;
  }

  const pendingCount = rows.filter(r => r.ledger_status === 'pending').length;
  const failedCount  = rows.filter(r => r.ledger_status === 'failed').length;
  console.log(`Reconciler: ${rows.length} rows — pending=${pendingCount} failed=${failedCount}`);

  // Fetch FW balances once per currency — reused across all rows of same currency
  const currencies  = [...new Set(rows.map(r => r.currency).filter(Boolean))];
  const balanceMap  = Object.fromEntries(
    await Promise.all(currencies.map(async c => [c, await fetchFlutterwaveBalance(c)]))
  );

  const summary = { written: 0, failed: 0, skipped: 0 };

  // Sequential — ledger running balance requires ordered inserts.
  // get_unreconciled_ledger_transactions returns rows ORDER BY confirmed_at ASC
  // so oldest missed transactions are written first.
  for (const row of rows) {

    // No FW ID — transaction was never confirmed by FW, should not be in the queue
    if (!row.transaction_external_id) {
      console.warn('Reconciler: no external_id for', row.transaction_id,
        `(retries=${row.ledger_retries}) — skipping`);
      summary.skipped++;
      continue;
    }

    try {
      // ── Re-verify using FW's stored transaction ID ──────────────────────────
      // This gives us app_fee as charged at transaction time — not today's rate.
      // This is the key correctness guarantee: the reconciler never calls the
      // fee API, it always reads the historical fee from FW's own record.
      const verification = await flw.Transaction.verify({
        id: parseInt(row.transaction_external_id, 10)
      });

      if (verification.status !== 'success') {
        console.error('Reconciler: FW verify API failed for', row.transaction_id,
          verification.message);
        summary.failed++;
        continue;
      }

      const fwData   = verification.data;
      const fwStatus = fwData.status?.toLowerCase();

      // FW says this transaction did not succeed — clear the ledger queue.
      // A failed payment must never produce a ledger entry.
      if (fwStatus !== 'successful') {
        console.warn('Reconciler: FW status is', fwStatus, 'for', row.transaction_id,
          '— clearing ledger queue, no entry written');
        await supabase
          .from('transaction_table')
          .update({
            transaction_ledger_status: null,
            transaction_updated_at:    new Date().toISOString()
          })
          .eq('transaction_id', row.transaction_id);
        summary.skipped++;
        continue;
      }

      const appFee = (fwData.app_fee ?? 0) * (1 + FW_VAT_RATE);

      // Store the historical fee on the transaction row so write_wallet_ledger_entry
      // reads it. Only update if not already set — the live confirmation path may
      // have already stored it; we never overwrite a previously stored value.
      await supabase
        .from('transaction_table')
        .update({ transaction_flutterwave_fee: appFee })
        .eq('transaction_id', row.transaction_id)
        .is('transaction_flutterwave_fee', null);

      // Write the ledger entry — DB function reads fee from the row we just updated
      const result = await writeLedgerEntry(row.transaction_id, row.currency);

      if (result) {
        console.log('Reconciler: success for', row.transaction_id,
          `app_fee=${appFee} currency=${row.currency} retry=${row.ledger_retries}`);
        summary.written++;
      } else {
        // writeLedgerEntry already logged the error and the DB function
        // incremented transaction_ledger_retries in its EXCEPTION block
        summary.failed++;
      }

    } catch (err) {
      console.error('Reconciler: unexpected error for', row.transaction_id, err.message);
      summary.failed++;
    }
  }

  console.log('Ledger reconciler: done —', summary);

  // Emit a searchable error line for CloudWatch alarm
  if (summary.failed > 0) {
    console.error(`RECONCILER_FAILURES count=${summary.failed}`);
  }
};