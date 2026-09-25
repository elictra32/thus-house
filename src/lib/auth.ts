import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { VIEW_AS_COOKIE, isViewAs, type ViewAs } from "./view-as";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { User as AuthUser, SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase, createServiceSupabase } from "./supabase-server";
import { isAdminEmail } from "./admin";
import { ALL_PERMISSIONS, isPermission, type Permission } from "./permissions";
import type { User } from "@/types/database";

export async function getAuthUser() {
  const supabase = createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

// ใช้ใน Server Component: ต้องล็อกอิน ไม่งั้น redirect ไป /login
export async function requirePageUser() {
  const { supabase, user } = await getAuthUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle<User>();
  return { supabase, user, profile };
}

// สิทธิ์ Admin ของผู้ใช้ตาม Role (cache ต่อ request)
// เจ้าของระบบใน NEXT_PUBLIC_ADMIN_EMAILS ได้ทุกสิทธิ์เสมอ — กันล็อกตัวเองออกจากระบบ Role
export const getRealPermissions = cache(async (userId: string | undefined, email: string | null | undefined) => {
  if (!userId) return { perms: new Set<Permission>(), head: false };
  if (isAdminEmail(email)) return { perms: new Set<Permission>(ALL_PERMISSIONS), head: true };
  const service = createServiceSupabase();
  const [{ data }, { data: extra }] = await Promise.all([
    service.from("users").select("status, role, roles!users_role_fkey(permissions)").eq("id", userId).maybeSingle(),
    // 1 คนหลาย Role: สิทธิ์ = Role หลัก + Role เพิ่มเติม (user_roles) รวมกัน
    service.from("user_roles").select("role_id, roles(permissions)").eq("user_id", userId),
  ]);
  // บัญชีที่ไม่ได้ active (inactive / suspended) ไม่มีสิทธิ์ Admin
  if (!data || data.status !== "active") return { perms: new Set<Permission>(), head: false };
  const lists = [data, ...(extra ?? [])].map((r) => (r.roles as unknown as { permissions: string[] } | null)?.permissions ?? []);
  const head = data.role === "head_admin" || !!extra?.some((r) => r.role_id === "head_admin");
  return { perms: new Set<Permission>(lists.flat().filter(isPermission)), head };
});

// มุมมองจำลองของ Head Admin (null = ปกติ)
export async function getViewAs(userId: string | undefined, email: string | null | undefined): Promise<ViewAs | null> {
  const v = cookies().get(VIEW_AS_COOKIE)?.value;
  if (!isViewAs(v)) return null;
  return (await getRealPermissions(userId, email)).head ? v : null;
}

// สิทธิ์ที่ใช้งานจริงในหน้าเว็บ — Head Admin ที่เลือกมุมมอง Mentor / Member จะเห็นเท่าสิทธิ์ของ Role นั้น
export const getPermissions = cache(async (userId: string | undefined, email: string | null | undefined) => {
  const real = await getRealPermissions(userId, email);
  const view = real.head ? await getViewAs(userId, email) : null;
  if (view === "member") return new Set<Permission>();
  if (view === "mentor") return new Set<Permission>(["mentor"]);
  return real.perms;
});

// หน้า /admin: ต้องมีสิทธิ์ Admin อย่างน้อย 1 อย่าง (และสิทธิ์ perm ถ้าระบุ)
export async function requirePageAdmin(perm?: Permission) {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");
  const perms = await getPermissions(user.id, user.email);
  if (!perms.size) redirect("/dashboard");
  if (perm && !perms.has(perm)) redirect("/admin");
  return { user, perms, service: createServiceSupabase() };
}

type ApiAuth =
  | { ok: true; user: AuthUser; supabase: SupabaseClient }
  | { ok: false; res: NextResponse };

// ใช้ใน API route: คืน 401 ถ้ายังไม่ล็อกอิน
export async function requireApiUser(): Promise<ApiAuth> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { ok: false, res: jsonError("กรุณาเข้าสู่ระบบ", 401) };
  return { ok: true, user, supabase };
}

type ApiAdmin =
  | { ok: true; user: AuthUser; service: SupabaseClient; email: string; perms: Set<Permission> }
  | { ok: false; res: NextResponse };

// ใช้ใน /api/admin/*: คืน 403 ถ้า Role ไม่มีสิทธิ์ perm
export async function requireApiAdmin(perm: Permission): Promise<ApiAdmin> {
  const { user } = await getAuthUser();
  if (!user) return { ok: false, res: jsonError("กรุณาเข้าสู่ระบบ", 401) };
  const perms = await getPermissions(user.id, user.email);
  if (!perms.has(perm)) return { ok: false, res: jsonError("ไม่มีสิทธิ์เข้าถึง", 403) };
  return { ok: true, user, service: createServiceSupabase(), email: user.email!, perms };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// บันทึกการกระทำของ Admin ลง admin_logs
export async function logAdmin(
  service: SupabaseClient,
  adminEmail: string,
  action: string,
  tableName: string,
  recordId: string | null,
  details?: Record<string, unknown>,
) {
  await service.from("admin_logs").insert({
    admin_email: adminEmail,
    action,
    table_name: tableName,
    record_id: recordId,
    details: details ?? null,
  });
}
