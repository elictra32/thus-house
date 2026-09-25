import { adminRoute, ok } from "@/lib/admin-route";
import { jsonError } from "@/lib/auth";
import { youtubeId } from "@/lib/utils";
import { youtubeInfo } from "@/lib/youtube-info";

// วางลิงก์ YouTube ตอนเพิ่มบทเรียน → ดึงชื่อคลิป / คำอธิบาย / ความยาวมาให้
export const GET = adminRoute("classes", async (req) => {
  const id = youtubeId(new URL(req.url).searchParams.get("url") ?? "");
  if (!id) return jsonError("ไม่ใช่ลิงก์ YouTube");
  const info = await youtubeInfo(id);
  if (!info) return jsonError("ดึงข้อมูลคลิปไม่ได้ (คลิปเป็น Private หรือถูกลบ?) — กรอกเองได้เลย", 404);
  return ok(info);
});
