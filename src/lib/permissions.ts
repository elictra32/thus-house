// สิทธิ์ที่กำหนดให้ Role ได้ — เพิ่มสิทธิ์ใหม่ที่นี่ แล้วเลือกใช้ใน adminRoute / requirePageAdmin
// (การเรียนคอร์สไม่ใช่สิทธิ์ของ Role — สมาชิกทุกคนเรียนคอร์สที่ซื้อได้)
export const PERMISSIONS = [
  { key: "dashboard", label: "ดู Dashboard & Analytics" },
  { key: "payments", label: "อนุมัติการชำระเงิน / แก้วันหมดอายุ" },
  { key: "members", label: "จัดการสมาชิก (สถานะ, ยืนยันอีเมล, ลบ)" },
  { key: "classes", label: "จัดการคอร์ส & วิดีโอ (ดูวิดีโอได้ทุกคอร์ส)" },
  { key: "live", label: "จัดการ Live Class" },
  { key: "email", label: "ส่งอีเมล / ประกาศ" },
  { key: "logs", label: "ดู Audit Log" },
  { key: "roles", label: "จัดการ Role และเปลี่ยน Role ของผู้อื่น" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];
export const ALL_PERMISSIONS = PERMISSIONS.map((p) => p.key) as Permission[];

export function isPermission(v: unknown): v is Permission {
  return typeof v === "string" && (ALL_PERMISSIONS as string[]).includes(v);
}

// Role ระบบ: member ไม่มีสิทธิ์ Admin, head_admin มีครบทุกสิทธิ์เสมอ (แก้ไม่ได้ กันล็อกตัวเองออก)
export const LOCKED_ROLES = ["member", "head_admin"];
