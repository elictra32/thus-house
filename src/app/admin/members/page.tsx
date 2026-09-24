"use client";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import { api } from "@/lib/api-client";
import Link from "next/link";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Input, { Select } from "@/components/Input";
import StatusBadge from "@/components/StatusBadge";
import { PageLoading } from "@/components/LoadingSpinner";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/utils";
import type { User } from "@/types/database";

type Row = User & { email_confirmed: boolean };

export default function MembersPage({ searchParams }: { searchParams: { status?: string } }) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.status ?? "");
  const [confirming, setConfirming] = useState("");
  const [page, setPage] = useState(1);

  // หน่วงการค้นหา 300ms ระหว่างพิมพ์
  useEffect(() => {
    const t = setTimeout(() => { setSearch(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ page: String(page), ...(search && { q: search }), ...(status && { status }) });
  const { data, error, loading, reload } = useApi<{ users: Row[]; total: number; pageSize: number; unconfirmedCount: number }>(
    `/api/admin/users?${params}`,
  );

  async function confirmEmail(id: string) {
    setConfirming(id);
    try {
      await api.post(`/api/admin/users/${id}/confirm-email`);
      reload();
    } finally {
      setConfirming("");
    }
  }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader title="สมาชิก" subtitle={data ? `ทั้งหมด ${data.total} คน` : undefined} />
      <div className="mb-5 flex flex-wrap gap-3">
        <Input name="q" placeholder="ค้นหาชื่อ อีเมล เบอร์โทร..." value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-80" />
        <Select name="status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-44">
          <option value="">ทุกสถานะ</option>
          <option value="active">ใช้งาน</option>
          <option value="inactive">ไม่ใช้งาน</option>
          <option value="suspended">ระงับ</option>
          <option value="unconfirmed">รอยืนยันอีเมล</option>
        </Select>
      </div>
      {!!data?.unconfirmedCount && status !== "unconfirmed" && (
        <button
          onClick={() => { setStatus("unconfirmed"); setPage(1); }}
          className="mb-5 block w-full rounded-xl border border-warning/30 bg-warning/10 p-3 text-left text-sm text-amber-200"
        >
          มีสมาชิกรอยืนยันอีเมล {data.unconfirmedCount} คน — คลิกเพื่อดู
        </button>
      )}
      {error && <ErrorBox message={error} />}
      {loading && !data ? (
        <PageLoading />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr><th className="th">ชื่อ</th><th className="th">อีเมล</th><th className="th">เบอร์โทร</th><th className="th">สถานะ</th><th className="th">สมัครเมื่อ</th><th className="th" /></tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.id} className="hover:bg-raised/50">
                  <td className="td font-medium">{u.name || "-"}</td>
                  <td className="td text-muted">{u.email}</td>
                  <td className="td text-muted">{u.phone || "-"}</td>
                  <td className="td">
                    <StatusBadge status={u.status} />
                    {!u.email_confirmed && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-amber-300">
                        รอยืนยันอีเมล
                        <Button size="sm" variant="outline" loading={confirming === u.id} onClick={() => confirmEmail(u.id)}>
                          ยืนยัน
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="td text-muted">{formatDate(u.created_at)}</td>
                  <td className="td text-right"><Link href={`/admin/members/${u.id}`} className="text-brand-light hover:underline">ดูรายละเอียด →</Link></td>
                </tr>
              ))}
              {data?.users.length === 0 && <tr><td className="td text-center text-muted" colSpan={6}>ไม่พบสมาชิก</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-edge px-3 py-1.5 disabled:opacity-40">← ก่อนหน้า</button>
          <span className="text-muted">หน้า {page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-edge px-3 py-1.5 disabled:opacity-40">ถัดไป →</button>
        </div>
      )}
    </>
  );
}
