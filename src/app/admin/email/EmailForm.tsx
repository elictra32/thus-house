"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Input, { Select, Textarea } from "@/components/Input";
import { ErrorBox } from "@/components/admin/PageHeader";
import { api } from "@/lib/api-client";

type Member = { id: string; name: string | null; email: string };

export default function EmailForm({
  classes,
  roles,
  members,
  brevoReady,
}: {
  classes: { id: string; name: string }[];
  roles: { id: string; name: string }[];
  members: Member[];
  brevoReady: boolean;
}) {
  const router = useRouter();
  const [target, setTarget] = useState("self");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [roleId, setRoleId] = useState(roles.find((r) => r.id === "member")?.id ?? roles[0]?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const found = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return members
      .filter((m) => !picked.includes(m.id) && (m.email.toLowerCase().includes(q) || (m.name ?? "").toLowerCase().includes(q)))
      .slice(0, 8);
  }, [search, members, picked]);
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
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
    if (target === "users" && !picked.length) return setError("กรุณาเลือกสมาชิกอย่างน้อย 1 คน");
    if (!confirm("ยืนยันการส่ง?")) return;
    setLoading(true);
    try {
      const r = await api.post<{ recipients: number; emailed: number }>("/api/admin/email/send-bulk", {
        target, classId, roleId, status, userIds: picked, subject, message, notify,
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
        <option value="self">ส่งทดสอบหาตัวเอง</option>
        <option value="users">เลือกสมาชิกเอง...</option>
        <option value="class">ผู้เรียนของคอร์ส...</option>
        <option value="role">ตาม Role...</option>
        <option value="status">สมาชิกตามสถานะ...</option>
        <option value="all">สมาชิกทุกคน</option>
      </Select>
      {target === "role" && (
        <Select label="Role" name="roleId" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
      )}
      {target === "users" && (
        <div>
          <Input
            label={`เลือกสมาชิก (${picked.length} คน)`}
            name="search"
            placeholder="พิมพ์ชื่อหรืออีเมลเพื่อค้นหา"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {found.length > 0 && (
            <ul className="mt-1 overflow-hidden rounded-xl border border-edge bg-raised">
              {found.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked([...picked, m.id]);
                      setSearch("");
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5"
                  >
                    {m.name || "-"} <span className="text-muted">· {m.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {search.trim() && !found.length && <p className="mt-1 text-xs text-muted">ไม่พบสมาชิก</p>}
          {picked.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {picked.map((id) => (
                <span key={id} className="flex items-center gap-1.5 rounded-full bg-brand/15 py-1 pl-3 pr-1.5 text-xs">
                  {byId.get(id)?.name || byId.get(id)?.email}
                  <button
                    type="button"
                    aria-label="เอาออก"
                    onClick={() => setPicked(picked.filter((p) => p !== id))}
                    className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/10"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
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
