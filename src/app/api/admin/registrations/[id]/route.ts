import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import {
  BookingError,
  cancelRegistrationById,
  findOrCreateSwamiProfile,
  getSettingsAndBatches,
  releaseBatchSeats,
  reserveBatchSeats,
  writeAuditLog,
} from "@/lib/booking-engine";
import type { Registration, RegistrationMember } from "@/lib/types";
import { memberInputSchema, normalizePhone } from "@/lib/validation";

const editSchema = z.object({
  groupName: z.string().trim().max(100).optional().nullable(),
  leaderName: z.string().trim().max(100).optional().nullable(),
  leaderPhone: z.string().trim().max(20).optional().nullable(),
  leaderVillage: z.string().trim().max(100).optional().nullable(),
  members: z
    .array(
      memberInputSchema.extend({
        _id: z.string().optional(),
        role: z.enum(["leader", "member"]).default("member"),
      })
    )
    .min(1)
    .max(40),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const db = await getDb();
    await ensureSeeded(db);

    const regId = new ObjectId(id);
    const regCol = db.collection<Registration>("registrations");
    const membersCol = db.collection<RegistrationMember>("registration_members");

    const existing = await regCol.findOne({ _id: regId });
    if (!existing) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }
    if (existing.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot edit a cancelled registration" },
        { status: 400 }
      );
    }

    const oldCount = existing.memberCount;
    const newCount = parsed.data.members.length;
    const diff = newCount - oldCount;

    if (diff > 0) {
      const { batches } = await getSettingsAndBatches(db);
      const batch = batches.find((b) => b.batchId === existing.batchId);
      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 400 });
      }
      await reserveBatchSeats(db, existing.annadanamDate, batch, diff, false);
    } else if (diff < 0) {
      await releaseBatchSeats(
        db,
        existing.annadanamDate,
        existing.batchId,
        Math.abs(diff)
      );
    }

    const existingMembers = await membersCol.find({ registrationId: regId }).toArray();
    const existingById = new Map(
      existingMembers.map((m) => [m._id!.toHexString(), m])
    );

    const newMemberDocs: RegistrationMember[] = [];
    for (const m of parsed.data.members) {
      const prev = m._id ? existingById.get(m._id) : undefined;
      const profileId =
        prev?.profileId ||
        (await findOrCreateSwamiProfile(db, {
          fullName: m.fullName,
          phone: m.phone,
          village: m.village,
        }));

      newMemberDocs.push({
        registrationId: regId,
        profileId,
        annadanamDate: existing.annadanamDate,
        batchId: existing.batchId,
        fullName: m.fullName.trim().replace(/\s+/g, " "),
        phone: normalizePhone(m.phone),
        village: m.village?.trim() || null,
        role: m.role,
        registrationStatus: "active",
        attendanceStatus: prev?.attendanceStatus || "pending",
        attendanceMarkedAt: prev?.attendanceMarkedAt || null,
        attendanceMarkedBy: prev?.attendanceMarkedBy || null,
      });
    }

    await membersCol.deleteMany({ registrationId: regId });
    await membersCol.insertMany(newMemberDocs);

    const now = new Date();
    await regCol.updateOne(
      { _id: regId },
      {
        $set: {
          groupName: parsed.data.groupName?.trim() || null,
          leaderName: parsed.data.leaderName?.trim() || existing.leaderName,
          leaderPhone:
            parsed.data.leaderPhone !== undefined
              ? normalizePhone(parsed.data.leaderPhone)
              : existing.leaderPhone,
          leaderVillage:
            parsed.data.leaderVillage !== undefined
              ? parsed.data.leaderVillage?.trim() || null
              : existing.leaderVillage,
          memberCount: newCount,
          updatedAt: now,
        },
      }
    );

    await writeAuditLog(db, {
      adminId: admin.adminId,
      adminEmail: admin.email,
      action: "registration.edit",
      recordType: "registration",
      recordId: existing.code,
      before: { memberCount: oldCount, leaderName: existing.leaderName },
      after: { memberCount: newCount, leaderName: parsed.data.leaderName },
      note: null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Edit registration error:", err);
    return NextResponse.json({ error: "Failed to update registration" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDb();
    await ensureSeeded(db);

    await cancelRegistrationById(db, new ObjectId(id), {
      type: "admin",
      adminId: admin.adminId,
      adminEmail: admin.email,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Cancel registration error:", err);
    return NextResponse.json({ error: "Failed to cancel registration" }, { status: 500 });
  }
}
