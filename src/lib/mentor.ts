import "server-only";
import type { User as AuthUser } from "@supabase/supabase-js";
import { getPermissions } from "./auth";
import { createServiceSupabase } from "./supabase-server";

// ดู/จดโน้ตสมาชิกได้ไหม: Admin สิทธิ์ members ได้ทุกคน · Mentor ได้เฉพาะสมาชิกที่ตัวเองดูแล
export async function canAccessMember(user: AuthUser, memberId: string) {
  const perms = await getPermissions(user.id, user.email);
  if (perms.has("members")) return { ok: true, admin: true, perms };
  if (!perms.has("mentor")) return { ok: false, admin: false, perms };
  const { data } = await createServiceSupabase()
    .from("mentor_members").select("member_id").eq("mentor_id", user.id).eq("member_id", memberId).maybeSingle();
  return { ok: !!data, admin: false, perms };
}

// ข้อมูลสมาชิกที่ Mentor เห็นได้ (ไม่มีเลขบัตร / ที่อยู่)
export const MENTOR_FIELDS =
  "id, name, nickname, member_code, email, phone, avatar_url, status, last_login_at, birth_date, trading_markets, trading_years, learning_goal, created_at";
