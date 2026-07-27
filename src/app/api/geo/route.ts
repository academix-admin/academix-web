import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Batch IP → location lookup for the device/session list (Workstream G2). Takes the session
 * IPs and returns { ip: { city, region, country, country_code } } via ip-api.com (cached).
 * Authenticated (JWT) so it can't be used as an open geo proxy.
 */

export const runtime = 'nodejs';

type Loc = { city: string; region: string; country: string; country_code: string };
const CACHE = new Map<string, Loc & { ts: number }>();
const TTL = 1000 * 60 * 60 * 6;
const PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|::1$|fe80:|fc00:|fd)/i;

export async function POST(request: NextRequest) {
  try {
    const jwt = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return NextResponse.json({ locations: {} }, { status: 401 });
    const { data, error } = await supabaseAdmin.auth.getUser(jwt);
    if (error || !data.user) return NextResponse.json({ locations: {} }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const raw: unknown[] = Array.isArray(body?.ips) ? body.ips : [];
    const ips: string[] = Array.from(new Set(raw.filter((x): x is string => typeof x === 'string' && x.length > 0)));

    const out: Record<string, Loc> = {};
    const toLookup: string[] = [];
    for (const ip of ips) {
      if (PRIVATE.test(ip)) continue;
      const c = CACHE.get(ip);
      if (c && Date.now() - c.ts < TTL) out[ip] = { city: c.city, region: c.region, country: c.country, country_code: c.country_code };
      else toLookup.push(ip);
    }

    if (toLookup.length) {
      try {
        const res = await fetch('http://ip-api.com/batch?fields=status,country,countryCode,regionName,city,query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toLookup.slice(0, 100)),
        });
        const arr = await res.json();
        if (Array.isArray(arr)) {
          for (const r of arr) {
            if (r?.status === 'success' && r.query) {
              const loc: Loc = { city: r.city || '', region: r.regionName || '', country: r.country || '', country_code: (r.countryCode || '').toLowerCase() };
              out[r.query] = loc;
              CACHE.set(r.query, { ...loc, ts: Date.now() });
            }
          }
        }
      } catch { /* geo is best-effort */ }
    }

    return NextResponse.json({ locations: out });
  } catch {
    return NextResponse.json({ locations: {} }, { status: 200 });
  }
}
