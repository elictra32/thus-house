import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase-server";
import { logMember } from "@/lib/member-log";
import { MEMBER_CODE_RE, TRADING_MARKETS, TRADING_YEARS, isBirthDate, isThaiId } from "@/lib/member-profile";

const LABELS: Record<string, string> = {
  name: "ชื่อ", nickname: "ชื่อเล่น", phone: "เบอร์โทร", member_code: "รหัสสมาชิก", birth_date: "วันเกิด",
  address: "ที่อยู่", trading_markets: "ตลาดที่เคยเทรด", trading_years: "ประสบการณ์เทรด", learning_goal: "เป้าหมาย", id_card: "เลขบัตรประชาชน",
};

// แก้ไขโปรไฟล์ตัวเอง
export async function PUT(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  const service = createServiceSupabase();

  const update: Record<string, unknown> = {};
  const text = (k: string) => String(body[k] ?? "").trim();
  if ("name" in body) {
    const name = text("name");
    if (!name) return jsonError("กรุณากรอกชื่อ");
    if (name.length > 100) return jsonError("ชื่อยาวเกินไป");
    update.name = name;
  }
  if ("nickname" in body) {
    const nickname = text("nickname");
    if (!nickname) return jsonError("กรุณากรอกชื่อเล่น");
    if (nickname.length > 50) return jsonError("ชื่อเล่นยาวเกินไป");
    update.nickname = nickname;
  }
  if ("phone" in body) {
    const phone = text("phone");
    if (phone && !/^[0-9+\-\s]{8,20}$/.test(phone)) return jsonError("เบอร์โทรไม่ถูกต้อง");
    update.phone = phone || null;
  }
  if ("member_code" in body) {
    const code = text("member_code").toUpperCase();
    if (code && !MEMBER_CODE_RE.test(code)) return jsonError("รหัสสมาชิกใช้ได้เฉพาะ A–Z, 0–9, - และ _ (2–30 ตัว)");
    if (code) {
      const { data: taken } = await service.from("users").select("id").ilike("member_code", code.replace(/[%_\\]/g, "\\$&")).neq("id", auth.user.id).maybeSingle();
      if (taken) return jsonError(`รหัสสมาชิก ${code} มีคนใช้แล้ว`);
    }
    update.member_code = code || null;
  }
  if ("birth_date" in body) {
    const bd = text("birth_date");
    if (bd && !isBirthDate(bd)) return jsonError("วันเกิดไม่ถูกต้อง");
    update.birth_date = bd || null;
  }
  if ("address" in body) {
    const address = text("address");
    if (address.length > 500) return jsonError("ที่อยู่ยาวเกินไป");
    update.address = address || null;
  }
  if ("trading_markets" in body) {
    const list = Array.isArray(body.trading_markets) ? body.trading_markets : [];
    update.trading_markets = (TRADING_MARKETS as readonly string[]).filter((m) => list.includes(m));
  }
  if ("trading_years" in body) {
    const y = text("trading_years");
    if (y && !(TRADING_YEARS as readonly string[]).includes(y)) return jsonError("ประสบการณ์เทรดไม่ถูกต้อง");
    update.trading_years = y || null;
  }
  if ("learning_goal" in body) {
    const goal = text("learning_goal");
    if (goal.length > 1000) return jsonError("เป้าหมายยาวเกินไป (ไม่เกิน 1,000 ตัวอักษร)");
    update.learning_goal = goal || null;
  }

  let idCard: string | null | undefined;
  if ("id_card" in body) {
    idCard = text("id_card").replace(/[\s-]/g, "");
    if (idCard && !isThaiId(idCard)) return jsonError("เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
  }
  if (!Object.keys(update).length && idCard === undefined) return jsonError("ไม่มีข้อมูลที่จะแก้ไข");

  if (Object.keys(update).length) {
    const { error } = await service.from("users").update(update).eq("id", auth.user.id);
    if (error) return jsonError(error.message, 500);
  }
  if (idCard !== undefined) {
    // เข้ารหัสในฐานข้อมูล (กุญแจอยู่ใน Supabase Vault)
    const { error } = await service.rpc("set_id_card", { uid: auth.user.id, plain: idCard || null });
    if (error) return jsonError("บันทึกเลขบัตรไม่สำเร็จ กรุณาลองใหม่", 500);
  }
  // Log เฉพาะชื่อช่องที่แก้ — ไม่เก็บค่าเลขบัตร
  const fields = [...Object.keys(update), ...(idCard !== undefined ? ["id_card"] : [])].map((k) => LABELS[k] ?? k);
  await logMember(service, auth.user.id, "profile", { fields });
  return NextResponse.json({ ok: true });
}
