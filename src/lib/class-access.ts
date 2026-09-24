import "server-only";
import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";
import { isAdminEmail } from "./admin";
import { createServiceSupabase } from "./supabase-server";
import type { Video } from "@/types/database";

// ตรวจสิทธิ์เข้าเรียน: ต้องมี purchase ที่ approved และบัญชียังใช้งานอยู่ (Admin ดูได้ทุกคอร์ส)
export async function getClassAccess(supabase: SupabaseClient, user: AuthUser, classId: string) {
  if (isAdminEmail(user.email)) {
    const { data } = await createServiceSupabase()
      .from("videos").select("*").eq("class_id", classId).order("order_index");
    return { hasAccess: true, pending: false, inactive: false, videos: (data ?? []) as Video[] };
  }

  const [{ data: profile }, { data: purchases }] = await Promise.all([
    supabase.from("users").select("status").eq("id", user.id).maybeSingle(),
    supabase.from("purchases").select("status").eq("user_id", user.id).eq("class_id", classId),
  ]);
  const approved = purchases?.some((p) => p.status === "approved") ?? false;
  const pending = purchases?.some((p) => p.status === "pending") ?? false;
  const active = !profile || profile.status === "active";

  if (!active) return { hasAccess: false, pending, inactive: true, videos: [] as Video[] };
  if (!approved) return { hasAccess: false, pending, inactive: false, videos: [] as Video[] };

  // RLS policy "videos: purchased only" กรองให้อีกชั้น
  const { data } = await supabase.from("videos").select("*").eq("class_id", classId).order("order_index");
  return { hasAccess: true, pending: false, inactive: false, videos: (data ?? []) as Video[] };
}
