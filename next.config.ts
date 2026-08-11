import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * Why this matters more here than on a typical site: Supabase keeps the session as a BEARER TOKEN in
 * localStorage, so any script injection is a full session theft — and this app moves money. See
 * ACADEMIX_PLAN Part V, S15.
 *
 * Origins below are the ones the app actually talks to (4 API Gateways, Supabase REST + Realtime,
 * flagcdn for country flags). Keep this list in step with the code — a missing origin shows up as a
 * blocked request, so grep for new hosts when adding an integration.
 */
const SUPABASE_ORIGIN = 'https://iewqfmkngcgayxbbnpiz.supabase.co';
const SUPABASE_WS = 'wss://iewqfmkngcgayxbbnpiz.supabase.co';
const API_GATEWAYS = [
  'https://fz0b8vmhba.execute-api.eu-north-1.amazonaws.com',
  'https://elfoxu5sxf.execute-api.eu-north-1.amazonaws.com',
  'https://n8pk6w16kd.execute-api.eu-north-1.amazonaws.com',
  'https://vsso71jg7d.execute-api.eu-north-1.amazonaws.com',
].join(' ');

const csp = [
  "default-src 'self'",
  // 'unsafe-inline'/'unsafe-eval' are required by Next.js's own bootstrap without a nonce. Removing
  // them needs nonce-based CSP via middleware — tracked as the hardening follow-up in Part V, S15.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN} https://flagcdn.com`,
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS} ${API_GATEWAYS}`,
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  // Clickjacking: no one may frame this app. Doubled with X-Frame-Options for older browsers.
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

/**
 * CSP ships REPORT-ONLY by default and enforcing only when CSP_ENFORCE=true.
 *
 * This is deliberate, not timidity: a CSP that is even slightly wrong white-screens the app, and a
 * payments UI is the worst place to discover that. Report-Only surfaces every violation in the
 * browser console while breaking nothing, so one pass over the real flows (login, quiz, top-up,
 * withdraw, payment profiles) proves the policy before it can lock anyone out. Flip the env var
 * once that pass is clean — the policy itself does not change.
 */
const cspHeaderName = process.env.CSP_ENFORCE === 'true'
  ? 'Content-Security-Policy'
  : 'Content-Security-Policy-Report-Only';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  // Don't advertise the framework/version to attackers fingerprinting for known CVEs.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'iewqfmkngcgayxbbnpiz.supabase.co',
        // optional: pathPattern: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: cspHeaderName, value: csp },
          // Enforced from the start: these cannot break a correctly-built app.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Don't leak in-app paths (which can carry ids) to third-party sites via Referer.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Deny hardware/ambient APIs this app never uses, so injected script can't reach them.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
          // 2 years + preload is the HSTS preload-list requirement.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
