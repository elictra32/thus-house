import Link from "next/link";
import ClassCard from "@/components/ClassCard";
import { ButtonLink } from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import { requirePageUser } from "@/lib/auth";
import { formatDate, isActivePurchase } from "@/lib/utils";
import type { Class, LiveClass, Purchase } from "@/types/database";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const { supabase, user, profile } = await requirePageUser();

  const [{ data: classes }, { data: purchases }, { data: watched }, { data: lives }] = await Promise.all([
    supabase.from("classes").select("*").order("created_at"),
    supabase.from("purchases").select("*").eq("user_id", user.id),
    supabase.from("watched_videos").select("video_id, videos(class_id)").eq("user_id", user.id),
    supabase.from("live_classes").select("*").neq("status", "ended").order("scheduled_date").limit(3),
  ]);

  const all = (classes ?? []) as Class[];
  const buys = (purchases ?? []) as Purchase[];
  const current = buys.filter((p) => isActivePurchase(p));
  const approved = new Set(current.map((p) => p.class_id));
  // เคยซื้อแต่หมดอายุแล้ว → แสดงปุ่มต่ออายุ
  const expired = new Set(buys.filter((p) => p.status === "approved" && !approved.has(p.class_id)).map((p) => p.class_id));
  // วันหมดอายุของแต่ละคอร์ส (ไม่มีใน map = ไม่หมดอายุ)
  const expiresOf = new Map<string, string>();
  for (const p of current) {
    if (!p.expires_at) continue;
    if (current.some((q) => q.class_id === p.class_id && !q.expires_at)) continue;
    const prev = expiresOf.get(p.class_id);
    if (!prev || p.expires_at > prev) expiresOf.set(p.class_id, p.expires_at);
  }
  const pending = new Set(buys.filter((p) => p.status === "pending").map((p) => p.class_id));

  const watchedByClass = new Map<string, number>();
  for (const w of (watched ?? []) as unknown as { videos: { class_id: string } | null }[]) {
    const id = w.videos?.class_id;
    if (id) watchedByClass.set(id, (watchedByClass.get(id) ?? 0) + 1);
  }
  const progressOf = (c: Class) =>
    c.videos_count ? Math.min(100, Math.round(((watchedByClass.get(c.id) ?? 0) / c.videos_count) * 100)) : 0;

  const mine = all.filter((c) => approved.has(c.id));
  const available = all.filter((c) => !approved.has(c.id));
  const name = profile?.nickname || profile?.name || user.email?.split("@")[0];

  return (
    <div className="space-y-14">
      <div>
        <div className="kicker">DASHBOARD</div>
        <h1 className="mt-2 text-4xl font-bold">สวัสดี, {name} 👋</h1>
        <p className="mt-2 text-muted">พร้อมเรียนต่อหรือยัง? นี่คือความคืบหน้าของคุณ</p>
      </div>

      {profile && profile.status !== "active" && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-200">
          บัญชีของคุณไม่ได้อยู่ในสถานะใช้งาน จึงยังเข้าเรียนไม่ได้ — กรุณาติดต่อทีมงาน
        </div>
      )}

      {pending.size > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-amber-200">
          มีสลิป {pending.size} รายการรอทีมงานตรวจสอบ — ดูสถานะได้ที่{" "}
          <Link href="/profile" className="underline">โปรไฟล์</Link>
        </div>
      )}

      <section>
        <h2 className="mb-5 text-2xl font-bold">My Classes</h2>
        {mine.length === 0 ? (
          <div className="card p-8 text-center text-muted">
            ยังไม่มีคอร์สที่ลงทะเบียน — เลือกคอร์สด้านล่างเพื่อเริ่มเรียน
          </div>
        ) : (
          <div className="grid gap-[18px] md:grid-cols-3">
            {mine.map((c, i) => (
              <ClassCard
                key={c.id}
                cls={c}
                index={i}
                href={`/classes/${c.id}`}
                progress={progressOf(c)}
                action={
                  <>
                    <ButtonLink href={`/classes/${c.id}`} className="w-full">Continue Learning →</ButtonLink>
                    {expiresOf.has(c.id) && (
                      <p className="mt-2 text-center text-xs text-subtle">เรียนได้ถึง {formatDate(expiresOf.get(c.id))}</p>
                    )}
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      {lives && lives.length > 0 && (
        <section>
          <h2 className="mb-5 text-2xl font-bold">Live Classes</h2>
          <div className="grid gap-3">
            {(lives as LiveClass[]).map((l) => (
              <div key={l.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={l.status} />
                    <h3 className="font-bold">{l.title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(l.scheduled_date, true)} {l.instructor && `· ${l.instructor}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {l.zoom_link && <a href={l.zoom_link} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-edge bg-raised px-3 py-2 text-xs font-bold">Zoom</a>}
                  {l.discord_link && <a href={l.discord_link} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-edge bg-raised px-3 py-2 text-xs font-bold">Discord</a>}
                  {l.youtube_live_url && <a href={l.youtube_live_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-edge bg-raised px-3 py-2 text-xs font-bold">YouTube</a>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {available.length > 0 && (
        <section>
          <h2 className="mb-5 text-2xl font-bold">Available Classes</h2>
          <div className="grid gap-[18px] md:grid-cols-3">
            {available.map((c, i) => (
              <ClassCard
                key={c.id}
                cls={c}
                index={i + 1}
                href={`/classes/${c.id}`}
                action={
                  pending.has(c.id) ? (
                    <div className="rounded-[10px] border border-warning/30 bg-warning/10 py-2.5 text-center text-sm text-amber-200">
                      รอตรวจสอบการชำระเงิน
                    </div>
                  ) : (
                    <ButtonLink href={`/payment?class=${c.id}`} variant="ghost" className="w-full">
                      {expired.has(c.id) ? "หมดอายุแล้ว · ต่ออายุ" : "Buy Class"}
                    </ButtonLink>
                  )
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
