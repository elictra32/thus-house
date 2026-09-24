import { adminRoute, check, ok, readJson, recountClass } from "@/lib/admin-route";
import { logAdmin } from "@/lib/auth";
import { videoFields } from "@/lib/admin-fields";

type P = { id: string };

export const PUT = adminRoute<P>("classes", async (req, { service, email }, { id }) => {
  const fields = videoFields(await readJson(req), false);
  const video = check(await service.from("videos").update(fields).eq("id", id).select().single());
  await recountClass(service, video.class_id);
  await logAdmin(service, email, "update", "videos", id, fields);
  return ok({ video });
});

export const DELETE = adminRoute<P>("classes", async (_req, { service, email }, { id }) => {
  const video = check(await service.from("videos").delete().eq("id", id).select("class_id, title").single());
  await recountClass(service, video.class_id);
  await logAdmin(service, email, "delete", "videos", id, { title: video.title });
  return ok();
});
