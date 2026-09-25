import { adminRoute, ok, readJson } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { MEMBER_CODE_RE } from "@/lib/member-profile";

type Change = { id: string; member_code?: string; nickname?: string; status?: string };
const STATUSES = ["active", "inactive", "suspended"];

// แก้สมาชิกหลายคนพร้อมกัน (รหัสสมาชิก / ชื่อเล่น / สถานะ) — ตรวจครบทุกแถวก่อน แล้วค่อยบันทึก
export const PUT = adminRoute("members", async (req, { service, email, perms }) => {
  const body = await readJson(req);
  const rows = (Array.isArray(body.rows) ? body.rows : []) as Change[];
  if (!rows.length) return jsonError("ไม่มีรายการที่แก้");
  if (rows.length > 200) return jsonError("แก้ได้ครั้งละไม่เกิน 200 คน");

  const ids = rows.map((r) => r.id);
  const { data: targets } = await service.from("users").select("id, email, member_code, roles(permissions)").in("id", ids);
  const byId = new Map((targets ?? []).map((t) => [t.id, t]));
  const errors: string[] = [];
  const codes = new Map<string, string>(); // code → id (กันซ้ำกันเองในชุดนี้)

  for (const r of rows) {
    const t = byId.get(r.id);
    if (!t) { errors.push("ไม่พบสมาชิกบางคน"); continue; }
    if (isAdminEmail(t.email)) { errors.push(`${t.email}: บัญชีเจ้าของระบบแก้จากหน้านี้ไม่ได้`); continue; }
    const privileged = ((t.roles as unknown as { permissions: string[] } | null)?.permissions ?? []).includes("roles");
    if (privileged && !perms.has("roles")) { errors.push(`${t.email}: ไม่มีสิทธิ์แก้บัญชี Head Admin`); continue; }
    if (r.status !== undefined && !STATUSES.includes(r.status)) errors.push(`${t.email}: สถานะไม่ถูกต้อง`);
    if (r.nickname !== undefined && (!r.nickname.trim() || r.nickname.length > 50)) errors.push(`${t.email}: ชื่อเล่นว่างหรือยาวเกินไป`);
    if (r.member_code !== undefined) {
      const code = r.member_code.trim().toUpperCase();
      r.member_code = code;
      if (code && !MEMBER_CODE_RE.test(code)) errors.push(`${code}: ใช้ได้เฉพาะ A–Z, 0–9, - และ _`);
      if (code && codes.has(code)) errors.push(`รหัส ${code} ซ้ำกันในรายการที่แก้`);
      if (code) codes.set(code, r.id);
    }
  }
  // รหัสซ้ำกับคนอื่นที่ไม่ได้แก้ในชุดนี้
  if (codes.size) {
    const { data: taken } = await service.from("users").select("id, member_code").not("member_code", "is", null);
    const changing = new Set(rows.filter((r) => r.member_code !== undefined).map((r) => r.id));
    for (const u of taken ?? []) {
      const code = (u.member_code as string).toUpperCase();
      const owner = codes.get(code);
      if (owner && owner !== u.id && !changing.has(u.id)) errors.push(`รหัส ${code} มีคนใช้แล้ว`);
    }
  }
  if (errors.length) return jsonError(Array.from(new Set(errors)).slice(0, 8).join("\n"));

  // เคลียร์รหัสเดิมของคนที่เปลี่ยนก่อน (กันชน unique index ตอนสลับรหัสกัน)
  const codeRows = rows.filter((r) => r.member_code !== undefined);
  if (codeRows.length) await service.from("users").update({ member_code: null }).in("id", codeRows.map((r) => r.id));
  for (const r of rows) {
    const update: Record<string, unknown> = {};
    if (r.member_code !== undefined) update.member_code = r.member_code || null;
    if (r.nickname !== undefined) update.nickname = r.nickname.trim();
    if (r.status !== undefined) update.status = r.status;
    if (!Object.keys(update).length) continue;
    const { error } = await service.from("users").update(update).eq("id", r.id);
    if (error) return jsonError(`บันทึกไม่สำเร็จบางรายการ: ${error.message}`, 500);
  }
  await logAdmin(service, email, "bulk_update", "users", null, { count: rows.length, rows });
  return ok({ updated: rows.length });
});
