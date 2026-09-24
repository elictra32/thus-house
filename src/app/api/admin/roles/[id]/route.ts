import { adminRoute, check, ok, readJson, must } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { LOCKED_ROLES } from "@/lib/permissions";
import { roleFields } from "@/lib/role-fields";

type P = { id: string };

// แก้ชื่อ/คำอธิบาย/สิทธิ์ของ Role · member และ head_admin แก้สิทธิ์ไม่ได้ (กันล็อกตัวเองออก)
export const PUT = adminRoute<P>("roles", async (req, { service, email }, { id }) => {
  const { data: current } = await service.from("roles").select("*").eq("id", id).maybeSingle();
  if (!current) return jsonError("ไม่พบ Role", 404);
  const fields = roleFields(await readJson(req), false);
  if (LOCKED_ROLES.includes(id) && "permissions" in fields) return jsonError(`Role ${current.name} แก้สิทธิ์ไม่ได้`);
  const role = check(await service.from("roles").update(fields).eq("id", id).select().single());
  await logAdmin(service, email, "update", "roles", id, fields);
  return ok({ role });
});

// ลบ Role ที่สร้างเอง — สมาชิกใน Role นั้นกลับเป็น Member
export const DELETE = adminRoute<P>("roles", async (_req, { service, email }, { id }) => {
  const { data: current } = await service.from("roles").select("name, is_system").eq("id", id).maybeSingle();
  if (!current) return jsonError("ไม่พบ Role", 404);
  if (current.is_system) return jsonError("Role ของระบบลบไม่ได้");
  must(await service.from("users").update({ role: "member" }).eq("role", id));
  must(await service.from("roles").delete().eq("id", id));
  await logAdmin(service, email, "delete", "roles", id, { name: current.name });
  return ok();
});
