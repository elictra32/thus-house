import { adminRoute, ok, readJson } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";

// เรียงลำดับใหม่: { kind, ids: [...] } ตามลำดับที่ต้องการ
export const PUT = adminRoute("content", async (req, { service, email }) => {
  const body = await readJson(req);
  const { kind, ids } = body as { kind?: string; ids?: unknown };
  if (typeof kind !== "string" || !Array.isArray(ids) || !ids.every((x) => typeof x === "string")) {
    return jsonError("ข้อมูลไม่ถูกต้อง");
  }
  await Promise.all(
    (ids as string[]).map((id, index) =>
      service.from("gallery_items").update({ order_index: index }).eq("id", id).eq("kind", kind),
    ),
  );
  await logAdmin(service, email, "reorder", "gallery_items", null, { kind });
  return ok();
});
