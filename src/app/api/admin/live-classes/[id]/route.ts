import { adminRoute, check, ok, readJson, must } from "@/lib/admin-route";
import { logAdmin } from "@/lib/auth";
import { liveFields } from "@/lib/admin-fields";

type P = { id: string };

export const PUT = adminRoute<P>("live", async (req, { service, email }, { id }) => {
  const fields = liveFields(await readJson(req), false);
  const live = check(await service.from("live_classes").update(fields).eq("id", id).select().single());
  await logAdmin(service, email, "update", "live_classes", id, fields);
  return ok({ liveClass: live });
});

export const DELETE = adminRoute<P>("live", async (_req, { service, email }, { id }) => {
  must(await service.from("live_classes").delete().eq("id", id));
  await logAdmin(service, email, "delete", "live_classes", id);
  return ok();
});
