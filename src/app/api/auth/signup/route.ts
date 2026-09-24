import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { jsonError } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { isEmailDeliveryError, unconfirmedUserIds } from "@/lib/email-confirm";

export async function POST(req: Request) {
  const { name, email: rawEmail, password } = await req.json().catch(() => ({}));
  if (!name || typeof name !== "string") return jsonError("กรุณากรอกชื่อ");
  if (!rawEmail || typeof rawEmail !== "string" || !/^\S+@\S+\.\S+$/.test(rawEmail)) return jsonError("รูปแบบอีเมลไม่ถูกต้อง");
  if (!password || String(password).length < 8) return jsonError("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
  const email = rawEmail.trim().toLowerCase();
  const service = createServiceSupabase();

  // อีเมล Admin ต้องให้ Admin ที่มีอยู่ยืนยันเสมอ — กันคนอื่นสมัครด้วยอีเมล Admin แล้วได้สิทธิ์ Admin
  if (isAdminEmail(email)) return createPendingUser(service, name, email, String(password));

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login`,
    },
  });
  if (error) {
    if (/registered|exists/i.test(error.message)) return jsonError("อีเมลนี้ถูกใช้สมัครแล้ว");
    // ส่งอีเมลยืนยันไม่ได้ → ยังสมัครได้ แต่ต้องรอ Admin ยืนยันบัญชีก่อนเข้าสู่ระบบ
    if (isEmailDeliveryError(error)) return createPendingUser(service, name, email, String(password));
    return jsonError(error.message, 400);
  }
  // Supabase คืน user ที่ไม่มี identities เมื่ออีเมลนี้มีอยู่แล้ว (กรณีเปิดยืนยันอีเมล)
  if (data.user && data.user.identities?.length === 0) return jsonError("อีเมลนี้ถูกใช้สมัครแล้ว");

  // สำรองกรณีไม่ได้ติดตั้ง trigger handle_new_user ใน schema.sql
  if (data.user) {
    await service
      .from("users")
      .upsert({ id: data.user.id, email, name }, { onConflict: "id", ignoreDuplicates: true });
    if (data.session) {
      await service.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
    }
  }

  return NextResponse.json({ needsConfirmation: !data.session, pendingAdmin: false });
}

// สร้างบัญชีแบบยังไม่ยืนยันอีเมล โดยไม่ส่งอีเมล — Admin กดยืนยันให้ที่หน้าสมาชิก
async function createPendingUser(service: SupabaseClient, name: string, email: string, password: string) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { name },
  });
  if (error) {
    if (/registered|exists/i.test(error.message)) {
      // สมัครไว้แล้วแต่ยังไม่ยืนยัน → ยังรอ Admin อยู่
      const { data: row } = await service.from("users").select("id").eq("email", email).maybeSingle();
      if (row && (await unconfirmedUserIds(service)).has(row.id)) {
        return NextResponse.json({ needsConfirmation: true, pendingAdmin: true });
      }
      return jsonError("อีเมลนี้ถูกใช้สมัครแล้ว");
    }
    return jsonError(error.message, 500);
  }
  await service
    .from("users")
    .upsert({ id: data.user.id, email, name }, { onConflict: "id", ignoreDuplicates: true });
  return NextResponse.json({ needsConfirmation: true, pendingAdmin: true });
}
