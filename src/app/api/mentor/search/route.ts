import { NextResponse } from "next/server";
import { requireApiUser, jsonError, getPermissions } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase-server";

// Mentor ค้นหาสมาชิกเพื่อเพิ่มเข้าความดูแล (รหัส / ชื่อ / ชื่อเล่น) — คืนข้อมูลน้อยที่สุด
export async function GET(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  if (!(await getPermissions(auth.user.id, auth.user.email)).has("mentor")) return jsonError("เฉพาะ Mentor", 403);
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().replace(/[,()%\\]/g, " ");
  if (q.length < 1) return NextResponse.json({ results: [] });
  const { data } = await createServiceSupabase()
    .from("users").select("id, name, nickname, member_code, avatar_url")
    .or(`name.ilike.%${q}%,nickname.ilike.%${q}%,member_code.ilike.%${q}%`)
    .neq("id", auth.user.id).limit(10);
  return NextResponse.json({ results: data ?? [] });
}
