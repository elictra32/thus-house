import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminEmail } from "./admin";

// ลำดับชั้น Role: Head Admin (3) > Admin (2) > Mentor / Role ที่สร้างเอง (1) > Member (0)
// - Head Admin ทำได้ทุกอย่าง
// - Admin ทำได้ทุกอย่าง ยกเว้นเปลี่ยน Role ตัวเอง, แตะ Head Admin, และแก้นิยาม Role (หน้า Role & สิทธิ์)
// - ให้ / ถอด Role ได้เฉพาะ Role ที่ต่ำกว่าตัวเอง และกับคนที่ต่ำกว่าตัวเอง (ยกเว้น Head Admin)
export const HEAD = 3;
export function roleRank(roleId: string | null | undefined) {
  if (roleId === "head_admin") return 3;
  if (roleId === "admin") return 2;
  if (!roleId || roleId === "member") return 0;
  return 1;
}

// ระดับสูงสุดของผู้ใช้ (Role หลัก + Role เพิ่มเติม) · เจ้าของระบบ (NEXT_PUBLIC_ADMIN_EMAILS) = Head Admin เสมอ
export async function userRank(service: SupabaseClient, userId: string, email?: string | null) {
  if (email && isAdminEmail(email)) return HEAD;
  const [{ data: u }, { data: extra }] = await Promise.all([
    service.from("users").select("email, role").eq("id", userId).maybeSingle(),
    service.from("user_roles").select("role_id").eq("user_id", userId),
  ]);
  if (u && isAdminEmail(u.email)) return HEAD;
  return Math.max(roleRank(u?.role), ...(extra ?? []).map((r) => roleRank(r.role_id)));
}

// ให้ Role นี้ได้ไหม (ต้องต่ำกว่าตัวเอง ยกเว้น Head Admin)
export const canAssign = (myRank: number, roleId: string) => myRank >= HEAD || roleRank(roleId) < myRank;
// แก้ Role ของคนนี้ได้ไหม (เป้าหมายต้องต่ำกว่าตัวเอง ยกเว้น Head Admin)
export const canManage = (myRank: number, targetRank: number) => myRank >= HEAD || targetRank < myRank;
