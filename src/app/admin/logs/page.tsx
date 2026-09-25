"use client";
import { Fragment, useEffect, useState } from "react";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import Input, { Select } from "@/components/Input";
import Link from "next/link";
import { MEMBER_ACTIONS, describeLog } from "@/lib/member-actions";
import { PageLoading } from "@/components/LoadingSpinner";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/utils";
import type { AdminLog } from "@/types/database";

const ACTIONS = ["create", "update", "bulk_update", "delete", "approve", "reject", "reorder", "email", "view_id_card"];

export default function LogsPage() {
  const [tab, setTab] = useState<"member" | "admin">("member");
  return (
    <>
      <PageHeader title="Log" subtitle="สมาชิกแต่ละคนทำอะไร / Admin ทำอะไร" />
      <div className="mb-5 inline-flex rounded-xl bg-raised p-1 text-sm">
        {([["member", "👤 สมาชิก"], ["admin", "🛡 Admin"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-2 ${tab === k ? "bg-brand font-bold text-white" : "text-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "member" ? <MemberLogs /> : <AdminLogs />}
    </>
  );
}

type MemberLogRow = {
  id: number; user_id: string; action: string; details: Record<string, unknown> | null; created_at: string;
  user: { name: string | null; nickname: string | null; member_code: string | null; email: string } | null;
};

// Log สมาชิก: ค้นหาคน + กรองประเภท
function MemberLogs() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => { setSearch(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const params = new URLSearchParams({ page: String(page), ...(action && { action }), ...(search && { q: search }) });
  const { data, error, loading } = useApi<{ logs: MemberLogRow[]; total: number; pageSize: number }>(`/api/admin/member-logs?${params}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        <Input name="q" placeholder="ค้นหา รหัส / ชื่อ / ชื่อเล่น / อีเมล" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-72" />
        <Select name="action" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="w-56">
          <option value="">ทุกกิจกรรม</option>
          {Object.entries(MEMBER_ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>
      {error && <ErrorBox message={error} />}
      {loading && !data ? (
        <PageLoading />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr><th className="th">เวลา</th><th className="th">สมาชิก</th><th className="th">ทำอะไร</th><th className="th">รายละเอียด</th></tr></thead>
            <tbody>
              {data?.logs.map((l) => (
                <tr key={l.id}>
                  <td className="td whitespace-nowrap text-muted">{formatDate(l.created_at, true)}</td>
                  <td className="td whitespace-nowrap">
                    <Link href={`/admin/members/${l.user_id}`} className="hover:underline">
                      {l.user?.member_code && <span className="font-semibold text-brand-light">{l.user.member_code} </span>}
                      {l.user?.nickname || l.user?.name || l.user?.email || "-"}
                    </Link>
                  </td>
                  <td className="td whitespace-nowrap">{MEMBER_ACTIONS[l.action] ?? l.action}</td>
                  <td className="td max-w-[380px] truncate text-muted">{describeLog(l.action, l.details) || "-"}</td>
                </tr>
              ))}
              {data?.logs.length === 0 && <tr><td className="td text-center text-muted" colSpan={4}>ยังไม่มีข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={pages} setPage={setPage} />
    </>
  );
}

function Pager({ page, pages, setPage }: { page: number; pages: number; setPage: (n: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-edge px-3 py-1.5 disabled:opacity-40">← ก่อนหน้า</button>
      <span className="text-muted">หน้า {page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-edge px-3 py-1.5 disabled:opacity-40">ถัดไป →</button>
    </div>
  );
}

function AdminLogs() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const params = new URLSearchParams({ page: String(page), ...(action && { action }) });
  const { data, error, loading } = useApi<{ logs: AdminLog[]; total: number; pageSize: number }>(`/api/admin/logs?${params}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <Select name="action" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="mb-5 w-48">
        <option value="">ทุก action</option>
        {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
      </Select>
      {error && <ErrorBox message={error} />}
      {loading && !data ? (
        <PageLoading />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr><th className="th">เวลา</th><th className="th">Admin</th><th className="th">Action</th><th className="th">ตาราง</th><th className="th">Record ID</th><th className="th" /></tr></thead>
            <tbody>
              {data?.logs.map((l) => (
                <Fragment key={l.id}>
                  <tr>
                    <td className="td whitespace-nowrap text-muted">{formatDate(l.created_at, true)}</td>
                    <td className="td">{l.admin_email}</td>
                    <td className="td"><span className="rounded bg-raised px-2 py-0.5 font-mono text-xs">{l.action}</span></td>
                    <td className="td text-muted">{l.table_name}</td>
                    <td className="td max-w-[160px] truncate font-mono text-xs text-subtle">{l.record_id ?? "-"}</td>
                    <td className="td text-right">
                      {l.details && (
                        <button onClick={() => setOpenId(openId === l.id ? null : l.id)} className="text-xs text-brand-light hover:underline">
                          {openId === l.id ? "ซ่อน" : "Details"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {openId === l.id && (
                    <tr>
                      <td colSpan={6} className="bg-bg px-4 py-3">
                        <pre className="overflow-x-auto text-xs text-muted">{JSON.stringify(l.details, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {data?.logs.length === 0 && <tr><td className="td text-center text-muted" colSpan={6}>ยังไม่มีข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={pages} setPage={setPage} />
    </>
  );
}
