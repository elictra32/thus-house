import { adminRoute, check, ok, readJson } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { HEAD, canAssign, userRank } from "@/lib/role-rank";
import { roleFields } from "@/lib/role-fields";

// รายการ Role พร้อมจำนวนสมาชิกในแต่ละ Role
export const GET = adminRoute("roles", async (_req, { service, user }) => {
  const myRank = await userRank(service, user.id, user.email);
  const [roles, users] = await Promise.all([
    service.from("roles").select("*").order("created_at"),
    service.from("users").select("role"),
  ]);
  const counts: Record<string, number> = {};
  for (const u of users.data ?? []) counts[u.role] = (counts[u.role] ?? 0) + 1;
  // canEdit = แก้นิยาม Role ได้ (เฉพาะ Head Admin) · assignable = ให้ Role นี้กับคนอื่นได้ (ต่ำกว่าตัวเอง)
  return ok({
    canEdit: myRank >= HEAD,
    roles: check(roles).map((r) => ({ ...r, members: counts[r.id] ?? 0, assignable: canAssign(myRank, r.id) })),
  });
});

// สร้าง Role ใหม่: { name, description?, permissions: string[] }
export const POST = adminRoute("roles", async (req, { service, email, user }) => {
  if ((await userRank(service, user.id, user.email)) < HEAD) return jsonError("สร้าง/แก้ Role ได้เฉพาะ Head Admin", 403);
  const fields = roleFields(await readJson(req), true);
  const id = `role_${crypto.randomUUID().slice(0, 8)}`;
  const role = check(await service.from("roles").insert({ id, ...fields, is_system: false }).select().single());
  await logAdmin(service, email, "create", "roles", id, fields);
  return ok({ role });
});
