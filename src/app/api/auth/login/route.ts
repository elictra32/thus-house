import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { jsonError } from "@/lib/auth";

const NOT_CONFIRMED = "บัญชียังไม่ได้ยืนยันอีเมล — กดลิงก์ยืนยันในอีเมล หรือรอทีมงานยืนยันบัญชีให้";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return jsonError("กรุณากรอกอีเมลและรหัสผ่าน");

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const msg = /confirm/i.test(error?.message ?? "") ? NOT_CONFIRMED : "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    return jsonError(msg, 401);
  }
  // บัญชีที่สมัครตอนส่งอีเมลยืนยันไม่ได้ ต้องรอ Admin ยืนยันก่อน (ไม่ขึ้นกับการตั้งค่า Confirm email ของ Supabase)
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    return jsonError(NOT_CONFIRMED, 403);
  }

  const service = createServiceSupabase();
  const { data: profile } = await service.from("users").select("status").eq("id", data.user.id).maybeSingle();
  if (profile?.status === "suspended") {
    await supabase.auth.signOut();
    return jsonError("บัญชีนี้ถูกระงับ กรุณาติดต่อทีมงาน", 403);
  }

  const now = new Date().toISOString();
  const { data: updated } = await service.from("users").update({ last_login_at: now }).eq("id", data.user.id).select("id");
  if (!updated?.length) {
    // ยังไม่มีแถวใน users (เช่น ไม่ได้ติดตั้ง trigger) — สร้างให้
    await service.from("users").insert({
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name ?? null,
      last_login_at: now,
    });
  }

  return NextResponse.json({ ok: true });
}
