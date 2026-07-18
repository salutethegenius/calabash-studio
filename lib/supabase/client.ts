import { createClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (anon key). Not used for app data in V1 —
 * all payment_links / transactions / settings access goes through the
 * Next.js server with the service role. Kept for future client features.
 */
export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required"
    );
  }

  return createClient(url, key);
}
