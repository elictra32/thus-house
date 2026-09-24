import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase-server";
import { SLIP_MAX_BYTES, SLIP_TYPES, baht, isActivePurchase } from "@/lib/utils";
import { notifyDiscord } from "@/lib/discord";

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
  if (typeof classId !== "string" || !classId) return jsonError("กรุณาเลือกคอร์ส");
  if (!(file instanceof File)) return jsonError("กรุณาแนบสลิป");
  if (!SLIP_TYPES.includes(file.type)) return jsonError("รองรับเฉพาะไฟล์ PNG, JPG, JPEG");
  if (file.size > SLIP_MAX_BYTES) return jsonError("ไฟล์ใหญ่เกิน 4MB");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniffImage(bytes);
  if (!ext) return jsonError("ไฟล์ไม่ใช่รูปภาพที่ถูกต้อง");

  const service = createServiceSupabase();
  const { data: cls } = await service.from("classes").select("id, name, price").eq("id", classId).maybeSingle();
  if (!cls) return jsonError("ไม่พบคอร์ส", 404);

  const { data: existing } = await service
    .from("purchases").select("status, expires_at").eq("user_id", auth.user.id).eq("class_id", classId)
    .in("status", ["pending", "approved"]);
  // สิทธิ์ที่หมดอายุแล้วซื้อใหม่ (ต่ออายุ) ได้
  if (existing?.some((p) => isActivePurchase(p))) return jsonError("คุณมีสิทธิ์เรียนคอร์สนี้อยู่แล้ว");
  if (existing?.some((p) => p.status === "pending")) return jsonError("มีสลิปของคอร์สนี้รอตรวจสอบอยู่แล้ว");

  const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await service.storage
    .from("slips")
    .upload(path, bytes, { contentType: ext === "png" ? "image/png" : "image/jpeg" });
  if (upErr) return jsonError("อัปโหลดสลิปไม่สำเร็จ: " + upErr.message, 500);

  // ราคาเอาจากฐานข้อมูลเสมอ ไม่เชื่อค่าจาก client
  const { data: purchase, error } = await service
    .from("purchases")
    .insert({ user_id: auth.user.id, class_id: classId, amount: cls.price, slip_image_url: path, status: "pending" })
    .select()
    .single();
  if (error) {
    await service.storage.from("slips").remove([path]);
    return jsonError(error.message, 500);
  }

  await service.from("notifications").insert({
    user_id: auth.user.id,
    type: "payment",
    title: "ได้รับสลิปแล้ว",
    message: `สลิปคอร์ส ${cls.name} อยู่ระหว่างรอตรวจสอบ`,
  });

  await notifyDiscord("payment", "มีสลิปโอนเงินรอตรวจสอบ", { คอร์ส: cls.name, ยอด: baht(cls.price), สมาชิก: auth.user.email }, "/admin/payments");
  return NextResponse.json({ purchase });
}
