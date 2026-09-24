import { adminRoute, check, ok } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const KINDS = ["feedback", "meetup"];

// รายการรูปของหมวด ?kind=feedback|meetup
export const GET = adminRoute("content", async (req, { service }) => {
  const kind = new URL(req.url).searchParams.get("kind");
  if (!kind || !KINDS.includes(kind)) return jsonError("kind ไม่ถูกต้อง");
  return ok({ items: check(await service.from("gallery_items").select("*").eq("kind", kind).order("order_index")) });
});

// อัปโหลดรูปใหม่: FormData { kind, file, caption? } → ต่อท้ายรายการ
export const POST = adminRoute("content", async (req, { service, email }) => {
  const form = await req.formData().catch(() => null);
  const kind = form?.get("kind");
  const file = form?.get("file");
  const caption = String(form?.get("caption") ?? "").trim().slice(0, 200) || null;
  if (typeof kind !== "string" || !KINDS.includes(kind)) return jsonError("kind ไม่ถูกต้อง");
  if (!(file instanceof File)) return jsonError("กรุณาเลือกไฟล์");
  const ext = TYPES[file.type];
  if (!ext) return jsonError("รองรับเฉพาะ PNG, JPG, WEBP");
  if (file.size > 4 * 1024 * 1024) return jsonError("ไฟล์ใหญ่เกิน 4MB");

  const path = `${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await service.storage.from("gallery").upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (error) return jsonError(error.message, 500);
  const url = service.storage.from("gallery").getPublicUrl(path).data.publicUrl;

  const { data: last } = await service
    .from("gallery_items").select("order_index").eq("kind", kind)
    .order("order_index", { ascending: false }).limit(1).maybeSingle();
  const item = check(
    await service.from("gallery_items")
      .insert({ kind, image_url: url, caption, order_index: (last?.order_index ?? -1) + 1 })
      .select().single(),
  );
  await logAdmin(service, email, "create", "gallery_items", item.id, { kind });
  return ok({ item });
});
