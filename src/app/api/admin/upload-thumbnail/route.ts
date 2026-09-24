import { adminRoute, ok } from "@/lib/admin-route";
import { jsonError } from "@/lib/auth";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export const POST = adminRoute("classes", async (req, { service }) => {
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return jsonError("กรุณาเลือกไฟล์");
  const ext = TYPES[file.type];
  if (!ext) return jsonError("รองรับเฉพาะ PNG, JPG, WEBP");
  if (file.size > 4 * 1024 * 1024) return jsonError("ไฟล์ใหญ่เกิน 4MB");

  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await service.storage.from("thumbnails").upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (error) return jsonError(error.message, 500);
  return ok({ url: service.storage.from("thumbnails").getPublicUrl(path).data.publicUrl });
});
