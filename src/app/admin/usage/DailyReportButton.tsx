"use client";
import { useState } from "react";
import Button from "@/components/Button";
import { api } from "@/lib/api-client";

export default function DailyReportButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  async function run() {
    setLoading(true);
    setMsg("");
    try {
      await api.post("/api/admin/daily-report");
      setMsg("✓ ส่งรายงานเข้า Discord แล้ว");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" loading={loading} onClick={run}>ส่งรายงานประจำวันตอนนี้</Button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
