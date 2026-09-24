import "server-only";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { User as AuthUser, SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase, createServiceSupabase } from "./supabase-server";
import { isAdminEmail } from "./admin";
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

export async function requirePageAdmin() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/dashboard");
  return { user, service: createServiceSupabase() };
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
  | { ok: true; user: AuthUser; service: SupabaseClient; email: string }
  | { ok: false; res: NextResponse };

// ใช้ใน /api/admin/*: คืน 403 ถ้าไม่ใช่ Admin
export async function requireApiAdmin(): Promise<ApiAdmin> {
  const { user } = await getAuthUser();
  if (!user) return { ok: false, res: jsonError("กรุณาเข้าสู่ระบบ", 401) };
  if (!isAdminEmail(user.email)) return { ok: false, res: jsonError("ไม่มีสิทธิ์เข้าถึง", 403) };
  return { ok: true, user, service: createServiceSupabase(), email: user.email! };
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
