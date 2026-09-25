import { adminRoute, check, ok } from "@/lib/admin-route";
import { unconfirmedUserIds } from "@/lib/email-confirm";

const DEFAULT_SIZE = 20;

export const GET = adminRoute("members", async (req, { service }) => {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const q = sp.get("q")?.trim();
  const status = sp.get("status");
  // โหมดแก้หลายคน ขอทีละ 200 คนได้
  const PAGE_SIZE = [20, 100, 200].includes(Number(sp.get("size"))) ? Number(sp.get("size")) : DEFAULT_SIZE;

  const unconfirmed = await unconfirmedUserIds(service);
  let query = service.from("users").select("id, email, name, nickname, phone, member_code, role, status, created_at, avatar_url, roles!users_role_fkey(name)", { count: "exact" }).order("created_at", { ascending: false });
  if (q) {
    const safe = q.replace(/[,()%]/g, " ");
    query = query.or(`name.ilike.%${safe}%,nickname.ilike.%${safe}%,member_code.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  // status=unconfirmed → เฉพาะบัญชีที่รอยืนยันอีเมล
  if (status === "unconfirmed") {
    if (!unconfirmed.size) return ok({ users: [], total: 0, page, pageSize: PAGE_SIZE, unconfirmedCount: 0 });
    query = query.in("id", [...unconfirmed]);
  } else if (status) query = query.eq("status", status);

  const res = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const users = check(res);
  return ok({
    users: users.map((u) => ({ ...u, email_confirmed: !unconfirmed.has(u.id) })),
    total: res.count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    unconfirmedCount: unconfirmed.size,
  });
});
