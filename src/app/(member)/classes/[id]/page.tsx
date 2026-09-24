import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/Button";
import { requirePageUser } from "@/lib/auth";
import { getClassAccess } from "@/lib/class-access";
import { baht } from "@/lib/utils";
import LessonView from "./LessonView";
import type { Class } from "@/types/database";

export default async function ClassPage({ params, searchParams }: { params: { id: string }; searchParams: { v?: string } }) {
  const { supabase, user } = await requirePageUser();
  const { data: cls } = await supabase.from("classes").select("*").eq("id", params.id).maybeSingle<Class>();
  if (!cls) notFound();

  const access = await getClassAccess(supabase, user, cls.id);
  let watched: string[] = [];
  if (access.hasAccess && access.videos.length) {
    const { data } = await supabase
      .from("watched_videos").select("video_id").eq("user_id", user.id)
      .in("video_id", access.videos.map((v) => v.id));
    watched = (data ?? []).map((w) => w.video_id);
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
        <div className="max-w-3xl">
          <div className="kicker">{cls.category || "COURSE"}</div>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">{cls.name}</h1>
          {cls.description && <p className="mt-3 leading-relaxed text-muted">{cls.description}</p>}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
            {cls.instructor && <span>👤 {cls.instructor}</span>}
            <span>▶ {cls.videos_count} บทเรียน</span>
            <span>⏱ {cls.duration_hours} ชั่วโมง</span>
            <span>💳 {baht(cls.price)}</span>
          </div>
        </div>
      </div>

      {access.hasAccess ? (
        access.videos.length ? (
          <LessonView videos={access.videos} initialWatched={watched} initialVideoId={searchParams.v} />
        ) : (
          <div className="card p-10 text-center text-muted">ยังไม่มีวิดีโอในคอร์สนี้</div>
        )
      ) : (
        <div className="card mx-auto max-w-lg p-10 text-center">
          <div className="text-4xl">🔒</div>
          {access.inactive ? (
            <>
              <h2 className="mt-4 text-xl font-bold">บัญชีของคุณไม่ได้อยู่ในสถานะใช้งาน</h2>
              <p className="mt-2 text-sm text-muted">กรุณาติดต่อทีมงาน Thushouse เพื่อเปิดใช้งานบัญชีอีกครั้ง</p>
            </>
          ) : access.pending ? (
            <>
              <h2 className="mt-4 text-xl font-bold">รอตรวจสอบการชำระเงิน</h2>
              <p className="mt-2 text-sm text-muted">ทีมงานกำลังตรวจสอบสลิปของคุณ เมื่ออนุมัติแล้วจะมีการแจ้งเตือน</p>
              <ButtonLink href="/profile" variant="ghost" className="mt-6">ดูสถานะ</ButtonLink>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-xl font-bold">ซื้อคอร์สเพื่อเริ่มเรียน</h2>
              <p className="mt-2 text-sm text-muted">ชำระครั้งเดียว เรียนได้ตลอดชีพ</p>
              <ButtonLink href={`/payment?class=${cls.id}`} className="mt-6">Buy Class · {baht(cls.price)}</ButtonLink>
            </>
          )}
        </div>
      )}
    </div>
  );
}
