"use client";
import { Fragment, useState } from "react";
import PageHeader, { ErrorBox } from "@/components/admin/PageHeader";
import { Select } from "@/components/Input";
import { PageLoading } from "@/components/LoadingSpinner";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/utils";
import type { AdminLog } from "@/types/database";

const ACTIONS = ["create", "update", "delete", "approve", "reject", "reorder", "email"];

export default function LogsPage() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const params = new URLSearchParams({ page: String(page), ...(action && { action }) });
  const { data, error, loading } = useApi<{ logs: AdminLog[]; total: number; pageSize: number }>(`/api/admin/logs?${params}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader title="Audit Log" subtitle="ประวัติการกระทำของ Admin ทั้งหมด" />
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
