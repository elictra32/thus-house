import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getClassAccess } from "@/lib/class-access";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.res;

  const access = await getClassAccess(auth.supabase, auth.user, params.id);
  if (!access.hasAccess) {
    return NextResponse.json({ hasAccess: false, pending: access.pending, videos: [], watched: [] }, { status: 403 });
  }
  const { data: watched } = await auth.supabase
    .from("watched_videos")
    .select("video_id")
    .eq("user_id", auth.user.id)
    .in("video_id", access.videos.map((v) => v.id));

  return NextResponse.json({ hasAccess: true, videos: access.videos, watched: (watched ?? []).map((w) => w.video_id) });
}
