import "server-only";
import { createServerSupabase } from "./supabase-server";
import { supabaseConfigured } from "./admin";
import type { Class } from "@/types/database";

// คอร์สที่แสดงบนหน้าแรก (ยังไม่เชื่อม Supabase = ไม่แสดง)
export async function getPublicClasses(): Promise<Class[]> {
  if (!supabaseConfigured()) return [];
  const { data } = await createServerSupabase().from("classes").select("*").order("created_at");
  return (data ?? []) as Class[];
}
