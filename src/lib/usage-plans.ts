// ลิมิตของแต่ละแพ็กเกจ (ตัวเลขประมาณจากหน้าราคาของผู้ให้บริการ — ถ้าเปลี่ยนแพ็กเกจ ตั้ง env ให้ตรง)
// SUPABASE_PLAN=free|pro · VERCEL_PLAN=hobby|pro
export const SUPABASE_PLANS = {
  free: { label: "Free", price: "ฟรี", dbBytes: 500 * 1024 ** 2, storageBytes: 1024 ** 3, mau: 50_000 },
  pro: { label: "Pro", price: "$25/เดือน (~900 บาท)", dbBytes: 8 * 1024 ** 3, storageBytes: 100 * 1024 ** 3, mau: 100_000 },
} as const;

export const VERCEL_PLANS = {
  hobby: { label: "Hobby", price: "ฟรี (ห้ามใช้เชิงพาณิชย์)", bandwidthGb: 100 },
  pro: { label: "Pro", price: "$20/เดือน (~700 บาท)", bandwidthGb: 1000 },
} as const;

export const BREVO_FREE_PER_DAY = 300;

export function supabasePlan() {
  return process.env.SUPABASE_PLAN === "pro" ? SUPABASE_PLANS.pro : SUPABASE_PLANS.free;
}
// อัปเกรด Vercel Pro แล้ว (25 ก.ย. 2569) — ตั้ง VERCEL_PLAN=hobby ถ้ากลับไปใช้ฟรี
export function vercelPlan() {
  return process.env.VERCEL_PLAN === "hobby" ? VERCEL_PLANS.hobby : VERCEL_PLANS.pro;
}

// วันที่ต่ออายุ Vercel Pro ทุกเดือน (วันที่อัปเกรด) — เปลี่ยนได้ด้วย env VERCEL_RENEW_DAY
export const VERCEL_RENEW_DAY = Number(process.env.VERCEL_RENEW_DAY) || 25;

// วันต่ออายุครั้งถัดไป (เวลาไทย) — เดือนที่ไม่มีวันนั้น (เช่น 31) ใช้วันสุดท้ายของเดือน
export function nextRenewal(from = new Date()) {
  const bkk = new Date(from.getTime() + 7 * 3600_000);
  let y = bkk.getUTCFullYear();
  let m = bkk.getUTCMonth();
  const dayIn = (yy: number, mm: number) => Math.min(VERCEL_RENEW_DAY, new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate());
  if (bkk.getUTCDate() > dayIn(y, m)) m += 1;
  if (m > 11) { m = 0; y += 1; }
  return new Date(Date.UTC(y, m, dayIn(y, m)));
}
// พรุ่งนี้ (เวลาไทย) คือวันต่ออายุไหม
export function renewsTomorrow(now = new Date()) {
  const tomorrow = new Date(now.getTime() + 7 * 3600_000 + 86400_000);
  const r = nextRenewal(new Date(now.getTime() + 86400_000));
  return r.getUTCFullYear() === tomorrow.getUTCFullYear() && r.getUTCMonth() === tomorrow.getUTCMonth() && r.getUTCDate() === tomorrow.getUTCDate();
}
