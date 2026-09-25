import "server-only";
import { createPublicKey, verify } from "node:crypto";

// Discord Bot สำหรับ "กดอนุมัติใน Discord" (ต่างจาก Webhook ใน discord.ts ที่ส่งได้ทางเดียว)
// ตั้งค่าใน Vercel: DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, DISCORD_APPROVAL_CHANNEL_ID
// ไม่ได้ตั้งค่า = ใช้ Webhook แจ้งเตือนแบบเดิม
const API = "https://discord.com/api/v10";
const SITE = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";

export function botEnabled() {
  return !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_APPROVAL_CHANNEL_ID);
}

function botFetch(path: string, init: RequestInit = {}) {
  return fetch(API + path, {
    ...init,
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(8000),
  });
}

// ตรวจลายเซ็น Ed25519 ว่าคำขอมาจาก Discord จริง
export function verifyDiscordRequest(body: string, signature: string | null, timestamp: string | null) {
  const key = process.env.DISCORD_PUBLIC_KEY;
  if (!key || !signature || !timestamp || !/^[0-9a-f]{64}$/i.test(key) || !/^[0-9a-f]{128}$/i.test(signature)) return false;
  try {
    const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(key, "hex")]);
    const pub = createPublicKey({ key: spki, format: "der", type: "spki" });
    return verify(null, Buffer.from(timestamp + body), pub, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

type Field = { name: string; value: string; inline?: boolean };
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const fields = (f: Record<string, string | number | null | undefined>): Field[] =>
  Object.entries(f)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([name, value]) => ({ name, value: clip(String(value), 1000), inline: String(value).length < 40 }));

const button = (label: string, style: 1 | 2 | 3 | 4, custom_id: string) => ({ type: 2, style, label, custom_id });
const linkButton = (label: string, path: string) => ({ type: 2, style: 5, label, url: SITE() + path });

// แปลง error จาก Discord เป็นคำอธิบายภาษาไทย + วิธีแก้
export function explainDiscordError(status: number, body: string): string {
  let code = 0;
  try { code = (JSON.parse(body) as { code?: number }).code ?? 0; } catch { /* ไม่ใช่ JSON */ }
  if (status === 401) return "Bot Token ไม่ถูกต้อง (401) — สร้าง Token ใหม่ใน Discord Developer Portal → Bot → Reset Token แล้วใส่ DISCORD_BOT_TOKEN ใน Vercel ใหม่";
  if (code === 10003 || status === 404) return "ไม่พบห้องนี้ (Unknown Channel) — DISCORD_APPROVAL_CHANNEL_ID ผิด: คลิกขวาที่ห้อง → Copy Channel ID (ต้องเปิด Developer Mode ก่อน)";
  if (code === 50001) return "บอทมองไม่เห็นห้องนี้ (Missing Access) — เชิญบอทเข้าเซิร์ฟเวอร์ และถ้าเป็นห้องส่วนตัว ให้เพิ่มบอทในสิทธิ์ของห้อง (View Channel)";
  if (code === 50013) return "บอทขาดสิทธิ์ในห้องนี้ (Missing Permissions) — ให้สิทธิ์ View Channel, Send Messages, Embed Links, Attach Files";
  if (status === 429) return "Discord จำกัดความถี่ (429) ลองใหม่อีกครั้ง";
  return `Discord ตอบ ${status}${code ? ` (code ${code})` : ""}: ${body.slice(0, 200)}`;
}

// ส่งข้อความ + ไฟล์แนบเข้าห้องอนุมัติ · คืน message id หรือเหตุผลที่ส่งไม่ได้
export async function postToApprovalChannel(payload: object, file?: { name: string; type: string; bytes: Uint8Array }): Promise<{ id: string } | { error: string }> {
  const channel = process.env.DISCORD_APPROVAL_CHANNEL_ID;
  const body = { allowed_mentions: { parse: [] }, ...payload };
  try {
    let res: Response;
    if (file) {
      const form = new FormData();
      form.append("payload_json", JSON.stringify({ ...body, attachments: [{ id: 0, filename: file.name }] }));
      form.append("files[0]", new Blob([file.bytes as Uint8Array<ArrayBuffer>], { type: file.type }), file.name);
      res = await botFetch(`/channels/${channel}/messages`, { method: "POST", body: form });
    } else {
      res = await botFetch(`/channels/${channel}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("discord bot post failed", res.status, text);
      return { error: explainDiscordError(res.status, text) };
    }
    return { id: ((await res.json()) as { id: string }).id };
  } catch (err) {
    console.error("discord bot post failed", err);
    return { error: `เชื่อมต่อ Discord ไม่ได้: ${(err as Error).message}` };
  }
}

// สลิปใหม่ → ข้อความพร้อมรูปสลิปและปุ่ม อนุมัติ / ปฏิเสธ
export async function postSlipReview(args: {
  purchaseId: string;
  userId: string;
  member: { name: string | null; nickname: string | null; email: string; phone: string | null; member_code: string | null };
  className: string;
  amount: string;
  discount?: string | null; // เช่น "SAVE10 (ลด 10%) · รหัสยืนยัน D-7K3Q9A · ราคาเต็ม ฿54,900"
  slip: { bytes: Uint8Array; ext: "png" | "jpg" } | null; // null = ยอด 0 บาท (ใช้โค้ดลดเต็มจำนวน)
}) {
  if (!botEnabled()) return { error: "ยังไม่ได้ตั้งค่า Discord Bot" };
  const { member } = args;
  return postToApprovalChannel(
    {
      embeds: [{
        title: "💰 มีสลิปโอนเงินรอตรวจสอบ",
        url: SITE() + "/admin/payments",
        color: 0xec9e56,
        fields: fields({
          สมาชิก: `${member.nickname || member.name || "-"} (${member.email})`,
          ชื่อ: member.name,
          เบอร์: member.phone,
          รหัสสมาชิก: member.member_code,
          คอร์ส: args.className,
          ยอด: args.amount,
          โค้ดส่วนลด: args.discount,
        }),
        footer: { text: "ตรวจยอด/ชื่อบัญชีในสลิปก่อนกดอนุมัติ" },
        timestamp: new Date().toISOString(),
      }],
      components: [{
        type: 1,
        components: [
          button("อนุมัติ", 3, `pa:${args.purchaseId}`),
          button("ปฏิเสธ", 4, `pr:${args.purchaseId}`),
          linkButton("เปิดในเว็บ", `/admin/members/${args.userId}`),
        ],
      }],
    },
    args.slip ? { name: `slip.${args.slip.ext}`, type: args.slip.ext === "png" ? "image/png" : "image/jpeg", bytes: args.slip.bytes } : undefined,
  );
}

// สมัครใหม่แต่ส่งอีเมลยืนยันไม่ได้ → ปุ่มยืนยันอีเมลแทน
export async function postSignupReview(userId: string, info: Record<string, string>) {
  if (!botEnabled()) return { error: "ยังไม่ได้ตั้งค่า Discord Bot" };
  return postToApprovalChannel({
    embeds: [{
      title: "🆕 สมาชิกสมัครใหม่ (รอ Admin ยืนยันอีเมล)",
      url: SITE() + "/admin/members?status=unconfirmed",
      color: 0x9195dc,
      fields: fields(info),
      footer: { text: "ยืนยันแล้วสมาชิกเข้าสู่ระบบได้ทันที" },
      timestamp: new Date().toISOString(),
    }],
    components: [{
      type: 1,
      components: [button("ยืนยันอีเมลแทน", 1, `uc:${userId}`), linkButton("เปิดในเว็บ", `/admin/members/${userId}`)],
    }],
  });
}

const RESULT = {
  approved: { color: 0x46a758, title: "✅ อนุมัติแล้ว" },
  rejected: { color: 0x8b8d98, title: "❌ ปฏิเสธแล้ว" },
  confirmed: { color: 0x46a758, title: "✅ ยืนยันอีเมลแล้ว" },
} as const;

// เปลี่ยนข้อความในห้องอนุมัติเป็นผลลัพธ์ และเอาปุ่มออก (กดซ้ำไม่ได้) — รูปสลิปยังอยู่
export async function closeReviewMessage(
  messageId: string | null | undefined, result: keyof typeof RESULT, extra: [string, string][],
) {
  const channel = process.env.DISCORD_APPROVAL_CHANNEL_ID;
  if (!messageId || !botEnabled()) return;
  try {
    const res = await botFetch(`/channels/${channel}/messages/${messageId}`);
    if (!res.ok) return;
    const msg = (await res.json()) as {
      embeds?: { title?: string; fields?: Field[] }[];
      components?: { type: number; components: { style?: number }[] }[];
    };
    const old = msg.embeds?.[0] ?? {};
    const { color, title } = RESULT[result];
    const embed = {
      ...old,
      title,
      color,
      fields: [...(old.fields ?? []), ...extra.map(([name, value]) => ({ name, value: clip(value, 1000), inline: value.length < 40 }))].slice(0, 25),
      footer: undefined,
    };
    // เก็บเฉพาะปุ่มลิงก์ (เปิดในเว็บ) เอาปุ่มกดออก
    const components = (msg.components ?? [])
      .map((row) => ({ ...row, components: row.components.filter((c) => c.style === 5) }))
      .filter((row) => row.components.length);
    await botFetch(`/channels/${channel}/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed], components, allowed_mentions: { parse: [] } }),
    });
  } catch (err) {
    console.error("discord bot edit failed", err);
  }
}

// ข้อความตอบกลับเฉพาะคนกด (คนอื่นในห้องไม่เห็น) หลังตอบ Discord ไปแล้ว
export async function followUp(applicationId: string, token: string, content: string) {
  try {
    await fetch(`${API}/webhooks/${applicationId}/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, flags: 64, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // ไม่ต้องทำอะไร
  }
}
