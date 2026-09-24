"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { Notification } from "@/types/database";

export default function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api.get<{ notifications: Notification[] }>("/api/notifications")
      .then((d) => setItems(d.notifications))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // เช็กแจ้งเตือนใหม่ทุก 60 วินาที และทุกครั้งที่กลับมาที่แท็บนี้
    const t = setInterval(load, 60_000);
    const onFocus = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onFocus);
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onFocus);
      document.removeEventListener("click", close);
    };
  }, [load]);

  const unread = items.filter((n) => !n.is_read).length;

  // กดแจ้งเตือน → อ่านแล้ว + พาไปหน้าที่เกี่ยวข้อง (เช่น คอมเมนต์ที่มีคนตอบ)
  async function openItem(n: Notification) {
    if (!n.is_read) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      api.post(`/api/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }
  async function readAll() {
    setItems((list) => list.map((x) => ({ ...x, is_read: true })));
    await api.post("/api/notifications/read-all").catch(() => {});
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) load();
        }}
        className="relative rounded-[10px] border border-edge bg-raised px-3 py-2 text-sm"
        aria-label={`การแจ้งเตือน ${unread} รายการใหม่`}
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#ec9e56] px-1 text-[11px] font-bold text-[#2d183c] shadow-[0_0_12px_#ec9e5680]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 top-12 z-50 max-h-[28rem] w-80 overflow-y-auto p-2 shadow-2xl">
          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <span className="text-sm font-bold">การแจ้งเตือน</span>
            {unread > 0 && (
              <button onClick={readAll} className="text-xs text-brand-light hover:underline">
                อ่านทั้งหมด
              </button>
            )}
          </div>
          {items.length === 0 && <p className="p-4 text-center text-sm text-muted">ยังไม่มีการแจ้งเตือน</p>}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => openItem(n)}
              className={`block w-full rounded-lg p-3 text-left hover:bg-raised ${n.is_read ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-2">
                {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#ec9e56]" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.message && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.message}</p>}
                  <p className="mt-1 text-[11px] text-subtle">
                    {formatDate(n.created_at, true)}
                    {n.link && <span className="ml-1 text-brand-light">· เปิดดู →</span>}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
