import crypto from "crypto";
import { ObjectId, type Db } from "mongodb";
import type {
  AuditLog,
  BatchConfig,
  BatchSlot,
  Registration,
  RegistrationMember,
  SeasonSettings,
  SwamiProfile,
} from "./types";
import { normalizeName, normalizePhone } from "./validation";
import { validatePublicDate } from "./timezone";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(prefix: string, length: number = 6): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return `${prefix}-${out}`;
}

export class BookingError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status: number = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function getSettingsAndBatches(db: Db): Promise<{
  settings: SeasonSettings;
  batches: BatchConfig[];
}> {
  const [settings, batches] = await Promise.all([
    db.collection<SeasonSettings>("season_settings").findOne({ _id: "default" }),
    db
      .collection<BatchConfig>("batches")
      .find({ active: true })
      .sort({ sortOrder: 1 })
      .toArray(),
  ]);

  if (!settings) {
    throw new BookingError("SETTINGS_MISSING", "Season settings not configured", 500);
  }
  return { settings, batches };
}

export async function getBatchAvailability(
  db: Db,
  date: string,
  batches: BatchConfig[]
): Promise<
  Array<
    BatchConfig & {
      bookedCount: number;
      remaining: number;
      isFull: boolean;
    }
  >
> {
  const slotIds = batches.map((b) => `${date}_${b.batchId}`);
  const slots = await db
    .collection<BatchSlot>("batch_slots")
    .find({ _id: { $in: slotIds } })
    .toArray();

  const slotMap = new Map(slots.map((s) => [s.batchId, s.bookedCount]));

  return batches.map((b) => {
    const bookedCount = Math.max(0, slotMap.get(b.batchId) ?? 0);
    const remaining = Math.max(0, b.capacity - bookedCount);
    return {
      ...b,
      bookedCount,
      remaining,
      isFull: remaining === 0,
    };
  });
}

async function ensureSlotDocument(db: Db, date: string, batchId: string): Promise<string> {
  const slotId = `${date}_${batchId}`;
  try {
    await db.collection<BatchSlot>("batch_slots").updateOne(
      { _id: slotId },
      { $setOnInsert: { _id: slotId, date, batchId, bookedCount: 0 } },
      { upsert: true }
    );
  } catch (err: unknown) {
    // Ignore duplicate key race condition on concurrent upsert
    const code = (err as { code?: number })?.code;
    if (code !== 11000) throw err;
  }
  return slotId;
}

export async function reserveBatchSeats(
  db: Db,
  date: string,
  batch: BatchConfig,
  seatCount: number,
  overrideCapacity: boolean = false
): Promise<void> {
  const slotId = await ensureSlotDocument(db, date, batch.batchId);
  const slotsCol = db.collection<BatchSlot>("batch_slots");

  if (overrideCapacity) {
    await slotsCol.updateOne({ _id: slotId }, { $inc: { bookedCount: seatCount } });
    return;
  }

  const updated = await slotsCol.findOneAndUpdate(
    {
      _id: slotId,
      bookedCount: { $lte: batch.capacity - seatCount },
    },
    { $inc: { bookedCount: seatCount } },
    { returnDocument: "after" }
  );

  if (!updated) {
    const current = await slotsCol.findOne({ _id: slotId });
    const booked = current?.bookedCount ?? 0;
    const remaining = Math.max(0, batch.capacity - booked);
    throw new BookingError(
      "CAPACITY_EXCEEDED",
      remaining === 0
        ? "This batch is full."
        : `Only ${remaining} seat(s) remaining in this batch.`,
      409,
      { remaining, requested: seatCount }
    );
  }
}

export async function releaseBatchSeats(
  db: Db,
  date: string,
  batchId: string,
  seatCount: number
): Promise<void> {
  const slotId = `${date}_${batchId}`;
  const slotsCol = db.collection<BatchSlot>("batch_slots");
  await slotsCol.updateOne(
    { _id: slotId },
    [
      {
        $set: {
          bookedCount: {
            $max: [0, { $subtract: ["$bookedCount", seatCount] }],
          },
        },
      },
    ]
  );
}

export async function findOrCreateSwamiProfile(
  db: Db,
  input: { fullName: string; phone?: string | null; village?: string | null }
): Promise<ObjectId> {
  const profilesCol = db.collection<SwamiProfile>("swami_profiles");
  const cleanName = input.fullName.trim().replace(/\s+/g, " ");
  const normName = normalizeName(cleanName);
  const normPhone = normalizePhone(input.phone);
  const cleanVillage = input.village?.trim() || null;

  // Reliable identity matching: only auto-link when phone is provided and matches
  if (normPhone) {
    const existing = await profilesCol.findOne({ phone: normPhone });
    if (existing && existing._id) {
      if (cleanVillage && !existing.village) {
        await profilesCol.updateOne(
          { _id: existing._id },
          { $set: { village: cleanVillage, updatedAt: new Date() } }
        );
      }
      return existing._id;
    }
  }

  const now = new Date();
  const doc: SwamiProfile = {
    profileCode: generateCode("SWM", 6),
    fullName: cleanName,
    normalizedName: normName,
    phone: normPhone,
    village: cleanVillage,
    totalAttendedVisits: 0,
    lastAttendedDate: null,
    createdAt: now,
    updatedAt: now,
  };

  const res = await profilesCol.insertOne(doc);
  return res.insertedId;
}

export interface CreateBookingMember {
  fullName: string;
  phone?: string | null;
  village?: string | null;
  role: "leader" | "member";
}

export interface CreateBookingInput {
  type: "individual" | "group";
  annadanamDate: string;
  batchId: string;
  groupName?: string | null;
  leaderName?: string | null;
  leaderPhone?: string | null;
  leaderVillage?: string | null;
  members: CreateBookingMember[];
  source: "public_qr" | "admin_manual";
  idempotencyKey?: string | null;
  overrideRules?: boolean;
  overrideReason?: string | null;
  adminContext?: { adminId: string; adminEmail: string } | null;
}

export async function createRegistration(
  db: Db,
  input: CreateBookingInput
): Promise<{ registration: Registration; members: RegistrationMember[]; deduplicated?: boolean }> {
  // 1. Idempotency check
  if (input.idempotencyKey) {
    const existing = await db
      .collection<Registration>("registrations")
      .findOne({ idempotencyKey: input.idempotencyKey });
    if (existing && existing._id) {
      const existingMembers = await db
        .collection<RegistrationMember>("registration_members")
        .find({ registrationId: existing._id })
        .toArray();
      return { registration: existing, members: existingMembers, deduplicated: true };
    }
  }

  if (input.members.length === 0) {
    throw new BookingError("NO_MEMBERS", "At least one attending member is required.", 400);
  }

  const { settings, batches } = await getSettingsAndBatches(db);
  const batch = batches.find((b) => b.batchId === input.batchId);
  if (!batch) {
    throw new BookingError("INVALID_BATCH", "Selected batch is not available.", 400);
  }

  // 2. Date window & cutoff validation (strict for public_qr)
  if (input.source === "public_qr" || !input.overrideRules) {
    const dateCheck = validatePublicDate(input.annadanamDate, settings);
    if (!dateCheck.valid) {
      const reasonMessages: Record<string, string> = {
        registration_disabled: "Registrations are currently closed.",
        outside_season: "Selected date is outside the Ayyappa season.",
        outside_window: "Registrations are only open for today and the next two days.",
        disabled_date: "Registration is disabled for the selected date.",
        cutoff_passed: `Registration cutoff (${settings.cutoffTime} IST) has passed for this date.`,
      };
      throw new BookingError(
        dateCheck.reason?.toUpperCase() || "DATE_UNAVAILABLE",
        reasonMessages[dateCheck.reason || ""] || "Selected date is unavailable.",
        400
      );
    }
  }

  // 3. Duplicate active registration check (by normalized phone on same date & batch)
  const phonesToCheck = input.members
    .map((m) => normalizePhone(m.phone))
    .filter((p): p is string => Boolean(p));

  if (phonesToCheck.length > 0) {
    const dup = await db.collection<RegistrationMember>("registration_members").findOne({
      annadanamDate: input.annadanamDate,
      batchId: input.batchId,
      phone: { $in: phonesToCheck },
      registrationStatus: "active",
    });
    if (dup) {
      throw new BookingError(
        "DUPLICATE_REGISTRATION",
        `A registration already exists for mobile ${dup.phone} in this batch.`,
        409,
        { phone: dup.phone }
      );
    }
  }

  // 4. Atomic seat reservation
  const seatCount = input.members.length;
  await reserveBatchSeats(
    db,
    input.annadanamDate,
    batch,
    seatCount,
    Boolean(input.overrideRules)
  );

  // 5. Persist registration & members (rollback seats if anything fails)
  try {
    const now = new Date();
    const regCol = db.collection<Registration>("registrations");

    let leaderProfileId: ObjectId | null = null;
    if (input.type === "group" && input.leaderName) {
      leaderProfileId = await findOrCreateSwamiProfile(db, {
        fullName: input.leaderName,
        phone: input.leaderPhone,
        village: input.leaderVillage,
      });
    }

    let code = generateCode("AYY", 6);
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await regCol.findOne({ code });
      if (!exists) break;
      code = generateCode("AYY", 6);
    }

    const regDoc: Registration = {
      code,
      idempotencyKey: input.idempotencyKey || null,
      type: input.type,
      annadanamDate: input.annadanamDate,
      batchId: input.batchId,
      groupName: input.groupName?.trim() || null,
      leaderName: input.leaderName?.trim() || null,
      leaderPhone: normalizePhone(input.leaderPhone),
      leaderVillage: input.leaderVillage?.trim() || null,
      leaderProfileId,
      memberCount: seatCount,
      status: "active",
      source: input.source,
      overrideReason: input.overrideReason?.trim() || null,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
    };

    const regResult = await regCol.insertOne(regDoc);
    regDoc._id = regResult.insertedId;

    const memberDocs: RegistrationMember[] = [];
    for (const m of input.members) {
      const profileId = await findOrCreateSwamiProfile(db, {
        fullName: m.fullName,
        phone: m.phone,
        village: m.village,
      });
      memberDocs.push({
        registrationId: regResult.insertedId,
        profileId,
        annadanamDate: input.annadanamDate,
        batchId: input.batchId,
        fullName: m.fullName.trim().replace(/\s+/g, " "),
        phone: normalizePhone(m.phone),
        village: m.village?.trim() || null,
        role: m.role,
        registrationStatus: "active",
        attendanceStatus: "pending",
        attendanceMarkedAt: null,
        attendanceMarkedBy: null,
      });
    }

    const membersRes = await db
      .collection<RegistrationMember>("registration_members")
      .insertMany(memberDocs);
    memberDocs.forEach((doc, idx) => {
      doc._id = membersRes.insertedIds[idx];
    });

    if (input.adminContext) {
      await writeAuditLog(db, {
        adminId: input.adminContext.adminId,
        adminEmail: input.adminContext.adminEmail,
        action: input.overrideRules ? "registration.manual_override" : "registration.create_manual",
        recordType: "registration",
        recordId: regDoc.code,
        before: null,
        after: {
          annadanamDate: regDoc.annadanamDate,
          batchId: regDoc.batchId,
          memberCount: regDoc.memberCount,
          overrideReason: regDoc.overrideReason,
        },
        note: regDoc.overrideReason,
      });
    }

    return { registration: regDoc, members: memberDocs };
  } catch (err) {
    await releaseBatchSeats(db, input.annadanamDate, input.batchId, seatCount);
    throw err;
  }
}

export async function cancelRegistrationById(
  db: Db,
  registrationId: ObjectId,
  actor: { type: "visitor" | "admin"; adminId?: string; adminEmail?: string; reason?: string }
): Promise<Registration> {
  const regCol = db.collection<Registration>("registrations");
  const existing = await regCol.findOne({ _id: registrationId });
  if (!existing) {
    throw new BookingError("NOT_FOUND", "Registration not found.", 404);
  }
  if (existing.status === "cancelled") {
    throw new BookingError("ALREADY_CANCELLED", "Registration is already cancelled.", 400);
  }

  const now = new Date();
  const updated = await regCol.findOneAndUpdate(
    { _id: registrationId, status: "active" },
    { $set: { status: "cancelled", cancelledAt: now, updatedAt: now } },
    { returnDocument: "after" }
  );

  if (!updated) {
    throw new BookingError("ALREADY_CANCELLED", "Registration is already cancelled.", 400);
  }

  await db
    .collection<RegistrationMember>("registration_members")
    .updateMany(
      { registrationId },
      { $set: { registrationStatus: "cancelled" } }
    );

  await releaseBatchSeats(db, existing.annadanamDate, existing.batchId, existing.memberCount);

  if (actor.type === "admin" && actor.adminId && actor.adminEmail) {
    await writeAuditLog(db, {
      adminId: actor.adminId,
      adminEmail: actor.adminEmail,
      action: "registration.cancel",
      recordType: "registration",
      recordId: existing.code,
      before: { status: "active", memberCount: existing.memberCount },
      after: { status: "cancelled" },
      note: actor.reason || null,
    });
  }

  return updated;
}

export async function writeAuditLog(
  db: Db,
  entry: Omit<AuditLog, "_id" | "timestamp">
): Promise<void> {
  await db.collection<AuditLog>("audit_logs").insertOne({
    ...entry,
    timestamp: new Date(),
  });
}
