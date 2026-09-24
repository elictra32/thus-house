"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/utils";

// YouTube (Unlisted) สำหรับบทเรียน — ซ่อน UI ของ YouTube ทั้งหมดแล้วใช้ปุ่มควบคุมของเว็บเอง
// ชั้นบังโปร่งใสทับ iframe ตลอด จึงกดชื่อคลิป / โลโก้ / "ดูบน YouTube" / คลิปแนะนำ ออกไป YouTube ไม่ได้
// และรู้สถานะเล่น/หยุดจริงจาก IFrame API → นับเวลาเรียนเฉพาะตอนวิดีโอกำลังเล่น

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setPlaybackRate(r: number): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      host?: string;
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYING = 1;
const ENDED = 0;
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT!);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

export default function YouTubeLesson({
  videoId,
  isFull,
  onToggleFullscreen,
  onPlayingSecond,
}: {
  videoId: string;
  isFull: boolean;
  onToggleFullscreen: () => void;
  onPlayingSecond: () => void; // เรียกทุก 1 วินาทีที่วิดีโอกำลังเล่นจริง
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  // บางเครื่อง (เช่น iPhone) ไม่ยอมให้สั่งเล่นจากปุ่มของเว็บในครั้งแรก → เปิดช่องกลางให้แตะปุ่มเล่นของ YouTube เอง
  const [nativeStart, setNativeStart] = useState(false);
  const startedRef = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const tickRef = useRef(onPlayingSecond);
  tickRef.current = onPlayingSecond;

  useEffect(() => {
    let cancelled = false;
    const holder = document.createElement("div");
    mountRef.current?.appendChild(holder);
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      player.current = new YT.Player(holder, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1,
          cc_load_policy: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            setReady(true);
            setDuration(player.current?.getDuration() ?? 0);
          },
          onStateChange: (e) => {
            setPlaying(e.data === PLAYING);
            setEnded(e.data === ENDED);
            if (e.data === PLAYING) {
              startedRef.current = true;
              setStarted(true);
              setDuration(player.current?.getDuration() ?? 0);
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
      holder.remove();
    };
  }, [videoId]);

  // อัปเดตเวลา + นับเวลาเรียนเฉพาะตอนกำลังเล่นและหน้านี้เปิดอยู่
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setTime(player.current?.getCurrentTime() ?? 0);
      if (document.visibilityState === "visible") tickRef.current();
    }, 1000);
    return () => clearInterval(t);
  }, [playing]);

  const poke = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 2800);
  }, []);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const toggle = () => {
    const p = player.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else {
      if (ended) p.seekTo(0, true);
      p.playVideo();
      if (!startedRef.current) setTimeout(() => !startedRef.current && setNativeStart(true), 1500);
    }
    poke();
  };
  const seek = (s: number) => {
    const t = Math.max(0, Math.min(duration || s, s));
    player.current?.seekTo(t, true);
    setTime(t);
    poke();
  };
  const changeSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    player.current?.setPlaybackRate(next);
    setSpeed(next);
  };
  const toggleMute = () => {
    const p = player.current;
    if (!p) return;
    if (p.isMuted()) p.unMute();
    else p.mute();
    setMuted(!muted);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      toggle();
    } else if (e.key === "ArrowRight") seek(time + 10);
    else if (e.key === "ArrowLeft") seek(time - 10);
  };

  const controlsVisible = !playing || showControls;

  return (
    <div
      className="absolute inset-0 select-none outline-none"
      tabIndex={0}
      onKeyDown={onKey}
      onMouseMove={poke}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={mountRef} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />

      {nativeStart && !started ? (
        <>
          {/* บังขอบบน/ล่าง (ชื่อคลิป, โลโก้) — เหลือช่องกลางให้แตะปุ่มเล่นของ YouTube */}
          <div className="absolute inset-x-0 top-0 z-10 h-[28%] bg-[#140e19]" />
          <div className="absolute inset-x-0 bottom-0 z-10 flex h-[28%] items-end justify-center bg-[#140e19] pb-3 text-xs text-white/70">
            แตะปุ่มเล่นตรงกลางอีกครั้ง
          </div>
          <div className="absolute inset-y-0 left-0 z-10 w-[30%] bg-[#140e19]" />
          <div className="absolute inset-y-0 right-0 z-10 w-[30%] bg-[#140e19]" />
        </>
      ) : (
      /* ชั้นบัง iframe ทั้งหมด — กดตรงไหนก็เล่น/หยุด ไม่มีทางกดลิงก์ของ YouTube */
      <button
        type="button"
        aria-label={playing ? "หยุด" : "เล่น"}
        onClick={toggle}
        className={`absolute inset-0 z-10 flex items-center justify-center transition ${
          !started || ended ? "bg-[#140e19]" : playing ? "bg-transparent" : "bg-black/35"
        } ${playing && !showControls ? "cursor-none" : "cursor-pointer"}`}
      >
        {(!playing || !started) && (
          <span className="flex h-12 w-12 -translate-y-4 items-center justify-center rounded-full bg-white/90 text-[#2d183c] sm:h-16 sm:w-16 sm:translate-y-0 shadow-[0_10px_40px_#0008] md:h-20 md:w-20">
            {!ready ? (
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#2d183c]/30 border-t-[#2d183c]" />
            ) : ended ? (
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 sm:h-8 sm:w-8" fill="currentColor" aria-hidden>
                <path d="M7 4.5v15l13-7.5z" />
              </svg>
            )}
          </span>
        )}
      </button>
      )}

      {/* แถบควบคุม */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2.5 pb-1.5 pt-6 text-white sm:px-3 sm:pb-2.5 sm:pt-8 transition-opacity md:px-4 ${
          controlsVisible && started ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.floor(duration))}
          step={1}
          value={Math.floor(time)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="เลื่อนเวลา"
          className="block h-1.5 w-full cursor-pointer accent-[#c9a8e0]"
        />
        <div className="mt-1.5 flex items-center gap-2 text-sm sm:mt-2 sm:gap-3 md:gap-4">
          <button type="button" onClick={toggle} aria-label={playing ? "หยุด" : "เล่น"} className="p-1">
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5z" /></svg>
            )}
          </button>
          <button type="button" onClick={() => seek(time - 10)} aria-label="ย้อน 10 วินาที" className="hidden px-1 text-xs font-bold sm:inline">
            -10
          </button>
          <button type="button" onClick={() => seek(time + 10)} aria-label="ข้าม 10 วินาที" className="hidden px-1 text-xs font-bold sm:inline">
            +10
          </button>
          <span className="whitespace-nowrap tabular-nums text-[11px] text-white/80 sm:text-xs">
            {formatDuration(Math.floor(time))} / {formatDuration(Math.floor(duration))}
          </span>
          <div className="ml-auto flex items-center gap-2 sm:gap-3 md:gap-4">
            <button type="button" onClick={changeSpeed} aria-label="ความเร็ว" className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-bold">
              {speed}x
            </button>
            <button type="button" onClick={toggleMute} aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"} className="p-1">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
                {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
              </svg>
            </button>
            <button type="button" onClick={onToggleFullscreen} aria-label={isFull ? "ออกจากเต็มจอ" : "เต็มจอ"} className="p-1">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                {isFull ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
