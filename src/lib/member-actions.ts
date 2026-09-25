// Log สมาชิก: แต่ละคนทำอะไร (แสดงที่ Admin → Log → สมาชิก และหน้ารายละเอียดสมาชิก)
export const MEMBER_ACTIONS: Record<string, string> = {
  login: "เข้าสู่ระบบ",
  logout: "ออกจากระบบ",
  signup: "สมัครสมาชิก",
  open_lesson: "เปิดบทเรียน",
  comment: "คอมเมนต์",
  delete_comment: "ลบคอมเมนต์",
  like_lesson: "กดหัวใจบทเรียน",
  upload_slip: "ส่งสลิป",
  message: "ส่งข้อความถึงผู้สอน",
  profile: "แก้โปรไฟล์",
  avatar: "เปลี่ยนรูปโปรไฟล์",
  view_id_card: "เปิดดูเลขบัตรประชาชน",
  login_blocked: "ล็อกอินไม่ได้ (ใช้อยู่อีกเครื่อง)",
};

// ข้อความสั้นๆ อธิบายรายละเอียดของแต่ละ Log
export function describeLog(action: string, d: Record<string, unknown> | null) {
  if (!d) return "";
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  switch (action) {
    case "open_lesson": return s("title");
    case "comment": return `${s("lesson")}: ${s("body")}`;
    case "delete_comment": return s("body");
    case "like_lesson": return s("lesson");
    case "upload_slip": return `${s("class")}${d.amount ? ` · ${Number(d.amount).toLocaleString()} บาท` : ""}`;
    case "message": return `${s("class")}: ${s("body")}`;
    case "profile": return Array.isArray(d.fields) ? (d.fields as string[]).join(", ") : "";
    case "view_id_card": return d.by === "self" ? "ตัวเอง" : `โดย ${s("by")}`;
    default: return "";
  }
}
