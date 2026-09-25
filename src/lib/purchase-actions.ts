import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logAdmin } from "./auth";
import { addDays, baht, formatDate } from "./utils";
import { notifyDiscord } from "./discord";
import { closeReviewMessage } from "./discord-bot";

// อนุมัติ / ปฏิเสธสลิป — ใช้ร่วมกันระหว่างหน้า Admin และปุ่มใน Discord
type Result = { ok: true } | { ok: false; error: string; status: number };
type Via = "web" | "discord";

const fail = (error: string, status = 400): Result => ({ ok: false, error, status });
const who = (u: { nickname?: string | null; name?: string | null; email?: string | null } | null) =>
  `${u?.nickname || u?.name || "-"} (${u?.email ?? "-"})`;

// accessDays: undefined = ใช้ค่าเริ่มต้นของคอร์ส · null = ไม่หมดอายุ
export async function approvePurchase(
  service: SupabaseClient, id: string, adminEmail: string, opts: { accessDays?: number | null; via?: Via } = {},
): Promise<Result> {
  const { data: p } = await service.from("purchases")
    .select("*, classes(name, access_days), users(name, nickname, email, member_code)").eq("id", id).maybeSingle();
  if (!p) return fail("ไม่พบรายการ", 404);
  if (p.status === "approved") return fail("รายการนี้อนุมัติแล้ว");

  const days = opts.accessDays === undefined ? (p.classes?.access_days ?? null) : opts.accessDays;
  const now = new Date();
  const expiresAt = days ? addDays(Math.round(days), now) : null;
  // เงื่อนไข status กันกดพร้อมกันสองที่ (เว็บ + Discord) แล้วอนุมัติซ้ำ
  const { data: updated, error } = await service.from("purchases")
    .update({ status: "approved", approved_by: adminEmail, approved_at: now.toISOString(), rejection_reason: null, expires_at: expiresAt })
    .eq("id", id).eq("status", p.status).select("id");
  if (error) return fail(error.message, 500);
  if (!updated?.length) return fail("รายการนี้ถูกดำเนินการไปแล้ว");

  // เริ่มนับสมาชิกตั้งแต่การซื้อครั้งแรกที่อนุมัติ
  await service.from("users").update({ membership_start: now.toISOString() }).eq("id", p.user_id).is("membership_start", null);
  await service.from("notifications").insert({
    user_id: p.user_id,
    type: "payment_approved",
    link: `/classes/${p.class_id}`,
    title: "ชำระเงินสำเร็จ 🎉",
    message: `คอร์ส ${p.classes?.name ?? ""} เปิดสิทธิ์แล้ว เริ่มเรียนได้เลย` + (expiresAt ? ` (เรียนได้ถึง ${formatDate(expiresAt)})` : ""),
  });
  await logAdmin(service, adminEmail, "approve", "purchases", id, {
    user_id: p.user_id, class_id: p.class_id, amount: p.amount, expires_at: expiresAt, via: opts.via ?? "web",
  });
  const until = expiresAt ? formatDate(expiresAt) : "ไม่หมดอายุ";
  await Promise.all([
    closeReviewMessage(p.discord_message_id, "approved", [
      ["อนุมัติโดย", adminEmail + (opts.via === "discord" ? " (ผ่าน Discord)" : "")],
      ["เรียนได้ถึง", until],
    ]),
    notifyDiscord(
      "approved",
      "อนุมัติการชำระเงินแล้ว",
      {
        สมาชิก: who(p.users),
        รหัสสมาชิก: p.users?.member_code,
        คอร์ส: p.classes?.name,
        ยอด: baht(p.amount),
        เรียนได้ถึง: until,
        อนุมัติโดย: adminEmail + (opts.via === "discord" ? " (ผ่าน Discord)" : ""),
      },
      `/admin/members/${p.user_id}`,
    ),
  ]);
  return { ok: true };
}

export async function rejectPurchase(
  service: SupabaseClient, id: string, adminEmail: string, reason: string, opts: { via?: Via } = {},
): Promise<Result> {
  const { data: p } = await service.from("purchases").select("*, classes(name), users(name, nickname, email)").eq("id", id).maybeSingle();
  if (!p) return fail("ไม่พบรายการ", 404);
  if (p.status !== "pending") return fail("ปฏิเสธได้เฉพาะรายการที่รอตรวจสอบ");

  const { data: updated, error } = await service.from("purchases")
    .update({ status: "rejected", rejection_reason: reason, approved_by: adminEmail, approved_at: new Date().toISOString() })
    .eq("id", id).eq("status", "pending").select("id");
  if (error) return fail(error.message, 500);
  if (!updated?.length) return fail("รายการนี้ถูกดำเนินการไปแล้ว");

  await service.from("notifications").insert({
    user_id: p.user_id,
    type: "payment_rejected",
    link: "/payment",
    title: "สลิปไม่ผ่านการตรวจสอบ",
    message: `คอร์ส ${p.classes?.name ?? ""}: ${reason} — แนบสลิปใหม่ได้ที่หน้าชำระเงิน`,
  });
  await logAdmin(service, adminEmail, "reject", "purchases", id, { reason, via: opts.via ?? "web" });
  const by = adminEmail + (opts.via === "discord" ? " (ผ่าน Discord)" : "");
  await Promise.all([
    closeReviewMessage(p.discord_message_id, "rejected", [["ปฏิเสธโดย", by], ["เหตุผล", reason]]),
    notifyDiscord(
      "rejected",
      "ปฏิเสธสลิป",
      { สมาชิก: who(p.users), คอร์ส: p.classes?.name, ยอด: baht(p.amount), เหตุผล: reason, ปฏิเสธโดย: by },
      `/admin/members/${p.user_id}`,
    ),
  ]);
  return { ok: true };
}
