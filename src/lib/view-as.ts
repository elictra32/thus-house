// Head Admin จำลองมุมมอง Mentor / Member (cookie · เปลี่ยนสิทธิ์ที่เห็นทั้งเว็บ ยกเว้นสิทธิ์จริงในฐานข้อมูล)
export const VIEW_AS_COOKIE = "thus_view_as";
export const VIEW_AS = { mentor: "Mentor", member: "Member" } as const;
export type ViewAs = keyof typeof VIEW_AS;
export const isViewAs = (v: unknown): v is ViewAs => v === "mentor" || v === "member";
