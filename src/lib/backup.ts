import "server-only";
import { gzipSync } from "zlib";
import { createServiceSupabase } from "./supabase-server";

// สำรองข้อมูลสำคัญเป็นไฟล์ JSON (บีบอัด .gz) แล้วส่งเข้าห้อง Discord ส่วนตัว (DISCORD_BACKUP_WEBHOOK_URL)
// ไม่รวม: รหัสผ่าน (Supabase เก็บแบบเข้ารหัส กู้ไม่ได้อยู่แล้ว), ไฟล์รูปสลิป/รูปหน้าเว็บ, ประวัติเปิดบทเรียน (ข้อมูลเยอะ ไม่จำเป็นต่อการกู้)
const TABLES = [
  "users", // สมาชิก: ชื่อ ชื่อเล่น เบอร์ อีเมล รหัสสมาชิก Role สถานะ
  "purchases", // การชำระเงิน / สิทธิ์เรียน / วันหมดอายุ
  "classes", // คอร์ส ราคา อายุสมาชิก
  "videos", // บทเรียน + ลิงก์วิดีโอ
  "roles", // Role และสิทธิ์
  "watched_videos", // ความคืบหน้าการเรียน
  "live_classes",
  "gallery_items",
  "instructor_messages",
  "lesson_comments",
  "admin_logs", // ใครอนุมัติ/แก้อะไร
] as const;

const PAGE = 1000;
const DISCORD_MAX = 9.5 * 1024 * 1024; // Discord webhook รับไฟล์ ~10MB

export async function runBackup(trigger: "cron" | "manual") {
  const url = process.env.DISCORD_BACKUP_WEBHOOK_URL;
  if (!url) return { ok: false, error: "ยังไม่ได้ตั้งค่า DISCORD_BACKUP_WEBHOOK_URL" };
  const service = createServiceSupabase();

  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data: page, error } = await service.from(table).select("*").range(from, from + PAGE - 1);
      if (error) break; // ตารางที่ไม่มีในฐานข้อมูลนี้ → ข้าม
      rows.push(...(page ?? []));
      if (!page || page.length < PAGE) break;
    }
    data[table] = rows;
    counts[table] = rows.length;
  }

  const now = new Date();
  const local = now.toLocaleString("sv-SE", { timeZone: "Asia/Bangkok" }).slice(0, 16); // 2026-09-25 09:00
  const stamp = local.replace(/[: ]/g, "-");
  const json = JSON.stringify({ exported_at: now.toISOString(), source: process.env.NEXT_PUBLIC_SITE_URL, tables: data });
  const gz = gzipSync(Buffer.from(json));
  const summary = Object.entries(counts).map(([t, n]) => `${t}: ${n}`).join(" · ");

  if (gz.length > DISCORD_MAX) {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "THUS Backup",
        content: `⚠️ ไฟล์สำรองใหญ่เกิน Discord รับได้ (${(gz.length / 1024 / 1024).toFixed(1)} MB) — ถึงเวลาอัปเกรด Supabase Pro (มี backup อัตโนมัติ)\n${summary}`,
      }),
    }).catch(() => {});
    return { ok: false, error: "ไฟล์ใหญ่เกิน Discord", counts };
  }

  const form = new FormData();
  form.append(
    "payload_json",
    JSON.stringify({
      username: "THUS Backup",
      allowed_mentions: { parse: [] },
      content: `🗄️ สำรองข้อมูล${trigger === "manual" ? " (กดเอง)" : "ประจำวัน"} ${local} น. · ${(gz.length / 1024).toFixed(0)} KB\n${summary}`,
    }),
  );
  form.append("files[0]", new Blob([gz], { type: "application/gzip" }), `thushouse-backup-${stamp}.json.gz`);
  const res = await fetch(url, { method: "POST", body: form, signal: AbortSignal.timeout(20000) }).catch(() => null);
  if (!res?.ok) return { ok: false, error: `ส่งเข้า Discord ไม่สำเร็จ (${res?.status ?? "network"})`, counts };
  return { ok: true, bytes: gz.length, counts };
}
