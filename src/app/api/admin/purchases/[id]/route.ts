import { adminRoute, check, ok, readJson } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { str, ValidationError } from "@/lib/validate";

// แก้วันหมดอายุสิทธิ์เรียน: { expires_at: "YYYY-MM-DD" | null } (null = ไม่หมดอายุ)
// วันที่ที่ส่งมา = เรียนได้ถึงสิ้นวันนั้นตามเวลาไทย
export const PUT = adminRoute<{ id: string }>("payments", async (req, { service, email }, { id }) => {
  const body = await readJson(req);
  if (!("expires_at" in body)) throw new ValidationError("ไม่มีข้อมูลที่จะบันทึก");
  const date = str(body, "expires_at");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ValidationError("วันที่ไม่ถูกต้อง");
  const end = date ? new Date(`${date}T23:59:59+07:00`) : null;
  if (end && Number.isNaN(end.getTime())) throw new ValidationError("วันที่ไม่ถูกต้อง");
  const expiresAt = end ? end.toISOString() : null;

  const { data: p } = await service.from("purchases").select("status").eq("id", id).maybeSingle();
  if (!p) return jsonError("ไม่พบรายการ", 404);
  if (p.status !== "approved") return jsonError("แก้วันหมดอายุได้เฉพาะรายการที่อนุมัติแล้ว");

  const purchase = check(await service.from("purchases").update({ expires_at: expiresAt }).eq("id", id).select().single());
  await logAdmin(service, email, "update", "purchases", id, { expires_at: expiresAt });
  return ok({ purchase });
});
