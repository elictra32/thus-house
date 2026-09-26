"use client";
import { cn, formatDuration } from "@/lib/utils";
import type { LessonVideo } from "@/types/database";

export default function VideoList({
  videos,
  currentId,
  watched,
  onSelect,
}: {
  videos: LessonVideo[];
  currentId: string;
  watched: Set<string>;
  onSelect: (id: string) => void;
}) {
  return (
    <ol className="max-h-[45vh] overflow-y-auto lg:max-h-[60vh]">
      {videos.map((v, i) => {
        const active = v.id === currentId;
        const done = watched.has(v.id);
        return (
          <li key={v.id}>
            <button
              onClick={() => onSelect(v.id)}
              className={cn(
                "flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left text-sm transition hover:bg-raised",
                active ? "border-brand bg-brand/10" : "border-transparent",
              )}
            >
              {/* ภาพปกคลิป + เลขบท / ✓ ดูแล้ว */}
              <span className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-raised">
                {v.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
                <span
                  className={cn(
                    "absolute left-1 top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold",
                    done ? "bg-success text-bg" : "bg-black/70 text-white",
                  )}
                  aria-label={done ? "ดูแล้ว" : "ยังไม่ได้ดู"}
                >
                  {done ? "✓" : i + 1}
                </span>
              </span>
              <span className="flex-1">
                <span className={cn("block", active && "font-semibold")}>{v.title}</span>
                <span className="text-xs text-subtle">{formatDuration(v.duration_seconds)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
