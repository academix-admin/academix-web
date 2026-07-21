// /**
//  * Lambda: statements/request
//  * File: index.mjs  (ESM, Node 20.x)
//  *
//  * Deps (layer or bundled):
//  *   @supabase/supabase-js
//  *   nodemailer
//  *   pdf-lib
//  */

// import { createClient }                      from '@supabase/supabase-js';
// import { PDFDocument, StandardFonts, rgb }   from 'pdf-lib';
// import nodemailer                            from 'nodemailer';

// // ── Clients ────────────────────────────────────────────────────

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

// // ZeptoMail SMTP transporter
// const transporter = nodemailer.createTransport({
//   host: 'smtp.zeptomail.com',
//   port: 587,
//   secure: false,
//   auth: {
//     user: 'emailapikey',
//     pass: process.env.ZEPTO_SMTP_PASSWORD,
//   },
// });

// // ── i18n ───────────────────────────────────────────────────────

// const I18N = {
//   en: {
//     accountStatement:      'Account Statement',
//     generated:             'Generated',
//     accountHolder:         'ACCOUNT HOLDER',
//     statementPeriod:       'STATEMENT PERIOD',
//     to:                    'to',
//     accountType:           'Account Type',
//     currentAccount:        'Current Account',
//     statementDate:         'Statement Date',
//     openingBalance:        'Opening Balance',
//     totalCreditAmount:     'Total Credit Amount',
//     totalDebitAmount:      'Total Debit Amount',
//     closingBalance:        'Closing Balance',
//     transactions:          'Transactions',
//     date:                  'Date',
//     reference:             'Reference',
//     description:           'Description',
//     sent:                  'Sent',
//     received:              'Received',
//     fee:                   'Fee',
//     crDr:                  'CR/DR',
//     rate:                  'Rate',
//     senderStatus:          'Sender Status',
//     receiverStatus:        'Rcvr Status',
//     statementSummary:      'STATEMENT SUMMARY',
//     totalCredits:          'Total Credits',
//     totalDebits:           'Total Debits',
//     totalTransactions:     'Total Transactions',
//     creditCount:           'Credit Count',
//     debitCount:            'Debit Count',
//     walletSummary:         'WALLET SUMMARY',
//     disclaimer:            'This statement is computer-generated and does not require a signature. For queries contact academix.app@jimstechinnovations.com.',
//     footerNote:            'This statement is for informational purposes only. Academix - a product of Jimstech Innovations Nigeria Limited. All rights reserved 2025.',
//     username:              'Username',
//     email:                 'Email',
//     phone:                 'Phone',
//     currentBalance:        'Current Balance',
//     totalTransactionsCsv:  'Total Transactions',
//     summary:               'Summary',
//     informational:         'This statement is for informational purposes only.',
//     copyright:             'Academix - a product of Jimstech Innovations Nigeria Limited. All rights reserved 2025.',
//     type_top_up:           'Top-up / Deposit',
//     type_withdraw:         'Withdrawal',
//     type_payment:          'Payment',
//     type_quiz:             'Quiz Reward',
//     type_participation:    'Participation Fee',
//     type_buy_in:           'Buy-in',
//     status_success:        'Success',
//     status_failed:         'Failed',
//     status_pending:        'Pending',
//     status_cancelled:      'Cancelled',
//     csv_reference:         'Reference',
//     csv_dateTime:          'Date & Time',
//     csv_valueDate:         'Value Date',
//     csv_type:              'Transaction Type',
//     csv_description:       'Description',
//     csv_senderName:        'Sender Name',
//     csv_senderCurrency:    'Sender Currency',
//     csv_receiverName:      'Receiver Name',
//     csv_receiverCurrency:  'Receiver Currency',
//     csv_amountSent:        'Amount Sent',
//     csv_amountReceived:    'Amount Received',
//     csv_fee:               'Fee',
//     csv_exchangeRate:      'Exchange Rate',
//     csv_crDr:              'CR / DR',
//     csv_senderStatus:      'Sender Status',
//     csv_receiverStatus:    'Receiver Status',
//     emailSubject:          (from, to) => `Your Academix Account Statement: ${from} to ${to}`,
//     emailGreeting:         (name) => `Hi ${name},`,
//     emailBody:             (from, to) => `Please find attached your Academix account statement for the period ${from} to ${to}.`,
//     emailWarning:          'If you did not request this statement, please contact us immediately at academix.app@jimstechinnovations.com',
//     emailTeam:             '-- The Academix Team\nJimstech Innovations Nigeria Limited',
//     brandTagline:          'by Jimstech Innovations Nigeria Limited',
//     academix:              'Academix',
//   },

//   fr: {
//     accountStatement:      'Relevé de Compte',
//     generated:             'Généré',
//     accountHolder:         'TITULAIRE DU COMPTE',
//     statementPeriod:       'PÉRIODE DU RELEVÉ',
//     to:                    'au',
//     accountType:           'Type de Compte',
//     currentAccount:        'Compte Courant',
//     statementDate:         'Date du Relevé',
//     openingBalance:        'Solde d\'Ouverture',
//     totalCreditAmount:     'Total des Crédits',
//     totalDebitAmount:      'Total des Débits',
//     closingBalance:        'Solde de Clôture',
//     transactions:          'Transactions',
//     date:                  'Date',
//     reference:             'Référence',
//     description:           'Description',
//     sent:                  'Envoyé',
//     received:              'Reçu',
//     fee:                   'Frais',
//     crDr:                  'CR/DR',
//     rate:                  'Taux',
//     senderStatus:          'Statut Expéditeur',
//     receiverStatus:        'Statut Récept.',
//     statementSummary:      'RÉSUMÉ DU RELEVÉ',
//     totalCredits:          'Total Crédits',
//     totalDebits:           'Total Débits',
//     totalTransactions:     'Total des Transactions',
//     creditCount:           'Nombre de Crédits',
//     debitCount:            'Nombre de Débits',
//     walletSummary:         'RÉSUMÉ DES PORTEFEUILLES',
//     disclaimer:            'Ce relevé est généré par ordinateur et ne nécessite pas de signature. Pour toute question, contactez academix.app@jimstechinnovations.com.',
//     footerNote:            'Ce relevé est à titre informatif uniquement. Academix - un produit de Jimstech Innovations Nigeria Limited. Tous droits réservés 2025.',
//     username:              'Nom d\'utilisateur',
//     email:                 'E-mail',
//     phone:                 'Téléphone',
//     currentBalance:        'Solde Actuel',
//     totalTransactionsCsv:  'Total des Transactions',
//     summary:               'Résumé',
//     informational:         'Ce relevé est à titre informatif uniquement.',
//     copyright:             'Academix - un produit de Jimstech Innovations Nigeria Limited. Tous droits réservés 2025.',
//     type_top_up:           'Rechargement / Dépôt',
//     type_withdraw:         'Retrait',
//     type_payment:          'Paiement',
//     type_quiz:             'Récompense Quiz',
//     type_participation:    'Frais de Participation',
//     type_buy_in:           'Mise Initiale',
//     status_success:        'Succès',
//     status_failed:         'Échoué',
//     status_pending:        'En attente',
//     status_cancelled:      'Annulé',
//     csv_reference:         'Référence',
//     csv_dateTime:          'Date et Heure',
//     csv_valueDate:         'Date de Valeur',
//     csv_type:              'Type de Transaction',
//     csv_description:       'Description',
//     csv_senderName:        'Nom Expéditeur',
//     csv_senderCurrency:    'Devise Expéditeur',
//     csv_receiverName:      'Nom Destinataire',
//     csv_receiverCurrency:  'Devise Destinataire',
//     csv_amountSent:        'Montant Envoyé',
//     csv_amountReceived:    'Montant Reçu',
//     csv_fee:               'Frais',
//     csv_exchangeRate:      'Taux de Change',
//     csv_crDr:              'CR / DR',
//     csv_senderStatus:      'Statut Expéditeur',
//     csv_receiverStatus:    'Statut Destinataire',
//     emailSubject:          (from, to) => `Votre Relevé de Compte Academix : ${from} au ${to}`,
//     emailGreeting:         (name) => `Bonjour ${name},`,
//     emailBody:             (from, to) => `Veuillez trouver ci-joint votre relevé de compte Academix pour la période du ${from} au ${to}.`,
//     emailWarning:          'Si vous n\'avez pas demandé ce relevé, veuillez nous contacter immédiatement à academix.app@jimstechinnovations.com',
//     emailTeam:             '-- L\'équipe Academix\nJimstech Innovations Nigeria Limited',
//     brandTagline:          'par Jimstech Innovations Nigeria Limited',
//     academix:              'Academix',
//   }
// };

// function getT(locale) {
//   const lang = (locale ?? 'en').split('-')[0].toLowerCase();
//   return I18N[lang] ?? I18N.en;
// }

// // ── Helpers ────────────────────────────────────────────────────

// function respondJson(statusCode, body) {
//   return {
//     statusCode,
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body),
//   };
// }

// function formatAmount(amount, currency) {
//   const n = Number(amount);
//   return `${n.toLocaleString('en', {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   })} ${currency ?? ''}`.trim();
// }

// function labelTransactionType(type, t) {
//   const map = {
//     'TransactionType.top_up':        t.type_top_up,
//     'TransactionType.withdraw':      t.type_withdraw,
//     'TransactionType.payment':       t.type_payment,
//     'TransactionType.quiz':          t.type_quiz,
//     'TransactionType.participation': t.type_participation,
//     'TransactionType.buy_in':        t.type_buy_in,
//   };
//   return map[type] ?? type;
// }

// function labelStatus(status, t) {
//   const map = {
//     'TransactionStatus.success':   t.status_success,
//     'TransactionStatus.failed':    t.status_failed,
//     'TransactionStatus.pending':   t.status_pending,
//     'TransactionStatus.cancelled': t.status_cancelled,
//   };
//   return map[status] ?? status;
// }

// function getTransactionAmount(r) {
//   const ss = r.transaction_sender_status   === 'TransactionStatus.success';
//   const ps = r.transaction_sender_status   === 'TransactionStatus.pending';
//   const rs = r.transaction_receiver_status === 'TransactionStatus.success';
//   switch (r.transaction_type) {
//     case 'TransactionType.top_up':
//       if (!rs) return 0;
//       return Number(r.transaction_receiver_amount ?? 0);
//     case 'TransactionType.withdraw':
//       if (!ss && !ps) return 0;
//       return (Number(r.transaction_sender_amount ?? 0) - Number(r.transaction_fee ?? 0));
//     case 'TransactionType.quiz':
//       if (!rs) return 0;
//       return Number(r.transaction_receiver_amount ?? 0);
//     case 'TransactionType.participation':
//       if (!rs) return 0;
//       return Number(r.transaction_receiver_amount ?? 0);
//     default:
//       return 0;
//   }
// }

// function computeOpeningBalance(rows, userId, closingBalance) {
//   let net = 0;
//   for (const r of rows) {
//     net += getTransactionAmount(r);
//   }
//   return Number(closingBalance) - net;
// }

// /** Fetch the logo PNG from Supabase public storage as a Uint8Array. */
// async function fetchLogoBytes() {
//   const LOGO_URL =
//     'https://iewqfmkngcgayxbbnpiz.supabase.co/storage/v1/object/public/public-platform/launcher_icon.PNG';
//   try {
//     const res = await fetch(LOGO_URL);
//     if (!res.ok) throw new Error(`HTTP ${res.status}`);
//     const buf = await res.arrayBuffer();
//     return new Uint8Array(buf);
//   } catch (err) {
//     console.warn('[statement] Could not fetch logo, will use vector fallback:', err.message);
//     return null;
//   }
// }

// // ── Per-currency wallet stats ──────────────────────────────────

// /**
//  * For every distinct non-ADC currency that appears as the "external" side of
//  * top-up or withdrawal transactions, compute:
//  *   openingBalance, totalCredits, totalDebits, closingBalance
//  *
//  * Rules (mirroring the Flutter logic):
//  *   top_up  (receiver success) → external currency RECEIVED (credit into wallet)
//  *   withdraw (sender success or pending) → external currency SENT (debit from wallet)
//  *
//  * We treat closing balance as: Σ credits_received - Σ debits_sent
//  * and opening balance as closing - net.
//  *
//  * Returns: Map<currency, { credits, debits, closing, opening }>
//  */
// function computeWalletStats(rows) {
//   const stats = new Map(); // currency → { credits: 0, debits: 0 }

//   const ensure = (cur) => {
//     if (!stats.has(cur)) stats.set(cur, { credits: 0, debits: 0 });
//   };

//   for (const r of rows) {
//     const sc = r.payment_profile_sender_details?.payment_wallet_details?.payment_wallet_currency   ?? '';
//     const rc = r.payment_profile_receiver_details?.payment_wallet_details?.payment_wallet_currency ?? '';

//     if (r.transaction_type === 'TransactionType.top_up') {
//       // External currency is the sender side (what was deposited in fiat/other)
//       const rs = r.transaction_receiver_status === 'TransactionStatus.success';
//       if (rs && sc && sc !== 'ADC') {
//         ensure(sc);
//         stats.get(sc).credits += Number(r.transaction_sender_amount ?? 0);
//       }
//     } else if (r.transaction_type === 'TransactionType.withdraw') {
//       // External currency is the receiver side (what was withdrawn to fiat/other)
//       const ss = r.transaction_sender_status === 'TransactionStatus.success';
//       const ps = r.transaction_sender_status === 'TransactionStatus.pending';
//       if ((ss || ps) && rc && rc !== 'ADC') {
//         ensure(rc);
//         stats.get(rc).debits += Number(r.transaction_receiver_amount ?? 0);
//       }
//     }
//   }

//   // Build final result
//   const result = [];
//   for (const [currency, s] of stats.entries()) {
//     const closing  = s.credits - s.debits;
//     const opening  = 0; // External wallets have no persistent opening balance — net from this period
//     result.push({
//       currency,
//       credits:  s.credits,
//       debits:   s.debits,
//       closing,
//       opening,
//     });
//   }

//   return result;
// }

// // ── CSV builder ────────────────────────────────────────────────

// function buildCsv(rows, user, balance, t) {
//   const closingBalance  = Number(balance.users_balance_amount);
//   const openingBalance  = computeOpeningBalance(rows, user.users_id, closingBalance);

//   const totalCredits = rows
//     .filter(r => getTransactionAmount(r) > 0)
//     .reduce((a, r) => a + getTransactionAmount(r), 0);

//   const totalDebits = rows
//     .filter(r => getTransactionAmount(r) < 0)
//     .reduce((a, r) => a + getTransactionAmount(r), 0);

//   const creditCount = rows.filter(r => getTransactionAmount(r) > 0).length;
//   const debitCount  = rows.filter(r => getTransactionAmount(r) < 0).length;

//   const walletStats = computeWalletStats(rows);

//   const summaryLines = [
//     `${t.accountStatement} - ${t.academix}`,
//     `${t.generated}: ${new Date().toUTCString()}`,
//     ``,
//     `${t.accountHolder},${user.users_names}`,
//     `${t.username},${user.users_username}`,
//     `${t.email},${user.users_email}`,
//     `${t.phone},${user.users_phone}`,
//     `${t.accountType},${t.currentAccount}`,
//     `${t.currentBalance},"${formatAmount(balance.users_balance_amount, balance.currency ?? '')}"`,
//     `${t.totalTransactionsCsv},${rows.length}`,
//     `${t.creditCount},${creditCount}`,
//     `${t.debitCount},${debitCount}`,
//     ``,
//   ];

//   const headers = [
//     t.csv_reference,
//     t.csv_dateTime,
//     t.csv_valueDate,
//     t.csv_type,
//     t.csv_description,
//     t.csv_senderName,
//     t.csv_senderCurrency,
//     t.csv_receiverName,
//     t.csv_receiverCurrency,
//     t.csv_amountSent,
//     t.csv_amountReceived,
//     t.csv_fee,
//     t.csv_exchangeRate,
//     t.csv_crDr,
//     t.csv_senderStatus,
//     t.csv_receiverStatus,
//   ];

//   const lines = rows.map((r) => {
//     const sc  = r.payment_profile_sender_details?.payment_wallet_details?.payment_wallet_currency   ?? '';
//     const rc  = r.payment_profile_receiver_details?.payment_wallet_details?.payment_wallet_currency ?? '';

//     const cells = [
//       r.sort_created_id ?? '',
//       new Date(r.transaction_created_at).toLocaleString('en-GB', { hour12: false }),
//       new Date(r.transaction_created_at).toLocaleDateString('en-GB'),
//       labelTransactionType(r.transaction_type, t),
//       r.transaction_description ?? labelTransactionType(r.transaction_type, t),
//       r.payment_profile_sender_details?.users_details?.users_names   ?? '',
//       sc,
//       r.payment_profile_receiver_details?.users_details?.users_names ?? '',
//       rc,
//       formatAmount(r.transaction_sender_amount,   sc),
//       formatAmount(r.transaction_receiver_amount, rc),
//       formatAmount(r.transaction_fee,             sc),
//       Number(r.transaction_sender_rate ?? 1).toFixed(6),
//       getTransactionAmount(r) > 0 ? 'CR' : 'DR',
//       labelStatus(r.transaction_sender_status,   t),
//       labelStatus(r.transaction_receiver_status, t),
//     ];

//     return cells
//       .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
//       .join(',');
//   });

//   const footerLines = [
//     ``,
//     `${t.summary}`,
//     `${t.openingBalance},"${formatAmount(openingBalance, '')}"`,
//     `${t.totalCredits},"${formatAmount(totalCredits, '')}"`,
//     `${t.totalDebits},"${formatAmount(totalDebits, '')}"`,
//     `${t.closingBalance},"${formatAmount(closingBalance, '')}"`,
//     `${t.creditCount},${creditCount}`,
//     `${t.debitCount},${debitCount}`,
//     ``,
//   ];

//   if (walletStats.length > 0) {
//     footerLines.push(`${t.walletSummary}`);
//     footerLines.push(`Currency,${t.openingBalance},${t.totalCredits},${t.totalDebits},${t.closingBalance}`);
//     for (const ws of walletStats) {
//       footerLines.push(
//         `${ws.currency},"${formatAmount(ws.opening, '')}","${formatAmount(ws.credits, '')}","${formatAmount(-ws.debits, '')}","${formatAmount(ws.closing, '')}"`
//       );
//     }
//     footerLines.push(``);
//   }

//   footerLines.push(`${t.informational}`);
//   footerLines.push(`${t.copyright}`);

//   return [
//     ...summaryLines,
//     headers.join(','),
//     ...lines,
//     ...footerLines,
//   ].join('\n');
// }

// // ── PDF builder ────────────────────────────────────────────────

// async function buildPdf(rows, fromDate, toDate, user, balance, t) {

//   // ── Colours ──────────────────────────────────────────────────
//   const GREEN        = rgb(0.05, 0.60, 0.10);
//   const RED          = rgb(0.85, 0.10, 0.10);
//   const ORANGE       = rgb(0.90, 0.50, 0.00);
//   const DARK_GRAY    = rgb(0.20, 0.20, 0.20);
//   const MID_GRAY     = rgb(0.45, 0.45, 0.45);
//   const LIGHT_GRAY   = rgb(0.75, 0.75, 0.75);
//   const BRAND_GREEN  = rgb(0.05, 0.48, 0.10);
//   const BRAND_DARK   = rgb(0.08, 0.08, 0.08);
//   const ROW_EVEN     = rgb(0.97, 0.97, 0.97);
//   const ROW_ODD      = rgb(1.00, 1.00, 1.00);
//   const HEADER_BG    = rgb(0.06, 0.40, 0.12);
//   const HEADER_TEXT  = rgb(1.00, 1.00, 1.00);
//   const ACCENT_LINE  = rgb(0.86, 0.69, 0.10);
//   const WALLET_BG    = rgb(0.94, 0.97, 0.94);
//   const WALLET_HEAD  = rgb(0.08, 0.30, 0.10);

//   // ── Page layout ───────────────────────────────────────────────
//   const PAGE_W = 842; // A4 landscape
//   const PAGE_H = 595;
//   const MARGIN  = 30;
//   const LINE_H  = 15;

//   // ── Column definitions — widths sum to exactly PAGE_W - 2*MARGIN ──
//   // Available width = 842 - 60 = 782
//   // Columns: Date | Reference | Description | Sent | Received | Fee | CR/DR | Rate | Sender Status | Rcvr Status
//   const COLUMNS = [
//     { label: t.date,           w: 68  },
//     { label: t.reference,      w: 104 },
//     { label: t.description,    w: 120 },
//     { label: t.sent,           w: 82  },
//     { label: t.received,       w: 82  },
//     { label: t.fee,            w: 60  },
//     { label: t.crDr,           w: 38  },
//     { label: t.rate,           w: 54  },
//     { label: t.senderStatus,   w: 87  },
//     { label: t.receiverStatus, w: 87  },
//   ];
//   // Total = 68+104+120+82+82+60+38+54+87+87 = 782 ✓
//   const TABLE_W = COLUMNS.reduce((a, c) => a + c.w, 0); // should equal PAGE_W - 2*MARGIN

//   const doc   = await PDFDocument.create();
//   const font  = await doc.embedFont(StandardFonts.Helvetica);
//   const fontB = await doc.embedFont(StandardFonts.HelveticaBold);
//   const fontI = await doc.embedFont(StandardFonts.HelveticaOblique);

//   // ── Attempt to fetch & embed the real logo image ──────────────
//   let logoImage      = null;
//   let logoEmbedError = false;
//   const logoBytes    = await fetchLogoBytes();
//   if (logoBytes) {
//     try {
//       logoImage = await doc.embedPng(logoBytes);
//     } catch {
//       try {
//         logoImage = await doc.embedJpg(logoBytes);
//       } catch (err2) {
//         console.warn('[statement] Could not embed logo image:', err2.message);
//         logoEmbedError = true;
//       }
//     }
//   }

//   let page;
//   let y;

//   // ── Draw helpers ──────────────────────────────────────────────

//   const txt = (str, x, yPos, size = 8, bold = false, color = DARK_GRAY, italic = false) => {
//     const f = italic ? fontI : (bold ? fontB : font);
//     page.drawText(String(str), { x, y: yPos, size, font: f, color });
//   };

//   const hline = (yPos, thickness = 0.4, color = LIGHT_GRAY, xStart = MARGIN, xEnd = PAGE_W - MARGIN) => {
//     page.drawLine({ start: { x: xStart, y: yPos }, end: { x: xEnd, y: yPos }, thickness, color });
//   };

//   const rect = (x, yPos, w, h, color, borderColor = null, borderThickness = 0) => {
//     page.drawRectangle({
//       x, y: yPos, width: w, height: h,
//       color,
//       ...(borderColor ? { borderColor, borderWidth: borderThickness } : {}),
//     });
//   };

//   const statusColor = (status) => {
//     const s = labelStatus(status, t).toLowerCase();
//     if (s === t.status_success.toLowerCase())   return GREEN;
//     if (s === t.status_failed.toLowerCase())    return RED;
//     if (s === t.status_pending.toLowerCase())   return ORANGE;
//     if (s === t.status_cancelled.toLowerCase()) return RED;
//     return MID_GRAY;
//   };

//   const drawLogo = (px, py, size = 28) => {
//     if (logoImage && !logoEmbedError) {
//       const dims = logoImage.scaleToFit(size, size);
//       page.drawImage(logoImage, { x: px, y: py, width: dims.width, height: dims.height });
//     } else {
//       page.drawEllipse({ x: px + size / 2, y: py + size / 2, xScale: size / 2, yScale: size / 2, color: BRAND_GREEN });
//       const aw = size * 0.32;
//       const ah = size * 0.55;
//       const ax = px + (size - aw) / 2;
//       const ay = py + (size - ah) / 2;
//       page.drawRectangle({ x: ax,            y: ay, width: aw * 0.3, height: ah, color: rgb(1,1,1) });
//       page.drawRectangle({ x: ax + aw * 0.7, y: ay, width: aw * 0.3, height: ah, color: rgb(1,1,1) });
//       page.drawRectangle({ x: ax,            y: ay + ah * 0.45, width: aw, height: ah * 0.15, color: rgb(1,1,1) });
//     }
//   };

//   // ── Statistics ─────────────────────────────────────────────────
//   const closingBalance = Number(balance.users_balance_amount);
//   const openingBalance = computeOpeningBalance(rows, user.users_id, closingBalance);

//   const totalCredits = rows
//     .filter(r => getTransactionAmount(r) > 0)
//     .reduce((a, r) => a + getTransactionAmount(r), 0);

//   const totalDebits = rows
//     .filter(r => getTransactionAmount(r) < 0)
//     .reduce((a, r) => a + getTransactionAmount(r), 0);

//   const creditCount = rows.filter(r => getTransactionAmount(r) > 0).length;
//   const debitCount  = rows.filter(r => getTransactionAmount(r) < 0).length;

//   const walletStats = computeWalletStats(rows);

//   const walletCurrency =
//     rows[0]?.payment_profile_sender_details?.payment_wallet_details?.payment_wallet_currency ?? '';

//   // ── Page factory ──────────────────────────────────────────────
//   const addPage = () => {
//     page = doc.addPage([PAGE_W, PAGE_H]);
//     y    = PAGE_H - MARGIN;
//   };

//   // ── Per-page footer ───────────────────────────────────────────
//   // Shows: disclaimer note | Credits: N | Debits: N | Page X
//   const drawPageFooter = () => {
//     hline(MARGIN + 16, 0.5, LIGHT_GRAY);
//     txt(t.footerNote, MARGIN, MARGIN + 6, 6, false, LIGHT_GRAY);

//     const statsStr = `${t.creditCount}: ${creditCount}   ${t.debitCount}: ${debitCount}`;
//     const statsW   = font.widthOfTextAtSize(statsStr, 6.5);
//     txt(statsStr, PAGE_W / 2 - statsW / 2, MARGIN + 6, 6.5, true, MID_GRAY);

//     const pageCount = doc.getPageCount();
//     const pageStr   = `Page ${pageCount}`;
//     const pageW     = font.widthOfTextAtSize(pageStr, 6.5);
//     txt(pageStr, PAGE_W - MARGIN - pageW, MARGIN + 6, 6.5, false, MID_GRAY);
//   };

//   // ── Table column header row ───────────────────────────────────
//   const drawTableHeader = () => {
//     const rowH = 18;
//     rect(MARGIN, y - rowH + 4, TABLE_W, rowH, HEADER_BG);
//     let cx = MARGIN + 4;
//     COLUMNS.forEach((col) => {
//       txt(col.label, cx, y - rowH + 9, 7, true, HEADER_TEXT);
//       cx += col.w;
//     });
//     y -= rowH;
//     hline(y, 0.5, BRAND_GREEN, MARGIN, MARGIN + TABLE_W);
//     y -= 2;
//   };

//   const ensureSpace = (needed) => {
//     if (y - needed < MARGIN + 28) {
//       drawPageFooter();
//       addPage();
//       drawTableHeader();
//     }
//   };

//   // ─────────────────────────────────────────────────────────────
//   // PAGE 1 — COVER / HEADER
//   // ─────────────────────────────────────────────────────────────
//   addPage();

//   // ── Top brand bar ──
//   const BAR_H = 52;
//   rect(0, PAGE_H - BAR_H, PAGE_W, BAR_H, BRAND_DARK);

//   drawLogo(MARGIN, PAGE_H - BAR_H + 12, 28);

//   txt(t.academix,      MARGIN + 36, PAGE_H - BAR_H + 30, 20, true, rgb(1,1,1));
//   txt(t.brandTagline,  MARGIN + 36, PAGE_H - BAR_H + 14, 7.5, false, rgb(0.75,0.75,0.75));

//   txt(t.accountStatement, PAGE_W - MARGIN - 110, PAGE_H - BAR_H + 30, 14, true, rgb(1,1,1));
//   txt(`${t.generated}: ${new Date().toUTCString()}`, PAGE_W - MARGIN - 145, PAGE_H - BAR_H + 14, 7, false, rgb(0.75,0.75,0.75));

//   hline(PAGE_H - BAR_H, 1.5, ACCENT_LINE, 0, PAGE_W);

//   y = PAGE_H - BAR_H - 18;

//   // ── Account info block ──
//   const INFO_X1 = MARGIN;
//   const INFO_X2 = 310;

//   txt(t.accountHolder,   INFO_X1, y, 7, true, BRAND_GREEN);
//   txt(t.statementPeriod, INFO_X2, y, 7, true, BRAND_GREEN);
//   y -= 13;

//   txt(user.users_names,                         INFO_X1, y, 11, true, DARK_GRAY);
//   txt(`${fromDate}  ${t.to}  ${toDate}`,        INFO_X2, y, 10, true, DARK_GRAY);
//   y -= 12;

//   txt(`${user.users_username}`,                 INFO_X1, y, 8, false, MID_GRAY);
//   txt(`${t.accountType}: ${t.currentAccount}`,  INFO_X2, y, 8, false, MID_GRAY);
//   y -= 10;

//   txt(user.users_email,                         INFO_X1, y, 8, false, MID_GRAY);
//   txt(`${t.statementDate}: ${new Date().toLocaleDateString('en-GB')}`, INFO_X2, y, 8, false, MID_GRAY);
//   y -= 10;

//   txt(user.users_phone ?? '',                   INFO_X1, y, 8, false, MID_GRAY);
//   y -= 16;

//   hline(y, 0.6, ACCENT_LINE);
//   y -= 14;

//   // ── ADC Balance summary cards ──
//   const CARD_W   = 148;
//   const CARD_H   = 52;
//   const CARD_GAP = 10;
//   const adcCards = [
//     { label: t.openingBalance,    value: formatAmount(openingBalance, walletCurrency), color: DARK_GRAY   },
//     { label: t.totalCreditAmount, value: formatAmount(totalCredits,   walletCurrency), color: GREEN       },
//     { label: t.totalDebitAmount,  value: formatAmount(totalDebits,    walletCurrency), color: RED         },
//     { label: t.closingBalance,    value: formatAmount(closingBalance,  walletCurrency), color: BRAND_GREEN },
//     { label: t.transactions,      value: String(rows.length),                          color: DARK_GRAY   },
//   ];

//   let cardX = MARGIN;
//   adcCards.forEach((card) => {
//     rect(cardX, y - CARD_H, CARD_W, CARD_H, ROW_EVEN, LIGHT_GRAY, 0.5);
//     rect(cardX, y - 4, CARD_W, 4, card.color);
//     txt(card.label, cardX + 8, y - 18, 7, false, MID_GRAY);
//     txt(card.value, cardX + 8, y - 34, 9, true,  card.color);
//     cardX += CARD_W + CARD_GAP;
//   });
//   y -= CARD_H + 14;

//   // ── Other-wallet balance summary cards ──
//   if (walletStats.length > 0) {
//     hline(y, 0.4, LIGHT_GRAY);
//     y -= 12;

//     txt(t.walletSummary, MARGIN, y, 7, true, WALLET_HEAD);
//     y -= 12;

//     // Each wallet gets a compact card: currency | open | credits | debits | closing
//     // We fit up to 4 per row; wrap if needed.
//     const WC_W   = 178;
//     const WC_H   = 52;
//     const WC_GAP = 8;
//     const perRow = Math.floor((PAGE_W - 2 * MARGIN + WC_GAP) / (WC_W + WC_GAP));

//     let wx = MARGIN;
//     let rowMaxY = y;

//     walletStats.forEach((ws, idx) => {
//       if (idx > 0 && idx % perRow === 0) {
//         y = rowMaxY - WC_H - 10;
//         wx = MARGIN;
//         rowMaxY = y;
//       }

//       rect(wx, y - WC_H, WC_W, WC_H, WALLET_BG, LIGHT_GRAY, 0.5);
//       rect(wx, y - 4, WC_W, 4, BRAND_GREEN);

//       // Currency label
//       txt(ws.currency, wx + 8, y - 16, 9, true, WALLET_HEAD);

//       // Four mini stats
//       const col1 = wx + 8;
//       const col2 = wx + WC_W / 2 + 4;
//       txt(`${t.openingBalance}:`, col1, y - 27, 6, false, MID_GRAY);
//       txt(formatAmount(ws.opening, ws.currency), col1, y - 36, 7, true, DARK_GRAY);

//       txt(`${t.totalCreditAmount}:`, col2, y - 27, 6, false, MID_GRAY);
//       txt(formatAmount(ws.credits, ws.currency), col2, y - 36, 7, true, GREEN);

//       txt(`${t.totalDebitAmount}:`, col1, y - 45, 6, false, MID_GRAY);
//       txt(formatAmount(-ws.debits, ws.currency), col1, y - 54, 7, true, RED);

//       txt(`${t.closingBalance}:`, col2, y - 45, 6, false, MID_GRAY);
//       txt(formatAmount(ws.closing, ws.currency), col2, y - 54, 7, true, BRAND_GREEN);

//       wx += WC_W + WC_GAP;
//     });

//     y -= WC_H + 14;
//   }

//   hline(y, 0.4, LIGHT_GRAY);
//   y -= 14;

//   // ─────────────────────────────────────────────────────────────
//   // TRANSACTION TABLE
//   // ─────────────────────────────────────────────────────────────
//   drawTableHeader();

//   rows.forEach((r, idx) => {
//     ensureSpace(LINE_H + 2);

//     const sc  = r.payment_profile_sender_details?.payment_wallet_details?.payment_wallet_currency   ?? '';
//     const rc  = r.payment_profile_receiver_details?.payment_wallet_details?.payment_wallet_currency ?? '';

//     const sentAmt = Number(r.transaction_sender_amount);
//     const rcvdAmt = Number(r.transaction_receiver_amount);
//     const feeAmt  = Number(r.transaction_fee);
//     const rate    = Number(r.transaction_sender_rate ?? 1);

//     const description = r.transaction_description ?? labelTransactionType(r.transaction_type, t);

//     const rowBg = idx % 2 === 0 ? ROW_EVEN : ROW_ODD;
//     rect(MARGIN, y - LINE_H + 3, TABLE_W, LINE_H, rowBg);

//     const cells = [
//       { v: new Date(r.transaction_created_at).toLocaleDateString('en-GB'),          color: DARK_GRAY },
//       { v: (r.sort_created_id ?? '').slice(0, 18),                                  color: MID_GRAY  },
//       { v: description.length > 24 ? description.slice(0, 22) + '…' : description, color: DARK_GRAY },
//       { v: formatAmount(sentAmt, sc),   color: sentAmt < 0 ? RED : DARK_GRAY },
//       { v: formatAmount(rcvdAmt, rc),   color: rcvdAmt > 0 ? GREEN : DARK_GRAY },
//       { v: formatAmount(feeAmt, sc),    color: feeAmt  > 0 ? RED  : DARK_GRAY },
//       { v: getTransactionAmount(r) > 0 ? 'CR' : 'DR', color: getTransactionAmount(r) > 0 ? GREEN : RED },
//       { v: rate.toFixed(4),                            color: MID_GRAY  },
//       { v: labelStatus(r.transaction_sender_status,   t), color: statusColor(r.transaction_sender_status)   },
//       { v: labelStatus(r.transaction_receiver_status, t), color: statusColor(r.transaction_receiver_status) },
//     ];

//     let cx = MARGIN + 3;
//     cells.forEach((cell, i) => {
//       const maxW = COLUMNS[i].w - 6;
//       let display = String(cell.v);
//       while (display.length > 3 && font.widthOfTextAtSize(display, 7) > maxW) {
//         display = display.slice(0, -1);
//       }
//       txt(display, cx, y - LINE_H + 6, 7, false, cell.color);
//       cx += COLUMNS[i].w;
//     });

//     hline(y - LINE_H + 3, 0.2, rgb(0.88, 0.88, 0.88), MARGIN, MARGIN + TABLE_W);
//     y -= LINE_H;
//   });

//   // ── Summary footer section ─────────────────────────────────────
//   ensureSpace(80 + walletStats.length * 14);
//   y -= 10;
//   hline(y, 0.8, ACCENT_LINE);
//   y -= 14;

//   txt(t.statementSummary, MARGIN, y, 8, true, BRAND_GREEN);
//   y -= 12;

//   const summaryRows = [
//     [t.accountHolder,     user.users_names],
//     [t.accountType,       t.currentAccount],
//     [t.statementPeriod,   `${fromDate}  ${t.to}  ${toDate}`],
//     [t.openingBalance,    formatAmount(openingBalance, walletCurrency)],
//     [t.totalCredits,      formatAmount(totalCredits,   walletCurrency)],
//     [t.totalDebits,       formatAmount(totalDebits,    walletCurrency)],
//     [t.closingBalance,    formatAmount(closingBalance,  walletCurrency)],
//     [t.totalTransactions, String(rows.length)],
//     [t.creditCount,       String(creditCount)],
//     [t.debitCount,        String(debitCount)],
//   ];

//   summaryRows.forEach(([label, value]) => {
//     txt(`${label}:`, MARGIN, y, 8, false, MID_GRAY);
//     txt(value,       MARGIN + 140, y, 8, true, DARK_GRAY);
//     y -= 11;
//   });

//   // ── Other-wallet summary in footer ───────────────────────────
//   if (walletStats.length > 0) {
//     ensureSpace(14 + walletStats.length * 11 + 10);
//     y -= 8;
//     hline(y, 0.4, LIGHT_GRAY);
//     y -= 10;

//     txt(t.walletSummary, MARGIN, y, 7, true, BRAND_GREEN);
//     y -= 11;

//     // Column headers
//     txt('Currency',         MARGIN,       y, 7, true, MID_GRAY);
//     txt(t.openingBalance,   MARGIN + 60,  y, 7, true, MID_GRAY);
//     txt(t.totalCredits,     MARGIN + 160, y, 7, true, MID_GRAY);
//     txt(t.totalDebits,      MARGIN + 260, y, 7, true, MID_GRAY);
//     txt(t.closingBalance,   MARGIN + 360, y, 7, true, MID_GRAY);
//     y -= 11;
//     hline(y + 8, 0.3, LIGHT_GRAY, MARGIN, MARGIN + 460);

//     walletStats.forEach((ws) => {
//       txt(ws.currency,                           MARGIN,       y, 8, true,  DARK_GRAY);
//       txt(formatAmount(ws.opening,  ws.currency), MARGIN + 60,  y, 8, false, DARK_GRAY);
//       txt(formatAmount(ws.credits,  ws.currency), MARGIN + 160, y, 8, false, GREEN);
//       txt(formatAmount(-ws.debits,  ws.currency), MARGIN + 260, y, 8, false, RED);
//       txt(formatAmount(ws.closing,  ws.currency), MARGIN + 360, y, 8, true,  BRAND_GREEN);
//       y -= 11;
//     });
//   }

//   // ── Disclaimer ────────────────────────────────────────────────
//   y -= 10;
//   hline(y, 0.4, LIGHT_GRAY);
//   y -= 10;
//   txt(t.disclaimer, MARGIN, y, 6.5, false, MID_GRAY);

//   // ── Final page footer ─────────────────────────────────────────
//   drawPageFooter();

//   return doc.save();
// }

// // ── Email dispatch via ZeptoMail ───────────────────────────────

// async function sendEmail(toEmail, fromDate, toDate, format, fileBytes, userName, t) {
//   const subject  = t.emailSubject(fromDate, toDate);
//   const filename = `academix-statement-${fromDate}-${toDate}.${format}`;
//   const mimeType = format === 'csv' ? 'text/csv' : 'application/pdf';

//   const bodyText = [
//     t.emailGreeting(userName),
//     '',
//     t.emailBody(fromDate, toDate),
//     '',
//     t.emailWarning,
//     '',
//     t.emailTeam,
//   ].join('\n');

//   const bodyHtml = `
//     <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
//       <div style="background:#082808;padding:24px 32px;border-radius:8px 8px 0 0">
//         <h1 style="color:#fff;margin:0;font-size:22px">${t.academix}</h1>
//         <p style="color:#aaa;margin:4px 0 0;font-size:12px">${t.brandTagline}</p>
//       </div>
//       <div style="background:#f9f9f9;padding:28px 32px;border:1px solid #e0e0e0;border-top:none">
//         <p style="color:#333;font-size:15px">${t.emailGreeting(`<strong>${userName}</strong>`)}</p>
//         <p style="color:#555;font-size:14px;line-height:1.6">
//           ${t.emailBody(`<strong>${fromDate}</strong>`, `<strong>${toDate}</strong>`)}
//         </p>
//         <p style="color:#555;font-size:13px;margin-top:24px">
//           ${t.emailWarning.replace(
//             'academix.app@jimstechinnovations.com',
//             '<a href="mailto:academix.app@jimstechinnovations.com" style="color:#0a7d14">academix.app@jimstechinnovations.com</a>'
//           )}
//         </p>
//       </div>
//       <div style="background:#eee;padding:14px 32px;border-radius:0 0 8px 8px;text-align:center">
//         <p style="color:#999;font-size:11px;margin:0">
//           ${t.academix} &mdash; Jimstech Innovations Nigeria Limited &copy; 2025. All rights reserved.
//         </p>
//       </div>
//     </div>`;

//   await transporter.sendMail({
//     from: `"${t.academix}" <noreply@jimstechinnovations.com>`,
//     to:   toEmail,
//     subject,
//     text: bodyText,
//     html: bodyHtml,
//     attachments: [{
//       filename,
//       content:     Buffer.from(fileBytes),
//       contentType: mimeType,
//     }],
//   });
// }

// // ── Handler ────────────────────────────────────────────────────

// export async function handler(event) {

//   let body;
//   try {
//     body = JSON.parse(event.body ?? '{}');
//   } catch {
//     return respondJson(400, { error: 'Invalid request body' });
//   }

//   const { userId, country, locale, gender, age, email, fromDate, toDate, format } = body;

//   if (!userId || !email || !fromDate || !toDate || !format) {
//     return respondJson(400, { error: 'Missing required fields' });
//   }
//   if (!['pdf', 'csv'].includes(format)) {
//     return respondJson(400, { error: 'format must be pdf or csv' });
//   }

//   const t = getT(locale);

//   const from     = new Date(fromDate);
//   const to       = new Date(toDate);
//   const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);

//   if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
//     return respondJson(400, { error: 'Invalid date range' });
//   }
//   if (diffDays > 366) {
//     return respondJson(400, { error: 'Date range cannot exceed 1 year' });
//   }

//   const { data: userRows, error: userErr } = await supabase
//     .from('users_table')
//     .select('users_id, users_names, users_username, users_email, users_phone, users_dob, users_sex')
//     .eq('users_id', userId)
//     .limit(1);

//   if (userErr || !userRows?.length) {
//     console.error('[statement] User fetch error:', userErr);
//     return respondJson(500, { error: 'Failed to fetch user profile' });
//   }
//   const user = userRows[0];

//   const { data: balRows, error: balErr } = await supabase
//     .schema('personal')
//     .from('users_balance_table')
//     .select('users_balance_amount, users_balance_updated_at')
//     .eq('users_id', userId)
//     .limit(1);

//   if (balErr) {
//     console.error('[statement] Balance fetch error:', balErr);
//     return respondJson(500, { error: 'Failed to fetch balance' });
//   }
//   const balance = balRows?.[0] ?? { users_balance_amount: 0 };

//   const allTransactions = [];
//   let afterCursor = {};
//   const CHUNK = 1000;

//   do {
//     const { data, error } = await supabase.rpc('fetch_user_transactions', {
//       p_user_id:            userId,
//       p_country:            country,
//       p_locale:             locale,
//       p_gender:             gender,
//       p_age:                age,
//       p_limit_by:           CHUNK,
//       p_after_transactions: afterCursor,
//     });

//     if (error) {
//       console.error('[statement] RPC error:', error);
//       return respondJson(500, { error: 'Failed to fetch transactions' });
//     }

//     const chunk = data ?? [];

//     const filtered = chunk.filter((r) => {
//       const d = new Date(r.transaction_created_at);
//       return d >= from && d <= to;
//     });

//     allTransactions.push(...filtered);

//     if (chunk.length < CHUNK) break;

//     const last = chunk[chunk.length - 1];
//     afterCursor = { sort_id: last.sort_created_id, direction: 'oldest' };
//   } while (true);

//   console.log('[statement] Transactions fetched:', allTransactions.length);

//   let fileBytes;
//   if (format === 'csv') {
//     fileBytes = buildCsv(allTransactions, user, balance, t);
//   } else {
//     fileBytes = await buildPdf(allTransactions, fromDate, toDate, user, balance, t);
//   }

//   console.log('[statement] File size:', fileBytes.length, 'bytes');
//   console.log('[statement] Sending to:', email);

//   try {
//     await sendEmail(email, fromDate, toDate, format, fileBytes, user.users_names, t);
//   } catch (err) {
//     console.error('[statement] ZeptoMail error:', err);
//     return respondJson(500, { error: 'Failed to send email' });
//   }

//   return respondJson(200, {
//     status:  'success',
//     message: `Statement sent to ${email}`,
//     count:   allTransactions.length,
//   });
// }


/**
 * Lambda: statements/request
 * File: index.mjs  (ESM, Node 20.x)
 *
 * Deps (layer or bundled):
 *   @supabase/supabase-js
 *   nodemailer
 *   pdf-lib
 */

import { createClient }                      from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb }   from 'pdf-lib';
import nodemailer                            from 'nodemailer';

// ── Clients ────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ZeptoMail SMTP transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.zeptomail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'emailapikey',
    pass: process.env.ZEPTO_SMTP_PASSWORD,
  },
});

// ── i18n ───────────────────────────────────────────────────────

const I18N = {
  en: {
    accountStatement:      'Account Statement',
    generated:             'Generated',
    accountHolder:         'ACCOUNT HOLDER',
    statementPeriod:       'STATEMENT PERIOD',
    to:                    'to',
    accountType:           'Account Type',
    currentAccount:        'Current Account',
    statementDate:         'Statement Date',
    openingBalance:        'Opening Balance',
    totalCreditAmount:     'Total Credit Amount',
    totalDebitAmount:      'Total Debit Amount',
    closingBalance:        'Closing Balance',
    transactions:          'Transactions',
    date:                  'Date',
    reference:             'Reference',
    description:           'Description',
    sent:                  'Sent',
    received:              'Received',
    fee:                   'Fee',
    crDr:                  'CR/DR',
    rate:                  'Rate',
    senderStatus:          'Sender Status',
    receiverStatus:        'Rcvr Status',
    statementSummary:      'STATEMENT SUMMARY',
    totalCredits:          'Total Credits',
    totalDebits:           'Total Debits',
    totalTransactions:     'Total Transactions',
    creditCount:           'Credit Count',
    debitCount:            'Debit Count',
    walletSummary:         'WALLET SUMMARY',
    disclaimer:            'This statement is computer-generated and does not require a signature. For queries contact academix.app@jimstechinnovations.com.',
    footerNote:            'This statement is for informational purposes only. Academix - a product of Jimstech Innovations Nigeria Limited. All rights reserved 2025.',
    username:              'Username',
    email:                 'Email',
    phone:                 'Phone',
    currentBalance:        'Current Balance',
    totalTransactionsCsv:  'Total Transactions',
    summary:               'Summary',
    informational:         'This statement is for informational purposes only.',
    copyright:             'Academix - a product of Jimstech Innovations Nigeria Limited. All rights reserved 2025.',
    type_top_up:           'Top-up / Deposit',
    type_withdraw:         'Withdrawal',
    type_payment:          'Payment',
    type_quiz:             'Quiz Reward',
    type_participation:    'Participation Fee',
    type_buy_in:           'Buy-in',
    status_success:        'Success',
    status_failed:         'Failed',
    status_pending:        'Pending',
    status_cancelled:      'Cancelled',
    csv_reference:         'Reference',
    csv_dateTime:          'Date & Time',
    csv_valueDate:         'Value Date',
    csv_type:              'Transaction Type',
    csv_description:       'Description',
    csv_senderName:        'Sender Name',
    csv_senderCurrency:    'Sender Currency',
    csv_receiverName:      'Receiver Name',
    csv_receiverCurrency:  'Receiver Currency',
    csv_amountSent:        'Amount Sent',
    csv_amountReceived:    'Amount Received',
    csv_fee:               'Fee',
    csv_exchangeRate:      'Exchange Rate',
    csv_crDr:              'CR / DR',
    csv_senderStatus:      'Sender Status',
    csv_receiverStatus:    'Receiver Status',
    emailSubject:          (from, to) => `Your Academix Account Statement: ${from} to ${to}`,
    emailGreeting:         (name) => `Hi ${name},`,
    emailBody:             (from, to) => `Please find attached your Academix account statement for the period ${from} to ${to}.`,
    emailWarning:          'If you did not request this statement, please contact us immediately at academix.app@jimstechinnovations.com',
    emailTeam:             '-- The Academix Team\nJimstech Innovations Nigeria Limited',
    brandTagline:          'by Jimstech Innovations Nigeria Limited',
    academix:              'Academix',
  },

  fr: {
    accountStatement:      'Relevé de Compte',
    generated:             'Généré',
    accountHolder:         'TITULAIRE DU COMPTE',
    statementPeriod:       'PÉRIODE DU RELEVÉ',
    to:                    'au',
    accountType:           'Type de Compte',
    currentAccount:        'Compte Courant',
    statementDate:         'Date du Relevé',
    openingBalance:        'Solde d\'Ouverture',
    totalCreditAmount:     'Total des Crédits',
    totalDebitAmount:      'Total des Débits',
    closingBalance:        'Solde de Clôture',
    transactions:          'Transactions',
    date:                  'Date',
    reference:             'Référence',
    description:           'Description',
    sent:                  'Envoyé',
    received:              'Reçu',
    fee:                   'Frais',
    crDr:                  'CR/DR',
    rate:                  'Taux',
    senderStatus:          'Statut Expéditeur',
    receiverStatus:        'Statut Récept.',
    statementSummary:      'RÉSUMÉ DU RELEVÉ',
    totalCredits:          'Total Crédits',
    totalDebits:           'Total Débits',
    totalTransactions:     'Total des Transactions',
    creditCount:           'Nombre de Crédits',
    debitCount:            'Nombre de Débits',
    walletSummary:         'RÉSUMÉ DES PORTEFEUILLES',
    disclaimer:            'Ce relevé est généré par ordinateur et ne nécessite pas de signature. Pour toute question, contactez academix.app@jimstechinnovations.com.',
    footerNote:            'Ce relevé est à titre informatif uniquement. Academix - un produit de Jimstech Innovations Nigeria Limited. Tous droits réservés 2025.',
    username:              'Nom d\'utilisateur',
    email:                 'E-mail',
    phone:                 'Téléphone',
    currentBalance:        'Solde Actuel',
    totalTransactionsCsv:  'Total des Transactions',
    summary:               'Résumé',
    informational:         'Ce relevé est à titre informatif uniquement.',
    copyright:             'Academix - un produit de Jimstech Innovations Nigeria Limited. Tous droits réservés 2025.',
    type_top_up:           'Rechargement / Dépôt',
    type_withdraw:         'Retrait',
    type_payment:          'Paiement',
    type_quiz:             'Récompense Quiz',
    type_participation:    'Frais de Participation',
    type_buy_in:           'Mise Initiale',
    status_success:        'Succès',
    status_failed:         'Échoué',
    status_pending:        'En attente',
    status_cancelled:      'Annulé',
    csv_reference:         'Référence',
    csv_dateTime:          'Date et Heure',
    csv_valueDate:         'Date de Valeur',
    csv_type:              'Type de Transaction',
    csv_description:       'Description',
    csv_senderName:        'Nom Expéditeur',
    csv_senderCurrency:    'Devise Expéditeur',
    csv_receiverName:      'Nom Destinataire',
    csv_receiverCurrency:  'Devise Destinataire',
    csv_amountSent:        'Montant Envoyé',
    csv_amountReceived:    'Montant Reçu',
    csv_fee:               'Frais',
    csv_exchangeRate:      'Taux de Change',
    csv_crDr:              'CR / DR',
    csv_senderStatus:      'Statut Expéditeur',
    csv_receiverStatus:    'Statut Destinataire',
    emailSubject:          (from, to) => `Votre Relevé de Compte Academix : ${from} au ${to}`,
    emailGreeting:         (name) => `Bonjour ${name},`,
    emailBody:             (from, to) => `Veuillez trouver ci-joint votre relevé de compte Academix pour la période du ${from} au ${to}.`,
    emailWarning:          'Si vous n\'avez pas demandé ce relevé, veuillez nous contacter immédiatement à academix.app@jimstechinnovations.com',
    emailTeam:             '-- L\'équipe Academix\nJimstech Innovations Nigeria Limited',
    brandTagline:          'par Jimstech Innovations Nigeria Limited',
    academix:              'Academix',
  }
};

function getT(locale) {
  const lang = (locale ?? 'en').split('-')[0].toLowerCase();
  return I18N[lang] ?? I18N.en;
}

// ── Helpers ────────────────────────────────────────────────────

function respondJson(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function formatAmount(amount, currency) {
  const n = Number(amount);
  return `${n.toLocaleString('en', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency ?? ''}`.trim();
}

function labelTransactionType(type, t) {
  const map = {
    'TransactionType.top_up':        t.type_top_up,
    'TransactionType.withdraw':      t.type_withdraw,
    'TransactionType.payment':       t.type_payment,
    'TransactionType.quiz':          t.type_quiz,
    'TransactionType.participation': t.type_participation,
    'TransactionType.buy_in':        t.type_buy_in,
  };
  return map[type] ?? type;
}

function labelStatus(status, t) {
  const map = {
    'TransactionStatus.success':   t.status_success,
    'TransactionStatus.failed':    t.status_failed,
    'TransactionStatus.pending':   t.status_pending,
    'TransactionStatus.cancelled': t.status_cancelled,
  };
  return map[status] ?? status;
}

function getTransactionAmount(r) {
  const ss = r.transaction_sender_status   === 'TransactionStatus.success';
  const ps = r.transaction_sender_status   === 'TransactionStatus.pending';
  const rs = r.transaction_receiver_status === 'TransactionStatus.success';
  switch (r.transaction_type) {
    case 'TransactionType.top_up':
      if (!rs) return 0;
      return Number(r.transaction_receiver_amount ?? 0);
    case 'TransactionType.withdraw':
      if (!ss && !ps) return 0;
      // transaction_sender_amount is negative already
      return (Number(r.transaction_sender_amount ?? 0) - Number(r.transaction_fee ?? 0));
    case 'TransactionType.quiz':
      if (!rs) return 0;
      return Number(r.transaction_receiver_amount ?? 0);
    case 'TransactionType.participation':
      if (!rs) return 0;
      return Number(r.transaction_receiver_amount ?? 0);
    default:
      return 0;
  }
}

function computeOpeningBalance(rows, userId, closingBalance) {
  let net = 0;
  for (const r of rows) {
    net += getTransactionAmount(r);
  }
  return Number(closingBalance) - net;
}

/** Fetch the logo PNG from Supabase public storage as a Uint8Array. */
async function fetchLogoBytes() {
  const LOGO_URL =
    'https://iewqfmkngcgayxbbnpiz.supabase.co/storage/v1/object/public/public-platform/launcher_icon.PNG';
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch (err) {
    console.warn('[statement] Could not fetch logo, will use vector fallback:', err.message);
    return null;
  }
}

// ── Per-currency wallet stats ──────────────────────────────────

/**
 * For every distinct non-ADC currency that appears as the "external" side of
 * top-up or withdrawal transactions, compute:
 *   openingBalance, totalCredits, totalDebits, closingBalance
 *
 * Rules (mirroring the Flutter logic):
 *   top_up  (receiver success) → external currency RECEIVED (credit into wallet)
 *   withdraw (sender success or pending) → external currency SENT (debit from wallet)
 *
 * We treat closing balance as: Σ credits_received - Σ debits_sent
 * and opening balance as closing - net.
 *
 * Returns: Map<currency, { credits, debits, closing, opening }>
 */
function computeWalletStats(rows) {
  const stats = new Map(); // currency → { credits: 0, debits: 0 }

  const ensure = (cur) => {
    if (!stats.has(cur)) stats.set(cur, { credits: 0, debits: 0 });
  };

  for (const r of rows) {
    const sc = r.payment_profile_sender_details?.payment_wallet_details?.payment_wallet_currency   ?? '';
    const rc = r.payment_profile_receiver_details?.payment_wallet_details?.payment_wallet_currency ?? '';

    if (r.transaction_type === 'TransactionType.top_up') {
      // External currency is the sender side (what was deposited in fiat/other)
      const rs = r.transaction_receiver_status === 'TransactionStatus.success';
      if (rs && sc && sc !== 'ADC') {
        ensure(sc);
        stats.get(sc).credits += Number(r.transaction_sender_amount ?? 0);
      }
    } else if (r.transaction_type === 'TransactionType.withdraw') {
      // External currency is the receiver side (what was withdrawn to fiat/other)
      const ss = r.transaction_sender_status === 'TransactionStatus.success';
      const ps = r.transaction_sender_status === 'TransactionStatus.pending';
      if ((ss || ps) && rc && rc !== 'ADC') {
        ensure(rc);
        stats.get(rc).debits += Number(r.transaction_receiver_amount ?? 0);
      }
    }
  }

  // Build final result
  const result = [];
  for (const [currency, s] of stats.entries()) {
    const closing  = s.credits - s.debits;
    const opening  = 0; // External wallets have no persistent opening balance — net from this period
    result.push({
      currency,
      credits:  s.credits,
      debits:   s.debits,
      closing,
      opening,
    });
  }

  return result;
}

// ── CSV builder ────────────────────────────────────────────────

function buildCsv(rows, user, balance, t) {
  const closingBalance  = Number(balance.users_balance_amount);
  const openingBalance  = computeOpeningBalance(rows, user.users_id, closingBalance);

  const totalCredits = rows
    .filter(r => getTransactionAmount(r) > 0)
    .reduce((a, r) => a + getTransactionAmount(r), 0);

  const totalDebits = rows
    .filter(r => getTransactionAmount(r) < 0)
    .reduce((a, r) => a + getTransactionAmount(r), 0);

  const creditCount = rows.filter(r => getTransactionAmount(r) > 0).length;
  const debitCount  = rows.filter(r => getTransactionAmount(r) < 0).length;

  const walletStats = computeWalletStats(rows);

  const summaryLines = [
    `${t.accountStatement} - ${t.academix}`,
    `${t.generated}: ${new Date().toUTCString()}`,
    ``,
    `${t.accountHolder},${user.users_names}`,
    `${t.username},${user.users_username}`,
    `${t.email},${user.users_email}`,
    `${t.phone},${user.users_phone}`,
    `${t.accountType},${t.currentAccount}`,
    `${t.currentBalance},"${formatAmount(balance.users_balance_amount, balance.currency ?? '')}"`,
    `${t.totalTransactionsCsv},${rows.length}`,
    `${t.creditCount},${creditCount}`,
    `${t.debitCount},${debitCount}`,
    ``,
  ];

  const headers = [
    t.csv_reference,
    t.csv_dateTime,
    t.csv_valueDate,
    t.csv_type,
    t.csv_description,
    t.csv_senderName,
    t.csv_senderCurrency,
    t.csv_receiverName,
    t.csv_receiverCurrency,
    t.csv_amountSent,
    t.csv_amountReceived,
    t.csv_fee,
    t.csv_exchangeRate,
    t.csv_crDr,
    t.csv_senderStatus,
    t.csv_receiverStatus,
  ];

  const lines = rows.map((r) => {
    const sc  = r.payment_profile_sender_details?.payment_wallet_details?.payment_wallet_currency   ?? '';
    const rc  = r.payment_profile_receiver_details?.payment_wallet_details?.payment_wallet_currency ?? '';

    const cells = [
      r.sort_created_id ?? '',
      new Date(r.transaction_created_at).toLocaleString('en-GB', { hour12: false }),
      new Date(r.transaction_created_at).toLocaleDateString('en-GB'),
      labelTransactionType(r.transaction_type, t),
      r.transaction_description ?? labelTransactionType(r.transaction_type, t),
      r.payment_profile_sender_details?.users_details?.users_names   ?? '',
      sc,
      r.payment_profile_receiver_details?.users_details?.users_names ?? '',
      rc,
      formatAmount(r.transaction_sender_amount,   sc),
      formatAmount(r.transaction_receiver_amount, rc),
      formatAmount(r.transaction_fee,             sc),
      Number(r.transaction_sender_rate ?? 1).toFixed(6),
      getTransactionAmount(r) > 0 ? 'CR' : 'DR',
      labelStatus(r.transaction_sender_status,   t),
      labelStatus(r.transaction_receiver_status, t),
    ];

    return cells
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',');
  });

  const footerLines = [
    ``,
    `${t.summary}`,
    `${t.openingBalance},"${formatAmount(openingBalance, '')}"`,
    `${t.totalCredits},"${formatAmount(totalCredits, '')}"`,
    `${t.totalDebits},"${formatAmount(totalDebits, '')}"`,
    `${t.closingBalance},"${formatAmount(closingBalance, '')}"`,
    `${t.creditCount},${creditCount}`,
    `${t.debitCount},${debitCount}`,
    ``,
  ];

  if (walletStats.length > 0) {
    footerLines.push(`${t.walletSummary}`);
    footerLines.push(`Currency,${t.openingBalance},${t.totalCredits},${t.totalDebits},${t.closingBalance}`);
    for (const ws of walletStats) {
      footerLines.push(
        `${ws.currency},"${formatAmount(ws.opening, '')}","${formatAmount(ws.credits, '')}","${formatAmount(-ws.debits, '')}","${formatAmount(ws.closing, '')}"`
      );
    }
    footerLines.push(``);
  }

  footerLines.push(`${t.informational}`);
  footerLines.push(`${t.copyright}`);

  return [
    ...summaryLines,
    headers.join(','),
    ...lines,
    ...footerLines,
  ].join('\n');
}

// ── PDF builder ────────────────────────────────────────────────

async function buildPdf(rows, fromDate, toDate, user, balance, t) {

  // ── Colours ──────────────────────────────────────────────────
  const GREEN        = rgb(0.05, 0.60, 0.10);
  const RED          = rgb(0.85, 0.10, 0.10);
  const ORANGE       = rgb(0.90, 0.50, 0.00);
  const DARK_GRAY    = rgb(0.20, 0.20, 0.20);
  const MID_GRAY     = rgb(0.45, 0.45, 0.45);
  const LIGHT_GRAY   = rgb(0.75, 0.75, 0.75);
  const BRAND_GREEN  = rgb(0.05, 0.48, 0.10);
  const BRAND_DARK   = rgb(0.08, 0.08, 0.08);
  const ROW_EVEN     = rgb(0.97, 0.97, 0.97);
  const ROW_ODD      = rgb(1.00, 1.00, 1.00);
  const HEADER_BG    = rgb(0.06, 0.40, 0.12);
  const HEADER_TEXT  = rgb(1.00, 1.00, 1.00);
  const ACCENT_LINE  = rgb(0.86, 0.69, 0.10);
  const WALLET_BG    = rgb(0.94, 0.97, 0.94);
  const WALLET_HEAD  = rgb(0.08, 0.30, 0.10);

  // ── Page layout ───────────────────────────────────────────────
  const PAGE_W = 842; // A4 landscape
  const PAGE_H = 595;
  const MARGIN  = 30;
  const LINE_H  = 15;

  // ── Column definitions — widths sum to exactly PAGE_W - 2*MARGIN ──
  // Available width = 842 - 60 = 782
  // Columns: Date | Reference | Description | Sent | Received | Fee | CR/DR | Rate | Sender Status | Rcvr Status
  const COLUMNS = [
    { label: t.date,           w: 68  },
    { label: t.reference,      w: 104 },
    { label: t.description,    w: 120 },
    { label: t.sent,           w: 82  },
    { label: t.received,       w: 82  },
    { label: t.fee,            w: 60  },
    { label: t.crDr,           w: 38  },
    { label: t.rate,           w: 54  },
    { label: t.senderStatus,   w: 87  },
    { label: t.receiverStatus, w: 87  },
  ];
  // Total = 68+104+120+82+82+60+38+54+87+87 = 782 ✓
  const TABLE_W = COLUMNS.reduce((a, c) => a + c.w, 0); // should equal PAGE_W - 2*MARGIN

  const doc   = await PDFDocument.create();
  const font  = await doc.embedFont(StandardFonts.Helvetica);
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontI = await doc.embedFont(StandardFonts.HelveticaOblique);

  // ── Attempt to fetch & embed the real logo image ──────────────
  let logoImage      = null;
  let logoEmbedError = false;
  const logoBytes    = await fetchLogoBytes();
  if (logoBytes) {
    try {
      logoImage = await doc.embedPng(logoBytes);
    } catch {
      try {
        logoImage = await doc.embedJpg(logoBytes);
      } catch (err2) {
        console.warn('[statement] Could not embed logo image:', err2.message);
        logoEmbedError = true;
      }
    }
  }

  let page;
  let y;

  // ── Draw helpers ──────────────────────────────────────────────

  const txt = (str, x, yPos, size = 8, bold = false, color = DARK_GRAY, italic = false) => {
    const f = italic ? fontI : (bold ? fontB : font);
    page.drawText(String(str), { x, y: yPos, size, font: f, color });
  };

  const hline = (yPos, thickness = 0.4, color = LIGHT_GRAY, xStart = MARGIN, xEnd = PAGE_W - MARGIN) => {
    page.drawLine({ start: { x: xStart, y: yPos }, end: { x: xEnd, y: yPos }, thickness, color });
  };

  const rect = (x, yPos, w, h, color, borderColor = null, borderThickness = 0) => {
    page.drawRectangle({
      x, y: yPos, width: w, height: h,
      color,
      ...(borderColor ? { borderColor, borderWidth: borderThickness } : {}),
    });
  };

  const statusColor = (status) => {
    const s = labelStatus(status, t).toLowerCase();
    if (s === t.status_success.toLowerCase())   return GREEN;
    if (s === t.status_failed.toLowerCase())    return RED;
    if (s === t.status_pending.toLowerCase())   return ORANGE;
    if (s === t.status_cancelled.toLowerCase()) return RED;
    return MID_GRAY;
  };

  const drawLogo = (px, py, size = 28) => {
    if (logoImage && !logoEmbedError) {
      const dims = logoImage.scaleToFit(size, size);
      page.drawImage(logoImage, { x: px, y: py, width: dims.width, height: dims.height });
    } else {
      page.drawEllipse({ x: px + size / 2, y: py + size / 2, xScale: size / 2, yScale: size / 2, color: BRAND_GREEN });
      const aw = size * 0.32;
      const ah = size * 0.55;
      const ax = px + (size - aw) / 2;
      const ay = py + (size - ah) / 2;
      page.drawRectangle({ x: ax,            y: ay, width: aw * 0.3, height: ah, color: rgb(1,1,1) });
      page.drawRectangle({ x: ax + aw * 0.7, y: ay, width: aw * 0.3, height: ah, color: rgb(1,1,1) });
      page.drawRectangle({ x: ax,            y: ay + ah * 0.45, width: aw, height: ah * 0.15, color: rgb(1,1,1) });
    }
  };

  // ── Statistics ─────────────────────────────────────────────────
  const closingBalance = Number(balance.users_balance_amount);
  const openingBalance = computeOpeningBalance(rows, user.users_id, closingBalance);

  const totalCredits = rows
    .filter(r => getTransactionAmount(r) > 0)
    .reduce((a, r) => a + getTransactionAmount(r), 0);

  const totalDebits = rows
    .filter(r => getTransactionAmount(r) < 0)
    .reduce((a, r) => a + getTransactionAmount(r), 0);

  const creditCount = rows.filter(r => getTransactionAmount(r) > 0).length;
  const debitCount  = rows.filter(r => getTransactionAmount(r) < 0).length;

  const walletStats = computeWalletStats(rows);

  // ADC is always the primary/internal wallet currency.
  // We derive it by scanning rows rather than trusting the first row's sender currency
  // (which may be an external fiat currency like NGN on a top-up row).
  const walletCurrency = (() => {
    for (const r of rows) {
      const sc = r.payment_profile_sender_details?.payment_wallet_details?.payment_wallet_currency   ?? '';
      const rc = r.payment_profile_receiver_details?.payment_wallet_details?.payment_wallet_currency ?? '';
      if (sc === 'ADC') return 'ADC';
      if (rc === 'ADC') return 'ADC';
    }
    return rows[0]?.payment_profile_sender_details?.payment_wallet_details?.payment_wallet_currency ?? '';
  })();

  // ── Page factory ──────────────────────────────────────────────
  const addPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y    = PAGE_H - MARGIN;
  };

  // ── Per-page footer ───────────────────────────────────────────
  // Line 1: disclaimer note (left) | Page N (right)
  // Line 2: Credit Count / Debit Count (centred)
  const drawPageFooter = () => {
    hline(MARGIN + 26, 0.5, LIGHT_GRAY);

    // Line 1
    txt(t.footerNote, MARGIN, MARGIN + 16, 6, false, LIGHT_GRAY);
    const pageCount = doc.getPageCount();
    const pageStr   = `Page ${pageCount}`;
    const pageW     = font.widthOfTextAtSize(pageStr, 6.5);
    txt(pageStr, PAGE_W - MARGIN - pageW, MARGIN + 16, 6.5, false, MID_GRAY);

    // Line 2 — credit/debit counts centred
    const statsStr = `${t.creditCount}: ${creditCount}     ${t.debitCount}: ${debitCount}`;
    const statsW   = font.widthOfTextAtSize(statsStr, 6.5);
    txt(statsStr, PAGE_W / 2 - statsW / 2, MARGIN + 5, 6.5, true, MID_GRAY);
  };

  // ── Table column header row ───────────────────────────────────
  const drawTableHeader = () => {
    const rowH = 18;
    rect(MARGIN, y - rowH + 4, TABLE_W, rowH, HEADER_BG);
    let cx = MARGIN + 4;
    COLUMNS.forEach((col) => {
      txt(col.label, cx, y - rowH + 9, 7, true, HEADER_TEXT);
      cx += col.w;
    });
    y -= rowH;
    hline(y, 0.5, BRAND_GREEN, MARGIN, MARGIN + TABLE_W);
    y -= 2;
  };

  const FOOTER_H = 34; // two-line footer height
  const ensureSpace = (needed) => {
    if (y - needed < MARGIN + FOOTER_H) {
      drawPageFooter();
      addPage();
      drawTableHeader();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // PAGE 1 — COVER / HEADER
  // ─────────────────────────────────────────────────────────────
  addPage();

  // ── Top brand bar ──
  const BAR_H = 52;
  rect(0, PAGE_H - BAR_H, PAGE_W, BAR_H, BRAND_DARK);

  drawLogo(MARGIN, PAGE_H - BAR_H + 12, 28);

  txt(t.academix,      MARGIN + 36, PAGE_H - BAR_H + 30, 20, true, rgb(1,1,1));
  txt(t.brandTagline,  MARGIN + 36, PAGE_H - BAR_H + 14, 7.5, false, rgb(0.75,0.75,0.75));

  txt(t.accountStatement, PAGE_W - MARGIN - 110, PAGE_H - BAR_H + 30, 14, true, rgb(1,1,1));
  txt(`${t.generated}: ${new Date().toUTCString()}`, PAGE_W - MARGIN - 145, PAGE_H - BAR_H + 14, 7, false, rgb(0.75,0.75,0.75));

  hline(PAGE_H - BAR_H, 1.5, ACCENT_LINE, 0, PAGE_W);

  y = PAGE_H - BAR_H - 18;

  // ── Account info block ──
  const INFO_X1 = MARGIN;
  const INFO_X2 = 310;

  txt(t.accountHolder,   INFO_X1, y, 7, true, BRAND_GREEN);
  txt(t.statementPeriod, INFO_X2, y, 7, true, BRAND_GREEN);
  y -= 13;

  txt(user.users_names,                         INFO_X1, y, 11, true, DARK_GRAY);
  txt(`${fromDate}  ${t.to}  ${toDate}`,        INFO_X2, y, 10, true, DARK_GRAY);
  y -= 12;

  txt(`${user.users_username}`,                 INFO_X1, y, 8, false, MID_GRAY);
  txt(`${t.accountType}: ${t.currentAccount}`,  INFO_X2, y, 8, false, MID_GRAY);
  y -= 10;

  txt(user.users_email,                         INFO_X1, y, 8, false, MID_GRAY);
  txt(`${t.statementDate}: ${new Date().toLocaleDateString('en-GB')}`, INFO_X2, y, 8, false, MID_GRAY);
  y -= 10;

  txt(user.users_phone ?? '',                   INFO_X1, y, 8, false, MID_GRAY);
  y -= 16;

  hline(y, 0.6, ACCENT_LINE);
  y -= 14;

  // ── ADC Balance summary cards ──
  const CARD_W   = 148;
  const CARD_H   = 52;
  const CARD_GAP = 10;
  const adcCards = [
    { label: t.openingBalance,    value: formatAmount(openingBalance, walletCurrency), color: DARK_GRAY   },
    { label: t.totalCreditAmount, value: formatAmount(totalCredits,   walletCurrency), color: GREEN       },
    { label: t.totalDebitAmount,  value: formatAmount(totalDebits,    walletCurrency), color: RED         },
    { label: t.closingBalance,    value: formatAmount(closingBalance,  walletCurrency), color: BRAND_GREEN },
    { label: t.transactions,      value: String(rows.length),                          color: DARK_GRAY   },
  ];

  let cardX = MARGIN;
  adcCards.forEach((card) => {
    rect(cardX, y - CARD_H, CARD_W, CARD_H, ROW_EVEN, LIGHT_GRAY, 0.5);
    rect(cardX, y - 4, CARD_W, 4, card.color);
    txt(card.label, cardX + 8, y - 18, 7, false, MID_GRAY);
    txt(card.value, cardX + 8, y - 34, 9, true,  card.color);
    cardX += CARD_W + CARD_GAP;
  });
  y -= CARD_H + 14;

  // ── Other-wallet balance summary cards ──
  if (walletStats.length > 0) {
    hline(y, 0.4, LIGHT_GRAY);
    y -= 12;

    txt(t.walletSummary, MARGIN, y, 7, true, WALLET_HEAD);
    y -= 12;

    // Each wallet gets a compact card with 4 stats: Open | Credits | Debits | Closing
    // WC_H must be tall enough for: top bar (4) + currency label (16) + 2 rows of label+value (each ~20px) = ~70
    const WC_W   = 186;
    const WC_H   = 74;
    const WC_GAP = 8;
    const perRow = Math.floor((PAGE_W - 2 * MARGIN + WC_GAP) / (WC_W + WC_GAP));

    let wx      = MARGIN;
    let rowTopY = y;  // y at the top of current card row

    walletStats.forEach((ws, idx) => {
      if (idx > 0 && idx % perRow === 0) {
        // Advance y past the current row and reset x
        y       = rowTopY - WC_H - 10;
        rowTopY = y;
        wx      = MARGIN;
      }

      // Card background + top accent bar
      rect(wx, rowTopY - WC_H, WC_W, WC_H, WALLET_BG, LIGHT_GRAY, 0.5);
      rect(wx, rowTopY - 4,    WC_W, 4,    BRAND_GREEN);

      // Currency label — sits just below the top accent bar
      txt(ws.currency, wx + 8, rowTopY - 17, 9, true, WALLET_HEAD);

      // Two columns of stats, two rows each
      const col1 = wx + 8;
      const col2 = wx + WC_W / 2 + 4;

      // Row 1: Opening Balance | Total Credit Amount
      txt(t.openingBalance + ':',    col1, rowTopY - 29, 6, false, MID_GRAY);
      txt(formatAmount(ws.opening, ws.currency),  col1, rowTopY - 39, 7, true, DARK_GRAY);

      txt(t.totalCreditAmount + ':', col2, rowTopY - 29, 6, false, MID_GRAY);
      txt(formatAmount(ws.credits, ws.currency),  col2, rowTopY - 39, 7, true, GREEN);

      // Row 2: Total Debit Amount | Closing Balance
      txt(t.totalDebitAmount + ':',  col1, rowTopY - 52, 6, false, MID_GRAY);
      txt(formatAmount(-ws.debits, ws.currency),  col1, rowTopY - 62, 7, true, RED);

      txt(t.closingBalance + ':',    col2, rowTopY - 52, 6, false, MID_GRAY);
      txt(formatAmount(ws.closing, ws.currency),  col2, rowTopY - 62, 7, true, BRAND_GREEN);

      wx += WC_W + WC_GAP;
    });

    // Advance y past the last card row
    y = rowTopY - WC_H - 14;
  }

  hline(y, 0.4, LIGHT_GRAY);
  y -= 14;

  // ─────────────────────────────────────────────────────────────
  // TRANSACTION TABLE
  // ─────────────────────────────────────────────────────────────
  drawTableHeader();

  rows.forEach((r, idx) => {
    ensureSpace(LINE_H + 2);

    const sc  = r.payment_profile_sender_details?.payment_wallet_details?.payment_wallet_currency   ?? '';
    const rc  = r.payment_profile_receiver_details?.payment_wallet_details?.payment_wallet_currency ?? '';

    const sentAmt = Number(r.transaction_sender_amount);
    const rcvdAmt = Number(r.transaction_receiver_amount);
    const feeAmt  = Number(r.transaction_fee);
    const rate    = Number(r.transaction_sender_rate ?? 1);

    const description = r.transaction_description ?? labelTransactionType(r.transaction_type, t);

    const rowBg = idx % 2 === 0 ? ROW_EVEN : ROW_ODD;
    rect(MARGIN, y - LINE_H + 3, TABLE_W, LINE_H, rowBg);

    const cells = [
      { v: new Date(r.transaction_created_at).toLocaleDateString('en-GB'),          color: DARK_GRAY },
      { v: (r.sort_created_id ?? '').slice(0, 18),                                  color: MID_GRAY  },
      { v: description.length > 24 ? description.slice(0, 22) + '…' : description, color: DARK_GRAY },
      { v: formatAmount(sentAmt, sc),   color: sentAmt < 0 ? RED : DARK_GRAY },
      { v: formatAmount(rcvdAmt, rc),   color: rcvdAmt > 0 ? GREEN : DARK_GRAY },
      { v: formatAmount(feeAmt, sc),    color: feeAmt  > 0 ? RED  : DARK_GRAY },
      { v: getTransactionAmount(r) > 0 ? 'CR' : 'DR', color: getTransactionAmount(r) > 0 ? GREEN : RED },
      { v: rate.toFixed(4),                            color: MID_GRAY  },
      { v: labelStatus(r.transaction_sender_status,   t), color: statusColor(r.transaction_sender_status)   },
      { v: labelStatus(r.transaction_receiver_status, t), color: statusColor(r.transaction_receiver_status) },
    ];

    let cx = MARGIN + 3;
    cells.forEach((cell, i) => {
      const maxW = COLUMNS[i].w - 6;
      let display = String(cell.v);
      while (display.length > 3 && font.widthOfTextAtSize(display, 7) > maxW) {
        display = display.slice(0, -1);
      }
      txt(display, cx, y - LINE_H + 6, 7, false, cell.color);
      cx += COLUMNS[i].w;
    });

    hline(y - LINE_H + 3, 0.2, rgb(0.88, 0.88, 0.88), MARGIN, MARGIN + TABLE_W);
    y -= LINE_H;
  });

  // ── Summary footer section ─────────────────────────────────────
  ensureSpace(80 + walletStats.length * 14);
  y -= 10;
  hline(y, 0.8, ACCENT_LINE);
  y -= 14;

  txt(t.statementSummary, MARGIN, y, 8, true, BRAND_GREEN);
  y -= 12;

  const summaryRows = [
    [t.accountHolder,     user.users_names],
    [t.accountType,       t.currentAccount],
    [t.statementPeriod,   `${fromDate}  ${t.to}  ${toDate}`],
    [t.openingBalance,    formatAmount(openingBalance, walletCurrency)],
    [t.totalCredits,      formatAmount(totalCredits,   walletCurrency)],
    [t.totalDebits,       formatAmount(totalDebits,    walletCurrency)],
    [t.closingBalance,    formatAmount(closingBalance,  walletCurrency)],
    [t.totalTransactions, String(rows.length)],
    [t.creditCount,       String(creditCount)],
    [t.debitCount,        String(debitCount)],
  ];

  summaryRows.forEach(([label, value]) => {
    txt(`${label}:`, MARGIN, y, 8, false, MID_GRAY);
    txt(value,       MARGIN + 140, y, 8, true, DARK_GRAY);
    y -= 11;
  });

  // ── Other-wallet summary in footer ───────────────────────────
  if (walletStats.length > 0) {
    ensureSpace(14 + walletStats.length * 11 + 10);
    y -= 8;
    hline(y, 0.4, LIGHT_GRAY);
    y -= 10;

    txt(t.walletSummary, MARGIN, y, 7, true, BRAND_GREEN);
    y -= 11;

    // Column headers
    txt('Currency',         MARGIN,       y, 7, true, MID_GRAY);
    txt(t.openingBalance,   MARGIN + 60,  y, 7, true, MID_GRAY);
    txt(t.totalCredits,     MARGIN + 160, y, 7, true, MID_GRAY);
    txt(t.totalDebits,      MARGIN + 260, y, 7, true, MID_GRAY);
    txt(t.closingBalance,   MARGIN + 360, y, 7, true, MID_GRAY);
    y -= 11;
    hline(y + 8, 0.3, LIGHT_GRAY, MARGIN, MARGIN + 460);

    walletStats.forEach((ws) => {
      txt(ws.currency,                           MARGIN,       y, 8, true,  DARK_GRAY);
      txt(formatAmount(ws.opening,  ws.currency), MARGIN + 60,  y, 8, false, DARK_GRAY);
      txt(formatAmount(ws.credits,  ws.currency), MARGIN + 160, y, 8, false, GREEN);
      txt(formatAmount(-ws.debits,  ws.currency), MARGIN + 260, y, 8, false, RED);
      txt(formatAmount(ws.closing,  ws.currency), MARGIN + 360, y, 8, true,  BRAND_GREEN);
      y -= 11;
    });
  }

  // ── Disclaimer ────────────────────────────────────────────────
  y -= 10;
  hline(y, 0.4, LIGHT_GRAY);
  y -= 10;
  txt(t.disclaimer, MARGIN, y, 6.5, false, MID_GRAY);

  // ── Final page footer ─────────────────────────────────────────
  drawPageFooter();

  return doc.save();
}

// ── Email dispatch via ZeptoMail ───────────────────────────────

async function sendEmail(toEmail, fromDate, toDate, format, fileBytes, userName, t) {
  const subject  = t.emailSubject(fromDate, toDate);
  const filename = `academix-statement-${fromDate}-${toDate}.${format}`;
  const mimeType = format === 'csv' ? 'text/csv' : 'application/pdf';

  const bodyText = [
    t.emailGreeting(userName),
    '',
    t.emailBody(fromDate, toDate),
    '',
    t.emailWarning,
    '',
    t.emailTeam,
  ].join('\n');

  const bodyHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#082808;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:22px">${t.academix}</h1>
        <p style="color:#aaa;margin:4px 0 0;font-size:12px">${t.brandTagline}</p>
      </div>
      <div style="background:#f9f9f9;padding:28px 32px;border:1px solid #e0e0e0;border-top:none">
        <p style="color:#333;font-size:15px">${t.emailGreeting(`<strong>${userName}</strong>`)}</p>
        <p style="color:#555;font-size:14px;line-height:1.6">
          ${t.emailBody(`<strong>${fromDate}</strong>`, `<strong>${toDate}</strong>`)}
        </p>
        <p style="color:#555;font-size:13px;margin-top:24px">
          ${t.emailWarning.replace(
            'academix.app@jimstechinnovations.com',
            '<a href="mailto:academix.app@jimstechinnovations.com" style="color:#0a7d14">academix.app@jimstechinnovations.com</a>'
          )}
        </p>
      </div>
      <div style="background:#eee;padding:14px 32px;border-radius:0 0 8px 8px;text-align:center">
        <p style="color:#999;font-size:11px;margin:0">
          ${t.academix} &mdash; Jimstech Innovations Nigeria Limited &copy; 2025. All rights reserved.
        </p>
      </div>
    </div>`;

  await transporter.sendMail({
    from: `"${t.academix}" <noreply@jimstechinnovations.com>`,
    to:   toEmail,
    subject,
    text: bodyText,
    html: bodyHtml,
    attachments: [{
      filename,
      content:     Buffer.from(fileBytes),
      contentType: mimeType,
    }],
  });
}

// ── Handler ────────────────────────────────────────────────────

export async function handler(event) {

  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return respondJson(400, { error: 'Invalid request body' });
  }

  const { userId, country, locale, gender, age, email, fromDate, toDate, format } = body;

  if (!userId || !email || !fromDate || !toDate || !format) {
    return respondJson(400, { error: 'Missing required fields' });
  }
  if (!['pdf', 'csv'].includes(format)) {
    return respondJson(400, { error: 'format must be pdf or csv' });
  }

  const t = getT(locale);

  const from     = new Date(fromDate);
  const to       = new Date(toDate);
  const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);

  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
    return respondJson(400, { error: 'Invalid date range' });
  }
  if (diffDays > 366) {
    return respondJson(400, { error: 'Date range cannot exceed 1 year' });
  }

  const { data: userRows, error: userErr } = await supabase
    .from('users_table')
    .select('users_id, users_names, users_username, users_email, users_phone, users_dob, users_sex')
    .eq('users_id', userId)
    .limit(1);

  if (userErr || !userRows?.length) {
    console.error('[statement] User fetch error:', userErr);
    return respondJson(500, { error: 'Failed to fetch user profile' });
  }
  const user = userRows[0];

  const { data: balRows, error: balErr } = await supabase
    .schema('personal')
    .from('users_balance_table')
    .select('users_balance_amount, users_balance_updated_at')
    .eq('users_id', userId)
    .limit(1);

  if (balErr) {
    console.error('[statement] Balance fetch error:', balErr);
    return respondJson(500, { error: 'Failed to fetch balance' });
  }
  const balance = balRows?.[0] ?? { users_balance_amount: 0 };

  const allTransactions = [];
  let afterCursor = {};
  const CHUNK = 1000;

  do {
    const { data, error } = await supabase.rpc('fetch_user_transactions', {
      p_user_id:            userId,
      p_country:            country,
      p_locale:             locale,
      p_gender:             gender,
      p_age:                age,
      p_limit_by:           CHUNK,
      p_after_transactions: afterCursor,
    });

    if (error) {
      console.error('[statement] RPC error:', error);
      return respondJson(500, { error: 'Failed to fetch transactions' });
    }

    const chunk = data ?? [];

    const filtered = chunk.filter((r) => {
      const d = new Date(r.transaction_created_at);
      return d >= from && d <= to;
    });

    allTransactions.push(...filtered);

    if (chunk.length < CHUNK) break;

    const last = chunk[chunk.length - 1];
    afterCursor = { sort_id: last.sort_created_id, direction: 'oldest' };
  } while (true);

  console.log('[statement] Transactions fetched:', allTransactions.length);

  let fileBytes;
  if (format === 'csv') {
    fileBytes = buildCsv(allTransactions, user, balance, t);
  } else {
    fileBytes = await buildPdf(allTransactions, fromDate, toDate, user, balance, t);
  }

  console.log('[statement] File size:', fileBytes.length, 'bytes');
  console.log('[statement] Sending to:', email);

  try {
    await sendEmail(email, fromDate, toDate, format, fileBytes, user.users_names, t);
  } catch (err) {
    console.error('[statement] ZeptoMail error:', err);
    return respondJson(500, { error: 'Failed to send email' });
  }

  return respondJson(200, {
    status:  'success',
    message: `Statement sent to ${email}`,
    count:   allTransactions.length,
  });
}
