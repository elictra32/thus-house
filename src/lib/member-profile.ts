// ข้อมูลโปรไฟล์สมาชิกที่ใช้ทั้งฝั่งเว็บและ API
export const TRADING_MARKETS = ["หุ้นไทย", "หุ้นต่างประเทศ", "TFEX", "Forex", "ทองคำ", "Crypto", "กองทุน"] as const;
export const TRADING_YEARS = ["ยังไม่เคยเทรด", "น้อยกว่า 1 ปี", "1–3 ปี", "3–5 ปี", "มากกว่า 5 ปี"] as const;
export const MEMBER_CODE_RE = /^[A-Za-z0-9_-]{2,30}$/;

// เลขบัตรประชาชน 13 หลัก + ตรวจเลขหลักสุดท้าย (check digit)
export function isThaiId(id: string) {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}
export function formatThaiId(id: string) {
  return id.replace(/^(\d)(\d{4})(\d{5})(\d{2})(\d)$/, "$1-$2-$3-$4-$5");
}
export function maskedThaiId(last4: string | null | undefined) {
  return last4 ? `•••••••••${last4}` : "";
}

// วันเกิด YYYY-MM-DD ที่สมเหตุสมผล (อายุ 10–100 ปี)
export function isBirthDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  const age = (Date.now() - d.getTime()) / (365.25 * 86400000);
  return age >= 10 && age <= 100;
}
export function formatBirthDate(v: string | null | undefined) {
  if (!v) return "";
  return new Date(v + "T00:00:00Z").toLocaleDateString("th-TH", { dateStyle: "long", timeZone: "UTC" });
}

// ข้อมูลที่ต้องกรอกให้ครบก่อนซื้อคลาส (ใช้ทั้งหน้าชำระเงิน / หน้าโปรไฟล์ / API)
export type ProfileCheck = {
  name?: string | null; nickname?: string | null; phone?: string | null; birth_date?: string | null;
  id_card_last4?: string | null; address?: string | null; trading_markets?: string[] | null;
  trading_years?: string | null; learning_goal?: string | null;
};
export const REQUIRED_FIELDS: { key: string; label: string; ok: (u: ProfileCheck) => boolean }[] = [
  { key: "name", label: "ชื่อ–นามสกุล", ok: (u) => !!u.name?.trim() },
  { key: "nickname", label: "ชื่อเล่น", ok: (u) => !!u.nickname?.trim() },
  { key: "phone", label: "เบอร์โทร", ok: (u) => !!u.phone?.trim() },
  { key: "birth_date", label: "วันเดือนปีเกิด", ok: (u) => !!u.birth_date },
  { key: "id_card", label: "เลขบัตรประชาชน", ok: (u) => !!u.id_card_last4 },
  { key: "address", label: "ที่อยู่ (ใบกำกับภาษี)", ok: (u) => !!u.address?.trim() },
  { key: "trading_years", label: "ประสบการณ์เทรด", ok: (u) => !!u.trading_years },
  {
    key: "trading_markets", label: "เคยเทรดอะไรมาบ้าง",
    ok: (u) => u.trading_years === "ยังไม่เคยเทรด" || !!u.trading_markets?.length,
  },
  { key: "learning_goal", label: "เป้าหมายในการเรียน", ok: (u) => !!u.learning_goal?.trim() },
];
export function missingProfile(u: ProfileCheck | null | undefined) {
  return REQUIRED_FIELDS.filter((f) => !u || !f.ok(u));
}
