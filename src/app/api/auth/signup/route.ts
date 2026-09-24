import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { jsonError } from "@/lib/auth";

export async function POST(req: Request) {
  const { name, email, password } = await req.json().catch(() => ({}));
  if (!name || typeof name !== "string") return jsonError("กรุณากรอกชื่อ");
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return jsonError("รูปแบบอีเมลไม่ถูกต้อง");
  if (!password || String(password).length < 8) return jsonError("รหัสผ่านอย่างน้อย 8 ตัวอักษร");

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
    const msg = /registered|exists/i.test(error.message) ? "อีเมลนี้ถูกใช้สมัครแล้ว" : error.message;
    return jsonError(msg, 400);
  }
  // Supabase คืน user ที่ไม่มี identities เมื่ออีเมลนี้มีอยู่แล้ว (กรณีเปิดยืนยันอีเมล)
  if (data.user && data.user.identities?.length === 0) return jsonError("อีเมลนี้ถูกใช้สมัครแล้ว");

  // สำรองกรณีไม่ได้ติดตั้ง trigger handle_new_user ใน schema.sql
  if (data.user) {
    await createServiceSupabase()
      .from("users")
      .upsert({ id: data.user.id, email, name }, { onConflict: "id", ignoreDuplicates: true });
    if (data.session) {
      await createServiceSupabase().from("users").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
    }
  }

  return NextResponse.json({ needsConfirmation: !data.session });
}
