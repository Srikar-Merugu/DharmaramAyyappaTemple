import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import type {
  AttendanceRecord,
  RegistrationMember,
  SwamiProfile,
} from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const db = await getDb();
    await ensureSeeded(db);

    const id = req.nextUrl.searchParams.get("id");
    const q = req.nextUrl.searchParams.get("q")?.trim();

    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid profile ID" }, { status: 400 });
      }
      const profileId = new ObjectId(id);
      const [profile, regHistory, attHistory] = await Promise.all([
        db.collection<SwamiProfile>("swami_profiles").findOne({ _id: profileId }),
        db
          .collection<RegistrationMember>("registration_members")
          .find({ profileId })
          .sort({ annadanamDate: -1 })
          .limit(50)
          .toArray(),
        db
          .collection<AttendanceRecord>("attendance_records")
          .find({ profileId })
          .sort({ annadanamDate: -1, markedAt: -1 })
          .limit(50)
          .toArray(),
      ]);

      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      return NextResponse.json({
        profile: { ...profile, _id: profile._id!.toHexString() },
        regHistory: regHistory.map((r) => ({
          ...r,
          _id: r._id?.toHexString(),
          registrationId: r.registrationId.toHexString(),
          profileId: r.profileId.toHexString(),
        })),
        attHistory: attHistory.map((a) => ({
          ...a,
          _id: a._id?.toHexString(),
          profileId: a.profileId.toHexString(),
        })),
      });
    }

    const filter: Record<string, unknown> = {};
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { fullName: regex },
        { phone: regex },
        { village: regex },
        { profileCode: regex },
      ];
    }

    const profiles = await db
      .collection<SwamiProfile>("swami_profiles")
      .find(filter)
      .sort({ totalAttendedVisits: -1, updatedAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      profiles: profiles.map((p) => ({
        ...p,
        _id: p._id!.toHexString(),
      })),
    });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Profiles GET error:", err);
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }
}
