import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export { MEMBER_ACTIONS } from "./member-actions";

// ไม่ให้ Log ล้มทำให้งานหลักพัง
export async function logMember(service: SupabaseClient, userId: string, action: string, details?: Record<string, unknown>) {
  try {
    await service.from("member_logs").insert({ user_id: userId, action, details: details ?? null });
  } catch (err) {
    console.error("member log failed", err);
  }
}
