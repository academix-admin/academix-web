"use server";

import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
process.env.SUPABASE_URL!,           // Use private env, not NEXT_PUBLIC
process.env.SUPABASE_SERVICE_ROLE_KEY! // Never expose this to client
);
