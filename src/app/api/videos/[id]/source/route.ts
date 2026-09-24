import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireApiUser, jsonError, getPermissions } from "@/lib/auth";
import { getClassAccess } from "@/lib/class-access";
import { createServiceSupabase } from "@/lib/supabase-server";
import { adminEmails } from "@/lib/admin";
import { driveEmbedUrl, youtubeId } from "@/lib/utils";

// ลิงก์วิดีโอส่งให้ทีละบทเท่านั้น (ฐานข้อมูลไม่ให้สมาชิกอ่าน video_url ตรงๆ)
// ทุกครั้งบันทึกลง video_access_logs · เปิดบทเรียนต่างกันเกิน LIMIT บทใน 1 ชม. = ผิดปกติ → พักการขอลิงก์ + แจ้ง Admin
const LIMIT_PER_HOUR = 30;
const HOUR = 60 * 60 * 1000;
const DEDUPE_MS = 10 * 60 * 1000; // เปิดบทเดิมซ้ำใน 10 นาที ไม่บันทึกซ้ำ

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { user } = auth;
  const service = createServiceSupabase();

  const { data: video } = await service
    .from("videos").select("id, class_id, title, video_url").eq("id", params.id).maybeSingle();
  if (!video) return jsonError("ไม่พบวิดีโอ", 404);

  const access = await getClassAccess(auth.supabase, user, video.class_id);
  if (!access.hasAccess) return jsonError("ไม่มีสิทธิ์เข้าถึงคอร์สนี้", 403);

  // ทีมงานที่จัดการคอร์สได้ ไม่ติดลิมิต (แต่ยังบันทึกประวัติ)
  const staff = (await getPermissions(user.id, user.email)).has("classes");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;

  const since = new Date(Date.now() - HOUR).toISOString();
  const { data: recent } = await service
    .from("video_access_logs").select("video_id, blocked, created_at")
    .eq("user_id", user.id).gte("created_at", since);
  const rows = recent ?? [];
  const opened = new Set(rows.filter((r) => !r.blocked).map((r) => r.video_id));

  if (!staff && !opened.has(video.id) && opened.size >= LIMIT_PER_HOUR) {
    const firstBlock = !rows.some((r) => r.blocked);
    await service.from("video_access_logs").insert({ user_id: user.id, video_id: video.id, class_id: video.class_id, blocked: true, ip });
    if (firstBlock) await alertAdmins(service, user.email ?? user.id, user.id, opened.size, ip);
    return jsonError("คุณเปิดบทเรียนถี่เกินไป กรุณาพักสักครู่แล้วลองใหม่ (ประมาณ 1 ชั่วโมง)", 429);
  }

  const dupe = rows.some((r) => r.video_id === video.id && !r.blocked && Date.now() - Date.parse(r.created_at) < DEDUPE_MS);
  if (!dupe) {
    const { error } = await service.from("video_access_logs").insert({ user_id: user.id, video_id: video.id, class_id: video.class_id, ip });
    if (error) console.error("video_access_logs insert failed", error.message);
  }

  const yt = youtubeId(video.video_url);
  return NextResponse.json(
    yt ? { kind: "youtube", id: yt } : { kind: "drive", src: driveEmbedUrl(video.video_url) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// แจ้งเตือนในเว็บถึงเจ้าของระบบ + ทีมงานที่มีสิทธิ์ดูสมาชิก และส่งอีเมลถึงเจ้าของระบบ (ถ้าตั้งค่า Brevo ไว้)
async function alertAdmins(service: SupabaseClient, who: string, userId: string, count: number, ip: string | null) {
  const owners = adminEmails();
  const [{ data: ownerRows }, { data: staffRows }] = await Promise.all([
    owners.length ? service.from("users").select("id").in("email", owners) : Promise.resolve({ data: [] as { id: string }[] }),
    service.from("users").select("id, roles!inner(permissions)").contains("roles.permissions", ["members"]),
  ]);
  const ids = new Set([...(ownerRows ?? []), ...((staffRows ?? []) as { id: string }[])].map((r) => r.id));
  const title = "⚠️ พบการเปิดบทเรียนถี่ผิดปกติ";
  const message = `${who} เปิดบทเรียนต่างกัน ${count} บทภายใน 1 ชั่วโมง ระบบพักการขอลิงก์ไว้ชั่วคราว — ดูประวัติที่ Admin → สมาชิก`;
  if (ids.size) {
    await service.from("notifications").insert(
      Array.from(ids).map((id) => ({ user_id: id, type: "security", title, message })),
    );
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (apiKey && owners.length) {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_SENDER_EMAIL ?? "no-reply@thushouse.com",
          name: process.env.BREVO_SENDER_NAME ?? "THUS House",
        },
        to: owners.map((email) => ({ email })),
        subject: title,
        htmlContent: `<div style="font-family:sans-serif;line-height:1.7">${escapeHtml(message)}<br>IP: ${escapeHtml(ip ?? "-")}<br><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/members/${userId}">เปิดดูสมาชิก</a></div>`,
      }),
    }).catch(() => {});
  }
}
