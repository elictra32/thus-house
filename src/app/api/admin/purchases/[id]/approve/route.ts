import { adminRoute, ok } from "@/lib/admin-route";
import { jsonError } from "@/lib/auth";
import { num } from "@/lib/validate";
import { approvePurchase } from "@/lib/purchase-actions";

// body (ไม่บังคับ): { access_days } อายุสมาชิกของรายการนี้ (วัน)
// ไม่ส่ง = ใช้ค่าเริ่มต้นของคอร์ส · ส่งค่าว่าง/null = ไม่หมดอายุ
export const POST = adminRoute<{ id: string }>("payments", async (req, { service, email }, { id }) => {
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const accessDays = "access_days" in body ? num(body, "access_days", { min: 1 }) : undefined;
  const r = await approvePurchase(service, id, email, { accessDays });
  return r.ok ? ok() : jsonError(r.error, r.status);
});
