import "server-only";
import type { User as AuthUser, SupabaseClient } from "@supabase/supabase-js";
import { getPermissions } from "./auth";
import { getClassAccess } from "./class-access";
import { createServiceSupabase } from "./supabase-server";

// ผู้ใช้เข้าถึงวิดีโอนี้ได้ไหม (ต้องมีสิทธิ์เรียนคอร์สของวิดีโอ) — ใช้กับคอมเมนต์/ไลก์
export async function videoAccess(supabase: SupabaseClient, user: AuthUser, videoId: string) {
  const service = createServiceSupabase();
  const { data: video } = await service.from("videos").select("id, class_id, title").eq("id", videoId).maybeSingle();
  if (!video) return { video: null, ok: false, service };
  const access = await getClassAccess(supabase, user, video.class_id);
  return { video, ok: access.hasAccess, service };
}

// ทีมงาน = มีสิทธิ์ community (ตอบ/ลบคอมเมนต์) — แสดงป้าย "ทีมงาน" ใต้ชื่อ
export async function isCommunityStaff(user: AuthUser) {
  return (await getPermissions(user.id, user.email)).has("community");
}

// ชื่อที่แสดงในคอมเมนต์: ชื่อเล่น > ชื่อ > ส่วนหน้าของอีเมล
export function displayName(u: { nickname?: string | null; name?: string | null; email?: string | null } | null) {
  return u?.nickname || u?.name || u?.email?.split("@")[0] || "สมาชิก";
}

// ชื่อที่แสดงใต้คลิป: รหัสสมาชิก + ชื่อเล่น (เช่น "THUS-001 บอส")
export type Person = { nickname?: string | null; name?: string | null; email?: string | null; member_code?: string | null; avatar_url?: string | null };
export function publicPerson(u: Person | null) {
  return { code: u?.member_code || null, name: displayName(u), avatar: u?.avatar_url || null };
}
