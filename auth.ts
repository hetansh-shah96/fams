import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "fams-dev-secret-change-in-production",
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const email = (credentials?.email as string | undefined)?.trim();
          const password = credentials?.password as string | undefined;

          console.log("[auth] authorize called, email:", email ? `${email.substring(0, 5)}...` : "MISSING");

          if (!email || !password) {
            console.log("[auth] missing credentials");
            return null;
          }

          const user = await prisma.user.findUnique({ where: { email } });
          console.log("[auth] user found:", !!user, "active:", user?.isActive);

          if (!user || !user.isActive) return null;

          const valid = await bcrypt.compare(password, user.password);
          console.log("[auth] bcrypt result:", valid);

          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            locationId: user.locationId,
            departmentId: user.departmentId,
          };
        } catch (error) {
          console.error("[auth] authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.locationId = (user as { locationId: string | null }).locationId;
        token.departmentId = (user as { departmentId: string | null }).departmentId;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.locationId = token.locationId as string | null;
        session.user.departmentId = token.departmentId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
});
