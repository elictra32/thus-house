import "server-only";
import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

// id ของบัญชีที่ยังไม่ยืนยันอีเมล (อ่าน auth.users ผ่านฟังก์ชันที่เรียกได้เฉพาะ service role)
export async function unconfirmedUserIds(service: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await service.rpc("admin_unconfirmed_user_ids");
  if (error) throw new Error(error.message);
  return new Set(((data ?? []) as { id: string }[]).map((r) => r.id));
}

// ส่งอีเมลยืนยันไม่ได้: ติด rate limit ของ Supabase หรือ SMTP มีปัญหา
export function isEmailDeliveryError(error: AuthError) {
  return (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    /rate limit|sending .*email|smtp/i.test(error.message)
  );
}
