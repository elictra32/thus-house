import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { applyDiscount } from "@/lib/discount";
import { createServiceSupabase } from "@/lib/supabase-server";
import { logMember } from "@/lib/member-log";

// ตรวจโค้ดส่วนลดก่อนชำระเงิน → ราคาสุดท้าย + รหัสยืนยัน
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { code, classId } = await req.json().catch(() => ({}));
  if (typeof classId !== "string" || !classId) return jsonError("กรุณาเลือกคอร์ส");
  const service = createServiceSupabase();
  // กันสุ่มเดาโค้ด: กรอกผิดเกิน 10 ครั้งใน 10 นาที → พักก่อน
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await service.from("member_logs").select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id).eq("action", "discount_fail").gte("created_at", since);
  if ((count ?? 0) >= 10) return jsonError("กรอกโค้ดผิดหลายครั้ง กรุณารอสักครู่แล้วลองใหม่", 429);
  const { data: cls } = await service.from("classes").select("id, price").eq("id", classId).maybeSingle();
  if (!cls) return jsonError("ไม่พบคอร์ส", 404);
  const r = await applyDiscount(service, code, cls, auth.user.id);
  if ("error" in r) {
    await logMember(service, auth.user.id, "discount_fail", { code: String(code ?? "").slice(0, 30), reason: r.error });
    return jsonError(r.error);
  }
  return NextResponse.json(r);
}
