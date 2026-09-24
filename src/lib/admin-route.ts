import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";
import { jsonError, requireApiAdmin } from "./auth";
import { ValidationError } from "./validate";

type Ctx = { service: SupabaseClient; email: string; user: AuthUser };

// ห่อ handler ของ /api/admin/*: ตรวจสิทธิ์ Admin + จัดการ error ให้เป็น JSON
export function adminRoute<P = Record<string, string>>(
  handler: (req: Request, ctx: Ctx, params: P) => Promise<NextResponse>,
) {
  return async (req: Request, { params }: { params: P }) => {
    const auth = await requireApiAdmin();
    if (!auth.ok) return auth.res;
    try {
      return await handler(req, { service: auth.service, email: auth.email, user: auth.user }, params);
    } catch (err) {
      if (err instanceof ValidationError) return jsonError(err.message, 400);
      console.error(err);
      return jsonError((err as Error).message || "เกิดข้อผิดพลาด", 500);
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") throw new ValidationError("ข้อมูลไม่ถูกต้อง");
  return body as Record<string, unknown>;
}

export function ok(data: unknown = { ok: true }) {
  return NextResponse.json(data);
}

// ถ้า Supabase คืน error (หรือไม่พบข้อมูล) ให้โยนต่อ
export function check<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  if (res.data == null) throw new Error("ไม่พบข้อมูล");
  return res.data as NonNullable<T>;
}

// นับจำนวนวิดีโอ/ชั่วโมงของคอร์สใหม่ทุกครั้งที่วิดีโอเปลี่ยน
export async function recountClass(service: SupabaseClient, classId: string) {
  const { data } = await service.from("videos").select("duration_seconds").eq("class_id", classId);
  const seconds = (data ?? []).reduce((s, v) => s + (v.duration_seconds ?? 0), 0);
  await service
    .from("classes")
    .update({ videos_count: data?.length ?? 0, duration_hours: Math.round((seconds / 3600) * 10) / 10 })
    .eq("id", classId);
}

// สำหรับคำสั่งที่ไม่คืนข้อมูล (delete / update / insert ที่ไม่ select) — โยนเฉพาะ error
export function must(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message);
}
