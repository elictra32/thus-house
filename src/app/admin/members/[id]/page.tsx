"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Button from "@/components/Button";
import { Select } from "@/components/Input";
import { ConfirmModal } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { PageLoading } from "@/components/LoadingSpinner";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { baht, formatDate } from "@/lib/utils";
import type { Purchase, User } from "@/types/database";

type Detail = {
  user: User;
  purchases: (Purchase & { classes: { id: string; name: string; videos_count: number } | null })[];
  watchedByClass: Record<string, number>;
};

export default function MemberDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, error, loading, setData } = useApi<Detail>(`/api/admin/users/${params.id}`);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  async function setStatus(status: string) {
    setSaving(true);
    setActionError("");
    try {
      const { user } = await api.put<{ user: User }>(`/api/admin/users/${params.id}`, { status });
      setData((d) => (d ? { ...d, user } : d));
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api.del(`/api/admin/users/${params.id}`);
      router.push("/admin/members");
    } catch (err) {
      setActionError((err as Error).message);
      setDeleting(false);
      setConfirm(false);
    }
  }

  if (loading) return <PageLoading />;
  if (error || !data) return <ErrorBox message={error || "ไม่พบสมาชิก"} />;
  const { user, purchases, watchedByClass } = data;

  return (
    <>
      <Link href="/admin/members" className="text-sm text-muted hover:text-ink">← สมาชิกทั้งหมด</Link>
      <PageHeader
        title={user.name || user.email}
        subtitle={user.email}
        action={<Button variant="danger" size="sm" onClick={() => setConfirm(true)}>ลบสมาชิก</Button>}
      />
      {actionError && <div className="mb-4"><ErrorBox message={actionError} /></div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="card h-fit space-y-4 p-5 text-sm">
          <Row label="ชื่อ" value={user.name || "-"} />
          <Row label="อีเมล" value={user.email} />
          <Row label="เบอร์โทร" value={user.phone || "-"} />
          <Row label="สมัครเมื่อ" value={formatDate(user.created_at)} />
          <Row label="เริ่มเป็นสมาชิก" value={formatDate(user.membership_start)} />
          <Row label="เข้าสู่ระบบล่าสุด" value={formatDate(user.last_login_at, true)} />
          <div className="border-t border-line pt-4">
            <p className="mb-2 flex items-center gap-2 text-xs text-muted">สถานะ <StatusBadge status={user.status} /></p>
            <Select name="status" value={user.status} disabled={saving} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">ใช้งาน (active)</option>
              <option value="inactive">ไม่ใช้งาน (inactive)</option>
              <option value="suspended">ระงับ (suspended)</option>
            </Select>
            <p className="mt-2 text-xs text-subtle">inactive / suspended จะเข้าดูวิดีโอไม่ได้ · suspended จะล็อกอินไม่ได้</p>
          </div>
        </div>

        <div className="card overflow-x-auto">
          <h3 className="p-5 font-bold">การซื้อและความคืบหน้า</h3>
          <table className="w-full min-w-[560px]">
            <thead><tr><th className="th">คอร์ส</th><th className="th">ยอด</th><th className="th">วันที่</th><th className="th">สถานะ</th><th className="th">ดูแล้ว</th></tr></thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td className="td">{p.classes?.name ?? "-"}</td>
                  <td className="td">{baht(p.amount)}</td>
                  <td className="td text-muted">{formatDate(p.created_at)}</td>
                  <td className="td"><StatusBadge status={p.status} /></td>
                  <td className="td">
                    {p.status === "approved" && p.classes
                      ? `${watchedByClass[p.class_id] ?? 0} / ${p.classes.videos_count}`
                      : "-"}
                  </td>
                </tr>
              ))}
              {!purchases.length && <tr><td className="td text-muted" colSpan={5}>ยังไม่มีการซื้อ</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        loading={deleting}
        title="ลบสมาชิก"
        message={`ลบ ${user.email} และข้อมูลการซื้อ/ความคืบหน้าทั้งหมดถาวร ย้อนกลับไม่ได้`}
        confirmLabel="ลบถาวร"
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="break-words">{value}</p>
    </div>
  );
}
