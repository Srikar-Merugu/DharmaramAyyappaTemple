import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { getBatchAvailability, getSettingsAndBatches } from "@/lib/booking-engine";
import { getBookingWindowDates, getNowInTimezone } from "@/lib/timezone";

export async function GET() {
  try {
    const db = await getDb();
    await ensureSeeded(db);

    const { settings, batches } = await getSettingsAndBatches(db);
    const now = new Date();
    const dates = getBookingWindowDates(settings, now);
    const currentIST = getNowInTimezone(settings.timezone || "Asia/Kolkata", now);

    const availabilityByDate: Record<
      string,
      Awaited<ReturnType<typeof getBatchAvailability>>
    > = {};

    await Promise.all(
      dates.map(async (d) => {
        availabilityByDate[d.date] = await getBatchAvailability(db, d.date, batches);
      })
    );

    return NextResponse.json({
      temple: {
        name: settings.templeName,
        nameTe: settings.templeNameTe,
        contactInfo: settings.contactInfo,
        seasonName: settings.name,
        startDate: settings.startDate,
        endDate: settings.endDate,
        registrationEnabled: settings.registrationEnabled,
        cutoffTime: settings.cutoffTime,
        timezone: settings.timezone,
        allowVisitorCancel: settings.allowVisitorCancel,
      },
      currentIST,
      dates,
      batches,
      availabilityByDate,
    });
  } catch (err) {
    console.error("Availability error:", err);
    return NextResponse.json(
      { error: "Unable to load Annadanam availability" },
      { status: 500 }
    );
  }
}
