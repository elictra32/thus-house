import { adminRoute, check, ok } from "@/lib/admin-route";

const PAGE_SIZE = 30;

export const GET = adminRoute("logs", async (req, { service }) => {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const action = sp.get("action");
  let q = service.from("admin_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (action) q = q.eq("action", action);
  const res = await q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  return ok({ logs: check(res), total: res.count ?? 0, page, pageSize: PAGE_SIZE });
});
