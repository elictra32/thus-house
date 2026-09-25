import { youtubeThumb } from "./utils";
import { num, oneOf, str, url, ValidationError } from "./validate";

// แปลง body → คอลัมน์ที่อนุญาตให้บันทึก (ป้องกันการส่งคอลัมน์อื่นเข้ามา)
function pick(body: Record<string, unknown>, entries: [string, () => unknown][], creating: boolean) {
  const out: Record<string, unknown> = {};
  for (const [key, get] of entries) if (creating || key in body) out[key] = get();
  if (!Object.keys(out).length) throw new ValidationError("ไม่มีข้อมูลที่จะบันทึก");
  return out;
}

export function classFields(b: Record<string, unknown>, creating: boolean) {
  return pick(b, [
    ["name", () => str(b, "name", { required: true, max: 200 })],
    ["description", () => str(b, "description", { max: 5000 })],
    ["instructor", () => str(b, "instructor", { max: 200 })],
    ["category", () => str(b, "category", { max: 50 })],
    ["price", () => num(b, "price", { required: true, min: 0 })],
    ["thumbnail_url", () => url(b, "thumbnail_url")],
    ["access_days", () => {
      const n = num(b, "access_days", { min: 1 });
      return n === null ? null : Math.round(n);
    }],
  ], creating);
}

export function videoFields(b: Record<string, unknown>, creating: boolean) {
  const out = pick(b, [
    ["title", () => str(b, "title", { required: true, max: 300 })],
    ["description", () => str(b, "description", { max: 5000 })],
    ["video_url", () => url(b, "video_url", { required: true })],
    ["duration_seconds", () => Math.round(num(b, "duration_seconds", { min: 0 }) ?? 0)],
  ], creating);
  if (creating) out.class_id = str(b, "class_id", { required: true });
  // ภาพปกบทเรียน = ภาพปกคลิป YouTube (Drive ไม่มี)
  if ("video_url" in out) out.thumbnail_url = youtubeThumb(out.video_url as string);
  return out;
}

export function liveFields(b: Record<string, unknown>, creating: boolean) {
  return pick(b, [
    ["title", () => str(b, "title", { required: true, max: 300 })],
    ["instructor", () => str(b, "instructor", { max: 200 })],
    ["scheduled_date", () => {
      const d = str(b, "scheduled_date", { required: true })!;
      if (Number.isNaN(Date.parse(d))) throw new ValidationError("วันเวลาไม่ถูกต้อง");
      return new Date(d).toISOString();
    }],
    ["zoom_link", () => url(b, "zoom_link")],
    ["discord_link", () => url(b, "discord_link")],
    ["youtube_live_url", () => url(b, "youtube_live_url")],
    ["status", () => oneOf(b, "status", ["upcoming", "live", "ended"] as const) ?? "upcoming"],
  ], creating);
}
