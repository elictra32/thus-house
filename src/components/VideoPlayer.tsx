"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { driveEmbedUrl, formatDuration } from "@/lib/utils";
import type { Video } from "@/types/database";

const THRESHOLD = 0.8;

// Google Drive player เป็น iframe ข้ามโดเมน อ่านเวลาเล่นจริงไม่ได้
// จึงนับเวลาที่เปิดบทเรียนนี้ค้างไว้ (เฉพาะตอนแท็บเปิดอยู่) แล้ว mark ว่าดูแล้วเมื่อถึง 80% ของความยาววิดีโอ
export default function VideoPlayer({
  video,
  watched,
  onWatched,
}: {
  video: Video;
  watched: boolean;
  onWatched: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const marked = useRef(watched);
  const target = Math.max(1, Math.floor(video.duration_seconds * THRESHOLD));

  async function markWatched() {
    if (marked.current) return;
    marked.current = true;
    setSaving(true);
    try {
      await api.post(`/api/watched/${video.id}`);
      onWatched();
    } catch {
      marked.current = false;
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (watched || !video.duration_seconds) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [watched, video.duration_seconds]);

  useEffect(() => {
    if (!watched && video.duration_seconds && elapsed >= target) markWatched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  const pct = watched ? 100 : Math.min(100, Math.round((elapsed / Math.max(1, video.duration_seconds)) * 100));

  return (
    <div className="rounded-[20px] border border-edge bg-[#13161d] p-4 shadow-[0_25px_80px_#0008]">
      <div className="relative aspect-video overflow-hidden rounded-[14px] bg-gradient-to-br from-[#251943] to-[#171a24]">
        <iframe
          src={driveEmbedUrl(video.video_url)}
          title={video.title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>
      <div className="mt-4">
        <div className="h-[7px] overflow-hidden rounded-full bg-edge">
          <i className="block h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-[#8e94a3]">
          <span>
            {watched
              ? "✓ ดูบทนี้แล้ว"
              : `${formatDuration(Math.min(elapsed, video.duration_seconds))} / ${formatDuration(video.duration_seconds)}`}
          </span>
          {!watched && (
            <button onClick={markWatched} disabled={saving} className="font-semibold text-brand-light hover:underline disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : "ทำเครื่องหมายว่าดูแล้ว ✓"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
