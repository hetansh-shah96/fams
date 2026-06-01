import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // Simulate exactly what authorize() does
    const email = "admin@fams.com";
    const password = "Admin@123";

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return NextResponse.json({ step: "FAIL", reason: "user not found" });
    if (!user.isActive) return NextResponse.json({ step: "FAIL", reason: "user inactive" });

    const valid = await bcrypt.compare(password, user.password);

    return NextResponse.json({
      step: valid ? "PASS" : "FAIL",
      reason: valid ? "credentials match" : "bcrypt compare returned false",
      userId: user.id,
      isActive: user.isActive,
      hashPrefix: user.password.substring(0, 7),
    });
  } catch (err) {
    return NextResponse.json({ step: "ERROR", error: String(err) }, { status: 500 });
  }
}
