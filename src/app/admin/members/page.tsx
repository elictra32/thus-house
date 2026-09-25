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

type Row = User & { email_confirmed: boolean; roles: { name: string } | null };

export default function MembersPage({ searchParams }: { searchParams: { status?: string } }) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.status ?? "");
  const [confirming, setConfirming] = useState("");
  const [page, setPage] = useState(1);
  // โหมดแก้หลายคน: แก้รหัส / ชื่อเล่น / สถานะในตาราง แล้วกดบันทึกทีเดียว
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<Record<string, Partial<Pick<User, "member_code" | "nickname" | "status">>>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // หน่วงการค้นหา 300ms ระหว่างพิมพ์
  useEffect(() => {
    const t = setTimeout(() => { setSearch(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ page: String(page), ...(search && { q: search }), ...(status && { status }), ...(editMode && { size: "200" }) });
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
  const changed = Object.keys(edits).length;

  function setEdit(u: Row, key: "member_code" | "nickname" | "status", value: string) {
    setEdits((prev) => {
      const next = { ...prev, [u.id]: { ...prev[u.id], [key]: value } };
      // กลับเป็นค่าเดิม = ไม่นับว่าแก้
      if ((u[key] ?? "") === value) delete next[u.id][key];
      if (!Object.keys(next[u.id]).length) delete next[u.id];
      return next;
    });
  }
  const val = (u: Row, key: "member_code" | "nickname" | "status") => (edits[u.id]?.[key] ?? u[key] ?? "") as string;

  async function saveAll() {
    setSavingAll(true);
    setBulkError("");
    try {
      await api.put("/api/admin/users/bulk", { rows: Object.entries(edits).map(([id, e]) => ({ id, ...e })) });
      setEdits({});
      reload();
    } catch (e) {
      setBulkError((e as Error).message);
    } finally {
      setSavingAll(false);
    }
  }
  const cell = "w-full min-w-0 rounded-lg border bg-bg px-2.5 py-1.5 text-sm outline-none focus:border-brand";

  return (
    <>
      <PageHeader
        title="สมาชิก"
        subtitle={data ? `ทั้งหมด ${data.total} คน` : undefined}
        action={
          <Button
            size="sm"
            variant={editMode ? "primary" : "ghost"}
            onClick={() => {
              if (editMode && changed && !confirm("ยังไม่ได้บันทึก ออกจากโหมดแก้ไขเลยไหม?")) return;
              setEditMode(!editMode);
              setEdits({});
              setBulkError("");
              setPage(1);
            }}
          >
            {editMode ? "✓ เสร็จ" : "✎ แก้หลายคน"}
          </Button>
        }
      />
      {editMode && (
        <p className="mb-4 rounded-xl bg-brand/10 p-3 text-sm text-muted">
          แก้ <b className="text-ink">รหัสสมาชิก / ชื่อเล่น / สถานะ</b> ในตารางได้เลย (แสดงทีละ 200 คน) — แถวที่แก้จะเป็นสีม่วง แล้วกด <b className="text-ink">บันทึกทั้งหมด</b> ด้านล่าง
        </p>
      )}
      <div className="mb-5 flex flex-wrap gap-3">
        <Input name="q" placeholder="ค้นหาชื่อ ชื่อเล่น รหัส อีเมล เบอร์โทร..." value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-80" />
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
          <table className="w-full min-w-[900px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead>
              <tr><th className="th">รหัส</th><th className="th">ชื่อ</th><th className="th">ชื่อเล่น</th><th className="th">อีเมล</th><th className="th">เบอร์โทร</th><th className="th">Role</th><th className="th">สถานะ</th><th className="th">สมัครเมื่อ</th><th className="th" /></tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.id} className={edits[u.id] ? "bg-brand/10" : "hover:bg-raised/50"}>
                  <td className="td whitespace-nowrap font-semibold text-brand-light">
                    {editMode ? (
                      <input
                        aria-label={`รหัสสมาชิกของ ${u.email}`}
                        value={val(u, "member_code")}
                        placeholder="THUS-000"
                        onChange={(e) => setEdit(u, "member_code", e.target.value.toUpperCase())}
                        className={`${cell} w-32 font-semibold ${edits[u.id]?.member_code !== undefined ? "border-brand" : "border-edge"}`}
                      />
                    ) : u.member_code || <span className="font-normal text-subtle">-</span>}
                  </td>
                  <td className="td font-medium">{u.name || "-"}</td>
                  <td className="td">
                    {editMode ? (
                      <input
                        aria-label={`ชื่อเล่นของ ${u.email}`}
                        value={val(u, "nickname")}
                        onChange={(e) => setEdit(u, "nickname", e.target.value)}
                        className={`${cell} w-28 ${edits[u.id]?.nickname !== undefined ? "border-brand" : "border-edge"}`}
                      />
                    ) : u.nickname || "-"}
                  </td>
                  <td className="td text-muted">{u.email}</td>
                  <td className="td text-muted">{u.phone || "-"}</td>
                  <td className="td">{u.roles?.name ?? u.role}</td>
                  <td className="td">
                    {editMode ? (
                      <select
                        aria-label={`สถานะของ ${u.email}`}
                        value={val(u, "status")}
                        onChange={(e) => setEdit(u, "status", e.target.value)}
                        className={`${cell} min-w-[8.5rem] ${edits[u.id]?.status !== undefined ? "border-brand" : "border-edge"}`}
                      >
                        <option value="active">ใช้งาน</option>
                        <option value="inactive">ไม่ใช้งาน</option>
                        <option value="suspended">ระงับ</option>
                      </select>
                    ) : <StatusBadge status={u.status} />}
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
              {data?.users.length === 0 && <tr><td className="td text-center text-muted" colSpan={9}>ไม่พบสมาชิก</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {editMode && (changed > 0 || bulkError) && (
        <div className="sticky bottom-4 z-20 mt-4 rounded-2xl border border-brand/40 bg-card/95 p-4 shadow-2xl backdrop-blur">
          {bulkError && <p className="mb-3 whitespace-pre-line rounded-lg bg-danger/15 p-3 text-sm text-red-300">{bulkError}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">แก้แล้ว <b>{changed}</b> คน</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setEdits({}); setBulkError(""); }}>ยกเลิกทั้งหมด</Button>
              <Button size="sm" loading={savingAll} disabled={!changed} onClick={saveAll}>บันทึกทั้งหมด ({changed})</Button>
            </div>
          </div>
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
