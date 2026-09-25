export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function baht(n: number | string | null | undefined) {
  return "฿" + Number(n ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? h + ":" : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export function formatDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "Asia/Bangkok",
  });
}

// แปลงลิงก์ Google Drive ทุกรูปแบบเป็นลิงก์ embed (/preview)
export function driveEmbedUrl(url: string) {
  const m = url.match(/\/file\/d\/([\w-]+)/) ?? url.match(/[?&]id=([\w-]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
}

// ดึง video id จากลิงก์ YouTube ทุกรูปแบบ (watch?v= / youtu.be / embed / shorts / live) — ไม่ใช่ YouTube คืน null
export function youtubeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1] ?? null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export const BANK = {
  name: process.env.NEXT_PUBLIC_BANK_NAME ?? "ธนาคารไทยพาณิชย์",
  account: process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "415-188810-1",
  owner: process.env.NEXT_PUBLIC_BANK_OWNER ?? "บริษัท ทัศน์เฮ้าส์ จำกัด",
};

// สิทธิ์เรียนยังใช้ได้: อนุมัติแล้ว และยังไม่หมดอายุ (expires_at ว่าง = ไม่มีวันหมดอายุ)
export function isActivePurchase(p: { status: string; expires_at?: string | null }, now = Date.now()) {
  return p.status === "approved" && (!p.expires_at || new Date(p.expires_at).getTime() > now);
}

export function addDays(days: number, from = new Date()) {
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

// ISO → "YYYY-MM-DD" ตามเวลาไทย (ใช้กับ <input type="date">)
export function toBangkokDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

export const SLIP_TYPES = ["image/png", "image/jpeg"];
export const SLIP_MAX_BYTES = 4 * 1024 * 1024; // Vercel จำกัด request body ~4.5MB

export const STATUS_LABEL: Record<string, string> = {
  pending: "รอตรวจสอบ",
  approved: "อนุมัติแล้ว",
  rejected: "ถูกปฏิเสธ",
  active: "ใช้งาน",
  inactive: "ไม่ใช้งาน",
  suspended: "ระงับ",
  upcoming: "กำลังจะมาถึง",
  live: "กำลังไลฟ์",
  ended: "จบแล้ว",
};

// ภาพปกคลิป YouTube (hqdefault มีทุกคลิป · เป็น 4:3 มีขอบดำ ครอปด้วย object-cover แล้วพอดี 16:9)
export function youtubeThumb(url: string | null | undefined) {
  const id = url ? youtubeId(url) : null;
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
