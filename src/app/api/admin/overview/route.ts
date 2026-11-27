import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { getBatchAvailability, getSettingsAndBatches } from "@/lib/booking-engine";
import { addDaysToDateStr, getNowInTimezone } from "@/lib/timezone";
import type {
  AttendanceRecord,
  Registration,
  RegistrationMember,
} from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const db = await getDb();
    await ensureSeeded(db);

    const { settings, batches } = await getSettingsAndBatches(db);
    const { dateStr: today } = getNowInTimezone(settings.timezone || "Asia/Kolkata");
    const date = req.nextUrl.searchParams.get("date") || today;

    const next3Dates = [
      today,
      addDaysToDateStr(today, 1),
      addDaysToDateStr(today, 2),
    ];

    const [batchAvailability, regs, members, walkins, upcomingMembers] =
      await Promise.all([
        getBatchAvailability(db, date, batches),
        db
          .collection<Registration>("registrations")
          .find({ annadanamDate: date })
          .toArray(),
        db
          .collection<RegistrationMember>("registration_members")
          .find({ annadanamDate: date, registrationStatus: "active" })
          .toArray(),
        db
          .collection<AttendanceRecord>("attendance_records")
          .find({ annadanamDate: date, source: "walk-in" })
          .toArray(),
        db
          .collection<RegistrationMember>("registration_members")
          .find({
            annadanamDate: { $in: next3Dates },
            registrationStatus: "active",
          })
          .project({ annadanamDate: 1 })
          .toArray(),
      ]);

    const upcomingCounts = next3Dates.map((d, idx) => ({
      date: d,
      label: idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : "Day After",
      expectedCount: upcomingMembers.filter((m) => m.annadanamDate === d).length,
    }));

    const activeRegs = regs.filter((r) => r.status === "active");
    const cancelledRegs = regs.filter((r) => r.status === "cancelled");

    const individualRegs = activeRegs.filter((r) => r.type === "individual").length;
    const groupRegs = activeRegs.filter((r) => r.type === "group").length;
    const totalExpected = members.length;
    const attendedRegistered = members.filter(
      (m) => m.attendanceStatus === "present"
    ).length;
    const noShows = members.filter((m) => m.attendanceStatus === "absent").length;
    const pending = members.filter((m) => m.attendanceStatus === "pending").length;
    const walkInCount = walkins.filter((w) => w.status === "present").length;

    return NextResponse.json({
      date,
      today,
      upcomingCounts,
      settings: {
        name: settings.name,
        registrationEnabled: settings.registrationEnabled,
        cutoffTime: settings.cutoffTime,
        disabledDates: settings.disabledDates,
      },
      summary: {
        totalExpected,
        individualRegs,
        groupRegs,
        cancelledRegs: cancelledRegs.length,
        cancelledPeople: cancelledRegs.reduce((s, r) => s + r.memberCount, 0),
        attendedRegistered,
        noShows,
        pending,
        walkInCount,
        actualAttendance: attendedRegistered + walkInCount,
        totalCapacity: batches.reduce((s, b) => s + b.capacity, 0),
      },
      batches: batchAvailability.map((b) => {
        const bMembers = members.filter((m) => m.batchId === b.batchId);
        const bWalkins = walkins.filter(
          (w) => w.batchId === b.batchId && w.status === "present"
        );
        return {
          ...b,
          attendedRegistered: bMembers.filter((m) => m.attendanceStatus === "present")
            .length,
          noShows: bMembers.filter((m) => m.attendanceStatus === "absent").length,
          pending: bMembers.filter((m) => m.attendanceStatus === "pending").length,
          walkIns: bWalkins.length,
        };
      }),
    });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Admin overview error:", err);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
