import { adminRoute, check, ok, readJson, must } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { str } from "@/lib/validate";

type P = { id: string };

// แก้คำบรรยายรูป: { caption }
export const PUT = adminRoute<P>("content", async (req, { service, email }, { id }) => {
  const body = await readJson(req);
  const caption = str(body, "caption", { max: 200 });
  const item = check(await service.from("gallery_items").update({ caption }).eq("id", id).select().single());
  await logAdmin(service, email, "update", "gallery_items", id, { caption });
  return ok({ item });
});

// ลบรูป (และไฟล์ใน bucket ถ้าอัปโหลดผ่านหน้า Admin)
export const DELETE = adminRoute<P>("content", async (_req, { service, email }, { id }) => {
  const { data: item } = await service.from("gallery_items").select("image_url").eq("id", id).maybeSingle();
  if (!item) return jsonError("ไม่พบรูป", 404);
  must(await service.from("gallery_items").delete().eq("id", id));
  const marker = "/storage/v1/object/public/gallery/";
  const i = item.image_url.indexOf(marker);
  if (i >= 0) await service.storage.from("gallery").remove([item.image_url.slice(i + marker.length)]);
  await logAdmin(service, email, "delete", "gallery_items", id, { image_url: item.image_url });
  return ok();
});
