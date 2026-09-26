import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceSupabase } from "./supabase-server";
import { supabasePlan } from "./usage-plans";
import { baht } from "./utils";

// รายงานประจำวัน (สถิติของ "เมื่อวาน" ตามเวลาไทย + ภาพรวมตอนนี้) → ห้อง Discord เดียวกับไฟล์ Backup (DISCORD_BACKUP_WEBHOOK_URL)
// ส่งโดย Cron 09:00 (api/cron/daily) หรือกดเองที่ Admin → Usage
// เป็นตัวเลขรวม + ชื่อเล่น/รหัสสมาชิกของคนที่ใช้งานมากสุดเท่านั้น (ไม่มีอีเมล/เบอร์/เลขบัตร)

const DAY = 86400_000;
const BKK = 7 * 3600_000;
const PAGE = 1000;
const MAX_ROWS = 20_000;

type Row = Record<string, unknown>;

// ดึงแถวทั้งหมดในช่วงเวลา (แบ่งหน้า) — ตารางไม่มี/ผิดพลาด → ได้ [] ไม่ทำให้รายงานทั้งฉบับล้ม
async function rowsBetween(service: SupabaseClient, table: string, cols: string, col: string, from: string, to: string) {
  const out: Row[] = [];
  for (let i = 0; i < MAX_ROWS; i += PAGE) {
    const { data, error } = await service.from(table).select(cols).gte(col, from).lt(col, to).range(i, i + PAGE - 1);
    if (error || !data) break;
    out.push(...(data as unknown as Row[]));
    if (data.length < PAGE) break;
  }
  return out;
}

const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
const n = (v: number) => v.toLocaleString("th-TH");
const hm = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h} ชม. ${m} นาที` : `${m} นาที`;
};
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const topBy = <T,>(items: T[], key: (t: T) => string | null | undefined) => {
  const m = new Map<string, number>();
  items.forEach((t) => {
    const k = key(t);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

export async function buildDailyReport(service: SupabaseClient, now = new Date()) {
  // ช่วง "เมื่อวาน" 00:00–24:00 เวลาไทย
  const todayStart = Math.floor((now.getTime() + BKK) / DAY) * DAY - BKK;
  const from = new Date(todayStart - DAY).toISOString();
  const to = new Date(todayStart).toISOString();
  const weekFrom = new Date(todayStart - 7 * DAY).toISOString();
  const monthStart = (() => {
    const b = new Date(todayStart - DAY + BKK); // เดือนของ "เมื่อวาน"
    return new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 1) - BKK).toISOString();
  })();
  const nowIso = now.toISOString();

  const [users, purchases, presence, presenceWeek, access, logs, usage] = await Promise.all([
    service.from("users").select("id, status, role, created_at, nickname, name, member_code").then((r) => (r.data ?? []) as Row[]),
    service
      .from("purchases")
      .select("user_id, status, amount, created_at, approved_at, expires_at, discount_code, classes(name)")
      .then((r) => (r.data ?? []) as Row[]),
    rowsBetween(service, "presence_sessions", "user_id, started_at, last_seen", "last_seen", from, to),
    rowsBetween(service, "presence_sessions", "user_id", "last_seen", weekFrom, to),
    rowsBetween(service, "video_access_logs", "user_id, video_id, blocked", "created_at", from, to),
    rowsBetween(service, "member_logs", "action", "created_at", from, to),
    service.rpc("admin_usage").then((r) => r.data as { db_bytes: number; storage_bytes: number; mau: number } | null),
  ]);

  const between = (v: unknown, a: string, b: string) => typeof v === "string" && v >= a && v < b;
  const nameOf = new Map(users.map((u) => [u.id as string, [u.member_code, u.nickname || u.name].filter(Boolean).join(" ") || "สมาชิก"]));

  // ---------- สมาชิก ----------
  const members = users.filter((u) => (u.role ?? "member") === "member");
  const newUsers = users.filter((u) => between(u.created_at, from, to)).length;
  const byStatus = (s: string) => members.filter((u) => u.status === s).length;

  // ---------- การเงิน ----------
  const approved = purchases.filter((p) => p.status === "approved");
  const approvedAt = (p: Row) => (p.approved_at ?? p.created_at) as string;
  const sum = (ps: Row[]) => ps.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const apprYesterday = approved.filter((p) => between(approvedAt(p), from, to));
  const slipsYesterday = purchases.filter((p) => between(p.created_at, from, to));
  const rejectedYesterday = purchases.filter((p) => p.status === "rejected" && between(p.created_at, from, to)).length;
  const pending = purchases.filter((p) => p.status === "pending").length;
  const active = approved.filter((p) => !p.expires_at || (p.expires_at as string) > nowIso);
  const activeUsers = new Set(active.map((p) => p.user_id)).size;
  const in30 = new Date(now.getTime() + 30 * DAY).toISOString();
  const expiring = new Set(active.filter((p) => p.expires_at && (p.expires_at as string) <= in30).map((p) => p.user_id)).size;
  const codesYesterday = slipsYesterday.filter((p) => p.discount_code).length;
  const soldClasses = topBy(apprYesterday, (p) => (p.classes as { name?: string } | null)?.name);

  // ---------- การเข้าใช้งาน ----------
  const visitors = new Set(presence.map((s) => s.user_id)).size;
  const secByUser = new Map<string, number>();
  presence.forEach((s) => {
    const sec = Math.max(60, (Date.parse(s.last_seen as string) - Date.parse(s.started_at as string)) / 1000);
    secByUser.set(s.user_id as string, (secByUser.get(s.user_id as string) ?? 0) + sec);
  });
  const totalSec = [...secByUser.values()].reduce((a, b) => a + b, 0);
  const topUsers = [...secByUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const visitorsWeek = new Set(presenceWeek.map((s) => s.user_id)).size;
  const actions = new Map(topBy(logs, (l) => l.action as string));

  // ---------- บทเรียน ----------
  const opened = access.filter((a) => !a.blocked);
  const blocked = access.length - opened.length;
  const topVideoIds = topBy(opened, (a) => a.video_id as string).slice(0, 3);
  const [videoTitles, watched, comments, likes, messages, unreadMsgs, liveToday, adminActs, totalVideos] = await Promise.all([
    topVideoIds.length
      ? service.from("videos").select("id, title").in("id", topVideoIds.map(([id]) => id)).then((r) => new Map((r.data ?? []).map((v) => [v.id, v.title as string])))
      : new Map<string, string>(),
    count(service.from("watched_videos").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to)),
    count(service.from("lesson_comments").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to)),
    count(service.from("video_likes").select("video_id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to)),
    count(service.from("instructor_messages").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to)),
    count(service.from("instructor_messages").select("id", { count: "exact", head: true }).eq("status", "new")),
    service
      .from("live_classes")
      .select("title, scheduled_date")
      .gte("scheduled_date", to)
      .lt("scheduled_date", new Date(todayStart + DAY).toISOString())
      .order("scheduled_date")
      .then((r) => (r.data ?? []) as { title: string; scheduled_date: string }[]),
    count(service.from("admin_logs").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to)),
    count(service.from("videos").select("id", { count: "exact", head: true })),
  ]);

  const dateLabel = new Date(todayStart - DAY).toLocaleDateString("th-TH", { dateStyle: "full", timeZone: "Asia/Bangkok" });
  const time = (iso: string) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
  const plan = supabasePlan();

  const sections: { title: string; lines: (string | false | null | undefined)[] }[] = [
    {
      title: "👥 สมาชิก",
      lines: [
        `สมัครใหม่ **${n(newUsers)}** คน · บัญชีทั้งหมด ${n(users.length)} (สมาชิก ${n(members.length)} · ทีมงาน ${n(users.length - members.length)})`,
        `มีสิทธิ์เรียนอยู่ **${n(activeUsers)}** คน · สิทธิ์หมดใน 30 วัน ${n(expiring)} คน`,
        `สถานะสมาชิก: ใช้งาน ${n(byStatus("active"))} · ปิดใช้ ${n(byStatus("inactive"))} · ระงับ ${n(byStatus("suspended"))}`,
      ],
    },
    {
      title: "💰 การเงิน",
      lines: [
        `รายได้เมื่อวาน **${baht(sum(apprYesterday))}** (อนุมัติ ${n(apprYesterday.length)} รายการ)`,
        soldClasses.length > 0 && `ขายได้: ${soldClasses.map(([c, k]) => `${c} ×${k}`).join(" · ")}`,
        `สลิปเข้าใหม่ ${n(slipsYesterday.length)} · ใช้โค้ดส่วนลด ${n(codesYesterday)} · ปฏิเสธ ${n(rejectedYesterday)}`,
        `**รอตรวจสลิป ${n(pending)} รายการ**${pending ? " ⚠️" : ""}`,
        `รายได้เดือนนี้ ${baht(sum(approved.filter((p) => approvedAt(p) >= monthStart && approvedAt(p) < to)))} · รวมทั้งหมด ${baht(sum(approved))}`,
      ],
    },
    {
      title: "📈 การเข้าใช้งาน",
      lines: [
        `เข้าเว็บ **${n(visitors)}** คน · ${n(presence.length)} ครั้ง · เวลารวม ${hm(totalSec)}${visitors ? ` (เฉลี่ย ${hm(totalSec / visitors)}/คน)` : ""}`,
        `เข้าเว็บใน 7 วัน ${n(visitorsWeek)} คน`,
        `ล็อกอิน ${n(actions.get("login") ?? 0)} ครั้ง${actions.get("login_blocked") ? ` · ถูกกันล็อกอินซ้อนเครื่อง ${n(actions.get("login_blocked")!)}` : ""}`,
        topUsers.length > 0 && `ใช้งานนานสุด: ${topUsers.map(([id, s]) => `${nameOf.get(id) ?? "สมาชิก"} (${hm(s)})`).join(" · ")}`,
      ],
    },
    {
      title: "🎬 บทเรียน",
      lines: [
        `เปิดบทเรียน **${n(opened.length)}** ครั้ง · ${n(new Set(opened.map((a) => a.user_id)).size)} คน · ติ๊กดูแล้ว ${n(watched)} บท`,
        blocked > 0 && `ถูกพักเพราะเปิดถี่ ${n(blocked)} ครั้ง ⚠️`,
        topVideoIds.length > 0 && `ยอดนิยม: ${topVideoIds.map(([id, k]) => `${videoTitles.get(id) ?? "บทเรียน"} (${k})`).join(" · ")}`,
        `บทเรียนทั้งหมด ${n(totalVideos)} บท`,
      ],
    },
    {
      title: "💬 ชุมชน",
      lines: [
        `คอมเมนต์ ${n(comments)} · กดหัวใจ ${n(likes)} · ข้อความถึงผู้สอน ${n(messages)}`,
        `**ข้อความยังไม่ได้ตอบ ${n(unreadMsgs)}**${unreadMsgs ? " ⚠️" : ""}`,
      ],
    },
    {
      title: "🗓️ วันนี้",
      lines: [liveToday.length ? liveToday.map((l) => `Live: ${l.title} · ${time(l.scheduled_date)} น.`).join("\n") : "ไม่มี Live Class"],
    },
    {
      title: "🛠️ ระบบ",
      lines: [
        `ทีมงานทำรายการ ${n(adminActs)} ครั้ง`,
        usage &&
          `Supabase ${plan.label}: ฐานข้อมูล ${pct(usage.db_bytes, plan.dbBytes)}% · ไฟล์ ${pct(usage.storage_bytes, plan.storageBytes)}% · ผู้ใช้ 30 วัน ${n(usage.mau)}`,
      ],
    },
  ];

  const description = sections
    .map((s) => `**${s.title}**\n${s.lines.filter(Boolean).map((l) => `• ${l}`).join("\n")}`)
    .join("\n\n")
    .slice(0, 4000);

  return { title: `📊 รายงานประจำวัน — ${dateLabel}`, description };
}

export async function sendDailyReport(now = new Date()) {
  const url = process.env.DISCORD_BACKUP_WEBHOOK_URL;
  if (!url) return { ok: false as const, error: "ยังไม่ได้ตั้งค่า DISCORD_BACKUP_WEBHOOK_URL" };
  const report = await buildDailyReport(createServiceSupabase(), now);
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "THUS Report",
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: report.title,
          url: site ? `${site}/admin/analytics` : undefined,
          description: report.description,
          color: 0x9195dc,
          timestamp: now.toISOString(),
        },
      ],
    }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (!res?.ok) return { ok: false as const, error: `ส่งเข้า Discord ไม่สำเร็จ (${res?.status ?? "network"})` };
  return { ok: true as const };
}
