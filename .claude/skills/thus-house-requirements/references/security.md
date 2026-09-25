# ความปลอดภัย — baseline + checklist ก่อน merge

## หลักที่ใช้ทั้งเว็บ
- **เขียนข้อมูลผ่าน API ฝั่ง server เท่านั้น** (service role) · ตาราง public: `anon` อ่านได้แค่ `classes`, `gallery_items` · `authenticated` อ่านได้ตาม RLS (users/purchases/notifications/live_classes/watched_videos + คอลัมน์ที่อนุญาตของ `videos`) · เขียนได้แค่ `watched_videos` (ของตัวเอง) และ `notifications.is_read`
- ตารางใหม่: `enable row level security` + `revoke all ... from anon, authenticated` ทุกครั้ง (Supabase ให้สิทธิ์ครบเป็นค่าเริ่มต้น)
- ฟังก์ชัน `security definer`: `revoke all from public, anon, authenticated` แล้ว grant ให้ `service_role` · ยกเว้น `session_check` / `session_release` (ต้องให้ authenticated เรียก — ใช้ `auth.uid()` แตะได้แค่แถวตัวเอง)
- ทุก route ใน `/api/admin/*` ใช้ `adminRoute(perm, ...)` · route สมาชิกใช้ `requireApiUser()` · ตัดสินลำดับชั้นด้วย `userRank` / `canAssign` / `canManage` (`src/lib/role-rank.ts`)
- ราคา/ส่วนลด/สิทธิ์เรียน คำนวณฝั่ง server จากฐานข้อมูลเสมอ ไม่เชื่อค่าจาก client
- ข้อมูลอ่อนไหว: เลขบัตร (เข้ารหัส, ไม่ส่ง `id_card_enc` ออกไปเบราว์เซอร์), `active_session` (ไม่ส่งออก) · เปิดดูเลขบัตร = บันทึก Log
- ไฟล์: bucket `slips` private (signed URL) · `avatars`/`thumbnails` public (ไม่มี policy list) · ตรวจชนิดไฟล์ด้วย magic bytes + จำกัดขนาด
- redirect `next=` รับเฉพาะ path ภายใน (`/` แต่ไม่ใช่ `//`)
- Security headers ใน `next.config.mjs` (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy)
- PostgREST embed: ตารางเชื่อม (junction) ทำให้ embed กำกวม → ใช้ `roles!users_role_fkey(...)` หรือดึงแยก

## Checklist ก่อน merge
1. `npx tsc --noEmit && npx next lint` (+ `next build` ถ้าแตะ page/route)
2. ตารางใหม่ → RLS + revoke · ฟังก์ชันใหม่ → revoke/grant · อัปเดต `supabase/schema.sql`
3. Supabase advisors (security + performance) หลังแก้ DB — ที่คาดไว้แล้ว: "RLS enabled no policy" (ตั้งใจ), session_check/release (ตั้งใจ), leaked password (ต้อง Supabase Pro)
4. route ใหม่มีการตรวจสิทธิ์ · ไม่ส่งคอลัมน์ลับออก · Log การกระทำสำคัญ (`logAdmin` / `logMember`)
5. `npm audit --omit=dev` — Next 14.2.35 เป็นตัวล่าสุดของสาย 14 · ช่องโหว่ที่เหลือแก้ได้เฉพาะ Next 15/16 (งานอัปเกรดแยก)

## ตรวจล่าสุด 25 ก.ย. 2569
- ปิดสิทธิ์เขียนตารางจาก anon/authenticated (ก่อนหน้า RLS กันอยู่แล้ว แต่มี grant ค้าง) · เพิ่ม index `member_notes(author_id)`
- `/api/auth/me` และหน้ารายละเอียดสมาชิกไม่ส่ง `id_card_enc` / `active_session` · รายการสมาชิก select เฉพาะคอลัมน์ที่ใช้
- ไม่พบ secret ใน repo · route ที่ไม่ต้องล็อกอิน: auth/login, signup, logout, classes (อ่านสาธารณะ), discord/interactions (ตรวจลายเซ็น), cron (CRON_SECRET)
