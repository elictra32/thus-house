import { adminRoute, check, ok, readJson } from "@/lib/admin-route";
import { logAdmin } from "@/lib/auth";
import { roleFields } from "@/lib/role-fields";

// รายการ Role พร้อมจำนวนสมาชิกในแต่ละ Role
export const GET = adminRoute("roles", async (_req, { service }) => {
  const [roles, users] = await Promise.all([
    service.from("roles").select("*").order("created_at"),
    service.from("users").select("role"),
  ]);
  const counts: Record<string, number> = {};
  for (const u of users.data ?? []) counts[u.role] = (counts[u.role] ?? 0) + 1;
  return ok({ roles: check(roles).map((r) => ({ ...r, members: counts[r.id] ?? 0 })) });
});

// สร้าง Role ใหม่: { name, description?, permissions: string[] }
export const POST = adminRoute("roles", async (req, { service, email }) => {
  const fields = roleFields(await readJson(req), true);
  const id = `role_${crypto.randomUUID().slice(0, 8)}`;
  const role = check(await service.from("roles").insert({ id, ...fields, is_system: false }).select().single());
  await logAdmin(service, email, "create", "roles", id, fields);
  return ok({ role });
});
