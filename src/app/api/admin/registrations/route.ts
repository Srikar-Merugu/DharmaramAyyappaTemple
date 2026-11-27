import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import {
  BookingError,
  createRegistration,
  type CreateBookingMember,
} from "@/lib/booking-engine";
import type { Registration, RegistrationMember } from "@/lib/types";
import { memberInputSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const db = await getDb();
    await ensureSeeded(db);

    const sp = req.nextUrl.searchParams;
    const date = sp.get("date");
    const batchId = sp.get("batchId");
    const type = sp.get("type");
    const status = sp.get("status");
    const q = sp.get("q")?.trim();

    const filter: Record<string, unknown> = {};
    if (date) filter.annadanamDate = date;
    if (batchId && batchId !== "all") filter.batchId = batchId;
    if (type && type !== "all") filter.type = type;
    if (status && status !== "all") filter.status = status;

    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matchingMembers = await db
        .collection<RegistrationMember>("registration_members")
        .find({
          $or: [{ fullName: regex }, { phone: regex }, { village: regex }],
        })
        .project({ registrationId: 1 })
        .toArray();
      const memberRegIds = matchingMembers.map((m) => m.registrationId);

      filter.$or = [
        { code: regex },
        { leaderName: regex },
        { leaderPhone: regex },
        { leaderVillage: regex },
        { groupName: regex },
        { _id: { $in: memberRegIds } },
      ];
    }

    const regs = await db
      .collection<Registration>("registrations")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const regIds = regs.map((r) => r._id).filter(Boolean);
    const members = await db
      .collection<RegistrationMember>("registration_members")
      .find({ registrationId: { $in: regIds } })
      .toArray();

    const membersByReg = new Map<string, RegistrationMember[]>();
    for (const m of members) {
      const key = m.registrationId.toHexString();
      const list = membersByReg.get(key) || [];
      list.push(m);
      membersByReg.set(key, list);
    }

    return NextResponse.json({
      registrations: regs.map((r) => ({
        ...r,
        _id: r._id?.toHexString(),
        leaderProfileId: r.leaderProfileId?.toHexString() || null,
        members: (r._id ? membersByReg.get(r._id.toHexString()) || [] : []).map(
          (m) => ({
            ...m,
            _id: m._id?.toHexString(),
            registrationId: m.registrationId.toHexString(),
            profileId: m.profileId.toHexString(),
          })
        ),
      })),
    });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Admin registrations GET error:", err);
    return NextResponse.json(
      { error: "Failed to load registrations" },
      { status: 500 }
    );
  }
}

const manualSchema = z.object({
  type: z.enum(["individual", "group"]),
  annadanamDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  batchId: z.string().min(1),
  groupName: z.string().trim().max(100).optional().nullable(),
  leaderName: z.string().trim().max(100).optional().nullable(),
  leaderPhone: z.string().trim().max(20).optional().nullable(),
  leaderVillage: z.string().trim().max(100).optional().nullable(),
  members: z.array(memberInputSchema).min(1).max(40),
  overrideRules: z.boolean().default(false),
  overrideReason: z.string().trim().max(200).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = await getDb();
    await ensureSeeded(db);

    const body = await req.json();
    const parsed = manualSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    if (d.overrideRules && !d.overrideReason?.trim()) {
      return NextResponse.json(
        { error: "Override reason is required when bypassing rules." },
        { status: 400 }
      );
    }

    const members: CreateBookingMember[] = d.members.map((m, idx) => ({
      fullName: m.fullName,
      phone: m.phone,
      village: m.village,
      role: d.type === "group" && idx === 0 ? "leader" : "member",
    }));

    const result = await createRegistration(db, {
      type: d.type,
      annadanamDate: d.annadanamDate,
      batchId: d.batchId,
      groupName: d.groupName || null,
      leaderName: d.type === "group" ? d.leaderName || d.members[0].fullName : null,
      leaderPhone: d.type === "group" ? d.leaderPhone || d.members[0].phone : null,
      leaderVillage: d.type === "group" ? d.leaderVillage || d.members[0].village : null,
      members,
      source: "admin_manual",
      overrideRules: d.overrideRules,
      overrideReason: d.overrideReason || null,
      adminContext: { adminId: admin.adminId, adminEmail: admin.email },
    });

    return NextResponse.json(
      {
        registration: {
          ...result.registration,
          _id: result.registration._id?.toHexString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Manual registration error:", err);
    return NextResponse.json(
      { error: "Failed to create registration" },
      { status: 500 }
    );
  }
}
