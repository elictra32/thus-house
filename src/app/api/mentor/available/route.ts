import { NextResponse } from "next/server";
import { requireApiUser, jsonError, getPermissions } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase-server";

// สมาชิกที่ยังไม่มี Mentor ดูแล (ให้ Mentor เลือกได้เลย) — เฉพาะ Role Member ที่ยังใช้งานอยู่
export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  if (!(await getPermissions(auth.user.id, auth.user.email)).has("mentor")) return jsonError("เฉพาะ Mentor", 403);
  const service = createServiceSupabase();
  const [{ data: users }, { data: taken }] = await Promise.all([
    service.from("users").select("id, name, nickname, member_code, avatar_url, created_at")
      .eq("role", "member").eq("status", "active").order("member_code", { ascending: true, nullsFirst: false }).limit(1000),
    service.from("mentor_members").select("member_id"),
  ]);
  const takenIds = new Set((taken ?? []).map((t) => t.member_id));
  const members = (users ?? []).filter((u) => u.id !== auth.user.id && !takenIds.has(u.id));
  return NextResponse.json({ members });
}
