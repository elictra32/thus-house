import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { requireApiUser, jsonError } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase-server";
import { SLIP_MAX_BYTES, SLIP_TYPES, baht, isActivePurchase } from "@/lib/utils";
import { notifyDiscord } from "@/lib/discord";
import { botEnabled, postSlipReview } from "@/lib/discord-bot";
import { logMember } from "@/lib/member-log";
import { missingProfile } from "@/lib/member-profile";
import { applyDiscount } from "@/lib/discount";

// ตรวจ magic bytes ว่าเป็น PNG/JPEG จริง ไม่ใช่แค่นามสกุล
function sniffImage(buf: Uint8Array): "png" | "jpg" | null {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  return null;
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;

  const form = await req.formData().catch(() => null);
  const classId = form?.get("class_id");
  const file = form?.get("slip");
  const code = form?.get("discount_code");
  if (typeof classId !== "string" || !classId) return jsonError("กรุณาเลือกคอร์ส");
  if (file !== null && file !== undefined && !(file instanceof File)) return jsonError("ไฟล์สลิปไม่ถูกต้อง");

  const service = createServiceSupabase();
  const { data: me } = await service.from("users")
    .select("name, nickname, phone, birth_date, id_card_last4, address, trading_markets, trading_years, learning_goal")
    .eq("id", auth.user.id).maybeSingle();
  const missing = missingProfile(me);
  if (missing.length) return jsonError(`กรุณากรอกข้อมูลโปรไฟล์ให้ครบก่อน: ${missing.map((f) => f.label).join(", ")}`, 409);
  const { data: cls } = await service.from("classes").select("id, name, price").eq("id", classId).maybeSingle();
  if (!cls) return jsonError("ไม่พบคอร์ส", 404);

  // โค้ดส่วนลด: ตรวจซ้ำฝั่ง server เสมอ (ไม่เชื่อราคาจาก client)
  const applied = typeof code === "string" && code.trim() ? await applyDiscount(service, code, cls, auth.user.id) : null;
  if (applied && "error" in applied) return jsonError(applied.error);
  const amount = applied ? applied.final : Number(cls.price);

  // ยอด 0 บาท (โค้ดลดเต็มจำนวน) ไม่ต้องแนบสลิป
  let bytes: Uint8Array | null = null;
  let ext: "png" | "jpg" | null = null;
  if (amount > 0 || file instanceof File) {
    if (!(file instanceof File)) return jsonError("กรุณาแนบสลิป");
    if (!SLIP_TYPES.includes(file.type)) return jsonError("รองรับเฉพาะไฟล์ PNG, JPG, JPEG");
    if (file.size > SLIP_MAX_BYTES) return jsonError("ไฟล์ใหญ่เกิน 4MB");
    bytes = new Uint8Array(await file.arrayBuffer());
    ext = sniffImage(bytes);
    if (!ext) return jsonError("ไฟล์ไม่ใช่รูปภาพที่ถูกต้อง");
  }

  const { data: existing } = await service
    .from("purchases").select("status, expires_at").eq("user_id", auth.user.id).eq("class_id", classId)
    .in("status", ["pending", "approved"]);
  // สิทธิ์ที่หมดอายุแล้วซื้อใหม่ (ต่ออายุ) ได้
  if (existing?.some((p) => isActivePurchase(p))) return jsonError("คุณมีสิทธิ์เรียนคอร์สนี้อยู่แล้ว");
  if (existing?.some((p) => p.status === "pending")) return jsonError("มีสลิปของคอร์สนี้รอตรวจสอบอยู่แล้ว");

  const path = bytes && ext ? `${auth.user.id}/${crypto.randomUUID()}.${ext}` : null;
  if (path && bytes) {
    const { error: upErr } = await service.storage
      .from("slips")
      .upload(path, bytes, { contentType: ext === "png" ? "image/png" : "image/jpeg" });
    if (upErr) return jsonError("อัปโหลดสลิปไม่สำเร็จ: " + upErr.message, 500);
  }

  // ราคาเอาจากฐานข้อมูลเสมอ ไม่เชื่อค่าจาก client
  const { data: purchase, error } = await service
    .from("purchases")
    .insert({
      user_id: auth.user.id, class_id: classId, amount, slip_image_url: path, status: "pending",
      original_amount: cls.price,
      discount_code: applied?.code ?? null,
      discount_amount: applied?.discount ?? null,
      discount_ref: applied?.ref ?? null,
    })
    .select()
    .single();
  if (error) {
    if (path) await service.storage.from("slips").remove([path]);
    return jsonError(error.message, 500);
  }

  await logMember(service, auth.user.id, "upload_slip", { class: cls.name, amount, code: applied?.code });
  const discountText = applied ? `${applied.code} (${applied.label}) · รหัสยืนยัน ${applied.ref} · ราคาเต็ม ${baht(applied.original)}` : null;
  await service.from("notifications").insert({
    user_id: auth.user.id,
    type: "payment",
    link: "/profile",
    title: "ได้รับสลิปแล้ว",
    message: `สลิปคอร์ส ${cls.name} อยู่ระหว่างรอตรวจสอบ`,
  });

  // มี Discord Bot → ส่งรูปสลิป + ปุ่มอนุมัติ/ปฏิเสธ · ไม่มี/ส่งไม่ได้ → แจ้งเตือนแบบเดิม
  // ทำหลังตอบสมาชิกแล้ว — สมาชิกไม่ต้องรอ Discord
  const user = auth.user;
  waitUntil((async () => {
    const { data: member } = await service.from("users")
      .select("name, nickname, email, phone, member_code").eq("id", user.id).maybeSingle();
    const posted = await postSlipReview({
      purchaseId: purchase.id,
      userId: user.id,
      member: member ?? { name: null, nickname: null, email: user.email ?? "-", phone: null, member_code: null },
      className: cls.name,
      amount: baht(amount),
      discount: discountText,
      slip: bytes && ext ? { bytes, ext } : null,
    });
    if ("id" in posted) await service.from("purchases").update({ discord_message_id: posted.id }).eq("id", purchase.id);
    else {
      // บอทส่งไม่ได้ → แจ้งแบบเดิม พร้อมบอกเหตุผลที่ปุ่มอนุมัติไม่ขึ้น (ถ้าตั้งค่าบอทไว้)
      await notifyDiscord("payment", "มีสลิปโอนเงินรอตรวจสอบ", {
        คอร์ส: cls.name, ยอด: baht(amount), โค้ดส่วนลด: discountText, สมาชิก: user.email,
        "⚠️ ปุ่มอนุมัติใน Discord ไม่ขึ้นเพราะ": botEnabled() ? posted.error : null,
      }, "/admin/payments");
    }
  })().catch((err) => console.error(err)));
  return NextResponse.json({ purchase });
}
