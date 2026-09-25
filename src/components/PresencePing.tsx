"use client";
import { useEffect } from "react";

// ส่งสัญญาณ "ยังออนไลน์" ทุก 60 วิ เฉพาะตอนแท็บเปิดอยู่ (สลับไปแท็บอื่น = ไม่นับเวลา)
export default function PresencePing() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState === "visible") fetch("/api/presence", { method: "POST", keepalive: true }).catch(() => {});
    };
    ping();
    const t = setInterval(ping, 60_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
  return null;
}
