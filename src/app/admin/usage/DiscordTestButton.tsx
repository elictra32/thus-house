"use client";
import { useState } from "react";
import Button from "@/components/Button";
import { api } from "@/lib/api-client";

export default function DiscordTestButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      await api.post("/api/admin/discord-test");
      setMsg({ ok: true, text: "✓ ส่งข้อความทดสอบเข้าห้องอนุมัติแล้ว — ไปดูใน Discord ได้เลย" });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" variant="ghost" loading={loading} onClick={run}>ทดสอบปุ่มอนุมัติใน Discord</Button>
      {msg && <span className={`text-xs ${msg.ok ? "text-muted" : "text-red-300"}`}>{msg.text}</span>}
    </div>
  );
}
