import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export const INVITE_COOKIE = "mynetwork_invite";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }

  interface User {
    role?: UserRole;
  }
}

/** Google account that owns bootstrapped / existing network data. Not the ops admin. */
export function ownerEmail() {
  return (
    process.env.OWNER_EMAIL?.trim().toLowerCase() ||
    process.env.ADMIN_EMAIL?.trim().toLowerCase() ||
    ""
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Bootstrap owner User is pre-created; link Google account by email.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return "/login?error=email";

      // Data owner can always sign in (no invite).
      if (email && email === ownerEmail()) return true;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return true;

      const jar = await cookies();
      const code = jar.get(INVITE_COOKIE)?.value?.trim();
      if (!code) return "/login?error=invite";

      const invite = await prisma.invite.findUnique({ where: { code } });
      if (!invite || invite.usedById) return "/login?error=invite";
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return "/login?error=invite";
      }

      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: UserRole }).role ?? "USER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email || !user.id) return;

      // Owner stays a normal USER — ops admin is env-password only.
      if (email === ownerEmail()) return;

      const jar = await cookies();
      const code = jar.get(INVITE_COOKIE)?.value?.trim();
      if (!code) return;

      const invite = await prisma.invite.findUnique({ where: { code } });
      if (!invite || invite.usedById) return;
      if (invite.expiresAt && invite.expiresAt < new Date()) return;

      await prisma.invite.update({
        where: { id: invite.id },
        data: { usedById: user.id, usedAt: new Date() },
      });
      jar.delete(INVITE_COOKIE);
    },
  },
  trustHost: true,
});
