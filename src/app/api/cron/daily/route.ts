import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";
import { notifyDiscord } from "@/lib/discord";
import { VERCEL_PLANS, nextRenewal, renewsTomorrow, supabasePlan, vercelPlan } from "@/lib/usage-plans";

const VERCEL_PLANS_PRO = VERCEL_PLANS.pro;
import { formatDate } from "@/lib/utils";
import { runBackup } from "@/lib/backup";

// งานประจำวัน (Vercel Cron ทุกวัน ~09:00 น. — ดู vercel.json)
// 1) Usage ใกล้เต็ม (80%+) → Discord
// 2) สิทธิ์สมาชิกเหลือ 30 / 7 / 1 วัน → Discord + แจ้งเตือนสมาชิกในเว็บ
// 3) สำรองข้อมูลสำคัญส่งเข้าห้อง Discord ส่วนตัว (ดู lib/backup.ts)
// ผลพลอยได้: มีคนเรียกฐานข้อมูลทุกวัน → Supabase Free ไม่หยุดโปรเจกต์เพราะไม่มีการใช้งาน
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 86400_000;
const MARKS = [30, 7, 1];
const pct = (a: number, b: number) => Math.round((a / b) * 100);
const mb = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(2)} GB` : `${(b / 1024 ** 2).toFixed(1)} MB`);

type Expiring = {
  id: string;
  user_id: string;
  expires_at: string;
  classes: { name: string } | null;
  users: { name: string | null; nickname: string | null; email: string; phone: string | null; member_code: string | null } | null;
};

export async function GET(req: Request) {
  // เรียกได้เฉพาะ Vercel Cron (ส่ง Authorization: Bearer <CRON_SECRET>)
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const service = createServiceSupabase();
  // Log สมาชิกเก็บ 180 วัน
  await service.from("member_logs").delete().lt("created_at", new Date(Date.now() - 180 * 86400000).toISOString());
  const report: Record<string, unknown> = {};

  // ---------- 1) Usage ----------
  const { data: usage } = await service.rpc("admin_usage");
  const u = usage as { db_bytes: number; storage_bytes: number; mau: number } | null;
  if (u) {
    const p = supabasePlan();
    const items = [
      { name: "ขนาดฐานข้อมูล", used: pct(u.db_bytes, p.dbBytes), text: `${mb(u.db_bytes)} / ${mb(p.dbBytes)}` },
      { name: "พื้นที่ไฟล์", used: pct(u.storage_bytes, p.storageBytes), text: `${mb(u.storage_bytes)} / ${mb(p.storageBytes)}` },
      { name: "ผู้ใช้ 30 วัน (MAU)", used: pct(u.mau, p.mau), text: `${u.mau} / ${p.mau}` },
    ].filter((i) => i.used >= 80);
    if (items.length) {
      await notifyDiscord(
        "usage",
        `Supabase (${p.label}) ใกล้เต็ม — ควรอัปเกรด`,
        Object.fromEntries(items.map((i) => [i.name, `${i.used}% · ${i.text}`])),
        "/admin/usage",
      );
    }
    report.usageAlerts = items.length;
  }

  // ---------- 1.5) Vercel Pro จะต่ออายุพรุ่งนี้ → เตือนก่อน 1 วัน ----------
  if (vercelPlan() === VERCEL_PLANS_PRO && renewsTomorrow()) {
    await notifyDiscord("expiring", "Vercel Pro จะต่ออายุพรุ่งนี้", {
      วันที่ต่ออายุ: nextRenewal(new Date(Date.now() + 86400_000)).toLocaleDateString("th-TH", { dateStyle: "long", timeZone: "UTC" }),
      ค่าบริการ: vercelPlan().price,
      หมายเหตุ: "ตัดบัตรอัตโนมัติ — ถ้าจะยกเลิก/เปลี่ยนบัตร ทำที่ vercel.com → Settings → Billing ภายในวันนี้",
    }, "/admin/usage");
    report.vercelRenewal = true;
  }

  // ---------- 2) สิทธิ์ใกล้หมดอายุ ----------
  const now = Date.now();
  const { data: rows } = await service
    .from("purchases")
    .select("id, user_id, expires_at, classes(name), users(name, nickname, email, phone, member_code)")
    .eq("status", "approved")
    .gt("expires_at", new Date(now).toISOString())
    .lte("expires_at", new Date(now + 31 * DAY).toISOString());
  // นับเป็นวันตามปฏิทินไทย (วันหมดอายุ - วันนี้)
  const bkkDay = (t: number) => Math.floor((t + 7 * 3600_000) / DAY);
  const due = ((rows ?? []) as unknown as Expiring[])
    .map((r) => ({ ...r, left: bkkDay(Date.parse(r.expires_at)) - bkkDay(now) }))
    .filter((r) => MARKS.includes(r.left));

  for (const r of due) {
    const who = r.users?.nickname || r.users?.name || r.users?.email || "สมาชิก";
    await notifyDiscord(
      "expiring",
      `สิทธิ์เรียนเหลือ ${r.left} วัน — ทักให้ต่ออายุ`,
      {
        สมาชิก: `${who} (${r.users?.email ?? "-"})`,
        รหัสสมาชิก: r.users?.member_code,
        เบอร์: r.users?.phone,
        คอร์ส: r.classes?.name,
        หมดอายุ: formatDate(r.expires_at),
      },
      `/admin/members/${r.user_id}`,
    );
    await service.from("notifications").insert({
      user_id: r.user_id,
      type: "expiring",
      link: "/payment",
      title: `สิทธิ์เรียนเหลือ ${r.left} วัน`,
      message: `คอร์ส ${r.classes?.name ?? ""} หมดอายุ ${formatDate(r.expires_at)} — ต่ออายุได้ที่หน้าชำระเงิน`,
    });
  }
  report.expiring = due.length;

  // ---------- 3) สำรองข้อมูล ----------
  const backup = await runBackup("cron");
  report.backup = backup.ok ? `${backup.bytes} bytes` : backup.error;
  if (!backup.ok && process.env.DISCORD_BACKUP_WEBHOOK_URL) {
    await notifyDiscord("security", "สำรองข้อมูลประจำวันไม่สำเร็จ", { สาเหตุ: backup.error }, "/admin/usage");
  }

  return NextResponse.json({ ok: true, ...report });
}
