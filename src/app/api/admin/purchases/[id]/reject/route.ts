import { adminRoute, check, ok, readJson, must } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { str } from "@/lib/validate";

export const POST = adminRoute<{ id: string }>("payments", async (req, { service, email }, { id }) => {
  const reason = str(await readJson(req), "reason", { required: true, max: 500 });
  const { data: p } = await service.from("purchases").select("*, classes(name)").eq("id", id).maybeSingle();
  if (!p) return jsonError("ไม่พบรายการ", 404);
  if (p.status !== "pending") return jsonError("ปฏิเสธได้เฉพาะรายการที่รอตรวจสอบ");

  must(
    await service.from("purchases")
      .update({ status: "rejected", rejection_reason: reason, approved_by: email, approved_at: new Date().toISOString() })
      .eq("id", id),
  );
  await service.from("notifications").insert({
    user_id: p.user_id,
    type: "payment_rejected",
    link: "/payment",
    title: "สลิปไม่ผ่านการตรวจสอบ",
    message: `คอร์ส ${p.classes?.name ?? ""}: ${reason} — แนบสลิปใหม่ได้ที่หน้าชำระเงิน`,
  });
  await logAdmin(service, email, "reject", "purchases", id, { reason });
  return ok();
});
