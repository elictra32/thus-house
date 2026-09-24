import { Suspense } from "react";
import AuthShell from "@/components/AuthShell";
import LoginForm from "./LoginForm";

export const metadata = { title: "เข้าสู่ระบบ" };

export default function LoginPage() {
  return (
    <AuthShell title="เข้าสู่ระบบ" subtitle="ยินดีต้อนรับกลับสู่ THUS House">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
