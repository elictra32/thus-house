import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase-server";

// แก้ไขโปรไฟล์ตัวเอง — อนุญาตเฉพาะ name, nickname และ phone (รหัสสมาชิก Admin เป็นคนกำหนด)
export async function PUT(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, string | null> = {};
  if ("name" in body) {
    const name = String(body.name ?? "").trim();
    if (!name) return jsonError("กรุณากรอกชื่อ");
    if (name.length > 100) return jsonError("ชื่อยาวเกินไป");
    update.name = name;
  }
  if ("nickname" in body) {
    const nickname = String(body.nickname ?? "").trim();
    if (!nickname) return jsonError("กรุณากรอกชื่อเล่น");
    if (nickname.length > 50) return jsonError("ชื่อเล่นยาวเกินไป");
    update.nickname = nickname;
  }
  if ("phone" in body) {
    const phone = String(body.phone ?? "").trim();
    if (phone && !/^[0-9+\-\s]{8,20}$/.test(phone)) return jsonError("เบอร์โทรไม่ถูกต้อง");
    update.phone = phone || null;
  }
  if (!Object.keys(update).length) return jsonError("ไม่มีข้อมูลที่จะแก้ไข");

  const { data, error } = await createServiceSupabase()
    .from("users").update(update).eq("id", auth.user.id).select().single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ user: data });
}
