import { adminRoute, ok, must } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { num } from "@/lib/validate";
import { addDays, formatDate } from "@/lib/utils";

// body (ไม่บังคับ): { access_days } อายุสมาชิกของรายการนี้ (วัน)
// ไม่ส่ง = ใช้ค่าเริ่มต้นของคอร์ส · ส่งค่าว่าง/null = ไม่หมดอายุ
export const POST = adminRoute<{ id: string }>(async (req, { service, email }, { id }) => {
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const { data: p } = await service.from("purchases").select("*, classes(name, access_days)").eq("id", id).maybeSingle();
  if (!p) return jsonError("ไม่พบรายการ", 404);
  if (p.status === "approved") return jsonError("รายการนี้อนุมัติแล้ว");

  const days = "access_days" in body ? num(body, "access_days", { min: 1 }) : (p.classes?.access_days ?? null);
  const now = new Date();
  const expiresAt = days ? addDays(Math.round(days), now) : null;
  must(
    await service.from("purchases")
      .update({ status: "approved", approved_by: email, approved_at: now.toISOString(), rejection_reason: null, expires_at: expiresAt })
      .eq("id", id),
  );
  // เริ่มนับสมาชิกตั้งแต่การซื้อครั้งแรกที่อนุมัติ
  await service.from("users").update({ membership_start: now.toISOString() }).eq("id", p.user_id).is("membership_start", null);
  await service.from("notifications").insert({
    user_id: p.user_id,
    type: "payment_approved",
    title: "ชำระเงินสำเร็จ 🎉",
    message: `คอร์ส ${p.classes?.name ?? ""} เปิดสิทธิ์แล้ว เริ่มเรียนได้เลย` + (expiresAt ? ` (เรียนได้ถึง ${formatDate(expiresAt)})` : ""),
  });
  await logAdmin(service, email, "approve", "purchases", id, {
    user_id: p.user_id, class_id: p.class_id, amount: p.amount, expires_at: expiresAt,
  });
  return ok();
});
