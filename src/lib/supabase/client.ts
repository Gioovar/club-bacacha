import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for browser components.
 * Only uses safe public keys. Never receives the service role key.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Graceful fallback for local development before keys are injected
    console.warn("Supabase public credentials missing in environment.");
  }

  return createBrowserClient(url || "https://placeholder.supabase.co", key || "placeholder");
}
