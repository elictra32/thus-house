"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { Notification } from "@/types/database";

export default function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ notifications: Notification[] }>("/api/notifications")
      .then((d) => setItems(d.notifications))
      .catch(() => {});
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const unread = items.filter((n) => !n.is_read).length;

  async function markRead(id: string) {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await api.post(`/api/notifications/${id}/read`).catch(() => {});
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-[10px] border border-edge bg-raised px-3 py-2 text-sm"
        aria-label={`การแจ้งเตือน ${unread} รายการใหม่`}
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 top-12 z-50 max-h-96 w-80 overflow-y-auto p-2 shadow-2xl">
          {items.length === 0 && <p className="p-4 text-center text-sm text-muted">ยังไม่มีการแจ้งเตือน</p>}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`block w-full rounded-lg p-3 text-left hover:bg-raised ${n.is_read ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-2">
                {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                <div>
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.message && <p className="mt-0.5 text-xs text-muted">{n.message}</p>}
                  <p className="mt-1 text-[11px] text-subtle">{formatDate(n.created_at, true)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
