import "server-only";

// แจ้งเตือนเข้า Discord ผ่าน Webhook (ตั้งค่า DISCORD_WEBHOOK_URL ใน Vercel)
// ไม่ได้ตั้งค่า = ข้ามเงียบๆ · ส่งไม่สำเร็จไม่ทำให้งานหลักล้ม
export type DiscordKind = "signup" | "payment" | "approved" | "rejected" | "comment" | "message" | "security" | "usage" | "expiring" | "info";

const STYLE: Record<DiscordKind, { color: number; icon: string }> = {
  signup: { color: 0x9195dc, icon: "🆕" },
  payment: { color: 0xec9e56, icon: "💰" },
  approved: { color: 0x46a758, icon: "✅" },
  rejected: { color: 0x8b8d98, icon: "❌" },
  usage: { color: 0xe5484d, icon: "🔴" },
  expiring: { color: 0xf5d90a, icon: "⏰" },
  comment: { color: 0xba94c7, icon: "💬" },
  message: { color: 0xe3a3a8, icon: "✉️" },
  security: { color: 0xe5484d, icon: "🚨" },
  info: { color: 0x6a5c73, icon: "ℹ️" },
};

export async function notifyDiscord(
  kind: DiscordKind,
  title: string,
  fields: Record<string, string | number | null | undefined> = {},
  path?: string,
) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { color, icon } = STYLE[kind];
  const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "THUS House",
        // ไม่ให้ข้อความของผู้ใช้ไป @everyone / @role ได้
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: clip(`${icon} ${title}`, 256),
            url: path && site ? site + path : undefined,
            color,
            fields: Object.entries(fields)
              .filter(([, v]) => v !== null && v !== undefined && v !== "")
              .slice(0, 10)
              .map(([name, value]) => ({ name: clip(name, 256), value: clip(String(value), 1000), inline: String(value).length < 40 })),
            timestamp: new Date().toISOString(),
          },
        ],
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // ไม่ต้องทำอะไร — Discord ล่มไม่ควรทำให้สมาชิกสมัคร/จ่ายเงินไม่ได้
  }
}
