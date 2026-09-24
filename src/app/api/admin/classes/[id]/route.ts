import { adminRoute, check, ok, readJson, must } from "@/lib/admin-route";
import { logAdmin } from "@/lib/auth";
import { classFields } from "@/lib/admin-fields";

type P = { id: string };

export const PUT = adminRoute<P>("classes", async (req, { service, email }, { id }) => {
  const fields = classFields(await readJson(req), false);
  const cls = check(await service.from("classes").update(fields).eq("id", id).select().single());
  await logAdmin(service, email, "update", "classes", id, fields);
  return ok({ class: cls });
});

export const DELETE = adminRoute<P>("classes", async (_req, { service, email }, { id }) => {
  const { data: cls } = await service.from("classes").select("name").eq("id", id).maybeSingle();
  must(await service.from("classes").delete().eq("id", id));
  await logAdmin(service, email, "delete", "classes", id, { name: cls?.name });
  return ok();
});
