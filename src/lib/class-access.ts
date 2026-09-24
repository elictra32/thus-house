import "server-only";
import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";
import { getPermissions } from "./auth";
import { createServiceSupabase } from "./supabase-server";
import { isActivePurchase } from "./utils";
import type { LessonVideo } from "@/types/database";

// คอลัมน์ที่สมาชิกอ่านได้ — ฐานข้อมูลไม่ให้สมาชิกอ่าน video_url (ต้องขอผ่าน API ทีละบท)
const LESSON_COLUMNS = "id, class_id, title, description, duration_seconds, order_index, created_at";

// ตรวจสิทธิ์เข้าเรียน: ต้องมี purchase ที่ approved และยังไม่หมดอายุ + บัญชียังใช้งานอยู่ (ผู้มีสิทธิ์ classes ดูได้ทุกคอร์ส)
export async function getClassAccess(supabase: SupabaseClient, user: AuthUser, classId: string) {
  if ((await getPermissions(user.id, user.email)).has("classes")) {
    const { data } = await createServiceSupabase()
      .from("videos").select(LESSON_COLUMNS).eq("class_id", classId).order("order_index");
    return { hasAccess: true, pending: false, inactive: false, expired: null, expiresAt: null, videos: (data ?? []) as LessonVideo[] };
  }

  const [{ data: profile }, { data: purchases }] = await Promise.all([
    supabase.from("users").select("status").eq("id", user.id).maybeSingle(),
    supabase.from("purchases").select("status, expires_at").eq("user_id", user.id).eq("class_id", classId),
  ]);
  const list = purchases ?? [];
  const current = list.filter((p) => isActivePurchase(p));
  const pending = list.some((p) => p.status === "pending");
  const active = !profile || profile.status === "active";
  // วันหมดอายุล่าสุดของสิทธิ์ที่ยังใช้ได้ (null = ไม่หมดอายุ)
  const expiresAt = current.some((p) => !p.expires_at)
    ? null
    : current.map((p) => p.expires_at as string).sort().pop() ?? null;
  // เคยมีสิทธิ์แต่หมดอายุแล้ว → คืนวันหมดอายุล่าสุด
  const expired = current.length
    ? null
    : list.filter((p) => p.status === "approved").map((p) => p.expires_at as string).sort().pop() ?? null;

  if (!active) return { hasAccess: false, pending, inactive: true, expired, expiresAt: null, videos: [] as LessonVideo[] };
  if (!current.length) return { hasAccess: false, pending, inactive: false, expired, expiresAt: null, videos: [] as LessonVideo[] };

  // RLS policy "videos: purchased only" กรองให้อีกชั้น
  const { data } = await supabase.from("videos").select(LESSON_COLUMNS).eq("class_id", classId).order("order_index");
  return { hasAccess: true, pending: false, inactive: false, expired: null, expiresAt, videos: (data ?? []) as LessonVideo[] };
}
