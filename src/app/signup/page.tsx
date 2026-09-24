import AuthShell from "@/components/AuthShell";
import SignupForm from "./SignupForm";

export const metadata = { title: "สมัครสมาชิก" };

export default function SignupPage() {
  return (
    <AuthShell title="สมัครสมาชิก" subtitle="สร้างบัญชีเพื่อเริ่มเรียนกับ THUS House">
      <SignupForm />
    </AuthShell>
  );
}
