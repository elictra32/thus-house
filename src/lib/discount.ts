import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DiscountCode = {
  code: string; description: string | null; kind: "percent" | "amount"; value: number; class_ids: string[];
  max_uses: number | null; once_per_user: boolean; starts_at: string | null; expires_at: string | null; active: boolean;
};
export type Applied = { code: string; label: string; original: number; discount: number; final: number; ref: string };

export const normalizeCode = (v: unknown) => (typeof v === "string" ? v.trim().toUpperCase() : "");

// รหัสยืนยันโค้ด: ผูกกับ โค้ด + คลาส + ผู้ใช้ → สมาชิกเห็นตอนกรอก และทีมงานเห็นตรงกันตอนตรวจสลิป
export function discountRef(code: string, classId: string, userId: string) {
  return "D-" + createHash("sha256").update(`${code}|${classId}|${userId}`).digest("hex").slice(0, 6).toUpperCase();
}

// ตรวจโค้ด + คำนวณราคาสุดท้าย (ราคาเอาจากฐานข้อมูลเสมอ)
export async function applyDiscount(
  service: SupabaseClient, rawCode: unknown, cls: { id: string; price: number }, userId: string,
): Promise<{ error: string } | Applied> {
  const code = normalizeCode(rawCode);
  if (!code) return { error: "กรุณากรอกโค้ดส่วนลด" };
  const { data: d } = await service.from("discount_codes").select("*").eq("code", code).maybeSingle<DiscountCode>();
  const now = Date.now();
  if (!d || !d.active) return { error: "ไม่พบโค้ดนี้ หรือโค้ดถูกปิดแล้ว" };
  if (d.starts_at && Date.parse(d.starts_at) > now) return { error: "โค้ดนี้ยังไม่เริ่มใช้งาน" };
  if (d.expires_at && Date.parse(d.expires_at) < now) return { error: "โค้ดนี้หมดอายุแล้ว" };
  if (d.class_ids.length && !d.class_ids.includes(cls.id)) return { error: "โค้ดนี้ใช้กับคลาสนี้ไม่ได้" };

  // นับการใช้จากการซื้อที่ยังไม่ถูกปฏิเสธ
  if (d.max_uses || d.once_per_user) {
    const { data: used } = await service.from("purchases").select("user_id").eq("discount_code", code).in("status", ["pending", "approved"]);
    if (d.max_uses && (used?.length ?? 0) >= d.max_uses) return { error: "โค้ดนี้ถูกใช้ครบจำนวนแล้ว" };
    if (d.once_per_user && used?.some((u) => u.user_id === userId)) return { error: "คุณใช้โค้ดนี้ไปแล้ว" };
  }

  const original = Number(cls.price);
  const raw = d.kind === "percent" ? (original * Number(d.value)) / 100 : Number(d.value);
  const discount = Math.min(original, Math.round(raw));
  return {
    code,
    label: d.kind === "percent" ? `ลด ${Number(d.value)}%` : `ลด ${Number(d.value).toLocaleString("th-TH")} บาท`,
    original,
    discount,
    final: original - discount,
    ref: discountRef(code, cls.id, userId),
  };
}
