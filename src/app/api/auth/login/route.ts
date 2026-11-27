import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import {
  ADMIN_COOKIE_NAME,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import type { AdminUser, SeasonSettings } from "@/lib/types";

const pinLoginSchema = z.object({
  pin: z.string().trim().regex(/^\d{4,6}$/, "Enter 4-digit PIN"),
});

const passwordLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!checkRateLimit(`login:${ip}`, 15, 60_000)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait 1 minute." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const db = await getDb();
    await ensureSeeded(db);

    let admin: AdminUser | null = null;

    if (typeof body?.pin === "string") {
      const parsed = pinLoginSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Please enter a valid 4-digit PIN." },
          { status: 400 }
        );
      }

      const settings = await db
        .collection<SeasonSettings>("season_settings")
        .findOne({ _id: "default" });
      const expectedPin =
        settings?.adminPin || process.env.DEFAULT_ADMIN_PIN || "1081";

      if (parsed.data.pin !== expectedPin) {
        return NextResponse.json(
          { error: "Wrong PIN. Please try again. / తప్పు పిన్." },
          { status: 401 }
        );
      }

      admin = await db
        .collection<AdminUser>("admin_users")
        .findOne({ active: true });
    } else {
      const parsed = passwordLoginSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Valid email and password are required." },
          { status: 400 }
        );
      }

      const email = parsed.data.email.toLowerCase().trim();
      const found = await db
        .collection<AdminUser>("admin_users")
        .findOne({ email, active: true });

      if (!found || !verifyPassword(parsed.data.password, found.passwordHash)) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 }
        );
      }
      admin = found;
    }

    if (!admin || !admin._id) {
      return NextResponse.json(
        { error: "Organizer account not found." },
        { status: 401 }
      );
    }

    const token = signSessionToken({
      adminId: admin._id.toHexString(),
      email: admin.email,
      name: admin.name,
    });

    const res = NextResponse.json({
      admin: {
        id: admin._id.toHexString(),
        email: admin.email,
        name: admin.name,
      },
    });

    res.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours so organizer stays signed in all day
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
