import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import {
  ADMIN_COOKIE_NAME,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";
import type { AdminUser } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Valid email and password are required." },
        { status: 400 }
      );
    }

    const db = await getDb();
    await ensureSeeded(db);

    const email = parsed.data.email.toLowerCase().trim();
    const admin = await db
      .collection<AdminUser>("admin_users")
      .findOne({ email, active: true });

    if (!admin || !admin._id || !verifyPassword(parsed.data.password, admin.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid email or password." },
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
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
