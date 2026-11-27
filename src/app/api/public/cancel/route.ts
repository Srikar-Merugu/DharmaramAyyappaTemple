import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import {
  BookingError,
  cancelRegistrationById,
  getSettingsAndBatches,
} from "@/lib/booking-engine";
import { isCutoffPassed } from "@/lib/timezone";
import type { Registration } from "@/lib/types";
import { checkRateLimit } from "@/lib/rate-limit";

const cancelSchema = z.object({
  code: z.string().trim().min(4).max(20),
});

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!checkRateLimit(`cancel:${ip}`, 20, 60_000)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid registration code." },
        { status: 400 }
      );
    }

    const db = await getDb();
    await ensureSeeded(db);

    const { settings } = await getSettingsAndBatches(db);
    if (!settings.allowVisitorCancel) {
      return NextResponse.json(
        { error: "Self-cancellation is disabled. Please contact the temple organizer." },
        { status: 403 }
      );
    }

    const code = parsed.data.code.toUpperCase();
    const reg = await db.collection<Registration>("registrations").findOne({ code });
    if (!reg || !reg._id) {
      return NextResponse.json(
        { error: "Registration code not found." },
        { status: 404 }
      );
    }

    if (reg.status === "cancelled") {
      return NextResponse.json(
        { error: "This registration is already cancelled." },
        { status: 400 }
      );
    }

    if (isCutoffPassed(reg.annadanamDate, settings.cutoffTime, settings.timezone)) {
      return NextResponse.json(
        {
          error: `Cancellation cutoff (${settings.cutoffTime} IST) has passed for ${reg.annadanamDate}. Please contact the organizer.`,
        },
        { status: 400 }
      );
    }

    await cancelRegistrationById(db, reg._id, { type: "visitor" });

    return NextResponse.json({
      success: true,
      code: reg.code,
      annadanamDate: reg.annadanamDate,
      memberCount: reg.memberCount,
    });
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Cancel error:", err);
    return NextResponse.json({ error: "Failed to cancel registration." }, { status: 500 });
  }
}
