export type UserStatus = "active" | "inactive" | "suspended";
export type PurchaseStatus = "pending" | "approved" | "rejected";
export type LiveStatus = "upcoming" | "live" | "ended";

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  nickname: string | null;
  member_code: string | null; // รหัสสมาชิก (Admin กำหนด)
  discord_id: string | null; // Discord user ID สำหรับกดอนุมัติใน Discord (Head Admin กำหนด)
  status: UserStatus;
  membership_start: string | null;
  membership_end: string | null;
  last_login_at: string | null;
  avatar_url: string | null; // รูปโปรไฟล์ (bucket avatars)
  birth_date: string | null; // YYYY-MM-DD
  address: string | null; // ที่อยู่ออกใบกำกับภาษี
  trading_markets: string[];
  trading_years: string | null;
  learning_goal: string | null;
  id_card_last4: string | null; // เลขบัตรประชาชนเก็บแบบเข้ารหัส (id_card_enc) — แสดงแค่ 4 ตัวท้าย
  active_session: string | null; // รหัสเครื่องที่ล็อกอินอยู่ (ล็อกอินได้ทีละเครื่อง)
  active_session_seen: string | null;
  role: string; // id ใน roles
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  is_system: boolean;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  description: string | null;
  instructor: string | null;
  category: string | null;
  price: number;
  videos_count: number;
  duration_hours: number;
  thumbnail_url: string | null;
  access_days: number | null; // อายุสมาชิกเริ่มต้น (วัน) · null = ไม่หมดอายุ
  created_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  class_id: string;
  amount: number;
  slip_image_url: string | null;
  status: PurchaseStatus;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  expires_at: string | null; // วันหมดสิทธิ์เรียน · null = ไม่หมดอายุ
  discord_message_id: string | null; // ข้อความรอตรวจในห้องอนุมัติ Discord
  created_at: string;
}

export interface Video {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_seconds: number;
  order_index: number;
  created_at: string;
}

// วิดีโอฝั่งสมาชิก — ไม่มีลิงก์วิดีโอ (ขอลิงก์ทีละบทผ่าน /api/videos/[id]/source)
export type LessonVideo = Omit<Video, "video_url">;

export interface WatchedVideo {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
}

export interface LiveClass {
  id: string;
  title: string;
  instructor: string | null;
  scheduled_date: string;
  zoom_link: string | null;
  youtube_live_url: string | null;
  discord_link: string | null;
  status: LiveStatus;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null; // กดแจ้งเตือนแล้วพาไปหน้านี้
  is_read: boolean;
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_email: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export type PurchaseWithRelations = Purchase & {
  classes: Pick<Class, "id" | "name" | "access_days"> | null;
  users: Pick<User, "id" | "name" | "email"> | null;
};

export type GalleryKind = "feedback" | "meetup";

export interface GalleryItem {
  id: string;
  kind: GalleryKind;
  image_url: string;
  caption: string | null;
  order_index: number;
  created_at: string;
}
