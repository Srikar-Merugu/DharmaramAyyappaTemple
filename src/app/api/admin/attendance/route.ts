import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type Db } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import {
  findOrCreateSwamiProfile,
  getBatchAvailability,
  getSettingsAndBatches,
  writeAuditLog,
} from "@/lib/booking-engine";
import type {
  AttendanceRecord,
  Registration,
  RegistrationMember,
  SwamiProfile,
} from "@/lib/types";
import { normalizePhone, walkinSchema } from "@/lib/validation";

async function syncProfileVisitStats(db: Db, profileId: ObjectId) {
  const presentRecords = await db
    .collection<AttendanceRecord>("attendance_records")
    .find({ profileId, status: "present" })
    .sort({ annadanamDate: -1 })
    .toArray();

  await db.collection<SwamiProfile>("swami_profiles").updateOne(
    { _id: profileId },
    {
      $set: {
        totalAttendedVisits: presentRecords.length,
        lastAttendedDate: presentRecords[0]?.annadanamDate || null,
        updatedAt: new Date(),
      },
    }
  );
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const db = await getDb();
    await ensureSeeded(db);

    const date = req.nextUrl.searchParams.get("date");
    const batchId = req.nextUrl.searchParams.get("batchId");
    if (!date || !batchId) {
      return NextResponse.json(
        { error: "date and batchId are required" },
        { status: 400 }
      );
    }

    const { batches } = await getSettingsAndBatches(db);
    const [availability] = await getBatchAvailability(
      db,
      date,
      batches.filter((b) => b.batchId === batchId)
    );

    const [regs, members, walkins] = await Promise.all([
      db
        .collection<Registration>("registrations")
        .find({ annadanamDate: date, batchId, status: "active" })
        .sort({ createdAt: 1 })
        .toArray(),
      db
        .collection<RegistrationMember>("registration_members")
        .find({ annadanamDate: date, batchId, registrationStatus: "active" })
        .toArray(),
      db
        .collection<AttendanceRecord>("attendance_records")
        .find({ annadanamDate: date, batchId, source: "walk-in" })
        .sort({ markedAt: -1 })
        .toArray(),
    ]);

    const membersByReg = new Map<string, RegistrationMember[]>();
    for (const m of members) {
      const k = m.registrationId.toHexString();
      const list = membersByReg.get(k) || [];
      list.push(m);
      membersByReg.set(k, list);
    }

    return NextResponse.json({
      batch: availability || null,
      groups: regs.map((r) => ({
        _id: r._id!.toHexString(),
        code: r.code,
        type: r.type,
        groupName: r.groupName,
        leaderName: r.leaderName,
        memberCount: r.memberCount,
        members: (membersByReg.get(r._id!.toHexString()) || []).map((m) => ({
          _id: m._id!.toHexString(),
          profileId: m.profileId.toHexString(),
          fullName: m.fullName,
          phone: m.phone,
          village: m.village,
          role: m.role,
          attendanceStatus: m.attendanceStatus,
          attendanceMarkedAt: m.attendanceMarkedAt,
        })),
      })),
      walkIns: walkins.map((w) => ({
        _id: w._id!.toHexString(),
        profileId: w.profileId.toHexString(),
        fullName: w.fullName,
        phone: w.phone,
        village: w.village,
        status: w.status,
        markedAt: w.markedAt,
        markedBy: w.markedBy,
      })),
    });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Attendance GET error:", err);
    return NextResponse.json({ error: "Failed to load attendance" }, { status: 500 });
  }
}

const markMemberSchema = z.object({
  action: z.literal("mark_member"),
  memberId: z.string(),
  status: z.enum(["present", "absent", "pending"]),
});

const markGroupSchema = z.object({
  action: z.literal("mark_group"),
  registrationId: z.string(),
  status: z.enum(["present", "absent", "pending"]),
});

const addWalkinSchema = walkinSchema.extend({
  action: z.literal("walkin"),
});

const attendanceActionSchema = z.discriminatedUnion("action", [
  markMemberSchema,
  markGroupSchema,
  addWalkinSchema,
]);

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = await getDb();
    await ensureSeeded(db);

    const body = await req.json();
    const parsed = attendanceActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const now = new Date();
    const membersCol = db.collection<RegistrationMember>("registration_members");
    const attCol = db.collection<AttendanceRecord>("attendance_records");

    if (data.action === "mark_member") {
      if (!ObjectId.isValid(data.memberId)) {
        return NextResponse.json({ error: "Invalid memberId" }, { status: 400 });
      }
      const memberId = new ObjectId(data.memberId);
      const member = await membersCol.findOne({ _id: memberId });
      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      const prevStatus = member.attendanceStatus;

      await membersCol.updateOne(
        { _id: memberId },
        {
          $set: {
            attendanceStatus: data.status,
            attendanceMarkedAt: now,
            attendanceMarkedBy: admin.email,
          },
        }
      );

      await attCol.updateOne(
        {
          annadanamDate: member.annadanamDate,
          batchId: member.batchId,
          memberId: memberId,
        },
        {
          $set: {
            registrationId: member.registrationId,
            profileId: member.profileId,
            fullName: member.fullName,
            phone: member.phone,
            village: member.village,
            source: "registered",
            status: data.status,
            markedBy: admin.email,
            markedAt: now,
          },
        },
        { upsert: true }
      );

      await syncProfileVisitStats(db, member.profileId);

      await writeAuditLog(db, {
        adminId: admin.adminId,
        adminEmail: admin.email,
        action: "attendance.mark_member",
        recordType: "registration_member",
        recordId: memberId.toHexString(),
        before: { status: prevStatus },
        after: { status: data.status },
        note: `${member.fullName} (${member.annadanamDate} / ${member.batchId})`,
      });

      return NextResponse.json({ success: true });
    }

    if (data.action === "mark_group") {
      if (!ObjectId.isValid(data.registrationId)) {
        return NextResponse.json({ error: "Invalid registrationId" }, { status: 400 });
      }
      const regId = new ObjectId(data.registrationId);
      const members = await membersCol
        .find({ registrationId: regId, registrationStatus: "active" })
        .toArray();

      if (members.length === 0) {
        return NextResponse.json({ error: "No active members found" }, { status: 404 });
      }

      await membersCol.updateMany(
        { registrationId: regId, registrationStatus: "active" },
        {
          $set: {
            attendanceStatus: data.status,
            attendanceMarkedAt: now,
            attendanceMarkedBy: admin.email,
          },
        }
      );

      for (const m of members) {
        await attCol.updateOne(
          {
            annadanamDate: m.annadanamDate,
            batchId: m.batchId,
            memberId: m._id!,
          },
          {
            $set: {
              registrationId: regId,
              profileId: m.profileId,
              fullName: m.fullName,
              phone: m.phone,
              village: m.village,
              source: "registered",
              status: data.status,
              markedBy: admin.email,
              markedAt: now,
            },
          },
          { upsert: true }
        );
        await syncProfileVisitStats(db, m.profileId);
      }

      await writeAuditLog(db, {
        adminId: admin.adminId,
        adminEmail: admin.email,
        action: "attendance.mark_group",
        recordType: "registration",
        recordId: regId.toHexString(),
        before: null,
        after: { status: data.status, memberCount: members.length },
        note: null,
      });

      return NextResponse.json({ success: true });
    }

    // Walk-in entry
    const { settings, batches } = await getSettingsAndBatches(db);
    const batch = batches.find((b) => b.batchId === data.batchId);
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 400 });
    }

    if (!settings.allowWalkinOverCapacity) {
      const [avail] = await getBatchAvailability(db, data.annadanamDate, [batch]);
      const existingWalkins = await attCol.countDocuments({
        annadanamDate: data.annadanamDate,
        batchId: data.batchId,
        source: "walk-in",
        status: "present",
      });
      if ((avail?.bookedCount || 0) + existingWalkins >= batch.capacity) {
        return NextResponse.json(
          { error: "Batch is at full capacity (30/30). Walk-ins over capacity are disabled." },
          { status: 409 }
        );
      }
    }

    const profileId = await findOrCreateSwamiProfile(db, {
      fullName: data.fullName,
      phone: data.phone,
      village: data.village,
    });

    const walkinDoc: AttendanceRecord = {
      annadanamDate: data.annadanamDate,
      batchId: data.batchId,
      registrationId: null,
      memberId: null,
      profileId,
      fullName: data.fullName.trim().replace(/\s+/g, " "),
      phone: normalizePhone(data.phone),
      village: data.village?.trim() || null,
      source: "walk-in",
      status: "present",
      markedBy: admin.email,
      markedAt: now,
    };

    const res = await attCol.insertOne(walkinDoc);
    await syncProfileVisitStats(db, profileId);

    await writeAuditLog(db, {
      adminId: admin.adminId,
      adminEmail: admin.email,
      action: "attendance.walkin",
      recordType: "attendance_record",
      recordId: res.insertedId.toHexString(),
      before: null,
      after: {
        fullName: walkinDoc.fullName,
        annadanamDate: walkinDoc.annadanamDate,
        batchId: walkinDoc.batchId,
      },
      note: null,
    });

    return NextResponse.json({
      success: true,
      walkIn: {
        ...walkinDoc,
        _id: res.insertedId.toHexString(),
        profileId: profileId.toHexString(),
      },
    });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Attendance POST error:", err);
    return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
  }
}
