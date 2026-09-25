import { adminRoute, check, ok, readJson } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { discountFields } from "@/lib/discount-fields";

// รายการโค้ดส่วนลด + จำนวนที่ใช้แล้ว (นับเฉพาะรอตรวจ/อนุมัติ)
export const GET = adminRoute("payments", async (_req, { service }) => {
  const [codes, used, classes] = await Promise.all([
    service.from("discount_codes").select("*").order("created_at", { ascending: false }),
    service.from("purchases").select("discount_code, discount_amount, status").not("discount_code", "is", null).in("status", ["pending", "approved"]),
    service.from("classes").select("id, name, price").order("created_at"),
  ]);
  const uses: Record<string, { count: number; saved: number }> = {};
  for (const p of used.data ?? []) {
    const u = (uses[p.discount_code as string] ??= { count: 0, saved: 0 });
    u.count += 1;
    u.saved += Number(p.discount_amount ?? 0);
  }
  return ok({
    codes: check(codes).map((c) => ({ ...c, uses: uses[c.code]?.count ?? 0, saved: uses[c.code]?.saved ?? 0 })),
    classes: classes.data ?? [],
  });
});

// สร้างโค้ดใหม่
export const POST = adminRoute("payments", async (req, { service, email }) => {
  const fields = discountFields(await readJson(req), true);
  const { data: exists } = await service.from("discount_codes").select("code").eq("code", fields.code).maybeSingle();
  if (exists) return jsonError(`มีโค้ด ${fields.code} อยู่แล้ว`);
  const code = check(await service.from("discount_codes").insert({ ...fields, created_by: email }).select().single());
  await logAdmin(service, email, "create", "discount_codes", fields.code as string, fields);
  return ok({ code });
});
