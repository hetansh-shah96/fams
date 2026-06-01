import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const user = await prisma.user.findUnique({ where: { email: "admin@fams.com" } });
    if (!user) return NextResponse.json({ error: "User not found" });

    const testPassword = "Admin@123";
    const compareResult = await bcrypt.compare(testPassword, user.password);
    const compareSync = bcrypt.compareSync(testPassword, user.password);
    const freshHash = await bcrypt.hash(testPassword, 12);
    const freshCompare = await bcrypt.compare(testPassword, freshHash);

    return NextResponse.json({
      userFound: true,
      hashPrefix: user.password.substring(0, 10) + "...",
      hashLength: user.password.length,
      asyncCompare: compareResult,
      syncCompare: compareSync,
      freshHashWorks: freshCompare,
      bcryptjsVersion: require("bcryptjs/package.json").version,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
