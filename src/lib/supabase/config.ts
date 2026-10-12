// The publishable key is safe to use in the browser: it only allows what
// row-level security permits. Secret keys must never appear in this app's code.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured =
  /^https?:\/\//.test(supabaseUrl) && supabaseKey.length > 0 && !supabaseKey.includes("your_key_here");
