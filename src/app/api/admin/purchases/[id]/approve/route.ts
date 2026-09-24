import { adminRoute, check, ok, must } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";

export const POST = adminRoute<{ id: string }>(async (_req, { service, email }, { id }) => {
  const { data: p } = await service.from("purchases").select("*, classes(name)").eq("id", id).maybeSingle();
  if (!p) return jsonError("ไม่พบรายการ", 404);
  if (p.status === "approved") return jsonError("รายการนี้อนุมัติแล้ว");

  const now = new Date().toISOString();
  must(
    await service.from("purchases")
      .update({ status: "approved", approved_by: email, approved_at: now, rejection_reason: null })
      .eq("id", id),
  );
  // เริ่มนับสมาชิกตั้งแต่การซื้อครั้งแรกที่อนุมัติ
  await service.from("users").update({ membership_start: now }).eq("id", p.user_id).is("membership_start", null);
  await service.from("notifications").insert({
    user_id: p.user_id,
    type: "payment_approved",
    title: "ชำระเงินสำเร็จ 🎉",
    message: `คอร์ส ${p.classes?.name ?? ""} เปิดสิทธิ์แล้ว เริ่มเรียนได้เลย`,
  });
  await logAdmin(service, email, "approve", "purchases", id, { user_id: p.user_id, class_id: p.class_id, amount: p.amount });
  return ok();
});
