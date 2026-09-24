import { adminRoute, check, ok, readJson } from "@/lib/admin-route";
import { logAdmin } from "@/lib/auth";
import { classFields } from "@/lib/admin-fields";

export const GET = adminRoute(async (_req, { service }) => {
  return ok({ classes: check(await service.from("classes").select("*").order("created_at")) });
});

export const POST = adminRoute(async (req, { service, email }) => {
  const fields = classFields(await readJson(req), true);
  const cls = check(await service.from("classes").insert(fields).select().single());
  await logAdmin(service, email, "create", "classes", cls.id, fields);
  return ok({ class: cls });
});
