import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase-server";

const BUCKET = "avatars";
const MAX_BYTES = 150 * 1024; // เบราว์เซอร์ย่อเหลือ 256px ก่อนส่ง (ปกติ 10–30KB)
const TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

// ลบรูปเก่าของผู้ใช้ทั้งหมดในโฟลเดอร์ของตัวเอง
async function clearOld(service: ReturnType<typeof createServiceSupabase>, uid: string) {
  const { data: old } = await service.storage.from(BUCKET).list(uid);
  if (old?.length) await service.storage.from(BUCKET).remove(old.map((f) => `${uid}/${f.name}`));
}

// อัปโหลดรูปโปรไฟล์ของตัวเอง
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("กรุณาเลือกรูป");
  const ext = TYPES[file.type];
  if (!ext) return jsonError("รองรับเฉพาะรูป JPG / PNG / WebP");
  if (file.size > MAX_BYTES) return jsonError("รูปใหญ่เกินไป กรุณาลองใหม่");

  const service = createServiceSupabase();
  await clearOld(service, auth.user.id);
  // ชื่อไฟล์ใหม่ทุกครั้ง → รูปเปลี่ยนทันทีไม่ติด cache
  const path = `${auth.user.id}/${Date.now()}.${ext}`;
  const { error } = await service.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) return jsonError("อัปโหลดไม่สำเร็จ กรุณาลองใหม่", 500);
  const url = service.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error: saveError } = await service.from("users").update({ avatar_url: url }).eq("id", auth.user.id);
  if (saveError) return jsonError(saveError.message, 500);
  return NextResponse.json({ url });
}

// ลบรูปโปรไฟล์
export async function DELETE() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const service = createServiceSupabase();
  await clearOld(service, auth.user.id);
  await service.from("users").update({ avatar_url: null }).eq("id", auth.user.id);
  return NextResponse.json({ ok: true });
}
