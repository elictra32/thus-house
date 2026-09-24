import { adminRoute, check, ok, readJson, recountClass } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { videoFields } from "@/lib/admin-fields";

export const GET = adminRoute("classes", async (req, { service }) => {
  const classId = new URL(req.url).searchParams.get("classId");
  if (!classId) return jsonError("ต้องระบุ classId");
  return ok({ videos: check(await service.from("videos").select("*").eq("class_id", classId).order("order_index")) });
});

export const POST = adminRoute("classes", async (req, { service, email }) => {
  const fields = videoFields(await readJson(req), true);
  const { data: last } = await service
    .from("videos").select("order_index").eq("class_id", fields.class_id as string)
    .order("order_index", { ascending: false }).limit(1).maybeSingle();
  const video = check(
    await service.from("videos").insert({ ...fields, order_index: (last?.order_index ?? -1) + 1 }).select().single(),
  );
  await recountClass(service, video.class_id);
  await logAdmin(service, email, "create", "videos", video.id, { title: video.title, class_id: video.class_id });
  return ok({ video });
});
