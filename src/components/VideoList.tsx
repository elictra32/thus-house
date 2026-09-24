"use client";
import { cn, formatDuration } from "@/lib/utils";
import type { Video } from "@/types/database";

export default function VideoList({
  videos,
  currentId,
  watched,
  onSelect,
}: {
  videos: Video[];
  currentId: string;
  watched: Set<string>;
  onSelect: (id: string) => void;
}) {
  return (
    <ol className="max-h-[60vh] overflow-y-auto">
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
              <span
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px]",
                  done ? "bg-success text-bg" : "border border-edge text-muted",
                )}
                aria-label={done ? "ดูแล้ว" : "ยังไม่ได้ดู"}
              >
                {done ? "✓" : i + 1}
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
