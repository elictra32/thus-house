import { ValidationError, num, str } from "./validate";

// ตรวจข้อมูลโค้ดส่วนลดจาก Admin (สร้าง: ครบทุกช่องที่จำเป็น · แก้: เฉพาะช่องที่ส่งมา)
export function discountFields(body: Record<string, unknown>, create: boolean) {
  const f: Record<string, unknown> = {};
  if (create || "code" in body) {
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw new ValidationError("โค้ดใช้ได้เฉพาะ A–Z, 0–9, - และ _ (3–30 ตัว)");
    f.code = code;
  }
  if ("description" in body) f.description = str(body, "description", { max: 200 });
  if (create || "kind" in body) {
    if (body.kind !== "percent" && body.kind !== "amount") throw new ValidationError("เลือกประเภทส่วนลด");
    f.kind = body.kind;
  }
  if (create || "value" in body) {
    const v = num(body, "value", { required: true, min: 1 })!;
    if ((f.kind ?? body.kind) === "percent" && v > 100) throw new ValidationError("ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100");
    f.value = v;
  }
  if ("class_ids" in body) f.class_ids = Array.isArray(body.class_ids) ? body.class_ids.filter((x) => typeof x === "string") : [];
  if ("max_uses" in body) {
    const m = num(body, "max_uses", { min: 1 });
    f.max_uses = m === null ? null : Math.floor(m);
  }
  if ("once_per_user" in body) f.once_per_user = !!body.once_per_user;
  for (const k of ["starts_at", "expires_at"] as const) {
    if (k in body) {
      const v = str(body, k);
      if (v && Number.isNaN(Date.parse(v))) throw new ValidationError("วันที่ไม่ถูกต้อง");
      f[k] = v ? new Date(v).toISOString() : null;
    }
  }
  if ("active" in body) f.active = !!body.active;
  return f;
}
