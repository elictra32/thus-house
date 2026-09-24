"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { formatDuration } from "@/lib/utils";
import YouTubeLesson from "./YouTubeLesson";
import type { LessonVideo } from "@/types/database";

type Source = { kind: "youtube"; id: string } | { kind: "drive"; src: string };

const THRESHOLD = 0.8;

// YouTube (Unlisted): ใช้ปุ่มควบคุมของเว็บเอง นับเวลาเฉพาะตอนวิดีโอกำลังเล่นจริง
// Google Drive: iframe ข้ามโดเมน อ่านเวลาเล่นจริงหรือรู้ว่ากดหยุดไม่ได้
// จึงนับเวลาที่เปิดบทเรียนนี้ค้างไว้ (เฉพาะตอนแท็บ/หน้าต่างนี้ใช้งานอยู่)
// ทั้งสองแบบ mark ว่าดูแล้วเมื่อถึง 80% ของความยาววิดีโอ
export default function VideoPlayer({
  video,
  watched,
  onWatched,
}: {
  video: LessonVideo;
  watched: boolean;
  onWatched: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  // เต็มจอแบบจำลอง (iPhone ไม่รองรับ Fullscreen API กับ iframe) — ขยายกรอบวิดีโอให้ทับทั้งจอ
  const [pseudoFull, setPseudoFull] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const marked = useRef(watched);
  const target = Math.max(1, Math.floor(video.duration_seconds * THRESHOLD));
  // ขอลิงก์วิดีโอทีละบทจาก API (ตรวจสิทธิ์ + บันทึก + จำกัดจำนวน)
  const [source, setSource] = useState<Source | null>(null);
  const [sourceError, setSourceError] = useState("");
  const ytId = source?.kind === "youtube" ? source.id : null;
  const [isNativeFull, setIsNativeFull] = useState(false);

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
    let cancelled = false;
    api
      .get<Source>(`/api/videos/${video.id}/source`)
      .then((s) => !cancelled && setSource(s))
      .catch((e) => !cancelled && setSourceError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [video.id]);

  useEffect(() => {
    if (source?.kind !== "drive" || watched || !video.duration_seconds) return;
    const t = setInterval(() => {
      // hasFocus() ยังเป็น true เมื่อโฟกัสอยู่ใน iframe วิดีโอ แต่เป็น false เมื่อสลับไปแอป/หน้าต่างอื่น
      if (document.visibilityState === "visible" && document.hasFocus()) setElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [source, watched, video.duration_seconds]);

  useEffect(() => {
    if (!watched && video.duration_seconds && elapsed >= target) markWatched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  useEffect(() => {
    const onChange = () => setIsNativeFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (pseudoFull) setPseudoFull(false);
    else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else enterFullscreen();
  }

  // เต็มจอ: ใช้ Fullscreen API ถ้าเบราว์เซอร์รองรับ (Android / คอม) และพยายามหมุนเป็นแนวนอน
  // ไม่รองรับ (iPhone) → ขยายกรอบทับทั้งหน้าจอแทน · ไม่ถอด iframe ออก วิดีโอจึงเล่นต่อไม่เริ่มใหม่
  async function enterFullscreen() {
    const el = frameRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
    if (!el) return;
    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    if (request) {
      try {
        await request();
        try {
          await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape");
        } catch {}
        return;
      } catch {}
    }
    setPseudoFull(true);
  }

  useEffect(() => {
    if (!pseudoFull) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPseudoFull(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [pseudoFull]);

  const pct = watched ? 100 : Math.min(100, Math.round((elapsed / Math.max(1, video.duration_seconds)) * 100));

  return (
    <div className="rounded-[20px] border border-edge bg-[#1b1422] p-4 shadow-[0_25px_80px_#0008]">
      <div
        ref={frameRef}
        className={
          pseudoFull
            ? "fixed inset-0 z-[100] bg-black"
            : "relative aspect-video overflow-hidden rounded-[14px] bg-gradient-to-br from-[#3a2449] to-[#1d1624] [&:fullscreen]:rounded-none [&:fullscreen]:bg-black"
        }
      >
        {sourceError ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm leading-relaxed text-white/80">
            {sourceError}
          </div>
        ) : !source ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          </div>
        ) : ytId ? (
          <YouTubeLesson
            key={ytId}
            videoId={ytId}
            isFull={pseudoFull || isNativeFull}
            onToggleFullscreen={toggleFullscreen}
            onPlayingSecond={() => !watched && video.duration_seconds && setElapsed((s) => s + 1)}
          />
        ) : (
          <>
            <iframe
              src={source.kind === "drive" ? source.src : undefined}
              title={video.title}
              className="absolute inset-0 h-full w-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
            {/* บังปุ่ม "เปิดในหน้าต่างใหม่" มุมขวาบนของ Drive ไม่ให้กดออกไปที่ลิงก์ Drive ตรงๆ */}
            <div className="absolute right-0 top-0 z-10 h-16 w-16" onContextMenu={(e) => e.preventDefault()} aria-hidden />
          </>
        )}
        {pseudoFull && !ytId && (
          <button
            onClick={() => setPseudoFull(false)}
            aria-label="ออกจากโหมดเต็มจอ"
            className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-lg text-white backdrop-blur"
          >
            ✕
          </button>
        )}
      </div>
      <div className="mt-4">
        <div className="h-[7px] overflow-hidden rounded-full bg-edge">
          <i className="block h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-[#aaa0b3]">
          <span>
            {watched
              ? "✓ ดูบทนี้แล้ว"
              : `${ytId ? "เวลาที่ดูแล้ว" : "เวลาที่เปิดบทเรียน"} ${formatDuration(Math.min(elapsed, video.duration_seconds))} / ${formatDuration(video.duration_seconds)}`}
          </span>
          <div className="flex items-center gap-4">
            {!watched && (
              <button onClick={markWatched} disabled={saving} className="font-semibold text-brand-light hover:underline disabled:opacity-50">
                {saving ? "กำลังบันทึก..." : "ทำเครื่องหมายว่าดูแล้ว ✓"}
              </button>
            )}
            <button
              onClick={enterFullscreen}
              className="flex items-center gap-1.5 rounded-lg border border-edge bg-raised px-3 py-1.5 font-semibold text-ink hover:border-muted/60"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
              เต็มจอ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
