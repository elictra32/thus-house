"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type View = "" | "mentor" | "member";
const LABEL: Record<Exclude<View, "">, string> = { mentor: "Mentor", member: "Member" };

async function setView(as: View) {
  await fetch("/api/view-as", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as: as || null }) });
}

// แถบบนสุดตอน Head Admin จำลองมุมมอง — กดกลับได้ทุกหน้า
export function ViewAsBanner({ view }: { view: "mentor" | "member" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-sm font-semibold text-[#2d183c]">
      👁 กำลังดูเว็บในมุมมอง <b>{LABEL[view]}</b> (จำลอง — สิทธิ์จริงยังเป็น Head Admin)
      <button
        disabled={busy}
        onClick={async () => { setBusy(true); await setView(""); router.push("/admin"); router.refresh(); }}
        className="rounded-full bg-[#2d183c] px-3 py-1 text-xs font-bold text-white hover:opacity-90"
      >
        {busy ? "..." : "← กลับเป็น Head Admin"}
      </button>
    </div>
  );
}

// ตัวเลือกมุมมองในเมนู Admin (เฉพาะ Head Admin)
export function ViewAsSwitcher({ current }: { current: View }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const opts: [View, string][] = [["", "Head"], ["mentor", "Mentor"], ["member", "Member"]];
  async function pick(v: View) {
    if (v === current) return;
    setBusy(true);
    await setView(v);
    router.push(v === "member" ? "/dashboard" : v === "mentor" ? "/admin/mentor" : "/admin");
    router.refresh();
    setBusy(false);
  }
  return (
    <div className="px-3 pb-3">
      <p className="mb-1.5 px-1 text-[11px] font-bold tracking-wide text-subtle">👁 ดูเว็บในมุมมอง</p>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-raised p-1 text-xs">
        {opts.map(([v, label]) => (
          <button
            key={label}
            disabled={busy}
            onClick={() => pick(v)}
            className={`rounded-lg py-1.5 ${current === v ? "bg-brand font-bold text-white" : "text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
