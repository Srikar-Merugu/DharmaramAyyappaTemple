import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const targetUrl =
      req.nextUrl.searchParams.get("url") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const dataUrl = await QRCode.toDataURL(targetUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: "#1c1917",
        light: "#ffffff",
      },
    });

    return NextResponse.json({ url: targetUrl, dataUrl });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to generate QR" }, { status: 500 });
  }
}
