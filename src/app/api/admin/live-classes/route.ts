import { adminRoute, check, ok, readJson } from "@/lib/admin-route";
import { logAdmin } from "@/lib/auth";
import { liveFields } from "@/lib/admin-fields";

export const GET = adminRoute("live", async (_req, { service }) => {
  return ok({ liveClasses: check(await service.from("live_classes").select("*").order("scheduled_date", { ascending: false })) });
});

export const POST = adminRoute("live", async (req, { service, email }) => {
  const fields = liveFields(await readJson(req), true);
  const live = check(await service.from("live_classes").insert(fields).select().single());
  await logAdmin(service, email, "create", "live_classes", live.id, fields);
  return ok({ liveClass: live });
});
