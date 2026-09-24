import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { videoAccess } from "@/lib/community";

// กดไลก์ / เลิกไลก์บทเรียน
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;
  const { video, ok, service } = await videoAccess(auth.supabase, auth.user, params.id);
  if (!video) return jsonError("ไม่พบวิดีโอ", 404);
  if (!ok) return jsonError("ไม่มีสิทธิ์เข้าถึงคอร์สนี้", 403);

  const key = { video_id: video.id, user_id: auth.user.id };
  const { data: existing } = await service.from("video_likes").select("video_id").match(key).maybeSingle();
  if (existing) await service.from("video_likes").delete().match(key);
  else await service.from("video_likes").insert(key);
  const { count } = await service.from("video_likes").select("user_id", { count: "exact", head: true }).eq("video_id", video.id);
  return NextResponse.json({ liked: !existing, likes: count ?? 0 });
}
