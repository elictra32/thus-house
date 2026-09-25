import { adminRoute, ok } from "@/lib/admin-route";
import { MEMBER_ACTIONS } from "@/lib/member-log";

const PAGE_SIZE = 50;

// Log สมาชิก: ค้นหาตามรหัส/ชื่อ/อีเมล และกรองตามประเภท
export const GET = adminRoute("logs", async (req, { service }) => {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const q = sp.get("q")?.trim().replace(/[,()%\\]/g, " ");
  const action = sp.get("action");
  const userId = sp.get("user");

  let query = service.from("member_logs").select("id, user_id, action, details, created_at", { count: "exact" })
    .order("created_at", { ascending: false });
  if (action && action in MEMBER_ACTIONS) query = query.eq("action", action);
  if (userId) query = query.eq("user_id", userId);
  if (q) {
    const { data: found } = await service.from("users").select("id")
      .or(`name.ilike.%${q}%,nickname.ilike.%${q}%,member_code.ilike.%${q}%,email.ilike.%${q}%`).limit(100);
    const ids = (found ?? []).map((u) => u.id);
    if (!ids.length) return ok({ logs: [], total: 0, pageSize: PAGE_SIZE, actions: MEMBER_ACTIONS });
    query = query.in("user_id", ids);
  }
  const res = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = res.data ?? [];
  const uids = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: users } = uids.length
    ? await service.from("users").select("id, name, nickname, member_code, email").in("id", uids)
    : { data: [] };
  const byId = new Map((users ?? []).map((u) => [u.id, u]));
  return ok({
    logs: rows.map((r) => ({ ...r, user: byId.get(r.user_id) ?? null })),
    total: res.count ?? 0,
    pageSize: PAGE_SIZE,
    actions: MEMBER_ACTIONS,
  });
});
