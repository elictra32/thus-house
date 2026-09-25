"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { api } from "@/lib/api-client";
import BirthDateSelect from "@/components/BirthDateSelect";
import { isBirthDate } from "@/lib/member-profile";

type Fields = { name: string; nickname: string; phone: string; birthDate: string; email: string; password: string; confirm: string };

function validate(f: Fields) {
  const e: Partial<Fields> = {};
  if (!f.name.trim()) e.name = "กรุณากรอกชื่อ–นามสกุล";
  if (!f.nickname.trim()) e.nickname = "กรุณากรอกชื่อเล่น";
  if (!/^[0-9+\-\s]{9,20}$/.test(f.phone.trim())) e.phone = "กรุณากรอกเบอร์โทรให้ถูกต้อง";
  if (!isBirthDate(f.birthDate)) e.birthDate = "กรุณาเลือกวัน เดือน ปีเกิดให้ครบ";
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "รูปแบบอีเมลไม่ถูกต้อง";
  if (f.password.length < 8) e.password = "รหัสผ่านอย่างน้อย 8 ตัวอักษร";
  if (f.confirm !== f.password) e.confirm = "รหัสผ่านไม่ตรงกัน";
  return e;
}

export default function SignupForm() {
  const router = useRouter();
  const [f, setF] = useState<Fields>({ name: "", nickname: "", phone: "", birthDate: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<Fields>>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState<"" | "email" | "admin">("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const v = validate(f);
    setErrors(v);
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      const res = await api.post<{ needsConfirmation: boolean; pendingAdmin?: boolean }>("/api/auth/signup", {
        name: f.name.trim(),
        nickname: f.nickname.trim(),
        phone: f.phone.trim(),
        birthDate: f.birthDate,
        email: f.email.trim(),
        password: f.password,
      });
      if (res.needsConfirmation) {
        setDone(res.pendingAdmin ? "admin" : "email");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done === "admin")
    return (
      <div className="rounded-lg bg-warning/15 p-4 text-sm text-amber-200">
        สมัครสำเร็จ! บัญชี <b>{f.email}</b> อยู่ระหว่างรอทีมงานยืนยัน
        เมื่อยืนยันแล้วจะ<Link href="/login" className="underline">เข้าสู่ระบบ</Link>ได้ทันที
      </div>
    );

  if (done)
    return (
      <div className="rounded-lg bg-success/15 p-4 text-sm text-green-300">
        สมัครสำเร็จ! กรุณายืนยันอีเมลจากลิงก์ที่เราส่งไปที่ <b>{f.email}</b> แล้ว{" "}
        <Link href="/login" className="underline">เข้าสู่ระบบ</Link>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Input label="ชื่อ–นามสกุล" name="name" autoComplete="name" value={f.name} onChange={set("name")} error={errors.name} />
      <Input label="ชื่อเล่น" name="nickname" autoComplete="nickname" value={f.nickname} onChange={set("nickname")} error={errors.nickname} />
      <Input label="เบอร์โทร" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={set("phone")} error={errors.phone} />
      <BirthDateSelect label="วันเดือนปีเกิด" value={f.birthDate} onChange={(v) => setF({ ...f, birthDate: v })} error={errors.birthDate} />
      <Input label="อีเมล" name="email" type="email" autoComplete="email" value={f.email} onChange={set("email")} error={errors.email} />
      <Input label="รหัสผ่าน" name="password" type="password" autoComplete="new-password" value={f.password} onChange={set("password")} error={errors.password} />
      <Input label="ยืนยันรหัสผ่าน" name="confirm" type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} error={errors.confirm} />
      {error && <p className="rounded-lg bg-danger/15 p-3 text-sm text-red-300">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        สมัครสมาชิก
      </Button>
      <p className="text-center text-sm text-muted">
        มีบัญชีแล้ว?{" "}
        <Link href="/login" className="font-semibold text-brand-light">
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
