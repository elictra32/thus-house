import { adminRoute, ok } from "@/lib/admin-route";
import { jsonError } from "@/lib/auth";
import { botEnabled, postToApprovalChannel } from "@/lib/discord-bot";

// ทดสอบ Discord Bot: ส่งข้อความทดสอบเข้าห้องอนุมัติ · ไม่สำเร็จ = บอกเหตุผลและวิธีแก้
export const POST = adminRoute("roles", async (_req, { email }) => {
  if (!botEnabled()) return jsonError("ยังไม่ได้ตั้งค่า DISCORD_BOT_TOKEN / DISCORD_APPROVAL_CHANNEL_ID ใน Vercel");
  if (!process.env.DISCORD_PUBLIC_KEY) return jsonError("ยังไม่ได้ตั้งค่า DISCORD_PUBLIC_KEY ใน Vercel (ต้องใช้ตอนกดปุ่ม)");
  const r = await postToApprovalChannel({
    embeds: [{ title: "✅ ทดสอบ Discord Bot", description: `บอทส่งข้อความเข้าห้องนี้ได้แล้ว (ทดสอบโดย ${email})`, color: 0x46a758, timestamp: new Date().toISOString() }],
  });
  if ("error" in r) return jsonError(r.error, 502);
  return ok();
});
