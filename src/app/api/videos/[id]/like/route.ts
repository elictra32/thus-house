import { NextResponse } from "next/server";
import { requireApiUser, jsonError } from "@/lib/auth";
import { publicPerson, videoAccess } from "@/lib/community";

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
  const { data: rows } = await service
    .from("video_likes").select("user_id, created_at").eq("video_id", video.id).order("created_at", { ascending: false });
  const ids = (rows ?? []).map((r) => r.user_id);
  const { data: people } = ids.length
    ? await service.from("users").select("id, nickname, name, email, member_code, avatar_url").in("id", ids)
    : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  return NextResponse.json({
    liked: !existing,
    likes: ids.length,
    likers: ids.map((uid) => ({ ...publicPerson(byId.get(uid) ?? null), me: uid === auth.user.id })),
  });
}
