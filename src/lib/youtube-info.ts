import "server-only";

export type YoutubeInfo = { title: string; description: string; durationSeconds: number | null };

// ISO 8601 duration (PT1H2M3S) → วินาที
export function isoDurationSeconds(iso: string) {
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const [, d, h, mi, s] = m.map((x) => Number(x) || 0);
  return d * 86400 + h * 3600 + mi * 60 + s;
}

// ตัด JSON ก้อนที่ขึ้นต้นหลัง marker ออกจาก HTML (นับวงเล็บปีกกา ข้ามข้อความในเครื่องหมายคำพูด)
export function extractJson(html: string, marker: string): unknown {
  const at = html.indexOf(marker);
  if (at < 0) return null;
  const start = html.indexOf("{", at + marker.length);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

// ข้อมูลคลิป: ชื่อ / คำอธิบาย / ความยาว
// 1) มี YOUTUBE_API_KEY → YouTube Data API (แม่นสุด)  2) ไม่มี → อ่านจากหน้า watch  3) สุดท้าย oEmbed (ได้แค่ชื่อ)
export async function youtubeInfo(id: string): Promise<YoutubeInfo | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    try {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${key}`, { cache: "no-store" });
      const j = (await r.json()) as { items?: { snippet: { title: string; description: string }; contentDetails: { duration: string } }[] };
      const v = j.items?.[0];
      if (v) return { title: v.snippet.title, description: v.snippet.description, durationSeconds: isoDurationSeconds(v.contentDetails.duration) };
    } catch (err) {
      console.error("youtube api failed", err);
    }
  }
  try {
    const r = await fetch(`https://www.youtube.com/watch?v=${id}&hl=th`, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "th,en;q=0.8",
        Cookie: "CONSENT=YES+1; SOCS=CAI",
      },
    });
    const player = extractJson(await r.text(), "ytInitialPlayerResponse") as
      | { videoDetails?: { title?: string; shortDescription?: string; lengthSeconds?: string } }
      | null;
    const v = player?.videoDetails;
    if (v?.title) return { title: v.title, description: v.shortDescription ?? "", durationSeconds: v.lengthSeconds ? Number(v.lengthSeconds) : null };
  } catch (err) {
    console.error("youtube watch page failed", err);
  }
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`, { cache: "no-store" });
    if (r.ok) {
      const j = (await r.json()) as { title?: string };
      if (j.title) return { title: j.title, description: "", durationSeconds: null };
    }
  } catch (err) {
    console.error("youtube oembed failed", err);
  }
  return null;
}
