"use client";
import { useState } from "react";
import Button from "@/components/Button";
import { api } from "@/lib/api-client";

export default function BackupButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  async function run() {
    setLoading(true);
    setMsg("");
    try {
      const r = await api.post<{ bytes: number }>("/api/admin/backup");
      setMsg(`✓ ส่งไฟล์สำรอง ${(r.bytes / 1024).toFixed(0)} KB เข้า Discord แล้ว`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" loading={loading} onClick={run}>สำรองข้อมูลตอนนี้</Button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
