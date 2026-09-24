// ตัวช่วย validate body ของ admin API แบบเบาๆ
export class ValidationError extends Error {}

export function str(body: Record<string, unknown>, key: string, opts: { required?: boolean; max?: number } = {}) {
  const v = body[key];
  if (v === undefined || v === null || String(v).trim() === "") {
    if (opts.required) throw new ValidationError(`กรุณากรอก ${key}`);
    return null;
  }
  const s = String(v).trim();
  if (opts.max && s.length > opts.max) throw new ValidationError(`${key} ยาวเกินไป`);
  return s;
}

export function num(body: Record<string, unknown>, key: string, opts: { required?: boolean; min?: number } = {}) {
  const v = body[key];
  if (v === undefined || v === null || v === "") {
    if (opts.required) throw new ValidationError(`กรุณากรอก ${key}`);
    return null;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw new ValidationError(`${key} ต้องเป็นตัวเลข`);
  if (opts.min !== undefined && n < opts.min) throw new ValidationError(`${key} ต้องไม่น้อยกว่า ${opts.min}`);
  return n;
}

export function oneOf<T extends string>(body: Record<string, unknown>, key: string, values: readonly T[]) {
  const v = body[key];
  if (v === undefined) return null;
  if (!values.includes(v as T)) throw new ValidationError(`${key} ไม่ถูกต้อง`);
  return v as T;
}

export function url(body: Record<string, unknown>, key: string, opts: { required?: boolean } = {}) {
  const s = str(body, key, opts);
  if (s && !/^https?:\/\//i.test(s)) throw new ValidationError(`${key} ต้องเป็นลิงก์ http(s)`);
  return s;
}
