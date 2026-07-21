import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

// ======================
//  CONFIGURATION
// ======================
const CONFIG = {
  EXCHANGE_RATE_API: "https://api.exchangerate-api.com/v4/latest/USD",
  FLUTTERWAVE_API: "https://api.flutterwave.com/v3",
  USD_TO_ADC: 1000,   // 1 ADC = 0.001 USD (pegged)
  MIN_SPREAD: 0.0025, // Minimum buy/sell spread
  RETRIES: 3,         // Exchange rate API retry attempts

  // Fee Classification
  // If fee amount changes by less than this % across all probe points -> flat
  // If it exceeds this at any consecutive pair -> percentage-based
  FIXED_FEE_TOLERANCE: 0.01, // 1%

  // Probe Point Strategy (log scale)
  // Inner positions as fractions of the LOG range between min and max.
  // min and max are always included -- only define the inner points here.
  //
  // Log scale is used because fee tier boundaries almost always occur in
  // the lower portion of a range. Log scale clusters points there naturally,
  // regardless of how wide the range is -- unlike linear which creates blind
  // spots at the bottom when max is very large.
  //
  // Defaults [0.59, 0.94] produce:
  //   min=100, max=50000    -> [100,  ~3900, ~34400,   50000]
  //   min=100, max=5000000  -> [100, ~59000, ~2600000, 5000000]
  //   min=1700, max=500000  -> [1700, ~48600, ~355000, 500000]
  //
  // Tune by adding/adjusting fractions -- e.g. [0.3, 0.59, 0.94] for 5 points.
  PROBE_INNER_POSITIONS: [0.59, 0.94],

  // Wallet processing strategy: group by currency, process groups sequentially.
  //
  // Wallets sharing a currency hit the same Flutterwave rate-limit bucket, so
  // running them all in parallel exhausts the quota for late-run wallets.
  // Grouping by currency means:
  //   - Within a group: all wallets run in parallel (same params, small group).
  //   - Between groups: a configurable pause lets the bucket partially refill.
  //
  // CURRENCY_GROUP_CONCURRENCY: max wallets running in parallel within one group.
  // CURRENCY_GROUP_DELAY_MS_PER_WALLET: pause per wallet in the previous group.
  //   e.g. after XOF (8 wallets): 300 * 8 = 2400ms pause
  //        after NGN (1 wallet):  300 * 1 =  300ms pause
  CURRENCY_GROUP_CONCURRENCY: 5,
  CURRENCY_GROUP_DELAY_MS_PER_WALLET: 300,

  // VAT rate applied on top of fees.
  // Applied to both collection fees (sum of all fee fields) and transfer fees
  // (on the resolved fee value after fee_type conversion).
  COLLECTION_VAT_RATE: 0.075, // 7.5%

  // Collection fee fields to exclude when summing all numeric fields in the
  // /transactions/fee response. charge_amount is the transaction amount echoed
  // back -- not a fee. Add any future non-fee numeric fields here.
  COLLECTION_FEE_EXCLUDE_FIELDS: new Set(["charge_amount"]),
};

// ======================
//  SUPABASE CLIENT
// ======================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ======================
//  ENTRY POINT
// ======================
export const handler = async (event) => {
  const log = {
    startTime: new Date().toISOString(),
    ratesFetched: false,
    walletsProcessed: 0,
    updatesSucceeded: 0,
    updatesFailed: 0,
    skipped: 0,
    warnings: [],
  };

  try {
    const [rates, wallets] = await Promise.all([
      fetchExchangeRates(),
      fetchWallets(),
    ]);

    log.ratesFetched = true;
    log.walletsProcessed = wallets.length;

    const currencyGroups = new Map();
    for (const wallet of wallets) {
      const c = wallet.payment_wallet_currency;
      if (!currencyGroups.has(c)) currencyGroups.set(c, []);
      currencyGroups.get(c).push(wallet);
    }

    const allResults = [];
    let prevGroupSize = 0;
    for (const [, group] of currencyGroups) {
      if (prevGroupSize > 0) {
        await sleep(CONFIG.CURRENCY_GROUP_DELAY_MS_PER_WALLET * prevGroupSize);
      }
      const groupResults = await pLimit(
        group.map((wallet) => () => processWallet(wallet, rates, log)),
        CONFIG.CURRENCY_GROUP_CONCURRENCY
      );
      allResults.push(...groupResults);
      prevGroupSize = group.length;
    }

    log.endTime = new Date().toISOString();
    console.log({ summary: log, details: allResults });
    return { statusCode: 200, body: JSON.stringify({ summary: log, details: allResults }, null, 2) };
  } catch (err) {
    log.endTime = new Date().toISOString();
    log.fatalError = err.message;
    console.error("Fatal error:", err);
    return { statusCode: 500, body: JSON.stringify(log, null, 2) };
  }
};

// ======================
//  DATA FETCHERS
// ======================

/**
 * Fetches USD-based exchange rates with exponential backoff retry.
 * Throws after all retries exhausted -- fatal, no point running without rates.
 */
async function fetchExchangeRates() {
  for (let attempt = 1; attempt <= CONFIG.RETRIES; attempt++) {
    try {
      const res = await fetch(CONFIG.EXCHANGE_RATE_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.rates) throw new Error("No rates in response");
      return json.rates;
    } catch (err) {
      if (attempt === CONFIG.RETRIES) throw new Error(`Exchange rate fetch failed after ${CONFIG.RETRIES} attempts: ${err.message}`);
      await sleep(1000 * attempt);
    }
  }
}

/**
 * Fetches all wallets and their distinct active payment methods, resolving
 * each checker to Flutterwave API strings via the DB's resolve_flutterwave_method().
 *
 * Each wallet is augmented with:
 *   collectionMethods: string[]  -- unique FW payment_type values for buy probing
 *   transferTypes:     string[]  -- unique FW type values for sell resolution
 *
 * Throws on error -- fatal, nothing to process without wallets.
 */
async function fetchWallets() {
  const [walletsResult, methodsResult] = await Promise.all([
    supabase.from("payment_wallet_table").select("*"),
    supabase
      .from("payment_method_table")
      .select("payment_wallet_id, payment_method_checker")
      .or("payment_method_buy_active.eq.true,payment_method_sell_active.eq.true"),
  ]);

  if (walletsResult.error) throw new Error(`Wallet fetch failed: ${walletsResult.error.message}`);
  if (!walletsResult.data?.length) throw new Error("No wallets returned");
  if (methodsResult.error) throw new Error(`Method fetch failed: ${methodsResult.error.message}`);

  const distinctCheckers = [...new Set(
    (methodsResult.data ?? []).map((r) => r.payment_method_checker)
  )];

  const resolvedMap = new Map();
  await Promise.all(
    distinctCheckers.map(async (checker) => {
      const { data, error } = await supabase.rpc("resolve_flutterwave_method", {
        p_method_checker: checker,
      });
      if (error) {
        console.warn(`resolve_flutterwave_method failed for ${checker}:`, error.message);
        resolvedMap.set(checker, null);
      } else {
        resolvedMap.set(checker, data);
      }
    })
  );

  const methodsByWallet = new Map();
  for (const row of methodsResult.data ?? []) {
    const resolved = resolvedMap.get(row.payment_method_checker);
    if (!resolved) continue;

    if (!methodsByWallet.has(row.payment_wallet_id)) {
      methodsByWallet.set(row.payment_wallet_id, {
        collectionMethods: new Set(),
        transferTypes: new Set(),
      });
    }
    const entry = methodsByWallet.get(row.payment_wallet_id);
    if (resolved.collection_method) entry.collectionMethods.add(resolved.collection_method);
    if (resolved.transfer_type)     entry.transferTypes.add(resolved.transfer_type);
  }

  return walletsResult.data.map((wallet) => {
    const methods = methodsByWallet.get(wallet.payment_wallet_id);
    return {
      ...wallet,
      collectionMethods: methods ? [...methods.collectionMethods] : [],
      transferTypes:     methods ? [...methods.transferTypes]     : [],
    };
  });
}

// ======================
//  PROBE POINT BUILDER
// ======================

/**
 * Builds probe amounts on a log scale across [min, max].
 * Always includes min and max. Inner points placed at PROBE_INNER_POSITIONS
 * fractions of the log10 range, then rounded to integers.
 */
function buildProbeAmounts(min, max) {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logRange = logMax - logMin;

  const inner = CONFIG.PROBE_INNER_POSITIONS.map((pos) =>
    Math.round(Math.pow(10, logMin + pos * logRange))
  );

  return [...new Set([min, ...inner, max])]
    .map((p) => Math.min(Math.max(p, min), max))
    .sort((a, b) => a - b);
}

// ======================
//  FEE CLASSIFICATION
// ======================

// Minimum percentage that makes sense to store as RateType.PERCENT.
// Below this threshold the fee is effectively flat relative to any realistic
// transaction amount and should be stored as RateType.FEE instead.
const MIN_MEANINGFUL_PERCENT = 0.01; // 0.01%

/**
 * Classifies a fee as flat (RateType.FEE) or percentage (RateType.PERCENT)
 * by checking relative change between every consecutive probe point pair.
 *
 * Only reached for pure value-type transfer fees (NGN, KES, RWF) and all
 * collection fees. Mixed-type transfer fees (TZS, UGX) are resolved earlier
 * as RateType.FUNCTION and never reach this function.
 *
 * All returned classifications include fee_flat: 0 for consistent DB writes.
 *
 * @param {Array<{amount: number, feeAmount: number}>} probePoints - sorted ascending
 */
function classifyFee(probePoints) {
  const maxProbe = probePoints[probePoints.length - 1];
  let isFixed = true;
  let maxDelta = 0;

  if (probePoints.length === 1) {
    const feePercent = (maxProbe.feeAmount / maxProbe.amount) * 100;
    if (feePercent < MIN_MEANINGFUL_PERCENT) {
      return {
        fee_type: "RateType.FEE",
        fee:      parseFloat(maxProbe.feeAmount.toFixed(4)),
        fee_flat: 0,
        reasoning: `Single probe point, computed % too small (${feePercent.toFixed(4)}% < ${MIN_MEANINGFUL_PERCENT}%) -- storing as flat ${maxProbe.feeAmount.toFixed(4)} at max ${maxProbe.amount}`,
      };
    }
    return {
      fee_type: "RateType.PERCENT",
      fee:      parseFloat(feePercent.toFixed(4)),
      fee_flat: 0,
      reasoning: `Single probe point only -- defaulting to percentage (conservative). ${feePercent.toFixed(4)}% at ${maxProbe.amount}`,
    };
  }

  for (let i = 1; i < probePoints.length; i++) {
    const prev = probePoints[i - 1].feeAmount;
    const curr = probePoints[i].feeAmount;
    // Use max(prev, curr, 0.0001) as denominator -- prevents a jump from near-zero
    // (e.g. tiered minimum not yet active) to a real flat value from producing a
    // falsely huge delta that misclassifies what is effectively a flat fee.
    const delta = Math.abs(curr - prev) / Math.max(prev, curr, 0.0001);
    if (delta > maxDelta) maxDelta = delta;
    if (delta > CONFIG.FIXED_FEE_TOLERANCE) {
      isFixed = false;
      break;
    }
  }

  if (isFixed) {
    return {
      fee_type: "RateType.FEE",
      fee:      parseFloat(maxProbe.feeAmount.toFixed(4)),
      fee_flat: 0,
      reasoning: `Fixed across all ${probePoints.length} points (max delta=${(maxDelta * 100).toFixed(2)}%). Flat: ${maxProbe.feeAmount.toFixed(4)} at max ${maxProbe.amount}`,
    };
  }

  const feePercent = (maxProbe.feeAmount / maxProbe.amount) * 100;
  if (feePercent < MIN_MEANINGFUL_PERCENT) {
    return {
      fee_type: "RateType.FEE",
      fee:      parseFloat(maxProbe.feeAmount.toFixed(4)),
      fee_flat: 0,
      reasoning: `Dynamic (max delta=${(maxDelta * 100).toFixed(2)}%) but computed % too small (${feePercent.toFixed(4)}% < ${MIN_MEANINGFUL_PERCENT}%) -- storing as flat ${maxProbe.feeAmount.toFixed(4)} at max ${maxProbe.amount}`,
    };
  }

  return {
    fee_type: "RateType.PERCENT",
    fee:      parseFloat(feePercent.toFixed(4)),
    fee_flat: 0,
    reasoning: `Dynamic (max delta=${(maxDelta * 100).toFixed(2)}% > ${CONFIG.FIXED_FEE_TOLERANCE * 100}% threshold). ${feePercent.toFixed(4)}% at max ${maxProbe.amount}`,
  };
}

// ======================
//  FLUTTERWAVE FEE PROBING
// ======================

/**
 * Generic probe runner for both collection and transfer fees.
 *
 * Fee type resolution:
 *
 *   RateType.PERCENT  -- clean percentage-only Flutterwave response.
 *                        Early-resolved on first probe. fee_flat = 0.
 *                        fee = rawPercent * 100 * (1 + VAT)
 *
 *   RateType.FUNCTION -- mixed percentage+value Flutterwave response (TZS, UGX).
 *                        Flutterwave charges max(flat, percent * amount) internally.
 *                        We store both legs so the client mirrors this exactly.
 *                        fee = realPercentWithVAT (the % leg)
 *                        fee_flat = maxFlatFeeWithVAT (the floor leg)
 *                        Client evaluates: max(fee_flat, amount * fee / 100)
 *
 *   RateType.FEE      -- pure flat fee, fixed or tiered (NGN, KES, RWF, UGX value leg).
 *                        fee = flatAmount at max probe. fee_flat = 0.
 *
 * @param {string}   currency
 * @param {number}   min
 * @param {number}   max
 * @param {string[]} variants   - collectionMethods or transferTypes
 * @param {Function} fetchFn    - _fetchRawCollectionFee or _fetchRawTransferFee
 * @param {string}   variantKey - "method" or "type" (for logging)
 */
async function resolveFlutterwaveFee(currency, min, max, variants, fetchFn, variantKey) {
  const probeAmounts = buildProbeAmounts(min, max);

  const variantResults = await Promise.all(
    variants.map(async (variant) => {
      // Fire first probe to detect early-resolution (clean percentage-only response)
      const firstPoint = await fetchFn(currency, probeAmounts[0], variant);

      if (firstPoint.earlyResolved === true) {
        // Clean percentage-only -- no further probing needed
        return {
          [variantKey]:  variant,
          probePoints:   [],
          failed:        firstPoint.error ? [firstPoint] : [],
          earlyResolved: firstPoint.classification,
        };
      }

      // Value, flat, or mixed -- fire all remaining probe amounts in parallel
      const remainingPoints = await Promise.all(
        probeAmounts.slice(1).map((amount) => fetchFn(currency, amount, variant))
      );
      const allPoints  = [firstPoint, ...remainingPoints];
      const successful = allPoints.filter((p) => !p.error);
      const failed     = allPoints.filter((p) => p.error);

      // ── RateType.FUNCTION: mixed percentage + value response ───────────────
      //
      // Some currencies (TZS, UGX) return both a percentage entry and a value
      // entry per response, where the non-zero field flips by amount tier:
      //
      //   TZS amount=200:      { percentage: 0,     value: 500  }  <- flat dominates
      //   TZS amount=9000000:  { percentage: 0.015, value: 0    }  <- % dominates
      //
      // Flutterwave is internally computing: fee = max(flat, percent × amount)
      //
      // _fetchRawTransferFee stores the highest non-zero percentage seen at each
      // probe point in nonZeroPercentFee. If ANY probe saw a non-zero percentage,
      // this is a mixed-type fee. We store both components as RateType.FUNCTION:
      //
      //   fee      = realPercentWithVAT   (the percentage leg, incl. VAT)
      //   fee_flat = maxFlatFeeWithVAT    (the flat floor leg, incl. VAT)
      //
      // Client evaluates: max(fee_flat, amount × fee / 100)
      // This is exact at every amount in the range -- no approximation needed.
      // ────────────────────────────────────────────────────────────────────────
      const maxNonZeroPercent = Math.max(
        ...allPoints.map((p) => p.nonZeroPercentFee ?? 0)
      );

      if (maxNonZeroPercent > 0) {
        const realPercentWithVAT = parseFloat(
          (maxNonZeroPercent * 100 * (1 + CONFIG.COLLECTION_VAT_RATE)).toFixed(4)
        );

        // Highest flat (value-path) fee across all probes, already including VAT.
        // Only count probes where nonZeroPercentFee is null -- those are the probes
        // where the percentage entry was zero, so the value entry was active.
        const maxFlatFeeWithVAT = parseFloat(
          Math.max(
            0,
            ...allPoints
              .filter((p) => !p.error && p.nonZeroPercentFee == null)
              .map((p) => p.feeAmount ?? 0)
          ).toFixed(4)
        );

        return {
          [variantKey]:  variant,
          probePoints:   successful,
          failed,
          earlyResolved: {
            fee_type:  "RateType.FUNCTION",
            fee:       realPercentWithVAT,
            fee_flat:  maxFlatFeeWithVAT,
            reasoning: `Mixed %+value -> RateType.FUNCTION: fee=${realPercentWithVAT}% + flat_floor=${maxFlatFeeWithVAT} (both incl. ${CONFIG.COLLECTION_VAT_RATE * 100}% VAT). Client: max(${maxFlatFeeWithVAT}, amount × ${realPercentWithVAT}%)`,
          },
        };
      }

      return { [variantKey]: variant, probePoints: successful, failed, earlyResolved: null };
    })
  );

  // Separate early-resolved variants (PERCENT or FUNCTION) from probe-classified ones
  const earlyVariants = variantResults
    .filter((v) => v.earlyResolved !== null)
    .map((v) => ({ variant: v[variantKey], classification: v.earlyResolved }));

  // Only probe-classify variants that were NOT early-resolved (pure value/flat fees)
  const probeVariants = variantResults.filter((v) => v.earlyResolved === null);

  const fullySuccessful = probeVariants.filter(
    (v) => v.probePoints.length === probeAmounts.length
  );
  const usableProbe = fullySuccessful.length > 0
    ? fullySuccessful
    : probeVariants.filter((v) => v.probePoints.length >= 2);

  const classifiedProbe = usableProbe.map((v) => ({
    variant:        v[variantKey],
    classification: classifyFee(v.probePoints),
  }));

  const allClassified = [...earlyVariants, ...classifiedProbe];

  if (allClassified.length === 0) {
    const errors = variantResults
      .map((v) => `${v[variantKey]}: ${v.failed[0]?.error ?? "unknown"}`)
      .join("; ");
    return { fee: null, fee_flat: null, fee_type: null, error: `All ${variantKey}s failed -- ${errors}` };
  }

  // Pick worst variant -- highest effective cost at max amount.
  //   FUNCTION -> max(fee_flat, (fee / 100) * maxAmount)
  //   PERCENT  -> (fee / 100) * maxAmount
  //   FEE      -> fee (flat, amount-independent)
  const maxAmount = probeAmounts[probeAmounts.length - 1];
  const worst = allClassified.reduce((a, b) => {
    const effectiveCost = (c) => {
      if (c.classification.fee_type === "RateType.FUNCTION") {
        return Math.max(c.classification.fee_flat ?? 0, (c.classification.fee / 100) * maxAmount);
      }
      if (c.classification.fee_type === "RateType.PERCENT") {
        return (c.classification.fee / 100) * maxAmount;
      }
      return c.classification.fee; // RateType.FEE
    };
    return effectiveCost(b) > effectiveCost(a) ? b : a;
  });

  return {
    ...worst.classification,
    [`worst${variantKey.charAt(0).toUpperCase() + variantKey.slice(1)}`]: worst.variant,
    probeAmounts,
    reasoning: `Worst ${variantKey}: [${worst.variant}] | ${worst.classification.reasoning}`,
    allProbes: allClassified.map((v) => ({
      [variantKey]: v.variant,
      fee_type:     v.classification.fee_type,
      fee:          v.classification.fee,
      fee_flat:     v.classification.fee_flat ?? 0,
    })),
  };
}

const resolveCollectionFee = (currency, min, max, collectionMethods) =>
  resolveFlutterwaveFee(currency, min, max, collectionMethods, _fetchRawCollectionFee, "method");

const resolveTransferFee = (currency, min, max, transferTypes) =>
  resolveFlutterwaveFee(currency, min, max, transferTypes, _fetchRawTransferFee, "type");

/**
 * Fetches the collection fee for a given currency, amount, and payment type.
 *
 * Sums ALL numeric fields in json.data except those in COLLECTION_FEE_EXCLUDE_FIELDS.
 * VAT is applied on top of the total.
 *
 * Collection fees never return mixed percentage+value entries, so nonZeroPercentFee
 * is always null here. Included for shape consistency with _fetchRawTransferFee.
 */
async function _fetchRawCollectionFee(currency, amount, paymentType) {
  try {
    const url = new URL(`${CONFIG.FLUTTERWAVE_API}/transactions/fee`);
    url.searchParams.set("amount", amount);
    url.searchParams.set("currency", currency);
    url.searchParams.set("payment_type", paymentType);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== "success") throw new Error(json.message || "API error");

    const baseFee = Object.entries(json.data)
      .filter(([key, val]) => !CONFIG.COLLECTION_FEE_EXCLUDE_FIELDS.has(key) && typeof val === "number")
      .reduce((sum, [, val]) => sum + val, 0);

    const feeAmount = parseFloat((baseFee * (1 + CONFIG.COLLECTION_VAT_RATE)).toFixed(4));
    return { amount, feeAmount, earlyResolved: null, nonZeroPercentFee: null, raw: json.data };
  } catch (err) {
    return { amount, error: err.message };
  }
}

/**
 * Fetches the transfer fee for a given currency, amount, and transfer type.
 *
 * Flutterwave returns one of three response shapes:
 *
 *   CLEAN PERCENTAGE (XAF, XOF, GHS, ZMW):
 *     [ { fee_type: "percentage", fee: 0.01 } ]
 *     No value entries. Safe to early-resolve on the first probe.
 *     Returns earlyResolved=true with a RateType.PERCENT classification.
 *
 *   MIXED (TZS, UGX):
 *     Low amount:  [ { fee_type: "percentage", fee: 0 },     { fee_type: "value", fee: 500 } ]
 *     High amount: [ { fee_type: "percentage", fee: 0.015 }, { fee_type: "value", fee: 0   } ]
 *     Cannot early-resolve. Returns earlyResolved=null with nonZeroPercentFee
 *     carrying the highest non-zero percentage at this probe (or null if all % = 0).
 *     resolveFlutterwaveFee aggregates across all probes -> RateType.FUNCTION.
 *
 *   VALUE ONLY (NGN, KES, RWF):
 *     [ { fee_type: "value", fee: 50 } ]
 *     Returns earlyResolved=null, nonZeroPercentFee=null.
 *     classifyFee handles flat vs tiered classification -> RateType.FEE.
 */
async function _fetchRawTransferFee(currency, amount, transferType) {
  try {
    const url = new URL(`${CONFIG.FLUTTERWAVE_API}/transfers/fee`);
    url.searchParams.set("amount", amount);
    url.searchParams.set("currency", currency);
    url.searchParams.set("type", transferType);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== "success") throw new Error(json.message || "API error");

    const entries = json.data;
    if (!entries?.length) throw new Error("No transfer fee data returned");

    const percentageEntries        = entries.filter((e) => e.fee_type === "percentage");
    const valueEntries             = entries.filter((e) => e.fee_type === "value");
    const nonZeroPercentageEntries = percentageEntries.filter((e) => parseFloat(e.fee) > 0);
    const hasValueEntries          = valueEntries.length > 0;

    // ── CLEAN PERCENTAGE ONLY ────────────────────────────────────────────────
    // No value entries -- purely percentage-based. Safe to early-resolve.
    // ────────────────────────────────────────────────────────────────────────
    if (!hasValueEntries && percentageEntries.length > 0) {
      const entry = nonZeroPercentageEntries.length > 0
        ? nonZeroPercentageEntries.reduce((a, b) =>
            parseFloat(b.fee) > parseFloat(a.fee) ? b : a)
        : percentageEntries[0]; // all-zero -- valid zero-fee case

      const fee = parseFloat(
        (parseFloat(entry.fee) * 100 * (1 + CONFIG.COLLECTION_VAT_RATE)).toFixed(4)
      );
      return {
        amount,
        feeAmount:         fee,
        earlyResolved:     true,
        nonZeroPercentFee: null,
        classification: {
          fee_type:  "RateType.PERCENT",
          fee,
          fee_flat:  0,
          reasoning: `fwFeeType=percentage, rawFee=${entry.fee} (selected from ${entries.length} entr${entries.length > 1 ? "ies" : "y"}) -> ${fee}% (incl. ${CONFIG.COLLECTION_VAT_RATE * 100}% VAT)`,
        },
        raw: entry,
      };
    }

    // ── MIXED OR VALUE-ONLY ──────────────────────────────────────────────────
    // Mixed: carry nonZeroPercentFee so the caller can detect mixed-type across
    //        all probes and resolve as RateType.FUNCTION.
    // Value-only: nonZeroPercentFee=null, classifyFee resolves as RateType.FEE.
    // ────────────────────────────────────────────────────────────────────────
    const nonZeroPercentFee = nonZeroPercentageEntries.length > 0
      ? parseFloat(
          nonZeroPercentageEntries.reduce((a, b) =>
            parseFloat(b.fee) > parseFloat(a.fee) ? b : a
          ).fee
        )
      : null;

    // Pick the best value entry for the feeAmount used by classifyFee.
    // For mixed responses this is also used to compute maxFlatFeeWithVAT
    // in resolveFlutterwaveFee when building the RateType.FUNCTION result.
    const entry = valueEntries.length > 0
      ? valueEntries.reduce((a, b) => parseFloat(b.fee) > parseFloat(a.fee) ? b : a)
      : entries[0]; // all-zero percentage entries -- zero fee is valid

    const feeAmount = parseFloat(
      (parseFloat(entry.fee) * (1 + CONFIG.COLLECTION_VAT_RATE)).toFixed(4)
    );

    return {
      amount,
      feeAmount,
      earlyResolved:    null,
      nonZeroPercentFee, // null = value-only; non-null = mixed type, signals FUNCTION path
      raw:              entry,
    };
  } catch (err) {
    return { amount, error: err.message };
  }
}

// ======================
//  WALLET PROCESSOR
// ======================

async function processWallet(wallet, rates, log) {
  const result = {
    walletId: wallet.payment_wallet_id,
    currency: wallet.payment_wallet_currency,
    status:   "SUCCESS",
    actions:  [],
  };

  try {
    const currency = wallet.payment_wallet_currency;

    if (!rates[currency]) {
      result.status = "SKIPPED";
      result.actions.push(`${currency} not in exchange rate API -- skipped`);
      log.skipped++;
      return result;
    }

    // Exchange rates
    const usdToCurrency = rates[currency];
    const baseRate  = 1 / (usdToCurrency / CONFIG.USD_TO_ADC);
    let   buyRate   = baseRate * (1 - CONFIG.MIN_SPREAD);
    let   sellRate  = baseRate * (1 + CONFIG.MIN_SPREAD);
    if (buyRate >= sellRate) buyRate = sellRate - CONFIG.MIN_SPREAD;

    const finalBuyRate  = parseFloat(buyRate.toFixed(4));
    const finalSellRate = parseFloat(sellRate.toFixed(4));
    result.actions.push(`Rates -- Buy: ${finalBuyRate}, Sell: ${finalSellRate}`);

    // Probe ranges (buy_max / sell_max fallback to min × 100 until populated)
    const buyMin  = parseFloat(wallet.payment_wallet_buy_min)  || 100;
    const buyMax  = parseFloat(wallet.payment_wallet_buy_max)  || buyMin * 100;
    const sellMin = parseFloat(wallet.payment_wallet_sell_min) || 100;
    const sellMax = parseFloat(wallet.payment_wallet_sell_max) || sellMin * 100;
    result.actions.push(`Probe ranges -- Buy: [${buyMin}->${buyMax}], Sell: [${sellMin}->${sellMax}]`);

    const { collectionMethods, transferTypes } = wallet;

    if (!collectionMethods.length && !transferTypes.length) {
      result.actions.push("No active payment methods in DB -- fee probe skipped");
    }

    const [collectionFee, transferFee] = await Promise.all([
      collectionMethods.length
        ? resolveCollectionFee(currency, buyMin, buyMax, collectionMethods)
        : Promise.resolve({ fee: null, fee_flat: null, fee_type: null, error: "No collection methods in DB" }),
      transferTypes.length
        ? resolveTransferFee(currency, sellMin, sellMax, transferTypes)
        : Promise.resolve({ fee: null, fee_flat: null, fee_type: null, error: "No transfer types in DB" }),
    ]);

    // Build DB update payload
    const updatePayload = {
      payment_wallet_buy_rate:   finalBuyRate,
      payment_wallet_sell_rate:  finalSellRate,
      payment_wallet_updated_at: new Date().toISOString(),
    };

    if (collectionFee.fee !== null) {
      updatePayload.payment_wallet_buy_fee       = collectionFee.fee;
      updatePayload.payment_wallet_buy_fee_flat  = collectionFee.fee_flat ?? 0;
      updatePayload.payment_wallet_buy_rate_type = collectionFee.fee_type;
      result.actions.push(
        `Buy fee: ${collectionFee.fee} [${collectionFee.fee_type}] flat=${collectionFee.fee_flat ?? 0} -- ${collectionFee.reasoning}`
      );
    } else {
      log.warnings.push(`${wallet.payment_wallet_id} (${currency}): collection fee failed -- ${collectionFee.error}`);
      result.actions.push(`Buy fee fetch failed: ${collectionFee.error}`);
    }

    if (transferFee.fee !== null) {
      updatePayload.payment_wallet_sell_fee       = transferFee.fee;
      updatePayload.payment_wallet_sell_fee_flat  = transferFee.fee_flat ?? 0;
      updatePayload.payment_wallet_sell_rate_type = transferFee.fee_type;
      result.actions.push(
        `Sell fee: ${transferFee.fee} [${transferFee.fee_type}] flat=${transferFee.fee_flat ?? 0} -- ${transferFee.reasoning}`
      );
    } else {
      log.warnings.push(`${wallet.payment_wallet_id} (${currency}): transfer fee failed -- ${transferFee.error}`);
      result.actions.push(`Sell fee fetch failed: ${transferFee.error}`);
    }

    const { error } = await supabase
      .from("payment_wallet_table")
      .update(updatePayload)
      .eq("payment_wallet_id", wallet.payment_wallet_id);

    if (error) throw new Error(`DB update failed: ${error.message}`);
    log.updatesSucceeded++;
  } catch (err) {
    result.status = "FAILED";
    result.error  = err.message;
    log.updatesFailed++;
    log.warnings.push(`Wallet ${wallet.payment_wallet_id} (${wallet.payment_wallet_currency}) failed: ${err.message}`);
  }

  return result;
}

// ======================
//  UTILITIES
// ======================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Concurrency limiter -- runs an array of async task functions with at most
 * `limit` running simultaneously. Preserves result order.
 *
 * @param {Array<() => Promise<any>>} tasks - Array of zero-arg async functions
 * @param {number} limit - Max concurrent tasks
 * @returns {Promise<any[]>} - Results in the same order as tasks
 */
async function pLimit(tasks, limit) {
  const results = new Array(tasks.length);
  let index = 0;

  async function runNext() {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, runNext));
  return results;
}

