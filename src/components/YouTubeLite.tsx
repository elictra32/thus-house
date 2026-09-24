"use client";
import { useState } from "react";

// แสดงปกคลิปก่อน ผู้ชมกดเล่นเองจึงโหลดตัวเล่น YouTube (เริ่มจากต้นคลิป)
export default function YouTubeLite({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const [thumb, setThumb] = useState(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return (
    <button onClick={() => setPlaying(true)} className="group absolute inset-0 h-full w-full" aria-label={`เล่นวิดีโอ ${title}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumb}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        // บางคลิปไม่มีปกความละเอียดสูง → ใช้ขนาดรองลงมา
        onLoad={(e) => e.currentTarget.naturalWidth <= 120 && setThumb(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
        onError={() => setThumb(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-plum-900/60 via-transparent to-transparent" />
      <span className="absolute left-1/2 top-1/2 flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-plum-900 shadow-[0_10px_40px_#0006] transition group-hover:scale-110">
        <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 fill-current" aria-hidden>
          <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
        </svg>
      </span>
    </button>
  );
}
