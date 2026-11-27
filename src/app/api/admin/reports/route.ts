import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { getSettingsAndBatches } from "@/lib/booking-engine";
import { getNowInTimezone } from "@/lib/timezone";
import type {
  AttendanceRecord,
  Registration,
  RegistrationMember,
  SwamiProfile,
} from "@/lib/types";

function csvEscape(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const db = await getDb();
    await ensureSeeded(db);

    const { settings, batches } = await getSettingsAndBatches(db);
    const { dateStr: today } = getNowInTimezone(settings.timezone || "Asia/Kolkata");
    const date = req.nextUrl.searchParams.get("date") || today;
    const mode = req.nextUrl.searchParams.get("mode") || "json";

    const [
      dayRegs,
      dayMembers,
      dayWalkins,
      seasonRegs,
      seasonMembers,
      seasonWalkins,
      repeatProfiles,
    ] = await Promise.all([
      db
        .collection<Registration>("registrations")
        .find({ annadanamDate: date })
        .toArray(),
      db
        .collection<RegistrationMember>("registration_members")
        .find({ annadanamDate: date })
        .toArray(),
      db
        .collection<AttendanceRecord>("attendance_records")
        .find({ annadanamDate: date, source: "walk-in", status: "present" })
        .toArray(),
      db
        .collection<Registration>("registrations")
        .find({
          annadanamDate: { $gte: settings.startDate, $lte: settings.endDate },
        })
        .toArray(),
      db
        .collection<RegistrationMember>("registration_members")
        .find({
          annadanamDate: { $gte: settings.startDate, $lte: settings.endDate },
          registrationStatus: "active",
        })
        .toArray(),
      db
        .collection<AttendanceRecord>("attendance_records")
        .find({
          annadanamDate: { $gte: settings.startDate, $lte: settings.endDate },
          source: "walk-in",
          status: "present",
        })
        .toArray(),
      db
        .collection<SwamiProfile>("swami_profiles")
        .find({ totalAttendedVisits: { $gte: 2 } })
        .sort({ totalAttendedVisits: -1 })
        .limit(50)
        .toArray(),
    ]);

    const batchMap = new Map(batches.map((b) => [b.batchId, b]));

    // CSV Export for selected date
    if (mode === "export_daily") {
      const regCodeMap = new Map(
        dayRegs.map((r) => [r._id!.toHexString(), r.code])
      );
      const rows: string[] = [
        [
          "Date",
          "Batch",
          "Registration Code",
          "Source",
          "Role",
          "Full Name",
          "Phone",
          "Village",
          "Registration Status",
          "Attendance Status",
        ].join(","),
      ];

      for (const m of dayMembers) {
        const b = batchMap.get(m.batchId);
        rows.push(
          [
            m.annadanamDate,
            b ? `${b.name} (${b.displayTime})` : m.batchId,
            regCodeMap.get(m.registrationId.toHexString()) || "",
            "Registered",
            m.role,
            m.fullName,
            m.phone || "",
            m.village || "",
            m.registrationStatus,
            m.attendanceStatus,
          ]
            .map(csvEscape)
            .join(",")
        );
      }

      for (const w of dayWalkins) {
        const b = batchMap.get(w.batchId);
        rows.push(
          [
            w.annadanamDate,
            b ? `${b.name} (${b.displayTime})` : w.batchId,
            "WALK-IN",
            "Walk-in",
            "member",
            w.fullName,
            w.phone || "",
            w.village || "",
            "walk-in",
            w.status,
          ]
            .map(csvEscape)
            .join(",")
        );
      }

      const csvContent = "\uFEFF" + rows.join("\n");
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="annadanam-daily-${date}.csv"`,
        },
      });
    }

    // Daily metrics
    const activeMembers = dayMembers.filter((m) => m.registrationStatus === "active");
    const cancelledCount = dayRegs
      .filter((r) => r.status === "cancelled")
      .reduce((s, r) => s + r.memberCount, 0);

    const registered = activeMembers.length;
    const attendedRegistered = activeMembers.filter(
      (m) => m.attendanceStatus === "present"
    ).length;
    const noShows = activeMembers.filter(
      (m) => m.attendanceStatus === "absent"
    ).length;
    const pending = activeMembers.filter(
      (m) => m.attendanceStatus === "pending"
    ).length;
    const walkIns = dayWalkins.length;
    const actualAttendance = attendedRegistered + walkIns;
    const attendanceRate =
      registered > 0 ? Math.round((attendedRegistered / registered) * 100) : 0;

    const batchReports = batches.map((b) => {
      const bm = activeMembers.filter((m) => m.batchId === b.batchId);
      const bw = dayWalkins.filter((w) => w.batchId === b.batchId);
      const bAttended = bm.filter((m) => m.attendanceStatus === "present").length;
      const bNoShows = bm.filter((m) => m.attendanceStatus === "absent").length;
      return {
        batchId: b.batchId,
        name: b.name,
        displayTime: b.displayTime,
        capacity: b.capacity,
        registered: bm.length,
        remaining: Math.max(0, b.capacity - bm.length),
        attendedRegistered: bAttended,
        noShows: bNoShows,
        walkIns: bw.length,
        actualAttendance: bAttended + bw.length,
        utilizationPct:
          b.capacity > 0 ? Math.round((bm.length / b.capacity) * 100) : 0,
      };
    });

    // Season metrics
    const activeSeasonRegs = seasonRegs.filter((r) => r.status === "active");
    const seasonIndividual = activeSeasonRegs.filter(
      (r) => r.type === "individual"
    ).length;
    const seasonGroup = activeSeasonRegs.filter((r) => r.type === "group").length;
    const seasonAttendedReg = seasonMembers.filter(
      (m) => m.attendanceStatus === "present"
    ).length;

    const villageCounts = new Map<string, number>();
    for (const m of seasonMembers) {
      if (m.village) {
        const v = m.village.trim();
        villageCounts.set(v, (villageCounts.get(v) || 0) + 1);
      }
    }
    const villageBreakdown = Array.from(villageCounts.entries())
      .map(([village, count]) => ({ village, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const dailyTrendMap = new Map<
      string,
      { date: string; registered: number; attended: number; walkIns: number }
    >();
    for (const m of seasonMembers) {
      const cur = dailyTrendMap.get(m.annadanamDate) || {
        date: m.annadanamDate,
        registered: 0,
        attended: 0,
        walkIns: 0,
      };
      cur.registered += 1;
      if (m.attendanceStatus === "present") cur.attended += 1;
      dailyTrendMap.set(m.annadanamDate, cur);
    }
    for (const w of seasonWalkins) {
      const cur = dailyTrendMap.get(w.annadanamDate) || {
        date: w.annadanamDate,
        registered: 0,
        attended: 0,
        walkIns: 0,
      };
      cur.walkIns += 1;
      cur.attended += 1;
      dailyTrendMap.set(w.annadanamDate, cur);
    }
    const dailyTrend = Array.from(dailyTrendMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    if (mode === "export_season") {
      const rows = [
        ["Date", "Registered", "Walk-ins", "Actual Attendance"].join(","),
        ...dailyTrend.map((d) =>
          [d.date, d.registered, d.walkIns, d.attended].map(csvEscape).join(",")
        ),
      ];
      const csvContent = "\uFEFF" + rows.join("\n");
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="annadanam-season-summary.csv"`,
        },
      });
    }

    return NextResponse.json({
      date,
      daily: {
        registered,
        attendedRegistered,
        noShows,
        pending,
        walkIns,
        actualAttendance,
        cancelledPeople: cancelledCount,
        attendanceRate,
        batches: batchReports,
      },
      season: {
        name: settings.name,
        startDate: settings.startDate,
        endDate: settings.endDate,
        totalRegistrations: activeSeasonRegs.length,
        totalRegisteredPeople: seasonMembers.length,
        totalAttendedRegistered: seasonAttendedReg,
        totalWalkIns: seasonWalkins.length,
        totalActualAttendance: seasonAttendedReg + seasonWalkins.length,
        individualRegs: seasonIndividual,
        groupRegs: seasonGroup,
        repeatVisitorsCount: repeatProfiles.length,
        topRepeatVisitors: repeatProfiles.slice(0, 10).map((p) => ({
          _id: p._id!.toHexString(),
          profileCode: p.profileCode,
          fullName: p.fullName,
          village: p.village,
          totalAttendedVisits: p.totalAttendedVisits,
          lastAttendedDate: p.lastAttendedDate,
        })),
        villageBreakdown,
        dailyTrend,
      },
    });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Reports GET error:", err);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}
