"use client";
import { useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card max-h-[90vh] w-full overflow-y-auto p-6 ${wide ? "max-w-3xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none text-muted hover:text-ink" aria-label="ปิด">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Modal ยืนยันการกระทำ (เช่น ลบ)
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading,
  confirmLabel = "ยืนยัน",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
  confirmLabel?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-[10px] border border-edge px-4 py-2 text-sm font-bold">
          ยกเลิก
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="rounded-[10px] bg-danger px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {loading ? "กำลังดำเนินการ..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
