"use client";
import { useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import VideoList from "@/components/VideoList";
import type { LessonVideo } from "@/types/database";

export default function LessonView({
  videos,
  initialWatched,
  initialVideoId,
}: {
  videos: LessonVideo[];
  initialWatched: string[];
  initialVideoId?: string;
}) {
  const [watched, setWatched] = useState(() => new Set(initialWatched));
  // เริ่มที่วิดีโอที่ระบุ หรือบทแรกที่ยังไม่ได้ดู (เรียนต่อจากจุดเดิม)
  const [currentId, setCurrentId] = useState(
    () => videos.find((v) => v.id === initialVideoId)?.id ?? videos.find((v) => !initialWatched.includes(v.id))?.id ?? videos[0].id,
  );
  const index = videos.findIndex((v) => v.id === currentId);
  const current = videos[index];
  const next = videos[index + 1];
  const pct = Math.round((watched.size / videos.length) * 100);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <VideoPlayer
          key={current.id}
          video={current}
          watched={watched.has(current.id)}
          onWatched={() => setWatched((s) => new Set(s).add(current.id))}
        />
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted">บทที่ {index + 1} / {videos.length}</p>
            <h2 className="mt-1 text-xl font-bold">{current.title}</h2>
            {current.description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{current.description}</p>}
          </div>
          {next && (
            <button onClick={() => setCurrentId(next.id)} className="rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold hover:bg-brand-dark">
              บทถัดไป →
            </button>
          )}
        </div>
      </div>

      <aside className="card h-fit overflow-hidden lg:sticky lg:top-24">
        <div className="border-b border-line p-4">
          <div className="flex justify-between text-sm">
            <span className="font-bold">เนื้อหาในคอร์ส</span>
            <span className="text-muted">{watched.size}/{videos.length} · {pct}%</span>
          </div>
          <div className="mt-3 h-[7px] overflow-hidden rounded-full bg-edge">
            <i className="block h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <VideoList videos={videos} currentId={currentId} watched={watched} onSelect={setCurrentId} />
      </aside>
    </div>
  );
}
