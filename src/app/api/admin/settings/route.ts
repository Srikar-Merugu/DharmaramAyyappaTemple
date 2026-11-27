import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { getSettingsAndBatches, writeAuditLog } from "@/lib/booking-engine";
import type { AuditLog, BatchConfig, SeasonSettings } from "@/lib/types";

export async function GET() {
  try {
    await requireAdmin();
    const db = await getDb();
    await ensureSeeded(db);

    const { settings } = await getSettingsAndBatches(db);
    const allBatches = await db
      .collection<BatchConfig>("batches")
      .find({})
      .sort({ sortOrder: 1 })
      .toArray();
    const auditLogs = await db
      .collection<AuditLog>("audit_logs")
      .find({})
      .sort({ timestamp: -1 })
      .limit(30)
      .toArray();

    return NextResponse.json({
      settings,
      batches: allBatches,
      auditLogs: auditLogs.map((l) => ({
        ...l,
        _id: l._id?.toHexString(),
      })),
    });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Settings GET error:", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

const updateSettingsSchema = z.object({
  settings: z.object({
    name: z.string().trim().min(2).max(150),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    registrationEnabled: z.boolean(),
    bookingWindowDays: z.number().int().min(1).max(7),
    cutoffTime: z.string().regex(/^\d{2}:\d{2}$/),
    disabledDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    templeName: z.string().trim().min(2).max(150),
    templeNameTe: z.string().trim().min(2).max(150),
    contactInfo: z.string().trim().max(200),
    allowVisitorCancel: z.boolean(),
    allowWalkinOverCapacity: z.boolean(),
    adminPin: z.string().trim().regex(/^\d{4,6}$/).optional(),
  }),
  batches: z.array(
    z.object({
      batchId: z.string(),
      name: z.string().trim().min(1).max(60),
      nameTe: z.string().trim().min(1).max(60),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      displayTime: z.string().trim().min(1).max(30),
      capacity: z.number().int().min(1).max(500),
      active: z.boolean(),
    })
  ),
});

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = await getDb();
    await ensureSeeded(db);

    const body = await req.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid settings" },
        { status: 400 }
      );
    }

    const { settings: s, batches } = parsed.data;
    if (s.endDate < s.startDate) {
      return NextResponse.json(
        { error: "Season end date must be on or after start date." },
        { status: 400 }
      );
    }

    await db.collection<SeasonSettings>("season_settings").updateOne(
      { _id: "default" },
      {
        $set: {
          ...s,
          timezone: "Asia/Kolkata",
          updatedAt: new Date(),
        },
      }
    );

    for (const b of batches) {
      await db.collection<BatchConfig>("batches").updateOne(
        { batchId: b.batchId },
        {
          $set: {
            name: b.name,
            nameTe: b.nameTe,
            startTime: b.startTime,
            displayTime: b.displayTime,
            capacity: b.capacity,
            active: b.active,
          },
        }
      );
    }

    await writeAuditLog(db, {
      adminId: admin.adminId,
      adminEmail: admin.email,
      action: "settings.update",
      recordType: "season_settings",
      recordId: "default",
      before: null,
      after: {
        registrationEnabled: s.registrationEnabled,
        cutoffTime: s.cutoffTime,
        startDate: s.startDate,
        endDate: s.endDate,
        disabledDatesCount: s.disabledDates.length,
      },
      note: null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Settings PUT error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
