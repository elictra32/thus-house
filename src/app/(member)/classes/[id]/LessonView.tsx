"use client";
import { useEffect, useRef, useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import VideoList from "@/components/VideoList";
import LessonComments from "@/components/LessonComments";
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
  useEffect(() => {
    if (initialVideoId && videos.some((v) => v.id === initialVideoId)) setCurrentId(initialVideoId);
  }, [initialVideoId, videos]);
  const index = videos.findIndex((v) => v.id === currentId);
  const current = videos[index];
  const next = videos[index + 1];
  const pct = Math.round((watched.size / videos.length) * 100);
  // เปลี่ยนบท (จากรายการ / ปุ่มบทถัดไป / ป้าย "จากคลิป" ในคอมเมนต์) → เลื่อนกลับไปที่วิดีโอ
  const topRef = useRef<HTMLDivElement>(null);
  function open(id: string) {
    setCurrentId(id);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    // มือถือ: วิดีโอ → รายการบทเรียน → คอมเมนต์ (เห็นทันทีว่ามีกี่บท ไม่ต้องเลื่อนผ่านคอมเมนต์)
    // จอคอม: ซ้าย = วิดีโอ + คอมเมนต์ · ขวา = รายการบทเรียน (ติดจอ)
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div ref={topRef} className="min-w-0 scroll-mt-24">
        {/* key ต้องไม่ซ้ำกันระหว่าง element พี่น้อง — ถ้าซ้ำ React จะไม่ถอดตัวเก่าออก (วิดีโอ/คอมเมนต์ซ้อนกัน) */}
        <VideoPlayer
          key={`player-${current.id}`}
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
            <button onClick={() => open(next.id)} className="rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold hover:bg-brand-dark">
              บทถัดไป →
            </button>
          )}
        </div>
      </div>

      <aside className="card h-fit overflow-hidden lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <div className="border-b border-line p-4">
          <div className="flex justify-between text-sm">
            <span className="font-bold">เนื้อหาในคอร์ส</span>
            <span className="text-muted">{watched.size}/{videos.length} · {pct}%</span>
          </div>
          <div className="mt-3 h-[7px] overflow-hidden rounded-full bg-edge">
            <i className="block h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <VideoList videos={videos} currentId={currentId} watched={watched} onSelect={open} />
      </aside>

      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        <LessonComments key={`comments-${current.id}`} videoId={current.id} onOpenLesson={open} />
      </div>
    </div>
  );
}
