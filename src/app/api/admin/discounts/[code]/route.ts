import { adminRoute, check, ok, readJson, must } from "@/lib/admin-route";
import { logAdmin } from "@/lib/auth";
import { discountFields } from "@/lib/discount-fields";

type P = { code: string };

// แก้โค้ด (เปิด/ปิด, มูลค่า, วันหมดอายุ ...) — เปลี่ยนตัวโค้ดไม่ได้
export const PUT = adminRoute<P>("payments", async (req, { service, email }, { code }) => {
  const fields = discountFields(await readJson(req), false);
  delete fields.code;
  const row = check(await service.from("discount_codes").update(fields).eq("code", decodeURIComponent(code)).select().single());
  await logAdmin(service, email, "update", "discount_codes", row.code, fields);
  return ok({ code: row });
});

// ลบโค้ด — การซื้อที่เคยใช้ยังเก็บยอดส่วนลดไว้ (ช่องโค้ดกลายเป็นว่าง)
export const DELETE = adminRoute<P>("payments", async (_req, { service, email }, { code }) => {
  const c = decodeURIComponent(code);
  must(await service.from("discount_codes").delete().eq("code", c));
  await logAdmin(service, email, "delete", "discount_codes", c);
  return ok();
});
