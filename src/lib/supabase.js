import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function cleanEnvValue(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['"]|['"]$/g, "");
}

export const supabaseUrl = cleanEnvValue(rawSupabaseUrl);
function extractJwtToken(value) {
  const cleaned = cleanEnvValue(value);
  if (!cleaned) return "";
  const candidates = cleaned.split(/\s+/).filter(Boolean);
  const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  const match = candidates.find((candidate) => jwtPattern.test(candidate));
  if (match) return match;
  return cleaned.replace(/\s+/g, "");
}

export const supabaseAnonKey = extractJwtToken(rawSupabaseAnonKey);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
