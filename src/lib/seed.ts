import type { Db } from "mongodb";
import { hashPassword } from "./auth";
import type { AdminUser, BatchConfig, SeasonSettings } from "./types";

let seedPromise: Promise<void> | null = null;

async function runSeed(db: Db): Promise<void> {
  // 1. Ensure indexes
  await Promise.all([
    db.collection("registrations").createIndex({ code: 1 }, { unique: true }),
    db
      .collection("registrations")
      .createIndex(
        { idempotencyKey: 1 },
        {
          unique: true,
          partialFilterExpression: { idempotencyKey: { $type: "string" } },
        }
      ),
    db
      .collection("registrations")
      .createIndex({ annadanamDate: 1, batchId: 1, status: 1 }),
    db.collection("registration_members").createIndex({ registrationId: 1 }),
    db
      .collection("registration_members")
      .createIndex({ annadanamDate: 1, batchId: 1, registrationStatus: 1 }),
    db.collection("registration_members").createIndex({ profileId: 1 }),
    db.collection("swami_profiles").createIndex({ profileCode: 1 }, { unique: true }),
    db.collection("swami_profiles").createIndex({ phone: 1 }, { sparse: true }),
    db.collection("swami_profiles").createIndex({ normalizedName: 1 }),
    db
      .collection("attendance_records")
      .createIndex(
        { annadanamDate: 1, batchId: 1, memberId: 1 },
        { unique: true, partialFilterExpression: { memberId: { $type: "objectId" } } }
      ),
    db
      .collection("attendance_records")
      .createIndex({ annadanamDate: 1, batchId: 1, source: 1 }),
    db.collection("admin_users").createIndex({ email: 1 }, { unique: true }),
    db.collection("audit_logs").createIndex({ timestamp: -1 }),
  ]);

  // 2. Default season settings
  const settingsCol = db.collection<SeasonSettings>("season_settings");
  const existingSettings = await settingsCol.findOne({ _id: "default" });
  if (!existingSettings) {
    await settingsCol.insertOne({
      _id: "default",
      name: "Ayyappa Mandala–Makaravilakku Season 2026–27",
      startDate: "2026-11-01",
      endDate: "2027-01-31",
      registrationEnabled: true,
      bookingWindowDays: 3,
      cutoffTime: "09:00",
      timezone: "Asia/Kolkata",
      disabledDates: [],
      templeName: "Sri Ayyappa Swamy Temple",
      templeNameTe: "శ్రీ అయ్యప్ప స్వామి దేవాలయం",
      contactInfo: "+91 98765 43210 • Temple Annadanam Office",
      allowVisitorCancel: true,
      allowWalkinOverCapacity: true,
      adminPin: process.env.DEFAULT_ADMIN_PIN || "1081",
      updatedAt: new Date(),
    });
  }

  // 3. Default 3 batches (12:30 PM, 1:30 PM, 2:30 PM — capacity 30 each)
  const batchesCol = db.collection<BatchConfig>("batches");
  const batchCount = await batchesCol.countDocuments();
  if (batchCount === 0) {
    await batchesCol.insertMany([
      {
        _id: "batch-1",
        batchId: "batch-1",
        name: "Batch 1",
        nameTe: "బ్యాచ్ 1",
        startTime: "12:30",
        displayTime: "12:30 PM",
        capacity: 30,
        active: true,
        sortOrder: 1,
      },
      {
        _id: "batch-2",
        batchId: "batch-2",
        name: "Batch 2",
        nameTe: "బ్యాచ్ 2",
        startTime: "13:30",
        displayTime: "1:30 PM",
        capacity: 30,
        active: true,
        sortOrder: 2,
      },
      {
        _id: "batch-3",
        batchId: "batch-3",
        name: "Batch 3",
        nameTe: "బ్యాచ్ 3",
        startTime: "14:30",
        displayTime: "2:30 PM",
        capacity: 30,
        active: true,
        sortOrder: 3,
      },
    ]);
  }

  // 4. Default organizer account
  const adminsCol = db.collection<AdminUser>("admin_users");
  const defaultEmail = (
    process.env.DEFAULT_ADMIN_EMAIL || "organizer@ayyappatemple.org"
  ).toLowerCase();
  const existingAdmin = await adminsCol.findOne({ email: defaultEmail });
  if (!existingAdmin) {
    const defaultPassword =
      process.env.DEFAULT_ADMIN_PASSWORD || "SwamiSaranam@2026";
    await adminsCol.insertOne({
      email: defaultEmail,
      name: "Annadanam Organizer",
      passwordHash: hashPassword(defaultPassword),
      active: true,
      createdAt: new Date(),
    });
  }
}

export async function ensureSeeded(db: Db): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed(db).catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
