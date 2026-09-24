"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Input, { Select, Textarea } from "@/components/Input";
import { ErrorBox } from "@/components/admin/PageHeader";
import { api } from "@/lib/api-client";

export default function EmailForm({ classes, brevoReady }: { classes: { id: string; name: string }[]; brevoReady: boolean }) {
  const router = useRouter();
  const [target, setTarget] = useState("all");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [status, setStatus] = useState("active");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [notify, setNotify] = useState(!brevoReady);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult("");
    if (!subject.trim() || !message.trim()) return setError("กรุณากรอกหัวข้อและข้อความ");
    if (!confirm("ยืนยันการส่ง?")) return;
    setLoading(true);
    try {
      const r = await api.post<{ recipients: number; emailed: number }>("/api/admin/email/send-bulk", {
        target, classId, status, subject, message, notify,
      });
      setResult(`ส่งถึง ${r.recipients} คนแล้ว${r.emailed ? ` (อีเมล ${r.emailed})` : ""}`);
      setSubject("");
      setMessage("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={send} className="card space-y-4 p-6">
      {!brevoReady && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-amber-200">
          ยังไม่ได้ตั้งค่า BREVO_API_KEY — ตอนนี้ส่งได้เฉพาะการแจ้งเตือนในเว็บ
        </p>
      )}
      <Select label="ผู้รับ" name="target" value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="all">สมาชิกทุกคน</option>
        <option value="class">ผู้เรียนของคอร์ส...</option>
        <option value="status">สมาชิกตามสถานะ...</option>
      </Select>
      {target === "class" && (
        <Select label="คอร์ส" name="classId" value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      )}
      {target === "status" && (
        <Select label="สถานะ" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">ใช้งาน</option>
          <option value="inactive">ไม่ใช้งาน</option>
          <option value="suspended">ระงับ</option>
        </Select>
      )}
      <Input label="หัวข้อ" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <Textarea label="ข้อความ" name="message" rows={8} value={message} onChange={(e) => setMessage(e.target.value)} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-brand" />
        ส่งเป็นการแจ้งเตือนในเว็บด้วย (🔔)
      </label>
      {error && <ErrorBox message={error} />}
      {result && <p className="rounded-lg bg-success/15 p-3 text-sm text-green-300">{result}</p>}
      <Button type="submit" loading={loading} className="w-full">ส่ง</Button>
    </form>
  );
}
