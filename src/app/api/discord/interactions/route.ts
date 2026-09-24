import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceSupabase } from "@/lib/supabase-server";
import { getPermissions, logAdmin } from "@/lib/auth";
import { closeReviewMessage, followUp, verifyDiscordRequest } from "@/lib/discord-bot";
import { approvePurchase, rejectPurchase } from "@/lib/purchase-actions";
import type { Permission } from "@/lib/permissions";

// Discord ส่งการกดปุ่มมาที่นี่ (ตั้งเป็น Interactions Endpoint URL ใน Discord Developer Portal)
// ต้องตอบภายใน 3 วินาที → ตอบ "กำลังทำ" ก่อน แล้วทำงานต่อใน waitUntil
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Interaction = {
  type: number;
  application_id: string;
  token: string;
  member?: { user: { id: string } };
  user?: { id: string };
  message?: { id: string };
  data?: { custom_id?: string; components?: { components: { custom_id: string; value: string }[] }[] };
};

const PONG = 1, MESSAGE = 4, DEFERRED_UPDATE = 6, MODAL = 9;
const ephemeral = (content: string) =>
  NextResponse.json({ type: MESSAGE, data: { content, flags: 64, allowed_mentions: { parse: [] } } });

// หา Admin จาก Discord ID ที่ผูกไว้ (Admin → สมาชิก → Discord ID) และต้องมีสิทธิ์ perm
async function adminFor(service: SupabaseClient, discordId: string | undefined, perm: Permission) {
  if (!discordId) return null;
  const { data: u } = await service.from("users").select("id, email").eq("discord_id", discordId).maybeSingle();
  if (!u) return null;
  const perms = await getPermissions(u.id, u.email);
  return perms.has(perm) ? (u.email as string) : null;
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyDiscordRequest(raw, req.headers.get("x-signature-ed25519"), req.headers.get("x-signature-timestamp"))) {
    return new NextResponse("invalid request signature", { status: 401 });
  }
  const it = JSON.parse(raw) as Interaction;
  if (it.type === 1) return NextResponse.json({ type: PONG });

  const [action, id] = (it.data?.custom_id ?? "").split(":");
  if (!id) return ephemeral("ไม่รู้จักปุ่มนี้");
  const discordId = it.member?.user.id ?? it.user?.id;
  const service = createServiceSupabase();
  const perm: Permission = action === "uc" ? "members" : "payments";
  const email = await adminFor(service, discordId, perm);
  if (!email) {
    return ephemeral(
      `คุณไม่มีสิทธิ์กดปุ่มนี้ — ให้ Head Admin ใส่ Discord ID ของคุณ (\`${discordId ?? "-"}\`) ที่หน้า Admin → สมาชิก → บัญชีของคุณ`,
    );
  }

  const run = (task: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    waitUntil(
      task()
        .then((r) => (r.ok ? undefined : followUp(it.application_id, it.token, `⚠️ ${r.error}`)))
        .catch((err) => {
          console.error(err);
          return followUp(it.application_id, it.token, "⚠️ เกิดข้อผิดพลาด ลองใหม่หรือทำในเว็บแทน");
        }),
    );
    return NextResponse.json({ type: DEFERRED_UPDATE });
  };

  // ปุ่มกด (type 3)
  if (it.type === 3) {
    if (action === "pa") return run(() => approvePurchase(service, id, email, { via: "discord" }));
    if (action === "pr") {
      // เปิดช่องให้พิมพ์เหตุผล — สมาชิกจะเห็นเหตุผลนี้
      return NextResponse.json({
        type: MODAL,
        data: {
          custom_id: `prm:${id}`,
          title: "ปฏิเสธสลิป",
          components: [{
            type: 1,
            components: [{
              type: 4, custom_id: "reason", style: 2, label: "เหตุผล (สมาชิกจะเห็นข้อความนี้)",
              min_length: 1, max_length: 500, required: true, placeholder: "เช่น ยอดเงินไม่ตรง / สลิปไม่ชัด",
            }],
          }],
        },
      });
    }
    if (action === "uc") return run(() => confirmEmail(service, id, email, it.message?.id));
  }

  // กดส่งช่องเหตุผล (type 5)
  if (it.type === 5 && action === "prm") {
    const reason = it.data?.components?.[0]?.components?.[0]?.value?.trim().slice(0, 500);
    if (!reason) return ephemeral("กรุณากรอกเหตุผล");
    return run(() => rejectPurchase(service, id, email, reason, { via: "discord" }));
  }

  return ephemeral("ไม่รู้จักปุ่มนี้");
}

// Admin ยืนยันอีเมลแทนสมาชิก (เหมือนปุ่มในหน้า Admin → สมาชิก)
async function confirmEmail(service: SupabaseClient, userId: string, email: string, messageId?: string) {
  const { data: got } = await service.auth.admin.getUserById(userId);
  if (!got?.user) return { ok: false as const, error: "ไม่พบบัญชีนี้แล้ว" };
  if (got.user.email_confirmed_at) {
    await closeReviewMessage(messageId, "confirmed", [["หมายเหตุ", "ยืนยันไว้ก่อนแล้ว"]]);
    return { ok: true as const };
  }
  const { error } = await service.auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) return { ok: false as const, error: error.message };
  await service.from("notifications").insert({
    user_id: userId,
    type: "account",
    link: "/dashboard",
    title: "บัญชีพร้อมใช้งานแล้ว",
    message: "ทีมงานยืนยันบัญชีของคุณแล้ว เข้าสู่ระบบได้เลย",
  });
  await logAdmin(service, email, "confirm_email", "users", userId, { email: got.user.email, via: "discord" });
  await closeReviewMessage(messageId, "confirmed", [["ยืนยันโดย", `${email} (ผ่าน Discord)`]]);
  return { ok: true as const };
}
