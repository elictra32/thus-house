import { str, ValidationError } from "./validate";
import { isPermission } from "./permissions";

// body → คอลัมน์ของ roles ที่อนุญาตให้บันทึก
export function roleFields(b: Record<string, unknown>, creating: boolean) {
  const out: Record<string, unknown> = {};
  if (creating || "name" in b) out.name = str(b, "name", { required: true, max: 50 });
  if (creating || "description" in b) out.description = str(b, "description", { max: 200 });
  if (creating || "permissions" in b) {
    const list = b.permissions ?? [];
    if (!Array.isArray(list) || !list.every(isPermission)) throw new ValidationError("สิทธิ์ไม่ถูกต้อง");
    out.permissions = Array.from(new Set(list));
  }
  if (!Object.keys(out).length) throw new ValidationError("ไม่มีข้อมูลที่จะบันทึก");
  return out;
}
