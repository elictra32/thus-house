"use client";
import { useCallback, useEffect, useState } from "react";
import type { GalleryItem } from "@/types/database";

// สไลด์โชว์รูปกิจกรรม Meetup: เลื่อนอัตโนมัติ (หยุดเมื่อชี้เมาส์) · ปุ่มซ้าย/ขวา · รูปย่อด้านล่าง
export default function MeetupSlideshow({ items }: { items: GalleryItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;
  const go = useCallback((i: number) => setIndex(((i % n) + n) % n), [n]);

  useEffect(() => {
    if (paused || n < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % n), 4500);
    return () => clearInterval(t);
  }, [paused, n]);

  if (!n) return null;
  const current = items[index];

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative mx-auto aspect-[4/3] max-w-3xl overflow-hidden rounded-[26px] border border-white/15 bg-plum-900 shadow-[0_40px_100px_-30px_#000c] sm:aspect-[16/10]">
        {items.map((item, i) => (
          <div key={item.id} className={`absolute inset-0 transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`} aria-hidden={i !== index}>
            {/* พื้นหลังเบลอจากรูปเดียวกัน ให้รูปแนวตั้งดูเต็มกรอบ */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image_url} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt={item.caption ?? "THUS Meetup"}
              className={`relative h-full w-full object-contain transition-transform duration-[5000ms] ease-out ${i === index ? "scale-[1.04]" : "scale-100"}`}
            />
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/70 to-transparent p-5 pt-16">
          <p className="text-sm font-semibold text-white/90">{current.caption ?? "THUS Meetup"}</p>
          <p className="shrink-0 text-xs font-bold tracking-[2px] text-white/70">
            {String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </p>
        </div>
        {n > 1 && (
          <>
            <button onClick={() => go(index - 1)} aria-label="รูปก่อนหน้า" className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur transition hover:bg-white/30">‹</button>
            <button onClick={() => go(index + 1)} aria-label="รูปถัดไป" className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur transition hover:bg-white/30">›</button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mx-auto mt-5 flex max-w-3xl justify-center gap-2 overflow-x-auto pb-1">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => go(i)}
              aria-label={`รูปที่ ${i + 1}`}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${i === index ? "border-glow-orange opacity-100" : "border-transparent opacity-50 hover:opacity-90"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image_url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
