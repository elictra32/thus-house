"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "./Button";
import { api } from "@/lib/api-client";

export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={loading}
      className={className}
      onClick={async () => {
        setLoading(true);
        await api.post("/api/auth/logout").catch(() => {});
        router.push("/");
        router.refresh();
      }}
    >
      ออกจากระบบ
    </Button>
  );
}
