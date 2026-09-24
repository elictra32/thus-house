import { adminRoute, check, ok, readJson, must } from "@/lib/admin-route";
import { jsonError, logAdmin } from "@/lib/auth";
import { str } from "@/lib/validate";
import { baht } from "@/lib/utils";
import { notifyDiscord } from "@/lib/discord";

export const POST = adminRoute<{ id: string }>("payments", async (req, { service, email }, { id }) => {
  const reason = str(await readJson(req), "reason", { required: true, max: 500 });
  const { data: p } = await service.from("purchases").select("*, classes(name), users(name, nickname, email)").eq("id", id).maybeSingle();
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
  await notifyDiscord(
    "rejected",
    "ปฏิเสธสลิป",
    {
      สมาชิก: `${p.users?.nickname || p.users?.name || "-"} (${p.users?.email ?? "-"})`,
      คอร์ส: p.classes?.name,
      ยอด: baht(p.amount),
      เหตุผล: reason,
      ปฏิเสธโดย: email,
    },
    `/admin/members/${p.user_id}`,
  );
  return ok();
});
