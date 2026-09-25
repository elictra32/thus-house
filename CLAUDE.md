# THUS House — เว็บสมาชิก / คอร์สเรียน

ก่อนเริ่มงานใน repo นี้:
1. อ่าน **`docs/OWNER_PREFERENCES.md`** — ข้อมูลธุรกิจ, ดีไซน์ที่เจ้าของชอบ/ไม่ชอบ, วิธีสื่อสาร (ภาษาไทย), สิ่งที่ถูกแก้แล้ว
2. ใช้ skill **`membership-site-builder`** (`.claude/skills/membership-site-builder/`) — ขั้นตอน Supabase / Vercel / โดเมน / อีเมล, แผนที่โค้ด, workflow ภาพตัวอย่างก่อน deploy, ข้อผิดพลาดที่เคยเจอ

คู่มือฟังก์ชันทั้งหมด (สำหรับเจ้าของ/ทีมงาน): **`docs/USER_GUIDE.md`** — เพิ่ม/เปลี่ยนฟีเจอร์ ต้องอัปเดตไฟล์นี้ด้วย

สรุปสั้น:
- Next.js 14 + Supabase + Vercel · `main` = production (merge แล้ว deploy อัตโนมัติ)
- schema อยู่ที่ `supabase/schema.sql` (idempotent) — แก้ DB ผ่าน Supabase MCP `apply_migration` แล้วอัปเดตไฟล์นี้ด้วย
- ตรวจก่อน push: `npx tsc --noEmit && npx next lint` (+ `next build` ด้วย env ปลอมได้)
- งานดีไซน์: ส่งภาพตัวอย่างให้เจ้าของดูก่อน รอ "deploy ได้ / จัดไป / ลุย" ค่อย merge
- เจ้าของบอกความชอบใหม่ → อัปเดต `docs/OWNER_PREFERENCES.md` ทันที
