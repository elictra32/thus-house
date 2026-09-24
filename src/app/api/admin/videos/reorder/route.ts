import { adminRoute, ok, readJson } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";

// body: { classId, ids: [videoId ตามลำดับใหม่] }
export const PUT = adminRoute(async (req, { service, email }) => {
  const { classId, ids } = await readJson(req);
  if (typeof classId !== "string" || !Array.isArray(ids) || !ids.every((i) => typeof i === "string")) {
    return jsonError("ข้อมูลไม่ถูกต้อง");
  }
  const results = await Promise.all(
    (ids as string[]).map((id, index) =>
      service.from("videos").update({ order_index: index }).eq("id", id).eq("class_id", classId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return jsonError(failed.error.message, 500);
  await logAdmin(service, email, "reorder", "videos", classId, { ids });
  return ok();
});
