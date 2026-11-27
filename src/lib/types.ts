import type { ObjectId } from "mongodb";

export type Language = "te" | "en";

export interface SeasonSettings {
  _id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  registrationEnabled: boolean;
  bookingWindowDays: number;
  cutoffTime: string; // HH:mm in Asia/Kolkata, e.g. "09:00"
  timezone: string; // "Asia/Kolkata"
  disabledDates: string[]; // YYYY-MM-DD[]
  templeName: string;
  templeNameTe: string;
  contactInfo: string;
  allowVisitorCancel: boolean;
  allowWalkinOverCapacity: boolean;
  adminPin?: string;
  updatedAt: Date;
}

export interface BatchConfig {
  _id: string;
  batchId: string;
  name: string;
  nameTe: string;
  startTime: string; // "12:30"
  displayTime: string; // "12:30 PM"
  capacity: number; // default 30
  active: boolean;
  sortOrder: number;
}

export interface BatchSlot {
  _id: string; // `${date}_${batchId}`
  date: string;
  batchId: string;
  bookedCount: number;
}

export interface SwamiProfile {
  _id?: ObjectId;
  profileCode: string;
  fullName: string;
  normalizedName: string;
  phone: string | null;
  village: string | null;
  totalAttendedVisits: number;
  lastAttendedDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Registration {
  _id?: ObjectId;
  code: string;
  idempotencyKey: string | null;
  type: "individual" | "group";
  annadanamDate: string;
  batchId: string;
  groupName: string | null;
  leaderName: string | null;
  leaderPhone: string | null;
  leaderVillage: string | null;
  leaderProfileId: ObjectId | null;
  memberCount: number;
  status: "active" | "cancelled";
  source: "public_qr" | "admin_manual";
  overrideReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
}

export interface RegistrationMember {
  _id?: ObjectId;
  registrationId: ObjectId;
  profileId: ObjectId;
  annadanamDate: string;
  batchId: string;
  fullName: string;
  phone: string | null;
  village: string | null;
  role: "leader" | "member";
  registrationStatus: "active" | "cancelled";
  attendanceStatus: "pending" | "present" | "absent";
  attendanceMarkedAt: Date | null;
  attendanceMarkedBy: string | null;
}

export interface AttendanceRecord {
  _id?: ObjectId;
  annadanamDate: string;
  batchId: string;
  registrationId: ObjectId | null;
  memberId: ObjectId | null;
  profileId: ObjectId;
  fullName: string;
  phone: string | null;
  village: string | null;
  source: "registered" | "walk-in";
  status: "present" | "absent" | "pending";
  markedBy: string;
  markedAt: Date;
}

export interface AdminUser {
  _id?: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  active: boolean;
  createdAt: Date;
}

export interface AuditLog {
  _id?: ObjectId;
  adminId: string;
  adminEmail: string;
  action: string;
  recordType: string;
  recordId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  note: string | null;
  timestamp: Date;
}
