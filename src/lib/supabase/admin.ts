import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Admin Supabase Client.
 * Uses SUPABASE_SERVICE_ROLE_KEY to perform privileged operations:
 * - Assigning atomic member numbers
 * - Verifying administrative privileges
 * - Linking auth users to members
 *
 * CRITICAL SECURITY: Never import this module in client components or expose to browser!
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
