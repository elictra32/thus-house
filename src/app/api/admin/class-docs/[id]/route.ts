import { adminRoute, check, ok, readJson } from "@/lib/admin-route";
import { logAdmin } from "@/lib/auth";
import { str, url } from "@/lib/validate";

type P = { id: string };

// body: { title, url }
export const PUT = adminRoute<P>("classes", async (req, { service, email }, { id }) => {
  const body = await readJson(req);
  const fields = { title: str(body, "title", { required: true, max: 200 })!, url: url(body, "url", { required: true })! };
  const doc = check(await service.from("class_documents").update(fields).eq("id", id).select().single());
  await logAdmin(service, email, "update", "class_documents", id, fields);
  return ok({ doc });
});

export const DELETE = adminRoute<P>("classes", async (_req, { service, email }, { id }) => {
  const doc = check(await service.from("class_documents").delete().eq("id", id).select("title").single());
  await logAdmin(service, email, "delete", "class_documents", id, { title: doc.title });
  return ok();
});
