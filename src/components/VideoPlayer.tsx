"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { driveEmbedUrl, formatDuration } from "@/lib/utils";
import type { Video } from "@/types/database";

const THRESHOLD = 0.8;

// Google Drive player เป็น iframe ข้ามโดเมน อ่านเวลาเล่นจริงหรือรู้ว่ากดหยุดไม่ได้
// จึงนับเวลาที่เปิดบทเรียนนี้ค้างไว้ (เฉพาะตอนแท็บ/หน้าต่างนี้ใช้งานอยู่) แล้ว mark ว่าดูแล้วเมื่อถึง 80% ของความยาววิดีโอ
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
      // hasFocus() ยังเป็น true เมื่อโฟกัสอยู่ใน iframe วิดีโอ แต่เป็น false เมื่อสลับไปแอป/หน้าต่างอื่น
      if (document.visibilityState === "visible" && document.hasFocus()) setElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [watched, video.duration_seconds]);

  useEffect(() => {
    if (!watched && video.duration_seconds && elapsed >= target) markWatched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  const pct = watched ? 100 : Math.min(100, Math.round((elapsed / Math.max(1, video.duration_seconds)) * 100));

  return (
    <div className="rounded-[20px] border border-edge bg-[#1b1422] p-4 shadow-[0_25px_80px_#0008]">
      <div className="relative aspect-video overflow-hidden rounded-[14px] bg-gradient-to-br from-[#3a2449] to-[#1d1624]">
        <iframe
          src={driveEmbedUrl(video.video_url)}
          title={video.title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
        {/* บังปุ่ม "เปิดในหน้าต่างใหม่" มุมขวาบนของ Drive ไม่ให้กดออกไปที่ลิงก์ Drive ตรงๆ */}
        <div className="absolute right-0 top-0 z-10 h-16 w-16" onContextMenu={(e) => e.preventDefault()} aria-hidden />
      </div>
      <div className="mt-4">
        <div className="h-[7px] overflow-hidden rounded-full bg-edge">
          <i className="block h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-[#aaa0b3]">
          <span>
            {watched
              ? "✓ ดูบทนี้แล้ว"
              : `เวลาที่เปิดบทเรียน ${formatDuration(Math.min(elapsed, video.duration_seconds))} / ${formatDuration(video.duration_seconds)}`}
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
