import { adminRoute, check, ok } from "@/lib/admin-route";

const PAGE_SIZE = 20;

export const GET = adminRoute(async (req, { service }) => {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const q = sp.get("q")?.trim();
  const status = sp.get("status");

  let query = service.from("users").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (q) {
    const safe = q.replace(/[,()%]/g, " ");
    query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  if (status) query = query.eq("status", status);

  const res = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const users = check(res);
  return ok({ users, total: res.count ?? 0, page, pageSize: PAGE_SIZE });
});
