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
export function vercelPlan() {
  return process.env.VERCEL_PLAN === "pro" ? VERCEL_PLANS.pro : VERCEL_PLANS.hobby;
}
