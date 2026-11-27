import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import {
  BookingError,
  createRegistration,
  type CreateBookingMember,
} from "@/lib/booking-engine";
import { publicRegistrationSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!checkRateLimit(`register:${ip}`, 30, 60_000)) {
      return NextResponse.json(
        { code: "RATE_LIMITED", error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = publicRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          error: parsed.error.issues[0]?.message || "Invalid input",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const db = await getDb();
    await ensureSeeded(db);

    const data = parsed.data;
    let members: CreateBookingMember[] = [];

    if (data.type === "individual") {
      members = [
        {
          fullName: data.member.fullName,
          phone: data.member.phone,
          village: data.member.village,
          role: "member",
        },
      ];
    } else {
      if (data.leaderAttending) {
        members.push({
          fullName: data.leaderName,
          phone: data.leaderPhone,
          village: data.leaderVillage,
          role: "leader",
        });
      }
      for (const m of data.members) {
        members.push({
          fullName: m.fullName,
          phone: m.phone,
          village: m.village,
          role: "member",
        });
      }
    }

    if (members.length === 0) {
      return NextResponse.json(
        {
          code: "NO_MEMBERS",
          error: "At least one attending member is required.",
        },
        { status: 400 }
      );
    }

    const result = await createRegistration(db, {
      type: data.type,
      annadanamDate: data.annadanamDate,
      batchId: data.batchId,
      groupName: data.type === "group" ? data.groupName : null,
      leaderName: data.type === "group" ? data.leaderName : null,
      leaderPhone: data.type === "group" ? data.leaderPhone : null,
      leaderVillage: data.type === "group" ? data.leaderVillage : null,
      members,
      source: "public_qr",
      idempotencyKey: data.idempotencyKey || null,
    });

    return NextResponse.json(
      {
        code: result.registration.code,
        type: result.registration.type,
        annadanamDate: result.registration.annadanamDate,
        batchId: result.registration.batchId,
        memberCount: result.registration.memberCount,
        groupName: result.registration.groupName,
        leaderName: result.registration.leaderName,
        members: result.members.map((m) => ({
          fullName: m.fullName,
          role: m.role,
        })),
        deduplicated: Boolean(result.deduplicated),
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json(
        { code: err.code, error: err.message, details: err.details },
        { status: err.status }
      );
    }
    console.error("Registration error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", error: "Failed to complete registration." },
      { status: 500 }
    );
  }
}
