# แผนที่โค้ด → กติกา

| กติกา | ไฟล์หลัก |
|---|---|
| สิทธิ์ / มุมมองจำลอง | `src/lib/auth.ts` (`getRealPermissions`, `getPermissions`, `getViewAs`), `src/lib/view-as.ts`, `src/components/ViewAsBar.tsx`, `/api/view-as` |
| ลำดับชั้น Role | `src/lib/role-rank.ts`, `/api/admin/users/[id]`, `/api/admin/roles*` |
| ล็อกอินทีละเครื่อง | `src/middleware.ts`, `/api/auth/login`, `/api/auth/logout`, `src/lib/device-session.ts`, SQL `session_check` / `session_release` |
| โปรไฟล์ / เลขบัตร / บังคับกรอก | `src/lib/member-profile.ts`, `/api/user/profile`, `/api/user/id-card`, `/api/user/avatar`, `src/app/(member)/profile/*`, `src/app/(member)/payment/ProfileGate.tsx`, SQL `set_id_card` / `get_id_card` |
| ซื้อ / สลิป / โค้ดส่วนลด | `/api/purchases/upload-slip`, `src/lib/discount.ts`, `src/lib/discount-fields.ts`, `/api/discount`, `/api/admin/discounts*`, `src/app/admin/discounts` |
| บทเรียน / ภาพปก / YouTube | `src/lib/class-access.ts`, `src/lib/admin-fields.ts` (`videoFields`), `src/lib/youtube-info.ts`, `/api/admin/youtube-info`, `src/components/VideoList.tsx` |
| เอกสารประกอบคลาส (ลิงก์ Drive) | `src/lib/class-docs.ts`, `/api/admin/class-docs*`, `/api/classes/[id]/documents/[docId]`, `src/app/admin/classes/[id]/documents`, `src/components/ClassDocuments.tsx`, SQL `class_documents` |
| คอมเมนต์ / หัวใจ | `/api/videos/[id]/comments`, `/api/videos/[id]/like`, `/api/comments/[id]`, `src/lib/community.ts`, `src/components/LessonComments.tsx` |
| Mentor / โน้ต | `/api/mentor*`, `/api/member-notes*`, `src/lib/mentor.ts`, `src/lib/member-notes.ts`, `src/app/admin/mentor` |
| Log สมาชิก | `src/lib/member-log.ts`, `src/lib/member-actions.ts`, `/api/admin/member-logs`, `src/app/admin/logs` |
| ออนไลน์ & สถิติ | `src/components/PresencePing.tsx`, `/api/presence`, `/api/admin/presence`, `src/app/admin/online`, SQL `presence_ping` / `presence_stats` |
| Cron / ต่ออายุ Vercel | `/api/cron/daily`, `src/lib/usage-plans.ts` |
| รายงานประจำวัน | `src/lib/daily-report.ts`, `/api/admin/daily-report`, `admin/usage/DailyReportButton.tsx` |
| Discord | `src/lib/discord.ts`, `src/lib/discord-bot.ts`, `/api/discord/interactions` |
