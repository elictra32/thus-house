import { adminRoute, ok, readJson } from "@/lib/admin-route";
import { jsonError } from "@/lib/auth";
import { str } from "@/lib/validate";
import { rejectPurchase } from "@/lib/purchase-actions";

export const POST = adminRoute<{ id: string }>("payments", async (req, { service, email }, { id }) => {
  const reason = str(await readJson(req), "reason", { required: true, max: 500 })!;
  const r = await rejectPurchase(service, id, email, reason);
  return r.ok ? ok() : jsonError(r.error, r.status);
});
