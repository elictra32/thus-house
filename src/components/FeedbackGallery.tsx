"use client";
import { useEffect, useState } from "react";
import type { GalleryItem } from "@/types/database";

// รูป Feedback แบบ masonry · กดดูรูปใหญ่ (เลื่อนด้วยลูกศร / ปิดด้วย Esc)
export default function FeedbackGallery({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const n = items.length;

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % n));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + n) % n));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, n]);

  return (
    <>
      <div className="columns-1 gap-5 sm:columns-2 xl:columns-3">
        {items.map((item, i) => (
          <button
            key={item.id}
            onClick={() => setOpen(i)}
            className="mb-5 block w-full overflow-hidden rounded-2xl border border-charcoal/10 bg-white/50 shadow-[0_20px_50px_-30px_#2d183c88] transition hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_#2d183caa]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image_url} alt={item.caption ?? "Feedback จากสมาชิก THUS"} loading="lazy" className="w-full" />
            {item.caption && <p className="px-4 py-3 text-left text-sm text-charcoal/75">{item.caption}</p>}
          </button>
        ))}
      </div>

      {open !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur" onClick={() => setOpen(null)} role="dialog" aria-modal>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={items[open].image_url}
            alt={items[open].caption ?? ""}
            className="max-h-[88vh] max-w-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={() => setOpen(null)} aria-label="ปิด" className="absolute right-5 top-5 text-3xl text-white/80 hover:text-white">✕</button>
          {n > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + n) % n); }} aria-label="ก่อนหน้า" className="absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/15 text-2xl text-white hover:bg-white/30">‹</button>
              <button onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % n); }} aria-label="ถัดไป" className="absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/15 text-2xl text-white hover:bg-white/30">›</button>
            </>
          )}
          <p className="absolute bottom-5 text-xs tracking-[2px] text-white/60">{open + 1} / {n}</p>
        </div>
      )}
    </>
  );
}
