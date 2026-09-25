import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { jsonError } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { isEmailDeliveryError, unconfirmedUserIds } from "@/lib/email-confirm";
import { notifyDiscord } from "@/lib/discord";
import { botEnabled, postSignupReview } from "@/lib/discord-bot";

export async function POST(req: Request) {
  const { name: rawName, nickname: rawNick, phone: rawPhone, email: rawEmail, password } = await req.json().catch(() => ({}));
  const name = typeof rawName === "string" ? rawName.trim().slice(0, 100) : "";
  const nickname = typeof rawNick === "string" ? rawNick.trim().slice(0, 50) : "";
  const phone = typeof rawPhone === "string" ? rawPhone.trim() : "";
  if (!name) return jsonError("กรุณากรอกชื่อ–นามสกุล");
  if (!nickname) return jsonError("กรุณากรอกชื่อเล่น");
  if (!/^[0-9+\-\s]{9,20}$/.test(phone)) return jsonError("กรุณากรอกเบอร์โทรให้ถูกต้อง");
  const profile = { name, nickname, phone };
  if (!rawEmail || typeof rawEmail !== "string" || !/^\S+@\S+\.\S+$/.test(rawEmail)) return jsonError("รูปแบบอีเมลไม่ถูกต้อง");
  if (!password || String(password).length < 8) return jsonError("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
  const email = rawEmail.trim().toLowerCase();
  const service = createServiceSupabase();

  // อีเมล Admin ต้องให้ Admin ที่มีอยู่ยืนยันเสมอ — กันคนอื่นสมัครด้วยอีเมล Admin แล้วได้สิทธิ์ Admin
  if (isAdminEmail(email)) return createPendingUser(service, profile, email, String(password));

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: profile,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login`,
    },
  });
  if (error) {
    if (/registered|exists/i.test(error.message)) return jsonError("อีเมลนี้ถูกใช้สมัครแล้ว");
    // ส่งอีเมลยืนยันไม่ได้ → ยังสมัครได้ แต่ต้องรอ Admin ยืนยันบัญชีก่อนเข้าสู่ระบบ
    if (isEmailDeliveryError(error)) return createPendingUser(service, profile, email, String(password));
    return jsonError(error.message, 400);
  }
  // Supabase คืน user ที่ไม่มี identities เมื่ออีเมลนี้มีอยู่แล้ว (กรณีเปิดยืนยันอีเมล)
  if (data.user && data.user.identities?.length === 0) return jsonError("อีเมลนี้ถูกใช้สมัครแล้ว");

  // สำรองกรณีไม่ได้ติดตั้ง trigger handle_new_user ใน schema.sql
  if (data.user) {
    await service
      .from("users")
      .upsert({ id: data.user.id, email, ...profile }, { onConflict: "id", ignoreDuplicates: true });
    if (data.session) {
      await service.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
    }
  }

  await notifyDiscord("signup", "สมาชิกสมัครใหม่", { ชื่อ: name, ชื่อเล่น: nickname, เบอร์: phone, อีเมล: email }, "/admin/members");
  return NextResponse.json({ needsConfirmation: !data.session, pendingAdmin: false });
}

// สร้างบัญชีแบบยังไม่ยืนยันอีเมล โดยไม่ส่งอีเมล — Admin กดยืนยันให้ที่หน้าสมาชิก
type Profile = { name: string; nickname: string; phone: string };
async function createPendingUser(service: SupabaseClient, profile: Profile, email: string, password: string) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: profile,
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
    .upsert({ id: data.user.id, email, ...profile }, { onConflict: "id", ignoreDuplicates: true });
  const info = { ชื่อ: profile.name, ชื่อเล่น: profile.nickname, เบอร์: profile.phone, อีเมล: email };
  // มี Discord Bot → มีปุ่ม "ยืนยันอีเมลแทน" · ไม่มี → แจ้งเตือนแบบเดิม
  const posted = await postSignupReview(data.user.id, info);
  if ("error" in posted) {
    await notifyDiscord("signup", "สมาชิกสมัครใหม่ (รอ Admin ยืนยันอีเมล)", {
      ...info, "⚠️ ปุ่มยืนยันใน Discord ไม่ขึ้นเพราะ": botEnabled() ? posted.error : null,
    }, "/admin/members?status=unconfirmed");
  }
  return NextResponse.json({ needsConfirmation: true, pendingAdmin: true });
}
