"use client";
import { createBrowserClient } from "@supabase/ssr";

// Supabase client สำหรับฝั่ง browser
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
