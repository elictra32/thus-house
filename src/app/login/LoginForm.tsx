"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { api } from "@/lib/api-client";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const kicked = params.get("kicked") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("กรุณากรอกอีเมลและรหัสผ่าน");
    setLoading(true);
    try {
      await api.post("/api/auth/login", { email, password });
      // กันการ redirect ไปเว็บอื่น: รับเฉพาะ path ภายใน
      router.push(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Input label="อีเมล" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input label="รหัสผ่าน" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {kicked && !error && (
        <p className="rounded-lg bg-amber-500/15 p-3 text-sm text-amber-200">
          บัญชีนี้ถูกใช้งานที่อุปกรณ์อื่นแล้ว — 1 บัญชีใช้ได้ทีละ 1 อุปกรณ์
        </p>
      )}
      {error && <p className="rounded-lg bg-danger/15 p-3 text-sm text-red-300">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        เข้าสู่ระบบ
      </Button>
      <p className="text-center text-sm text-muted">
        ยังไม่มีบัญชี?{" "}
        <Link href="/signup" className="font-semibold text-brand-light">
          สมัครสมาชิก
        </Link>
      </p>
    </form>
  );
}
